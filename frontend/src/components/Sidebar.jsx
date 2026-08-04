import React from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Files, 
  Eye, 
  GitCompare, 
  Activity, 
  FileText,
  Settings,
  HelpCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'library', label: 'Circular Library', icon: Files },
  { id: 'extraction', label: 'Obligation Extraction', icon: Eye },
  { id: 'comparison', label: 'Circular Comparison', icon: GitCompare },
  { id: 'rule-impact', label: 'Rule Impact', icon: Activity },
  { id: 'report', label: 'Compliance Report', icon: FileText },
];

const bottomItems = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help', label: 'Help Center', icon: HelpCircle },
  { id: 'about', label: 'About RegPulse', icon: Info }
];

export default function Sidebar({ 
  currentPage, 
  onNavigate, 
  isCollapsed, 
  onToggleCollapse 
}) {
  return (
    <motion.aside
      animate={{ width: isCollapsed ? 68 : 240 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="bg-[var(--color-primary)] text-slate-100 flex flex-col min-h-screen shadow-lg no-print select-none shrink-0 relative overflow-hidden font-sans border-r border-slate-800"
    >
      {/* Brand Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800 h-16 shrink-0 overflow-hidden">
        <div className="p-1 bg-blue-500/10 rounded-lg text-blue-400 shrink-0">
          <ShieldAlert className="w-6 h-6 animate-pulse" />
        </div>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="truncate"
          >
            <h1 className="text-base font-bold tracking-tight text-white leading-none font-display">RegPulse</h1>
            <span className="text-[9px] text-slate-400 tracking-wider uppercase font-bold mt-1 block">RBI Compliance</span>
          </motion.div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer group relative ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              {/* Active Indicator Bar */}
              {isActive && (
                <motion.div 
                  layoutId="activeIndicator"
                  className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-white"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              
              <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
              
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="truncate font-medium"
                >
                  {item.label}
                </motion.span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Secondary Bottom Actions */}
      <div className="px-3 py-4 border-t border-slate-800 space-y-1">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all text-left cursor-pointer group ${
                isActive 
                  ? 'bg-slate-800 text-white' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-white" />
              {!isCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </button>
          );
        })}

        {/* Collapse Button */}
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-white mt-4 cursor-pointer border border-slate-800 hover:border-slate-700 transition-all"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Version Tag */}
      <div className="px-5 py-3 border-t border-slate-800 text-[9px] text-slate-600 font-bold bg-slate-950/20 select-none overflow-hidden h-9 shrink-0 flex items-center">
        {!isCollapsed ? (
          <span>v1.2.0 ENTERPRISE CORE</span>
        ) : (
          <span>v1.2</span>
        )}
      </div>
    </motion.aside>
  );
}
