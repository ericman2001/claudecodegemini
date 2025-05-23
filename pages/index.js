import { useState } from 'react';
import Head from 'next/head';
import { ChevronLeft, ChevronRight, Home as HomeIcon, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';

// Gemtext parser component
const GemtextRenderer = ({ content, onLinkClick }) => {
  const lines = content.split('\n');
  const elements = [];
  let inPreformatted = false;
  let preformattedContent = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('```')) {
      if (inPreformatted) {
        elements.push(
          <pre key={i} className="bg-gray-100 p-4 rounded-md overflow-x-auto text-sm font-mono mb-4">
            <code>{preformattedContent.join('\n')}</code>
          </pre>
        );
        preformattedContent = [];
        inPreformatted = false;
      } else {
        inPreformatted = true;
      }
      continue;
    }

    if (inPreformatted) {
      preformattedContent.push(line);
      continue;
    }

    if (line.startsWith('=>')) {
      const linkMatch = line.slice(2).trim();
      // Handle multiple spaces/tabs between URL and text
      const parts = linkMatch.split(/\s+/);
      const url = parts[0]; // First part is always the URL
      const text = parts.length > 1 ? parts.slice(1).join(' ') : url; // Rest is the text
      
      elements.push(
        <div key={i} className="mb-2">
          <a 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              onLinkClick(url);
            }}
            className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
          >
            <ExternalLink size={14} />
            {text}
          </a>
        </div>
      );
    }
    else if (line.startsWith('###')) {
      elements.push(<h3 key={i} className="text-lg font-semibold mb-2 mt-4">{line.slice(3).trim()}</h3>);
    }
    else if (line.startsWith('##')) {
      elements.push(<h2 key={i} className="text-xl font-bold mb-3 mt-4">{line.slice(2).trim()}</h2>);
    }
    else if (line.startsWith('#')) {
      elements.push(<h1 key={i} className="text-2xl font-bold mb-4 mt-4">{line.slice(1).trim()}</h1>);
    }
    else if (line.startsWith('*')) {
      elements.push(<li key={i} className="ml-4 mb-1">{line.slice(1).trim()}</li>);
    }
    else if (line.startsWith('>')) {
      elements.push(
        <blockquote key={i} className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-2">
          {line.slice(1).trim()}
        </blockquote>
      );
    }
    else if (line.trim()) {
      elements.push(<p key={i} className="mb-3">{line}</p>);
    }
    else {
      elements.push(<div key={i} className="mb-2"></div>);
    }
  }

  return <div className="prose max-w-none">{elements}</div>;
};

export default function Home() {
  const [url, setUrl] = useState('gemini://geminiprotocol.net/');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const fetchGeminiContent = async (targetUrl) => {
    const response = await fetch('/api/gemini/fetch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: targetUrl }),
    });

    return response.json();
  };

  const navigate = async (targetUrl) => {
    
    // Handle relative URLs
    if (!targetUrl.startsWith('gemini://')) {
      if (targetUrl.startsWith('/')) {
        // Absolute path - use current host
        try {
          const currentUrl = new URL(url);
          targetUrl = `gemini://${currentUrl.host}${targetUrl}`;
        } catch (e) {
          setError('Invalid URL format');
          return;
        }
      } else if (!targetUrl.includes('://')) {
        // Relative path - resolve against current URL
        try {
          const currentUrl = new URL(url);
          // Remove filename from current path, then add new path
          const basePath = currentUrl.pathname.endsWith('/') ? currentUrl.pathname : currentUrl.pathname.replace(/\/[^\/]*$/, '/');
          targetUrl = `gemini://${currentUrl.host}${basePath}${targetUrl}`;
        } catch (e) {
          setError('Invalid URL format');
          return;
        }
      }
      // If it contains :// but isn't gemini://, leave it as-is (might be http link, will error appropriately)
    }

    
    setLoading(true);
    setError('');
    
    try {
      const result = await fetchGeminiContent(targetUrl);
      
      if (result.success) {
        setContent(result.content);
        setUrl(targetUrl);
        
        // Add to history (only if it's a new navigation, not back/forward)
        if (historyIndex === -1 || history[historyIndex] !== targetUrl) {
          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push(targetUrl);
          setHistory(newHistory);
          setHistoryIndex(newHistory.length - 1);
        }
      } else if (result.redirect) {
        // Handle redirect
        navigate(result.redirect);
        return;
      } else {
        setError(`${result.error || 'Failed to fetch content'} (Status: ${result.statusCode})`);
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const targetUrl = history[newIndex];
      setUrl(targetUrl);
      fetchAndDisplay(targetUrl);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const targetUrl = history[newIndex];
      setUrl(targetUrl);
      fetchAndDisplay(targetUrl);
    }
  };

  const fetchAndDisplay = async (targetUrl) => {
    setLoading(true);
    setError('');
    
    try {
      const result = await fetchGeminiContent(targetUrl);
      
      if (result.success) {
        setContent(result.content);
      } else if (result.redirect) {
        navigate(result.redirect);
        return;
      } else {
        setError(result.error || 'Failed to fetch content');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    fetchAndDisplay(url);
  };

  const goHome = () => {
    navigate('gemini://geminiprotocol.net/');
  };

  return (
    <>
      <Head>
        <title>Gemini Browser</title>
        <meta name="description" content="Browse Geminispace with this web-based Gemini protocol browser" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Browser Chrome */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="max-w-4xl mx-auto">
            {/* Navigation buttons */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={goBack}
                disabled={historyIndex <= 0}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Go Back"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={goForward}
                disabled={historyIndex >= history.length - 1}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Go Forward"
              >
                <ChevronRight size={20} />
              </button>
              <button
                onClick={refresh}
                className="p-2 rounded hover:bg-gray-100"
                title="Refresh"
              >
                <RefreshCw size={20} />
              </button>
              <button
                onClick={goHome}
                className="p-2 rounded hover:bg-gray-100"
                title="Home"
              >
                <HomeIcon size={20} />
              </button>
            </div>

            {/* Address bar */}
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    navigate(url);
                  }
                }}
                placeholder="Enter gemini:// URL"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => navigate(url)}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Go'}
              </button>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="max-w-4xl mx-auto p-6">
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading Gemini content...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle size={20} />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          )}

          {content && !loading && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <GemtextRenderer 
                content={content} 
                onLinkClick={(linkUrl) => navigate(linkUrl)}
              />
            </div>
          )}

          {!content && !loading && !error && (
            <div className="text-center py-12 text-gray-500">
              <p>Enter a gemini:// URL above to start browsing Geminispace!</p>
              <p className="text-sm mt-2">Try: gemini://geminiprotocol.net/</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}