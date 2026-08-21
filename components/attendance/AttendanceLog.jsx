// components/attendance/AttendanceLog.jsx
'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { getBranchAuthHeader } from '@/lib/authHeader';
import Loading from '@/components/Loading';
import {
  CalendarCheck,
  Search,
  LogIn,
  LogOut,
  Pencil,
  X,
  ShieldCheck,
  ShieldAlert,
  Users,
  UserCheck,
  RefreshCcw,
  DoorOpen,
} from 'lucide-react';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

export default function AttendanceLog() {
  const { getToken } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayStr());
  const isToday = date === todayStr();

  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [correcting, setCorrecting] = useState(null);
  const [correctionForm, setCorrectionForm] = useState({
    checkIn: '',
    checkOut: '',
    correctionReason: '',
  });

  const fetchRecords = useCallback(async () => {
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.get('/api/attendance/list', { headers, params: { date } });
      setRecords(data.records);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    setLoading(true);
    fetchRecords();
  }, [fetchRecords]);

  // Members currently inside — open record today, no checkout yet
  const insideNow = useMemo(() => {
    return records
      .filter((r) => !r.checkOut)
      .sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));
  }, [records]);

  const openByMember = useMemo(() => {
    const map = {};
    for (const r of insideNow) map[r.member.id] = r;
    return map;
  }, [insideNow]);

  useEffect(() => {
    if (!memberSearch.trim()) {
      setMemberResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.get('/api/member/list', {
        headers,
        params: { q: memberSearch, status: 'ACTIVE', limit: 6 },
      });
      setMemberResults(data.members);
    }, 300);
    return () => clearTimeout(t);
  }, [memberSearch]);

  const handleAction = async (memberId) => {
    try {
      setActionLoadingId(memberId);
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.post('/api/attendance/manual', { memberId }, { headers });
      toast.success(data.message);
      await fetchRecords();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const openCorrection = (record) => {
    setCorrecting(record);
    setCorrectionForm({
      checkIn: new Date(record.checkIn).toISOString().slice(0, 16),
      checkOut: record.checkOut ? new Date(record.checkOut).toISOString().slice(0, 16) : '',
      correctionReason: '',
    });
  };

  const saveCorrection = async (e) => {
    e.preventDefault();
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.put(
        '/api/attendance/correct',
        {
          id: correcting.id,
          checkIn: correctionForm.checkIn,
          checkOut: correctionForm.checkOut || null,
          correctionReason: correctionForm.correctionReason || undefined,
        },
        { headers }
      );
      toast.success(data.message);
      setCorrecting(null);
      fetchRecords();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    }
  };

  const totalVisits = records.length;
  const gymIn = insideNow.length;
  const gymOut = records.filter((r) => r.checkOut).length;
  const unverified = records.filter((r) => !r.verified).length;

  if (loading && records.length === 0) return <Loading />;

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
          <CalendarCheck size={24} className="text-green-600" /> Attendance
        </h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-100"
          />
          {/* <button
            onClick={fetchRecords}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
          >
            <RefreshCcw size={15} />
          </button> */}
        </div>
      </div>

      {/* Stat widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Users size={17} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Visits</p>
            <p className="text-xl font-bold text-blue-700">{totalVisits}</p>
          </div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
            <LogIn size={17} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Gym In</p>
            <p className="text-xl font-bold text-green-700">{gymIn}</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <LogOut size={17} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Gym Out</p>
            <p className="text-xl font-bold text-amber-700">{gymOut}</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <ShieldAlert size={17} className="text-red-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">No Active Plan</p>
            <p className="text-xl font-bold text-red-700">{unverified}</p>
          </div>
        </div>
      </div>

      {/* Manual check-in / check-out — status aware */}
      {isToday && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
          <h3 className="font-semibold text-slate-800 mb-3 text-sm flex items-center gap-2">
            <UserCheck size={16} className="text-green-600" /> Check-in / Check-out
          </h3>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10"
            />
            <input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search member by name or phone..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100"
            />
            {memberResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 z-20 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {memberResults.map((m) => {
                  const isIn = !!openByMember[m.id];
                  const isLoading = actionLoadingId === m.id;
                  return (
                    <div key={m.id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {m.photo ? (
                          <Image
                            src={m.photo}
                            alt={m.fullName}
                            width={30}
                            height={30}
                            className="w-7.5 h-7.5 rounded-full object-cover border border-slate-200 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-7.5 h-7.5 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-semibold flex-shrink-0">
                            {m.fullName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {m.fullName}
                          </p>
                          <p className="text-xs text-slate-400">{m.phone}</p>
                        </div>
                      </div>
                      <button
                        disabled={isLoading}
                        onClick={() => handleAction(m.id)}
                        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 flex-shrink-0 ${
                          isIn
                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {isLoading ? (
                          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : isIn ? (
                          <LogOut size={13} />
                        ) : (
                          <LogIn size={13} />
                        )}
                        {isIn ? 'Check Out' : 'Check In'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            A member can check in and out multiple times a day — each check-in creates its own row,
            even for a repeat visit.
          </p>
        </div>
      )}

      {/* Currently Inside */}
      {isToday && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <DoorOpen size={16} className="text-green-600" /> Currently Inside
            </h3>
            <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">
              {insideNow.length} in gym
            </span>
          </div>
          {insideNow.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">
              Nobody is currently checked in
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {insideNow.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {r.member.photo ? (
                      <Image
                        src={r.member.photo}
                        alt={r.member.fullName}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-semibold flex-shrink-0">
                        {r.member.fullName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">
                        {r.member.fullName}
                      </p>
                      <p className="text-xs text-slate-400">
                        Checked in {timeAgo(r.checkIn)} ·{' '}
                        {new Date(r.checkIn).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <button
                    disabled={actionLoadingId === r.member.id}
                    onClick={() => handleAction(r.member.id)}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-60 flex-shrink-0"
                  >
                    {actionLoadingId === r.member.id ? (
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <LogOut size={13} />
                    )}
                    Check Out
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {records.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200 text-slate-400">
          No attendance records for this date
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">Full Log</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-slate-500 font-medium">Member</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-medium">Check-in</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-medium">Check-out</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-medium">Method</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-medium">Status</th>
                  <th className="text-right px-5 py-3 text-slate-500 font-medium">Correct</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {r.member.photo ? (
                          <Image
                            src={r.member.photo}
                            alt={r.member.fullName}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-semibold">
                            {r.member.fullName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-slate-800">{r.member.fullName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {new Date(r.checkIn).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {r.checkOut ? (
                        new Date(r.checkOut).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      ) : (
                        <span className="text-amber-600 text-xs bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                          Still in
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">{r.method}</td>
                    <td className="px-5 py-3">
                      {r.verified ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          <ShieldCheck size={12} /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          <ShieldAlert size={12} /> No active plan
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end">
                        <button
                          onClick={() => openCorrection(r)}
                          title="Correct"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {correcting && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4"
          onClick={() => setCorrecting(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Correct Attendance</h3>
              <button
                onClick={() => setCorrecting(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={saveCorrection} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Check-in time
                </label>
                <input
                  type="datetime-local"
                  value={correctionForm.checkIn}
                  onChange={(e) =>
                    setCorrectionForm({ ...correctionForm, checkIn: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Check-out time (optional)
                </label>
                <input
                  type="datetime-local"
                  value={correctionForm.checkOut}
                  onChange={(e) =>
                    setCorrectionForm({ ...correctionForm, checkOut: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Reason for correction{' '}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={correctionForm.correctionReason}
                  onChange={(e) =>
                    setCorrectionForm({ ...correctionForm, correctionReason: e.target.value })
                  }
                  placeholder="e.g. Device missed the scan"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium"
              >
                Save Correction
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
