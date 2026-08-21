// app/store/employees/page.jsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getBranchAuthHeader } from '@/lib/authHeader';
import Loading from '@/components/Loading';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import {
  Users,
  Plus,
  X,
  Eye,
  Pencil,
  Trash2,
  Check,
  Eye as EyeIcon,
  EyeOff,
  RefreshCcw,
  AlertTriangle,
  Shield,
  Mail,
} from 'lucide-react';

const PERMISSION_META = {
  [PERMISSIONS.MANAGE_MEMBERS]: {
    label: 'Manage Members',
    desc: 'Register, edit, and manage member records',
  },
  [PERMISSIONS.MARK_ATTENDANCE]: {
    label: 'Mark Attendance',
    desc: 'Check-in / check-out members, corrections',
  },
  [PERMISSIONS.COLLECT_PAYMENT]: {
    label: 'Collect Payment',
    desc: 'Checkout, view payments and orders',
  },
  [PERMISSIONS.MANAGE_MEMBERSHIPS]: { label: 'Manage Plans', desc: 'Create/edit membership plans' },
  [PERMISSIONS.VIEW_REPORTS]: {
    label: 'View Reports',
    desc: 'Access attendance and revenue reports',
  },
  [PERMISSIONS.MANAGE_BRANCH_SETTINGS]: {
    label: 'Branch Settings',
    desc: 'Update branch profile and settings',
  },
};
const ALL_PERMISSIONS = Object.values(PERMISSIONS);

const EMPTY_FORM = { name: '', email: '', password: '', permissions: {} };

function Modal({ title, onClose, children, maxWidth = 'max-w-md' }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 z-50 overflow-y-auto" onClick={onClose}>
      <div className="min-h-full flex items-start justify-center px-4 pt-24 pb-6 sm:pt-28">
        <div
          className={`bg-white rounded-2xl shadow-xl w-full ${maxWidth} max-h-[78vh] overflow-y-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-3.5 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-lg">{title}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          <div className="px-5 sm:px-6 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [viewTarget, setViewTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.get('/api/employee/list', { headers });
      setEmployees(data.employees);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowFormModal(true);
  };

  const openEdit = (emp) => {
    setEditingId(emp.id);
    setForm({
      name: emp.name,
      email: emp.email,
      password: '',
      permissions: { ...emp.permissions },
    });
    setShowFormModal(true);
  };

  const togglePerm = (key) => {
    setForm((f) => ({ ...f, permissions: { ...f.permissions, [key]: !f.permissions[key] } }));
  };

  const submitForm = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error('Name and email are required');
      return;
    }
    if (!editingId && (!form.password || form.password.length < 6)) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setSubmitting(true);
      const headers = await getBranchAuthHeader(getToken);

      if (editingId) {
        const payload = {
          id: editingId,
          name: form.name,
          email: form.email,
          permissions: form.permissions,
        };
        if (form.password) payload.password = form.password;
        const { data } = await axios.put('/api/employee/update', payload, { headers });
        toast.success(data.message);
      } else {
        const { data } = await axios.post(
          '/api/employee/create',
          {
            name: form.name,
            email: form.email,
            password: form.password,
            permissions: form.permissions,
          },
          { headers }
        );
        toast.success(data.message);
      }

      setShowFormModal(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      fetchEmployees();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (emp) => {
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.put(
        '/api/employee/update',
        { id: emp.id, isActive: !emp.isActive },
        { headers }
      );
      toast.success(data.message);
      fetchEmployees();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.delete(`/api/employee/delete?id=${deleteTarget.id}`, {
        headers,
      });
      toast.success(data.message);
      setDeleteTarget(null);
      fetchEmployees();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Users size={24} className="text-green-600" /> Receptionist Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage staff access and permissions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchEmployees}
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium"
          >
            <RefreshCcw size={15} /> Refresh
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
          >
            <Plus size={16} /> Add Receptionist
          </button>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-72 bg-white rounded-xl border border-slate-200">
          <Users size={44} className="text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No receptionists yet</p>
          <button
            onClick={openAdd}
            className="mt-4 inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
          >
            <Plus size={16} /> Add First Receptionist
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-slate-500 font-medium">Name</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-medium">Email</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-medium">Permissions</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-medium">Status</th>
                  <th className="text-right px-5 py-3 text-slate-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const grantedCount = Object.values(emp.permissions || {}).filter(Boolean).length;
                  return (
                    <tr key={emp.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-semibold flex-shrink-0">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-800">{emp.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{emp.email}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          {grantedCount} of {ALL_PERMISSIONS.length}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => toggleActive(emp)}
                          className={`relative inline-flex items-center h-5 w-9 rounded-full transition-colors ${emp.isActive ? 'bg-green-600' : 'bg-slate-300'}`}
                        >
                          <span
                            className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform ${emp.isActive ? 'translate-x-4.5 ml-1' : 'translate-x-1'}`}
                          />
                        </button>
                        <span
                          className={`ml-2 text-xs ${emp.isActive ? 'text-green-600' : 'text-slate-400'}`}
                        >
                          {emp.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewTarget(emp)}
                            title="View"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => openEdit(emp)}
                            title="Edit"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(emp)}
                            title="Delete"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {showFormModal && (
        <Modal
          title={editingId ? 'Edit Receptionist' : 'Add Receptionist'}
          onClose={() => setShowFormModal(false)}
        >
          <form onSubmit={submitForm} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                <input
                  required
                  placeholder="e.g. Ravi Kumar"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    required
                    type="email"
                    placeholder="ravi@branch.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password{' '}
                {editingId && (
                  <span className="text-slate-400 font-normal text-xs">
                    (leave blank to keep current)
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={editingId ? 'Leave blank to keep unchanged' : 'Min 6 characters'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-3.5 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={15} /> : <EyeIcon size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                <Shield size={14} className="text-green-600" /> Permissions
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_PERMISSIONS.map((key) => {
                  const meta = PERMISSION_META[key];
                  const checked = !!form.permissions[key];
                  return (
                    <div
                      key={key}
                      onClick={() => togglePerm(key)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer select-none transition-colors ${
                        checked
                          ? 'border-green-400 bg-green-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          checked ? 'bg-green-600 border-green-600' : 'border-slate-300'
                        }`}
                      >
                        {checked && <Check size={12} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{meta.label}</p>
                        <p className="text-xs text-slate-500">{meta.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 rounded-xl font-medium disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting && (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create Receptionist'}
            </button>
          </form>
        </Modal>
      )}

      {/* View modal */}
      {viewTarget && (
        <Modal title="Receptionist Details" onClose={() => setViewTarget(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg">
                {viewTarget.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-800">{viewTarget.name}</p>
                <p className="text-sm text-slate-500">{viewTarget.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${viewTarget.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}
              >
                {viewTarget.isActive ? 'Active' : 'Inactive'}
              </span>
              <span className="text-xs text-slate-400">
                Added {new Date(viewTarget.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Permissions
              </p>
              <div className="space-y-1.5">
                {ALL_PERMISSIONS.map((key) => {
                  const granted = !!viewTarget.permissions?.[key];
                  return (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center ${granted ? 'bg-green-100' : 'bg-slate-100'}`}
                      >
                        {granted && <Check size={10} className="text-green-600" />}
                      </div>
                      <span className={granted ? 'text-slate-700' : 'text-slate-400'}>
                        {PERMISSION_META[key].label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <Modal title="Delete Receptionist" onClose={() => setDeleteTarget(null)}>
          <div className="flex items-center gap-2 text-red-600 mb-3">
            <AlertTriangle size={18} />
          </div>
          <p className="text-sm text-slate-600">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-slate-800">{deleteTarget.name}</span>? They will
            immediately lose access to the receptionist portal. This cannot be undone.
          </p>
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {deleting ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
