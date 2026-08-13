// components/members/MemberProfile.jsx
'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import { getBranchAuthHeader } from '@/lib/authHeader';
import Loading from '@/components/Loading';
import {
  Phone,
  MapPin,
  Shield,
  Calendar,
  Fingerprint,
  Edit2,
  Power,
  CalendarCheck,
  CreditCard,
} from 'lucide-react';

export default function MemberProfile({ basePath, memberId }) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMember = async () => {
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.get(`/api/member/${memberId}`, { headers });
      setMember(data.member);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMember();
  }, [memberId]);

  const toggleStatus = async () => {
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.post('/api/member/toggle-status', { id: memberId }, { headers });
      toast.success(data.message);
      fetchMember();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    }
  };

  if (loading) return <Loading />;
  if (!member) return null;

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28 max-w-3xl">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {member.photo ? (
            <Image
              src={member.photo}
              alt={member.fullName}
              width={100}
              height={100}
              className="w-24 h-24 rounded-full object-cover border border-slate-200 shadow-sm"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-3xl">
              {member.fullName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-800">{member.fullName}</h1>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${member.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}
              >
                {member.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Member since {new Date(member.joinDate).toLocaleDateString()}
            </p>

            <div className="flex flex-wrap gap-3 mt-4">
              <Link
                href={`${basePath}/${memberId}/edit`}
                className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium"
              >
                <Edit2 size={14} /> Edit
              </Link>
              <button
                onClick={toggleStatus}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${member.status === 'ACTIVE' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
              >
                <Power size={14} /> {member.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-2 text-slate-700">
            <Phone size={16} className="text-slate-400" />{' '}
            <span className="text-sm">{member.phone}</span>
          </div>
          {member.address && (
            <div className="flex items-center gap-2 text-slate-700">
              <MapPin size={16} className="text-slate-400" />{' '}
              <span className="text-sm">{member.address}</span>
            </div>
          )}
          {member.dob && (
            <div className="flex items-center gap-2 text-slate-700">
              <Calendar size={16} className="text-slate-400" />{' '}
              <span className="text-sm">
                {new Date(member.dob).toLocaleDateString()}
                {member.gender ? ` • ${member.gender}` : ''}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-slate-700">
            <Fingerprint size={16} className="text-slate-400" />
            <span className="text-sm">
              {member.deviceUserId
                ? `Device ID: ${member.deviceUserId}`
                : 'Not linked to biometric device'}
            </span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100">
          <h3 className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-2">
            <Shield size={14} /> Emergency Contact
          </h3>
          <p className="text-sm text-slate-700">
            {member.emergencyContactName} • {member.emergencyContactNumber}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <CreditCard size={16} className="text-purple-500" /> Membership History
          </h3>
          {member.memberships?.length ? (
            <ul className="space-y-2">
              {member.memberships.map((m) => (
                <li
                  key={m.id}
                  className="text-sm flex justify-between border-b border-slate-50 pb-2 last:border-0"
                >
                  <span className="text-slate-700">{m.plan.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${m.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {m.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">
              No memberships purchased yet — available once plans are set up.
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <CalendarCheck size={16} className="text-blue-500" /> Recent Attendance
          </h3>
          {member.attendances?.length ? (
            <ul className="space-y-2">
              {member.attendances.map((a) => (
                <li
                  key={a.id}
                  className="text-sm flex justify-between border-b border-slate-50 pb-2 last:border-0"
                >
                  <span className="text-slate-700">{new Date(a.checkIn).toLocaleString()}</span>
                  <span className="text-xs text-slate-400">{a.method}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">
              No attendance recorded yet — available once biometric check-in is live.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
