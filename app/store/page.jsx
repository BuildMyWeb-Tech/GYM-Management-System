// app/store/page.jsx
'use client';
import Loading from '@/components/Loading';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import {
  Users,
  CalendarCheck,
  UserCheck,
  UserX,
  Briefcase,
  IndianRupee,
  ShoppingCart,
  RefreshCcw,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

function StatCard({ title, value, icon: Icon, color, sub }) {
  const colorMap = {
    green: {
      bg: 'bg-green-50',
      icon: 'bg-green-100 text-green-600',
      border: 'border-green-100',
      val: 'text-green-700',
    },
    blue: {
      bg: 'bg-blue-50',
      icon: 'bg-blue-100 text-blue-600',
      border: 'border-blue-100',
      val: 'text-blue-700',
    },
    amber: {
      bg: 'bg-amber-50',
      icon: 'bg-amber-100 text-amber-600',
      border: 'border-amber-100',
      val: 'text-amber-700',
    },
    red: {
      bg: 'bg-red-50',
      icon: 'bg-red-100 text-red-600',
      border: 'border-red-100',
      val: 'text-red-700',
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'bg-purple-100 text-purple-600',
      border: 'border-purple-100',
      val: 'text-purple-700',
    },
    slate: {
      bg: 'bg-slate-50',
      icon: 'bg-slate-100 text-slate-600',
      border: 'border-slate-100',
      val: 'text-slate-700',
    },
  };
  const c = colorMap[color] || colorMap.slate;
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-5 flex items-center gap-4 shadow-sm`}>
      <div className={`rounded-xl p-3 ${c.icon} flex-shrink-0`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">{title}</p>
        <p className={`text-2xl font-bold mt-0.5 ${c.val}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function StoreDashboard() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState(null);

  const getAuthHeader = async () => {
    const empToken = typeof window !== 'undefined' ? localStorage.getItem('employeeToken') : null;
    if (empToken) return { Authorization: `Bearer ${empToken}` };
    const token = await getToken();
    return { Authorization: `Bearer ${token}` };
  };

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeader();
      const { data } = await axios.get('/api/store/dashboard', { headers });
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
    <div className="px-3 sm:px-6 py-4 sm:py-6 text-slate-600 pb-28 space-y-8">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
            {dash.branch?.name || 'Branch'} Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Status:{' '}
            <span
              className={
                dash.branch?.isActive ? 'text-green-600 font-medium' : 'text-red-500 font-medium'
              }
            >
              {dash.branch?.status}
            </span>
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
        <StatCard title="Total Members" value={dash.totalMembers} icon={Users} color="blue" />
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
          title="Today's Attendance"
          value={dash.todayAttendance}
          icon={CalendarCheck}
          color="amber"
        />
        <StatCard
          title="Receptionists"
          value={dash.totalEmployees}
          icon={Briefcase}
          color="purple"
        />
        <StatCard title="Total Orders" value={dash.totalOrders} icon={ShoppingCart} color="slate" />
        <StatCard
          title="Total Revenue"
          value={`₹${Number(dash.totalRevenue || 0).toLocaleString('en-IN')}`}
          icon={IndianRupee}
          color="green"
        />
      </div>

      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center text-sm text-slate-400">
        Attendance trends, revenue charts, and membership breakdowns will populate here as members
        and attendance data come online in later phases.
      </div>
    </div>
  );
}
