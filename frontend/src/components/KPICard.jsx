import React from 'react';

export default function KPICard({ title, value, icon: Icon, description, trend, trendColor }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-xl shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--border-hover)]">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {title}
          </span>
          <h3 className="text-2xl font-bold text-[var(--text-main)] mt-1.5 leading-none">
            {value}
          </h3>
        </div>
        {Icon && (
          <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      
      {(description || trend) && (
        <div className="mt-3.5 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          {trend && (
            <span className={`font-bold ${trendColor || 'text-[var(--color-success)]'}`}>
              {trend}
            </span>
          )}
          <span>{description}</span>
        </div>
      )}
    </div>
  );
}
