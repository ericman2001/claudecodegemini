import { useState, useEffect } from 'react';

/**
 * AddressBar Component
 * 
 * A browser-style address bar for entering and navigating to Gemini URLs.
 * Provides an input field with keyboard support and a submit button.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.url - The current URL to display in the address bar
 * @param {Function} props.onNavigate - Callback function called when user submits a URL
 * @param {boolean} props.loading - Whether content is currently loading (disables the Go button)
 * @returns {JSX.Element} Address bar with input and go button
 */
const AddressBar = ({ url, onNavigate, loading }) => {
  // Local state for the input field value
  const [inputUrl, setInputUrl] = useState(url);

  // Sync the input field with the current URL when it changes externally
  // (e.g., when navigating via history buttons or clicking links)
  useEffect(() => {
    setInputUrl(url);
  }, [url]);

  /**
   * Handle form submission when user clicks Go or presses Enter
   */
  const handleSubmit = () => {
    onNavigate(inputUrl);
  };

  /**
   * Handle keyboard events - submit on Enter key
   * @param {KeyboardEvent} e - The keyboard event
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={inputUrl}
        onChange={(e) => setInputUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter gemini:// URL"
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Go'}
      </button>
    </div>
  );
};

export default AddressBar;