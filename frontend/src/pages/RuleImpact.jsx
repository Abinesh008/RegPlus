import React, { useState, useEffect, useMemo } from 'react';
import { 
  FiSearch, 
  FiFilter, 
  FiDownload, 
  FiActivity, 
  FiAlertCircle, 
  FiChevronRight, 
  FiCpu, 
  FiCheckCircle,
  FiSliders,
  FiX
} from 'react-icons/fi';
import api from '../services/api';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';

// Map taxonomy parameter IDs to readable names
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
  
  // Table search & sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [layerFilter, setLayerFilter] = useState('all');
  const [reviewFilter, setReviewFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  
  const [sortBy, setSortBy] = useState('match_score'); // 'match_score', 'priority', 'confidence'
  const [sortDirection, setSortDirection] = useState('desc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected row for side drawer detail view
  const [selectedRow, setSelectedRow] = useState(null);

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
    
    // Trigger mapping calculation on backend
    const res = await api.runRuleMapping(activeDiffId);
    if (res.success) {
      // Reload mappings details
      await loadMappings(activeDiffId);
    } else {
      setErrorMessage(res.error || 'Failed to execute rule impact mapping workflow.');
    }
    setRunningMapping(false);
  };

  // Convert priority to weight for sorting
  const getPriorityWeight = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  };

  // Convert confidence to weight for sorting
  const getConfidenceWeight = (conf) => {
    switch (conf?.toLowerCase()) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  };

  // Filters logic
  const filteredRows = useMemo(() => {
    return mappings.filter(row => {
      const obText = row.obligation?.toLowerCase() || '';
      const reasonText = row.reasoning?.toLowerCase() || '';
      const matchesSearch = 
        obText.includes(searchQuery.toLowerCase()) || 
        reasonText.includes(searchQuery.toLowerCase());
        
      const matchesPriority = priorityFilter === 'all' || row.priority?.toLowerCase() === priorityFilter.toLowerCase();
      const matchesReview = 
        reviewFilter === 'all' || 
        (reviewFilter === 'yes' && row.review_required) || 
        (reviewFilter === 'no' && !row.review_required);
        
      const matchesSource = sourceFilter === 'all' || row.mapping_source?.toLowerCase() === sourceFilter.toLowerCase();

      // Business layer checks
      let matchesLayer = true;
      if (layerFilter !== 'all') {
        matchesLayer = Array.isArray(row.affected_business_layer) && row.affected_business_layer.some(l => 
          l.toLowerCase() === layerFilter.toLowerCase()
        );
      }

      return matchesSearch && matchesPriority && matchesReview && matchesSource && matchesLayer;
    });
  }, [mappings, searchQuery, priorityFilter, layerFilter, reviewFilter, sourceFilter]);

  // Sort logic
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      let valA, valB;
      if (sortBy === 'match_score') {
        valA = a.match_score || 0;
        valB = b.match_score || 0;
      } else if (sortBy === 'priority') {
        valA = getPriorityWeight(a.priority);
        valB = getPriorityWeight(b.priority);
      } else if (sortBy === 'confidence') {
        valA = getConfidenceWeight(a.confidence);
        valB = getConfidenceWeight(b.confidence);
      }
      
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sortBy, sortDirection]);

  // Pagination bounds
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedRows.length / pageSize) || 1;

  // Handle Sort Change
  const requestSort = (field) => {
    if (sortBy === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // CSV Export Utility
  const handleExportCSV = () => {
    if (mappings.length === 0) return;
    
    const headers = ['Obligation', 'Priority', 'Confidence', 'Match Score', 'Review Required', 'Mapping Source', 'Affected Layers', 'Matched Params', 'Reasoning'];
    const rows = mappings.map(r => [
      `"${r.obligation.replace(/"/g, '""')}"`,
      r.priority,
      r.confidence,
      r.match_score,
      r.review_required ? 'YES' : 'NO',
      r.mapping_source,
      `"${r.affected_business_layer?.join(', ')}"`,
      `"${r.matched_parameters?.map(p => TAXONOMY_MAP[p] || p).join(', ')}"`,
      `"${r.reasoning.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rule_impact_report_session_${activeDiffId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Colors mapping helper functions
  const getPriorityBadgeClass = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'bg-[var(--color-danger)]/15 text-[var(--color-danger)] border border-[var(--color-danger)]/20';
      case 'high': return 'bg-[var(--color-warning)]/15 text-[var(--color-warning)] border border-[var(--color-warning)]/20';
      case 'medium': return 'bg-[var(--color-primary)]/15 text-primary border border-primary/20';
      case 'low': return 'bg-[var(--color-success)]/15 text-[var(--color-success)] border border-[var(--color-success)]/20';
      default: return 'bg-slate-500/10 text-slate-500 border border-slate-500/20';
    }
  };

  const getConfidenceBadgeClass = (conf) => {
    switch (conf?.toLowerCase()) {
      case 'high': return 'bg-[var(--color-success)]/15 text-[var(--color-success)] border border-[var(--color-success)]/20';
      case 'medium': return 'bg-[var(--color-warning)]/15 text-[var(--color-warning)] border border-[var(--color-warning)]/20';
      case 'low': return 'bg-[var(--color-danger)]/15 text-[var(--color-danger)] border border-[var(--color-danger)]/20';
      default: return 'bg-slate-500/10 text-slate-500 border border-slate-500/20';
    }
  };

  const getSourceBadgeClass = (src) => {
    switch (src?.toLowerCase()) {
      case 'gemini': return 'bg-indigo-500/15 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20';
      case 'database_cache': return 'bg-cyan-500/15 text-cyan-500 dark:text-cyan-400 border border-cyan-500/20';
      default: return 'bg-slate-500/15 text-[var(--text-muted)] border border-slate-500/20';
    }
  };

  const getReviewBadgeClass = (req) => {
    return req 
      ? 'bg-[var(--color-warning)]/15 text-[var(--color-warning)] border border-[var(--color-warning)]/20' 
      : 'bg-[var(--color-success)]/15 text-[var(--color-success)] border border-[var(--color-success)]/20';
  };

  return (
    <div className="space-y-6">
      
      {/* Alert banner if no session selected */}
      {!activeDiffId && (
        <EmptyState
          title="Select Comparison Baseline First"
          description="To view rule-engine compliance impact mapping, compare two circular documents in the Circular Comparison section first."
          actionLabel="Compare Versions"
          onAction={() => onNavigate('comparison')}
          icon={FiActivity}
        />
      )}

      {activeDiffId && loading && <LoadingSkeleton type="table" count={5} />}

      {activeDiffId && !loading && mappings.length === 0 && (
        <EmptyState
          title="Rule Impact Mapping Required"
          description="The comparison session has obligations but rules haven't been mapped to compliance parameters. Execute the engine workflow."
          actionLabel={runningMapping ? 'Running Mapping...' : 'Calculate Rule Mappings'}
          onAction={handleRunMapping}
          icon={FiCpu}
        />
      )}

      {activeDiffId && !loading && mappings.length > 0 && (
        <div className="space-y-6">
          
          {/* Table Controls (Search, Filters, Export) */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-sm space-y-3.5 no-print">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              
              {/* Search */}
              <div className="relative w-full md:w-80">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <FiSearch className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search mapped rules or details..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg pl-9 pr-4 py-1.5 text-xs text-[var(--text-main)] placeholder-slate-400 focus:outline-none focus:border-accent"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-lg text-xs font-bold text-[var(--text-main)] border border-[var(--border-color)] cursor-pointer transition-colors"
                  title="Export spreadsheet CSV file"
                >
                  <FiDownload /> Export CSV
                </button>
                <button
                  onClick={handleRunMapping}
                  disabled={runningMapping}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/95 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
                  title="Recalculate AI rule associations"
                >
                  <FiCpu /> {runningMapping ? 'Mapping...' : 'Re-Run Mapping'}
                </button>
              </div>
            </div>

            {/* Sub-row: Advanced Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 text-xs">
              {/* Priority Filter */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Priority</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-md px-2 py-1 text-[var(--text-main)] focus:outline-none"
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Business Layer Filter */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Business Layer</span>
                <select
                  value={layerFilter}
                  onChange={(e) => { setLayerFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-md px-2 py-1 text-[var(--text-main)] focus:outline-none"
                >
                  <option value="all">All Layers</option>
                  <option value="onboarding">Onboarding</option>
                  <option value="transaction_monitoring">Transaction Monitoring</option>
                  <option value="screening">Screening</option>
                  <option value="governance">Governance</option>
                  <option value="reporting">Reporting</option>
                </select>
              </div>

              {/* Review Required Filter */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Review Status</span>
                <select
                  value={reviewFilter}
                  onChange={(e) => { setReviewFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-md px-2 py-1 text-[var(--text-main)] focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="yes">Requires Review</option>
                  <option value="no">Resolved (No Review)</option>
                </select>
              </div>

              {/* Source Filter */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Mapping Engine</span>
                <select
                  value={sourceFilter}
                  onChange={(e) => { setSourceFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-md px-2 py-1 text-[var(--text-main)] focus:outline-none"
                >
                  <option value="all">All Sources</option>
                  <option value="gemini">Gemini AI</option>
                  <option value="database_cache">Database Cache</option>
                  <option value="mock">Mock Engine</option>
                </select>
              </div>
            </div>
          </div>

          {/* Enterprise Data Table */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 text-[var(--text-muted)] font-semibold border-b border-[var(--border-color)] select-none">
                    <th className="p-4 w-2/5">Obligation Statement</th>
                    <th className="p-4 w-1/4">Matched Parameters</th>
                    <th className="p-4 cursor-pointer hover:text-[var(--text-main)]" onClick={() => requestSort('priority')}>
                      Priority {sortBy === 'priority' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="p-4 cursor-pointer hover:text-[var(--text-main)]" onClick={() => requestSort('confidence')}>
                      Confidence {sortBy === 'confidence' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="p-4 cursor-pointer hover:text-[var(--text-main)]" onClick={() => requestSort('match_score')}>
                      Score {sortBy === 'match_score' && (sortDirection === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="p-4">Source</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]/50">
                  {paginatedRows.map((row, idx) => (
                    <tr 
                      key={idx}
                      onClick={() => setSelectedRow(row)}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors cursor-pointer text-[var(--text-dark)]"
                    >
                      <td className="p-4">
                        <p className="font-semibold text-[var(--text-main)] line-clamp-2 leading-relaxed">
                          {row.obligation}
                        </p>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {row.matched_parameters?.slice(0, 2).map(p => (
                            <span key={p} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-[var(--text-muted)] truncate max-w-40 border border-[var(--border-color)]/50">
                              {TAXONOMY_MAP[p] || p}
                            </span>
                          ))}
                          {row.matched_parameters?.length > 2 && (
                            <span className="text-[10px] text-[var(--text-muted)] font-bold">
                              +{row.matched_parameters.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wide ${getPriorityBadgeClass(row.priority)}`}>
                          {row.priority}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wide ${getConfidenceBadgeClass(row.confidence)}`}>
                          {row.confidence}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-accent">
                        {Math.round(row.match_score * 100)}%
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wide ${getSourceBadgeClass(row.mapping_source)}`}>
                          {row.mapping_source === 'database_cache' ? 'Cache' : row.mapping_source}
                        </span>
                      </td>
                      <td className="p-4">
                        <button className="p-1 hover:bg-primary/10 rounded text-primary transition-colors">
                          <FiChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {sortedRows.length === 0 && (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-[var(--text-muted)]">
                        No parameters match your selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {sortedRows.length > 0 && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/20 border-t border-[var(--border-color)]/70 flex items-center justify-between text-xs text-[var(--text-muted)] select-none no-print">
                <div className="font-medium">
                  Showing <span className="font-bold text-[var(--text-main)]">{Math.min(sortedRows.length, (currentPage - 1) * pageSize + 1)}-{Math.min(sortedRows.length, currentPage * pageSize)}</span> of <span className="font-bold text-[var(--text-main)]">{sortedRows.length}</span> compliance rules
                </div>
                
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-[var(--border-color)] rounded-lg font-bold disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border border-[var(--border-color)] rounded-lg font-bold disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Slide-out detail drawer */}
      {selectedRow && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-end z-50 no-print">
          <div className="w-full max-w-2xl bg-[var(--bg-card)] h-full shadow-2xl flex flex-col p-6 border-l border-[var(--border-color)]">
            <div className="flex justify-between items-start pb-4 border-b border-[var(--border-color)]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Rule mapping details</span>
                <h3 className="text-sm font-bold text-[var(--text-main)] mt-1">
                  Parameter Analysis & Validation
                </h3>
              </div>
              <button 
                onClick={() => setSelectedRow(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <FiX className="w-5.5 h-5.5" />
              </button>
            </div>

            {/* Scrollable details */}
            <div className="flex-1 overflow-y-auto py-6 space-y-6 text-xs text-[var(--text-dark)] leading-relaxed">
              
              {/* Obligation Clause Text */}
              <div>
                <h4 className="font-bold text-[var(--text-main)] mb-1.5 uppercase tracking-wider text-[10px]">
                  Extracted Obligation Statement
                </h4>
                <p className="bg-[var(--bg-app)]/50 p-4 rounded-xl border border-[var(--border-color)]/30 font-medium text-[var(--text-main)] italic">
                  "{selectedRow.obligation}"
                </p>
              </div>

              {/* Status Badges Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[var(--bg-app)]/20 p-4 rounded-xl border border-[var(--border-color)]/20">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase font-bold text-[var(--text-muted)]">Priority</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide inline-block text-center ${getPriorityBadgeClass(selectedRow.priority)}`}>
                    {selectedRow.priority}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase font-bold text-[var(--text-muted)]">Confidence</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide inline-block text-center ${getConfidenceBadgeClass(selectedRow.confidence)}`}>
                    {selectedRow.confidence}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase font-bold text-[var(--text-muted)]">Review Required</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide inline-block text-center ${getReviewBadgeClass(selectedRow.review_required)}`}>
                    {selectedRow.review_required ? 'YES' : 'NO'}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase font-bold text-[var(--text-muted)]">Match Score</span>
                  <span className="text-sm font-mono font-bold text-accent">
                    {Math.round(selectedRow.match_score * 100)}%
                  </span>
                </div>
              </div>

              {/* Matched parameters */}
              <div>
                <h4 className="font-bold text-[var(--text-main)] mb-1.5 uppercase tracking-wider text-[10px]">
                  Configured System Rule Parameters ({selectedRow.matched_parameters?.length})
                </h4>
                <div className="space-y-2">
                  {selectedRow.matched_parameters?.map(p => (
                    <div key={p} className="flex justify-between items-center bg-[var(--bg-app)]/40 p-2.5 rounded-lg border border-[var(--border-color)]/30">
                      <span className="font-bold text-[var(--text-main)] font-mono">{p}</span>
                      <span className="text-[var(--text-muted)] font-semibold">{TAXONOMY_MAP[p] || 'Custom parameter'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Affected Business Layers */}
              <div>
                <h4 className="font-bold text-[var(--text-main)] mb-1.5 uppercase tracking-wider text-[10px]">
                  Affected Business Layers
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedRow.affected_business_layer?.map(l => (
                    <span key={l} className="px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-md font-bold uppercase tracking-wide">
                      {l.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI Reasoning justification */}
              <div>
                <h4 className="font-bold text-[var(--text-main)] mb-1.5 uppercase tracking-wider text-[10px]">
                  Engine Match Reasoning & Analysis
                </h4>
                <p className="bg-[var(--bg-app)]/50 p-4 rounded-xl border border-[var(--border-color)]/30 leading-relaxed text-[var(--text-main)] font-medium">
                  {selectedRow.reasoning}
                </p>
              </div>

              {/* Mapping source metadata */}
              <div className="pt-4 border-t border-[var(--border-color)]/40 text-[10.5px] text-[var(--text-muted)] flex justify-between">
                <span>Mapping Source: <span className="font-semibold text-[var(--text-main)]">{selectedRow.mapping_source}</span></span>
                <span>Engine Version: <span className="font-semibold text-[var(--text-main)]">{selectedRow.mapping_version || 'v1.0'}</span></span>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
