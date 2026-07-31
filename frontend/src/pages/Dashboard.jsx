import React from 'react';
import { 
  FiFileText, 
  FiEye, 
  FiCheckSquare, 
  FiAlertTriangle, 
  FiTrendingUp,
  FiClock,
  FiActivity
} from 'react-icons/fi';
import { LuGitCompare } from 'react-icons/lu';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';
import KPICard from '../components/KPICard';
import APIStatusPanel from '../components/APIStatusPanel';

export default function Dashboard({ 
  circulars = [], 
  obligationsCount = 0,
  diffCount = 0,
  mappings = [],
  backendStatus,
  geminiStatus,
  lastProcessedTime,
  onNavigate
}) {
  
  // Compute pending reviews and high priority changes
  const pendingReviewCount = mappings.filter(m => m.review_required).length;
  const highPriorityCount = mappings.filter(m => 
    m.priority?.toLowerCase() === 'critical' || m.priority?.toLowerCase() === 'high'
  ).length;

  // Recharts: Priority Breakdown
  const priorityCounts = mappings.reduce((acc, curr) => {
    const p = curr.priority || 'medium';
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});

  const priorityData = [
    { name: 'Critical', value: priorityCounts.critical || 0, color: '#DC2626' },
    { name: 'High', value: priorityCounts.high || 0, color: '#F59E0B' },
    { name: 'Medium', value: priorityCounts.medium || 0, color: '#1F4E79' },
    { name: 'Low', value: priorityCounts.low || 0, color: '#16A34A' },
  ].filter(d => d.value > 0);

  // Recharts: Affected Business Layers
  const layerCounts = mappings.reduce((acc, curr) => {
    if (Array.isArray(curr.affected_business_layer)) {
      curr.affected_business_layer.forEach(l => {
        acc[l] = (acc[l] || 0) + 1;
      });
    }
    return acc;
  }, {});

  const layerData = Object.keys(layerCounts).map(layer => ({
    name: layer.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
    count: layerCounts[layer]
  }));

  // Dummy data if empty
  const defaultPriorityData = [
    { name: 'Critical', value: 2, color: '#DC2626' },
    { name: 'High', value: 4, color: '#F59E0B' },
    { name: 'Medium', value: 8, color: '#1F4E79' },
    { name: 'Low', value: 5, color: '#16A34A' },
  ];

  const defaultLayerData = [
    { name: 'Onboarding', count: 6 },
    { name: 'Governance', count: 8 },
    { name: 'Reporting', count: 3 },
    { name: 'Screening', count: 4 },
  ];

  const finalPriorityData = priorityData.length > 0 ? priorityData : defaultPriorityData;
  const finalLayerData = layerData.length > 0 ? layerData : defaultLayerData;

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <KPICard 
          title="Uploaded Circulars" 
          value={circulars.length} 
          icon={FiFileText}
          description="Regulatory PDFs stored in DB"
        />
        <KPICard 
          title="Extracted Obligations" 
          value={obligationsCount} 
          icon={FiEye}
          description="Compliance items parsed"
        />
        <KPICard 
          title="Diff Sessions" 
          value={diffCount} 
          icon={LuGitCompare}
          description="Circular comparisons completed"
        />
        <KPICard 
          title="Rule Mappings" 
          value={mappings.length} 
          icon={FiTrendingUp}
          description="Obligation parameter mappings"
        />
        <KPICard 
          title="Pending Review" 
          value={pendingReviewCount} 
          icon={FiCheckSquare}
          description="Awaiting manual verification"
          trend={pendingReviewCount > 0 ? `${pendingReviewCount} Action items` : 'All clear'}
          trendColor={pendingReviewCount > 0 ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'}
        />
        <KPICard 
          title="High Priority Changes" 
          value={highPriorityCount} 
          icon={FiAlertTriangle}
          description="Critical / High risk rule modifications"
          trend={highPriorityCount > 0 ? 'Requires attention' : 'No warnings'}
          trendColor={highPriorityCount > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}
        />
      </div>

      {/* Main Grid: Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Priority breakdown chart */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-xl shadow-sm">
          <h3 className="text-sm font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
            <FiActivity className="text-primary w-4.5 h-4.5" />
            Compliance Metrics Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Priority Pie Chart */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-semibold text-[var(--text-muted)] mb-2">Priority distribution</span>
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={finalPriorityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {finalPriorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: '11px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }} />
                    <Legend verticalAlign="bottom" height={24} iconSize={10} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Business Layer Bar Chart */}
            <div className="flex flex-col items-center">
              <span className="text-xs font-semibold text-[var(--text-muted)] mb-2">Business Layer impact count</span>
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={finalLayerData}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(0,163,163,0.05)' }} contentStyle={{ fontSize: '11px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }} />
                    <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* System status widget */}
        <div>
          <APIStatusPanel 
            backendStatus={backendStatus} 
            geminiStatus={geminiStatus}
            lastProcessedTime={lastProcessedTime}
          />
        </div>
      </div>

      {/* Recent activity & Library list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-xl shadow-sm">
          <h3 className="text-sm font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
            <FiClock className="text-accent w-4.5 h-4.5" />
            Audit Logging & Recent Activity
          </h3>
          <div className="space-y-4">
            {circulars.slice(0, 3).map((c, idx) => (
              <div key={idx} className="flex gap-4 items-start text-xs border-l-2 border-primary/30 pl-4 py-0.5">
                <span className="text-[var(--text-muted)] whitespace-nowrap min-w-16">
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
                <div>
                  <p className="font-semibold text-[var(--text-main)]">
                    Extracted obligations from circular
                  </p>
                  <p className="text-[var(--text-muted)] mt-0.5">
                    "{c.title}" ({c.source_filename})
                  </p>
                </div>
              </div>
            ))}
            
            {circulars.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] py-4 text-center">
                No compliance activities logged yet. Upload a circular to get started.
              </p>
            )}
          </div>
        </div>

        {/* Quick Start Actions */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-main)] mb-3 flex items-center gap-2">
              <FiTrendingUp className="text-accent w-4.5 h-4.5" />
              Quick Compliance Actions
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
              Begin your audit simulation workflow by uploading a document, comparing it to an older version, and reviewing policy parameter impacts.
            </p>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => onNavigate('library')}
              className="w-full text-center py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
            >
              Upload New Circular
            </button>
            <button
              onClick={() => onNavigate('comparison')}
              className="w-full text-center py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-[var(--text-main)] text-xs font-bold rounded-lg cursor-pointer transition-colors border border-[var(--border-color)]"
            >
              Compare Version Diff
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
