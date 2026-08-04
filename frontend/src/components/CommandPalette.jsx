import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  LayoutDashboard, 
  Files, 
  Eye, 
  GitCompare, 
  Activity, 
  FileText, 
  Sun, 
  Moon, 
  RefreshCw, 
  Database,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  theme,
  toggleTheme,
  onRefreshHealth,
  circulars = [],
  mappings = []
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Define static commands
  const navigationItems = [
    { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, category: 'Navigation', action: () => onNavigate('dashboard') },
    { id: 'library', label: 'Go to Circular Library', icon: Files, category: 'Navigation', action: () => onNavigate('library') },
    { id: 'extraction', label: 'Go to Obligation Extraction', icon: Eye, category: 'Navigation', action: () => onNavigate('extraction') },
    { id: 'comparison', label: 'Go to Circular Comparison', icon: GitCompare, category: 'Navigation', action: () => onNavigate('comparison') },
    { id: 'rule-impact', label: 'Go to Rule Impact', icon: Activity, category: 'Navigation', action: () => onNavigate('rule-impact') },
    { id: 'report', label: 'Go to Compliance Report', icon: FileText, category: 'Navigation', action: () => onNavigate('report') },
  ];

  const actionItems = [
    { id: 'toggle-theme', label: `Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`, icon: theme === 'light' ? Moon : Sun, category: 'System Actions', action: () => { toggleTheme(); onClose(); } },
    { id: 'refresh-health', label: 'Refresh System Connection Diagnostics', icon: RefreshCw, category: 'System Actions', action: () => { onRefreshHealth(); onClose(); } },
  ];

  // Dynamic circular records
  const dynamicCirculars = circulars.map(c => ({
    id: `circ-${c.id}`,
    label: `Open: ${c.title}`,
    sublabel: c.source_filename,
    icon: Files,
    category: 'Circular Documents',
    action: () => {
      // Just jump to library or extraction for this circular
      onNavigate('library');
      onClose();
    }
  }));

  // Dynamic rule mappings
  const dynamicRules = mappings.map((m, idx) => ({
    id: `map-${idx}`,
    label: `Rule Impact: ${m.obligation.substring(0, 60)}...`,
    sublabel: `Parameters: ${m.matched_parameters.join(', ')}`,
    icon: Activity,
    category: 'Taxonomy Parameters',
    action: () => {
      onNavigate('rule-impact');
      onClose();
    }
  }));

  // Combine lists
  const allItems = [...navigationItems, ...actionItems, ...dynamicCirculars, ...dynamicRules];

  // Filter items based on query
  const filteredItems = allItems.filter(item => {
    const searchString = `${item.label} ${item.category} ${item.sublabel || ''}`.toLowerCase();
    return searchString.includes(query.toLowerCase());
  });

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex]);

  // Adjust scroll position of active item
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Render grouped view
  const categories = Array.from(new Set(filteredItems.map(i => i.category)));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
          {/* Backdrop Blur */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs"
          />

          {/* Dialog Body */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative w-full max-w-xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-overlay z-10 flex flex-col max-h-[480px]"
          >
            {/* Input Header */}
            <div className="flex items-center px-4 border-b border-[var(--border-color)]">
              <Search className="w-4 h-4 text-[var(--text-muted)] mr-3 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a command or search platform records..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                className="w-full h-12 bg-transparent text-sm text-[var(--text-main)] placeholder-slate-400 focus:outline-none"
              />
              <span className="text-[10px] bg-[var(--bg-app)] border border-[var(--border-color)] px-1.5 py-0.5 rounded text-[var(--text-muted)] font-mono shrink-0 select-none shadow-sm">
                ESC
              </span>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-2" ref={listRef}>
              {filteredItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-2">
                  <Sparkles className="w-6 h-6 text-slate-300 dark:text-slate-700 animate-pulse" />
                  <span>No results matching "{query}"</span>
                </div>
              ) : (
                categories.map(cat => {
                  const catItems = filteredItems.filter(i => i.category === cat);
                  return (
                    <div key={cat} className="mb-2 last:mb-0">
                      <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase font-display">
                        {cat}
                      </div>
                      <div className="space-y-0.5">
                        {catItems.map((item) => {
                          const itemIndex = filteredItems.findIndex(fi => fi.id === item.id);
                          const isSelected = itemIndex === selectedIndex;
                          const Icon = item.icon;

                          return (
                            <button
                              key={item.id}
                              onClick={item.action}
                              onMouseEnter={() => setSelectedIndex(itemIndex)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-left transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-[var(--color-accent)] text-white shadow-sm' 
                                  : 'text-[var(--text-main)] hover:bg-[var(--bg-app)]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-[var(--text-muted)]'}`} />
                                <div className="truncate">
                                  <span className="block truncate">{item.label}</span>
                                  {item.sublabel && (
                                    <span className={`block text-[10px] mt-0.5 truncate ${isSelected ? 'text-white/70' : 'text-[var(--text-muted)]'}`}>
                                      {item.sublabel}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isSelected && (
                                <ArrowRight className="w-3.5 h-3.5 text-white shrink-0 animate-pulse" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer tips */}
            <div className="px-4 py-2 border-t border-[var(--border-color)] bg-[var(--bg-app)] flex justify-between items-center text-[10px] text-[var(--text-muted)] font-medium select-none">
              <span>Use ↑↓ keys to navigate, Enter to execute.</span>
              <span className="flex items-center gap-1">
                Shortcut: <kbd className="font-mono bg-[var(--bg-card)] border border-[var(--border-color)] px-1 rounded shadow-xs">Ctrl</kbd> + <kbd className="font-mono bg-[var(--bg-card)] border border-[var(--border-color)] px-1 rounded shadow-xs">K</kbd>
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
