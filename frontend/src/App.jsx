import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Upload, 
  Activity, 
  FileText, 
  Settings, 
  ArrowRight, 
  RefreshCw,
  AlertCircle, 
  CheckCircle,
  FileCode
} from 'lucide-react';

export default function App() {
  const [backendStatus, setBackendStatus] = useState('checking');
  const [circulars, setCirculars] = useState([]);
  const [loadingCirculars, setLoadingCirculars] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [activeTab, setActiveTab] = useState('circulars');

  const API_BASE = 'http://localhost:8000';

  const checkHealth = async () => {
    try {
      setBackendStatus('checking');
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK') {
          setBackendStatus('connected');
        } else {
          setBackendStatus('error');
        }
      } else {
        setBackendStatus('error');
      }
    } catch (e) {
      setBackendStatus('error');
    }
  };

  const fetchCirculars = async () => {
    setLoadingCirculars(true);
    try {
      const res = await fetch(`${API_BASE}/circulars`);
      if (res.ok) {
        const data = await res.json();
        setCirculars(data);
      }
    } catch (e) {
      console.error('Error fetching circulars', e);
    } finally {
      setLoadingCirculars(false);
    }
  };

  useEffect(() => {
    checkHealth();
    fetchCirculars();
  }, []);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploadStatus('uploading');
    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const res = await fetch(`${API_BASE}/circulars/upload`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        // Since Prompt 1 upload endpoint is a stub, this will return "Not Implemented Yet"
        setUploadStatus(`Result: ${data}`);
      } else {
        setUploadStatus('Upload failed. Check console.');
      }
    } catch (e) {
      setUploadStatus('Upload failed. Connection error.');
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header animate-fade-in">
        <div className="brand">
          <Shield size={32} className="brand-logo" style={{ stroke: 'url(#brand-grad)' }} />
          <svg width="0" height="0">
            <linearGradient id="brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
          </svg>
          <div>
            <h1>RegPulse</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>RBI Circular Impact Simulator</p>
          </div>
        </div>
        
        {/* Backend Status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '0.5rem', borderRadius: '50%' }}
            onClick={() => { checkHealth(); fetchCirculars(); }}
            title="Refresh status"
          >
            <RefreshCw size={16} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={16} style={{ color: backendStatus === 'connected' ? 'var(--color-success)' : backendStatus === 'checking' ? 'var(--color-warning)' : 'var(--color-error)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
              Backend: {backendStatus === 'connected' ? (
                <span style={{ color: 'var(--color-success)' }}>Connected</span>
              ) : backendStatus === 'checking' ? (
                <span style={{ color: 'var(--color-warning)' }}>Checking...</span>
              ) : (
                <span style={{ color: 'var(--color-error)' }}>Disconnected</span>
              )}
            </span>
          </div>
          <span className="badge">v1.0.0 Foundation</span>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid">
        {/* Left Side: Upload & Library (8 cols) */}
        <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Uploader Card */}
          <div className="card animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h3 className="card-title"><Upload size={20} style={{ color: 'var(--color-primary)' }} /> Upload Circular (Stub Preview)</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Select a regulatory document PDF. Prompt 1 exposes a stub handler which returns the status of this operation.
            </p>
            
            <form onSubmit={handleUploadSubmit}>
              <div 
                style={{ 
                  border: '2px dashed var(--border-color)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '2.5rem', 
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  transition: 'var(--transition-smooth)',
                  marginBottom: '1rem'
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                <input 
                  type="file" 
                  id="circularFile" 
                  accept=".pdf,.docx" 
                  style={{ display: 'none' }}
                  onChange={(e) => setUploadFile(e.target.files[0])}
                />
                <label htmlFor="circularFile" style={{ cursor: 'pointer', display: 'block' }}>
                  <FileText size={48} style={{ color: 'var(--text-dark)', marginBottom: '0.75rem' }} />
                  <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {uploadFile ? uploadFile.name : 'Click to select files'}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Supports PDF or DOCX format (Max 10MB)
                  </p>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 500 }}>
                  {uploadStatus}
                </span>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={!uploadFile || uploadStatus === 'uploading'}
                >
                  Process Upload <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>

          {/* Library Card */}
          <div className="card animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h3 className="card-title"><FileText size={20} style={{ color: 'var(--color-secondary)' }} /> Document Library</h3>
            
            {loadingCirculars ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading documents...</p>
            ) : circulars.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                <AlertCircle size={36} style={{ color: 'var(--text-dark)', marginBottom: '0.75rem' }} />
                <p>No circulars uploaded yet.</p>
                <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>They will display here once stored in the database.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {circulars.map((c) => (
                  <div 
                    key={c.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-color)',
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: '1rem' }}>{c.title}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Date: {c.version_date} | Filename: {c.source_filename}</p>
                    </div>
                    <span className="badge badge-green">Processed</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Side: Showcase Preview (4 cols) */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Rule engine configuration preview showcase */}
          <div className="card animate-fade-in" style={{ animationDelay: '0.3s', flex: 1 }}>
            <h3 className="card-title"><Settings size={20} style={{ color: 'var(--color-warning)' }} /> Rule Taxonomy Parameters</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              The simulator features a mock rule engine parameter taxonomy consisting of 13 system keys. 
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <span className="badge" style={{ marginBottom: '0.25rem' }}>onboarding</span>
                <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>kyc_risk_weight</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer KYC Risk Weighting Formula</p>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <span className="badge" style={{ marginBottom: '0.25rem' }}>onboarding</span>
                <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>kyc_review_frequency</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Periodic KYC Review Frequency (per risk tier)</p>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <span className="badge" style={{ marginBottom: '0.25rem' }}>transaction_monitoring</span>
                <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>aml_txn_threshold</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AML Transaction Monitoring Alert Thresholds</p>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <span className="badge" style={{ marginBottom: '0.25rem' }}>governance</span>
                <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>model_validation_cycle</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Independent Model Validation Cycle</p>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <span className="badge" style={{ marginBottom: '0.25rem' }}>reporting</span>
                <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>suspicious_activity_reporting_sla</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Suspicious Activity Report (SAR) Filing SLA</p>
              </div>
            </div>
            
            <div style={{ marginTop: '1.25rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.1)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <FileCode size={32} style={{ color: 'var(--color-primary)' }} />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Taxonomy configurations are securely hardcoded in the <code style={{ color: 'white' }}>rule_taxonomy.json</code> file.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
