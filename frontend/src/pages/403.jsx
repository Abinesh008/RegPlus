import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function Unauthorized({ onBackToDashboard }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-12 rounded-xl text-center flex flex-col items-center justify-center min-h-[400px] shadow-xs select-none">
      <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h3 className="text-base font-bold text-[var(--text-main)] uppercase tracking-wider font-display mb-1">
        Action Forbidden
      </h3>
      <p className="text-xs text-[var(--text-muted)] max-w-sm mb-6">
        Your assigned compliance role does not possess permissions to access this worksheet module or trigger this run logic.
      </p>
      {onBackToDashboard && (
        <button
          onClick={onBackToDashboard}
          className="px-4 py-2 border border-[var(--border-color)] hover:bg-[var(--bg-app)] rounded-lg text-xs font-bold text-[var(--text-main)] cursor-pointer flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Control Panel
        </button>
      )}
    </div>
  );
}
