// components/whatsapp/BroadcastPanel.jsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getBranchAuthHeader } from '@/lib/authHeader';
import Loading from '@/components/Loading';
import {
  MessageSquare, Send, CheckCircle2, XCircle, ExternalLink,
  Users, Search, ChevronLeft, ChevronRight, RotateCcw,
} from 'lucide-react';

const MAX_MEMBERS = 200;
const MSG_MAX = 1000;

function MemberRow({ member, selected, onToggle }) {
  return (
    <label className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer">
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(member.id)}
        className="w-4 h-4 accent-green-600 cursor-pointer"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{member.fullName}</p>
        <p className="text-xs text-slate-500">{member.phone}</p>
      </div>
      {member.status === 'ACTIVE' && (
        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">Active</span>
      )}
    </label>
  );
}

function ResultRow({ r }) {
  if (r.status === 'sent') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
        <span className="truncate text-slate-700">{r.fullName}</span>
        <span className="text-xs text-green-600 flex-shrink-0">Sent</span>
      </div>
    );
  }
  if (r.status === 'link') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <ExternalLink size={14} className="text-blue-500 flex-shrink-0" />
        <span className="truncate text-slate-700">{r.fullName}</span>
        <a href={r.fallbackUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline flex-shrink-0">Open WA</a>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm">
      <XCircle size={14} className="text-red-500 flex-shrink-0" />
      <span className="truncate text-slate-700">{r.fullName}</span>
      <span className="text-xs text-red-500 flex-shrink-0">Failed</span>
    </div>
  );
}

export default function BroadcastPanel() {
  const { getToken } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);

  const loadMembers = useCallback(async (q = '', pg = 1) => {
    setLoading(true);
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.get('/api/member/list', {
        headers, params: { q, page: pg, limit: 30 },
      });
      setMembers(data.members || data.data || []);
      setPagination(data.pagination || null);
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadMembers(search, page);
  }, [loadMembers, page]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadMembers(search, 1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const toggleMember = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_MEMBERS) next.add(id);
      else toast.error(`Max ${MAX_MEMBERS} members per broadcast`);
      return next;
    });

  const toggleAll = () => {
    const ids = members.map((m) => m.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => { if (next.size < MAX_MEMBERS) next.add(id); });
      return next;
    });
  };

  const send = async () => {
    if (!selected.size) { toast.error('Select at least one member'); return; }
    if (!message.trim()) { toast.error('Write a message first'); return; }
    setSending(true);
    setResults(null);
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.post('/api/whatsapp/broadcast', {
        memberIds: [...selected],
        message: message.trim(),
      }, { headers });
      setResults(data);
      toast.success(`Broadcast done: ${data.sent} sent${data.failed ? `, ${data.failed} failed` : ''}`);
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setResults(null);
    setSelected(new Set());
    setMessage('');
  };

  const pageCount = pagination ? Math.ceil(pagination.total / (pagination.limit || 30)) : 1;

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28">
      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-6">
        <MessageSquare size={22} className="text-green-600" /> Broadcast Message
      </h1>

      {results ? (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">Broadcast Results</h2>
              <button onClick={reset} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
                <RotateCcw size={14} /> New Broadcast
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-5">
              {[
                { label: 'Total', value: results.total, color: 'text-slate-700' },
                { label: 'Sent', value: results.sent, color: 'text-green-600' },
                { label: 'Failed', value: results.failed, color: 'text-red-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            {!results.apiConfigured && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                WhatsApp Cloud API not configured — links open the wa.me app instead
              </p>
            )}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {results.results.map((r) => <ResultRow key={r.memberId} r={r} />)}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Member Selection */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-800 text-sm">Select Members</h2>
                <span className="text-xs text-slate-500">{selected.size} / {MAX_MEMBERS} selected</span>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search members…"
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
                />
              </div>
            </div>

            {loading ? (
              <div className="p-6"><Loading /></div>
            ) : (
              <>
                {members.length > 0 && (
                  <label className="flex items-center gap-3 px-4 py-2 bg-slate-50 border-b border-slate-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={members.length > 0 && members.every((m) => selected.has(m.id))}
                      onChange={toggleAll}
                      className="w-4 h-4 accent-green-600 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-slate-600">Select all on this page</span>
                  </label>
                )}
                <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                  {members.length === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-8">No members found</p>
                  ) : (
                    members.map((m) => (
                      <MemberRow key={m.id} member={m} selected={selected.has(m.id)} onToggle={toggleMember} />
                    ))
                  )}
                </div>

                {pageCount > 1 && (
                  <div className="flex items-center justify-center gap-2 p-3 border-t border-slate-100">
                    <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40">
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-xs text-slate-600">{page} / {pageCount}</span>
                    <button disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Message Composer */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 text-sm mb-3">Compose Message</h2>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MSG_MAX))}
              placeholder="Type your message here…"
              rows={8}
              className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400 resize-none"
            />
            <div className="flex items-center justify-between mt-1 mb-4">
              <span className="text-xs text-slate-400">{message.length} / {MSG_MAX}</span>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 mb-4 text-xs text-slate-600 space-y-1">
              <p className="font-medium text-slate-700">Summary</p>
              <p>{selected.size} member{selected.size !== 1 ? 's' : ''} selected</p>
              <p>{message.trim().length} characters</p>
            </div>

            <button
              onClick={send}
              disabled={sending || selected.size === 0 || !message.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {sending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send size={16} />
                  Send Broadcast
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
