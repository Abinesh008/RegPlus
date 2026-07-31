import React from 'react';
import { FiActivity, FiServer, FiCpu, FiDatabase, FiClock } from 'react-icons/fi';

export default function APIStatusPanel({
  backendStatus,
  geminiStatus,
  dbStatus = true,
  lastProcessedTime
}) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-xl shadow-sm">
      <h3 className="text-sm font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
        <FiActivity className="text-accent w-4.5 h-4.5" />
        System Health & API Status
      </h3>
      
      <div className="space-y-3.5 text-xs">
        {/* Backend status */}
        <div className="flex justify-between items-center py-1.5 border-b border-[var(--border-color)]/50">
          <span className="text-[var(--text-muted)] flex items-center gap-2 font-medium">
            <FiServer className="w-3.5 h-3.5" /> Backend API
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
            backendStatus === 'connected' 
              ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' 
              : backendStatus === 'checking'
                ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
          }`}>
            {backendStatus === 'connected' ? 'Online' : backendStatus === 'checking' ? 'Checking' : 'Offline'}
          </span>
        </div>

        {/* Gemini status */}
        <div className="flex justify-between items-center py-1.5 border-b border-[var(--border-color)]/50">
          <span className="text-[var(--text-muted)] flex items-center gap-2 font-medium">
            <FiCpu className="w-3.5 h-3.5" /> Extraction Engine
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
            geminiStatus === 'connected' 
              ? 'bg-primary/10 text-primary' 
              : 'bg-slate-500/10 text-[var(--text-muted)]'
          }`}>
            {geminiStatus === 'connected' ? 'Gemini AI' : 'Mock Mode'}
          </span>
        </div>

        {/* Database status */}
        <div className="flex justify-between items-center py-1.5 border-b border-[var(--border-color)]/50">
          <span className="text-[var(--text-muted)] flex items-center gap-2 font-medium">
            <FiDatabase className="w-3.5 h-3.5" /> SQLite DB
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
            dbStatus 
              ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' 
              : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
          }`}>
            {dbStatus ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Last processing timestamp */}
        <div className="flex justify-between items-center pt-1">
          <span className="text-[var(--text-muted)] flex items-center gap-2 font-medium">
            <FiClock className="w-3.5 h-3.5" /> Last Processed
          </span>
          <span className="text-[var(--text-main)] font-semibold">
            {lastProcessedTime ? new Date(lastProcessedTime).toLocaleTimeString() : 'No activity yet'}
          </span>
        </div>
      </div>
    </div>
  );
}
