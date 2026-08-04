import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Cpu, 
  Eye, 
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Bookmark,
  Copy,
  History,
  Flag,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import api from '../services/api';

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
  const [suggestion, setSuggestion] = useState('');

  // Interactive PDF states
  const [circularText, setCircularText] = useState('');
  const [loadingText, setLoadingText] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [pdfRotation, setPdfRotation] = useState(0);
  const [pdfSearchQuery, setPdfSearchQuery] = useState('');
  const [pdfActivePage, setPdfActivePage] = useState(1);
  const [isPdfFullScreen, setIsPdfFullScreen] = useState(false);
  const [activeHighlightClause, setActiveHighlightClause] = useState('');

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedAppliesTo, setSelectedAppliesTo] = useState('all');
  const [minConfidence, setMinConfidence] = useState(0);
  const [sortBy, setSortBy] = useState('clause'); // 'clause', 'confidence'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'approved', 'rejected', 'pending'

  // Expand/collapse states
  const [expandedId, setExpandedId] = useState(null);

  // Review states
  const [statusMap, setStatusMap] = useState({});
  const [notesMap, setNotesMap] = useState({});
  const [commentsMap, setCommentsMap] = useState({});
  const [bookmarks, setBookmarks] = useState({});

  // Active circular object
  const activeCircular = circulars.find(c => c.id === Number(selectedCircularId));

  const loadCircularData = async (circId) => {
    if (!circId) return;
    setLoading(true);
    setErrorMessage('');
    
    const resOb = await api.getCircularObligations(circId);
    if (resOb.success) {
      setObligations(resOb.data || []);
      setStatusMap({});
      setNotesMap({});
      setCommentsMap({});
    } else {
      setErrorMessage(resOb.error || 'Failed to load obligations.');
      setSuggestion(resOb.suggestion || '');
      setObligations([]);
    }

    setLoadingText(true);
    setCircularText('');
    const resText = await api.getCircularText(circId);
    if (resText.success) {
      setCircularText(resText.data?.text || '');
    } else {
      setCircularText('Failed to read document text layers.');
    }
    setLoadingText(false);
    setLoading(false);
  };

  useEffect(() => {
    if (selectedCircularId) {
      loadCircularData(selectedCircularId);
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
      const textRes = await api.getCircularText(selectedCircularId);
      if (textRes.success) setCircularText(textRes.data?.text || '');
    } else {
      setErrorMessage(res.error || 'Extraction workflow failed.');
      setSuggestion(res.suggestion || '');
    }
    setExtracting(false);
  };

  const simulatedPages = useMemo(() => {
    if (!circularText) return ['No content.'];
    const paragraphs = circularText.split('\n\n');
    const pages = [];
    let currentPageText = '';
    
    paragraphs.forEach((p, idx) => {
      currentPageText += p + '\n\n';
      if ((idx + 1) % 4 === 0 || idx === paragraphs.length - 1) {
        pages.push(currentPageText.trim());
        currentPageText = '';
      }
    });
    return pages;
  }, [circularText]);

  const handleJumpToSource = (clauseRef, textSnippet) => {
    setActiveHighlightClause(clauseRef);
    setPdfSearchQuery(clauseRef);
    const pageIndex = simulatedPages.findIndex(page => 
      page.toLowerCase().includes(clauseRef.toLowerCase()) ||
      page.toLowerCase().includes(textSnippet.substring(0, 30).toLowerCase())
    );
    if (pageIndex !== -1) setPdfActivePage(pageIndex + 1);
  };

  const handleStatusChange = (id, status) => setStatusMap(prev => ({ ...prev, [id]: status }));

  const handleAddComment = (id, commentText) => {
    if (!commentText.trim()) return;
    const newComment = { user: 'Aditya Nair (Auditor)', text: commentText, time: 'Just now' };
    setCommentsMap(prev => ({ ...prev, [id]: [...(prev[id] || []), newComment] }));
  };

  const handleCopyText = (text) => navigator.clipboard.writeText(text);

  const toggleBookmark = (id) => setBookmarks(prev => ({ ...prev, [id]: !prev[id] }));

  const filteredObligations = obligations.filter(ob => {
    const obStatus = statusMap[ob.id] || 'pending';
    const matchesSearch = ob.obligation_text.toLowerCase().includes(searchQuery.toLowerCase()) || ob.source_clause.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || ob.obligation_type === selectedType;
    const matchesApplies = selectedAppliesTo === 'all' || ob.applies_to === selectedAppliesTo;
    const matchesConfidence = ob.confidence_score >= minConfidence;
    const matchesStatus = filterStatus === 'all' || obStatus === filterStatus;
    return matchesSearch && matchesType && matchesApplies && matchesConfidence && matchesStatus;
  });

  const sortedObligations = [...filteredObligations].sort((a, b) => {
    if (sortBy === 'confidence') return b.confidence_score - a.confidence_score;
    return a.source_clause.localeCompare(b.source_clause, undefined, { numeric: true, sensitivity: 'base' });
  });

  const totalCount = obligations.length;
  const approvedCount = Object.values(statusMap).filter(s => s === 'approved').length;
  const rejectedCount = Object.values(statusMap).filter(s => s === 'rejected').length;
  const flaggedCount = Object.values(statusMap).filter(s => s === 'flagged').length;
  const pendingCount = totalCount - approvedCount - rejectedCount - flaggedCount;
  const avgConfidence = totalCount > 0 ? Math.round((obligations.reduce((sum, o) => sum + o.confidence_score, 0) / totalCount) * 100) : 0;

  const renderHighlightedPdfText = (text) => {
    let query = pdfSearchQuery || activeHighlightClause;
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, idx) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={idx} className="bg-yellow-500/30 text-yellow-900 border-b border-yellow-500 font-bold px-0.5 rounded-sm animate-pulse">
              {part}
            </mark>
          ) : part
        )}
      </>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse select-none">
        <div className="h-16 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]"></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[70vh]">
          <div className="lg:col-span-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl"></div>
          <div className="lg:col-span-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl"></div>
          <div className="lg:col-span-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
        <div className="flex-1">
          <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
            Active Compliance Circular
          </label>
          <select
            value={selectedCircularId || ''}
            onChange={(e) => onSelectCircular(Number(e.target.value))}
            className="w-full max-w-md bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-main)] font-semibold focus:outline-none focus:border-blue-500"
          >
            {circulars.map(c => (
              <option key={c.id} value={c.id}>{c.title} ({c.source_filename})</option>
            ))}
          </select>
        </div>
        {activeCircular && obligations.length === 0 && !loading && (
          <button onClick={handleExtract} disabled={extracting} className="flex items-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs disabled:opacity-50">
            <Cpu className="w-4 h-4" /> {extracting ? 'Running Parser...' : 'Extract Obligations Now'}
          </button>
        )}
      </div>

      {obligations.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-12 rounded-xl text-center flex flex-col items-center justify-center min-h-[360px] max-w-lg mx-auto shadow-sm select-none">
          <Cpu className="w-10 h-10 mb-4 text-blue-500 animate-pulse" />
          <h3 className="text-sm font-bold text-[var(--text-main)] mb-1">No obligations parsed</h3>
          <p className="text-xs text-[var(--text-muted)] mb-5 leading-normal">This circular document hasn't been parsed by the AI cognitive core yet.</p>
          <button onClick={handleExtract} disabled={extracting} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors">
            {extracting ? 'Processing...' : 'Trigger Extraction'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className={`lg:col-span-4 flex flex-col bg-slate-100 dark:bg-slate-900 border border-[var(--border-color)] rounded-xl overflow-hidden shadow-xs h-[75vh] ${isPdfFullScreen ? 'fixed inset-0 z-50 h-screen w-screen rounded-none' : ''}`}>
            <div className="h-10 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-3 flex justify-between items-center shrink-0 text-[10px] select-none font-semibold">
              <div className="flex items-center gap-0.5 text-[var(--text-muted)]">
                <button onClick={() => setPdfZoom(z => Math.max(50, z - 25))} className="p-1 hover:bg-[var(--bg-app)] rounded"><ZoomOut className="w-3.5 h-3.5" /></button>
                <span className="font-mono px-1 min-w-[28px] text-center">{pdfZoom}%</span>
                <button onClick={() => setPdfZoom(z => Math.min(175, z + 25))} className="p-1 hover:bg-[var(--bg-app)] rounded"><ZoomIn className="w-3.5 h-3.5" /></button>
                <button onClick={() => setPdfRotation(r => (r + 90) % 360)} className="p-1 hover:bg-[var(--bg-app)] rounded border-l border-[var(--border-color)] pl-1.5 ml-1"><RotateCw className="w-3.5 h-3.5" /></button>
              </div>
              <div className="relative w-28 sm:w-36">
                <Search className="absolute left-2 top-2 w-3 h-3 text-slate-400" />
                <input type="text" placeholder="Find text..." value={pdfSearchQuery} onChange={(e) => setPdfSearchQuery(e.target.value)} className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded pl-7 pr-2 py-0.75 text-[9px] focus:outline-none" />
              </div>
              <div className="flex items-center gap-1 text-[var(--text-muted)]">
                <button onClick={() => setPdfActivePage(p => Math.max(1, p - 1))} className="p-1 hover:bg-[var(--bg-app)] rounded"><ChevronLeft className="w-3.5 h-3.5" /></button>
                <span>{pdfActivePage}/{simulatedPages.length}</span>
                <button onClick={() => setPdfActivePage(p => Math.min(simulatedPages.length, p + 1))} className="p-1 hover:bg-[var(--bg-app)] rounded"><ChevronRight className="w-3.5 h-3.5" /></button>
                <button onClick={() => setIsPdfFullScreen(!isPdfFullScreen)} className="p-1 hover:bg-[var(--bg-app)] rounded border-l border-[var(--border-color)] pl-1.5 ml-1"><Maximize2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex justify-center items-start">
              {loadingText ? (
                <div className="py-20 text-center text-slate-400 text-xs"><RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-blue-500" /><span>Loading...</span></div>
              ) : (
                <motion.div style={{ width: `${pdfZoom}%`, transform: `rotate(${pdfRotation}deg)`, transformOrigin: 'top center' }} transition={{ duration: 0.1 }} className="bg-white text-slate-900 border border-slate-300 rounded-lg p-6 shadow-sm font-mono text-[10px] leading-relaxed max-w-md min-h-[460px] whitespace-pre-wrap select-text cursor-text">
                  {renderHighlightedPdfText(simulatedPages[pdfActivePage - 1])}
                </motion.div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col h-[75vh] space-y-4 overflow-hidden">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-3 rounded-xl shadow-xs space-y-2.5 shrink-0 select-none">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-main)] placeholder-slate-400 focus:outline-none focus:border-blue-500" />
                </div>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-[var(--bg-app)] border border-[var(--border-color)] px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase text-[var(--text-muted)] focus:outline-none">
                  <option value="all">All States</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="flagged">Flagged</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              <AnimatePresence mode="popLayout">
                {sortedObligations.map((ob) => {
                  const isExpanded = expandedId === ob.id;
                  const obStatus = statusMap[ob.id] || 'pending';
                  const scorePct = Math.round(ob.confidence_score * 100);
                  return (
                    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} key={ob.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden">
                      <div className="p-4 space-y-3">
                        <div className="flex justify-between items-center text-[9px] font-bold uppercase">
                          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded">Clause {ob.source_clause}</span>
                          <button onClick={() => toggleBookmark(ob.id)} className={`p-1 ${bookmarks[ob.id] ? 'text-amber-500' : 'text-slate-400'}`}><Bookmark className="w-3.5 h-3.5" /></button>
                        </div>
                        <p className="text-xs font-semibold text-[var(--text-main)] leading-relaxed">{ob.obligation_text}</p>
                        <div className="flex justify-between items-center pt-1 border-t border-[var(--border-color)]/25">
                          <button onClick={() => handleJumpToSource(ob.source_clause, ob.obligation_text)} className="text-[10px] text-blue-600 flex items-center gap-1 font-bold"><Eye className="w-3 h-3" /> Jump to source</button>
                          <span className="text-[10px] font-bold">{scorePct}% Confidence</span>
                        </div>
                      </div>
                      <button onClick={() => setExpandedId(prev => prev === ob.id ? null : ob.id)} className="w-full py-1.5 border-t border-[var(--border-color)]/30 text-[9px] font-bold uppercase flex items-center justify-center gap-1">
                        {isExpanded ? 'Collapse Details' : 'Expand Details'} {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-3.5 border-t border-[var(--border-color)]/30 bg-[var(--bg-app)]/20 text-xs space-y-3.5">
                          <div className="flex gap-1.5">
                            <button onClick={() => handleStatusChange(ob.id, 'approved')} className="px-3 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Approve</button>
                            <button onClick={() => handleStatusChange(ob.id, 'rejected')} className="px-3 py-1 bg-red-600 text-white rounded text-[10px] font-bold flex items-center gap-1"><XCircle className="w-3 h-3" /> Reject</button>
                            <button onClick={() => handleStatusChange(ob.id, 'flagged')} className="px-3 py-1 bg-amber-500 text-white rounded text-[10px] font-bold flex items-center gap-1"><Flag className="w-3 h-3" /> Flag</button>
                          </div>
                          <textarea value={notesMap[ob.id] || ''} onChange={(e) => setNotesMap(prev => ({ ...prev, [ob.id]: e.target.value }))} placeholder="Auditor notes..." className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2 text-xs" rows={2} />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-xl shadow-xs">
              <h3 className="text-xs font-bold text-[var(--text-main)] mb-4 flex items-center gap-2"><Cpu className="text-purple-500 w-4 h-4" /> AI Inspector</h3>
              <div className="space-y-3 text-xs font-medium border-b border-[var(--border-color)]/40 pb-4">
                <div className="flex justify-between"><span>Avg Confidence</span><span className="text-emerald-500 font-bold">{avgConfidence}%</span></div>
                <div className="flex justify-between"><span>Status</span><span className="text-blue-500 font-bold">READY</span></div>
              </div>
              <div className="space-y-3.5 pt-4 text-[9px] font-semibold">
                <h4 className="text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Timeline</h4>
                <div className="pl-3 border-l border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="relative">PDF Ingested</div>
                  <div className="relative">Extraction Complete</div>
                  <div className="relative">Reviews Pending: {pendingCount}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
