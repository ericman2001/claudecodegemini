export const resolveGeminiUrl = (targetUrl, currentUrl) => {
  if (!targetUrl.startsWith('gemini://')) {
    if (targetUrl.startsWith('/')) {
      try {
        const current = new URL(currentUrl);
        return `gemini://${current.host}${targetUrl}`;
      } catch (e) {
        throw new Error('Invalid URL format');
      }
    } else if (!targetUrl.includes('://')) {
      try {
        const current = new URL(currentUrl);
        const basePath = current.pathname.endsWith('/') 
          ? current.pathname 
          : current.pathname.replace(/\/[^\/]*$/, '/');
        return `gemini://${current.host}${basePath}${targetUrl}`;
      } catch (e) {
        throw new Error('Invalid URL format');
      }
    }
  }
  return targetUrl;
};