// components/notifications/RemindersPanel.jsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getBranchAuthHeader } from '@/lib/authHeader';
import Loading from '@/components/Loading';
import {
  Bell, RefreshCw, Send, CheckCircle2, XCircle, Clock,
  Users, AlertTriangle, ExternalLink, MessageCircle, ChevronDown, ChevronUp,
} from 'lucide-react';

function StatusBadge({ status }) {
  if (!status) return <span className="text-xs text-slate-400">Not sent</span>;
  const map = {
    SENT: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700',
    PENDING: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || 'bg-slate-100 text-slate-500'}`}>
      {status}
    </span>
  );
}

function SendBtn({ onClick, loading, sent }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
    >
      {loading ? (
        <span className="w-3 h-3 border border-green-600/40 border-t-green-600 rounded-full animate-spin" />
      ) : sent ? (
        <CheckCircle2 size={12} />
      ) : (
        <Send size={12} />
      )}
      {sent ? 'Resend' : 'Send'}
    </button>
  );
}

// ── Expiry Reminders Tab ──────────────────────────────────────────────────────

function ExpiryRemindersTab({ basePath }) {
  const { getToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState({});
  const [expanded, setExpanded] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data: d } = await axios.get('/api/notifications/expiry-reminders', { headers });
      setData(d);
      const exp = {};
      d.groups?.forEach((g) => { exp[g.daysUntilExpiry] = true; });
      setExpanded(exp);
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  const sendOne = async (member) => {
    const key = member.membershipId;
    setSending((p) => ({ ...p, [key]: true }));
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data: r } = await axios.post('/api/notifications/expiry-reminders', {
        memberId: member.memberId,
        membershipId: member.membershipId,
      }, { headers });

      if (r.method === 'link' && r.fallbackUrl) {
        window.open(r.fallbackUrl, '_blank', 'noopener');
        toast.success('WhatsApp opened — tap Send in the app');
      } else {
        toast.success(`Reminder sent to ${member.fullName}`);
      }
      load();
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message);
    } finally {
      setSending((p) => ({ ...p, [key]: false }));
    }
  };

  const sendAll = async () => {
    if (!data?.groups) return;
    const pending = data.groups.flatMap((g) =>
      g.members.filter((m) => !m.lastNotification || m.lastNotification.status !== 'SENT')
    );
    if (pending.length === 0) { toast('No pending reminders'); return; }
    for (const m of pending) await sendOne(m);
  };

  if (loading) return <Loading />;
  if (!data?.groups?.length) {
    return (
      <div className="flex flex-col items-center py-16 text-slate-400">
        <CheckCircle2 size={40} className="mb-3 text-green-400" />
        <p className="font-medium text-slate-600">No memberships expiring in the next 7 days</p>
      </div>
    );
  }

  const pendingCount = data.groups.flatMap((g) =>
    g.members.filter((m) => !m.lastNotification || m.lastNotification.status !== 'SENT')
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-800">{data.total}</span> memberships expiring •{' '}
          <span className="font-semibold text-amber-600">{pendingCount}</span> reminders pending
        </p>
        <button onClick={sendAll} className="flex items-center gap-2 text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          <Send size={14} /> Send All Pending
        </button>
      </div>

      {data.groups.map((group) => (
        <div key={group.daysUntilExpiry} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50"
            onClick={() => setExpanded((p) => ({ ...p, [group.daysUntilExpiry]: !p[group.daysUntilExpiry] }))}
          >
            <div className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${group.daysUntilExpiry <= 1 ? 'bg-red-500' : group.daysUntilExpiry <= 3 ? 'bg-amber-500' : 'bg-yellow-400'}`} />
              <span className="font-semibold text-slate-800 text-sm">{group.label}</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{group.count}</span>
            </div>
            {expanded[group.daysUntilExpiry] ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>

          {expanded[group.daysUntilExpiry] && (
            <div className="divide-y divide-slate-50">
              {group.members.map((m) => (
                <div key={m.membershipId} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{m.fullName}</p>
                    <p className="text-xs text-slate-500">{m.phone} • {m.planName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Expires {new Date(m.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <StatusBadge status={m.lastNotification?.status} />
                    <SendBtn
                      onClick={() => sendOne(m)}
                      loading={!!sending[m.membershipId]}
                      sent={m.lastNotification?.status === 'SENT'}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Payment Due Tab ───────────────────────────────────────────────────────────

function PaymentDueTab() {
  const { getToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async (q = '', pg = 1) => {
    setLoading(true);
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data: d } = await axios.get('/api/notifications/pending-renewals', {
        headers, params: { q, page: pg, limit: 20 },
      });
      setData(d);
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(search, page); }, [load, search, page]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(search, 1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const sendReminder = async (member) => {
    setSending((p) => ({ ...p, [member.id]: true }));
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data: r } = await axios.post('/api/notifications/pending-renewals', { memberId: member.id }, { headers });
      if (r.method === 'link' && r.fallbackUrl) {
        window.open(r.fallbackUrl, '_blank', 'noopener');
        toast.success('WhatsApp opened — tap Send in the app');
      } else {
        toast.success(`Reminder sent to ${member.fullName}`);
      }
      load(search, page);
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message);
    } finally {
      setSending((p) => ({ ...p, [member.id]: false }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone…"
          className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
        />
      </div>

      {loading ? (
        <Loading />
      ) : !data?.members?.length ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <CheckCircle2 size={40} className="mb-3 text-green-400" />
          <p className="font-medium text-slate-600">No pending renewals found</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-500">{data.pagination.total} members with expired plans</p>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-50">
            {data.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{m.fullName}</p>
                  <p className="text-xs text-slate-500">{m.phone}</p>
                  {m.lastPlanName && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Last plan: {m.lastPlanName}
                      {m.daysSinceExpiry !== null && ` • expired ${m.daysSinceExpiry}d ago`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={m.lastNotification?.status} />
                  <SendBtn
                    onClick={() => sendReminder(m)}
                    loading={!!sending[m.id]}
                    sent={m.lastNotification?.status === 'SENT'}
                  />
                </div>
              </div>
            ))}
          </div>

          {data.pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40">Prev</button>
              <span className="px-3 py-1.5 text-sm text-slate-600">{page} / {data.pagination.totalPages}</span>
              <button disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export default function RemindersPanel({ basePath }) {
  const { getToken } = useAuth();
  const [tab, setTab] = useState('expiry');
  const [runningCron, setRunningCron] = useState(false);

  const runCron = async () => {
    setRunningCron(true);
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.get('/api/cron/expiry-reminders', { headers });
      toast.success(`Auto-check done: ${data.sent} sent, ${data.skipped} skipped`);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Auto-check failed');
    } finally {
      setRunningCron(false);
    }
  };

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Bell size={22} className="text-amber-500" /> Reminders
        </h1>
        <button
          onClick={runCron}
          disabled={runningCron}
          className="flex items-center gap-2 text-sm px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={runningCron ? 'animate-spin' : ''} />
          Run Auto-Check
        </button>
      </div>

      <div className="flex border-b border-slate-200 mb-6 gap-1">
        {[
          { key: 'expiry', label: 'Expiry Alerts', icon: AlertTriangle },
          { key: 'payment', label: 'Payment Due', icon: MessageCircle },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key
                ? 'border-green-500 text-green-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'expiry' ? <ExpiryRemindersTab basePath={basePath} /> : <PaymentDueTab />}
    </div>
  );
}
