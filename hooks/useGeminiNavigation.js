import { useState, useCallback } from 'react';
import { resolveGeminiUrl } from '../utils/urlResolver';
import { DEFAULT_GEMINI_URL, API_ENDPOINTS } from '../utils/constants';

/**
 * useGeminiNavigation Hook
 * 
 * Custom hook that manages all navigation state and functionality for the Gemini browser.
 * Handles URL navigation, history management, content fetching, and browser-style
 * navigation controls (back/forward/refresh/home).
 * 
 * @returns {Object} Navigation state and control functions
 */
const useGeminiNavigation = () => {
  // Current URL being displayed
  const [url, setUrl] = useState(DEFAULT_GEMINI_URL);
  // Fetched Gemtext content
  const [content, setContent] = useState('');
  // Loading state for async operations
  const [loading, setLoading] = useState(false);
  // Error messages from failed requests
  const [error, setError] = useState('');
  // Navigation history array
  const [history, setHistory] = useState([]);
  // Current position in history (-1 means no history yet)
  const [historyIndex, setHistoryIndex] = useState(-1);

  /**
   * Fetches Gemini content through our API proxy
   * @param {string} targetUrl - The Gemini URL to fetch
   * @returns {Promise<Object>} Response containing content or error
   */
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

  /**
   * Navigate to a new Gemini URL
   * Handles relative URLs, redirects, and history management
   * @param {string} targetUrl - The URL to navigate to
   * @param {Object} options - Navigation options
   * @param {boolean} options.isHistoryNavigation - If true, doesn't modify history (for back/forward)
   * @param {number} options.targetIndex - The history index to update to (for back/forward)
   */
  const navigate = useCallback(async (targetUrl, options = {}) => {
    const { isHistoryNavigation = false, targetIndex = null } = options;
    
    try {
      // Resolve relative URLs against current URL (skip for history navigation)
      const resolvedUrl = isHistoryNavigation ? targetUrl : resolveGeminiUrl(targetUrl, url);
      
      setLoading(true);
      setError('');
      
      const result = await fetchGeminiContent(resolvedUrl);
      
      if (result.success) {
        // Update content and URL on successful fetch
        setContent(result.content);
        setUrl(resolvedUrl);
        
        if (isHistoryNavigation) {
          // For history navigation, just update the index
          setHistoryIndex(targetIndex);
        } else {
          // For new navigation, update history
          if (historyIndex === -1 || history[historyIndex] !== resolvedUrl) {
            // Truncate any forward history when navigating to new page
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(resolvedUrl);
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
          }
        }
      } else if (result.redirect) {
        // Handle Gemini protocol redirects (status 30-39)
        if (isHistoryNavigation) {
          // Update the history entry with the redirect URL
          const newHistory = [...history];
          newHistory[targetIndex] = result.redirect;
          setHistory(newHistory);
          navigate(result.redirect, { isHistoryNavigation: true, targetIndex });
        } else {
          navigate(result.redirect);
        }
        return;
      } else {
        // Display error with status code
        setError(`${result.error || 'Failed to fetch content'} (Status: ${result.statusCode})`);
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [url, history, historyIndex]);

  /**
   * Navigate back in history
   */
  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const targetUrl = history[newIndex];
      navigate(targetUrl, { isHistoryNavigation: true, targetIndex: newIndex });
    }
  }, [historyIndex, history, navigate]);

  /**
   * Navigate forward in history
   */
  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const targetUrl = history[newIndex];
      navigate(targetUrl, { isHistoryNavigation: true, targetIndex: newIndex });
    }
  }, [historyIndex, history, navigate]);

  /**
   * Refresh the current page
   */
  const refresh = useCallback(() => {
    navigate(url);
  }, [url, navigate]);

  /**
   * Navigate to the default home page
   */
  const goHome = useCallback(() => {
    navigate(DEFAULT_GEMINI_URL);
  }, [navigate]);

  // Return all state and control functions
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
    canGoBack: historyIndex > 0,                     // Enable back button when history exists
    canGoForward: historyIndex < history.length - 1, // Enable forward button when forward history exists
  };
};

export default useGeminiNavigation;