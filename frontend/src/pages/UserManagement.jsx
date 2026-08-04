import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  UserPlus, 
  Trash2, 
  Edit3, 
  Search, 
  Sliders, 
  UserCheck, 
  UserMinus, 
  ShieldAlert,
  Loader2,
  Lock
} from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('Auditor');
  const [formDept, setFormDept] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    const res = await api.listUsers(search, roleFilter);
    if (res.success) {
      setUsers(res.data || []);
    } else {
      setError(res.error || 'Failed to fetch user list');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, [search, roleFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!formName || !formEmail || !formPassword) {
      setError('Please fill in all required fields.');
      return;
    }
    const res = await api.createUser({
      name: formName,
      email: formEmail,
      password: formPassword,
      role: formRole,
      department: formDept
    });
    if (res.success) {
      setShowCreateModal(false);
      resetForm();
      loadUsers();
    } else {
      setError(res.error);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    const res = await api.updateUser(editingUser.id, {
      name: formName,
      role: formRole,
      department: formDept
    });
    if (res.success) {
      setShowEditModal(false);
      resetForm();
      loadUsers();
    } else {
      setError(res.error);
    }
  };

  const handleToggleActive = async (user) => {
    setError('');
    const res = await api.updateUser(user.id, {
      is_active: !user.is_active
    });
    if (res.success) {
      loadUsers();
    } else {
      setError(res.error);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    setError('');
    const res = await api.deleteUser(userId);
    if (res.success) {
      loadUsers();
    } else {
      setError(res.error);
    }
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormRole(user.role);
    setFormDept(user.department || '');
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('Auditor');
    setFormDept('');
    setEditingUser(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex justify-between items-center select-none">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-main)]">User Accounts Directory</h2>
          <p className="text-xs text-[var(--text-muted)]">Configure administrative access, roles, and audit trail logins.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreateModal(true); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <UserPlus className="w-4 h-4" /> Add Compliance Account
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-xs font-bold leading-relaxed">
          {error}
        </div>
      )}

      {/* Toolbar Search / Filter */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 select-none">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none"
          />
        </div>
        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs focus:outline-none text-[var(--text-main)] font-semibold"
          >
            <option value="">All Roles</option>
            <option value="Super Admin">Super Admin</option>
            <option value="Compliance Manager">Compliance Manager</option>
            <option value="Compliance Analyst">Compliance Analyst</option>
            <option value="Auditor">Auditor</option>
          </select>
        </div>
        <div className="flex justify-end items-center text-xs text-[var(--text-muted)] font-semibold">
          Total Users: {users.length}
        </div>
      </div>

      {/* Users table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-[var(--text-muted)] flex justify-center items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" /> Listing accounts...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-xs text-[var(--text-muted)]">
            No registered compliance accounts found matching selected queries.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)] font-bold text-[var(--text-muted)] select-none">
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Last Login</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/50 font-medium">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--bg-app)]/30 text-[var(--text-main)]">
                    <td className="p-4 font-bold">{u.name}</td>
                    <td className="p-4 font-semibold text-[var(--text-muted)]">{u.email}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.role === 'Super Admin' ? 'bg-red-500/10 text-red-500' :
                        u.role === 'Compliance Manager' ? 'bg-blue-500/10 text-blue-500' :
                        u.role === 'Compliance Analyst' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-slate-100 text-slate-500 dark:bg-slate-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">{u.department || 'N/A'}</td>
                    <td className="p-4 text-[var(--text-muted)]">{u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-1.5">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-1 hover:bg-[var(--bg-app)] rounded text-blue-500 cursor-pointer"
                        title="Edit details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`p-1 hover:bg-[var(--bg-app)] rounded cursor-pointer ${u.is_active ? 'text-amber-500' : 'text-emerald-500'}`}
                        title={u.is_active ? 'Suspend account' : 'Reactivate account'}
                      >
                        {u.is_active ? <UserMinus className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="p-1 hover:bg-[var(--bg-app)] rounded text-red-500 cursor-pointer"
                        title="Delete account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-[var(--text-main)]">Add Compliance Account</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Full Name</label>
                <input type="text" required value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg p-2 text-xs focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Email Address</label>
                <input type="email" required value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg p-2 text-xs focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Initial Password</label>
                <input type="password" required value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Minimum 12 characters..." className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg p-2 text-xs focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Assign Role</label>
                  <select value={formRole} onChange={(e) => setFormRole(e.target.value)} className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg p-2 text-xs focus:outline-none font-semibold text-[var(--text-main)]">
                    <option value="Super Admin">Super Admin</option>
                    <option value="Compliance Manager">Compliance Manager</option>
                    <option value="Compliance Analyst">Compliance Analyst</option>
                    <option value="Auditor">Auditor</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Department</label>
                  <input type="text" value={formDept} onChange={(e) => setFormDept(e.target.value)} className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg p-2 text-xs focus:outline-none" />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2 text-xs font-bold">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-3.5 py-1.5 border border-[var(--border-color)] hover:bg-[var(--bg-app)] rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-[var(--text-main)]">Edit Account Details</h3>
            <form onSubmit={handleUpdate} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Full Name</label>
                <input type="text" required value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg p-2 text-xs focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Email Address (Read-only)</label>
                <input type="email" disabled value={editingUser?.email || ''} className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg p-2 text-xs opacity-50 cursor-not-allowed" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Assign Role</label>
                  <select value={formRole} onChange={(e) => setFormRole(e.target.value)} className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg p-2 text-xs focus:outline-none font-semibold text-[var(--text-main)]">
                    <option value="Super Admin">Super Admin</option>
                    <option value="Compliance Manager">Compliance Manager</option>
                    <option value="Compliance Analyst">Compliance Analyst</option>
                    <option value="Auditor">Auditor</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Department</label>
                  <input type="text" value={formDept} onChange={(e) => setFormDept(e.target.value)} className="w-full bg-[var(--bg-app)] border border-[var(--border-color)] rounded-lg p-2 text-xs focus:outline-none" />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2 text-xs font-bold">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-3.5 py-1.5 border border-[var(--border-color)] hover:bg-[var(--bg-app)] rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
