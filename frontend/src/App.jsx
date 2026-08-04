import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from './services/api';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import WorkflowTracker from './components/WorkflowTracker';
import CommandPalette from './components/CommandPalette';
import AIInsightsPanel from './components/AIInsightsPanel';

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
  
  // Shell UI States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => 
    localStorage.getItem('sidebar-collapsed') === 'true'
  );
  const [isAIInsightsOpen, setIsAIInsightsOpen] = useState(() => 
    localStorage.getItem('ai-insights-open') !== 'false'
  );
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
  const [geminiStatus, setGeminiStatus] = useState('mock'); // 'connected' or 'mock'
  const [lastProcessedTime, setLastProcessedTime] = useState(() => localStorage.getItem('lastProcessedTime') || null);

  // Mock Notifications State
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'upload', title: 'Upload Successful', message: 'KYC_Amendment_2020.pdf was uploaded.', time: '2 hours ago', read: true },
    { id: 2, type: 'extraction', title: 'AI Extraction Completed', message: 'Gemini parsed 12 obligations with 95.4% confidence.', time: '1 hour ago', read: false },
    { id: 3, type: 'mapping', title: 'Rule Mappings Generated', message: 'Parameters mapped to onboarding & transaction monitoring layers.', time: '30 mins ago', read: false }
  ]);

  // Add a new notification helper
  const addNotification = (type, title, message) => {
    const newNotif = {
      id: Date.now(),
      type,
      title,
      message,
      time: 'Just now',
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Initialize and check health
  const checkHealth = async () => {
    setBackendStatus('checking');
    const res = await api.healthCheck();
    if (res.success && res.data?.status === 'OK') {
      setBackendStatus('connected');
      const nextGemini = res.data.gemini_configured ? 'connected' : 'mock';
      if (nextGemini !== geminiStatus) {
        addNotification(
          nextGemini === 'connected' ? 'extraction' : 'error',
          nextGemini === 'connected' ? 'Gemini API Active' : 'Gemini Offline Mode',
          nextGemini === 'connected' ? 'Successfully connected to Google Gemini cognitive services.' : 'Gemini API key missing. Operating in Mock mode.'
        );
      }
      setGeminiStatus(nextGemini);
    } else {
      if (backendStatus === 'connected') {
        addNotification(
          'error',
          'Backend Disconnected',
          'FastAPI database engine is offline. Running simulation in frontend fallback.'
        );
      }
      setBackendStatus('error');
      setGeminiStatus('mock');
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

  // Sync sidebar collapse persistence
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', isSidebarCollapsed);
  }, [isSidebarCollapsed]);

  // Sync AI Insights persistence
  useEffect(() => {
    localStorage.setItem('ai-insights-open', isAIInsightsOpen);
  }, [isAIInsightsOpen]);

  // Keyboard shortcut listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update last processed timestamp
  const updateProcessingTime = () => {
    const time = new Date().toISOString();
    setLastProcessedTime(time);
    localStorage.setItem('lastProcessedTime', time);
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    addNotification('info', 'Theme Updated', `Switched workspace display to ${theme === 'light' ? 'dark' : 'light'} visual layout.`);
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
    addNotification('extraction', 'Obligations Extracted', `Successfully compiled regulatory obligations for Circular ID #${circId}.`);
    setCurrentPage('extraction');
  };

  const handleCompareSuccess = (diffId, oldId, newId) => {
    setActiveDiffId(diffId);
    setOldCircularId(oldId || '');
    setNewCircularId(newId);
    updateProcessingTime();
    addNotification('mapping', 'Comparison Generated', `Circular comparison diff session #${diffId} successfully calculated.`);
    setCurrentPage('comparison');
  };

  const handleMappingsUpdated = (newMappings) => {
    setMappings(newMappings);
    updateProcessingTime();
    addNotification('mapping', 'Rules Mapped', 'Successfully mapped circular obligations to internal banking rule engine taxonomy.');
  };

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

  // Notification actions
  const handleMarkAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleClearOne = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] transition-colors duration-200 overflow-hidden font-sans">
      
      {/* Collapsible Left Sidebar */}
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={handleNavigate} 
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
      />

      {/* Main Workspace Frame container */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        
        {/* Topbar Header */}
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
          onOpenSearch={() => setIsSearchOpen(true)}
          notifications={notifications}
          onMarkNotificationAsRead={handleMarkAsRead}
          onClearAllNotifications={handleClearAll}
          onClearOneNotification={handleClearOne}
          currentPage={currentPage}
          isAIInsightsOpen={isAIInsightsOpen}
          onToggleAIInsights={() => setIsAIInsightsOpen(prev => !prev)}
        />

        {/* Workflow Tracker Stepper (Visible on compliance related pages) */}
        {currentPage !== 'dashboard' && currentPage !== 'settings' && currentPage !== 'help' && currentPage !== 'about' && (
          <WorkflowTracker
            currentStep={pageToStep[currentPage] || 'upload'}
            onStepClick={handleStepClick}
          />
        )}

        {/* Main Split Content Panel */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Main Content Workspace Viewport */}
          <main className="flex-1 overflow-y-auto p-6 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="max-w-6xl mx-auto"
              >
                <Suspense fallback={
                  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-12 rounded-xl text-center text-xs text-[var(--text-muted)] font-medium">
                    <div className="animate-pulse flex flex-col items-center gap-3">
                      <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                      <span>Loading workbench module...</span>
                    </div>
                  </div>
                }>
                  {currentPage === 'dashboard' && (
                    <Dashboard
                      circulars={circulars}
                      obligationsCount={circulars.length > 0 ? 12 : 0} 
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

                  {/* Settings Page fallback stub */}
                  {currentPage === 'settings' && (
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-8 rounded-xl">
                      <h3 className="text-base font-bold mb-2">Platform Settings</h3>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        Workspace settings configuration dashboard is locked under security policies. No edits are allowed in simulation mode.
                      </p>
                    </div>
                  )}

                  {/* Help Center Page fallback stub */}
                  {currentPage === 'help' && (
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-8 rounded-xl">
                      <h3 className="text-base font-bold mb-2">Help Center</h3>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        Search knowledgebase or download user compliance guides for banking audits. Reference code: <b>RP-DOC-RBI-2026</b>.
                      </p>
                    </div>
                  )}

                  {/* About Page fallback stub */}
                  {currentPage === 'about' && (
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-8 rounded-xl">
                      <h3 className="text-base font-bold mb-2">About RegPulse</h3>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
                        AI-powered automated RBI notification analysis, comparison diff engine, and Jocata screening rule parameters alignment.
                      </p>
                      <span className="text-[10px] bg-[var(--bg-app)] border border-[var(--border-color)] px-2 py-1 rounded font-mono">
                        Build Hash: RP-99f38e-2026
                      </span>
                    </div>
                  )}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Right-aligned Collapsible AI Insights Panel */}
          <AnimatePresence>
            {isAIInsightsOpen && (
              <AIInsightsPanel
                currentPage={currentPage}
                isOpen={isAIInsightsOpen}
                onClose={() => setIsAIInsightsOpen(false)}
                circulars={circulars}
                mappings={mappings}
                activeDiffId={activeDiffId}
                geminiStatus={geminiStatus}
              />
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Global Command Palette Overlay Dialog */}
      <CommandPalette 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleNavigate}
        theme={theme}
        toggleTheme={toggleTheme}
        onRefreshHealth={checkHealth}
        circulars={circulars}
        mappings={mappings}
      />
    </div>
  );
}
