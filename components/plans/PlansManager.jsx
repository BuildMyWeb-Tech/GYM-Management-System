// components/plans/PlansManager.jsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getBranchAuthHeader } from '@/lib/authHeader';
import Loading from '@/components/Loading';
import { Plus, Trash2, Pencil, Power, X, Dumbbell } from 'lucide-react';

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const EMPTY_FORM = { name: '', durationDays: '', price: '' };

export default function PlansManager() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.get('/api/membership-plan', { headers });
      setPlans(data.plans);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (plan) => {
    setEditingId(plan.id);
    setForm({ name: plan.name, durationDays: String(plan.durationDays), price: String(plan.price) });
    setShowModal(true);
  };

  const submitPlan = async (e) => {
    e.preventDefault();
    if (!form.name || !form.durationDays || !form.price) { toast.error('All fields are required'); return; }
    try {
      const headers = await getBranchAuthHeader(getToken);
      const payload = { name: form.name, durationDays: Number(form.durationDays), price: Number(form.price) };

      const { data } = editingId
        ? await axios.put(`/api/membership-plan/${editingId}`, payload, { headers })
        : await axios.post('/api/membership-plan', payload, { headers });

      toast.success(data.message);
      setShowModal(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      fetchPlans();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    }
  };

  const togglePlanStatus = async (plan) => {
    try {
      const headers = await getBranchAuthHeader(getToken);
      const newStatus = plan.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const { data } = await axios.put(`/api/membership-plan/${plan.id}`, { status: newStatus }, { headers });
      toast.success(data.message);
      fetchPlans();
    } catch (error) { toast.error(error?.response?.data?.error || error.message); }
  };

  const deletePlan = async (id) => {
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.delete(`/api/membership-plan/${id}`, { headers });
      toast.success(data.message);
      fetchPlans();
    } catch (error) { toast.error(error?.response?.data?.error || error.message); }
  };

  if (loading) return <Loading />;

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
          <Dumbbell size={24} className="text-green-600" /> Membership Plans
        </h1>
        <button onClick={openAdd}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium">
          <Plus size={16} /> Add Plan
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200 text-slate-400">No plans yet — add your first one</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex justify-between items-start">
                <p className="font-semibold text-slate-800">{p.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{p.status}</span>
              </div>
              <p className="text-2xl font-bold text-slate-800 mt-3">₹{p.price.toLocaleString('en-IN')}</p>
              <p className="text-xs text-slate-500">for {p.durationDays} days</p>
              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                <button onClick={() => openEdit(p)} className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-lg flex items-center gap-1">
                  <Pencil size={12} /> Edit
                </button>
                <button onClick={() => togglePlanStatus(p)} className="flex-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg flex items-center justify-center gap-1">
                  <Power size={12} /> {p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => deletePlan(p.id)} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editingId ? 'Edit Plan' : 'Add Plan'} onClose={() => setShowModal(false)}>
          <form onSubmit={submitPlan} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Plan Name</label>
              <input required placeholder="e.g. Monthly Plan" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Duration (days)</label>
                <input required type="number" placeholder="30" value={form.durationDays}
                  onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Amount (₹)</label>
                <input required type="number" placeholder="1000" value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100" />
              </div>
            </div>
            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium">
              {editingId ? 'Save Changes' : 'Create Plan'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}