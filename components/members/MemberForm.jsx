// components/members/MemberForm.jsx
'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { getBranchAuthHeader } from '@/lib/authHeader';
import Loading from '@/components/Loading';
import { Upload, User, Phone, Calendar, MapPin, Shield, Fingerprint, Save } from 'lucide-react';

export default function MemberForm({ basePath, memberId = null }) {
  const { getToken } = useAuth();
  const router = useRouter();
  const isEdit = !!memberId;

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    dob: '',
    gender: '',
    address: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    deviceUserId: '',
  });
  const [photo, setPhoto] = useState(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const headers = await getBranchAuthHeader(getToken);
        const { data } = await axios.get(`/api/member/${memberId}`, { headers });
        const m = data.member;
        setForm({
          fullName: m.fullName || '',
          phone: m.phone || '',
          dob: m.dob ? m.dob.slice(0, 10) : '',
          gender: m.gender || '',
          address: m.address || '',
          emergencyContactName: m.emergencyContactName || '',
          emergencyContactNumber: m.emergencyContactNumber || '',
          deviceUserId: m.deviceUserId || '',
        });
        setExistingPhotoUrl(m.photo);
      } catch (error) {
        toast.error(error?.response?.data?.error || error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, memberId]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (
      !form.fullName ||
      !form.phone ||
      !form.emergencyContactName ||
      !form.emergencyContactNumber
    ) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!isEdit && !photo) {
      toast.error('Please upload a member photo');
      return;
    }

    try {
      setSubmitting(true);
      const headers = await getBranchAuthHeader(getToken);
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (photo) fd.append('photo', photo);
      if (isEdit) fd.append('id', memberId);

      const { data } = isEdit
        ? await axios.put('/api/member/update', fd, { headers })
        : await axios.post('/api/member/create', fd, { headers });

      toast.success(data.message);
      router.push(isEdit ? `${basePath}/${memberId}` : basePath);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        {isEdit ? 'Edit Member' : 'Register Member'}
      </h1>

      <form
        onSubmit={onSubmit}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Photo {!isEdit && <span className="text-red-500">*</span>}
          </label>
          <label className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 hover:border-green-400 hover:bg-green-50/30 transition-all">
            {photo || existingPhotoUrl ? (
              <div className="relative">
                <Image
                  src={photo ? URL.createObjectURL(photo) : existingPhotoUrl}
                  alt="Preview"
                  width={80}
                  height={80}
                  className="rounded-full object-cover w-20 h-20 border border-slate-200 shadow-sm"
                />
                <p className="text-xs text-green-600 mt-2 text-center">Click to change</p>
              </div>
            ) : (
              <>
                <Upload size={26} className="text-slate-400 mb-2" />
                <p className="text-sm text-slate-500">Click to upload photo</p>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files[0])}
              hidden
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                name="fullName"
                value={form.fullName}
                onChange={onChange}
                required
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
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
                required
                type="tel"
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Date of Birth</label>
            <div className="relative">
              <Calendar
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                name="dob"
                value={form.dob}
                onChange={onChange}
                type="date"
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Gender</label>
            <select
              name="gender"
              value={form.gender}
              onChange={onChange}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
            >
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
            <textarea
              name="address"
              value={form.address}
              onChange={onChange}
              rows={2}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400 resize-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Emergency Contact Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Shield
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                name="emergencyContactName"
                value={form.emergencyContactName}
                onChange={onChange}
                required
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Emergency Contact Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                name="emergencyContactNumber"
                value={form.emergencyContactNumber}
                onChange={onChange}
                required
                type="tel"
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Biometric Device User ID{' '}
            <span className="text-slate-400 font-normal text-xs">
              (optional — link once fingerprint is enrolled on the device)
            </span>
          </label>
          <div className="relative">
            <Fingerprint
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              name="deviceUserId"
              value={form.deviceUserId}
              onChange={onChange}
              placeholder="e.g. 42"
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 rounded-xl font-medium transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Register Member'}
        </button>
      </form>
    </div>
  );
}
