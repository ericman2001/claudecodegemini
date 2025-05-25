import Head from 'next/head';
import { useState } from 'react';
import GemtextRenderer from '../components/GemtextRenderer';
import NavigationBar from '../components/NavigationBar';
import AddressBar from '../components/AddressBar';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import AboutDialog from '../components/AboutDialog';
import useGeminiNavigation from '../hooks/useGeminiNavigation';

/**
 * Main Gemini Browser component
 * This is the primary entry point for the application, rendering a web-based
 * interface for browsing Gemini protocol content (Geminispace).
 * 
 * The component manages:
 * - Navigation state (history, current URL)
 * - Content fetching and display
 * - Browser-like controls (back, forward, refresh, home)
 * - Error handling and loading states
 */
export default function Home() {
  // State for controlling the About dialog
  const [showAbout, setShowAbout] = useState(false);
  
  // Extract all navigation state and methods from our custom hook
  const {
    url,          // Current Gemini URL being displayed
    content,      // Fetched Gemtext content
    loading,      // Loading state indicator
    error,        // Any error messages
    navigate,     // Function to navigate to a new URL
    goBack,       // Browser-style back navigation
    goForward,    // Browser-style forward navigation
    refresh,      // Reload current page
    goHome,       // Navigate to default home page
    canGoBack,    // Whether back navigation is available
    canGoForward, // Whether forward navigation is available
  } = useGeminiNavigation();

  return (
    <>
      <Head>
        <title>Gemini Browser</title>
        <meta name="description" content="Browse Geminispace with this web-based Gemini protocol browser" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Navigation header with browser controls and address bar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="max-w-4xl mx-auto">
            <NavigationBar
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              onBack={goBack}
              onForward={goForward}
              onRefresh={refresh}
              onHome={goHome}
              onAbout={() => setShowAbout(true)}
            />
            <AddressBar
              url={url}
              onNavigate={navigate}
              loading={loading}
            />
          </div>
        </div>

        {/* Main content area */}
        <div className="max-w-4xl mx-auto p-6">
          {/* Show loading spinner while fetching content */}
          {loading && <LoadingSpinner />}
          
          {/* Display any errors that occur during fetch */}
          <ErrorAlert error={error} />

          {/* Render the Gemtext content when available */}
          {content && !loading && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <GemtextRenderer 
                content={content} 
                onLinkClick={navigate}  // Handle link clicks within content
              />
            </div>
          )}

          {/* Welcome message when no content is loaded */}
          {!content && !loading && !error && (
            <div className="text-center py-12 text-gray-500">
              <p>Enter a gemini:// URL above to start browsing Geminispace!</p>
              <p className="text-sm mt-2">Try: gemini://geminiprotocol.net/</p>
            </div>
          )}
        </div>
      </div>
      
      {/* About Dialog */}
      <AboutDialog 
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
      />
    </>
  );
}