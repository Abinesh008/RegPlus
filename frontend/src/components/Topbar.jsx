import React from 'react';
import { FiSun, FiMoon, FiSearch, FiCheckCircle, FiAlertCircle, FiRefreshCw, FiDatabase } from 'react-icons/fi';
import { LuBrainCircuit } from 'react-icons/lu';

export default function Topbar({
  theme,
  toggleTheme,
  searchQuery,
  setSearchQuery,
  backendStatus,
  geminiStatus,
  isDemoMode,
  currentPageTitle,
  onRefreshHealth
}) {
  return (
    <header className="h-16 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-6 flex items-center justify-between no-print select-none shadow-sm">
      {/* Title */}
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold text-[var(--text-main)] tracking-tight">
          {currentPageTitle || 'Compliance Dashboard'}
        </h2>
        
        {/* Demo / Live Badge */}
        {isDemoMode ? (
          <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-accent/10 border border-accent/30 text-accent rounded-full">
            Demo Dataset Loaded
          </span>
        ) : (
          <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-gray-500/10 border border-gray-500/20 text-[var(--text-muted)] rounded-full">
            Live Upload Mode
          </span>
        )}
      </div>

      {/* Right Side Tools */}
      <div className="flex items-center gap-6">
        {/* Search */}
        <div className="relative w-64">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <FiSearch className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search circulars or rules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg pl-9 pr-4 py-1.5 text-xs text-[var(--text-main)] placeholder-slate-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* System Health Statuses */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          {/* Backend Status */}
          <div className="flex items-center gap-1.5" title="FastAPI Backend Connection">
            {backendStatus === 'connected' ? (
              <span className="flex items-center gap-1 text-[var(--color-success)]">
                <FiCheckCircle className="w-4 h-4" />
                Backend
              </span>
            ) : backendStatus === 'checking' ? (
              <span className="flex items-center gap-1 text-[var(--color-warning)]">
                <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                Backend
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[var(--color-danger)]">
                <FiAlertCircle className="w-4 h-4" />
                Backend
              </span>
            )}
          </div>

          {/* Gemini API Status */}
          <div className="flex items-center gap-1.5" title="Google Gemini API Configuration">
            {geminiStatus === 'connected' ? (
              <span className="flex items-center gap-1 text-[var(--color-success)]">
                <LuBrainCircuit className="w-4 h-4" />
                Gemini: Active
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[var(--text-muted)]">
                <LuBrainCircuit className="w-4 h-4 text-slate-400" />
                Gemini: Mock
              </span>
            )}
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefreshHealth}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          title="Refresh health check"
        >
          <FiRefreshCw className="w-4 h-4" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <FiMoon className="w-4.5 h-4.5" /> : <FiSun className="w-4.5 h-4.5" />}
        </button>
      </div>
    </header>
  );
}
