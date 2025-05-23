import { sendGeminiRequest } from '@derhuerst/gemini/client.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;
  
  if (!url || !url.startsWith('gemini://')) {
    return res.status(400).json({ error: 'Invalid Gemini URL' });
  }

  try {
    // Create a promise wrapper for the callback-based client
    const result = await new Promise((resolve, reject) => {
      sendGeminiRequest(url, {
        followRedirects: true,
        connectTimeout: 10000,
        headersTimeout: 5000,
        timeout: 10000,
        // Accept self-signed certificates (standard for Gemini)
        tlsOpt: {
          rejectUnauthorized: false
        }
      }, (err, response) => {
        if (err) {
          reject(err);
          return;
        }

        let content = '';
        
        response.on('data', (chunk) => {
          content += chunk.toString();
        });

        response.on('end', () => {
          resolve({
            statusCode: response.statusCode,
            statusMessage: response.statusMessage,
            meta: response.meta,
            content: content
          });
        });

        response.on('error', (err) => {
          reject(err);
        });
      });
    });

    // Handle different status codes
    if (result.statusCode === 20) {
      // Success
      res.status(200).json({
        success: true,
        content: result.content,
        contentType: result.meta,
        url: url,
        statusCode: result.statusCode
      });
    } else if (result.statusCode >= 30 && result.statusCode < 40) {
      // Redirect
      res.status(200).json({
        success: false,
        redirect: result.meta,
        statusCode: result.statusCode,
        statusMessage: result.statusMessage
      });
    } else {
      // Error
      res.status(200).json({
        success: false,
        error: `${result.statusCode} ${result.statusMessage}`,
        meta: result.meta,
        statusCode: result.statusCode
      });
    }

  } catch (error) {
    console.error('Gemini request error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch content: ' + error.message 
    });
  }
}