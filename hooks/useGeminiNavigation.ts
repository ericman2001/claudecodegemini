import { useState, useCallback } from 'react';
import { resolveGeminiUrl } from '../utils/urlResolver';
import { DEFAULT_GEMINI_URL, API_ENDPOINTS } from '../utils/constants';
import type { GeminiFetchResponse } from '../pages/api/gemini/fetch';

/** Options controlling a single navigation. */
interface NavigateOptions {
  /** When true, does not modify history (used for back/forward). */
  isHistoryNavigation?: boolean;
  /** The history index to update to (for back/forward). */
  targetIndex?: number | null;
  /** Current redirect hop count, for loop protection. */
  redirectDepth?: number;
}

/** Client-side response shape, extending the API response with the optional
 *  redirect field the client is prepared to handle. */
interface GeminiClientResult extends GeminiFetchResponse {
  redirect?: string;
}

/** State and control functions returned by {@link useGeminiNavigation}. */
export interface GeminiNavigation {
  url: string;
  content: string;
  loading: boolean;
  error: string;
  navigate: (targetUrl: string, options?: NavigateOptions) => Promise<void>;
  goBack: () => void;
  goForward: () => void;
  refresh: () => void;
  goHome: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

// Maximum number of client-side redirect hops before aborting (loop protection).
const MAX_REDIRECT_DEPTH = 5;

/**
 * useGeminiNavigation Hook
 *
 * Custom hook that manages all navigation state and functionality for the Gemini browser.
 * Handles URL navigation, history management, content fetching, and browser-style
 * navigation controls (back/forward/refresh/home).
 */
const useGeminiNavigation = (): GeminiNavigation => {
  // Current URL being displayed
  const [url, setUrl] = useState(DEFAULT_GEMINI_URL);
  // Fetched Gemtext content
  const [content, setContent] = useState('');
  // Loading state for async operations
  const [loading, setLoading] = useState(false);
  // Error messages from failed requests
  const [error, setError] = useState('');
  // Navigation history array
  const [history, setHistory] = useState<string[]>([]);
  // Current position in history (-1 means no history yet)
  const [historyIndex, setHistoryIndex] = useState(-1);

  /**
   * Fetches Gemini content through our API proxy
   * @param targetUrl - The Gemini URL to fetch
   */
  const fetchGeminiContent = async (targetUrl: string): Promise<GeminiClientResult> => {
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
   * Navigate to a new Gemini URL.
   * Handles relative URLs, redirects, and history management.
   * @param targetUrl - The URL to navigate to
   * @param options - Navigation options
   */
  const navigate = useCallback(async (targetUrl: string, options: NavigateOptions = {}) => {
    const { isHistoryNavigation = false, targetIndex = null, redirectDepth = 0 } = options;

    try {
      // Guard against redirect loops from misbehaving/malicious servers.
      if (redirectDepth > MAX_REDIRECT_DEPTH) {
        setError('Too many redirects');
        setLoading(false);
        return;
      }

      // Resolve relative URLs against current URL (skip for history navigation)
      const resolvedUrl = isHistoryNavigation ? targetUrl : resolveGeminiUrl(targetUrl, url);
      
      setLoading(true);
      setError('');
      
      const result = await fetchGeminiContent(resolvedUrl);
      
      if (result.success) {
        // Prefer the final URL the proxy actually loaded (it follows redirects
        // server-side), so the address bar, history, and relative-link
        // resolution all use the correct base.
        const finalUrl = result.url || resolvedUrl;

        // Update content and URL on successful fetch
        setContent(result.content ?? '');
        setUrl(finalUrl);
        
        if (isHistoryNavigation) {
          // For history navigation, just update the index
          if (targetIndex !== null) {
            setHistoryIndex(targetIndex);
          }
        } else {
          // For new navigation, update history
          if (historyIndex === -1 || history[historyIndex] !== finalUrl) {
            // Truncate any forward history when navigating to new page
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(finalUrl);
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
          }
        }
      } else if (result.redirect) {
        // Handle Gemini protocol redirects (status 30-39)
        if (isHistoryNavigation && targetIndex !== null) {
          // Update the history entry with the redirect URL
          const newHistory = [...history];
          newHistory[targetIndex] = result.redirect;
          setHistory(newHistory);
          navigate(result.redirect, { isHistoryNavigation: true, targetIndex, redirectDepth: redirectDepth + 1 });
        } else {
          navigate(result.redirect, { redirectDepth: redirectDepth + 1 });
        }
        return;
      } else {
        // Display error with status code
        setError(`${result.error || 'Failed to fetch content'} (Status: ${result.statusCode})`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
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