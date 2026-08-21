// components/members/MemberForm.jsx
'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getBranchAuthHeader } from '@/lib/authHeader';
import Loading from '@/components/Loading';
import { User, Phone, Calendar,ArrowLeft, MapPin, Shield, Fingerprint, Save, Hash, Dumbbell } from 'lucide-react';
import Link from 'next/link';
function last5Digits(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  return digits.slice(-5);
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function MemberForm({ basePath, memberId = null }) {
  const { getToken } = useAuth();
  const router = useRouter();
  const isEdit = !!memberId;

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [plans, setPlans] = useState([]);
  const [selectedPlanIds, setSelectedPlanIds] = useState([]);
  const [memberCodeTouched, setMemberCodeTouched] = useState(false);

  const [form, setForm] = useState({
    fullName: '', phone: '', dob: '', gender: '', address: '',
    emergencyContactName: '', emergencyContactNumber: '', deviceUserId: '',
    memberCode: '', fromDate: todayStr(), toDate: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const headers = await getBranchAuthHeader(getToken);
        const { data } = await axios.get('/api/membership-plan', { headers, params: { status: 'ACTIVE' } });
        setPlans(data.plans);
      } catch { /* non-fatal for the form */ }
    })();
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const headers = await getBranchAuthHeader(getToken);
        const { data } = await axios.get(`/api/member/${memberId}`, { headers });
        const m = data.member;
        setForm((f) => ({
          ...f,
          fullName: m.fullName || '',
          phone: m.phone || '',
          dob: m.dob ? m.dob.slice(0, 10) : '',
          gender: m.gender || '',
          address: m.address || '',
          emergencyContactName: m.emergencyContactName || '',
          emergencyContactNumber: m.emergencyContactNumber || '',
          deviceUserId: m.deviceUserId || '',
          memberCode: m.memberCode || '',
        }));
        setMemberCodeTouched(true); // don't auto-overwrite an existing member's saved code
      } catch (error) {
        toast.error(error?.response?.data?.error || error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, memberId]);

  // Auto-fill Member ID from phone's last 5 digits, unless the user has typed their own
  useEffect(() => {
    if (memberCodeTouched) return;
    setForm((f) => ({ ...f, memberCode: last5Digits(f.phone) }));
  }, [form.phone, memberCodeTouched]);

  // Auto-calculate End Date from From Date + the longest selected plan's duration
  useEffect(() => {
    if (!form.fromDate || selectedPlanIds.length === 0) {
      setForm((f) => ({ ...f, toDate: '' }));
      return;
    }
    const selected = plans.filter((p) => selectedPlanIds.includes(p.id));
    const maxDuration = Math.max(...selected.map((p) => p.durationDays), 0);
    setForm((f) => ({ ...f, toDate: addDays(f.fromDate, maxDuration) }));
  }, [form.fromDate, selectedPlanIds, plans]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const togglePlan = (planId) => {
    setSelectedPlanIds((prev) =>
      prev.includes(planId) ? prev.filter((id) => id !== planId) : [...prev, planId]
    );
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.phone || !form.emergencyContactName || !form.emergencyContactNumber) {
      toast.error('Please fill all required fields'); return;
    }

    try {
      setSubmitting(true);
      const headers = await getBranchAuthHeader(getToken);
      const payload = {
        fullName: form.fullName,
        phone: form.phone,
        dob: form.dob || null,
        gender: form.gender || null,
        address: form.address || null,
        emergencyContactName: form.emergencyContactName,
        emergencyContactNumber: form.emergencyContactNumber,
        deviceUserId: form.deviceUserId || null,
        memberCode: form.memberCode || null,
      };

      if (isEdit) {
        payload.id = memberId;
        const { data } = await axios.put('/api/member/update', payload, { headers });
        toast.success(data.message);
        router.push(`${basePath}/${memberId}`);
      } else {
        payload.planIds = selectedPlanIds;
        payload.fromDate = form.fromDate;
        const { data } = await axios.post('/api/member/create', payload, { headers });
        toast.success(data.message);
        router.push(basePath);
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28 max-w-2xl">
      <Link href={isEdit ? `${basePath}/${memberId}` : basePath}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft size={14} /> Back
      </Link>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">{isEdit ? 'Edit Member' : 'Register Member'}</h1>

      <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input name="fullName" value={form.fullName} onChange={onChange} required
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone <span className="text-red-500">*</span></label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input name="phone" value={form.phone} onChange={onChange} required type="tel"
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Member ID <span className="text-slate-400 font-normal text-xs">(auto-filled from phone — last 5 digits, editable)</span>
          </label>
          <div className="relative">
            <Hash size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input name="memberCode" value={form.memberCode}
              onChange={(e) => { setMemberCodeTouched(true); onChange(e); }}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Date of Birth</label>
            <div className="relative">
              <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input name="dob" value={form.dob} onChange={onChange} type="date"
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Gender</label>
            <select name="gender" value={form.gender} onChange={onChange}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400">
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
          <div className="relative">
            <MapPin size={15} className="absolute left-3 top-3 text-slate-400" />
            <textarea name="address" value={form.address} onChange={onChange} rows={2}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400 resize-none" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Emergency Contact Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <Shield size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input name="emergencyContactName" value={form.emergencyContactName} onChange={onChange} required
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Emergency Contact Number <span className="text-red-500">*</span></label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input name="emergencyContactNumber" value={form.emergencyContactNumber} onChange={onChange} required type="tel"
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Biometric Device User ID <span className="text-slate-400 font-normal text-xs">(optional)</span>
          </label>
          <div className="relative">
            <Fingerprint size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input name="deviceUserId" value={form.deviceUserId} onChange={onChange} placeholder="e.g. 42"
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400" />
          </div>
        </div>

        {!isEdit && (
          <>
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                <Dumbbell size={15} className="text-green-600" /> Assign Membership Plan(s)
              </label>
              {plans.length === 0 ? (
                <p className="text-xs text-slate-400">No active plans yet — add one from the Plans page first, or register the member without a plan for now.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {plans.map((p) => (
                    <label key={p.id}
                      className={`flex items-center gap-2 border rounded-lg px-3 py-2.5 text-sm cursor-pointer ${selectedPlanIds.includes(p.id) ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <input type="checkbox" checked={selectedPlanIds.includes(p.id)} onChange={() => togglePlan(p.id)}
                        className="accent-green-600" />
                      <span className="flex-1">
                        <span className="text-slate-800 font-medium">{p.name}</span>
                        <span className="text-slate-400 text-xs block">₹{p.price.toLocaleString('en-IN')} • {p.durationDays} days</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">From Date</label>
                <input name="fromDate" value={form.fromDate} onChange={onChange} type="date"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  To Date <span className="text-slate-400 font-normal text-xs">(auto-calculated)</span>
                </label>
                <input value={form.toDate} disabled placeholder="Select a plan"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500" />
              </div>
            </div>
          </>
        )}

        <button type="submit" disabled={submitting}
          className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 rounded-xl font-medium transition-all disabled:opacity-60 flex items-center justify-center gap-2">
          {submitting ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
          {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Register Member'}
        </button>
      </form>
    </div>
  );
}