import React from 'react';
import { FiPrinter, FiFileText, FiInfo, FiActivity, FiCheckSquare, FiAlertCircle } from 'react-icons/fi';
import EmptyState from '../components/EmptyState';

// Map parameter IDs to readable labels
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
  mappings = []
}) {

  const oldCircular = circulars.find(c => c.id === Number(oldCircularId));
  const newCircular = circulars.find(c => c.id === Number(newCircularId));

  // If no mappings loaded
  const hasData = mappings.length > 0 && newCircular;

  // Print Action
  const handlePrint = () => {
    window.print();
  };

  // Generate Executive Summary Stats
  const totalMappings = mappings.length;
  
  // Total parameters requiring review
  const reviewRequiredCount = mappings.filter(m => m.review_required).length;

  // AI-generated vs Cached
  const aiGeneratedCount = mappings.filter(m => m.mapping_source?.toLowerCase() === 'gemini').length;
  const cachedCount = mappings.filter(m => m.mapping_source?.toLowerCase() === 'database_cache' || m.mapping_source?.toLowerCase() === 'mock').length;

  // Unique affected business layers
  const affectedLayers = Array.from(new Set(
    mappings.flatMap(m => Array.isArray(m.affected_business_layer) ? m.affected_business_layer : [])
  )).map(l => l.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()));

  // Priority counts
  const priorityCounts = mappings.reduce((acc, curr) => {
    const p = curr.priority?.toLowerCase() || 'medium';
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, { critical: 0, high: 0, medium: 0, low: 0 });

  // Top 5 High Priority Changes
  const topChanges = [...mappings]
    .sort((a, b) => {
      const pMap = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = (pMap[b.priority?.toLowerCase()] || 0) - (pMap[a.priority?.toLowerCase()] || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return (b.match_score || 0) - (a.match_score || 0);
    })
    .slice(0, 5);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      
      {/* Report Controls */}
      {hasData && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-sm flex justify-between items-center no-print">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-medium">
            <FiInfo className="text-primary w-4.5 h-4.5" />
            Use your browser print utility to export this layout as a PDF.
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
            >
              <FiPrinter /> Print / Export PDF
            </button>
          </div>
        </div>
      )}

      {!hasData ? (
        <EmptyState
          title="No Mappings to Report"
          description="Complete the circular comparison and map rule impacts first to compile your compliance report."
          icon={FiFileText}
        />
      ) : (
        <div className="bg-white text-slate-900 border border-slate-200 p-8 rounded-xl shadow-md space-y-8 print:border-none print:shadow-none print:p-0">
          
          {/* Letterhead Header */}
          <div className="border-b-2 border-primary pb-5 flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-bold text-primary tracking-tight">REGPULSE COMPLIANCE REPORT</h1>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Internal Risk Advisory & Assessment
              </span>
            </div>
            <div className="text-right text-xs text-slate-500 font-medium space-y-0.5">
              <p><span className="font-bold text-slate-700">Date Compiled:</span> {new Date().toLocaleDateString()}</p>
              <p><span className="font-bold text-slate-700">Classification:</span> Internal Bank Confidential</p>
            </div>
          </div>

          {/* Metadata Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 border border-slate-200 p-4 rounded-lg text-xs leading-relaxed print-card">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Target Regulation (New)</span>
              <p className="font-bold text-primary leading-tight">{newCircular.title}</p>
              <p className="text-[10.5px] text-slate-500 mt-1"><span className="font-semibold text-slate-700">Source:</span> {newCircular.source_filename} | <span className="font-semibold text-slate-700">Date:</span> {newCircular.version_date || 'N/A'}</p>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Baseline Reference (Old)</span>
              {oldCircular ? (
                <>
                  <p className="font-bold text-slate-750 leading-tight">{oldCircular.title}</p>
                  <p className="text-[10.5px] text-slate-500 mt-1"><span className="font-semibold text-slate-700">Source:</span> {oldCircular.source_filename} | <span className="font-semibold text-slate-700">Date:</span> {oldCircular.version_date || 'N/A'}</p>
                </>
              ) : (
                <p className="text-slate-500 font-semibold italic">No baseline document selected (Net New assessment)</p>
              )}
            </div>
          </div>

          {/* Executive Summary Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-primary border-b border-slate-200 pb-1.5 uppercase tracking-wide">
              I. Executive Summary
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              This advisory outlines the configuration adjustments required in the bank's automated decision systems in response to the RBI circular guidelines. 
              A total of <span className="font-bold text-primary">{totalMappings}</span> obligations require structural configuration review. 
              Out of these, <span className="font-bold text-amber-600">{reviewRequiredCount}</span> parameter mappings have been flagged as requiring manual oversight and risk verification before promotion to production systems.
            </p>

            {/* Metrics Sub-table */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center print-card">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Parameters for Review</span>
                <p className="text-xl font-bold text-amber-600 mt-1">{reviewRequiredCount}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center print-card">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Critical Priorities</span>
                <p className="text-xl font-bold text-red-650 mt-1">{priorityCounts.critical}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center print-card">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">AI-Generated Mappings</span>
                <p className="text-xl font-bold text-indigo-600 mt-1">{aiGeneratedCount}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center print-card">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Cached/Mock Matches</span>
                <p className="text-xl font-bold text-slate-650 mt-1">{cachedCount}</p>
              </div>
            </div>

            <div className="text-xs text-slate-750 font-medium space-y-1.5 pt-1.5">
              <p><span className="font-bold text-slate-800">Affected Business Layers:</span> {affectedLayers.join(', ') || 'None identified'}</p>
            </div>
          </div>

          {/* Top 5 High Priority Changes */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-primary border-b border-slate-200 pb-1.5 uppercase tracking-wide">
              II. High Priority Compliance Obligations
            </h3>
            
            <div className="space-y-3">
              {topChanges.map((ch, idx) => (
                <div key={idx} className="bg-slate-50/70 p-3.5 rounded border border-slate-200 text-xs space-y-2 print-card">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2 items-center">
                      <span className="font-bold text-slate-700">#{idx + 1}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        ch.priority?.toLowerCase() === 'critical' 
                          ? 'bg-red-100 text-red-750 border border-red-200'
                          : 'bg-amber-100 text-amber-750 border border-amber-200'
                      }`}>
                        {ch.priority} Priority
                      </span>
                    </div>
                    <span className="text-slate-500 font-semibold text-[10.5px]">
                      Match Confidence: <span className="font-bold text-primary">{ch.confidence}</span>
                    </span>
                  </div>
                  
                  <p className="font-semibold text-slate-850 leading-relaxed italic">
                    "{ch.obligation}"
                  </p>
                  
                  <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] leading-relaxed border-t border-slate-200/50">
                    <div>
                      <span className="font-bold text-slate-800 block">Matched Parameters:</span>
                      <ul className="list-disc list-inside text-slate-600 mt-1 font-medium">
                        {ch.matched_parameters?.map(p => (
                          <li key={p}>{TAXONOMY_MAP[p] || p} ({p})</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block">Justification Reasoning:</span>
                      <p className="text-slate-600 mt-1 font-medium leading-relaxed">{ch.reasoning}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Signature/Sign-off Footer */}
          <div className="pt-12 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs font-semibold select-none leading-relaxed text-slate-600">
            <div className="space-y-4">
              <p>Risk & Compliance Validation Lead</p>
              <div className="h-10 border-b border-slate-300 w-48" />
              <p className="text-slate-400 font-medium">Signature / Date</p>
            </div>
            <div className="space-y-4">
              <p>Independent Model Validation Head</p>
              <div className="h-10 border-b border-slate-300 w-48" />
              <p className="text-slate-400 font-medium">Signature / Date</p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
