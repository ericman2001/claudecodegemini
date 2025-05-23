import { ChevronLeft, ChevronRight, Home as HomeIcon, RefreshCw } from 'lucide-react';

const NavigationBar = ({ canGoBack, canGoForward, onBack, onForward, onRefresh, onHome }) => {
  return (
    <div className="flex items-center gap-2 mb-4">
      <button
        onClick={onBack}
        disabled={!canGoBack}
        className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Go Back"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={onForward}
        disabled={!canGoForward}
        className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Go Forward"
      >
        <ChevronRight size={20} />
      </button>
      <button
        onClick={onRefresh}
        className="p-2 rounded hover:bg-gray-100"
        title="Refresh"
      >
        <RefreshCw size={20} />
      </button>
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