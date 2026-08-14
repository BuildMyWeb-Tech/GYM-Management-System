// components/reports/ReportsDashboard.jsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getBranchAuthHeader } from '@/lib/authHeader';
import Loading from '@/components/Loading';
import {
  IndianRupee,
  Users,
  CalendarCheck,
  TrendingUp,
  Download,
  RefreshCcw,
  UserCheck,
  UserX,
  Snowflake,
  UserPlus,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'year', label: 'This Year' },
];

function StatCard({ title, value, icon: Icon, color }) {
  const colorMap = {
    green: { bg: 'bg-green-50', icon: 'bg-green-100 text-green-600', val: 'text-green-700' },
    blue: { bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-600', val: 'text-blue-700' },
    amber: { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600', val: 'text-amber-700' },
    red: { bg: 'bg-red-50', icon: 'bg-red-100 text-red-600', val: 'text-red-700' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', val: 'text-purple-700' },
    slate: { bg: 'bg-slate-50', icon: 'bg-slate-100 text-slate-600', val: 'text-slate-700' },
  };
  const c = colorMap[color] || colorMap.slate;
  return (
    <div
      className={`rounded-xl border border-slate-100 ${c.bg} p-4 flex items-center gap-3 shadow-sm`}
    >
      <div className={`rounded-lg p-2.5 ${c.icon} flex-shrink-0`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-slate-500 text-xs font-medium">{title}</p>
        <p className={`text-xl font-bold ${c.val}`}>{value}</p>
      </div>
    </div>
  );
}

export default function ReportsDashboard({ isAdmin = false }) {
  const { getToken } = useAuth();
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [attendanceTrend, setAttendanceTrend] = useState([]);
  const [topAttendees, setTopAttendees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const headers = await getBranchAuthHeader(getToken);
      try {
        const { data } = await axios.get('/api/admin/stores', { headers });
        setBranches(data.branches || []);
      } catch {
        /* non-fatal */
      }
    })();
  }, [isAdmin]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getBranchAuthHeader(getToken);
      const params = { period, ...(branchFilter ? { branchId: branchFilter } : {}) };

      const [summaryRes, revenueRes, attendanceRes] = await Promise.all([
        axios.get('/api/reports/summary', { headers, params }),
        axios.get('/api/reports/revenue-trend', { headers, params }),
        axios.get('/api/reports/attendance-trend', { headers, params }),
      ]);

      setSummary(summaryRes.data.summary);
      setRevenueTrend(revenueRes.data.trend);
      setAttendanceTrend(attendanceRes.data.trend);
      setTopAttendees(attendanceRes.data.topAttendees);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  }, [period, branchFilter]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const exportReport = async (type) => {
    try {
      const headers = await getBranchAuthHeader(getToken);
      const params = {
        period,
        type,
        format: 'csv',
        ...(branchFilter ? { branchId: branchFilter } : {}),
      };
      const response = await axios.get('/api/reports/export', {
        headers,
        params,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}-report-${period}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Export failed');
    }
  };

  if (loading || !summary) return <Loading />;

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Reports</h1>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-100"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`text-xs px-3 py-2 rounded-lg font-medium ${period === p.id ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={fetchAll}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
          >
            <RefreshCcw size={14} />
          </button>
        </div>
      </div>

      {/* Revenue stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard
          title="Revenue"
          value={`₹${summary.revenue.toLocaleString('en-IN')}`}
          icon={IndianRupee}
          color="green"
        />
        <StatCard title="Orders" value={summary.orders} icon={TrendingUp} color="blue" />
        <StatCard
          title="Avg. Order Value"
          value={`₹${summary.aov.toLocaleString('en-IN')}`}
          icon={IndianRupee}
          color="purple"
        />
        <StatCard
          title="Today's Attendance"
          value={summary.todayAttendance}
          icon={CalendarCheck}
          color="amber"
        />
      </div>

      {/* Member stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Active Members"
          value={summary.activeMembers}
          icon={UserCheck}
          color="green"
        />
        <StatCard title="Expired Members" value={summary.expiredMembers} icon={UserX} color="red" />
        <StatCard title="New This Period" value={summary.newMembers} icon={UserPlus} color="blue" />
        <StatCard
          title="Commission Paid"
          value={`₹${summary.commissionEarned.toLocaleString('en-IN')}`}
          icon={IndianRupee}
          color="slate"
        />
      </div>

      {summary.topBranch && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">Top performing branch this period</p>
          <p className="font-semibold text-slate-800">
            {summary.topBranch.name} — ₹{summary.topBranch.revenue.toLocaleString('en-IN')}
          </p>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Revenue Trend</h3>
          {revenueTrend.every((d) => d.revenue === 0) ? (
            <div className="h-56 flex items-center justify-center text-slate-400 text-sm">
              No revenue in this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip formatter={(v) => `₹${v}`} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Attendance Trend</h3>
          {attendanceTrend.every((d) => d.count === 0) ? (
            <div className="h-56 flex items-center justify-center text-slate-400 text-sm">
              No attendance in this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top attendees */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Most Frequent Members (This Period)</h3>
        </div>
        {topAttendees.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No attendance data yet</div>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {topAttendees.map((a, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-2.5 text-slate-700">{a.name}</td>
                  <td className="px-5 py-2.5 text-right font-medium text-slate-600">
                    {a.count} visits
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Exports */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => exportReport('orders')}
          className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium"
        >
          <Download size={15} /> Export Revenue (CSV)
        </button>
        <button
          onClick={() => exportReport('attendance')}
          className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium"
        >
          <Download size={15} /> Export Attendance (CSV)
        </button>
      </div>
    </div>
  );
}
