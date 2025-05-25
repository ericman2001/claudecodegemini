/**
 * LoadingSpinner Component
 * 
 * A simple animated loading spinner with descriptive text.
 * Used to indicate that Gemini content is being fetched from a server.
 * 
 * @component
 * @returns {JSX.Element} Animated spinner with loading text
 */
const LoadingSpinner = () => {
  return (
    <div className="text-center py-8">
      {/* CSS animation spinner using Tailwind's animate-spin utility */}
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p className="mt-2 text-gray-600">Loading Gemini content...</p>
    </div>
  );
};

export default LoadingSpinner;