// components/whatsapp/BroadcastPanel.jsx
'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getBranchAuthHeader } from '@/lib/authHeader';
import Loading from '@/components/Loading';
import WhatsAppConnect from '@/components/whatsapp/WhatsAppConnect';
import {
  MessageSquare, Send, CheckCircle2, XCircle,
  Search, ChevronLeft, ChevronRight, RotateCcw, Clock, Pause,
  StopCircle, Image as ImageIcon, Play, Paperclip, X,
  Video, FileText, Volume2, Calendar, Users, Eye, Wifi, WifiOff,
  Smartphone, History,
} from 'lucide-react';

const MAX_MEMBERS = 200;
const MSG_MAX = 1000;
const POLL_MS = 2500;
const ACCEPT = 'image/*,video/*,audio/*,application/pdf';

const AVATAR_BG = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-600',
  'bg-orange-400', 'bg-pink-500', 'bg-indigo-500',
  'bg-red-400', 'bg-teal-500',
];
const avatarBg = (name) => AVATAR_BG[(name?.charCodeAt(0) || 0) % AVATAR_BG.length];
const initial = (name) => (name || '?').charAt(0).toUpperCase();

const STATUS_META = {
  COMPLETED:   { label: 'Completed',   cls: 'bg-green-100 text-green-700' },
  IN_PROGRESS: { label: 'In Progress', cls: 'bg-blue-100 text-blue-700' },
  PAUSED:      { label: 'Paused',      cls: 'bg-amber-100 text-amber-700' },
  CANCELLED:   { label: 'Cancelled',   cls: 'bg-slate-100 text-slate-500' },
  FAILED:      { label: 'Failed',      cls: 'bg-red-100 text-red-700' },
};

const RECIPIENT_STATUS_CLS = {
  sent:       'bg-green-100 text-green-700',
  delivered:  'bg-blue-100 text-blue-700',
  failed:     'bg-red-100 text-red-700',
  queued:     'bg-slate-100 text-slate-500',
  processing: 'bg-amber-100 text-amber-700',
};

// ── Contact Row ────────────────────────────────────────────────────────────────

function ContactRow({ member, selected, onToggle }) {
  return (
    <label className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${selected ? 'bg-green-50' : 'hover:bg-slate-50'}`}>
      <input type="checkbox" checked={selected} onChange={() => onToggle(member.id)}
        className="w-4 h-4 accent-green-600 cursor-pointer flex-shrink-0" />
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${avatarBg(member.fullName)}`}>
        {initial(member.fullName)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{member.fullName}</p>
        <p className="text-xs text-slate-400">{member.phone}</p>
      </div>
      {member.status === 'ACTIVE' && (
        <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full flex-shrink-0">Active</span>
      )}
    </label>
  );
}

// ── Media Picker ───────────────────────────────────────────────────────────────

function MediaPicker({ onUploaded, onCleared, uploadedMedia, getToken }) {
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localPreview = URL.createObjectURL(file);
    onUploaded({ uploading: true, localPreview, name: file.name, mimeType: file.type });
    try {
      const headers = await getBranchAuthHeader(getToken);
      const fd = new FormData();
      fd.append('file', file);
      // Do NOT set Content-Type manually — axios sets multipart/form-data with boundary automatically
      const { data } = await axios.post('/api/whatsapp/upload-media', fd, { headers });
      onUploaded({ url: data.url, fileId: data.fileId, name: file.name, mimeType: data.mimeType, mediaType: data.mediaType, localPreview });
      toast.success('Media uploaded');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Upload failed');
      onCleared();
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const isImage = uploadedMedia?.mimeType?.startsWith('image/');

  return (
    <div>
      {uploadedMedia ? (
        <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
          {isImage && uploadedMedia.localPreview ? (
            <img src={uploadedMedia.localPreview} alt="preview" className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-slate-200" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
              <ImageIcon size={20} className="text-slate-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate">{uploadedMedia.name}</p>
            {uploadedMedia.uploading
              ? <p className="text-xs text-amber-600 flex items-center gap-1 mt-1"><span className="w-2.5 h-2.5 border border-amber-400 border-t-amber-600 rounded-full animate-spin" /> Uploading…</p>
              : <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><CheckCircle2 size={11} /> Uploaded</p>
            }
          </div>
          <button onClick={onCleared} className="p-1 text-slate-400 hover:text-red-500 flex-shrink-0"><X size={14} /></button>
        </div>
      ) : (
        <>
          <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={handleFile} />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-3 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-colors">
            <Paperclip size={15} /> Attach image / video / audio
          </button>
        </>
      )}
    </div>
  );
}

// ── WA Status Banner ──────────────────────────────────────────────────────────

function WAStatusBanner({ status, onSwitchTab }) {
  if (status.connected && status.workerAlive) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700">
        <Wifi size={13} className="text-green-500" />
        WhatsApp connected — messages send via your number
      </div>
    );
  }
  if (status.connected && !status.workerAlive) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
        <div className="flex items-center gap-2">
          <WifiOff size={13} className="text-amber-500" />
          Worker offline — messages will use wa.me links (deploy to Render for auto-send)
        </div>
        <button onClick={onSwitchTab} className="text-xs font-semibold underline hover:text-amber-900 flex-shrink-0">Details</button>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
      <div className="flex items-center gap-2">
        <WifiOff size={13} className="text-amber-500" />
        WhatsApp not connected
      </div>
      <button onClick={onSwitchTab} className="text-xs font-semibold underline hover:text-amber-900">Connect now</button>
    </div>
  );
}

// ── Progress Panel (live sending) ─────────────────────────────────────────────

function ProgressPanel({ broadcastId, onReset, getToken }) {
  const [campaign, setCampaign] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const timerRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.get(`/api/whatsapp/broadcast/${broadcastId}/status`, { headers });
      setCampaign(data);
      if (['COMPLETED', 'CANCELLED', 'FAILED'].includes(data.status)) clearInterval(timerRef.current);
    } catch {}
  }, [broadcastId, getToken]);

  useEffect(() => {
    fetchStatus();
    timerRef.current = setInterval(fetchStatus, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchStatus]);

  const doAction = async (action) => {
    setActionLoading(true);
    try {
      const headers = await getBranchAuthHeader(getToken);
      if (action === 'cancel') {
        await axios.post(`/api/whatsapp/broadcast/${broadcastId}/cancel`, {}, { headers });
      } else {
        const isPaused = campaign?.status === 'PAUSED';
        await axios.post(`/api/whatsapp/broadcast/${broadcastId}/pause`, { action: isPaused ? 'resume' : 'pause' }, { headers });
      }
      await fetchStatus();
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (!campaign) return <div className="py-12"><Loading /></div>;

  const pct = campaign.totalCount > 0
    ? Math.round(((campaign.sentCount + campaign.failedCount) / campaign.totalCount) * 100) : 0;
  const isActive = ['IN_PROGRESS', 'PAUSED'].includes(campaign.status);
  const isDone = ['COMPLETED', 'CANCELLED'].includes(campaign.status);
  const recipients = Array.isArray(campaign.recipients) ? campaign.recipients : [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Sending in Progress</h2>
        <div className="flex items-center gap-2">
          {isActive && <>
            <button onClick={() => doAction('pause')} disabled={actionLoading}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-amber-200 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 disabled:opacity-50">
              {campaign.status === 'PAUSED' ? <Play size={12} /> : <Pause size={12} />}
              {campaign.status === 'PAUSED' ? 'Resume' : 'Pause'}
            </button>
            <button onClick={() => doAction('cancel')} disabled={actionLoading}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-red-200 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50">
              <StopCircle size={12} /> Cancel
            </button>
          </>}
          {isDone && (
            <button onClick={onReset} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-green-600 transition-colors">
              <RotateCcw size={14} /> New Broadcast
            </button>
          )}
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-2">
          <span>{pct}% complete</span>
          <span className={`font-medium capitalize ${campaign.status === 'COMPLETED' ? 'text-green-600' : campaign.status === 'CANCELLED' ? 'text-slate-500' : campaign.status === 'PAUSED' ? 'text-amber-600' : 'text-blue-600'}`}>
            {campaign.status.toLowerCase()}
          </span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total',   value: campaign.totalCount,   color: 'text-slate-700' },
          { label: 'Sent',    value: campaign.sentCount,    color: 'text-green-600' },
          { label: 'Failed',  value: campaign.failedCount,  color: 'text-red-500' },
          { label: 'Pending', value: campaign.pendingCount, color: 'text-amber-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {recipients.length > 0 && (
        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-medium text-slate-500 mb-2">Recipients</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {recipients.map((r, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarBg(r.name || r.fullName)}`}>
                  {initial(r.name || r.fullName)}
                </div>
                <span className="flex-1 truncate text-slate-700">{r.name || r.fullName}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${RECIPIENT_STATUS_CLS[r.status] || 'bg-slate-100 text-slate-500'}`}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Detail Modal ──────────────────────────────────────────────────────────────

function DetailModal({ campaignId, onClose, getToken }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const headers = await getBranchAuthHeader(getToken);
        const { data: d } = await axios.get(`/api/whatsapp/broadcast/${campaignId}/status`, { headers });
        setData(d);
      } catch {
        toast.error('Failed to load broadcast details');
        onClose();
      } finally {
        setLoading(false);
      }
    })();
  }, [campaignId, getToken, onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Broadcast Detail</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><X size={16} /></button>
        </div>

        {loading ? (
          <div className="py-12"><Loading /></div>
        ) : data ? (
          <div className="overflow-y-auto p-5 space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Total',   value: data.totalCount,   color: 'text-slate-700' },
                { label: 'Sent',    value: data.sentCount,    color: 'text-green-600' },
                { label: 'Failed',  value: data.failedCount,  color: 'text-red-500' },
                { label: 'Pending', value: data.pendingCount, color: 'text-amber-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-2.5 text-center">
                  <p className={`text-xl font-bold ${color}`}>{value ?? 0}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {data.message && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-medium text-slate-500 mb-1.5">Message</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{data.message}</p>
              </div>
            )}

            {data.mediaUrl && (
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-xl p-3">
                <ImageIcon size={14} />
                <span>Media attached ({data.mediaType || 'file'})</span>
                <a href={data.mediaUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-green-600 hover:underline">View</a>
              </div>
            )}

            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Calendar size={11} />
              {new Date(data.createdAt).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
              })}
            </p>

            {Array.isArray(data.recipients) && data.recipients.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Recipients ({data.recipients.length})</p>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">Name</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">Mobile</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.recipients.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarBg(r.name || r.fullName)}`}>
                                {initial(r.name || r.fullName)}
                              </div>
                              <span className="truncate max-w-[100px] text-slate-700">{r.name || r.fullName}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-slate-500 text-xs">{r.phone}</td>
                          <td className="px-3 py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${RECIPIENT_STATUS_CLS[r.status] || 'bg-slate-100 text-slate-500'}`}>{r.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── History Tab ────────────────────────────────────────────────────────────────

function HistoryTab({ getToken }) {
  const [campaigns, setCampaigns] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState(null);

  const fetchHistory = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.get('/api/whatsapp/history', { headers, params: { page: pg, limit: 20 } });
      setCampaigns(data.campaigns || []);
      setPagination(data.pagination || null);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchHistory(page); }, [page, fetchHistory]);

  const pageCount = pagination ? pagination.totalPages : 1;

  if (loading) return <div className="py-16"><Loading /></div>;

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <History size={28} className="text-slate-300" />
        </div>
        <p className="text-slate-600 font-medium">No broadcasts yet</p>
        <p className="text-sm text-slate-400 mt-1">Sent broadcasts will appear here</p>
      </div>
    );
  }

  return (
    <>
      {detailId && (
        <DetailModal campaignId={detailId} onClose={() => setDetailId(null)} getToken={getToken} />
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {campaigns.map((c) => {
          const meta = STATUS_META[c.status] || STATUS_META.COMPLETED;
          const date = new Date(c.createdAt).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
          });
          const title = c.message
            ? c.message.slice(0, 50) + (c.message.length > 50 ? '…' : '')
            : `${c.mediaType || 'Media'} broadcast`;

          return (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate text-sm">{title}</p>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Calendar size={10} />{date}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap ${meta.cls}`}>{meta.label}</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Total',   value: c.totalCount,   color: 'text-slate-700' },
                  { label: 'Sent',    value: c.sentCount,    color: 'text-green-600' },
                  { label: 'Failed',  value: c.failedCount,  color: 'text-red-500' },
                  { label: 'Pending', value: c.pendingCount, color: 'text-amber-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className={`text-base font-bold ${color}`}>{value ?? 0}</p>
                    <p className="text-xs text-slate-400">{label}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setDetailId(c.id)}
                className="flex items-center justify-center gap-1.5 w-full text-xs text-green-600 hover:text-green-700 font-medium py-2 border border-green-200 rounded-xl hover:bg-green-50 transition-colors"
              >
                <Eye size={13} /> View Recipients
              </button>
            </div>
          );
        })}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40"><ChevronLeft size={16} /></button>
          <span className="text-sm text-slate-600 font-medium">{page} / {pageCount}</span>
          <button disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}
            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40"><ChevronRight size={16} /></button>
        </div>
      )}
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function BroadcastPanel() {
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState('broadcast');

  // Members list
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [selected, setSelected] = useState(new Set());

  // Composer
  const [message, setMessage] = useState('');
  const [uploadedMedia, setUploadedMedia] = useState(null);
  const [sendIntervalMs, setSendIntervalMs] = useState(1500);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  // WA status
  const [waStatus, setWaStatus] = useState({ connected: false, workerAlive: false });

  const loadMembers = useCallback(async (q = '', pg = 1) => {
    setMembersLoading(true);
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.get('/api/member/list', { headers, params: { q, page: pg, limit: 30 } });
      setMembers(data.members || data.data || []);
      setPagination(data.pagination || null);
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message);
    } finally {
      setMembersLoading(false);
    }
  }, [getToken]);

  const loadWaStatus = useCallback(async () => {
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.get('/api/whatsapp/status', { headers });
      setWaStatus({
        connected: data?.connectionState === 'CONNECTED',
        workerAlive: data?.isWorkerAlive === true,
      });
    } catch {}
  }, [getToken]);

  useEffect(() => { loadMembers(search, page); }, [loadMembers, page]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); loadMembers(search, 1); }, 400);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { loadWaStatus(); }, [loadWaStatus]);

  const toggleMember = (id) => setSelected((prev) => {
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

  const handleMediaUploaded = (media) => setUploadedMedia(media);
  const handleMediaCleared = () => {
    if (uploadedMedia?.localPreview) URL.revokeObjectURL(uploadedMedia.localPreview);
    setUploadedMedia(null);
  };

  const send = async () => {
    if (!selected.size) { toast.error('Select at least one member'); return; }
    if (!message.trim() && !uploadedMedia?.url) { toast.error('Write a message or attach media'); return; }
    if (uploadedMedia?.uploading) { toast.error('Media still uploading, please wait'); return; }
    setSending(true);
    setResult(null);
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.post('/api/whatsapp/broadcast', {
        memberIds: [...selected],
        message: message.trim() || undefined,
        mediaUrl: uploadedMedia?.url || undefined,
        mediaType: uploadedMedia?.mediaType || undefined,
        mimeType: uploadedMedia?.mimeType || undefined,
        sendIntervalMs,
      }, { headers });
      setResult(data);
      if (data.method === 'baileys') {
        toast.success('Broadcast queued — sending via WhatsApp');
      } else {
        toast.success(`Done: ${data.sent} sent${data.failed ? `, ${data.failed} failed` : ''}`);
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    handleMediaCleared();
    setResult(null);
    setSelected(new Set());
    setMessage('');
    setSendIntervalMs(1500);
  };

  const pageCount = pagination ? Math.ceil(pagination.total / (pagination.limit || 30)) : 1;

  const TABS = [
    { id: 'broadcast', label: 'Broadcast',  icon: <Send size={13} /> },
    { id: 'history',   label: 'History',    icon: <History size={13} /> },
    { id: 'connect',   label: 'WA Connect', icon: <Smartphone size={13} /> },
  ];

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare size={22} className="text-green-600" /> WhatsApp Broadcast
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Send bulk messages to your gym members</p>
        </div>
        {/* Tab pills */}
        <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-0.5 self-start sm:self-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === t.id
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Broadcast Tab ── */}
      {activeTab === 'broadcast' && (
        <>
          {result?.method === 'baileys' ? (
            <ProgressPanel broadcastId={result.broadcastId} onReset={reset} getToken={getToken} />
          ) : result ? (
            /* Non-Baileys result (Cloud API or wa.me links) */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">Broadcast Result</h2>
                <button onClick={reset} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-green-600 transition-colors">
                  <RotateCcw size={14} /> New Broadcast
                </button>
              </div>

              {result.method === 'links' && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                  <WifiOff size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>Worker not running — click each link below to send manually via WhatsApp Web. To enable auto-send, deploy on Render with <code className="bg-amber-100 px-1 rounded">node server.mjs</code>.</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total',  value: result.total,  color: 'text-slate-700' },
                  { label: 'Sent',   value: result.sent,   color: 'text-green-600' },
                  { label: 'Failed', value: result.failed, color: 'text-red-500' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className={`text-2xl font-bold ${color}`}>{value ?? 0}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {(result.results || []).map((r) => (
                  <div key={r.memberId} className="flex items-center gap-3 text-sm">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarBg(r.fullName)}`}>
                      {initial(r.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-700 truncate font-medium text-xs">{r.fullName}</p>
                      <p className="text-slate-400 text-xs">{r.memberId}</p>
                    </div>
                    {r.status === 'link' ? (
                      <a href={r.fallbackUrl} target="_blank" rel="noopener noreferrer"
                        className="flex-shrink-0 text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                        Send WA
                      </a>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize flex-shrink-0 ${RECIPIENT_STATUS_CLS[r.status] || 'bg-slate-100 text-slate-500'}`}>{r.status}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left: Contacts */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-slate-800 text-sm">Contacts</h2>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{selected.size} / {MAX_MEMBERS}</span>
                  </div>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members…"
                      className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400" />
                  </div>
                </div>

                {membersLoading ? (
                  <div className="p-6"><Loading /></div>
                ) : (
                  <>
                    {members.length > 0 && (
                      <label className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100 cursor-pointer">
                        <input type="checkbox"
                          checked={members.length > 0 && members.every((m) => selected.has(m.id))}
                          onChange={toggleAll}
                          className="w-4 h-4 accent-green-600 cursor-pointer" />
                        <span className="text-xs font-medium text-slate-500">Select all on this page</span>
                      </label>
                    )}
                    <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
                      {members.length === 0
                        ? <p className="text-center text-slate-400 text-sm py-10">No members found</p>
                        : members.map((m) => (
                          <ContactRow key={m.id} member={m} selected={selected.has(m.id)} onToggle={toggleMember} />
                        ))
                      }
                    </div>
                    {pageCount > 1 && (
                      <div className="flex items-center justify-center gap-2 p-3 border-t border-slate-100">
                        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40"><ChevronLeft size={14} /></button>
                        <span className="text-xs text-slate-500">{page} / {pageCount}</span>
                        <button disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40"><ChevronRight size={14} /></button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Right: Message composer */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
                <h2 className="font-semibold text-slate-800 text-sm">Message</h2>

                <WAStatusBanner status={waStatus} onSwitchTab={() => setActiveTab('connect')} />

                <div>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, MSG_MAX))}
                    placeholder="Type your message…" rows={5}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400 resize-none" />
                  <span className="text-xs text-slate-400">{message.length} / {MSG_MAX}</span>
                </div>

                <MediaPicker
                  onUploaded={handleMediaUploaded}
                  onCleared={handleMediaCleared}
                  uploadedMedia={uploadedMedia}
                  getToken={getToken}
                />

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500">
                    Delay between messages: <span className="text-slate-700">{(sendIntervalMs / 1000).toFixed(1)}s</span>
                  </label>
                  <input type="range" min={700} max={5000} step={100} value={sendIntervalMs}
                    onChange={(e) => setSendIntervalMs(Number(e.target.value))}
                    className="w-full accent-green-600" />
                  <div className="flex justify-between text-xs text-slate-400"><span>0.7s fast</span><span>5s safe</span></div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Users size={12} />
                  <span>{selected.size} member{selected.size !== 1 ? 's' : ''} selected</span>
                  {uploadedMedia?.url && <span className="text-green-600">· {uploadedMedia.mediaType} attached</span>}
                </div>

                <button onClick={send}
                  disabled={sending || selected.size === 0 || (!message.trim() && !uploadedMedia?.url) || uploadedMedia?.uploading}
                  className="mt-auto w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {sending
                    ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sending…</>
                    : <><Send size={16} /> Send via WhatsApp</>
                  }
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── History Tab ── */}
      {activeTab === 'history' && <HistoryTab getToken={getToken} />}

      {/* ── WA Connect Tab ── */}
      {activeTab === 'connect' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <WhatsAppConnect />
        </div>
      )}
    </div>
  );
}
