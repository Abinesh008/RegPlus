import React from 'react';

export default function LoadingSkeleton({ type = 'card', count = 1 }) {
  const items = Array.from({ length: count });

  if (type === 'card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {items.map((_, i) => (
          <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-xl animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden animate-pulse">
        <div className="bg-slate-100 dark:bg-slate-800 h-10 border-b border-[var(--border-color)]" />
        <div className="p-4 space-y-4">
          {items.map((_, i) => (
            <div key={i} className="flex justify-between items-center gap-4 py-2 border-b border-[var(--border-color)]/30">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/6" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/6" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-3 w-full">
        {items.map((_, i) => (
          <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-lg animate-pulse flex justify-between items-center">
            <div className="space-y-2 flex-1 mr-4">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
            </div>
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  return null;
}
