import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRightLeft, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  RefreshCw, 
  Settings,
  Zap,
  GitCompare,
  ArrowUpDown,
  FileText,
  Sliders,
  Sparkles,
  TrendingUp,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
  Columns,
  List,
  ExternalLink
} from 'lucide-react';
import api from '../services/api';

export default function CircularComparison({
  circulars = [],
  onCompareSuccess,
  onNavigate
}) {
  const [oldCircularId, setOldCircularId] = useState('');
  const [newCircularId, setNewCircularId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [suggestion, setSuggestion] = useState('');
  
  // Results states
  const [diffSummary, setDiffSummary] = useState(null); // { diff_id, new, changed, unchanged }
  const [diffDetails, setDiffDetails] = useState(null); // { NEW: [], CHANGED: [], UNCHANGED: [] }
  const [obligationsMap, setObligationsMap] = useState({}); // { id: text }

  // Interactive Diff modes
  const [diffMode, setDiffMode] = useState('unified'); // 'unified' | 'side-by-side'
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'new' | 'modified' | 'unchanged'
  const [expandedId, setExpandedId] = useState(null);

  // Load detailed diff obligations
  const loadDiffDetails = async (diffId, oldId, newId) => {
    const resDetails = await api.getDiffDetail(diffId);
    if (!resDetails.success) {
      setErrorMessage('Failed to fetch detailed difference categories.');
      setSuggestion(resDetails.suggestion || '');
      return;
    }
    
    const [resOldOb, resNewOb] = await Promise.all([
      oldId ? api.getCircularObligations(oldId) : { success: true, data: [] },
      api.getCircularObligations(newId)
    ]);

    const obMap = {};
    if (resOldOb.success && resOldOb.data) {
      resOldOb.data.forEach(o => { obMap[o.id] = o; });
    }
    if (resNewOb.success && resNewOb.data) {
      resNewOb.data.forEach(o => { obMap[o.id] = o; });
    }

    setObligationsMap(obMap);
    setDiffDetails(resDetails.data);
  };

  const handleCompare = async () => {
    if (!newCircularId) {
      setErrorMessage('Please select the new circular.');
      return;
    }
    if (oldCircularId && Number(oldCircularId) === Number(newCircularId)) {
      setErrorMessage('Cannot compare a circular with itself. Choose different documents.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setDiffSummary(null);
    setDiffDetails(null);

    const oldId = oldCircularId ? Number(oldCircularId) : null;
    const newId = Number(newCircularId);

    const res = await api.compareCirculars(oldId, newId);
    if (res.success && res.data) {
      setDiffSummary(res.data);
      await loadDiffDetails(res.data.diff_id, oldId, newId);
      onCompareSuccess && onCompareSuccess(res.data.diff_id, oldId, newId);
    } else {
      setErrorMessage(res.error || 'Comparison engine error.');
      setSuggestion(res.suggestion || '');
    }
    setLoading(false);
  };

  const swapVersions = () => {
    const temp = oldCircularId;
    setOldCircularId(newCircularId);
    setNewCircularId(temp);
  };

  const getObligationText = (id) => obligationsMap[id]?.obligation_text || `Obligation ID: ${id}`;
  const getObligationClause = (id) => obligationsMap[id]?.source_clause || '';

  return (
    <div className="space-y-6 font-sans select-none">
      
      {/* Layout Grid: Selector Left, Diff Center, Inspector Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: VERSION SELECTOR PANEL (lg:col-span-3) */}
        <div className="lg:col-span-3 bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-xs space-y-4">
          <div>
            <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider font-display flex items-center gap-1.5 border-b border-[var(--border-color)] pb-2.5">
              <GitCompare className="text-blue-500 w-4.5 h-4.5" />
              Version Manager
            </h3>
          </div>

          {/* Historical selection dropdown */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Historical Reference (Old)
            </label>
            <select
              value={oldCircularId}
              onChange={(e) => setOldCircularId(e.target.value)}
              className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-main)] font-semibold focus:outline-none"
            >
              <option value="">-- Baseline Circular --</option>
              {circulars.map(c => (
                <option key={c.id} value={c.id}>{c.title} ({c.source_filename})</option>
              ))}
            </select>
          </div>

          {/* Swap icon */}
          <div className="flex justify-center py-1">
            <button 
              onClick={swapVersions}
              className="p-1.5 border border-[var(--border-color)] hover:border-blue-500 text-[var(--text-muted)] hover:text-blue-500 rounded-full bg-[var(--bg-card)] cursor-pointer transition-colors"
              title="Swap baseline and target circulars"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Target selection dropdown */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Amended Directives (New Target)
            </label>
            <select
              value={newCircularId}
              onChange={(e) => setNewCircularId(e.target.value)}
              className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-main)] font-semibold focus:outline-none"
            >
              <option value="">-- Target Circular --</option>
              {circulars.map(c => (
                <option key={c.id} value={c.id}>{c.title} ({c.source_filename})</option>
              ))}
            </select>
          </div>

          {/* Compare Button */}
          <button
            onClick={handleCompare}
            disabled={loading}
            className="w-full text-center py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <><RefreshCw className="animate-spin w-3.5 h-3.5" /> Comparing...</>
            ) : (
              <><GitCompare className="w-3.5 h-3.5" /> Compare Circulars</>
            )}
          </button>
        </div>

        {/* CENTER COLUMN: AI DIFFERENCE VIEWER (lg:col-span-6) */}
        <div className="lg:col-span-6 space-y-4">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Unified/Side-by-side mode switcher toolbar */}
          {diffSummary && diffDetails && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-3 rounded-xl shadow-xs flex justify-between items-center text-xs">
              <div className="flex gap-2">
                <button
                  onClick={() => setDiffMode('unified')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer ${
                    diffMode === 'unified' ? 'bg-blue-600 text-white' : 'hover:bg-[var(--bg-app)] text-[var(--text-muted)]'
                  }`}
                >
                  <List className="w-3.5 h-3.5" /> Unified
                </button>
                <button
                  onClick={() => setDiffMode('side-by-side')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer ${
                    diffMode === 'side-by-side' ? 'bg-blue-600 text-white' : 'hover:bg-[var(--bg-app)] text-[var(--text-muted)]'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" /> Side-by-side
                </button>
              </div>

              {/* Status Filters */}
              <div className="flex gap-1">
                {['all', 'new', 'changed'].map(t => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      activeTab === t ? 'bg-blue-500/10 text-blue-500' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Skeletons on loading */}
          {loading && (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-28 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] shimmer-loader" />
              ))}
            </div>
          )}

          {/* Empty state prompt */}
          {!diffSummary && !loading && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-12 rounded-xl text-center flex flex-col items-center justify-center min-h-[300px] shadow-xs">
              <GitCompare className="w-10 h-10 text-slate-300 dark:text-slate-800 animate-pulse mb-3" />
              <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider font-display mb-1">
                No active comparison
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Select baseline (old) and target (new) circulars on the version manager panel to parse compliance version deltas.
              </p>
            </div>
          )}

          {/* Git-diff content cards list */}
          {diffSummary && diffDetails && (
            <div className="space-y-4">
              
              {/* Executive Summary card */}
              <div className="bg-[var(--bg-card)] border border-blue-500/30 p-4 rounded-xl shadow-xs space-y-3">
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider flex items-center gap-1.5 font-display">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  AI Cognitive Change Summary
                </span>
                <div className="text-xs leading-relaxed space-y-2 text-[var(--text-muted)] font-medium">
                  <p><strong className="text-[var(--text-main)]">Change Scope:</strong> Extracted {diffSummary.new} new obligations and {diffSummary.changed} modifications. Total matched clauses: {diffSummary.unchanged}.</p>
                  <p><strong className="text-[var(--text-main)]">Operational Risk:</strong> Regulatory amendments in KYC review timelines require workflow rule configuration updates.</p>
                </div>
              </div>

              {/* NEW Clauses Section */}
              {((activeTab === 'all' || activeTab === 'new') && diffDetails.NEW?.length > 0) && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider font-display flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Ingested New Obligations ({diffDetails.NEW.length})
                  </h4>
                  
                  <div className="space-y-2.5">
                    {diffDetails.NEW.map((d, i) => (
                      <div key={i} className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl text-xs space-y-2">
                        <div className="flex justify-between items-center select-none font-bold uppercase text-[9px] text-emerald-600">
                          <span>NEW CLAUSE</span>
                          <span>Clause {getObligationClause(d.new_obligation_id)}</span>
                        </div>
                        <p className="text-[var(--text-main)] font-semibold leading-relaxed">
                          {getObligationText(d.new_obligation_id)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CHANGED Clauses Section */}
              {((activeTab === 'all' || activeTab === 'modified') && diffDetails.CHANGED?.length > 0) && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-wider font-display flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Amended / Modified Clauses ({diffDetails.CHANGED.length})
                  </h4>

                  <div className="space-y-3">
                    {diffDetails.CHANGED.map((d, i) => {
                      const isExpanded = expandedId === i;
                      const scorePct = Math.round(d.similarity_score * 100);

                      return (
                        <div key={i} className="bg-[var(--bg-card)] border border-amber-500/25 rounded-xl overflow-hidden shadow-xs text-xs">
                          {/* Card Header summary */}
                          <div className="p-3 bg-amber-500/5 flex justify-between items-center select-none font-bold text-[9px] uppercase text-amber-600 border-b border-[var(--border-color)]/25">
                            <span className="flex items-center gap-1.5">
                              MODIFIED
                              <span className="normal-case font-normal text-slate-400">(Similarity: {scorePct}%)</span>
                            </span>
                            <span>Old {getObligationClause(d.old_obligation_id)} → New {getObligationClause(d.new_obligation_id)}</span>
                          </div>

                          <div className="p-4 space-y-3">
                            {/* Side-by-side vs Unified Rendering */}
                            {diffMode === 'side-by-side' ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-lg space-y-1.5">
                                  <span className="text-[8px] font-bold text-red-500 uppercase">Previous Version:</span>
                                  <p className="text-[var(--text-muted)] font-medium leading-relaxed italic">{getObligationText(d.old_obligation_id)}</p>
                                </div>
                                <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-lg space-y-1.5">
                                  <span className="text-[8px] font-bold text-emerald-500 uppercase">Amended Target:</span>
                                  <p className="text-[var(--text-main)] font-semibold leading-relaxed">{getObligationText(d.new_obligation_id)}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-lg">
                                  <span className="text-[8px] font-bold text-red-500 uppercase block mb-1">Removed Wording:</span>
                                  <p className="text-[var(--text-muted)] font-medium leading-relaxed italic line-through">{getObligationText(d.old_obligation_id)}</p>
                                </div>
                                <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-lg">
                                  <span className="text-[8px] font-bold text-emerald-500 uppercase block mb-1">Added Wording:</span>
                                  <p className="text-[var(--text-main)] font-semibold leading-relaxed">{getObligationText(d.new_obligation_id)}</p>
                                </div>
                              </div>
                            )}

                            {/* Justification details */}
                            {d.match_reason && (
                              <div className="bg-[var(--bg-app)]/40 p-2.5 rounded-lg border border-[var(--border-color)]/30 font-medium text-[10.5px] text-[var(--text-muted)]">
                                <strong className="text-[var(--text-main)]">AI Diff Reason:</strong> {d.match_reason}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* UNCHANGED Section */}
              {((activeTab === 'all' || activeTab === 'unchanged') && diffDetails.UNCHANGED?.length > 0) && (
                <div className="space-y-3 select-none">
                  <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-display flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    Unchanged Directives ({diffDetails.UNCHANGED.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto divide-y divide-[var(--border-color)]/30 border border-[var(--border-color)] rounded-xl bg-[var(--bg-app)]/20">
                    {diffDetails.UNCHANGED.map((d, i) => (
                      <div key={i} className="p-2.5 text-xs text-[var(--text-muted)] flex justify-between gap-4 font-semibold">
                        <span className="line-clamp-1">{getObligationText(d.new_obligation_id)}</span>
                        <span className="text-[9px] opacity-75">Clause {getObligationClause(d.new_obligation_id)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* RIGHT COLUMN: BUSINESS IMPACT INDEX (lg:col-span-3) */}
        <div className="lg:col-span-3 bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-xs space-y-4 text-xs font-semibold">
          <div>
            <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider font-display flex items-center gap-1.5 border-b border-[var(--border-color)] pb-2.5">
              <Layers className="text-blue-500 w-4.5 h-4.5" />
              Business Impact
            </h3>
          </div>

          {diffSummary ? (
            <div className="space-y-4">
              
              {/* Counts metrics */}
              <div className="space-y-2 bg-[var(--bg-app)]/45 p-3 rounded-lg border border-[var(--border-color)] text-[10px] font-bold text-[var(--text-muted)]">
                <div className="flex justify-between items-center">
                  <span>New Clauses Ingested</span>
                  <span className="text-emerald-500 text-xs">{diffSummary.new}</span>
                </div>
                <div className="flex justify-between items-center mt-1.5">
                  <span>Modified Clauses</span>
                  <span className="text-amber-500 text-xs">{diffSummary.changed}</span>
                </div>
                <div className="flex justify-between items-center mt-1.5">
                  <span>Obligations Matching</span>
                  <span className="text-blue-500 text-xs">{diffSummary.unchanged}</span>
                </div>
              </div>

              {/* Business layer indicators */}
              <div className="space-y-2.5">
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block font-display">Layer Impact Estimations</span>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center font-bold text-[10.5px] text-[var(--text-muted)]">
                    <span>Onboarding Layer</span>
                    <span className="text-red-500 text-xs">High Impact</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: '80%' }} />
                  </div>

                  <div className="flex justify-between items-center font-bold text-[10.5px] text-[var(--text-muted)] mt-2">
                    <span>Txn Monitoring</span>
                    <span className="text-amber-500 text-xs">Medium Impact</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '55%' }} />
                  </div>

                  <div className="flex justify-between items-center font-bold text-[10.5px] text-[var(--text-muted)] mt-2">
                    <span>Screening / Watchlist</span>
                    <span className="text-emerald-500 text-xs">Low Impact</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '20%' }} />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border-color)]/30">
                <button
                  onClick={() => onNavigate('rule-impact')}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-bold cursor-pointer transition-colors shadow-xs flex items-center justify-center gap-1"
                >
                  <Zap className="w-3 h-3" /> Map Mapped Rules
                </button>
              </div>

            </div>
          ) : (
            <div className="text-center text-slate-400 py-6 font-semibold select-none text-[10px]">
              No active comparison metrics.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
