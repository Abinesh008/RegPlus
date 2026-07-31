import React from 'react';
import { FiInbox } from 'react-icons/fi';

export default function EmptyState({ 
  title = 'No Data Found', 
  description = 'There is no data to display in this view at the moment.', 
  icon: Icon = FiInbox,
  actionLabel, 
  onAction 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-sm">
      <div className="p-4 bg-primary/10 rounded-full text-primary mb-4">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-base font-bold text-[var(--text-main)] mb-1">
        {title}
      </h3>
      <p className="text-xs text-[var(--text-muted)] max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg shadow-sm transition-colors duration-150 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
