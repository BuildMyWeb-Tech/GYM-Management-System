// components/members/MemberProfile.jsx
'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
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
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  PlusCircle,
  BarChart2,
  CalendarDays,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TABS = [
  { id: 'attendance', label: 'Recent Attendance', icon: CalendarCheck },
  { id: 'daily', label: 'Daily Attendance', icon: CalendarDays },
  { id: 'monthly', label: 'Monthly Attendance', icon: BarChart2 },
];

// Formats minutes as "3 min", "1 hr", "1:30 hr" etc.
function formatDuration(mins) {
  if (mins <= 0) return '0 min';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (rem === 0) return `${hrs} hr`;
  return `${hrs}:${String(rem).padStart(2, '0')} hr`;
}

function DurationTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-medium text-slate-700">{label}</p>
      <p className="text-green-600">{formatDuration(payload[0].value)}</p>
    </div>
  );
}

export default function MemberProfile({ basePath, memberId }) {
  const { getToken } = useAuth();
  const [member, setMember] = useState(null);
  const [attendanceMonthly, setAttendanceMonthly] = useState([]);
  const [attendanceDaily, setAttendanceDaily] = useState([]);
  const [activeMembership, setActiveMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('attendance');

  const fetchMember = async () => {
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.get(`/api/member/${memberId}`, { headers });
      setMember(data.member);
      setAttendanceMonthly(data.attendanceMonthly || []);
      setAttendanceDaily(data.attendanceDaily || []);
      setActiveMembership(data.activeMembership || null);
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

  const maxVisits = Math.max(...attendanceMonthly.map((m) => m.count), 1);
  const maxMinutes = Math.max(...attendanceDaily.map((d) => d.minutes), 60);

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28 max-w-4xl">
      <Link
        href={basePath}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft size={14} /> Back to Members
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {member.photo ? (
            <Image
              src={member.photo}
              alt={member.fullName}
              width={96}
              height={96}
              className="w-24 h-24 rounded-full object-cover border-2 border-white shadow-md"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white font-bold text-3xl shadow-md">
              {member.fullName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-800">{member.fullName}</h1>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${member.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}
              >
                {member.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {member.memberCode && <span className="font-mono">#{member.memberCode} · </span>}
              Member since {new Date(member.joinDate).toLocaleDateString()}
            </p>

            <div className="flex flex-wrap gap-2.5 mt-4">
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
              <Link
                href={`/store/checkout`}
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                <PlusCircle size={14} /> Renew / Add Plan
              </Link>
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

      {/* Membership status banner */}
      <div
        className={`mt-5 rounded-xl border p-5 flex items-center justify-between flex-wrap gap-3 ${
          !activeMembership
            ? 'bg-slate-50 border-slate-200'
            : activeMembership.daysRemaining <= 3
              ? 'bg-red-50 border-red-200'
              : activeMembership.daysRemaining <= 7
                ? 'bg-amber-50 border-amber-200'
                : 'bg-green-50 border-green-200'
        }`}
      >
        <div className="flex items-center gap-3">
          {!activeMembership ? (
            <AlertTriangle size={20} className="text-slate-400" />
          ) : activeMembership.daysRemaining <= 7 ? (
            <AlertTriangle size={20} className="text-amber-600" />
          ) : (
            <CheckCircle2 size={20} className="text-green-600" />
          )}
          <div>
            {!activeMembership ? (
              <>
                <p className="font-medium text-slate-700 text-sm">No active membership</p>
                <p className="text-xs text-slate-400">This member has no currently valid plan</p>
              </>
            ) : (
              <>
                <p className="font-medium text-slate-800 text-sm">{activeMembership.planName}</p>
                <p className="text-xs text-slate-500">
                  Expires {new Date(activeMembership.expiryDate).toLocaleDateString()} —{' '}
                  {activeMembership.daysRemaining} day
                  {activeMembership.daysRemaining !== 1 ? 's' : ''} remaining
                </p>
              </>
            )}
          </div>
        </div>
        {(!activeMembership || activeMembership.daysRemaining <= 7) && (
          <Link
            href="/store/checkout"
            className="text-xs font-medium bg-white border border-slate-200 hover:border-green-400 px-3 py-1.5 rounded-lg text-slate-700"
          >
            Renew Now
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-5 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'attendance' &&
            (member.attendances?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 text-slate-500 font-medium">Date</th>
                      <th className="text-left py-2 text-slate-500 font-medium">Check-in</th>
                      <th className="text-left py-2 text-slate-500 font-medium">Check-out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {member.attendances.map((a) => (
                      <tr key={a.id} className="border-b border-slate-50 last:border-0">
                        <td className="py-2.5 text-slate-700">
                          {new Date(a.checkIn).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 text-slate-700">
                          {new Date(a.checkIn).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5">
                          {a.checkOut ? (
                            <span className="text-slate-700">
                              {new Date(a.checkOut).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          ) : (
                            <span className="text-amber-600 text-xs bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                              Still in
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">No attendance recorded yet.</p>
            ))}

          {tab === 'daily' &&
            (attendanceDaily.every((d) => d.minutes === 0) ? (
              <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
                No attendance recorded in the last 30 days
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-400 mb-3">Time spent per day, last 30 days</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={attendanceDaily} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9 }}
                      interval={0}
                      angle={-60}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      domain={[0, Math.ceil((maxMinutes * 1.15) / 30) * 30]}
                      tickFormatter={(v) => formatDuration(v)}
                      tick={{ fontSize: 10 }}
                      width={55}
                    />
                    <Tooltip content={<DurationTooltip />} />
                    <Bar dataKey="minutes" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            ))}

          {tab === 'monthly' &&
            (attendanceMonthly.every((m) => m.count === 0) ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                No attendance recorded yet
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-400 mb-3">Visits per month, last 6 months</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={attendanceMonthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      domain={[0, Math.max(4, maxVisits + 1)]}
                    />
                    <Tooltip />
                    <Bar dataKey="count" fill="#16a34a" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            ))}
        </div>
      </div>
    </div>
  );
}
