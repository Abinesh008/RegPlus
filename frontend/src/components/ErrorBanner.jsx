import React from 'react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

export default function ErrorBanner({ 
  message = 'An unexpected error occurred while communicating with the server.', 
  suggestion,
  onRetry 
}) {
  return (
    <div className="w-full bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/25 p-4 rounded-xl flex items-center justify-between text-xs text-[var(--color-danger)]">
      <div className="flex items-center gap-3">
        <FiAlertTriangle className="w-5 h-5 flex-shrink-0" />
        <div className="leading-relaxed text-left">
          <div className="font-semibold text-[var(--text-color)]">{message}</div>
          {suggestion && (
            <div className="mt-1 text-[11px] opacity-80 italic font-medium">
              💡 Suggestion: {suggestion}
            </div>
          )}
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-4 flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-danger)] hover:bg-[var(--color-danger)]/90 text-white rounded-lg font-bold transition-colors cursor-pointer whitespace-nowrap"
        >
          <FiRefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      )}
    </div>
  );
}
