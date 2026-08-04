import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Sun, 
  Moon, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Database, 
  BrainCircuit, 
  Bell, 
  ChevronDown, 
  Layers,
  Sparkles
} from 'lucide-react';
import NotificationCenter from './NotificationCenter';

export default function Topbar({
  theme,
  toggleTheme,
  searchQuery,
  setSearchQuery,
  backendStatus,
  geminiStatus,
  isDemoMode,
  currentPageTitle,
  onRefreshHealth,

  // Command Palette
  onOpenSearch,

  // Notifications
  notifications = [],
  onMarkNotificationAsRead,
  onClearAllNotifications,
  onClearOneNotification,

  // Current Page
  currentPage = 'dashboard',

  // AI Insights Panel
  onToggleAIInsights = () => {},
  isAIInsightsOpen = false
}) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const unreadNotifications = notifications.filter(n => !n.read).length;

  // Format page names for breadcrumbs
  const getBreadcrumbs = () => {
    const segments = ['RegPulse'];
    if (currentPage === 'dashboard') {
      segments.push('Dashboard');
    } else if (currentPage === 'library') {
      segments.push('Circular Library');
    } else if (currentPage === 'extraction') {
      segments.push('Obligation Extraction');
    } else if (currentPage === 'comparison') {
      segments.push('Circular Comparison');
    } else if (currentPage === 'rule-impact') {
      segments.push('Rule Impact');
    } else if (currentPage === 'report') {
      segments.push('Compliance Report');
    }
    return segments;
  };

  return (
    <header className="h-16 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-6 flex items-center justify-between no-print select-none shadow-sm relative font-sans shrink-0">
      
      {/* Breadcrumbs & Workspace Info */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] min-w-0">
          {getBreadcrumbs().map((seg, idx, arr) => (
            <React.Fragment key={seg}>
              <span className={idx === arr.length - 1 ? "text-[var(--text-main)] font-bold truncate max-w-[150px]" : "truncate"}>
                {seg}
              </span>
              {idx < arr.length - 1 && <span className="text-slate-300 dark:text-slate-700 font-normal">/</span>}
            </React.Fragment>
          ))}
        </div>

        {/* Workspace Tag */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-[10px] text-[var(--text-muted)] px-2.5 py-0.5 rounded-full font-bold border border-[var(--border-color)]">
          <Layers className="w-3 h-3 text-[var(--color-accent)]" />
          <span>Jocata Production Core</span>
        </div>
      </div>

      {/* Right Tools Area */}
      <div className="flex items-center gap-4.5 shrink-0">
        
        {/* Search Command Palette Trigger */}
        <button
          onClick={onOpenSearch}
          className="flex items-center justify-between w-48 md:w-60 bg-[var(--bg-app)] border border-[var(--border-color)] hover:border-[var(--border-hover)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-muted)] transition-all cursor-pointer group shadow-xs"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-[var(--text-main)] transition-colors" />
            <span className="group-hover:text-[var(--text-main)] transition-colors">Search anything...</span>
          </div>
          <span className="font-mono text-[9px] bg-[var(--bg-card)] border border-[var(--border-color)] px-1 rounded shadow-xs">
            Ctrl K
          </span>
        </button>

        {/* Backend & Gemini status indicators */}
        <div className="hidden sm:flex items-center gap-3.5 border-r border-[var(--border-color)] pr-4.5">
          {/* Backend Api connection status */}
          <div 
            className="flex items-center gap-1.5 text-xs font-semibold"
            title="FastAPI Server Diagnostics"
          >
            {backendStatus === 'connected' ? (
              <span className="flex items-center gap-1 text-[var(--color-success)]">
                <CheckCircle className="w-3.5 h-3.5" />
                Backend
              </span>
            ) : backendStatus === 'checking' ? (
              <span className="flex items-center gap-1 text-[var(--color-warning)]">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Backend
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[var(--color-danger)]">
                <AlertCircle className="w-3.5 h-3.5" />
                Backend
              </span>
            )}
          </div>

          {/* Gemini connection status */}
          <div 
            className="flex items-center gap-1.5 text-xs font-semibold"
            title={geminiStatus === 'connected' ? "Connected to Google Gemini API" : "Gemini Mock Offline Mode Active"}
          >
            {geminiStatus === 'connected' ? (
              <span className="flex items-center gap-1 text-[var(--color-accent)] font-bold">
                <BrainCircuit className="w-3.5 h-3.5" />
                Gemini
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[var(--text-muted)]">
                <BrainCircuit className="w-3.5 h-3.5 text-slate-400" />
                Mock Mode
              </span>
            )}
          </div>

          {/* Diagnostic manual reload */}
          <button
            onClick={onRefreshHealth}
            className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 hover:bg-[var(--bg-app)] rounded-lg transition-colors cursor-pointer"
            title="Force run diagnostic check"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Notification Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-1.5 hover:bg-[var(--bg-app)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer relative"
            title="Compliance notification center"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--color-danger)] border border-[var(--bg-card)] shadow-xs animate-ping" />
            )}
          </button>

          {/* Notification dropdown box */}
          <NotificationCenter
            isOpen={isNotifOpen}
            onClose={() => setIsNotifOpen(false)}
            notifications={notifications}
            onMarkAsRead={onMarkNotificationAsRead}
            onClearAll={onClearAllNotifications}
            onClearOne={onClearOneNotification}
          />
        </div>

        {/* Theme Switching Trigger */}
        <button
          onClick={toggleTheme}
          className="p-1.5 hover:bg-[var(--bg-app)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
        >
          <motion.div
            animate={{ rotate: theme === 'light' ? 0 : 180 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            {theme === 'light' ? <Moon className="w-4.25 h-4.25" /> : <Sun className="w-4.25 h-4.25" />}
          </motion.div>
        </button>

        {/* Toggle AI Insights Panel */}
        {currentPage !== 'dashboard' && currentPage !== 'settings' && currentPage !== 'help' && currentPage !== 'about' && (
          <button
            onClick={onToggleAIInsights}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer relative ${
              isAIInsightsOpen 
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800' 
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-[var(--text-main)] border border-transparent'
            }`}
            title="Toggle AI Insights Panel"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        )}

        {/* User Profile avatar dropdown */}
        <div className="relative border-l border-[var(--border-color)] pl-4.5" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 hover:opacity-85 transition-opacity cursor-pointer text-left"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-sm ring-1 ring-[var(--border-color)]">
              AN
            </div>
            <div className="hidden md:block">
              <span className="block text-[11px] font-bold text-[var(--text-main)] leading-none">Aditya Nair</span>
              <span className="block text-[9px] text-[var(--text-muted)] mt-0.5 font-medium leading-none">Risk Manager</span>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>

          {/* Profile Popover details */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-lg z-50 overflow-hidden text-xs py-1.5 text-[var(--text-main)] font-medium">
              <div className="px-3.5 py-2 border-b border-[var(--border-color)] bg-[var(--bg-app)]/35">
                <span className="block font-bold truncate">Aditya Nair</span>
                <span className="block text-[10px] text-[var(--text-muted)] truncate">aditya.nair@jocata.com</span>
              </div>
              <div className="py-1">
                <button className="w-full text-left px-3.5 py-1.5 hover:bg-[var(--bg-app)] cursor-pointer">
                  Settings Profiles
                </button>
                <button className="w-full text-left px-3.5 py-1.5 hover:bg-[var(--bg-app)] cursor-pointer text-[var(--color-danger)] font-semibold">
                  Sign Out Session
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
