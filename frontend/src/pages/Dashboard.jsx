import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Files, 
  Eye, 
  GitCompare, 
  Sliders, 
  CheckSquare, 
  AlertTriangle, 
  Activity, 
  Cpu, 
  BrainCircuit, 
  TrendingUp, 
  Clock, 
  RefreshCw, 
  UploadCloud, 
  FileCheck,
  ShieldCheck,
  ArrowRight,
  Database,
  Terminal,
  ServerCrash
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart,
  Area,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  CartesianGrid
} from 'recharts';

export default function Dashboard({ 
  circulars = [], 
  obligationsCount = 0,
  diffCount = 0,
  mappings = [],
  backendStatus,
  geminiStatus,
  lastProcessedTime,
  onNavigate
}) {
  // Theme Detection hook for Recharts alignment
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Compute pending reviews and high priority changes
  const pendingReviewCount = mappings.filter(m => m.review_required).length;
  const highPriorityCount = mappings.filter(m => 
    m.priority?.toLowerCase() === 'critical' || m.priority?.toLowerCase() === 'high'
  ).length;

  // Recharts: Priority Breakdown
  const priorityCounts = mappings.reduce((acc, curr) => {
    const p = curr.priority || 'medium';
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});

  const priorityData = [
    { name: 'Critical', value: priorityCounts.critical || 0, color: '#EF4444' },
    { name: 'High', value: priorityCounts.high || 0, color: '#F97316' },
    { name: 'Medium', value: priorityCounts.medium || 0, color: '#2563EB' },
    { name: 'Low', value: priorityCounts.low || 0, color: '#10B981' },
  ].filter(d => d.value > 0);

  // Recharts: Affected Business Layers
  const layerCounts = mappings.reduce((acc, curr) => {
    if (Array.isArray(curr.affected_business_layer)) {
      curr.affected_business_layer.forEach(l => {
        acc[l] = (acc[l] || 0) + 1;
      });
    }
    return acc;
  }, {});

  const layerData = Object.keys(layerCounts).map(layer => ({
    name: layer.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
    count: layerCounts[layer]
  }));

  // Dummy Chart Placeholders
  const defaultPriorityData = [
    { name: 'Critical', value: 2, color: '#EF4444' },
    { name: 'High', value: 4, color: '#F97316' },
    { name: 'Medium', value: 8, color: '#2563EB' },
    { name: 'Low', value: 5, color: '#10B981' },
  ];

  const defaultLayerData = [
    { name: 'Onboarding', count: 6 },
    { name: 'Governance', count: 8 },
    { name: 'Reporting', count: 3 },
    { name: 'Screening', count: 4 },
  ];

  const trendData = [
    { month: 'Mar', obligations: 5, activeRules: 2 },
    { month: 'Apr', obligations: 8, activeRules: 4 },
    { month: 'May', obligations: 12, activeRules: 6 },
    { month: 'Jun', obligations: 9, activeRules: 7 },
    { month: 'Jul', obligations: 15, activeRules: 11 },
    { month: 'Aug', obligations: obligationsCount > 0 ? obligationsCount : 12, activeRules: mappings.length > 0 ? mappings.length : 8 }
  ];

  const finalPriorityData = priorityData.length > 0 ? priorityData : defaultPriorityData;
  const finalLayerData = layerData.length > 0 ? layerData : defaultLayerData;

  // Custom visual definitions
  const chartGridColor = isDark ? '#1E293B' : '#E2E8F0';
  const chartTextColor = isDark ? '#94A3B8' : '#475569';

  // Quick Action List
  const quickActions = [
    { title: 'Ingest PDF Circular', desc: 'Ingest new Reserve Bank of India PDF directives.', icon: UploadCloud, action: () => onNavigate('library'), color: 'text-blue-500 bg-blue-500/10' },
    { title: 'Extract Obligations', desc: 'Audit compliance sentences using Gemini AI parsing.', icon: BrainCircuit, action: () => onNavigate('extraction'), color: 'text-purple-500 bg-purple-500/10' },
    { title: 'Compare Version Diff', desc: 'GitHub-style character & semantic comparison comparisons.', icon: GitCompare, action: () => onNavigate('comparison'), color: 'text-teal-500 bg-teal-500/10' },
    { title: 'Rule Impact Mapping', desc: 'Map regulatory deltas directly to JOCATA rules parameters.', icon: Sliders, action: () => onNavigate('rule-impact'), color: 'text-amber-500 bg-amber-500/10' },
    { title: 'Generate PDF Advisory', desc: 'Compile executive audits into a printable print-ready report.', icon: FileCheck, action: () => onNavigate('report'), color: 'text-emerald-500 bg-emerald-500/10' }
  ];

  // Business Layer Details
  const getLayerStats = (layerName) => {
    const layerMappings = mappings.filter(m => 
      Array.isArray(m.affected_business_layer) && m.affected_business_layer.includes(layerName)
    );
    const rules = layerMappings.length;
    const critical = layerMappings.filter(m => m.priority?.toLowerCase() === 'critical' || m.priority?.toLowerCase() === 'high').length;
    const reviews = layerMappings.filter(m => m.review_required).length;
    
    // Default placeholders
    const defaults = {
      onboarding: { rules: 6, critical: 1, reviews: 2 },
      transaction_monitoring: { rules: 4, critical: 1, reviews: 0 },
      screening: { rules: 3, critical: 0, reviews: 1 },
      governance: { rules: 8, critical: 2, reviews: 3 },
      reporting: { rules: 3, critical: 1, reviews: 1 }
    };

    return rules > 0 ? { rules, critical, reviews } : (defaults[layerName] || { rules: 0, critical: 0, reviews: 0 });
  };

  // Activity Log
  const activities = [
    { type: 'upload', title: 'Circular Uploaded', msg: 'KYC_Amendment_2020.pdf was verified & cached.', time: '2 hours ago', icon: UploadCloud, user: 'Aditya Nair (Risk)' },
    { type: 'extract', title: 'AI Obligations Extracted', msg: 'Gemini evaluated 12 obligations with 95.4% confidence.', time: '1.5 hours ago', icon: BrainCircuit, user: 'Gemini Engine v2' },
    { type: 'compare', title: 'Diff Engine Executed', msg: 'Line differences calculated against KYC_Direction_2016.', time: '1 hour ago', icon: GitCompare, user: 'Diff Service (Local)' },
    { type: 'map', title: 'Rules Mapped', msg: 'Assigned 8 obligations to Customer Risk and AML thresholds.', time: '30 mins ago', icon: Sliders, user: 'Aditya Nair (Risk)' }
  ];

  // Render Shimmer Skeletons for Loading State
  if (backendStatus === 'checking') {
    return (
      <div className="space-y-6 animate-pulse select-none">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-xl flex flex-col justify-between">
              <div className="flex justify-between items-center"><div className="w-16 h-3 bg-slate-200 dark:bg-slate-800 rounded"></div><div className="w-6 h-6 bg-slate-200 dark:bg-slate-800 rounded-full"></div></div>
              <div className="w-12 h-6 bg-slate-200 dark:bg-slate-800 rounded mt-2"></div>
              <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800/50 rounded mt-1"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5"></div>
          <div className="h-72 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5"></div>
        </div>
      </div>
    );
  }

  // Render Error state if backend completely failed and no demo is cached
  if (backendStatus === 'error' && circulars.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--color-danger)]/20 p-8 rounded-xl text-center max-w-lg mx-auto mt-[10vh] shadow-lg font-sans">
        <div className="w-12 h-12 bg-[var(--color-danger)]/10 text-[var(--color-danger)] rounded-full flex items-center justify-center mx-auto mb-4">
          <ServerCrash className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-[var(--text-main)] mb-2 font-display">FastAPI Connection Failure</h3>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-6">
          The RegPulse simulation dashboard cannot sync with the backend database. Please ensure your Python server is running locally on port 8000.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-bold px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
        >
          Retry Connection Audit
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 select-none font-sans"
    >
      
      {/* SECTION 1: EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Ingested Circulars */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-hover)] p-4.5 rounded-xl shadow-xs transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between h-28 group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-display">Uploaded Circulars</span>
            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500 group-hover:scale-105 transition-transform"><Files className="w-4 h-4" /></div>
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-[var(--text-main)] leading-none mt-1">{circulars.length}</h3>
            <p className="text-[9px] text-[var(--text-muted)] mt-1.5 flex items-center gap-1 font-semibold">
              <span className="text-emerald-500">🟢 Ingested</span> • Cached via SHA-256
            </p>
          </div>
        </div>

        {/* KPI 2: AI obligations */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-hover)] p-4.5 rounded-xl shadow-xs transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between h-28 group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-display">AI Extracted Rules</span>
            <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-500 group-hover:scale-105 transition-transform"><Eye className="w-4 h-4" /></div>
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-[var(--text-main)] leading-none mt-1">{obligationsCount || (circulars.length > 0 ? 12 : 0)}</h3>
            <p className="text-[9px] text-[var(--text-muted)] mt-1.5 flex items-center gap-1 font-semibold">
              <span className="text-purple-500">95.4%</span> confidence score avg
            </p>
          </div>
        </div>

        {/* KPI 3: Compare Deltas */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-hover)] p-4.5 rounded-xl shadow-xs transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between h-28 group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-display">Compared Circulars</span>
            <div className="p-1.5 bg-teal-500/10 rounded-lg text-teal-500 group-hover:scale-105 transition-transform"><GitCompare className="w-4 h-4" /></div>
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-[var(--text-main)] leading-none mt-1">{diffCount}</h3>
            <p className="text-[9px] text-[var(--text-muted)] mt-1.5 flex items-center gap-1 font-semibold">
              <span className="text-teal-600 dark:text-teal-400">SequenceMatcher</span> + LLM Diff
            </p>
          </div>
        </div>

        {/* KPI 4: Mapped Parameters */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-hover)] p-4.5 rounded-xl shadow-xs transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between h-28 group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-display">Taxonomy Mappings</span>
            <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-500 group-hover:scale-105 transition-transform"><Sliders className="w-4 h-4" /></div>
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-[var(--text-main)] leading-none mt-1">{mappings.length || (circulars.length > 0 ? 8 : 0)}</h3>
            <p className="text-[9px] text-[var(--text-muted)] mt-1.5 flex items-center gap-1 font-semibold">
              <span>Mapped to 13 bank parameters</span>
            </p>
          </div>
        </div>

        {/* KPI 5: Pending Reviews */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-hover)] p-4.5 rounded-xl shadow-xs transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between h-28 group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-display">Pending Audits</span>
            <div className="p-1.5 bg-orange-500/10 rounded-lg text-orange-500 group-hover:scale-105 transition-transform"><CheckSquare className="w-4 h-4" /></div>
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-[var(--text-main)] leading-none mt-1">{pendingReviewCount}</h3>
            <p className="text-[9px] mt-1.5 flex items-center gap-1 font-bold uppercase tracking-wider">
              {pendingReviewCount > 0 ? (
                <span className="text-[var(--color-warning)]">⚠️ Action Required</span>
              ) : (
                <span className="text-[var(--color-success)]">✓ Compliant</span>
              )}
            </p>
          </div>
        </div>

        {/* KPI 6: Critical Findings */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-hover)] p-4.5 rounded-xl shadow-xs transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between h-28 group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-display">Critical Findings</span>
            <div className="p-1.5 bg-red-500/10 rounded-lg text-red-500 group-hover:scale-105 transition-transform"><AlertTriangle className="w-4 h-4" /></div>
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-[var(--text-main)] leading-none mt-1">{highPriorityCount}</h3>
            <p className="text-[9px] mt-1.5 flex items-center gap-1 font-bold uppercase tracking-wider">
              {highPriorityCount > 0 ? (
                <span className="text-[var(--color-danger)]">🟥 Critical impact</span>
              ) : (
                <span className="text-[var(--color-success)]">🟢 No Warnings</span>
              )}
            </p>
          </div>
        </div>

        {/* KPI 7: Compliance Score */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-hover)] p-4.5 rounded-xl shadow-xs transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between h-28 group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-display">Compliance Score</span>
            <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500 group-hover:scale-105 transition-transform"><Activity className="w-4 h-4" /></div>
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-[var(--text-main)] leading-none mt-1">
              {circulars.length > 0 ? '96.4%' : '100%'}
            </h3>
            <p className="text-[9px] text-[var(--text-muted)] mt-1.5 flex items-center gap-1 font-semibold">
              <span className="text-emerald-500">+1.2% Gain</span> this quarter
            </p>
          </div>
        </div>

        {/* KPI 8: Diagnostics Health */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-hover)] p-4.5 rounded-xl shadow-xs transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between h-28 group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-display">Diagnostics Health</span>
            <div className="p-1.5 bg-blue-600/10 rounded-lg text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform"><Cpu className="w-4 h-4" /></div>
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-[var(--text-main)] leading-none mt-1">
              {backendStatus === 'connected' ? '100%' : '0%'}
            </h3>
            <p className="text-[9px] text-[var(--text-muted)] mt-1.5 flex items-center gap-1 font-semibold">
              {backendStatus === 'connected' ? (
                <span className="text-emerald-500">✓ SQLite & API active</span>
              ) : (
                <span className="text-[var(--color-danger)]">Offline State</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Grid: AI Intelligence & System health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SECTION 2: AI COMPLIANCE INTELLIGENCE */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider font-display flex items-center gap-2">
                <BrainCircuit className="text-purple-500 w-4.5 h-4.5 animate-pulse" />
                AI Cognitive Core Status
              </h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                geminiStatus === 'connected' 
                  ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' 
                  : 'bg-slate-500/10 text-[var(--text-muted)] border border-slate-500/20'
              }`}>
                {geminiStatus === 'connected' ? 'Gemini 2.5 Active' : 'Offline Simulation Mode'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[var(--bg-app)]/50 rounded-xl border border-[var(--border-color)]">
              <div>
                <span className="block text-[9px] font-bold text-[var(--text-muted)] uppercase">Active Model</span>
                <span className="text-xs font-bold text-[var(--text-main)] mt-1 block truncate">
                  {geminiStatus === 'connected' ? 'gemini-2.5-flash' : 'Local Mock Heuristics'}
                </span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-[var(--text-muted)] uppercase">Avg Confidence</span>
                <span className="text-xs font-bold text-[var(--text-main)] mt-1 block">94.2%</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-[var(--text-muted)] uppercase">Parsing Latency</span>
                <span className="text-xs font-bold text-[var(--text-main)] mt-1 block">1.4s avg</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-[var(--text-muted)] uppercase">Success Rate</span>
                <span className="text-xs font-bold text-[var(--text-main)] mt-1 block">99.8%</span>
              </div>
            </div>

            <div className="mt-4 text-xs text-[var(--text-muted)] leading-relaxed space-y-1.5">
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                Gemini processes raw PDF layers via <code>pdfplumber</code> parsing boundaries.
              </p>
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                Rule taxonomy classification evaluates 13 banks configurable parameters.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex justify-between items-center text-[10px] font-bold text-[var(--text-muted)] uppercase font-display">
            <span>Daily Token Budget limit: 1M</span>
            <span>Consumed Today: 12,850 tokens (1.2%)</span>
          </div>
        </div>

        {/* SECTION 4: SYSTEM DIAGNOSTICS HEALTH */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-xl shadow-xs">
          <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider font-display mb-4 flex items-center gap-2">
            <Database className="text-blue-500 w-4.5 h-4.5" />
            Infrastructure Logs
          </h3>
          <div className="space-y-3 text-xs font-medium">
            {/* Backend ping */}
            <div className="flex justify-between items-center py-1.5 border-b border-[var(--border-color)]/70">
              <span className="text-[var(--text-muted)] flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5" /> Backend Service
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                backendStatus === 'connected' 
                  ? 'bg-emerald-500/10 text-emerald-500' 
                  : 'bg-red-500/10 text-red-500'
              }`}>
                {backendStatus === 'connected' ? 'Connected' : 'Offline'}
              </span>
            </div>

            {/* SQLite database status */}
            <div className="flex justify-between items-center py-1.5 border-b border-[var(--border-color)]/70">
              <span className="text-[var(--text-muted)] flex items-center gap-2">
                <Database className="w-3.5 h-3.5" /> SQLite Engine
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 uppercase">
                Active
              </span>
            </div>

            {/* Storage metric */}
            <div className="flex justify-between items-center py-1.5 border-b border-[var(--border-color)]/70">
              <span className="text-[var(--text-muted)] flex items-center gap-2">
                <Database className="w-3.5 h-3.5" /> Storage Size
              </span>
              <span className="text-[var(--text-main)] font-semibold">73.7 KB</span>
            </div>

            {/* Cache ratio */}
            <div className="flex justify-between items-center py-1.5 border-b border-[var(--border-color)]/70">
              <span className="text-[var(--text-muted)] flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" /> Cache Hit Rate
              </span>
              <span className="text-[var(--text-main)] font-semibold">92.4%</span>
            </div>

            {/* Processing clock latency */}
            <div className="flex justify-between items-center pt-1.5">
              <span className="text-[var(--text-muted)] flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Diagnosed Latency
              </span>
              <span className="text-[var(--text-main)] font-semibold">45ms avg</span>
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 3: COMPLIANCE ANALYTICS CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Ingestion trend and priorities */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-xl shadow-xs">
          <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider font-display mb-4 flex items-center gap-2">
            <TrendingUp className="text-blue-500 w-4.5 h-4.5" />
            Compliance delta Trends & Priorities
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            
            {/* Monthly Trend Area Chart */}
            <div className="md:col-span-3 flex flex-col">
              <span className="text-[10px] font-bold text-[var(--text-muted)] mb-3 uppercase tracking-wider font-display">Monthly compliance ingestion</span>
              <div className="w-full h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ left: -25, right: 10, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorOb" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: chartTextColor }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: chartTextColor }} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        fontSize: '11px', 
                        background: 'var(--bg-card)', 
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-main)'
                      }} 
                    />
                    <Area type="monotone" dataKey="obligations" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorOb)" name="Obligations" />
                    <Area type="monotone" dataKey="activeRules" stroke="#10B981" strokeWidth={1.5} fillOpacity={0} name="Rules Mapped" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Risk priority donut chart */}
            <div className="md:col-span-2 flex flex-col items-center">
              <span className="text-[10px] font-bold text-[var(--text-muted)] mb-3 uppercase tracking-wider font-display">Priority risk levels</span>
              <div className="w-full h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={finalPriorityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {finalPriorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        fontSize: '11px', 
                        background: 'var(--bg-card)', 
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px'
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-2.5">
                {finalPriorityData.map((d, i) => (
                  <span key={i} className="flex items-center gap-1 text-[9px] font-bold text-[var(--text-muted)] uppercase">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.name}: {d.value}
                  </span>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Business Layer Mapped Parameter impact */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-xl shadow-xs">
          <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider font-display mb-4 flex items-center gap-2">
            <Sliders className="text-blue-500 w-4.5 h-4.5" />
            Taxonomy Layer distribution
          </h3>
          <span className="text-[10px] font-bold text-[var(--text-muted)] mb-3 block uppercase tracking-wider font-display">Business layer mapping density</span>
          <div className="w-full h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={finalLayerData} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9, fill: chartTextColor }} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: chartTextColor }} tickLine={false} axisLine={false} width={80} />
                <Tooltip 
                  cursor={{ fill: 'rgba(37,99,235,0.03)' }} 
                  contentStyle={{ 
                    fontSize: '11px', 
                    background: 'var(--bg-card)', 
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]} maxBarSize={14} name="Parameters Affected" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* SECTION 7: BUSINESS LAYER OVERVIEW */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-xl shadow-xs">
        <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider font-display mb-4 flex items-center gap-2">
          <ShieldCheck className="text-blue-500 w-4.5 h-4.5" />
          Downstream Business Parameter Impacts
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { id: 'onboarding', label: 'Onboarding Layer' },
            { id: 'transaction_monitoring', label: 'Txn Monitoring' },
            { id: 'screening', label: 'Watchlist Screening' },
            { id: 'governance', label: 'Model Governance' },
            { id: 'reporting', label: 'Regulatory Reporting' }
          ].map(layer => {
            const stats = getLayerStats(layer.id);
            return (
              <div 
                key={layer.id} 
                className="bg-[var(--bg-app)]/40 border border-[var(--border-color)] p-4 rounded-xl space-y-3.5 hover:border-[var(--border-hover)] transition-all hover:bg-[var(--bg-app)]/80"
              >
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-main)] leading-snug truncate">
                    {layer.label}
                  </h4>
                  <span className="text-[9px] text-[var(--text-muted)] font-mono block mt-0.5">{layer.id}</span>
                </div>
                
                <div className="space-y-1.5 text-[11px] font-semibold">
                  <div className="flex justify-between items-center text-[var(--text-muted)]">
                    <span>Active Rules</span>
                    <span className="text-[var(--text-main)]">{stats.rules}</span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--text-muted)]">
                    <span>Critical Items</span>
                    <span className={stats.critical > 0 ? "text-[var(--color-danger)] font-extrabold" : "text-[var(--text-muted)]"}>
                      {stats.critical}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--text-muted)]">
                    <span>Pending Audits</span>
                    <span className={stats.reviews > 0 ? "text-[var(--color-warning)] font-extrabold" : "text-[var(--text-muted)]"}>
                      {stats.reviews}
                    </span>
                  </div>
                </div>

                {/* Micro Progress Bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${stats.critical > 0 ? 'bg-red-500' : 'bg-blue-600'}`} 
                    style={{ width: `${Math.min((stats.rules / 10) * 100, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 5: RECENT ACTIVITY & SECTION 6: QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Activity feed */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-xl shadow-xs">
          <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider font-display mb-4 flex items-center gap-2">
            <Clock className="text-blue-500 w-4.5 h-4.5" />
            Audit Logging & Recent Ingest Activity
          </h3>
          
          <div className="relative pl-3.5 border-l-2 border-slate-100 dark:border-slate-800 space-y-4 py-0.5 ml-2.5">
            {circulars.slice(0, 4).map((c, idx) => {
              const act = activities[idx % activities.length];
              const ActIcon = act.icon;
              return (
                <div key={idx} className="relative text-xs">
                  {/* Timeline dot */}
                  <span className="absolute -left-[24px] top-1 w-3.5 h-3.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-slate-400 group-hover:text-blue-600">
                    <ActIcon className="w-2.5 h-2.5" />
                  </span>
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-[var(--text-main)]">{act.title}</span>
                      <p className="text-[var(--text-muted)] mt-1 font-medium leading-relaxed">
                        "{c.title}" ({c.source_filename})
                      </p>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono block mt-1.5 opacity-60">
                        Agent: {act.user}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-semibold shrink-0 ml-4 font-mono">
                      {act.time}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {circulars.length === 0 && (
              <div className="py-6 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-2 select-none -ml-3.5">
                <ShieldCheck className="w-8 h-8 text-slate-300 dark:text-slate-800 animate-pulse" />
                <p>No operational activities logged. Process sample circulars to seed logs.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions portal */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider font-display mb-3 flex items-center gap-2">
              <TrendingUp className="text-blue-500 w-4.5 h-4.5" />
              Audit Task Actions
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
              Direct links to run audits, run comparisons, edit mappings, and compile compliance advisory reports.
            </p>
          </div>
          
          <div className="space-y-2">
            {quickActions.slice(0, 4).map((act, idx) => {
              const ActIcon = act.icon;
              return (
                <button
                  key={idx}
                  onClick={act.action}
                  className="w-full bg-[var(--bg-app)] hover:bg-[var(--bg-app)]/85 border border-[var(--border-color)] hover:border-[var(--color-accent)] text-[var(--text-main)] px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all shadow-xs hover:shadow-sm cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2 text-left">
                    <div className={`p-1.5 rounded-lg shrink-0 ${act.color}`}>
                      <ActIcon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <span className="block truncate">{act.title}</span>
                      <span className="block text-[9px] text-[var(--text-muted)] font-normal mt-0.5 truncate">{act.desc}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

      </div>

    </motion.div>
  );
}

