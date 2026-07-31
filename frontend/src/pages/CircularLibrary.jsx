import React, { useState } from 'react';
import { 
  FiUpload, 
  FiFileText, 
  FiTrash2, 
  FiEye, 
  FiCpu,
  FiCheckCircle, 
  FiAlertCircle, 
  FiXCircle,
  FiX
} from 'react-icons/fi';
import api from '../services/api';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function CircularLibrary({
  circulars = [],
  loadingCirculars = false,
  onRefreshLibrary,
  onExtractSuccess,
  onNavigate
}) {
  const [uploading, setUploading] = useState(false);
  const [processingSamples, setProcessingSamples] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // View text drawer state
  const [viewingText, setViewingText] = useState(null); // { id, title, text }
  const [loadingText, setLoadingText] = useState(false);

  // Extract obligations running state
  const [extractingId, setExtractingId] = useState(null);

  const validateFile = (file) => {
    if (!file) return false;
    
    // PDF validation
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Only PDF documents are allowed.');
      setSuccessMessage('');
      return false;
    }
    
    // Size validation: 50MB
    const limit = 50 * 1024 * 1024;
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

  const handleViewText = async (id, title) => {
    setLoadingText(true);
    setViewingText({ id, title, text: '' });
    
    const res = await api.getCircularText(id);
    if (res.success) {
      setViewingText(prev => ({ ...prev, text: res.data?.text || 'No text extracted.' }));
    } else {
      setErrorMessage('Failed to fetch circular text content.');
      setViewingText(null);
    }
    setLoadingText(false);
  };

  const handleExtractObligations = async (id) => {
    setExtractingId(id);
    setErrorMessage('');
    setSuccessMessage('');

    const res = await api.extractObligations(id);
    if (res.success) {
      setSuccessMessage('Obligations extracted successfully.');
      onExtractSuccess && onExtractSuccess(id);
    } else {
      setErrorMessage(res.error || 'Failed to extract obligations.');
    }
    setExtractingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Drag and drop card */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-main)] mb-1 flex items-center gap-2">
              <FiUpload className="text-primary" />
              Upload RBI Regulatory Document
            </h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Add new Reserve Bank of India notifications, circulars, or rules in PDF format to parse and simulate compliance impacts.
            </p>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center flex flex-col items-center justify-center transition-colors cursor-pointer ${
              dragActive 
                ? 'border-accent bg-accent/5' 
                : 'border-[var(--border-color)] hover:border-accent/40 bg-[var(--bg-app)]/50'
            }`}
            onClick={() => document.getElementById('file-upload-input').click()}
          >
            <input
              id="file-upload-input"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => e.target.files && handleUpload(e.target.files[0])}
            />
            <FiFileText className={`w-10 h-10 mb-3 ${dragActive ? 'text-accent animate-bounce' : 'text-slate-400'}`} />
            <p className="text-xs font-semibold text-[var(--text-main)] mb-1">
              Drag & Drop PDF here, or <span className="text-accent underline">browse files</span>
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">
              PDF files only (Max 50 MB)
            </p>
          </div>

          {/* Status Message */}
          {(errorMessage || successMessage || uploading) && (
            <div className="mt-3 text-xs font-semibold">
              {uploading && (
                <p className="text-[var(--color-warning)] flex items-center gap-1.5">
                  <FiUpload className="animate-bounce" /> Uploading and cleaning PDF...
                </p>
              )}
              {errorMessage && (
                <p className="text-[var(--color-danger)] flex items-center gap-1.5">
                  <FiXCircle /> {errorMessage}
                </p>
              )}
              {successMessage && (
                <p className="text-[var(--color-success)] flex items-center gap-1.5">
                  <FiCheckCircle /> {successMessage}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Demo trigger card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-main)] mb-2 flex items-center gap-2">
              <FiCpu className="text-accent" />
              Demo Data Generator
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
              If you don't have custom regulatory documents on hand, load the standard set of sample circulars pre-arranged for auditing and diff sessions.
            </p>
          </div>
          <button
            onClick={handleLoadSamples}
            disabled={processingSamples || uploading}
            className="w-full text-center py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
          >
            {processingSamples ? 'Loading Samples...' : 'Use Sample Circulars'}
          </button>
        </div>

      </div>

      {/* Library Listings */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-xl shadow-sm">
        <h3 className="text-sm font-bold text-[var(--text-main)] mb-4">
          Circular Archives & Library
        </h3>
        
        {loadingCirculars ? (
          <LoadingSkeleton type="list" count={3} />
        ) : circulars.length === 0 ? (
          <EmptyState 
            title="No Documents Stored" 
            description="Upload an RBI document PDF or click Use Sample Circulars to generate the initial list."
            actionLabel="Process Samples"
            onAction={handleLoadSamples}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {circulars.map((circ) => (
              <div 
                key={circ.id}
                className="border border-[var(--border-color)] bg-[var(--bg-app)]/30 rounded-xl p-4 flex flex-col justify-between shadow-sm transition-all hover:border-[var(--border-hover)]"
              >
                <div>
                  <div className="flex justify-between items-start gap-3">
                    <h4 className="text-xs font-bold text-[var(--text-main)] line-clamp-2 leading-relaxed">
                      {circ.title}
                    </h4>
                    <span className="flex-shrink-0 px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/15">
                      Processed
                    </span>
                  </div>
                  
                  <div className="mt-3.5 space-y-1.5 text-[10.5px] text-[var(--text-muted)] font-medium">
                    <p><span className="font-semibold text-[var(--text-main)]">Source File:</span> {circ.source_filename}</p>
                    <p><span className="font-semibold text-[var(--text-main)]">Version Date:</span> {circ.version_date || 'Unknown'}</p>
                    <p><span className="font-semibold text-[var(--text-main)]">Upload Date:</span> {new Date(circ.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[var(--border-color)]/50 flex justify-between items-center gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewText(circ.id, circ.title)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded text-[10px] font-bold text-[var(--text-main)] cursor-pointer transition-colors border border-[var(--border-color)]"
                      title="View cleaned plain text"
                    >
                      <FiEye /> View Text
                    </button>
                    
                    <button
                      onClick={() => handleExtractObligations(circ.id)}
                      disabled={extractingId === circ.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-primary hover:bg-primary/95 text-white rounded text-[10px] font-bold cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                      title="Run Gemini/Mock parser to extract compliance rules"
                    >
                      <FiCpu /> {extractingId === circ.id ? 'Extracting...' : 'Extract Obligations'}
                    </button>
                  </div>

                  {/* Disable Delete button and display notice */}
                  <button
                    disabled
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 rounded text-[10px] font-bold cursor-not-allowed border border-transparent"
                    title="Available in future release"
                  >
                    <FiTrash2 /> Delete
                  </button>
                </div>
                
                {/* Available in future release visual notice */}
                <span className="text-[9px] text-right text-slate-400 dark:text-slate-600 mt-1 select-none font-medium">
                  Delete available in future release
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slide-out Text Drawer / Modal */}
      {viewingText && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-end z-50 no-print">
          <div className="w-full max-w-2xl bg-[var(--bg-card)] h-full shadow-2xl flex flex-col p-6 border-l border-[var(--border-color)]">
            <div className="flex justify-between items-start pb-4 border-b border-[var(--border-color)]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Document Viewer</span>
                <h3 className="text-sm font-bold text-[var(--text-main)] mt-1 line-clamp-2">
                  {viewingText.title}
                </h3>
              </div>
              <button 
                onClick={() => setViewingText(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-6 font-mono text-xs text-[var(--text-main)] bg-[var(--bg-app)]/40 p-4 rounded-xl border border-[var(--border-color)]/30 mt-4 leading-relaxed whitespace-pre-wrap">
              {loadingText ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <FiCpu className="w-8 h-8 animate-spin mb-2 text-accent" />
                  <span>Fetching cleaned document text...</span>
                </div>
              ) : (
                viewingText.text
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
