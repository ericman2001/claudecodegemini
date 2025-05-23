import { useState, useEffect } from 'react';

const AddressBar = ({ url, onNavigate, loading }) => {
  const [inputUrl, setInputUrl] = useState(url);

  useEffect(() => {
    setInputUrl(url);
  }, [url]);

  const handleSubmit = () => {
    onNavigate(inputUrl);
  };

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