import { StringDecoder } from 'node:string_decoder';
import { sendGeminiRequest } from '@derhuerst/gemini/client.js';
import { resolveSafeAddress, applyRateLimit } from '../../../utils/security';
import { verifyFingerprint } from '../../../utils/tofu';

/**
 * API endpoint for fetching Gemini protocol content
 *
 * This endpoint acts as a proxy between the web browser and Gemini servers,
 * handling the Gemini protocol communication and returning content that can
 * be rendered in a web browser.
 *
 * @param {Object} req - Next.js API request object
 * @param {Object} res - Next.js API response object
 * @returns {Object} JSON response with fetched content or error information
 */

// Maximum number of redirects to follow before giving up (loop protection).
const MAX_REDIRECTS = 5;
// Maximum size of a response body we are willing to buffer (DoS protection).
const MAX_CONTENT_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Error carrying a message that is safe to show to the client. Any other error
 * is reported to the client generically to avoid leaking internal details.
 */
class UserFacingError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = 'UserFacingError';
    this.userMessage = message;
    this.httpStatus = statusCode;
  }
}

/**
 * Perform a single Gemini request (no redirect following) and buffer the body,
 * enforcing a maximum content length. Also captures the server's TLS
 * certificate fingerprint for TOFU verification.
 *
 * @param {string} targetUrl - Fully-qualified, already-validated gemini:// URL.
 * @param {?string} pinnedAddress - Pre-validated IP address to connect to. Pinning
 *   the connection to the exact IP that passed the SSRF check prevents a
 *   DNS-rebinding TOCTOU (the client otherwise performs its own DNS lookup).
 * @returns {Promise<{statusCode:number, statusMessage:string, meta:string, content:string, fingerprint:?string, certValidTo:?number}>}
 */
function sendSingleRequest(targetUrl, pinnedAddress = null) {
  // Keep TLS SNI/validation tied to the real hostname even when we connect to a
  // pinned IP address.
  const servername = new URL(targetUrl).hostname.replace(/^\[|\]$/g, '');
  return new Promise((resolve, reject) => {
    sendGeminiRequest(
      targetUrl,
      {
        followRedirects: false, // We follow redirects manually with per-hop validation.
        connectTimeout: 10000, // 10 second connection timeout
        headersTimeout: 5000, // 5 second header timeout
        timeout: 10000, // 10 second total timeout
        // Accept self-signed certificates (standard practice in Gemini protocol).
        // Certificate trust is enforced separately via TOFU (see utils/tofu.js).
        tlsOpt: {
          rejectUnauthorized: false,
          // Connect to the exact IP we validated; SNI stays the hostname.
          ...(pinnedAddress ? { host: pinnedAddress, servername } : {}),
        },
      },
      (err, response) => {
        if (err) {
          reject(err);
          return;
        }

        // Capture the server certificate fingerprint (and expiry) for TOFU.
        let fingerprint = null;
        let certValidTo = null;
        try {
          const cert =
            response.socket && typeof response.socket.getPeerCertificate === 'function'
              ? response.socket.getPeerCertificate()
              : null;
          if (cert && cert.fingerprint256) {
            fingerprint = cert.fingerprint256;
          }
          if (cert && cert.valid_to) {
            const parsed = Date.parse(cert.valid_to);
            certValidTo = Number.isNaN(parsed) ? null : parsed;
          }
        } catch {
          fingerprint = null;
        }

        let content = '';
        let byteLength = 0;
        let aborted = false;
        // Decode UTF-8 across chunk boundaries so multibyte characters split
        // between TCP packets are not corrupted.
        const decoder = new StringDecoder('utf8');

        response.on('data', (chunk) => {
          if (aborted) {
            return;
          }
          byteLength += chunk.length;
          if (byteLength > MAX_CONTENT_BYTES) {
            aborted = true;
            // Stop buffering and tear down the connection.
            if (response.socket && typeof response.socket.destroy === 'function') {
              response.socket.destroy();
            }
            reject(
              new UserFacingError(
                'Response exceeds the maximum allowed size and was rejected.',
                502
              )
            );
            return;
          }
          content += decoder.write(chunk);
        });

        response.on('end', () => {
          if (aborted) {
            return;
          }
          content += decoder.end();
          resolve({
            statusCode: response.statusCode,
            statusMessage: response.statusMessage,
            meta: response.meta,
            content,
            fingerprint,
            certValidTo,
          });
        });

        response.on('error', (streamErr) => {
          if (aborted) {
            return;
          }
          reject(streamErr);
        });
      }
    );
  });
}

/**
 * Extract the lowercase MIME type from a Gemini status-20 meta string, which
 * looks like "text/gemini; charset=utf-8".
 */
function parseMimeType(meta) {
  if (!meta || typeof meta !== 'string') {
    // Per the Gemini spec, an empty meta defaults to text/gemini.
    return 'text/gemini';
  }
  return meta.split(';')[0].trim().toLowerCase() || 'text/gemini';
}

export default async function handler(req, res) {
  if (!applyRateLimit(req, res)) {
    return;
  }

  // Only accept POST requests to prevent URL logging in server logs
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract the Gemini URL from request body
  const { url } = req.body;

  // Validate that we have a proper Gemini URL
  if (!url || !url.startsWith('gemini://')) {
    return res.status(400).json({ error: 'Invalid Gemini URL' });
  }

  // Security check to prevent accessing potentially harmful URLs. This also
  // resolves the hostname so we can pin the connection to the validated IP.
  const initialCheck = await resolveSafeAddress(url);
  if (!initialCheck.safe) {
    return res
      .status(403)
      .json({ error: 'Access to this URL is blocked for security reasons' });
  }

  try {
    let currentUrl = url; // Already validated above.
    let pinnedAddress = initialCheck.address;
    let redirectsFollowed = 0;

    // Manual redirect loop with per-hop SSRF validation.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = await sendSingleRequest(currentUrl, pinnedAddress);

      // TLS Trust-On-First-Use: detect certificate changes (possible MITM).
      const host = new URL(currentUrl).host;
      const tofu = verifyFingerprint(host, result.fingerprint, result.certValidTo);
      if (tofu.changed) {
        return res.status(200).json({
          success: false,
          error: `The TLS certificate for ${host} has changed since a previous visit. This may indicate a man-in-the-middle attack, so the page was not loaded. If this host legitimately rotated its certificate, clear the stored fingerprint (see GEMINI_TOFU_STORE_PATH).`,
          statusCode: result.statusCode,
        });
      }

      // Handle redirects (status 30-39) manually so we can validate each hop.
      if (result.statusCode >= 30 && result.statusCode < 40) {
        if (redirectsFollowed >= MAX_REDIRECTS) {
          return res.status(200).json({
            success: false,
            error: 'Too many redirects while fetching the requested URL.',
            statusCode: result.statusCode,
          });
        }

        let resolvedTarget;
        try {
          resolvedTarget = new URL(result.meta, currentUrl).toString();
        } catch {
          return res.status(200).json({
            success: false,
            error: 'Server returned an invalid redirect target.',
            statusCode: result.statusCode,
          });
        }

        // Only gemini:// redirects are allowed, and each hop must pass SSRF
        // checks; re-resolve so the next connection is pinned to a validated IP.
        const hopCheck = resolvedTarget.startsWith('gemini://')
          ? await resolveSafeAddress(resolvedTarget)
          : { safe: false, address: null };
        if (!hopCheck.safe) {
          return res.status(403).json({
            error: 'Access to this URL is blocked for security reasons',
          });
        }

        currentUrl = resolvedTarget;
        pinnedAddress = hopCheck.address;
        redirectsFollowed += 1;
        continue;
      }

      // Non-redirect responses terminate the loop.
      if (result.statusCode === 20) {
        // Content-Type enforcement: only render textual payloads. Binary
        // content (images, archives, etc.) is not force-rendered as gemtext.
        const mimeType = parseMimeType(result.meta);
        if (!mimeType.startsWith('text/')) {
          return res.status(200).json({
            success: false,
            error: `Unsupported content type "${mimeType}". This browser can only display text content.`,
            contentType: result.meta,
            statusCode: result.statusCode,
          });
        }

        return res.status(200).json({
          success: true,
          content: result.content,
          contentType: result.meta, // MIME type (usually text/gemini)
          url: currentUrl, // Final resolved URL so frontend history is correct.
          statusCode: result.statusCode,
        });
      }

      // Status 40+ (and any other non-success, non-redirect) => error condition.
      return res.status(200).json({
        success: false,
        error: `${result.statusCode} ${result.statusMessage}`,
        meta: result.meta,
        statusCode: result.statusCode,
      });
    }
  } catch (error) {
    // Log the full error server-side for debugging.
    console.error('Gemini request error:', error);

    // Return a safe, generic message unless the error explicitly carries a
    // user-facing message (e.g. response-too-large).
    const message =
      error instanceof UserFacingError
        ? error.userMessage
        : 'Failed to fetch content. Please check the URL and try again.';
    const status = error instanceof UserFacingError ? error.httpStatus : 500;

    res.status(status).json({
      success: false,
      error: message,
    });
  }
}
