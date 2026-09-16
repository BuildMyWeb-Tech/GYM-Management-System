// components/reports/DailyClosingReport.jsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getBranchAuthHeader } from '@/lib/authHeader';
import Loading from '@/components/Loading';
import {
  FileText, Download, RefreshCw, TrendingUp, Users, CalendarCheck,
  CreditCard, ShoppingBag, UserPlus, RefreshCcw,
} from 'lucide-react';

const PAYMENT_LABELS = { CASH: 'Cash', UPI: 'UPI', CARD: 'Card', RAZORPAY: 'Razorpay' };
const PAYMENT_COLORS = {
  CASH: 'bg-green-100 text-green-700',
  UPI: 'bg-blue-100 text-blue-700',
  CARD: 'bg-purple-100 text-purple-700',
  RAZORPAY: 'bg-amber-100 text-amber-700',
};

function StatCard({ icon: Icon, label, value, sub, color = 'text-slate-800' }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <div className="p-2 rounded-lg bg-slate-50">
          <Icon size={18} className="text-slate-400" />
        </div>
      </div>
    </div>
  );
}

function todayIST() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];
}

function formatINR(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function downloadCSV(report) {
  const rows = [
    ['Time', 'Member', 'Plans', 'Amount', 'Payment Method', 'Status'],
    ...report.orders.map((o) => [
      o.time, o.memberName, o.plans, o.amount, o.paymentMethod, o.isPaid ? 'Paid' : 'Pending',
    ]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `closing-report-${report.date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DailyClosingReport() {
  const { getToken } = useAuth();
  const [date, setDate] = useState(todayIST());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (d) => {
    setLoading(true);
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.get(`/api/reports/daily-closing?date=${d}`, { headers });
      setReport(data);
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(date); }, [load, date]);

  const revenueBreakdown = report
    ? Object.entries(PAYMENT_LABELS)
        .filter(([k]) => (report.revenue[k.toLowerCase()] || 0) > 0)
        .map(([k, label]) => ({
          key: k, label, amount: report.revenue[k.toLowerCase()] || 0,
        }))
    : [];

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileText size={22} className="text-blue-600" /> Daily Closing Report
        </h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            max={todayIST()}
            onChange={(e) => setDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
          />
          <button
            onClick={() => load(date)}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500"
          >
            <RefreshCw size={16} />
          </button>
          {report && (
            <button
              onClick={() => downloadCSV(report)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              <Download size={14} /> Export CSV
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : !report ? null : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={TrendingUp} label="Total Revenue" value={formatINR(report.revenue.total)} color="text-green-700" />
            <StatCard icon={CreditCard} label="Paid Orders" value={report.paidOrders} sub={`of ${report.totalOrders} total`} />
            <StatCard icon={CalendarCheck} label="Attendance" value={report.totalAttendance} />
            <StatCard icon={UserPlus} label="New Members" value={report.newMembers} />
          </div>

          {/* Secondary row */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={RefreshCcw} label="Renewals" value={report.renewals} sub="members with prior history" color="text-blue-700" />
            <StatCard icon={ShoppingBag} label="Total Orders" value={report.totalOrders} />
          </div>

          {/* Revenue breakdown */}
          {revenueBreakdown.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="font-semibold text-slate-800 mb-4">Revenue by Payment Method</h2>
              <div className="flex flex-wrap gap-3">
                {revenueBreakdown.map(({ key, label, amount }) => (
                  <div key={key} className={`px-4 py-2 rounded-lg text-sm font-medium ${PAYMENT_COLORS[key] || 'bg-slate-100 text-slate-700'}`}>
                    {label}: {formatINR(amount)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Orders ({report.orders.length})</h2>
            </div>
            {report.orders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">No orders for this date</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="px-5 py-3 text-left">Time</th>
                      <th className="px-5 py-3 text-left">Member</th>
                      <th className="px-5 py-3 text-left">Plans</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-5 py-3 text-left">Method</th>
                      <th className="px-5 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {report.orders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{o.time}</td>
                        <td className="px-5 py-3 font-medium text-slate-800 max-w-[160px] truncate">{o.memberName}</td>
                        <td className="px-5 py-3 text-slate-600 max-w-[200px] truncate">{o.plans}</td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-800">{formatINR(o.amount)}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_COLORS[o.paymentMethod] || 'bg-slate-100 text-slate-600'}`}>
                            {PAYMENT_LABELS[o.paymentMethod] || o.paymentMethod}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${o.isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {o.isPaid ? 'Paid' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-semibold">
                      <td colSpan={3} className="px-5 py-3 text-slate-700">Total</td>
                      <td className="px-5 py-3 text-right text-slate-800">{formatINR(report.revenue.total)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
