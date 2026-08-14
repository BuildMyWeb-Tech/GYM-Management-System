// components/attendance/AttendanceLog.jsx
'use client';
import { useEffect, useState, useCallback } from 'react';
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
} from 'lucide-react';

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function AttendanceLog() {
  const { getToken } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayStr());

  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [checkInLoading, setCheckInLoading] = useState(false);

  const [correcting, setCorrecting] = useState(null);
  const [correctionForm, setCorrectionForm] = useState({
    checkIn: '',
    checkOut: '',
    correctionReason: '',
  });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
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
    fetchRecords();
  }, [fetchRecords]);

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

  const manualCheckIn = async (memberId) => {
    try {
      setCheckInLoading(true);
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.post('/api/attendance/manual', { memberId }, { headers });
      toast.success(data.message);
      setMemberSearch('');
      setMemberResults([]);
      fetchRecords();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setCheckInLoading(false);
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
    if (!correctionForm.correctionReason.trim()) {
      toast.error('A correction reason is required');
      return;
    }
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.put(
        '/api/attendance/correct',
        {
          id: correcting.id,
          checkIn: correctionForm.checkIn,
          checkOut: correctionForm.checkOut || null,
          correctionReason: correctionForm.correctionReason,
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

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
          <CalendarCheck size={24} className="text-green-600" /> Attendance
        </h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-100"
        />
      </div>

      {/* Manual check-in */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
        <h3 className="font-semibold text-slate-800 mb-3 text-sm">Manual Check-in / Check-out</h3>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Search member by name or phone..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100"
          />
        </div>
        {memberResults.length > 0 && (
          <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
            {memberResults.map((m) => (
              <button
                key={m.id}
                disabled={checkInLoading}
                onClick={() => manualCheckIn(m.id)}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm flex items-center justify-between"
              >
                <span>
                  <span className="font-medium text-slate-800">{m.fullName}</span>{' '}
                  <span className="text-slate-400 ml-2">{m.phone}</span>
                </span>
                <LogIn size={14} className="text-green-600" />
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-400 mt-2">
          Scanning an already-checked-in member's name here will check them out instead.
        </p>
      </div>

      {loading ? (
        <Loading />
      ) : records.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200 text-slate-400">
          No attendance records for this date
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Member</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Check-in</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Check-out</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Method</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Status</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium"></th>
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
                      <span className="text-amber-500 text-xs">Still in</span>
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
                    <button
                      onClick={() => openCorrection(r)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                  Reason for correction
                </label>
                <textarea
                  rows={2}
                  value={correctionForm.correctionReason}
                  onChange={(e) =>
                    setCorrectionForm({ ...correctionForm, correctionReason: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 resize-none"
                  required
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
