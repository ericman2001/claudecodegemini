import { useState, useCallback } from 'react';
import { resolveGeminiUrl } from '../utils/urlResolver';
import { DEFAULT_GEMINI_URL, API_ENDPOINTS } from '../utils/constants';

const useGeminiNavigation = () => {
  const [url, setUrl] = useState(DEFAULT_GEMINI_URL);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const fetchGeminiContent = async (targetUrl) => {
    const response = await fetch(API_ENDPOINTS.GEMINI_FETCH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: targetUrl }),
    });
    return response.json();
  };

  const navigate = useCallback(async (targetUrl) => {
    try {
      const resolvedUrl = resolveGeminiUrl(targetUrl, url);
      
      setLoading(true);
      setError('');
      
      const result = await fetchGeminiContent(resolvedUrl);
      
      if (result.success) {
        setContent(result.content);
        setUrl(resolvedUrl);
        
        if (historyIndex === -1 || history[historyIndex] !== resolvedUrl) {
          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push(resolvedUrl);
          setHistory(newHistory);
          setHistoryIndex(newHistory.length - 1);
        }
      } else if (result.redirect) {
        navigate(result.redirect);
        return;
      } else {
        setError(`${result.error || 'Failed to fetch content'} (Status: ${result.statusCode})`);
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [url, history, historyIndex]);

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const targetUrl = history[newIndex];
      setUrl(targetUrl);
      navigate(targetUrl);
    }
  }, [historyIndex, history, navigate]);

  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const targetUrl = history[newIndex];
      setUrl(targetUrl);
      navigate(targetUrl);
    }
  }, [historyIndex, history, navigate]);

  const refresh = useCallback(() => {
    navigate(url);
  }, [url, navigate]);

  const goHome = useCallback(() => {
    navigate(DEFAULT_GEMINI_URL);
  }, [navigate]);

  return {
    url,
    content,
    loading,
    error,
    navigate,
    goBack,
    goForward,
    refresh,
    goHome,
    canGoBack: historyIndex > 0,
    canGoForward: historyIndex < history.length - 1,
  };
};

export default useGeminiNavigation;