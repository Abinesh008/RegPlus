import React from 'react';
import { Clock, ShieldAlert } from 'lucide-react';

export default function SessionExpired({ onLogin }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-12 rounded-xl text-center flex flex-col items-center justify-center min-h-[400px] shadow-xs select-none">
      <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-4">
        <Clock className="w-8 h-8 animate-pulse" />
      </div>
      <h3 className="text-base font-bold text-[var(--text-main)] uppercase tracking-wider font-display mb-1">
        Workstation Session Expired
      </h3>
      <p className="text-xs text-[var(--text-muted)] max-w-sm mb-6">
        You have been signed out automatically due to inactive workstation activity. Please re-authenticate to restore credentials.
      </p>
      {onLogin && (
        <button
          onClick={onLogin}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
        >
          Secure Log In
        </button>
      )}
    </div>
  );
}
