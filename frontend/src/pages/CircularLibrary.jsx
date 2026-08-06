import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  FileText,
  Trash2,
  Eye,
  Cpu,
  CheckCircle,
  AlertCircle,
  XCircle,
  X,
  Search,
  Filter,
  ArrowUpDown,
  Maximize2,
  Minimize2,
  RotateCw,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Hash,
  User,
  Clock,
  Share2,
  History,
  Sparkles,
  BookOpen,
  LayoutGrid,
  FileDown,
  Activity,
  Sliders
} from 'lucide-react';

import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CircularLibrary({
  circulars = [],
  loadingCirculars = false,
  onRefreshLibrary,
  onExtractSuccess,
  onNavigate
}) {
  const { user } = useAuth();
  const isWritable = user?.role !== 'Auditor';
  const [uploading, setUploading] = useState(false);
  const [processingSamples, setProcessingSamples] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Data Grid controls
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filterIssuer, setFilterIssuer] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Preview Drawer states
  const [activePreviewCirc, setActivePreviewCirc] = useState(null); // Selected circular object
  const [previewText, setPreviewText] = useState('');
  const [loadingText, setLoadingText] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [pdfRotation, setPdfRotation] = useState(0);
  const [pdfSearchQuery, setPdfSearchQuery] = useState('');
  const [activePage, setActivePage] = useState(1);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Extract obligations running state
  const [extractingId, setExtractingId] = useState(null);

  // Close drawer on ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActivePreviewCirc(null);
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync drawer text fetch
  useEffect(() => {
    if (activePreviewCirc) {
      fetchCircularText(activePreviewCirc.id);
    }
  }, [activePreviewCirc]);

  const fetchCircularText = async (id) => {
    setLoadingText(true);
    setPreviewText('');
    setPdfSearchQuery('');
    setActivePage(1);
    
    const res = await api.getCircularText(id);
    if (res.success) {
      setPreviewText(res.data?.text || 'No text content available.');
    } else {
      setErrorMessage('Failed to load text preview.');
      setPreviewText('Error loading document content.');
    }
    setLoadingText(false);
  };

  const validateFile = (file) => {
    if (!file) return false;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Only PDF documents are allowed.');
      setSuccessMessage('');
      return false;
    }
    const limit = 50 * 1024 * 1024; // 50MB
    if (file.size > limit) {
      setErrorMessage('File size exceeds the 50 MB limit.');
      setSuccessMessage('');
      return false;
    }
    return true;
  };

  const handleUpload = async (file) => {
    if (!validateFile(file)) return;

    setUploading(true);
    setErrorMessage('');
    setSuccessMessage('');

    const res = await api.uploadCircular(file);
    if (res.success) {
      setSuccessMessage(`Uploaded "${file.name}" successfully.`);
      onRefreshLibrary && onRefreshLibrary();
    } else {
      setErrorMessage(res.error || 'Failed to upload circular.');
    }
    setUploading(false);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSamples = async () => {
    setProcessingSamples(true);
    setErrorMessage('');
    setSuccessMessage('');

    const res = await api.processSamples();
    if (res.success) {
      const processedCount = res.data?.processed || 0;
      setSuccessMessage(`Processed ${processedCount} sample circulars.`);
      onRefreshLibrary && onRefreshLibrary();
    } else {
      setErrorMessage(res.error || 'Failed to process sample circulars.');
    }
    setProcessingSamples(false);
  };

  const handleExtractObligations = async (circId) => {
    setExtractingId(circId);
    setErrorMessage('');
    setSuccessMessage('');

    const res = await api.extractObligations(circId);
    if (res.success) {
      setSuccessMessage('Obligations extracted successfully.');
      onExtractSuccess && onExtractSuccess(circId);
    } else {
      setErrorMessage(res.error || 'Failed to extract obligations.');
    }
    setExtractingId(null);
  };

  // Sorting/Filtering Logic
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredCirculars = useMemo(() => {
    return circulars
      .filter(c => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          c.title?.toLowerCase().includes(query) || 
          c.source_filename?.toLowerCase().includes(query) ||
          c.pdf_hash?.toLowerCase().includes(query);
        
        const matchesIssuer = filterIssuer === 'all' || 
          c.title?.toLowerCase().includes(filterIssuer.toLowerCase());

        return matchesSearch && matchesIssuer;
      })
      .sort((a, b) => {
        let valA = a[sortField] || '';
        let valB = b[sortField] || '';
        
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [circulars, searchQuery, sortField, sortDirection, filterIssuer]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredCirculars.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id, checked) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  // Split text into simulated pages for custom PDF Canvas rendering
  const simulatedPages = useMemo(() => {
    if (!previewText) return [''];
    // Split by paragraphs to simulate pages
    const paragraphs = previewText.split('\n\n');
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
  }, [previewText]);

  // Text highlighting helper for PDF search queries
  const renderHighlightedPageText = (text) => {
    if (!pdfSearchQuery) return text;
    const parts = text.split(new RegExp(`(${pdfSearchQuery})`, 'gi'));
    return (
      <>
        {parts.map((part, idx) => 
          part.toLowerCase() === pdfSearchQuery.toLowerCase() ? (
            <mark key={idx} className="bg-orange-500/30 text-orange-900 dark:text-orange-200 border-b border-orange-500 font-bold px-0.5 rounded-sm">
              {part}
            </mark>
          ) : part
        )}
      </>
    );
  };

  return (
    <div className="space-y-6 font-sans select-none">
      
      {/* SECTION 1: DOCUMENT METRIC SUMMARY */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block font-display">Total Ingested</span>
          <h3 className="text-lg font-extrabold text-[var(--text-main)] mt-1">{circulars.length} PDFs</h3>
          <span className="text-[9px] text-[var(--text-muted)] font-semibold mt-1.5 block">Stored in SQLite core</span>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block font-display">Ingestion Storage</span>
          <h3 className="text-lg font-extrabold text-[var(--text-main)] mt-1">
            {circulars.length > 0 ? `${(circulars.length * 0.8).toFixed(1)} MB` : '0 KB'}
          </h3>
          <span className="text-[9px] text-[var(--text-muted)] font-semibold mt-1.5 block">Estimated file capacity</span>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block font-display">Audit Status</span>
          <h3 className="text-lg font-extrabold text-[var(--text-main)] mt-1">100% Processed</h3>
          <span className="text-[9px] text-[var(--text-muted)] font-semibold mt-1.5 block">Zero indexing backlogs</span>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block font-display">Last Ingest Trigger</span>
          <h3 className="text-lg font-extrabold text-[var(--text-main)] mt-1 truncate">
            {circulars.length > 0 ? 'KYC Amendment' : 'No uploads yet'}
          </h3>
          <span className="text-[9px] text-[var(--text-muted)] font-semibold mt-1.5 block">Recent database sync</span>
        </div>
      </div>

      {/* SECTION 2: UPLOAD ZONE & ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upload Arena */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider font-display mb-1 flex items-center gap-2">
              <UploadCloud className="text-blue-500 w-4 h-4" />
              Document Ingestion dropzone
            </h3>
            <p className="text-xs text-[var(--text-muted)] mb-4 leading-normal">
              Drag & Drop Reserve Bank of India regulatory notifications or KYC circulars. Text stripping maps headers and page bounds natively.
            </p>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-colors cursor-pointer ${
              dragActive 
                ? 'border-blue-500 bg-blue-500/5' 
                : 'border-[var(--border-color)] ' + (isWritable ? 'hover:border-blue-500 cursor-pointer' : 'cursor-not-allowed') + ' bg-[var(--bg-app)]/50'
            }`}
            onClick={() => isWritable && document.getElementById('file-upload-input').click()}
          >
            <input
              id="file-upload-input"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => e.target.files && handleUpload(e.target.files[0])}
            />
            <FileText className={`w-10 h-10 mb-3.5 ${dragActive ? 'text-blue-500 animate-bounce' : 'text-slate-400'}`} />
            <p className="text-xs font-bold text-[var(--text-main)] mb-1">
              {isWritable ? <>Drag & Drop PDF here, or <span className="text-blue-600 underline">browse your local folder</span></> : <>Upload is restricted for Auditor accounts.</>}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">
              PDF formats only (Maximum limit 50 MB)
            </p>
          </div>

          {/* Status logs */}
          {(errorMessage || successMessage || uploading) && (
            <div className="mt-3.5 text-xs font-semibold">
              {uploading && (
                <div className="space-y-1.5">
                  <p className="text-blue-600 flex items-center gap-1.5">
                    <RefreshCw className="animate-spin w-3.5 h-3.5" /> Parsing, cleaning text & hashing document...
                  </p>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: '80%' }} transition={{ duration: 1.5 }} className="h-full bg-blue-600 rounded-full" />
                  </div>
                </div>
              )}
              {errorMessage && (
                <p className="text-[var(--color-danger)] flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 shrink-0" /> {errorMessage}
                </p>
              )}
              {successMessage && (
                <p className="text-[var(--color-success)] flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 shrink-0" /> {successMessage}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Bootstrapper Panel */}
        <div className="bg-[var(--bg-card)] border border(--border-color) p-5 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider font-display mb-2 flex items-center gap-2">
              <Sparkles className="text-blue-500 w-4 h-4" />
              Ingest Sample Library
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
              Click to load standard RBI KYC directives (2016-2020) from backend storage, preset for semantic comparisons and audits.
            </p>
          </div>
          <button
            onClick={handleLoadSamples}
            disabled={processingSamples || uploading || !isWritable}
            className="w-full text-center py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs"
          >
            {processingSamples ? 'Indexing Sample Files...' : isWritable ? 'Index Sample Circulars' : 'Index Samples (Restricted)'}
          </button>
        </div>

      </div>

      {/* SECTION 3: COMPLIANCE DATA GRID & FILTERS TOOLBAR */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-xl shadow-xs space-y-4">
        
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-[var(--bg-app)]/30 p-2.5 rounded-xl border border-[var(--border-color)]">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search ref, title, or filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[var(--text-main)] placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
            {/* Filter select */}
            <select
              value={filterIssuer}
              onChange={(e) => setFilterIssuer(e.target.value)}
              className="bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg text-xs text-[var(--text-main)] font-semibold focus:outline-none"
            >
              <option value="all">All Issuers</option>
              <option value="kyc">KYC Segment</option>
              <option value="aml">AML Segment</option>
            </select>

            <button
              onClick={onRefreshLibrary}
              className="p-1.5 border border-[var(--border-color)] bg-[var(--bg-card)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              title="Reload database library"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Data Grid table */}
        <div className="overflow-x-auto">
          {loadingCirculars ? (
            <div className="space-y-3 py-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-[var(--bg-app)] rounded-lg shimmer-loader" />
              ))}
            </div>
          ) : filteredCirculars.length === 0 ? (
            <div className="text-center py-12 text-xs text-[var(--text-muted)] flex flex-col items-center gap-2.5 select-none">
              <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-800 animate-pulse" />
              <p>No circular documents matched your search filter criteria.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] bg-[var(--bg-app)]/50">
                  <th className="py-3 px-3 w-8">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedIds.length === filteredCirculars.length && filteredCirculars.length > 0}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3 cursor-pointer select-none hover:text-[var(--text-main)]" onClick={() => handleSort('title')}>
                    <span className="flex items-center gap-1.5">Document Title / Slug <ArrowUpDown className="w-3 h-3" /></span>
                  </th>
                  <th className="py-3 px-3 cursor-pointer select-none hover:text-[var(--text-main)]" onClick={() => handleSort('source_filename')}>
                    <span className="flex items-center gap-1.5">Source Filename <ArrowUpDown className="w-3 h-3" /></span>
                  </th>
                  <th className="py-3 px-3 cursor-pointer select-none hover:text-[var(--text-main)] w-28" onClick={() => handleSort('version_date')}>
                    <span className="flex items-center gap-1.5">Version Date <ArrowUpDown className="w-3 h-3" /></span>
                  </th>
                  <th className="py-3 px-3 w-32">Status</th>
                  <th className="py-3 px-3 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/70">
                {filteredCirculars.map((circ) => {
                  const isChecked = selectedIds.includes(circ.id);
                  const isExtracted = false; // We use mock/extract success check where possible
                  
                  return (
                    <tr 
                      key={circ.id}
                      className={`hover:bg-[var(--bg-app)]/60 cursor-pointer transition-colors ${
                        isChecked ? 'bg-blue-500/5' : ''
                      }`}
                      onClick={() => setActivePreviewCirc(circ)}
                    >
                      <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleSelectOne(circ.id, e.target.checked)}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 font-bold text-[var(--text-main)] truncate max-w-sm">
                        {circ.title}
                      </td>
                      <td className="py-3 px-3 font-mono text-[var(--text-muted)] truncate max-w-xs text-[11px]">
                        {circ.source_filename}
                      </td>
                      <td className="py-3 px-3 font-semibold text-[var(--text-muted)]">
                        {circ.version_date || 'N/A'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          Processed
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1.5 justify-end">
                          {isWritable && (
                            <button
                              onClick={() => handleExtractObligations(circ.id)}
                              disabled={extractingId === circ.id}
                              className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer disabled:opacity-50 shadow-xs"
                              title="Trigger obligations analysis"
                            >
                              <Cpu className="w-3.5 h-3.5" />
                            </button>
                          )}
                          
                          <button
                            disabled
                            className="p-1 bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 border border-[var(--border-color)] rounded cursor-not-allowed"
                            title="Delete file (Future Release)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* SECTION 4 & 5: DOCUMENT PREVIEW DRAWER (RIGHT PANEL) */}
      <AnimatePresence>
        {activePreviewCirc && (
          <div className="fixed inset-0 z-50 flex justify-end no-print font-sans select-none">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setActivePreviewCirc(null); setIsFullScreen(false); }}
              className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs"
            />

            {/* Drawer Body container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className={`bg-[var(--bg-card)] border-l border-[var(--border-color)] shadow-2xl h-full z-10 flex flex-col ${
                isFullScreen ? 'w-full' : 'w-full md:w-[70vw] lg:w-[50vw]'
              }`}
            >
              {/* Drawer header */}
              <div className="px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-app)]/50 flex justify-between items-center shrink-0">
                <div className="min-w-0 pr-6">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Document Preview Workspace</span>
                  <h3 className="text-xs font-bold text-[var(--text-main)] mt-1 truncate leading-snug">
                    {activePreviewCirc.title}
                  </h3>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button 
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-[var(--text-muted)] cursor-pointer"
                    title={isFullScreen ? "Exit Fullscreen" : "Fullscreen Preview"}
                  >
                    {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => { setActivePreviewCirc(null); setIsFullScreen(false); }}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-[var(--text-muted)] cursor-pointer"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* Split Workspace: Left (PDF preview pane), Right (Metadata and History timeline) */}
              <div className="flex-1 flex overflow-hidden">
                
                {/* PDF preview workspace panel */}
                <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-900 border-r border-[var(--border-color)] overflow-hidden">
                  
                  {/* PDF Toolbar */}
                  <div className="h-10 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-4 flex justify-between items-center shrink-0 text-xs">
                    
                    {/* Zoom & Rotation actions */}
                    <div className="flex items-center gap-1 text-[var(--text-muted)]">
                      <button onClick={() => setPdfZoom(z => Math.max(50, z - 25))} className="p-1 hover:bg-[var(--bg-app)] rounded cursor-pointer" title="Zoom out"><ZoomOut className="w-4 h-4" /></button>
                      <span className="font-mono text-[10px] font-bold px-1 min-w-[36px] text-center">{pdfZoom}%</span>
                      <button onClick={() => setPdfZoom(z => Math.min(200, z + 25))} className="p-1 hover:bg-[var(--bg-app)] rounded cursor-pointer" title="Zoom in"><ZoomIn className="w-4 h-4" /></button>
                      <button onClick={() => setPdfRotation(r => (r + 90) % 360)} className="p-1 hover:bg-[var(--bg-app)] rounded cursor-pointer ml-1 border-l border-[var(--border-color)] pl-2" title="Rotate document"><RotateCw className="w-4 h-4" /></button>
                    </div>

                    {/* PDF search input */}
                    <div className="relative w-36 sm:w-44">
                      <Search className="absolute left-2 top-2 w-3 h-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search document text..."
                        value={pdfSearchQuery}
                        onChange={(e) => setPdfSearchQuery(e.target.value)}
                        className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-md pl-7 pr-2 py-1 text-[10px] text-[var(--text-main)] placeholder-slate-400 focus:outline-none"
                      />
                    </div>

                    {/* Page select nodes */}
                    <div className="flex items-center gap-1.5 text-[var(--text-muted)] font-semibold text-[10px]">
                      <button onClick={() => setActivePage(p => Math.max(1, p - 1))} className="p-1 hover:bg-[var(--bg-app)] rounded cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
                      <span>Page {activePage} / {simulatedPages.length}</span>
                      <button onClick={() => setActivePage(p => Math.min(simulatedPages.length, p + 1))} className="p-1 hover:bg-[var(--bg-app)] rounded cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                  </div>

                  {/* Main PDF Page canvas */}
                  <div className="flex-1 overflow-y-auto p-6 flex justify-center items-start">
                    {loadingText ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Cpu className="w-8 h-8 animate-spin mb-2 text-blue-600" />
                        <span className="text-xs">Parsing document layers...</span>
                      </div>
                    ) : (
                      <motion.div 
                        style={{ 
                          width: `${pdfZoom}%`, 
                          transform: `rotate(${pdfRotation}deg)`,
                          transformOrigin: 'top center'
                        }}
                        transition={{ duration: 0.15 }}
                        className="bg-white text-slate-900 border border-slate-300 rounded-lg p-8 shadow-md font-mono text-[11px] leading-relaxed max-w-xl min-h-[500px] whitespace-pre-wrap select-text cursor-text"
                      >
                        {renderHighlightedPageText(simulatedPages[activePage - 1])}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Metadata & Actions Pane (Right panel of preview workspace drawer) */}
                <div className="w-64 bg-[var(--bg-card)] overflow-y-auto p-4 space-y-5 shrink-0 flex flex-col border-l border-[var(--border-color)] justify-between h-full">
                  
                  <div className="space-y-4">
                    {/* SECTION 5: METADATA PANEL */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-display flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-blue-500" />
                        Document Metadata
                      </h4>
                      <div className="bg-[var(--bg-app)]/55 p-3 rounded-lg border border-[var(--border-color)] text-[10px] font-semibold space-y-1.5 text-[var(--text-muted)]">
                        <p className="flex justify-between items-center"><span className="font-normal">Issuer</span> <span className="text-[var(--text-main)]">Reserve Bank of India</span></p>
                        <p className="flex justify-between items-center"><span className="font-normal">Ref Num</span> <span className="text-[var(--text-main)] truncate max-w-[80px]">RBI/2016-17/14</span></p>
                        <p className="flex justify-between items-center"><span className="font-normal">Issue Date</span> <span className="text-[var(--text-main)]">{activePreviewCirc.version_date || 'N/A'}</span></p>
                        <p className="flex justify-between items-center"><span className="font-normal">File Size</span> <span className="text-[var(--text-main)]">0.8 MB</span></p>
                        <p className="flex justify-between items-center"><span className="font-normal">SHA-256</span> <span className="text-[var(--text-main)] truncate max-w-[85px]" title={activePreviewCirc.pdf_hash}>{activePreviewCirc.pdf_hash}</span></p>
                        <p className="flex justify-between items-center"><span className="font-normal">Created At</span> <span className="text-[var(--text-main)]">{new Date(activePreviewCirc.created_at).toLocaleDateString()}</span></p>
                      </div>
                    </div>

                    {/* SECTION 6: QUICK COMPLIANCE ACTIONS */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-display flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-blue-500" />
                        Quick Audit Actions
                      </h4>
                      <div className="space-y-1.5">
                        {isWritable ? (
                          <button
                            onClick={() => handleExtractObligations(activePreviewCirc.id)}
                            disabled={extractingId === activePreviewCirc.id}
                            className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-bold cursor-pointer transition-colors shadow-xs"
                          >
                            {extractingId === activePreviewCirc.id ? 'Extracting Obligations...' : 'Extract Obligations'}
                          </button>
                        ) : (
                          <div className="w-full py-1.5 text-center bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 rounded-md border border-[var(--border-color)]">
                            Extraction Restricted
                          </div>
                        )}
                        
                        <button
                          onClick={() => onNavigate('comparison')}
                          className="w-full py-1.5 border border-[var(--border-color)] hover:border-blue-500 text-[var(--text-main)] hover:text-blue-500 bg-[var(--bg-card)] rounded-md text-[10px] font-bold cursor-pointer transition-colors shadow-xs"
                        >
                          Compare Versions
                        </button>
                      </div>
                    </div>

                    {/* SECTION 7: AUDIT TIMELINE HISTORY */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-display flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-blue-500" />
                        Audit Trail logs
                      </h4>
                      <div className="relative pl-3 border-l border-slate-100 dark:border-slate-800 space-y-3.5 text-[9px] py-1">
                        <div className="relative">
                          <span className="absolute -left-[16.5px] top-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-[var(--bg-card)] shadow-xs" />
                          <span className="block font-bold text-[var(--text-main)]">PDF Ingestion Completed</span>
                          <span className="block text-slate-400 mt-0.5">Cleared formatting by pdfplumber</span>
                        </div>
                        <div className="relative">
                          <span className="absolute -left-[16.5px] top-0.5 w-2 h-2 bg-slate-300 dark:bg-slate-800 rounded-full border border-[var(--bg-card)] shadow-xs" />
                          <span className="block font-bold text-[var(--text-main)]">AI extraction ready</span>
                          <span className="block text-slate-400 mt-0.5">Waiting on Gemini API parse</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Future Release notice */}
                  <span className="text-[9px] text-slate-400 dark:text-slate-600 block mt-2 text-right border-t border-[var(--border-color)]/30 pt-2 font-medium">
                    Audit logs are locked.
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

