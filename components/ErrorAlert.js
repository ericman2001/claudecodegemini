import { AlertCircle } from 'lucide-react';

/**
 * ErrorAlert Component
 * 
 * Displays error messages in a styled alert box with an error icon.
 * Only renders when an error is present.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string|null} props.error - The error message to display, or null to hide the alert
 * @returns {JSX.Element|null} Error alert box or null if no error
 */
const ErrorAlert = ({ error }) => {
  // Don't render anything if there's no error
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