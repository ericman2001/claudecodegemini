const LoadingSpinner = () => {
  return (
    <div className="text-center py-8">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p className="mt-2 text-gray-600">Loading Gemini content...</p>
    </div>
  );
};

export default LoadingSpinner;