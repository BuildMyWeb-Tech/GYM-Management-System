// components/orders/OrderDetail.jsx
'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { getBranchAuthHeader } from '@/lib/authHeader';
import Loading from '@/components/Loading';
import { Clock, User, ArrowLeft, CheckCircle2, CreditCard, Dumbbell } from 'lucide-react';

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
      <Link
        href={`${basePath}/orders`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft size={14} /> Back to Payments
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 sm:p-8">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-medium tracking-wide">PAYMENT RECEIPT</p>
              <h1 className="text-xl font-bold text-white mt-1">
                #{order.id.slice(-8).toUpperCase()}
              </h1>
              <Link
                href={`${basePath}/members/${order.member.id}`}
                className="text-sm text-slate-300 hover:text-white flex items-center gap-1.5 mt-2"
              >
                <User size={13} /> {order.member.fullName}
              </Link>
            </div>
            <span
              className={`text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 ${order.isPaid ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'}`}
            >
              <CheckCircle2 size={12} /> {order.isPaid ? 'Paid' : 'Awaiting Payment'}
            </span>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Items</p>
          <div className="divide-y divide-slate-100 border-y border-slate-100">
            {order.orderItems.map((item) => (
              <div key={item.id} className="flex justify-between py-3.5 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Dumbbell size={14} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-slate-800 font-medium">{item.name}</p>
                    <p className="text-xs text-slate-400">
                      {item.itemType.replace('_', ' ')} × {item.quantity}
                    </p>
                  </div>
                </div>
                <p className="text-slate-700 font-medium">
                  ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 text-sm mt-4 bg-slate-50 rounded-xl p-4">
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
            <div className="flex justify-between font-bold text-slate-800 text-lg pt-2 border-t border-slate-200 mt-2">
              <span>Total</span>
              <span>₹{order.total.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 text-sm text-slate-500">
            <CreditCard size={14} /> Paid via{' '}
            <span className="font-medium text-slate-700">{order.paymentMethod}</span>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Clock size={13} /> Timeline
            </h3>
            <div className="space-y-3">
              {order.timeline.map((t) => (
                <div key={t.id} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 flex justify-between">
                    <span className="text-slate-700">
                      {t.status}
                      {t.note ? ` — ${t.note}` : ''}
                    </span>
                    <span className="text-slate-400 text-xs whitespace-nowrap ml-2">
                      {new Date(t.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
