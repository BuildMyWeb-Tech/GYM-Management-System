// components/plans/PlansManager.jsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getBranchAuthHeader } from '@/lib/authHeader';
import Loading from '@/components/Loading';
import { Plus, Trash2, Tag, Dumbbell, UserRound, Power, X } from 'lucide-react';

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function PlansManager() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [plans, setPlans] = useState([]);
  const [packages, setPackages] = useState([]);
  const [tab, setTab] = useState('plans');

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);

  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    categoryId: '',
    durationDays: '',
    price: '',
    features: '',
  });
  const [packageForm, setPackageForm] = useState({
    name: '',
    sessionCount: '',
    price: '',
    trainerName: '',
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getBranchAuthHeader(getToken);
      const [catRes, planRes, pkgRes] = await Promise.all([
        axios.get('/api/plan-category', { headers }),
        axios.get('/api/membership-plan', { headers }),
        axios.get('/api/pt-package', { headers }),
      ]);
      setCategories(catRes.data.categories);
      setPlans(planRes.data.plans);
      setPackages(pkgRes.data.packages);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createCategory = async (e) => {
    e.preventDefault();
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.post('/api/plan-category', categoryForm, { headers });
      toast.success(data.message);
      setShowCategoryModal(false);
      setCategoryForm({ name: '', description: '' });
      fetchAll();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    }
  };

  const deleteCategory = async (id) => {
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.delete(`/api/plan-category?id=${id}`, { headers });
      toast.success(data.message);
      fetchAll();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    }
  };

  const createPlan = async (e) => {
    e.preventDefault();
    try {
      const headers = await getBranchAuthHeader(getToken);
      const payload = {
        ...planForm,
        durationDays: Number(planForm.durationDays),
        price: Number(planForm.price),
        features: planForm.features
          .split(',')
          .map((f) => f.trim())
          .filter(Boolean),
      };
      const { data } = await axios.post('/api/membership-plan', payload, { headers });
      toast.success(data.message);
      setShowPlanModal(false);
      setPlanForm({
        name: '',
        description: '',
        categoryId: '',
        durationDays: '',
        price: '',
        features: '',
      });
      fetchAll();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    }
  };

  const togglePlanStatus = async (plan) => {
    try {
      const headers = await getBranchAuthHeader(getToken);
      const newStatus = plan.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const { data } = await axios.put(
        `/api/membership-plan/${plan.id}`,
        { status: newStatus },
        { headers }
      );
      toast.success(data.message);
      fetchAll();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    }
  };

  const deletePlan = async (id) => {
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.delete(`/api/membership-plan/${id}`, { headers });
      toast.success(data.message);
      fetchAll();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    }
  };

  const createPackage = async (e) => {
    e.preventDefault();
    try {
      const headers = await getBranchAuthHeader(getToken);
      const payload = {
        ...packageForm,
        sessionCount: Number(packageForm.sessionCount),
        price: Number(packageForm.price),
      };
      const { data } = await axios.post('/api/pt-package', payload, { headers });
      toast.success(data.message);
      setShowPackageModal(false);
      setPackageForm({ name: '', sessionCount: '', price: '', trainerName: '' });
      fetchAll();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    }
  };

  const togglePackage = async (pkg) => {
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.put(
        '/api/pt-package',
        { id: pkg.id, isActive: !pkg.isActive },
        { headers }
      );
      toast.success(data.message);
      fetchAll();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    }
  };

  const deletePackage = async (id) => {
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.delete(`/api/pt-package?id=${id}`, { headers });
      toast.success(data.message);
      fetchAll();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-6">Membership Plans</h1>

      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {[
          { id: 'plans', label: 'Plans', icon: Dumbbell },
          { id: 'categories', label: 'Categories', icon: Tag },
          { id: 'pt', label: 'PT Packages', icon: UserRound },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'plans' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowPlanModal(true)}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
            >
              <Plus size={16} /> Add Plan
            </button>
          </div>
          {plans.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200 text-slate-400">
              No plans yet
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-5"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.category?.name}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 mt-3">
                    ₹{p.price.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-slate-500">for {p.durationDays} days</p>
                  {p.features?.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {p.features.map((f, i) => (
                        <li key={i} className="text-xs text-slate-500">
                          • {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => togglePlanStatus(p)}
                      className="flex-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg flex items-center justify-center gap-1"
                    >
                      <Power size={12} /> {p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => deletePlan(p.id)}
                      className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'categories' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowCategoryModal(true)}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
            >
              <Plus size={16} /> Add Category
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {categories.length === 0 ? (
              <div className="text-center py-12 text-slate-400">No categories yet</div>
            ) : (
              categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{c.name}</p>
                    {c.description && <p className="text-xs text-slate-400">{c.description}</p>}
                  </div>
                  {!c.isGlobal && (
                    <button
                      onClick={() => deleteCategory(c.id)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'pt' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowPackageModal(true)}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
            >
              <Plus size={16} /> Add Package
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.length === 0 ? (
              <div className="col-span-full text-center py-16 bg-slate-50 rounded-xl border border-slate-200 text-slate-400">
                No PT packages yet
              </div>
            ) : (
              packages.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-5"
                >
                  <div className="flex justify-between items-start">
                    <p className="font-semibold text-slate-800">{p.name}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${p.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 mt-3">
                    ₹{p.price.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-slate-500">
                    {p.sessionCount} sessions{p.trainerName ? ` • ${p.trainerName}` : ''}
                  </p>
                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => togglePackage(p)}
                      className="flex-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg flex items-center justify-center gap-1"
                    >
                      <Power size={12} /> {p.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => deletePackage(p.id)}
                      className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showCategoryModal && (
        <Modal title="Add Category" onClose={() => setShowCategoryModal(false)}>
          <form onSubmit={createCategory} className="space-y-3">
            <input
              required
              placeholder="Category name"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100"
            />
            <textarea
              placeholder="Description (optional)"
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 resize-none"
            />
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium"
            >
              Create
            </button>
          </form>
        </Modal>
      )}

      {showPlanModal && (
        <Modal title="Add Membership Plan" onClose={() => setShowPlanModal(false)}>
          <form onSubmit={createPlan} className="space-y-3">
            <input
              required
              placeholder="Plan name (e.g. Monthly Basic)"
              value={planForm.name}
              onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100"
            />
            <select
              required
              value={planForm.categoryId}
              onChange={(e) => setPlanForm({ ...planForm, categoryId: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                type="number"
                placeholder="Duration (days)"
                value={planForm.durationDays}
                onChange={(e) => setPlanForm({ ...planForm, durationDays: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100"
              />
              <input
                required
                type="number"
                placeholder="Price (₹)"
                value={planForm.price}
                onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100"
              />
            </div>
            <textarea
              placeholder="Description"
              value={planForm.description}
              onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 resize-none"
            />
            <input
              placeholder="Features, comma separated"
              value={planForm.features}
              onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100"
            />
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium"
            >
              Create Plan
            </button>
          </form>
        </Modal>
      )}

      {showPackageModal && (
        <Modal title="Add PT Package" onClose={() => setShowPackageModal(false)}>
          <form onSubmit={createPackage} className="space-y-3">
            <input
              required
              placeholder="Package name"
              value={packageForm.name}
              onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                type="number"
                placeholder="Sessions"
                value={packageForm.sessionCount}
                onChange={(e) => setPackageForm({ ...packageForm, sessionCount: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100"
              />
              <input
                required
                type="number"
                placeholder="Price (₹)"
                value={packageForm.price}
                onChange={(e) => setPackageForm({ ...packageForm, price: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100"
              />
            </div>
            <input
              placeholder="Trainer name (optional)"
              value={packageForm.trainerName}
              onChange={(e) => setPackageForm({ ...packageForm, trainerName: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100"
            />
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium"
            >
              Create Package
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
