import { sendGeminiRequest } from '@derhuerst/gemini/client.js';
import { isUrlSafe, applyRateLimit } from '../../../utils/security';

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
export default async function handler(req, res) 
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

  // Security check to prevent accessing potentially harmful URLs
  if (!isUrlSafe(url)) {
    return res.status(403).json({ error: 'Access to this URL is blocked for security reasons' });
  }

  try {
    // Create a promise wrapper for the callback-based Gemini client
    const result = await new Promise((resolve, reject) => {
      sendGeminiRequest(url, {
        followRedirects: true,      // Automatically follow redirects
        connectTimeout: 10000,      // 10 second connection timeout
        headersTimeout: 5000,       // 5 second header timeout
        timeout: 10000,             // 10 second total timeout
        // Accept self-signed certificates (standard practice in Gemini protocol)
        tlsOpt: {
          rejectUnauthorized: false
        }
      }, (err, response) => {
        if (err) {
          reject(err);
          return;
        }

        // Accumulate the response content
        let content = '';
        
        // Collect data chunks as they arrive
        response.on('data', (chunk) => {
          content += chunk.toString();
        });

        // When response is complete, resolve with full content
        response.on('end', () => {
          resolve({
            statusCode: response.statusCode,      // Gemini status code (20, 30, 40, etc.)
            statusMessage: response.statusMessage, // Human-readable status
            meta: response.meta,                   // Meta information (MIME type or redirect URL)
            content: content                       // The actual content received
          });
        });

        // Handle stream errors
        response.on('error', (err) => {
          reject(err);
        });
      });
    });

    // Handle different Gemini protocol status codes
    if (result.statusCode === 20) {
      // Status 20: Success - content follows
      res.status(200).json({
        success: true,
        content: result.content,
        contentType: result.meta,  // MIME type (usually text/gemini)
        url: url,
        statusCode: result.statusCode
      });
    } else if (result.statusCode >= 30 && result.statusCode < 40) {
      // Status 30-39: Redirect - meta contains new URL
      res.status(200).json({
        success: false,
        redirect: result.meta,     // The URL to redirect to
        statusCode: result.statusCode,
        statusMessage: result.statusMessage
      });
    } else {
      // Status 40+: Various error conditions
      res.status(200).json({
        success: false,
        error: `${result.statusCode} ${result.statusMessage}`,
        meta: result.meta,
        statusCode: result.statusCode
      });
    }

  } catch (error) {
    // Log the error for debugging purposes
    console.error('Gemini request error:', error);
    
    // Return a user-friendly error message
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch content: ' + error.message 
    });
  }
}