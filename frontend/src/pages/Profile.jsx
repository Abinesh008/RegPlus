import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { User, Shield, KeyRound, Building, CheckCircle2, Clock } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setLoading(true);
    const res = await api.changePassword(oldPassword, newPassword);
    setLoading(false);
    if (res.success) {
      setSuccess('Your password has been successfully updated.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setError(res.error || 'Failed to update password.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* COLUMN 1: USER DETAILS */}
      <div className="lg:col-span-4 bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-xl shadow-xs space-y-6 select-none">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center">
            <User className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[var(--text-main)]">{user?.name}</h3>
          <p className="text-xs text-[var(--text-muted)] font-semibold truncate max-w-full">{user?.email}</p>
        </div>

        <div className="space-y-4 text-xs font-semibold text-[var(--text-muted)] pt-4 border-t border-[var(--border-color)]/50">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" />
            <div>
              <span className="block text-[10px] text-slate-400 uppercase">Assigned Role</span>
              <span className="text-[var(--text-main)] font-bold">{user?.role}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-500" />
            <div>
              <span className="block text-[10px] text-slate-400 uppercase">Department</span>
              <span className="text-[var(--text-main)] font-bold">{user?.department || 'N/A'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <div>
              <span className="block text-[10px] text-slate-400 uppercase">Last Workstation Sign-in</span>
              <span className="text-[var(--text-main)] font-bold">{user?.last_login ? new Date(user.last_login).toLocaleString() : 'Just now'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* COLUMN 2: SECURITY SETTINGS */}
      <div className="lg:col-span-8 bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-xl shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider font-display border-b border-[var(--border-color)] pb-2 flex items-center gap-1.5 select-none">
          <KeyRound className="w-4.5 h-4.5 text-blue-500" /> Update Password Settings
        </h3>

        {/* Info alerts */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-xs font-bold leading-relaxed">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 p-4 rounded-xl text-xs font-bold leading-relaxed flex items-center gap-1.5 select-none">
            <CheckCircle2 className="w-4.5 h-4.5" /> {success}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Current Password</label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg p-2 text-xs focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 12 chars, upper/lower/digits/special..."
                className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg p-2 text-xs focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg p-2 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
            >
              {loading ? 'Updating Password...' : 'Update Password Credentials'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
