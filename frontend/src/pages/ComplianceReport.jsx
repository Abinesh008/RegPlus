import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Printer, 
  FileText, 
  Info, 
  Activity, 
  CheckSquare, 
  AlertCircle, 
  Download,
  Share2,
  Calendar,
  CheckCircle,
  Clock,
  User,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
  FileCheck,
  RefreshCw
} from 'lucide-react';
import api from '../services/api';
import EmptyState from '../components/EmptyState';

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

export default function ComplianceReport({
  circulars = [],
  oldCircularId,
  newCircularId,
  mappings = [],
  activeDiffId
}) {
  const [activeBriefTab, setActiveBriefTab] = useState('objective');
  const [signatureMaker, setSignatureMaker] = useState(true);
  const [signatureChecker, setSignatureChecker] = useState(false);
  const [signatureApprover, setSignatureApprover] = useState(false);

  const oldCircular = circulars.find(c => c.id === Number(oldCircularId));
  const newCircular = circulars.find(c => c.id === Number(newCircularId));
  const hasData = mappings.length > 0 && newCircular;

  const handlePrint = () => {
    window.print();
  };

  // Calculations
  const totalMappings = mappings.length;
  const reviewRequiredCount = mappings.filter(m => m.review_required).length;
  const aiGeneratedCount = mappings.filter(m => m.mapping_source?.toLowerCase() === 'gemini').length;
  const cachedCount = totalMappings - aiGeneratedCount;

  const affectedLayers = useMemo(() => {
    return Array.from(new Set(
      mappings.flatMap(m => Array.isArray(m.affected_business_layer) ? m.affected_business_layer : [])
    )).map(l => l.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()));
  }, [mappings]);

  const priorityCounts = useMemo(() => {
    return mappings.reduce((acc, curr) => {
      const p = curr.priority?.toLowerCase() || 'medium';
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, { critical: 0, high: 0, medium: 0, low: 0 });
  }, [mappings]);

  const topChanges = useMemo(() => {
    return [...mappings]
      .sort((a, b) => {
        const pMap = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = (pMap[b.priority?.toLowerCase()] || 0) - (pMap[a.priority?.toLowerCase()] || 0);
        if (priorityDiff !== 0) return priorityDiff;
        return (b.match_score || 0) - (a.match_score || 0);
      })
      .slice(0, 3);
  }, [mappings]);

  const avgConfidence = useMemo(() => {
    return totalMappings > 0 
      ? Math.round((mappings.reduce((sum, m) => sum + (m.match_score || 0), 0) / totalMappings) * 100)
      : 92;
  }, [mappings]);

  return (
    <div className="space-y-6 font-sans">
      
      {!hasData ? (
        <EmptyState
          title="No Mappings to Report"
          description="Complete the circular comparison and map rule impacts first to compile your compliance report."
          icon={FileText}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUMN 1: EXECUTIVE SUMMARY & BRIEF (LEFT PANEL - lg:col-span-3) - HIDE ON PRINT */}
          <div className="lg:col-span-3 space-y-4 no-print select-none">
            
            {/* KPI Cards Summary */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-xs space-y-3.5">
              <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider font-display border-b border-[var(--border-color)] pb-2">
                Compliance Metrics
              </h3>
              
              <div className="space-y-2 text-xs font-semibold">
                <div className="flex justify-between items-center text-[var(--text-muted)]">
                  <span>Reviewed Circulars</span>
                  <span className="text-[var(--text-main)]">{oldCircular ? '2 Versions' : '1 Version'}</span>
                </div>
                <div className="flex justify-between items-center text-[var(--text-muted)]">
                  <span>Impacted Rules</span>
                  <span className="text-[var(--text-main)]">{totalMappings} parameters</span>
                </div>
                <div className="flex justify-between items-center text-[var(--text-muted)]">
                  <span>Critical Findings</span>
                  <span className="text-red-500 font-bold">{priorityCounts.critical} items</span>
                </div>
                <div className="flex justify-between items-center text-[var(--text-muted)]">
                  <span>Audit Readiness</span>
                  <span className="text-emerald-500 font-bold">96% Score</span>
                </div>
                <div className="flex justify-between items-center text-[var(--text-muted)]">
                  <span>Avg AI Confidence</span>
                  <span className="text-blue-500 font-bold">{avgConfidence}%</span>
                </div>
              </div>
            </div>

            {/* Brief tabs selectors */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-xs space-y-3">
              <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-display">
                Executive Briefing
              </h4>
              
              <div className="flex flex-col gap-1.5 text-xs font-bold">
                <button 
                  onClick={() => setActiveBriefTab('objective')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors ${
                    activeBriefTab === 'objective' ? 'bg-blue-600 text-white' : 'hover:bg-[var(--bg-app)] text-[var(--text-muted)]'
                  }`}
                >
                  Regulatory Objective
                </button>
                <button 
                  onClick={() => setActiveBriefTab('impact')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors ${
                    activeBriefTab === 'impact' ? 'bg-blue-600 text-white' : 'hover:bg-[var(--bg-app)] text-[var(--text-muted)]'
                  }`}
                >
                  Operational Impact
                </button>
                <button 
                  onClick={() => setActiveBriefTab('decision')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors ${
                    activeBriefTab === 'decision' ? 'bg-blue-600 text-white' : 'hover:bg-[var(--bg-app)] text-[var(--text-muted)]'
                  }`}
                >
                  Executive Decision
                </button>
              </div>

              {/* Tab Content Display */}
              <div className="pt-2 text-[10.5px] leading-relaxed text-[var(--text-muted)] font-medium bg-[var(--bg-app)]/45 p-2.5 rounded-lg border border-[var(--border-color)]/30">
                {activeBriefTab === 'objective' && (
                  <p>Align systemic risk filters with RBI KYC Master Directions. Requires updating onboarding checkpoints and model risk tiers.</p>
                )}
                {activeBriefTab === 'impact' && (
                  <p>Operational review indicates KYC review cycles must decrease from 12 months to 6 months for high-risk accounts.</p>
                )}
                {activeBriefTab === 'decision' && (
                  <p>Advisory recommends promotion of mapped parameter weights to production staging for dry-run verification.</p>
                )}
              </div>
            </div>

          </div>

          {/* COLUMN 2: BOARD REPORT / COMPLIANCE ANALYTICS (CENTER PANEL - lg:col-span-6) */}
          <div className="lg:col-span-6 bg-white text-slate-900 border border-slate-200 p-8 rounded-xl shadow-md space-y-6 print:border-none print:shadow-none print:p-0">
            
            {/* Letterhead Header */}
            <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-end select-none">
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">REGPULSE AUDIT REPORT</h1>
                <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block mt-0.5">
                  Internal Governance & Systemic Compliance
                </span>
              </div>
              <div className="text-right text-[10px] text-slate-500 font-semibold leading-snug">
                <p>Date Compiled: {new Date().toLocaleDateString()}</p>
                <p>Status: CONFIDENTIAL</p>
              </div>
            </div>

            {/* Document metadata sheet */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 p-3.5 rounded-lg text-[10px] leading-relaxed font-semibold">
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Active Directive</span>
                <p className="font-extrabold text-slate-800 line-clamp-1">{newCircular.title}</p>
                <span className="text-slate-400 text-[9px] block font-medium mt-0.5 truncate">{newCircular.source_filename}</span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Baseline Reference</span>
                {oldCircular ? (
                  <>
                    <p className="font-extrabold text-slate-800 line-clamp-1">{oldCircular.title}</p>
                    <span className="text-slate-400 text-[9px] block font-medium mt-0.5 truncate">{oldCircular.source_filename}</span>
                  </>
                ) : (
                  <p className="text-slate-500 italic font-medium">Net new baseline regulation</p>
                )}
              </div>
            </div>

            {/* Risk heatmap matrix visualizer */}
            <div className="space-y-2 select-none">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1">
                Risk Heatmap Matrix
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center text-[9px] font-bold py-1">
                <div className="bg-red-500/10 text-red-650 p-2.5 rounded border border-red-200">
                  <span>Critical Risk</span>
                  <p className="text-lg mt-0.5 font-extrabold">{priorityCounts.critical}</p>
                </div>
                <div className="bg-amber-500/10 text-amber-600 p-2.5 rounded border border-amber-200">
                  <span>High Risk</span>
                  <p className="text-lg mt-0.5 font-extrabold">{priorityCounts.high}</p>
                </div>
                <div className="bg-emerald-500/10 text-emerald-600 p-2.5 rounded border border-emerald-200">
                  <span>Low Risk</span>
                  <p className="text-lg mt-0.5 font-extrabold">{priorityCounts.low}</p>
                </div>
              </div>
            </div>

            {/* High priority obligation listings */}
            <div className="space-y-3.5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1">
                Critical Obligations Analysis
              </h3>
              
              <div className="space-y-3">
                {topChanges.map((ch, idx) => (
                  <div key={idx} className="bg-slate-50/60 p-3.5 rounded border border-slate-200 text-[10px] space-y-2 leading-relaxed font-semibold">
                    <div className="flex justify-between items-center select-none">
                      <div className="flex gap-1.5 items-center">
                        <span className="font-extrabold text-slate-500">#{idx + 1}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                          ch.priority?.toLowerCase() === 'critical' 
                            ? 'bg-red-100 text-red-750 border border-red-200' 
                            : 'bg-amber-100 text-amber-750 border border-amber-200'
                        }`}>
                          {ch.priority} Priority
                        </span>
                      </div>
                      <span className="text-slate-400 font-medium">Confidence: {ch.confidence}</span>
                    </div>

                    <p className="text-slate-800 leading-normal font-bold italic">"{ch.obligation}"</p>
                    
                    <div className="pt-2 grid grid-cols-2 gap-3 text-[9px] border-t border-slate-200/50">
                      <div>
                        <span className="text-slate-500 block">Matched Parameter:</span>
                        <ul className="list-disc list-inside text-slate-700 mt-1 font-bold">
                          {ch.matched_parameters?.map(p => (
                            <li key={p}>{TAXONOMY_MAP[p] || p}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="text-slate-500 block">AI Justification:</span>
                        <p className="text-slate-750 mt-1">{ch.reasoning}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Signature sign-off blocks */}
            <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-6 text-[10px] font-bold text-slate-500 select-none">
              <div className="space-y-3">
                <p>Maker: Aditya Nair (Validation Lead)</p>
                <div className="h-8 border-b border-slate-300 w-40 flex items-center pl-2">
                  {signatureMaker && <span className="font-mono text-emerald-600 font-bold">APPROVED (DIGITAL SIG)</span>}
                </div>
              </div>
              <div className="space-y-3">
                <p>Approver: Chief Risk Officer (Sign-off)</p>
                <div className="h-8 border-b border-slate-300 w-40 flex items-center pl-2">
                  {signatureApprover ? (
                    <span className="font-mono text-emerald-600 font-bold">APPROVED (DIGITAL SIG)</span>
                  ) : (
                    <span className="text-slate-400 italic">Signature Pending</span>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* COLUMN 3: APPROVAL TIMELINE & ACTIONS (RIGHT PANEL - lg:col-span-3) - HIDE ON PRINT */}
          <div className="lg:col-span-3 space-y-4 no-print select-none">
            
            {/* Action Center - Exports */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-xs space-y-3.5">
              <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider font-display">
                Action Center
              </h3>
              
              <div className="space-y-2">
                <button
                  onClick={handlePrint}
                  className="w-full py-2 bg-[var(--bg-hover)] border border-[var(--border-color)] hover:bg-[var(--border-color)] text-[var(--text-main)] rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print layout
                </button>
                
                <a
                  href={`http://localhost:8000/diff/${activeDiffId}/export/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs flex items-center justify-center gap-1.5"
                  style={{ textDecoration: 'none', display: 'flex' }}
                >
                  <Download className="w-3.5 h-3.5" /> Export PDF Report
                </a>

                <a
                  href={`http://localhost:8000/diff/${activeDiffId}/export/csv`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs flex items-center justify-center gap-1.5"
                  style={{ textDecoration: 'none', display: 'flex' }}
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV Data
                </a>
              </div>
            </div>

            {/* Maker-Checker Workflow Timelines */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-xs space-y-3.5">
              <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider font-display">
                Approval workflow
              </h3>

              <div className="relative pl-3 border-l border-slate-100 dark:border-slate-800 space-y-4 text-[9px] font-semibold text-[var(--text-muted)] py-1">
                <div className="relative">
                  <span className="absolute -left-[16.5px] top-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-[var(--bg-card)] shadow-xs" />
                  <span className="block text-[var(--text-main)]">Maker Signed-off</span>
                  <span className="block text-slate-400 mt-0.5">Aditya Nair (Validation Lead)</span>
                </div>
                <div className="relative">
                  <span className={`absolute -left-[16.5px] top-0.5 w-2.5 h-2.5 rounded-full border border-[var(--bg-card)] shadow-xs ${
                    signatureApprover ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-850'
                  }`} />
                  <span className="block text-[var(--text-main)]">Chief Approver Sign-off</span>
                  <span className="block text-slate-400 mt-0.5">Staging promo validation</span>
                </div>
              </div>

              {/* Action signature triggers */}
              {!signatureApprover && (
                <button
                  onClick={() => setSignatureApprover(true)}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-bold cursor-pointer transition-colors shadow-xs"
                >
                  Sign-off Report (Approver)
                </button>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
