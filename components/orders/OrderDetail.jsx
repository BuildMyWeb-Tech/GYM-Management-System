// components/orders/OrderDetail.jsx
'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { getBranchAuthHeader } from '@/lib/authHeader';
import Loading from '@/components/Loading';
import { Clock, User } from 'lucide-react';

export default function OrderDetail({ basePath, orderId }) {
  const { getToken } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const headers = await getBranchAuthHeader(getToken);
        const { data } = await axios.get(`/api/orders/${orderId}`, { headers });
        setOrder(data.order);
      } catch (error) {
        toast.error(error?.response?.data?.error || error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  if (loading) return <Loading />;
  if (!order) return null;

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28 max-w-2xl">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Order #{order.id.slice(-8).toUpperCase()}
            </h1>
            <Link
              href={`${basePath}/members/${order.member.id}`}
              className="text-sm text-slate-500 hover:text-green-600 flex items-center gap-1 mt-1"
            >
              <User size={13} /> {order.member.fullName}
            </Link>
          </div>
          <span
            className={`text-xs font-medium px-3 py-1 rounded-full ${order.isPaid ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}
          >
            {order.isPaid ? 'Paid' : 'Awaiting Payment'}
          </span>
        </div>

        <div className="divide-y divide-slate-100 border-y border-slate-100">
          {order.orderItems.map((item) => (
            <div key={item.id} className="flex justify-between py-3 text-sm">
              <div>
                <p className="text-slate-800">{item.name}</p>
                <p className="text-xs text-slate-400">
                  {item.itemType.replace('_', ' ')} × {item.quantity}
                </p>
              </div>
              <p className="text-slate-700 font-medium">
                ₹{(item.price * item.quantity).toLocaleString('en-IN')}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-1 text-sm mt-4">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>₹{order.subtotal.toLocaleString('en-IN')}</span>
          </div>
          {order.couponDiscount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Coupon ({order.couponCode})</span>
              <span>-₹{order.couponDiscount.toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-slate-800 text-base pt-1">
            <span>Total</span>
            <span>₹{order.total.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-slate-400 text-xs pt-1">
            <span>Payment Method</span>
            <span>{order.paymentMethod}</span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100">
          <h3 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
            <Clock size={14} /> Timeline
          </h3>
          <div className="space-y-2">
            {order.timeline.map((t) => (
              <div key={t.id} className="text-xs text-slate-500 flex justify-between">
                <span>
                  {t.status}
                  {t.note ? ` — ${t.note}` : ''}
                </span>
                <span>{new Date(t.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
