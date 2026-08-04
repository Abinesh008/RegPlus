import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, HelpCircle } from 'lucide-react';

export default function Login() {
  const { login, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setInfoMessage('');
    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (!res.success) {
      setLocalError(res.error || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setLocalError('');
    setInfoMessage('');
    if (!email) {
      setLocalError('Please enter your email to request password reset.');
      return;
    }
    setInfoMessage(`Instructions sent to ${email}. (Simulation Mode)`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 font-sans p-6">
      <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
        
        {/* Banner header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 mb-2">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight font-display">
            REGPULSE ENTERPRISE
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Regulatory Compliance Gate
          </p>
        </div>

        {/* Error notification banner */}
        {(localError || authError) && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-semibold leading-relaxed flex items-start gap-2 animate-pulse">
            <span>⚠️</span>
            <p>{localError || authError}</p>
          </div>
        )}

        {/* Success / Info notification banner */}
        {infoMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs font-semibold leading-relaxed flex items-start gap-2">
            <span>ℹ️</span>
            <p>{infoMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email field */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Business Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1">
            <div className="flex justify-between items-center select-none">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Security Password
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[10px] font-bold text-blue-500 hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          {/* Remember me toggle */}
          <div className="flex items-center select-none">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-slate-800 text-blue-600 focus:ring-0 w-4 h-4 bg-slate-900 cursor-pointer"
            />
            <label htmlFor="remember" className="ml-2 text-xs font-bold text-slate-400 cursor-pointer">
              Remember my workstation session
            </label>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-lg disabled:opacity-50"
          >
            {loading ? 'Verifying Credentials...' : 'Secure Sign In'}
          </button>
        </form>

        <div className="border-t border-slate-800/70 pt-4 text-center">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            Audit Log ID: gate-auth-2026
          </p>
        </div>

      </div>
    </div>
  );
}
