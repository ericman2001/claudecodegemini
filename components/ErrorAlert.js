import { AlertCircle } from 'lucide-react';

const ErrorAlert = ({ error }) => {
  if (!error) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
      <div className="flex items-center gap-2 text-red-800">
        <AlertCircle size={20} />
        <span className="font-medium">Error</span>
      </div>
      <p className="text-red-700 mt-1">{error}</p>
    </div>
  );
};

export default ErrorAlert;