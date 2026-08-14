// components/checkout/Checkout.jsx
'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import Script from 'next/script';
import { getBranchAuthHeader } from '@/lib/authHeader';
import Loading from '@/components/Loading';
import { Search, Plus, Minus, Trash2, Tag, CreditCard, ShoppingCart } from 'lucide-react';

export default function Checkout({ basePath }) {
  const { getToken } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [packages, setPackages] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [cart, setCart] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [submitting, setSubmitting] = useState(false);

  const [supplementName, setSupplementName] = useState('');
  const [supplementPrice, setSupplementPrice] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const headers = await getBranchAuthHeader(getToken);
        const [planRes, pkgRes] = await Promise.all([
          axios.get('/api/membership-plan', { headers, params: { status: 'ACTIVE' } }),
          axios.get('/api/pt-package', { headers }),
        ]);
        setPlans(planRes.data.plans);
        setPackages(pkgRes.data.packages.filter((p) => p.isActive));
      } catch (error) {
        toast.error(error?.response?.data?.error || error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!memberSearch.trim()) {
      setMembers([]);
      return;
    }
    const t = setTimeout(async () => {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.get('/api/member/list', {
        headers,
        params: { q: memberSearch, limit: 8 },
      });
      setMembers(data.members);
    }, 300);
    return () => clearTimeout(t);
  }, [memberSearch]);

  const addToCart = (itemType, item) => {
    setCart((prev) => {
      if (
        itemType === 'MEMBERSHIP_PLAN' &&
        prev.some((c) => c.itemType === 'MEMBERSHIP_PLAN' && c.refId === item.id)
      ) {
        toast('That plan is already in the cart', { icon: 'ℹ️' });
        return prev;
      }
      return [
        ...prev,
        {
          key: `${itemType}-${item.id || Date.now()}`,
          itemType,
          refId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        },
      ];
    });
  };

  const addSupplement = () => {
    if (!supplementName || !supplementPrice) {
      toast.error('Enter a name and price');
      return;
    }
    setCart((prev) => [
      ...prev,
      {
        key: `SUPPLEMENT-${Date.now()}`,
        itemType: 'SUPPLEMENT',
        name: supplementName,
        price: Number(supplementPrice),
        quantity: 1,
      },
    ]);
    setSupplementName('');
    setSupplementPrice('');
  };

  const updateQty = (key, delta) => {
    setCart((prev) =>
      prev.map((c) => (c.key === key ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c))
    );
  };

  const removeFromCart = (key) => setCart((prev) => prev.filter((c) => c.key !== key));

  const subtotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const total = Math.max(0, subtotal - couponDiscount);

  const applyCoupon = async () => {
    if (!couponCode || !selectedMember) return;
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.post(
        '/api/coupon/validate',
        { code: couponCode, memberId: selectedMember.id, subtotal },
        { headers }
      );
      setCouponDiscount(data.couponDiscount);
      toast.success(`Coupon applied — ₹${data.couponDiscount} off`);
    } catch (error) {
      setCouponDiscount(0);
      toast.error(error?.response?.data?.error || error.message);
    }
  };

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handleCheckout = async () => {
    if (!selectedMember) {
      toast.error('Select a member first');
      return;
    }
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      setSubmitting(true);
      const headers = await getBranchAuthHeader(getToken);
      const payload = {
        memberId: selectedMember.id,
        items: cart.map((c) => ({
          itemType: c.itemType,
          refId: c.refId,
          name: c.name,
          price: c.price,
          quantity: c.quantity,
        })),
        couponCode: couponDiscount > 0 ? couponCode : null,
        paymentMethod,
      };
      const { data } = await axios.post('/api/checkout/create', payload, { headers });

      if (!data.requiresPayment) {
        toast.success('Order completed successfully');
        router.push(`${basePath}/orders/${data.order.id}`);
        return;
      }

      const ok = await loadRazorpayScript();
      if (!ok) {
        toast.error('Failed to load payment gateway');
        return;
      }

      const rzp = new window.Razorpay({
        key: data.razorpay.keyId,
        amount: data.razorpay.amount,
        currency: data.razorpay.currency,
        order_id: data.razorpay.orderId,
        name: selectedMember.fullName,
        description: 'Membership purchase',
        handler: async (response) => {
          try {
            const verifyHeaders = await getBranchAuthHeader(getToken);
            await axios.post(
              '/api/checkout/razorpay-verify',
              {
                orderId: data.order.id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
              { headers: verifyHeaders }
            );
            toast.success('Payment verified — membership activated');
            router.push(`${basePath}/orders/${data.order.id}`);
          } catch (error) {
            toast.error('Payment succeeded but verification failed — contact support');
          }
        },
        theme: { color: '#16a34a' },
      });
      rzp.open();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <ShoppingCart size={24} className="text-green-600" /> Checkout
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Member picker */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-3">1. Select Member</h3>
            {selectedMember ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <div>
                  <p className="font-medium text-slate-800 text-sm">{selectedMember.fullName}</p>
                  <p className="text-xs text-slate-500">{selectedMember.phone}</p>
                </div>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="text-xs text-green-700 hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search member by name or phone..."
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100"
                />
                {members.length > 0 && (
                  <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                    {members.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedMember(m);
                          setMemberSearch('');
                          setMembers([]);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm"
                      >
                        <span className="font-medium text-slate-800">{m.fullName}</span>
                        <span className="text-slate-400 ml-2">{m.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Item picker */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-3">2. Add Items</h3>
            <p className="text-xs text-slate-500 mb-2 font-medium">Membership Plans</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {plans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart('MEMBERSHIP_PLAN', p)}
                  className="text-xs border border-slate-200 hover:border-green-400 hover:bg-green-50 rounded-lg px-3 py-2 flex items-center gap-1.5"
                >
                  <Plus size={12} /> {p.name} — ₹{p.price.toLocaleString('en-IN')}
                </button>
              ))}
              {plans.length === 0 && (
                <p className="text-xs text-slate-400">
                  No active plans — add one under Plans first
                </p>
              )}
            </div>

            <p className="text-xs text-slate-500 mb-2 font-medium">PT Packages</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {packages.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart('PT_PACKAGE', p)}
                  className="text-xs border border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-lg px-3 py-2 flex items-center gap-1.5"
                >
                  <Plus size={12} /> {p.name} — ₹{p.price.toLocaleString('en-IN')}
                </button>
              ))}
              {packages.length === 0 && (
                <p className="text-xs text-slate-400">No PT packages set up yet</p>
              )}
            </div>

            <p className="text-xs text-slate-500 mb-2 font-medium">Custom / Supplement Item</p>
            <div className="flex gap-2">
              <input
                value={supplementName}
                onChange={(e) => setSupplementName(e.target.value)}
                placeholder="Item name"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100"
              />
              <input
                value={supplementPrice}
                onChange={(e) => setSupplementPrice(e.target.value)}
                placeholder="₹"
                type="number"
                className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100"
              />
              <button
                onClick={addSupplement}
                className="bg-slate-100 hover:bg-slate-200 px-3 rounded-lg"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Cart summary */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-fit lg:sticky lg:top-6">
          <h3 className="font-semibold text-slate-800 mb-3">Cart</h3>
          {cart.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No items yet</p>
          ) : (
            <div className="space-y-2 mb-4">
              {cart.map((c) => (
                <div
                  key={c.key}
                  className="flex items-center justify-between text-sm border-b border-slate-50 pb-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-slate-700">{c.name}</p>
                    <p className="text-xs text-slate-400">
                      ₹{c.price.toLocaleString('en-IN')} × {c.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {c.itemType === 'SUPPLEMENT' && (
                      <>
                        <button
                          onClick={() => updateQty(c.key, -1)}
                          className="p-1 hover:bg-slate-100 rounded"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-xs w-4 text-center">{c.quantity}</span>
                        <button
                          onClick={() => updateQty(c.key, 1)}
                          className="p-1 hover:bg-slate-100 rounded"
                        >
                          <Plus size={12} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => removeFromCart(c.key)}
                      className="p-1 hover:bg-red-50 text-red-500 rounded"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Coupon code"
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-green-100"
              />
            </div>
            <button
              onClick={applyCoupon}
              className="text-xs bg-slate-100 hover:bg-slate-200 px-3 rounded-lg"
            >
              Apply
            </button>
          </div>

          <div className="space-y-1 text-sm border-t border-slate-100 pt-3">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            {couponDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Coupon</span>
                <span>-₹{couponDiscount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-slate-800 text-base pt-1">
              <span>Total</span>
              <span>₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs font-medium text-slate-600 mb-2">Payment Method</p>
            <div className="grid grid-cols-2 gap-2">
              {['CASH', 'UPI', 'CARD', 'RAZORPAY'].map((m) => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`text-xs py-2 rounded-lg border font-medium ${paymentMethod === m ? 'bg-green-600 text-white border-green-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {m === 'RAZORPAY' ? 'Online' : m}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={submitting}
            className="w-full mt-5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 rounded-xl font-medium disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <CreditCard size={16} />
            )}
            {submitting ? 'Processing...' : `Complete Payment — ₹${total.toLocaleString('en-IN')}`}
          </button>
        </div>
      </div>
    </div>
  );
}
