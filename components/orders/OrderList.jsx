// components/orders/OrderList.jsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getBranchAuthHeader } from '@/lib/authHeader';
import Loading from '@/components/Loading';
import { CreditCard, Plus, Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

const statusColors = {
  PENDING: 'bg-amber-50 text-amber-700',
  CONFIRMED: 'bg-green-50 text-green-700',
  ACTIVE: 'bg-blue-50 text-blue-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

export default function OrderList({ basePath }) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('ALL');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1 });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.get('/api/orders/list', {
        headers,
        params: { status, q, page, limit: 15 },
      });
      setOrders(data.orders);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  }, [status, q, page]);

  useEffect(() => {
    const t = setTimeout(fetchOrders, 300);
    return () => clearTimeout(t);
  }, [fetchOrders]);

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
          <CreditCard size={24} className="text-green-600" /> Payments
        </h1>
        <Link
          href={`${basePath}/checkout`}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
        >
          <Plus size={16} /> New Checkout
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search by member name or phone..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-100"
        >
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending Payment</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <Loading />
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200 text-slate-400">
          No payments found
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-5 py-3 text-slate-500 font-medium">Member</th>
                    <th className="text-left px-5 py-3 text-slate-500 font-medium">Items</th>
                    <th className="text-left px-5 py-3 text-slate-500 font-medium">Total</th>
                    <th className="text-left px-5 py-3 text-slate-500 font-medium">Payment</th>
                    <th className="text-left px-5 py-3 text-slate-500 font-medium">Status</th>
                    <th className="text-left px-5 py-3 text-slate-500 font-medium">Date</th>
                    <th className="text-right px-5 py-3 text-slate-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-5 py-3 font-medium text-slate-800">{o.member.fullName}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">
                        {o.orderItems.map((i) => i.name).join(', ')}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-700">
                        ₹{o.total.toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{o.paymentMethod}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${statusColors[o.status] || 'bg-slate-100 text-slate-500'}`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          <button
                            onClick={() => router.push(`${basePath}/orders/${o.id}`)}
                            title="View"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-slate-500">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
