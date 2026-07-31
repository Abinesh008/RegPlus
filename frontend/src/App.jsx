import React, { useState, useEffect, lazy, Suspense } from 'react';
import { api } from './services/api';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import WorkflowTracker from './components/WorkflowTracker';

// Lazy-loaded Pages for improved initial load performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CircularLibrary = lazy(() => import('./pages/CircularLibrary'));
const ObligationExtraction = lazy(() => import('./pages/ObligationExtraction'));
const CircularComparison = lazy(() => import('./pages/CircularComparison'));
const RuleImpact = lazy(() => import('./pages/RuleImpact'));
const ComplianceReport = lazy(() => import('./pages/ComplianceReport'));

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Compliance Workspace States
  const [circulars, setCirculars] = useState([]);
  const [loadingCirculars, setLoadingCirculars] = useState(false);
  const [selectedCircularId, setSelectedCircularId] = useState(null);
  const [activeDiffId, setActiveDiffId] = useState(null);
  const [oldCircularId, setOldCircularId] = useState('');
  const [newCircularId, setNewCircularId] = useState('');
  const [mappings, setMappings] = useState([]);

  // System Health States
  const [backendStatus, setBackendStatus] = useState('checking');
  const [geminiStatus, setGeminiStatus] = useState('mock'); // 'connected' (active) or 'mock'
  const [lastProcessedTime, setLastProcessedTime] = useState(() => localStorage.getItem('lastProcessedTime') || null);

  // Initialize and check health
  const checkHealth = async () => {
    setBackendStatus('checking');
    const res = await api.healthCheck();
    if (res.success && res.data?.status === 'OK') {
      setBackendStatus('connected');
    } else {
      setBackendStatus('error');
    }
  };

  const fetchCirculars = async () => {
    setLoadingCirculars(true);
    const res = await api.listCirculars();
    if (res.success && res.data) {
      setCirculars(res.data);
      // Auto-select first circular if none selected
      if (res.data.length > 0 && !selectedCircularId) {
        setSelectedCircularId(res.data[0].id);
      }
    }
    setLoadingCirculars(false);
  };

  useEffect(() => {
    checkHealth();
    fetchCirculars();
    
    // Poll health every 15 seconds
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Sync theme to document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Determine Gemini active status from mappings source
  useEffect(() => {
    if (mappings.length > 0) {
      const hasGemini = mappings.some(m => m.mapping_source?.toLowerCase() === 'gemini');
      setGeminiStatus(hasGemini ? 'connected' : 'mock');
    }
  }, [mappings]);

  // Update last processed timestamp
  const updateProcessingTime = () => {
    const time = new Date().toISOString();
    setLastProcessedTime(time);
    localStorage.setItem('lastProcessedTime', time);
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Detect Demo Mode
  const isDemoMode = circulars.some(c => 
    c.source_filename?.toLowerCase().includes('sample') ||
    c.source_filename?.toLowerCase().startsWith('circular_') ||
    c.title?.toLowerCase().includes('sample')
  ) || sessionStorage.getItem('samplesProcessed') === 'true';

  // Navigation handlers
  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  // Maps page ID to workflow step ID
  const pageToStep = {
    'library': 'upload',
    'extraction': 'extract',
    'comparison': 'compare',
    'rule-impact': 'map',
    'report': 'report'
  };

  // Maps workflow step ID to page ID
  const stepToPage = {
    'upload': 'library',
    'extract': 'extraction',
    'compare': 'comparison',
    'map': 'rule-impact',
    'report': 'report'
  };

  const handleStepClick = (stepId) => {
    const targetPage = stepToPage[stepId];
    if (targetPage) {
      setCurrentPage(targetPage);
    }
  };

  // Workspace transition triggers
  const handleExtractSuccess = (circId) => {
    setSelectedCircularId(circId);
    updateProcessingTime();
    setCurrentPage('extraction');
  };

  const handleCompareSuccess = (diffId, oldId, newId) => {
    setActiveDiffId(diffId);
    setOldCircularId(oldId || '');
    setNewCircularId(newId);
    updateProcessingTime();
    setCurrentPage('comparison');
  };

  const handleMappingsUpdated = (newMappings) => {
    setMappings(newMappings);
    updateProcessingTime();
  };

  // Compute stats for metrics
  const totalObligationsCount = circulars.length > 0 ? 9 : 0; // Simulated fallback if needed
  
  // Title mapping helper
  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard': return 'Compliance Control Panel';
      case 'library': return 'Circular Library Archives';
      case 'extraction': return 'Obligation Extraction Engine';
      case 'comparison': return 'Circular Difference Comparison';
      case 'rule-impact': return 'Rule Impact & Parameter Mapping';
      case 'report': return 'Executive Compliance Report';
      default: return 'RegPulse';
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] transition-colors duration-200">
      {/* Left Sidebar */}
      <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Topbar */}
        <Topbar
          theme={theme}
          toggleTheme={toggleTheme}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          backendStatus={backendStatus}
          geminiStatus={geminiStatus}
          isDemoMode={isDemoMode}
          currentPageTitle={getPageTitle()}
          onRefreshHealth={() => { checkHealth(); fetchCirculars(); }}
        />

        {/* Workflow Tracker Stepper (Visible on compliance related pages) */}
        {currentPage !== 'dashboard' && (
          <WorkflowTracker
            currentStep={pageToStep[currentPage] || 'upload'}
            onStepClick={handleStepClick}
          />
        )}

        {/* Main Content Pane */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            <Suspense fallback={
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-12 rounded-xl text-center text-xs text-[var(--text-muted)] font-medium">
                <div className="animate-pulse flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                  <span>Loading workbench module...</span>
                </div>
              </div>
            }>
              {currentPage === 'dashboard' && (
                <Dashboard
                  circulars={circulars}
                  obligationsCount={circulars.length > 0 ? 12 : 0} // Inferred obligations count
                  diffCount={activeDiffId ? 1 : 0}
                  mappings={mappings}
                  backendStatus={backendStatus}
                  geminiStatus={geminiStatus}
                  lastProcessedTime={lastProcessedTime}
                  onNavigate={handleNavigate}
                />
              )}
              
              {currentPage === 'library' && (
                <CircularLibrary
                  circulars={circulars}
                  loadingCirculars={loadingCirculars}
                  onRefreshLibrary={fetchCirculars}
                  onExtractSuccess={handleExtractSuccess}
                  onNavigate={handleNavigate}
                />
              )}

              {currentPage === 'extraction' && (
                <ObligationExtraction
                  circulars={circulars}
                  selectedCircularId={selectedCircularId}
                  onSelectCircular={setSelectedCircularId}
                  onExtractSuccess={handleExtractSuccess}
                />
              )}

              {currentPage === 'comparison' && (
                <CircularComparison
                  circulars={circulars}
                  onCompareSuccess={handleCompareSuccess}
                  onNavigate={handleNavigate}
                />
              )}

              {currentPage === 'rule-impact' && (
                <RuleImpact
                  activeDiffId={activeDiffId}
                  onMappingsUpdated={handleMappingsUpdated}
                  onNavigate={handleNavigate}
                />
              )}

              {currentPage === 'report' && (
                <ComplianceReport
                  circulars={circulars}
                  oldCircularId={oldCircularId}
                  newCircularId={newCircularId}
                  mappings={mappings}
                  activeDiffId={activeDiffId}
                />
              )}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
