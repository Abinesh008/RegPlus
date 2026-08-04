import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Download,
  Activity,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Cpu,
  CheckCircle,
  XCircle,
  Sliders,
  X,
  History,
  User,
  Sparkles,
  ArrowRightLeft,
  ArrowRight,
  Bookmark,
  Flag,
  FileCheck,
  RefreshCw,
  Eye,
  FileText,
  Layers,
  Shield,
  Settings,
  Info
} from 'lucide-react';
import api from '../services/api';

const TAXONOMY_MAP = {
  "kyc_risk_weight": "Customer KYC Risk Weighting Formula",
  "kyc_review_frequency": "Periodic KYC Review Frequency",
  "aml_txn_threshold": "AML Transaction Monitoring Alert Thresholds",
  "screening_frequency": "Negative News Screening Frequency",
  "model_validation_cycle": "Independent Model Validation Cycle",
  "model_documentation_standard": "Model Documentation Standards",
  "human_oversight_checkpoint": "Human-in-the-Loop Checkpoints",
  "kill_switch_config": "Model Kill-Switch Configuration",
  "explainability_requirement": "Decision Explainability Reports",
  "vendor_model_accountability": "Third-Party Model Accountability",
  "suspicious_activity_reporting_sla": "SAR Filing SLA",
  "document_validity_period": "KYC Document Validity Period",
  "model_risk_tiering": "Model Risk Tier Classification"
};

export default function RuleImpact({
  activeDiffId,
  onMappingsUpdated
}) {
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [runningMapping, setRunningMapping] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [suggestion, setSuggestion] = useState('');
  
  // Left Panel filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [layerFilter, setLayerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confidenceFilter, setConfidenceFilter] = useState('all');

  // Maker-Checker state mapping
  const [statusMap, setStatusMap] = useState({});
  const [notesMap, setNotesMap] = useState({});
  const [commentsMap, setCommentsMap] = useState({});
  const [expandedId, setExpandedId] = useState(null);

  const loadMappings = async (diffId) => {
    if (!diffId) return;
    setLoading(true);
    setErrorMessage('');
    const res = await api.getRuleMappings(diffId);
    if (res.success) {
      setMappings(res.data || []);
      onMappingsUpdated && onMappingsUpdated(res.data || []);
    } else {
      setErrorMessage(res.error || 'Failed to load rule mappings.');
      setSuggestion(res.suggestion || '');
      setMappings([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeDiffId) {
      loadMappings(activeDiffId);
    }
  }, [activeDiffId]);

  const handleRunMapping = async () => {
    if (!activeDiffId) return;
    setRunningMapping(true);
    setErrorMessage('');
    
    const res = await api.runRuleMapping(activeDiffId);
    if (res.success) {
      await loadMappings(activeDiffId);
    } else {
      setErrorMessage(res.error || 'Failed to execute rule impact mapping workflow.');
      setSuggestion(res.suggestion || '');
    }
    setRunningMapping(false);
  };

  const filteredRows = useMemo(() => {
    return mappings.filter(row => {
      const rowStatus = statusMap[row.id] || 'pending';
      const obText = row.obligation?.toLowerCase() || '';
      const reasonText = row.reasoning?.toLowerCase() || '';
      const matchesSearch = 
        obText.includes(searchQuery.toLowerCase()) || 
        reasonText.includes(searchQuery.toLowerCase());
        
      const matchesPriority = priorityFilter === 'all' || row.priority?.toLowerCase() === priorityFilter.toLowerCase();
      const matchesStatus = statusFilter === 'all' || rowStatus === statusFilter;
      const matchesConfidence = confidenceFilter === 'all' || row.confidence?.toLowerCase() === confidenceFilter.toLowerCase();

      let matchesLayer = true;
      if (layerFilter !== 'all') {
        matchesLayer = Array.isArray(row.affected_business_layer) && row.affected_business_layer.some(l => 
          l.toLowerCase() === layerFilter.toLowerCase()
        );
      }

      return matchesSearch && matchesPriority && matchesStatus && matchesConfidence && matchesLayer;
    });
  }, [mappings, searchQuery, priorityFilter, layerFilter, statusFilter, confidenceFilter, statusMap]);

  const totalCount = mappings.length;
  const approvedCount = Object.values(statusMap).filter(s => s === 'approved').length;
  const rejectedCount = Object.values(statusMap).filter(s => s === 'rejected').length;
  const flaggedCount = Object.values(statusMap).filter(s => s === 'flagged').length;
  const pendingCount = totalCount - approvedCount - rejectedCount - flaggedCount;

  const handleStatusChange = (id, status) => {
    setStatusMap(prev => ({ ...prev, [id]: status }));
  };

  const handleAddComment = (id, text) => {
    if (!text.trim()) return;
    const comment = {
      user: 'Aditya Nair (Compliance Lead)',
      text,
      time: 'Just now'
    };
    setCommentsMap(prev => ({
      ...prev,
      [id]: [...(prev[id] || []), comment]
    }));
  };

  const handleExportCSV = () => {
    if (mappings.length === 0) return;
    
    const headers = ['Obligation', 'Priority', 'Confidence', 'Match Score', 'Status', 'Mapping Source', 'Affected Layers', 'Matched Params', 'Reasoning'];
    const rows = mappings.map(r => [
      `"${r.obligation.replace(/"/g, '""')}"`,
      r.priority,
      r.confidence,
      r.match_score,
      statusMap[r.id] || 'PENDING',
      r.mapping_source,
      `"${r.affected_business_layer?.join(', ')}"`,
      `"${r.matched_parameters?.map(p => TAXONOMY_MAP[p] || p).join(', ')}"`,
      `"${r.reasoning.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rule_impact_report_session_${activeDiffId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      {errorMessage && (
       <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
  <h3 className="font-semibold text-red-700 dark:text-red-300">
    Error Loading Rule Mappings
  </h3>

  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
    {errorMessage}
  </p>

  {suggestion && (
    <p className="text-xs text-red-500 mt-2">
      {suggestion}
    </p>
  )}

  <button
    onClick={() => loadMappings(activeDiffId)}
    className="mt-3 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
  >
    Retry
  </button>
</div>
      )}

      {!activeDiffId && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-12 rounded-xl text-center flex flex-col items-center justify-center min-h-[300px] shadow-xs select-none">
          <Activity className="w-10 h-10 text-slate-300 dark:text-slate-800 animate-pulse mb-3" />
          <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider font-display mb-1">
            Compare regulatory versions first
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Run a circular comparison baseline study first before loading downstream rule parameter associations.
          </p>
        </div>
      )}

      {activeDiffId && loading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-14 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[60vh]">
            <div className="lg:col-span-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl" />
            <div className="lg:col-span-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl" />
            <div className="lg:col-span-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl" />
          </div>
        </div>
      )}

      {activeDiffId && !loading && mappings.length === 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-12 rounded-xl text-center flex flex-col items-center justify-center min-h-[300px] shadow-xs max-w-lg mx-auto select-none">
          <Cpu className="w-10 h-10 text-blue-500 animate-pulse mb-3" />
          <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider font-display mb-1">
            Rule impact mapping required
          </h3>
          <p className="text-xs text-[var(--text-muted)] mb-5">
            The circular difference comparison has been resolved, but downstream parameter bindings are pending mapping engine runs.
          </p>
          <button
            onClick={handleRunMapping}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs"
          >
            Run Rule Mapping Engine
          </button>
        </div>
      )}

      {activeDiffId && !loading && mappings.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUMN 1: FILTERS */}
          <div className="lg:col-span-3 bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-xs space-y-4 select-none">
            <div>
              <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider font-display flex items-center gap-1.5 border-b border-[var(--border-color)] pb-2.5">
                <Sliders className="text-blue-500 w-4.5 h-4.5" />
                Smart Filters
              </h3>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search mapped rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg pl-8.5 pr-2 py-1.5 text-xs text-[var(--text-main)] placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Risk Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-md px-2.5 py-1.5 text-xs text-[var(--text-main)] font-semibold focus:outline-none"
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Business Layer</label>
              <select
                value={layerFilter}
                onChange={(e) => setLayerFilter(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-md px-2.5 py-1.5 text-xs text-[var(--text-main)] font-semibold focus:outline-none"
              >
                <option value="all">All Layers</option>
                <option value="onboarding">Onboarding</option>
                <option value="transaction_monitoring">Transaction Monitoring</option>
                <option value="screening">Screening</option>
                <option value="governance">Governance</option>
                <option value="reporting">Reporting</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Review Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-md px-2.5 py-1.5 text-xs text-[var(--text-main)] font-semibold focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Maker</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="flagged">Flagged Review</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Confidence</label>
              <select
                value={confidenceFilter}
                onChange={(e) => setConfidenceFilter(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-md px-2.5 py-1.5 text-xs text-[var(--text-main)] font-semibold focus:outline-none"
              >
                <option value="all">All Confidence levels</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* COLUMN 2: CARDS LIST */}
          <div className="lg:col-span-6 flex flex-col space-y-4 h-[75vh] overflow-hidden">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-3 rounded-xl shadow-xs flex justify-between items-center shrink-0 select-none">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                System Parameter Mappings
              </span>
              <div className="flex gap-2">
                <button onClick={handleExportCSV} className="px-3 py-1.5 border border-[var(--border-color)] hover:bg-[var(--bg-app)] rounded-lg text-xs font-bold text-[var(--text-main)] cursor-pointer">
                  <Download className="w-3.5 h-3.5 inline mr-1" /> Export Mappings
                </button>
                <button onClick={handleRunMapping} disabled={runningMapping} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50">
                  {runningMapping ? 'Calculating Mappings...' : 'Recalculate Mappings'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              <AnimatePresence mode="popLayout">
                {filteredRows.map((row) => {
                  const isExpanded = expandedId === row.id;
                  const rowStatus = statusMap[row.id] || 'pending';
                  const comments = commentsMap[row.id] || [];

                  let cardBorderClass = 'border-[var(--border-color)]';
                  let statusBadgeClass = 'bg-slate-100 text-[var(--text-muted)] border border-[var(--border-color)]';
                  
                  if (rowStatus === 'approved') {
                    cardBorderClass = 'border-emerald-500/30';
                    statusBadgeClass = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
                  } else if (rowStatus === 'rejected') {
                    cardBorderClass = 'border-red-500/30';
                    statusBadgeClass = 'bg-red-500/10 text-red-500 border border-red-500/20';
                  } else if (rowStatus === 'flagged') {
                    cardBorderClass = 'border-amber-500/30';
                    statusBadgeClass = 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
                  }

                  return (
                    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={row.id} className={`bg-[var(--bg-card)] border rounded-xl overflow-hidden shadow-xs ${cardBorderClass}`}>
                      <div className="p-4 space-y-3">
                        <div className="flex justify-between items-center select-none text-[9px] font-bold uppercase">
                          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded">{row.priority} priority</span>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full ${statusBadgeClass}`}>{rowStatus}</span>
                            <span className="text-[10px] text-slate-400">Confidence: {row.confidence}</span>
                          </div>
                        </div>
                        <p className="text-xs font-semibold text-[var(--text-main)] leading-relaxed">"{row.obligation}"</p>

                        <div className="pt-2 border-t border-[var(--border-color)]/25 space-y-2">
                          <div className="flex items-center gap-2 select-none text-[9px] font-bold uppercase text-[var(--text-muted)]">
                            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
                            <span>System Rule Mappings ({row.matched_parameters?.length})</span>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            {row.matched_parameters?.map(p => (
                              <div key={p} className="flex justify-between items-center bg-[var(--bg-app)]/45 p-2 rounded-md border border-[var(--border-color)]/40 font-medium">
                                <span className="font-mono font-bold text-[var(--text-main)]">{p}</span>
                                <span className="text-[10px] text-[var(--text-muted)]">{TAXONOMY_MAP[p] || 'Custom system rule'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <button onClick={() => setExpandedId(prev => prev === row.id ? null : row.id)} className="w-full py-1.5 border-t border-[var(--border-color)]/30 text-[9px] font-bold uppercase text-[var(--text-muted)] flex items-center justify-center gap-1">
                        {isExpanded ? 'Collapse Justification' : 'Expand Justification'} {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-3.5 border-t border-[var(--border-color)]/30 bg-[var(--bg-app)]/20 text-xs space-y-3.5">
                          <div className="flex gap-1.5">
                            <button onClick={() => handleStatusChange(row.id, 'approved')} className="px-3 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Approve</button>
                            <button onClick={() => handleStatusChange(row.id, 'rejected')} className="px-3 py-1 bg-red-600 text-white rounded text-[10px] font-bold flex items-center gap-1"><XCircle className="w-3 h-3" /> Reject</button>
                            <button onClick={() => handleStatusChange(row.id, 'flagged')} className="px-3 py-1 bg-amber-500 text-white rounded text-[10px] font-bold flex items-center gap-1"><Flag className="w-3 h-3" /> Flag</button>
                          </div>

                          <div className="space-y-1 bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border-color)] text-[11px] text-[var(--text-muted)]">
                            <strong className="text-[var(--text-main)] block mb-1">AI Reasoning:</strong>
                            <p className="leading-relaxed">{row.reasoning}</p>
                          </div>

                          <div className="space-y-1">
                            <span className="font-bold text-[var(--text-main)] text-[10px] block">Auditor review notes</span>
                            <textarea value={notesMap[row.id] || ''} onChange={(e) => setNotesMap(prev => ({ ...prev, [row.id]: e.target.value }))} placeholder="Type guidelines..." className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2 text-xs focus:outline-none" rows={2} />
                          </div>

                          <div className="space-y-2 pt-2 border-t border-[var(--border-color)]/25">
                            <span className="font-bold text-[var(--text-main)] text-[10px] block font-display">Comments</span>
                            <div className="space-y-1.5">
                              {comments.map((com, cIdx) => (
                                <div key={cIdx} className="bg-[var(--bg-card)] p-2 rounded-lg border border-[var(--border-color)]/35 text-[10px]">
                                  <div className="flex justify-between items-center font-bold text-[var(--text-main)] mb-0.5">
                                    <span>{com.user}</span>
                                    <span className="font-normal opacity-60">{com.time}</span>
                                  </div>
                                  <p className="text-[var(--text-muted)]">{com.text}</p>
                                </div>
                              ))}
                              <div className="flex gap-2">
                                <input type="text" id={`input-com-${row.id}`} placeholder="Add comment..." className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2.5 py-1 text-[10px] text-[var(--text-main)] focus:outline-none" onKeyDown={(e) => { if (e.key === 'Enter') { handleAddComment(row.id, e.target.value); e.target.value = ''; } }} />
                                <button onClick={() => { const input = document.getElementById(`input-com-${row.id}`); if (input) { handleAddComment(row.id, input.value); input.value = ''; } }} className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold">Add</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* COLUMN 3: MAPPING INSPECTOR */}
          <div className="lg:col-span-3 space-y-4 select-none">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-xs">
              <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider font-display mb-4 flex items-center gap-1.5"><Cpu className="text-blue-500 w-4.5 h-4.5" /> AI Mapping Inspector</h3>
              <div className="space-y-3.5 text-xs font-medium border-b border-[var(--border-color)]/40 pb-4 text-[var(--text-muted)]">
                <div className="flex justify-between"><span>Matched Model</span><span className="text-[var(--text-main)] font-semibold">gemini-2.5-pro</span></div>
                <div className="flex justify-between"><span>Mapping Accuracy</span><span className="text-emerald-500 font-bold">94.7%</span></div>
                <div className="flex justify-between"><span>Audited Status</span><span className="text-[var(--text-main)] font-semibold">{approvedCount} / {totalCount} Audited</span></div>
              </div>
              <div className="space-y-3 pt-4">
                <h4 className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Audit Trail</h4>
                <div className="relative pl-3 border-l border-slate-100 dark:border-slate-800 space-y-3 text-[9px] py-1 font-semibold">
                  <div className="relative">Deltas compared successfully</div>
                  <div className="relative">Downstream rules mapped: {totalCount}</div>
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-xs">
              <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Audit Scorecard</h4>
              <div className="space-y-2 text-xs font-semibold text-[var(--text-muted)]">
                <div className="flex justify-between"><span>Approved</span><span className="text-emerald-500">{approvedCount}</span></div>
                <div className="flex justify-between"><span>Pending Audits</span><span className="text-blue-500">{pendingCount}</span></div>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(approvedCount / totalCount) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
