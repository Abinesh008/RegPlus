import React from 'react';
import { motion } from 'framer-motion';
import { 
  UploadCloud, 
  BrainCircuit, 
  GitCompare, 
  Sliders, 
  FileCheck,
  Check
} from 'lucide-react';

const steps = [
  { id: 'upload', label: 'Ingest Circular', icon: UploadCloud },
  { id: 'extract', label: 'Extract Obligations', icon: BrainCircuit },
  { id: 'compare', label: 'Compare Versions', icon: GitCompare },
  { id: 'map', label: 'Map Rule Impact', icon: Sliders },
  { id: 'report', label: 'Advisory Report', icon: FileCheck },
];

export default function WorkflowTracker({ currentStep, onStepClick }) {
  const getStepIndex = (stepId) => steps.findIndex(s => s.id === stepId);
  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="w-full bg-[var(--bg-card)] border-b border-[var(--border-color)] px-6 py-4.5 no-print select-none font-sans shrink-0">
      <div className="max-w-4xl mx-auto flex items-center justify-between relative">
        
        {/* Background Track Line */}
        <div className="absolute top-5 left-4 right-4 h-0.75 bg-slate-100 dark:bg-slate-800 rounded-full z-0" />
        
        {/* Active Progress Line */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="absolute top-5 left-4 h-0.75 bg-blue-600 rounded-full z-0"
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
              {/* Stepper Node Icon */}
              <motion.div 
                animate={{ 
                  scale: isActive ? 1.08 : 1,
                  boxShadow: isActive ? '0 0 12px rgba(37, 99, 235, 0.25)' : 'none'
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 border-2 ${
                  isActive 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : isCompleted
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-[var(--bg-card)] border-slate-200 dark:border-slate-800 text-[var(--text-muted)] group-hover:border-blue-500 group-hover:text-blue-500'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4.5 h-4.5 font-bold" />
                ) : (
                  <Icon className="w-4.5 h-4.5" />
                )}
              </motion.div>
              
              {/* Step Label */}
              <span 
                className={`mt-2.5 text-[10px] font-bold tracking-wider uppercase font-display transition-colors duration-200 ${
                  isActive 
                    ? 'text-blue-600' 
                    : isCompleted
                      ? 'text-slate-500 dark:text-slate-400'
                      : 'text-[var(--text-muted)] group-hover:text-blue-500'
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
