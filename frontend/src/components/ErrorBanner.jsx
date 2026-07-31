import React from 'react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

export default function ErrorBanner({ 
  message = 'An unexpected error occurred while communicating with the server.', 
  onRetry 
}) {
  return (
    <div className="w-full bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/25 p-4 rounded-xl flex items-center justify-between text-xs text-[var(--color-danger)]">
      <div className="flex items-center gap-3">
        <FiAlertTriangle className="w-5 h-5 flex-shrink-0" />
        <div className="font-semibold leading-relaxed">
          {message}
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-4 flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-danger)] hover:bg-[var(--color-danger)]/90 text-white rounded-lg font-bold transition-colors cursor-pointer"
        >
          <FiRefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      )}
    </div>
  );
}
