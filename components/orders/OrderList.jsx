// components/orders/OrderList.jsx
'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { getBranchAuthHeader } from '@/lib/authHeader';
import Loading from '@/components/Loading';
import { ShoppingCart, Plus } from 'lucide-react';

const statusColors = {
  PENDING: 'bg-amber-50 text-amber-700',
  CONFIRMED: 'bg-green-50 text-green-700',
  ACTIVE: 'bg-blue-50 text-blue-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

export default function OrderList({ basePath }) {
  const { getToken } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('ALL');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const headers = await getBranchAuthHeader(getToken);
        const { data } = await axios.get('/api/orders/list', {
          headers,
          params: { status, limit: 30 },
        });
        setOrders(data.orders);
      } catch (error) {
        toast.error(error?.response?.data?.error || error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [status]);

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
          <ShoppingCart size={24} className="text-green-600" /> Orders
        </h1>
        <Link
          href={`${basePath}/checkout`}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
        >
          <Plus size={16} /> New Checkout
        </Link>
      </div>

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="mb-4 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-100"
      >
        <option value="ALL">All Status</option>
        <option value="PENDING">Pending Payment</option>
        <option value="CONFIRMED">Confirmed</option>
        <option value="CANCELLED">Cancelled</option>
      </select>

      {loading ? (
        <Loading />
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200 text-slate-400">
          No orders yet
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Member</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Items</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Total</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Status</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-slate-50 hover:bg-slate-50/60 cursor-pointer"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`${basePath}/orders/${o.id}`}
                      className="font-medium text-slate-800 hover:text-green-600"
                    >
                      {o.member.fullName}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">
                    {o.orderItems.map((i) => i.name).join(', ')}
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-700">
                    ₹{o.total.toLocaleString('en-IN')}
                  </td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
