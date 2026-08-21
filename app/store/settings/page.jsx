// app/store/settings/page.jsx
'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getBranchAuthHeader } from '@/lib/authHeader';
import Loading from '@/components/Loading';
import { Dumbbell, RefreshCcw, Save, Mail, Phone, MapPin, Clock, FileText } from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  description: '',
  address: '',
  phone: '',
  email: '',
  contact: '',
  operatingHours: '',
  gstNumber: '',
};

export default function BranchSettingsPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.get('/api/store/settings', { headers });
      const s = data.settings;
      setForm({
        name: s.name || '',
        description: s.description || '',
        address: s.address || '',
        phone: s.phone || '',
        email: s.email || '',
        contact: s.contact || '',
        operatingHours: s.operatingHours || '',
        gstNumber: s.gstNumber || '',
      });
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSave = async () => {
    if (!form.name || !form.email || !form.phone || !form.contact) {
      toast.error('Branch name, email, phone, and contact are required');
      return;
    }
    try {
      setSaving(true);
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.post('/api/store/settings', form, { headers });
      toast.success(data.message);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Dumbbell size={24} className="text-green-600" /> Branch Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">Update your branch's information</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchSettings}
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium"
          >
            <RefreshCcw size={15} /> Refresh
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-60"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={15} />
            )}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm max-w-2xl">
        <div className="flex items-start gap-3 p-5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
            <Dumbbell size={17} className="text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Branch Information</p>
            <p className="text-xs text-slate-500">
              Shown to admin and used on receipts and reports
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Gym Name <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Description
            </label>
            <div className="relative">
              <FileText size={15} className="absolute left-3 top-3 text-slate-400" />
              <textarea
                name="description"
                value={form.description}
                onChange={onChange}
                rows={3}
                className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400 resize-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Gym Address
            </label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3 top-3 text-slate-400" />
              <textarea
                name="address"
                value={form.address}
                onChange={onChange}
                rows={2}
                className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400 resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Phone <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  name="phone"
                  value={form.phone}
                  onChange={onChange}
                  type="tel"
                  className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Front Desk Contact <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  name="contact"
                  value={form.contact}
                  onChange={onChange}
                  type="tel"
                  className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                name="email"
                value={form.email}
                onChange={onChange}
                type="email"
                className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Operating Hours
              </label>
              <div className="relative">
                <Clock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  name="operatingHours"
                  value={form.operatingHours}
                  onChange={onChange}
                  placeholder="6:00 AM - 10:00 PM"
                  className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                GST Number
              </label>
              <input
                name="gstNumber"
                value={form.gstNumber}
                onChange={onChange}
                placeholder="Optional"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
