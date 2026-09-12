// components/checkout/Checkout.jsx
'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getBranchAuthHeader } from '@/lib/authHeader';
import { sendWhatsAppConfirmation } from '@/lib/whatsapp';
import Loading from '@/components/Loading';
import { Search, Check, Plus, Trash2, CreditCard, ShoppingCart, MessageCircle, Calendar, Info } from 'lucide-react';

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function computeRenewalPreview(activeMembership, cartPlanItems) {
  if (cartPlanItems.length === 0) return null;
  const today = startOfDay(new Date());
  let cursor = null;
  if (activeMembership) {
    const expiry = startOfDay(new Date(activeMembership.expiryDate));
    if (expiry >= today) cursor = expiry;
  }
  if (!cursor) cursor = today;
  return cartPlanItems.map((plan) => {
    const start = new Date(cursor);
    const end = new Date(start);
    end.setDate(end.getDate() + plan.durationDays);
    cursor = end;
    return { name: plan.name, startDate: start, endDate: end };
  });
}

export default function Checkout({ basePath }) {
  const { getToken } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [members, setMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [activeMembership, setActiveMembership] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [branchWhatsapp, setBranchWhatsapp] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const headers = await getBranchAuthHeader(getToken);
        const [planRes, settingsRes] = await Promise.all([
          axios.get('/api/membership-plan', { headers, params: { status: 'ACTIVE' } }),
          axios.get('/api/store/settings', { headers }),
        ]);
        setPlans(planRes.data.plans);
        setBranchWhatsapp(settingsRes.data.settings?.whatsappNumber || settingsRes.data.settings?.phone || '');
      } catch (error) {
        toast.error(error?.response?.data?.error || error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Fetch active membership when a member is selected
  useEffect(() => {
    if (!selectedMember) { setActiveMembership(null); return; }
    (async () => {
      try {
        const headers = await getBranchAuthHeader(getToken);
        const { data } = await axios.get(`/api/member/${selectedMember.id}`, { headers });
        setActiveMembership(data.activeMembership || null);
      } catch {
        setActiveMembership(null);
      }
    })();
  }, [selectedMember?.id]);

  useEffect(() => {
    if (!memberSearch.trim()) { setMembers([]); return; }
    const t = setTimeout(async () => {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.get('/api/member/list', { headers, params: { q: memberSearch, limit: 8 } });
      setMembers(data.members);
    }, 300);
    return () => clearTimeout(t);
  }, [memberSearch]);

  const isPlanSelected = (planId) => cart.some((c) => c.itemType === 'MEMBERSHIP_PLAN' && c.refId === planId);

  const togglePlan = (plan) => {
    if (isPlanSelected(plan.id)) {
      setCart((prev) => prev.filter((c) => !(c.itemType === 'MEMBERSHIP_PLAN' && c.refId === plan.id)));
    } else {
      setCart((prev) => [...prev, {
        key: `MEMBERSHIP_PLAN-${plan.id}`,
        itemType: 'MEMBERSHIP_PLAN',
        refId: plan.id,
        name: plan.name,
        price: plan.price,
        durationDays: plan.durationDays,
        quantity: 1,
      }]);
    }
  };

  const removeFromCart = (key) => setCart((prev) => prev.filter((c) => c.key !== key));

  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);

  const cartPlanItems = cart.filter((c) => c.itemType === 'MEMBERSHIP_PLAN');
  const renewalPreview = selectedMember ? computeRenewalPreview(activeMembership, cartPlanItems) : null;

  const handleCheckout = async () => {
    if (!selectedMember) { toast.error('Select a member first'); return; }
    if (cart.length === 0) { toast.error('Select at least one plan'); return; }

    try {
      setSubmitting(true);
      const headers = await getBranchAuthHeader(getToken);
      const payload = {
        memberId: selectedMember.id,
        items: cart.map((c) => ({ itemType: c.itemType, refId: c.refId, name: c.name, price: c.price, quantity: c.quantity })),
        couponCode: null,
        paymentMethod,
      };
      const { data } = await axios.post('/api/checkout/create', payload, { headers });

      toast.success('Payment completed successfully');

      // Auto-open WhatsApp confirmation — requires the receptionist to tap Send once inside WhatsApp
      sendWhatsAppConfirmation(data.order, branchWhatsapp);

      router.push(`${basePath}/orders/${data.order.id}`);
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
              <div>
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{selectedMember.fullName}</p>
                    <p className="text-xs text-slate-500">{selectedMember.phone}</p>
                  </div>
                  <button onClick={() => { setSelectedMember(null); setActiveMembership(null); }} className="text-xs text-green-700 hover:underline">Change</button>
                </div>
                {activeMembership ? (
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 px-1">
                    <Info size={12} className={activeMembership.daysRemaining <= 7 ? 'text-amber-500' : 'text-green-500'} />
                    <span>Active: <strong>{activeMembership.planName}</strong> — {activeMembership.daysRemaining} day{activeMembership.daysRemaining !== 1 ? 's' : ''} remaining (expires {formatDate(activeMembership.expiryDate)})</span>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 px-1">
                    <Info size={12} className="text-red-400" />
                    <span>No active membership — new plan will start from today</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search member by name or phone..."
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400" />
                {members.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-20 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {members.map((m) => (
                      <button key={m.id} onClick={() => { setSelectedMember(m); setMemberSearch(''); setMembers([]); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm flex items-center justify-between">
                        <span className="font-medium text-slate-800">{m.fullName}</span>
                        <span className="text-slate-400">{m.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Plan picker */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-slate-800 mb-3">2. Select Plan(s)</h3>
            {plans.length === 0 ? (
              <p className="text-sm text-slate-400">No active plans — add one from the Plans page first</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {plans.map((p) => {
                  const selected = isPlanSelected(p.id);
                  return (
                    <button key={p.id} onClick={() => togglePlan(p)}
                      className={`text-sm rounded-lg px-3.5 py-2.5 flex items-center gap-2 border transition-colors ${
                        selected
                          ? 'bg-green-600 border-green-600 text-white'
                          : 'border-slate-200 text-slate-700 hover:border-green-400 hover:bg-green-50'
                      }`}>
                      {selected ? <Check size={14} /> : <Plus size={14} />}
                      {p.name} — ₹{p.price.toLocaleString('en-IN')}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cart summary */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-fit lg:sticky lg:top-6">
          <h3 className="font-semibold text-slate-800 mb-3">Cart</h3>
          {cart.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No plans selected yet</p>
          ) : (
            <div className="space-y-2 mb-4">
              {cart.map((c) => (
                <div key={c.key} className="flex items-center justify-between text-sm border-b border-slate-50 pb-2">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-slate-700">{c.name}</p>
                    <p className="text-xs text-slate-400">₹{c.price.toLocaleString('en-IN')}</p>
                  </div>
                  <button onClick={() => removeFromCart(c.key)} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}

          {renewalPreview && renewalPreview.length > 0 && (
            <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                <Calendar size={12} /> Renewal Preview
              </p>
              {renewalPreview.map((p, i) => (
                <div key={i} className="text-xs text-slate-600">
                  <span className="font-medium text-slate-700">{p.name}</span>
                  <br />
                  <span className="text-slate-500">{formatDate(p.startDate)} → {formatDate(p.endDate)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1 text-sm border-t border-slate-100 pt-3">
            <div className="flex justify-between font-bold text-slate-800 text-base"><span>Total</span><span>₹{total.toLocaleString('en-IN')}</span></div>
          </div>

          <div className="mt-4">
            <p className="text-xs font-medium text-slate-600 mb-2">Payment Method</p>
            <div className="grid grid-cols-2 gap-2">
              {['CASH', 'UPI'].map((m) => (
                <button key={m} onClick={() => setPaymentMethod(m)}
                  className={`text-sm py-2.5 rounded-lg border font-medium ${paymentMethod === m ? 'bg-green-600 text-white border-green-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleCheckout} disabled={submitting}
            className="w-full mt-5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 rounded-xl font-medium disabled:opacity-60 flex items-center justify-center gap-2">
            {submitting ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <CreditCard size={16} />}
            {submitting ? 'Processing...' : `Complete Payment — ₹${total.toLocaleString('en-IN')}`}
          </button>

          <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
            <MessageCircle size={12} /> A WhatsApp confirmation will open automatically after payment
          </p>
        </div>
      </div>
    </div>
  );
}