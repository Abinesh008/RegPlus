import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  CheckCircle2, 
  Brain, 
  FileCheck, 
  AlertTriangle, 
  Trash2, 
  X,
  Sparkles
} from 'lucide-react';

export default function NotificationCenter({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onClearAll,
  onClearOne
}) {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-88 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-lg z-50 overflow-hidden select-none font-sans">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-app)]/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[var(--color-accent)] animate-bounce" />
              <span className="text-xs font-bold text-[var(--text-main)] font-display">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-[var(--color-accent)] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 shadow-sm animate-pulse">
                  {unreadCount} new
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-[10px] text-[var(--text-muted)] hover:text-[var(--color-danger)] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Clear all notifications"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-72 overflow-y-auto divide-y divide-[var(--border-color)]/70">
            {notifications.length === 0 ? (
              <div className="py-10 px-4 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-2">
                <Sparkles className="w-6 h-6 text-slate-300 dark:text-slate-700 animate-pulse" />
                <span>All clear! No pending notifications.</span>
              </div>
            ) : (
              notifications.map((item) => {
                let Icon = CheckCircle2;
                let iconColorClass = 'text-[var(--color-success)] bg-[var(--color-success)]/10';
                
                if (item.type === 'extraction' || item.type === 'mapping') {
                  Icon = Brain;
                  iconColorClass = 'text-[var(--color-accent)] bg-[var(--color-accent)]/10';
                } else if (item.type === 'report') {
                  Icon = FileCheck;
                  iconColorClass = 'text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-950/20';
                } else if (item.type === 'error' || item.type === 'connection') {
                  Icon = AlertTriangle;
                  iconColorClass = 'text-[var(--color-danger)] bg-[var(--color-danger)]/10';
                }

                return (
                  <div 
                    key={item.id}
                    className={`relative p-3.5 flex items-start gap-3 transition-colors ${
                      item.read ? 'opacity-70 hover:opacity-100' : 'bg-[var(--color-accent)]/5 hover:bg-[var(--color-accent)]/10'
                    }`}
                  >
                    {/* Unread indicator dot */}
                    {!item.read && (
                      <span className="absolute top-4 left-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-ping" />
                    )}

                    {/* Icon Box */}
                    <div className={`p-2 rounded-lg shrink-0 ${iconColorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0 pr-2" onClick={() => onMarkAsRead(item.id)}>
                      <h4 className="text-xs font-bold text-[var(--text-main)] truncate leading-tight cursor-pointer">
                        {item.title}
                      </h4>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-normal cursor-pointer">
                        {item.message}
                      </p>
                      <span className="text-[9px] text-[var(--text-muted)] opacity-60 mt-1 block">
                        {item.time}
                      </span>
                    </div>

                    {/* Clear One Button */}
                    <button
                      onClick={() => onClearOne(item.id)}
                      className="text-slate-400 hover:text-[var(--text-main)] shrink-0 self-start p-0.5 rounded hover:bg-[var(--bg-app)] transition-colors cursor-pointer"
                      title="Clear notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
