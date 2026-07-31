import React from 'react';
import { FiUpload, FiCpu, FiTrendingUp, FiFileText } from 'react-icons/fi';
import { LuGitCompare } from 'react-icons/lu';

const steps = [
  { id: 'upload', label: 'Upload Circular', icon: FiUpload },
  { id: 'extract', label: 'Extract Obligations', icon: FiCpu },
  { id: 'compare', label: 'Compare Circulars', icon: LuGitCompare },
  { id: 'map', label: 'Map Rule Impact', icon: FiTrendingUp },
  { id: 'report', label: 'Compliance Report', icon: FiFileText },
];

export default function WorkflowTracker({ currentStep, onStepClick }) {
  const getStepIndex = (stepId) => steps.findIndex(s => s.id === stepId);
  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="w-full bg-[var(--bg-card)] border-b border-[var(--border-color)] px-6 py-4 no-print">
      <div className="max-w-5xl mx-auto flex items-center justify-between relative">
        {/* Background Line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 dark:bg-slate-700 -translate-y-1/2 z-0" />
        
        {/* Active Progress Line */}
        <div 
          className="absolute top-1/2 left-0 h-0.5 bg-[var(--color-accent)] -translate-y-1/2 z-0 transition-all duration-300"
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = idx < currentIndex;
          const isActive = idx === currentIndex;
          
          return (
            <button
              key={step.id}
              onClick={() => onStepClick && onStepClick(step.id)}
              className="flex flex-col items-center relative z-10 focus:outline-none group cursor-pointer"
            >
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                  isActive 
                    ? 'bg-primary border-primary text-white scale-110 shadow-md shadow-primary/20' 
                    : isCompleted
                      ? 'bg-accent border-accent text-white'
                      : 'bg-[var(--bg-card)] border-gray-300 dark:border-slate-600 text-[var(--text-muted)] group-hover:border-primary group-hover:text-primary'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span 
                className={`mt-2 text-xs font-semibold tracking-wide transition-colors duration-200 ${
                  isActive 
                    ? 'text-primary' 
                    : isCompleted
                      ? 'text-accent'
                      : 'text-[var(--text-muted)] group-hover:text-primary'
                }`}
              >
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
