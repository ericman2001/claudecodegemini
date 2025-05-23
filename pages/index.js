import Head from 'next/head';
import GemtextRenderer from '../components/GemtextRenderer';
import NavigationBar from '../components/NavigationBar';
import AddressBar from '../components/AddressBar';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import useGeminiNavigation from '../hooks/useGeminiNavigation';

export default function Home() {
  const {
    url,
    content,
    loading,
    error,
    navigate,
    goBack,
    goForward,
    refresh,
    goHome,
    canGoBack,
    canGoForward,
  } = useGeminiNavigation();

  return (
    <>
      <Head>
        <title>Gemini Browser</title>
        <meta name="description" content="Browse Geminispace with this web-based Gemini protocol browser" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="max-w-4xl mx-auto">
            <NavigationBar
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              onBack={goBack}
              onForward={goForward}
              onRefresh={refresh}
              onHome={goHome}
            />
            <AddressBar
              url={url}
              onNavigate={navigate}
              loading={loading}
            />
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          {loading && <LoadingSpinner />}
          
          <ErrorAlert error={error} />

          {content && !loading && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <GemtextRenderer 
                content={content} 
                onLinkClick={navigate}
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