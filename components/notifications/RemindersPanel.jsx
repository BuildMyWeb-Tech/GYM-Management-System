// components/notifications/RemindersPanel.jsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getBranchAuthHeader } from '@/lib/authHeader';
import Loading from '@/components/Loading';
import {
  Bell, RefreshCw, Send, CheckCircle2, Clock,
  AlertTriangle, MessageCircle, ChevronDown, ChevronUp, Wifi, WifiOff,
  RotateCcw, History, ListChecks, Square, CheckSquare,
} from 'lucide-react';

// ── Shared sub-components ─────────────────────────────────────────────────────

function StatusBadge({ status, method }) {
  if (!status) return <span className="text-xs text-slate-400">Not sent</span>;

  if (status === 'SENT') {
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
        <CheckCircle2 size={10} /> Sent
      </span>
    );
  }
  if (status === 'FAILED') {
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
        <AlertTriangle size={10} /> Failed
      </span>
    );
  }
  if (status === 'PENDING') {
    const isBaileys = method === 'baileys';
    return (
      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${isBaileys ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
        {isBaileys
          ? <><span className="w-2 h-2 border border-blue-600/40 border-t-blue-600 rounded-full animate-spin" /> Sending…</>
          : <><Clock size={10} /> Pending</>
        }
      </span>
    );
  }
  return <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{status}</span>;
}

function ActionBtn({ status, onClick, loading }) {
  if (status === 'SENT') {
    return (
      <span className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 cursor-default select-none">
        <CheckCircle2 size={12} /> Already Sent
      </span>
    );
  }
  if (status === 'FAILED') {
    return (
      <button
        onClick={onClick}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-50 transition-colors"
      >
        {loading
          ? <span className="w-3 h-3 border border-orange-600/40 border-t-orange-600 rounded-full animate-spin" />
          : <RotateCcw size={12} />}
        Retry
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
    >
      {loading
        ? <span className="w-3 h-3 border border-green-600/40 border-t-green-600 rounded-full animate-spin" />
        : <Send size={12} />}
      Send
    </button>
  );
}

function WAStatusBanner({ ready }) {
  if (ready) {
    return (
      <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700">
        <Wifi size={13} />
        <span>WhatsApp connected — reminders send automatically via your gym's WhatsApp</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
      <WifiOff size={13} />
      <span>WhatsApp not connected — go to <strong>Broadcast → WA Connect</strong> to scan the QR and enable automatic sending</span>
    </div>
  );
}

// ── Expiry Reminders Tab ──────────────────────────────────────────────────────

function ExpiryRemindersTab() {
  const { getToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState({});
  const [view, setView] = useState('pending');
  const [selected, setSelected] = useState(new Set());
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

  const allMembers = data?.groups?.flatMap((g) => g.members) || [];
  const pendingMembers = allMembers.filter((m) => m.lastNotification?.status !== 'SENT');
  const historyMembers = allMembers.filter((m) => m.lastNotification?.status === 'SENT');

  const sendOne = async (member) => {
    const key = member.membershipId;
    setSending((p) => ({ ...p, [key]: true }));
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data: r } = await axios.post('/api/notifications/expiry-reminders', {
        memberId: member.memberId,
        membershipId: member.membershipId,
      }, { headers });

      if (r.method === 'baileys') {
        toast.success(`Reminder queued for ${member.fullName} via WhatsApp`);
      } else {
        toast.success(`Reminder sent to ${member.fullName}`);
      }
      setSelected((p) => { const n = new Set(p); n.delete(key); return n; });
      load();
    } catch (e) {
      const status = e?.response?.status;
      if (status === 503) {
        toast.error('WhatsApp not connected. Scan QR in Broadcast → WA Connect tab.');
      } else {
        toast.error(e?.response?.data?.error || e.message);
      }
    } finally {
      setSending((p) => ({ ...p, [key]: false }));
    }
  };

  const sendSelected = async () => {
    const toSend = pendingMembers.filter((m) => selected.has(m.membershipId));
    if (!toSend.length) { toast('No members selected'); return; }
    for (const m of toSend) await sendOne(m);
  };

  const sendAllPending = async () => {
    if (!pendingMembers.length) { toast('No pending reminders'); return; }
    for (const m of pendingMembers) await sendOne(m);
  };

  const toggleSelect = (membershipId) => {
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(membershipId)) n.delete(membershipId); else n.add(membershipId);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === pendingMembers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingMembers.map((m) => m.membershipId)));
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-4">
      <WAStatusBanner ready={!!data?.isWhatsAppReady} />

      {!data?.groups?.length ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <CheckCircle2 size={40} className="mb-3 text-green-400" />
          <p className="font-medium text-slate-600">No memberships expiring in the next 3 days</p>
        </div>
      ) : (
        <>
          {/* View toggle + counters */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setView('pending')}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                  view === 'pending' ? 'bg-amber-50 text-amber-700' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <ListChecks size={14} />
                Pending
                {pendingMembers.length > 0 && (
                  <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">{pendingMembers.length}</span>
                )}
              </button>
              <button
                onClick={() => setView('history')}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-l border-slate-200 transition-colors ${
                  view === 'history' ? 'bg-green-50 text-green-700' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <History size={14} />
                Sent
                {historyMembers.length > 0 && (
                  <span className="ml-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">{historyMembers.length}</span>
                )}
              </button>
            </div>

            {view === 'pending' && pendingMembers.length > 0 && (
              <div className="flex items-center gap-2">
                {selected.size > 0 && (
                  <button
                    onClick={sendSelected}
                    className="flex items-center gap-2 text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Send size={14} /> Send Selected ({selected.size})
                  </button>
                )}
                <button
                  onClick={sendAllPending}
                  className="flex items-center gap-2 text-sm px-4 py-2 border border-green-300 bg-white text-green-700 rounded-lg hover:bg-green-50"
                >
                  <Send size={14} /> Send All Pending
                </button>
              </div>
            )}
          </div>

          {/* Pending view */}
          {view === 'pending' && (
            pendingMembers.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-slate-400">
                <CheckCircle2 size={40} className="mb-3 text-green-400" />
                <p className="font-medium text-slate-600">All reminders have been sent</p>
                <p className="text-sm mt-1">Switch to Sent tab to view history</p>
              </div>
            ) : (
              <>
                {/* Select all row */}
                <div className="flex items-center gap-2 px-1">
                  <button onClick={toggleSelectAll} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700">
                    {selected.size === pendingMembers.length
                      ? <CheckSquare size={14} className="text-green-600" />
                      : <Square size={14} />}
                    {selected.size === pendingMembers.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>

                {data.groups.map((group) => {
                  const groupPending = group.members.filter((m) => m.lastNotification?.status !== 'SENT');
                  if (!groupPending.length) return null;
                  return (
                    <div key={group.daysUntilExpiry} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50"
                        onClick={() => setExpanded((p) => ({ ...p, [group.daysUntilExpiry]: !p[group.daysUntilExpiry] }))}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${group.daysUntilExpiry <= 1 ? 'bg-red-500' : 'bg-amber-500'}`} />
                          <span className="font-semibold text-slate-800 text-sm">{group.label}</span>
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{groupPending.length}</span>
                        </div>
                        {expanded[group.daysUntilExpiry] ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </button>

                      {expanded[group.daysUntilExpiry] && (
                        <div className="divide-y divide-slate-50">
                          {groupPending.map((m) => (
                            <div key={m.membershipId} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                              <button
                                onClick={() => toggleSelect(m.membershipId)}
                                className="flex-shrink-0 text-slate-400 hover:text-green-600"
                              >
                                {selected.has(m.membershipId)
                                  ? <CheckSquare size={16} className="text-green-600" />
                                  : <Square size={16} />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">{m.fullName}</p>
                                <p className="text-xs text-slate-500">{m.phone} • {m.planName}</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  Expires {new Date(m.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <StatusBadge status={m.lastNotification?.status} method={m.lastNotification?.method} />
                                <ActionBtn
                                  status={m.lastNotification?.status}
                                  onClick={() => sendOne(m)}
                                  loading={!!sending[m.membershipId]}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )
          )}

          {/* History / Sent view */}
          {view === 'history' && (
            historyMembers.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-slate-400">
                <History size={40} className="mb-3" />
                <p className="font-medium text-slate-600">No reminders sent yet</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-50">
                {historyMembers.map((m) => (
                  <div key={m.membershipId} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{m.fullName}</p>
                      <p className="text-xs text-slate-500">{m.phone} • {m.planName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Expires {new Date(m.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {m.lastNotification?.sentAt && (
                          <> • Sent {new Date(m.lastNotification.sentAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</>
                        )}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 flex-shrink-0">
                      <CheckCircle2 size={12} className="text-green-500" /> Already Sent
                    </span>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}
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

      if (r.method === 'baileys') {
        toast.success(`Reminder queued for ${member.fullName} via WhatsApp`);
      } else {
        toast.success(`Reminder sent to ${member.fullName}`);
      }
      load(search, page);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 503) {
        toast.error('WhatsApp not connected. Scan QR in Broadcast → WA Connect tab.');
      } else {
        toast.error(e?.response?.data?.error || e.message);
      }
    } finally {
      setSending((p) => ({ ...p, [member.id]: false }));
    }
  };

  return (
    <div className="space-y-4">
      <WAStatusBanner ready={!!data?.isWhatsAppReady} />

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
                  <StatusBadge status={m.lastNotification?.status} method={m.lastNotification?.method} />
                  <ActionBtn
                    status={m.lastNotification?.status}
                    onClick={() => sendReminder(m)}
                    loading={!!sending[m.id]}
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

      {tab === 'expiry' ? <ExpiryRemindersTab /> : <PaymentDueTab />}
    </div>
  );
}
