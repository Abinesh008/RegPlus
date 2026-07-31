import React from 'react';
import { FiShield } from 'react-icons/fi';
import { 
  LuLayoutDashboard, 
  LuFiles, 
  LuEye, 
  LuGitCompare, 
  LuActivity, 
  LuFileText 
} from 'react-icons/lu';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LuLayoutDashboard },
  { id: 'library', label: 'Circular Library', icon: LuFiles },
  { id: 'extraction', label: 'Obligation Extraction', icon: LuEye },
  { id: 'comparison', label: 'Circular Comparison', icon: LuGitCompare },
  { id: 'rule-impact', label: 'Rule Impact', icon: LuActivity },
  { id: 'report', label: 'Compliance Report', icon: LuFileText },
];

export default function Sidebar({ currentPage, onNavigate }) {
  return (
    <aside className="w-64 bg-primary text-white flex flex-col min-h-screen shadow-lg no-print select-none">
      {/* Brand Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
        <FiShield className="w-8 h-8 text-accent animate-pulse" />
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white leading-none">RegPulse</h1>
          <span className="text-[10px] text-white/60 tracking-wider uppercase font-semibold">RBI Compliance</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 text-left cursor-pointer ${
                isActive 
                  ? 'bg-accent text-white font-bold shadow-md shadow-accent/20' 
                  : 'text-white/80 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-white/60 group-hover:text-white'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="px-6 py-4 border-t border-white/10 text-xs text-white/40">
        <span>v1.2.0 Enterprise</span>
      </div>
    </aside>
  );
}
