// app/admin/page.jsx
'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Loading from '@/components/Loading';
import {
  Building2,
  Users,
  UserCheck,
  UserX,
  Snowflake,
  Briefcase,
  CalendarCheck,
  IndianRupee,
  RefreshCcw,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const BRANCH_COLORS = {
  ACTIVE: '#16a34a',
  PENDING: '#f59e0b',
  REJECTED: '#ef4444',
  INACTIVE: '#94a3b8',
};
const MEMBERSHIP_COLORS = { Active: '#16a34a', Expired: '#ef4444', Frozen: '#3b82f6' };

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

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/admin/dashboard', { withCredentials: true });
      setDash(data.dashboardData);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading || !dash) return <Loading />;

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Platform Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            All branches, members, and revenue at a glance
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg text-slate-700 text-sm transition-all"
        >
          <RefreshCcw size={14} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard title="Total Branches" value={dash.totalBranches} icon={Building2} color="blue" />
        <StatCard
          title="Active Branches"
          value={dash.activeBranches}
          icon={Building2}
          color="green"
        />
        <StatCard
          title="Pending Approval"
          value={dash.pendingBranches}
          icon={Building2}
          color="amber"
        />
        <StatCard title="Total Members" value={dash.totalMembers} icon={Users} color="purple" />
        <StatCard
          title="Active Memberships"
          value={dash.activeMemberships}
          icon={UserCheck}
          color="green"
        />
        <StatCard
          title="Expired Memberships"
          value={dash.expiredMemberships}
          icon={UserX}
          color="red"
        />
        <StatCard
          title="Frozen Memberships"
          value={dash.frozenMemberships}
          icon={Snowflake}
          color="blue"
        />
        <StatCard
          title="Receptionists"
          value={dash.totalEmployees}
          icon={Briefcase}
          color="slate"
        />
        <StatCard
          title="Today's Attendance"
          value={dash.todayAttendance}
          icon={CalendarCheck}
          color="amber"
        />
        <StatCard
          title="Total Revenue"
          value={`₹${dash.totalRevenue.toLocaleString('en-IN')}`}
          icon={IndianRupee}
          color="green"
        />
        <StatCard
          title="Platform Commission"
          value={`₹${dash.totalCommission.toLocaleString('en-IN')}`}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Revenue Trend (Last 14 Days)</h3>
          {dash.revenueTrend.every((d) => d.revenue === 0) ? (
            <div className="h-56 flex items-center justify-center text-slate-400 text-sm">
              No revenue in this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dash.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip formatter={(v) => `₹${v}`} />
                <Bar dataKey="revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Top 5 Branches by Revenue</h3>
          {dash.topBranches.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-slate-400 text-sm">
              No orders yet
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              {dash.topBranches.map((b, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-sm text-slate-700">{b.name}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-800">
                    ₹{b.revenue.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Branch Status Distribution</h3>
          {dash.branchStatusPie.every((d) => d.value === 0) ? (
            <div className="h-56 flex items-center justify-center text-slate-400 text-sm">
              No branches yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={dash.branchStatusPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {dash.branchStatusPie.map((entry, i) => (
                    <Cell key={i} fill={BRANCH_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Membership Status Distribution</h3>
          {dash.membershipStatusPie.every((d) => d.value === 0) ? (
            <div className="h-56 flex items-center justify-center text-slate-400 text-sm">
              No memberships yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={dash.membershipStatusPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {dash.membershipStatusPie.map((entry, i) => (
                    <Cell key={i} fill={MEMBERSHIP_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
