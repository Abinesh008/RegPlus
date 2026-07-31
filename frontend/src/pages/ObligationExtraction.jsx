import React, { useState, useEffect } from 'react';
import { 
  FiSearch, 
  FiFilter, 
  FiLayers, 
  FiEye, 
  FiCpu, 
  FiSliders,
  FiChevronDown,
  FiChevronUp,
  FiCheckCircle,
  FiXCircle
} from 'react-icons/fi';
import api from '../services/api';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function ObligationExtraction({ 
  circulars = [],
  selectedCircularId,
  onSelectCircular,
  onExtractSuccess
}) {
  const [obligations, setObligations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedAppliesTo, setSelectedAppliesTo] = useState('all');
  const [minConfidence, setMinConfidence] = useState(0);
  const [sortBy, setSortBy] = useState('clause'); // 'clause', 'confidence'
  
  // Expand/collapse states for obligation details
  const [expandedId, setExpandedId] = useState(null);

  // Grouping state
  const [groupByType, setGroupByType] = useState(true);

  // Load obligations when circular changes
  const loadObligations = async (circId) => {
    if (!circId) return;
    setLoading(true);
    setErrorMessage('');
    const res = await api.getCircularObligations(circId);
    if (res.success) {
      setObligations(res.data || []);
    } else {
      setErrorMessage(res.error || 'Failed to load obligations.');
      setObligations([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedCircularId) {
      loadObligations(selectedCircularId);
    } else if (circulars.length > 0) {
      onSelectCircular(circulars[0].id);
    }
  }, [selectedCircularId, circulars]);

  const handleExtract = async () => {
    if (!selectedCircularId) return;
    setExtracting(true);
    setErrorMessage('');
    
    const res = await api.extractObligations(selectedCircularId);
    if (res.success) {
      setObligations(res.data || []);
      onExtractSuccess && onExtractSuccess(selectedCircularId);
    } else {
      setErrorMessage(res.error || 'Extraction workflow failed.');
    }
    setExtracting(false);
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  // Get unique categories for filters
  const uniqueTypes = ['all', ...new Set(obligations.map(o => o.obligation_type))];
  const uniqueAppliesTo = ['all', ...new Set(obligations.map(o => o.applies_to))];

  // Apply search and filter criteria
  const filteredObligations = obligations.filter(ob => {
    const matchesSearch = 
      ob.obligation_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ob.source_clause.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesType = selectedType === 'all' || ob.obligation_type === selectedType;
    const matchesApplies = selectedAppliesTo === 'all' || ob.applies_to === selectedAppliesTo;
    const matchesConfidence = ob.confidence_score >= minConfidence;

    return matchesSearch && matchesType && matchesApplies && matchesConfidence;
  });

  // Apply sorting
  const sortedObligations = [...filteredObligations].sort((a, b) => {
    if (sortBy === 'confidence') {
      return b.confidence_score - a.confidence_score;
    }
    // Default sort by clause string alphanumeric
    return a.source_clause.localeCompare(b.source_clause, undefined, { numeric: true, sensitivity: 'base' });
  });

  // Group obligations by type if enabled
  const groupedObligations = sortedObligations.reduce((acc, curr) => {
    const key = groupByType ? curr.obligation_type : 'All Obligations';
    if (!acc[key]) acc[key] = [];
    acc[key].push(curr);
    return acc;
  }, {});

  const activeCircular = circulars.find(c => c.id === Number(selectedCircularId));

  return (
    <div className="space-y-6">
      {/* Circular Selector Dropdown */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
            Active Compliance Circular
          </label>
          <select
            value={selectedCircularId || ''}
            onChange={(e) => onSelectCircular(Number(e.target.value))}
            className="w-full max-w-md bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-main)] font-semibold focus:outline-none focus:border-accent"
          >
            {circulars.map(c => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.source_filename})
              </option>
            ))}
            {circulars.length === 0 && (
              <option value="">No circulars uploaded yet</option>
            )}
          </select>
        </div>
        
        {activeCircular && obligations.length === 0 && !loading && (
          <button
            onClick={handleExtract}
            disabled={extracting}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm disabled:opacity-50"
          >
            <FiCpu className="w-4 h-4" /> {extracting ? 'Extracting Obligations...' : 'Extract Obligations Now'}
          </button>
        )}
      </div>

      {/* Error banner */}
      {errorMessage && <ErrorBanner message={errorMessage} onRetry={() => loadObligations(selectedCircularId)} />}

      {/* Main Grid: Filters & Listing */}
      {loading ? (
        <LoadingSkeleton type="table" count={3} />
      ) : obligations.length === 0 ? (
        <EmptyState 
          title="No Obligations Extracted"
          description="We haven't parsed any compliance rules or obligations for this document yet. Click Extract to trigger AI evaluation."
          actionLabel={extracting ? 'Processing...' : 'Run Extraction Engine'}
          onAction={handleExtract}
          icon={FiCpu}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Left panel: Filters */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider border-b border-[var(--border-color)] pb-2 flex items-center gap-1.5">
              <FiSliders className="text-primary" /> Filter Options
            </h3>
            
            {/* Search */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <FiSearch className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search obligation text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-main)] placeholder-slate-400 focus:outline-none focus:border-accent"
              />
            </div>

            {/* Group Toggle */}
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-[var(--text-muted)] font-semibold">Group by Type</span>
              <input
                type="checkbox"
                checked={groupByType}
                onChange={(e) => setGroupByType(e.target.checked)}
                className="w-4 h-4 rounded text-accent focus:ring-accent border-[var(--border-color)] cursor-pointer"
              />
            </div>

            {/* Type selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Obligation Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-accent"
              >
                {uniqueTypes.map(t => (
                  <option key={t} value={t}>{t === 'all' ? 'All Types' : t}</option>
                ))}
              </select>
            </div>

            {/* Applies to selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Applies To
              </label>
              <select
                value={selectedAppliesTo}
                onChange={(e) => setSelectedAppliesTo(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-accent"
              >
                {uniqueAppliesTo.map(a => (
                  <option key={a} value={a}>{a === 'all' ? 'All Parties' : a}</option>
                ))}
              </select>
            </div>

            {/* Confidence Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                <span>Confidence Score</span>
                <span className="text-accent">{Math.round(minConfidence * 100)}%+</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.05"
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-accent"
              />
            </div>

            {/* Sort Order */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Sort Order
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-accent"
              >
                <option value="clause">Source Clause</option>
                <option value="confidence">Confidence Score</option>
              </select>
            </div>

          </div>

          {/* Right panel: Obligations list */}
          <div className="lg:col-span-3 space-y-6">
            
            {Object.keys(groupedObligations).map((groupName) => {
              const groupItems = groupedObligations[groupName];
              if (groupItems.length === 0) return null;
              
              return (
                <div key={groupName} className="space-y-3">
                  {groupByType && (
                    <h3 className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-2 mb-2 select-none">
                      <FiLayers className="w-4 h-4" /> {groupName} ({groupItems.length})
                    </h3>
                  )}
                  
                  <div className="space-y-3">
                    {groupItems.map((ob) => {
                      const isExpanded = expandedId === ob.id;
                      const scorePct = Math.round(ob.confidence_score * 100);
                      
                      return (
                        <div
                          key={ob.id}
                          className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm transition-all hover:border-[var(--border-hover)]"
                        >
                          {/* Header Summary */}
                          <div 
                            onClick={() => toggleExpand(ob.id)}
                            className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-primary/10 text-primary border border-primary/20 rounded">
                                  Clause {ob.source_clause}
                                </span>
                                <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-[var(--text-muted)] border border-[var(--border-color)] rounded">
                                  {ob.obligation_type}
                                </span>
                              </div>
                              <p className="text-xs text-[var(--text-main)] font-semibold line-clamp-2 leading-relaxed">
                                {ob.obligation_text}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-4 flex-shrink-0">
                              {/* Confidence bar */}
                              <div className="flex flex-col items-end">
                                <span className="text-[10px] text-[var(--text-muted)] font-medium">Confidence</span>
                                <span className={`text-xs font-bold ${
                                  ob.confidence_score >= 0.85 
                                    ? 'text-[var(--color-success)]' 
                                    : ob.confidence_score >= 0.7 
                                      ? 'text-[var(--color-warning)]' 
                                      : 'text-[var(--color-danger)]'
                                }`}>
                                  {scorePct}%
                                </span>
                              </div>
                              
                              {isExpanded ? <FiChevronUp className="w-5.5 h-5.5 text-slate-400" /> : <FiChevronDown className="w-5.5 h-5.5 text-slate-400" />}
                            </div>
                          </div>

                          {/* Expanded detail section */}
                          {isExpanded && (
                            <div className="px-4 pb-4 border-t border-[var(--border-color)]/30 bg-[var(--bg-app)]/10 text-xs leading-relaxed space-y-3.5 pt-4">
                              <div>
                                <span className="font-bold text-[var(--text-main)] block mb-1">Full Obligation Statement:</span>
                                <p className="text-[var(--text-dark)] bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border-color)]/50">
                                  {ob.obligation_text}
                                </p>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <span className="font-bold text-[var(--text-main)] block mb-1">Applies To / Targeted Entities:</span>
                                  <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-[var(--border-color)] rounded-md inline-block font-semibold text-[var(--text-dark)]">
                                    {ob.applies_to}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-bold text-[var(--text-main)] block mb-1">Extracted Slug identifier:</span>
                                  <code className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-[var(--border-color)] rounded text-[11px] text-accent font-semibold">
                                    {ob.obligation_id_slug}
                                  </code>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {sortedObligations.length === 0 && (
              <EmptyState
                title="No Matching Results"
                description="Adjust your search query or slide the confidence thresholds to match stored obligations."
                icon={FiFilter}
              />
            )}
          </div>
          
        </div>
      )}
    </div>
  );
}
