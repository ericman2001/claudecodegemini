import { ChevronLeft, ChevronRight, Home as HomeIcon, RefreshCw } from 'lucide-react';

/**
 * NavigationBar Component
 * 
 * Provides browser-style navigation controls for the Gemini browser.
 * Includes back, forward, refresh, and home buttons with appropriate
 * disabled states based on navigation history.
 * 
 * @param {boolean} canGoBack - Whether back navigation is available
 * @param {boolean} canGoForward - Whether forward navigation is available
 * @param {Function} onBack - Callback for back button click
 * @param {Function} onForward - Callback for forward button click
 * @param {Function} onRefresh - Callback for refresh button click
 * @param {Function} onHome - Callback for home button click
 */
const NavigationBar = ({ canGoBack, canGoForward, onBack, onForward, onRefresh, onHome }) => {
  return (
    <div className="flex items-center gap-2 mb-4">
      {/* Back button - disabled when no history available */}
      <button
        onClick={onBack}
        disabled={!canGoBack}
        className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Go Back"
      >
        <ChevronLeft size={20} />
      </button>
      {/* Forward button - disabled when no forward history available */}
      <button
        onClick={onForward}
        disabled={!canGoForward}
        className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Go Forward"
      >
        <ChevronRight size={20} />
      </button>
      {/* Refresh button - reloads current page */}
      <button
        onClick={onRefresh}
        className="p-2 rounded hover:bg-gray-100"
        title="Refresh"
      >
        <RefreshCw size={20} />
      </button>
      {/* Home button - navigates to default home page */}
      <button
        onClick={onHome}
        className="p-2 rounded hover:bg-gray-100"
        title="Home"
      >
        <HomeIcon size={20} />
      </button>
    </div>
  );
};

export default NavigationBar;