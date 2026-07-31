import React, { useState } from 'react';
import { 
  FiArrowRight, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiPlus, 
  FiRefreshCw, 
  FiSettings,
  FiZap
} from 'react-icons/fi';
import { LuGitCompare } from 'react-icons/lu';
import api from '../services/api';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';

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

  // Load detailed diff obligations using endpoints
  const loadDiffDetails = async (diffId, oldId, newId) => {
    // 1. Fetch diff detail categories
    const resDetails = await api.getDiffDetail(diffId);
    if (!resDetails.success) {
      setErrorMessage('Failed to fetch detailed difference categories.');
      setSuggestion(resDetails.suggestion || '');
      return;
    }
    
    // 2. Fetch obligations for both circulars to map ID -> details
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
      // Fetch details
      await loadDiffDetails(res.data.diff_id, oldId, newId);
      // Callback
      onCompareSuccess && onCompareSuccess(res.data.diff_id, oldId, newId);
    } else {
      setErrorMessage(res.error || 'Comparison engine error.');
      setSuggestion(res.suggestion || '');
    }
    setLoading(false);
  };

  const getObligationText = (id) => {
    if (!id) return '';
    return obligationsMap[id]?.obligation_text || `Obligation ID: ${id}`;
  };

  const getObligationClause = (id) => {
    if (!id) return '';
    return obligationsMap[id]?.source_clause || '';
  };

  return (
    <div className="space-y-6">
      {/* Dropdown selectors */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-xl shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
          <LuGitCompare className="text-primary" />
          Circular Selection & Comparison Scope
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          {/* Old Circular (Dropdown) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Historical Reference Circular (Old Version)
            </label>
            <select
              value={oldCircularId}
              onChange={(e) => setOldCircularId(e.target.value)}
              className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-main)] font-semibold focus:outline-none focus:border-accent"
            >
              <option value="">-- Select Old Circular (Optional for Net New Documents) --</option>
              {circulars.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.source_filename})
                </option>
              ))}
            </select>
          </div>

          {/* New Circular (Dropdown) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Latest Regulatory Circular (New Version)
            </label>
            <select
              value={newCircularId}
              onChange={(e) => setNewCircularId(e.target.value)}
              className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-main)] font-semibold focus:outline-none focus:border-accent"
            >
              <option value="">-- Select New Circular (Target) --</option>
              {circulars.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.source_filename})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleCompare}
            disabled={loading}
            className="flex items-center gap-1.5 px-5 py-2 bg-primary hover:bg-primary/95 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
          >
            {loading ? (
              <>
                <FiRefreshCw className="animate-spin" /> Comparing obligations...
              </>
            ) : (
              <>
                <LuGitCompare /> Compare Documents
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {errorMessage && <ErrorBanner message={errorMessage} suggestion={suggestion} onRetry={handleCompare} />}

      {/* Comparison outputs */}
      {loading && <LoadingSkeleton type="table" count={2} />}

      {!loading && diffSummary && diffDetails && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* NEW count */}
            <div className="bg-[var(--bg-card)] border-l-4 border-[var(--color-success)] p-5 rounded-r-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                New Obligations
              </span>
              <h3 className="text-2xl font-bold text-[var(--color-success)] mt-1.5">
                {diffSummary.new}
              </h3>
              <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">Added in newer regulation</p>
            </div>

            {/* CHANGED count */}
            <div className="bg-[var(--bg-card)] border-l-4 border-[var(--color-warning)] p-5 rounded-r-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Modified Obligations
              </span>
              <h3 className="text-2xl font-bold text-[var(--color-warning)] mt-1.5">
                {diffSummary.changed}
              </h3>
              <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">Updated/reworded guidelines</p>
            </div>

            {/* UNCHANGED count */}
            <div className="bg-[var(--bg-card)] border-l-4 border-[var(--color-primary)] p-5 rounded-r-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Unchanged Obligations
              </span>
              <h3 className="text-2xl font-bold text-primary mt-1.5">
                {diffSummary.unchanged}
              </h3>
              <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">Identical wording matched</p>
            </div>
          </div>

          {/* Details Lists */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-xl shadow-sm space-y-6">
            <div className="flex justify-between items-center pb-2 border-b border-[var(--border-color)]">
              <h3 className="text-sm font-bold text-[var(--text-main)]">
                Compliance Difference Breakdown
              </h3>
              <button
                onClick={() => onNavigate('rule-impact')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/95 text-white text-[10.5px] font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
              >
                <FiZap /> Run Rule Impact Mapping
              </button>
            </div>

            {/* 1. NEW Section */}
            {diffDetails.NEW?.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[var(--color-success)] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
                  New Obligations ({diffDetails.NEW.length})
                </h4>
                <div className="space-y-2">
                  {diffDetails.NEW.map((d, i) => (
                    <div key={i} className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-[var(--border-color)]/30 text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 text-[9px] bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20 rounded font-bold">
                          NEW
                        </span>
                        <span className="font-semibold text-[var(--text-muted)]">
                          Clause {getObligationClause(d.new_obligation_id)}
                        </span>
                      </div>
                      <p className="text-[var(--text-main)] font-semibold leading-relaxed">
                        {getObligationText(d.new_obligation_id)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. CHANGED Section */}
            {diffDetails.CHANGED?.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[var(--color-warning)] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-warning)]" />
                  Modified / Changed Obligations ({diffDetails.CHANGED.length})
                </h4>
                <div className="space-y-3.5">
                  {diffDetails.CHANGED.map((d, i) => (
                    <div key={i} className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-lg border border-[var(--border-color)]/30 text-xs space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 text-[9px] bg-[var(--color-warning)]/10 text-[var(--color-warning)] border border-[var(--color-warning)]/20 rounded font-bold">
                            MODIFIED
                          </span>
                          <span className="font-semibold text-[var(--text-muted)]">
                            Old Clause {getObligationClause(d.old_obligation_id)} → New Clause {getObligationClause(d.new_obligation_id)}
                          </span>
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] font-medium">
                          Similarity Match: <span className="font-bold text-accent">{Math.round(d.similarity_score * 100)}%</span>
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border border-[var(--border-color)]/50 rounded-lg p-2.5 bg-[var(--bg-card)]">
                          <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase block mb-1">Previous Wording:</span>
                          <p className="text-[var(--text-muted)] italic leading-relaxed">{getObligationText(d.old_obligation_id)}</p>
                        </div>
                        <div className="border border-[var(--border-color)]/50 rounded-lg p-2.5 bg-[var(--bg-card)]">
                          <span className="text-[9px] font-bold text-[var(--text-main)] uppercase block mb-1">Amended Wording:</span>
                          <p className="text-[var(--text-main)] font-semibold leading-relaxed">{getObligationText(d.new_obligation_id)}</p>
                        </div>
                      </div>
                      
                      {d.match_reason && (
                        <div className="text-[10.5px] text-[var(--text-muted)] bg-[var(--bg-card)] px-3 py-1.5 rounded border border-[var(--border-color)]/30 font-medium">
                          <span className="font-bold text-[var(--text-main)]">Justification:</span> {d.match_reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. UNCHANGED Section */}
            {diffDetails.UNCHANGED?.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  Unchanged Obligations ({diffDetails.UNCHANGED.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {diffDetails.UNCHANGED.map((d, i) => (
                    <div key={i} className="bg-slate-50/50 dark:bg-slate-800/10 p-2.5 rounded-lg border border-[var(--border-color)]/20 text-xs flex items-center justify-between gap-4">
                      <span className="text-[var(--text-muted)] line-clamp-1 flex-1">
                        {getObligationText(d.new_obligation_id)}
                      </span>
                      <span className="px-1.5 py-0.5 text-[8.5px] font-bold uppercase bg-slate-100 dark:bg-slate-800 border border-[var(--border-color)] text-slate-400 dark:text-slate-600 rounded">
                        Clause {getObligationClause(d.new_obligation_id)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {!diffSummary && !loading && (
        <EmptyState 
          title="Compare Regulatory Versions"
          description="Select an older baseline document (optional) and the newer regulatory circular above to run comparisons."
          icon={LuGitCompare}
        />
      )}

    </div>
  );
}
