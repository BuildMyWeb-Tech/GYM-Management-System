// components/whatsapp/WhatsAppConnect.jsx
'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getBranchAuthHeader } from '@/lib/authHeader';
import {
  Smartphone, Wifi, WifiOff, QrCode, RefreshCw, AlertCircle, CheckCircle2, Hash, Phone,
} from 'lucide-react';

const POLL_MS = 2500;

const STATE_META = {
  CONNECTED:     { label: 'Connected',      color: 'text-green-700',  bg: 'bg-green-100',  dot: 'bg-green-500' },
  STARTING:      { label: 'Starting…',      color: 'text-blue-700',   bg: 'bg-blue-100',   dot: 'bg-blue-400 animate-pulse' },
  QR_REQUIRED:   { label: 'Action Required', color: 'text-amber-700', bg: 'bg-amber-100',  dot: 'bg-amber-400 animate-pulse' },
  RECONNECTING:  { label: 'Reconnecting…',  color: 'text-orange-700', bg: 'bg-orange-100', dot: 'bg-orange-400 animate-pulse' },
  DISCONNECTED:  { label: 'Disconnected',   color: 'text-slate-600',  bg: 'bg-slate-100',  dot: 'bg-slate-400' },
  LOGGED_OUT:    { label: 'Logged Out',     color: 'text-slate-600',  bg: 'bg-slate-100',  dot: 'bg-slate-300' },
  ERROR:         { label: 'Error',          color: 'text-red-700',    bg: 'bg-red-100',    dot: 'bg-red-500' },
};

function StateBadge({ state }) {
  const meta = STATE_META[state] || STATE_META.DISCONNECTED;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${meta.bg} ${meta.color}`}>
      <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

// Format ABCD1234 → ABCD-1234
function formatPairingCode(code) {
  if (!code) return '';
  const c = code.replace(/[-\s]/g, '');
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : code;
}

export default function WhatsAppConnect() {
  const { getToken } = useAuth();
  const [status, setStatus] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingConnect, setPendingConnect] = useState(false);
  const [mode, setMode] = useState('qr'); // 'qr' | 'phone'
  const [phone, setPhone] = useState('');
  const [requestingCode, setRequestingCode] = useState(false);
  const timerRef = useRef(null);
  const pendingTimeoutRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.get('/api/whatsapp/status', { headers });
      setStatus(data);
      if (data?.connectionState && data.connectionState !== 'DISCONNECTED') {
        setPendingConnect(false);
        if (pendingTimeoutRef.current) { clearTimeout(pendingTimeoutRef.current); pendingTimeoutRef.current = null; }
      }
    } catch {
      // silently ignore polling errors
    }
  }, [getToken]);

  useEffect(() => {
    fetchStatus();
    timerRef.current = setInterval(fetchStatus, POLL_MS);
    return () => {
      clearInterval(timerRef.current);
      if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current);
    };
  }, [fetchStatus]);

  // Sync mode with current pairing mode in DB
  useEffect(() => {
    if (status?.pairingMode) setMode('phone');
  }, [status?.pairingMode]);

  const connect = async () => {
    setActionLoading(true);
    try {
      const headers = await getBranchAuthHeader(getToken);
      await axios.post('/api/whatsapp/connect', {}, { headers });
      toast.success('Connect request sent — QR code will appear shortly');
      setPendingConnect(true);
      pendingTimeoutRef.current = setTimeout(() => setPendingConnect(false), 90_000);
      await fetchStatus();
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const disconnect = async () => {
    setActionLoading(true);
    try {
      const headers = await getBranchAuthHeader(getToken);
      await axios.post('/api/whatsapp/disconnect', {}, { headers });
      // Also cancel pairing mode if active
      if (status?.pairingMode) {
        await axios.delete('/api/whatsapp/pair', { headers }).catch(() => {});
      }
      toast.success('Disconnected');
      setMode('qr');
      await fetchStatus();
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const requestPairingCode = async () => {
    if (!phone.trim()) { toast.error('Enter your WhatsApp phone number first'); return; }
    setRequestingCode(true);
    try {
      const headers = await getBranchAuthHeader(getToken);
      await axios.post('/api/whatsapp/pair', { phone: phone.trim() }, { headers });
      toast.success('Requesting pairing code… it will appear in a few seconds');
      setPendingConnect(true);
      pendingTimeoutRef.current = setTimeout(() => setPendingConnect(false), 60_000);
      await fetchStatus();
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message);
    } finally {
      setRequestingCode(false);
    }
  };

  const cancelPairing = async () => {
    try {
      const headers = await getBranchAuthHeader(getToken);
      await axios.delete('/api/whatsapp/pair', { headers });
      await axios.post('/api/whatsapp/disconnect', {}, { headers }).catch(() => {});
      setMode('qr');
      setPhone('');
      await fetchStatus();
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message);
    }
  };

  const state = status?.connectionState || 'DISCONNECTED';
  const isConnected = state === 'CONNECTED';
  const isWorking = ['STARTING', 'QR_REQUIRED', 'RECONNECTING'].includes(state);
  const workerAlive = status?.isWorkerAlive;
  const showWorkerOffline = !workerAlive && !pendingConnect && state !== 'CONNECTED';
  const pairingCode = status?.pairingCode;
  const pairingMode = status?.pairingMode;

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28">
      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-6">
        <Smartphone size={22} className="text-green-600" /> WhatsApp Connect
      </h1>

      <div className="max-w-md space-y-4">
        {/* Status card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Connection Status</span>
            <StateBadge state={state} />
          </div>

          {pendingConnect && state === 'DISCONNECTED' && (
            <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <span className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin flex-shrink-0" />
              <span>Waiting for worker to respond…</span>
            </div>
          )}

          {showWorkerOffline && (
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>WhatsApp worker is offline. Check your Render deployment and ensure the worker service is running.</span>
            </div>
          )}

          {status?.lastError && (state === 'ERROR' || state === 'QR_REQUIRED') && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {status.lastError}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            {isConnected ? (
              <button onClick={disconnect} disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium disabled:opacity-50">
                {actionLoading ? <span className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" /> : <WifiOff size={16} />}
                Disconnect
              </button>
            ) : (
              <>
                {!pairingMode && (
                  <button onClick={connect} disabled={actionLoading || state === 'STARTING'}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-medium disabled:opacity-50">
                    {actionLoading || state === 'STARTING'
                      ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      : <Wifi size={16} />}
                    {state === 'QR_REQUIRED' ? 'Refresh QR' : state === 'RECONNECTING' ? 'Reconnect' : 'Connect'}
                  </button>
                )}
                {(isWorking || state === 'ERROR' || pairingMode) && (
                  <button onClick={pairingMode ? cancelPairing : disconnect} disabled={actionLoading}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium disabled:opacity-50">
                    <WifiOff size={16} />
                    Cancel
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Method switcher — only show when disconnected */}
        {!isConnected && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-100">
              <button
                onClick={() => { setMode('qr'); if (pairingMode) cancelPairing(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${mode === 'qr' ? 'bg-green-50 text-green-700 border-b-2 border-green-500' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <QrCode size={15} /> Scan QR Code
              </button>
              <button
                onClick={() => setMode('phone')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${mode === 'phone' ? 'bg-green-50 text-green-700 border-b-2 border-green-500' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <Phone size={15} /> Phone Number
              </button>
            </div>

            {/* QR mode */}
            {mode === 'qr' && (
              <div className="p-5">
                {state === 'QR_REQUIRED' && status?.qrDataUri ? (
                  <div className="text-center space-y-3">
                    <div className="flex items-center gap-2 justify-center text-amber-700 font-medium text-sm">
                      <QrCode size={16} /> Scan with WhatsApp
                    </div>
                    <img src={status.qrDataUri} alt="WhatsApp QR Code"
                      className="w-48 h-48 mx-auto rounded-lg border border-slate-100" />
                    <p className="text-xs text-slate-500">
                      Open WhatsApp → Settings → Linked Devices → Link a Device
                    </p>
                    <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                      If scanning fails, try the <strong>Phone Number</strong> method instead
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-500 mb-3">Click Connect to generate a QR code</p>
                    <button onClick={connect} disabled={actionLoading}
                      className="inline-flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
                      <Wifi size={15} /> Connect via QR
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Phone number / pairing code mode */}
            {mode === 'phone' && (
              <div className="p-5 space-y-4">
                {/* Show pairing code if available */}
                {pairingCode ? (
                  <div className="text-center space-y-3">
                    <div className="flex items-center gap-2 justify-center text-green-700 font-semibold text-sm">
                      <Hash size={16} /> Enter this code in WhatsApp
                    </div>
                    <div className="bg-green-50 border-2 border-green-400 rounded-xl px-6 py-4 mx-auto w-fit">
                      <p className="text-3xl font-mono font-bold tracking-[0.2em] text-green-800 select-all">
                        {formatPairingCode(pairingCode)}
                      </p>
                    </div>
                    <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 text-left space-y-1">
                      <p className="font-semibold text-slate-700">How to enter the code:</p>
                      <p>1. Open WhatsApp on your phone</p>
                      <p>2. Go to <strong>Settings → Linked Devices</strong></p>
                      <p>3. Tap <strong>Link a Device</strong></p>
                      <p>4. Tap <strong>"Link with phone number instead"</strong></p>
                      <p>5. Enter the code above</p>
                    </div>
                    <p className="text-xs text-slate-400">Code for: +{status?.pairingPhone}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Your WhatsApp Phone Number
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">+91</span>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="9876543210"
                            className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
                          />
                        </div>
                        <button
                          onClick={requestPairingCode}
                          disabled={requestingCode || phone.length < 10}
                          className="px-4 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                        >
                          {requestingCode
                            ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            : <Hash size={15} />}
                          Get Code
                        </button>
                      </div>
                    </div>
                    {pendingConnect && (
                      <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                        <span className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin flex-shrink-0" />
                        <span>Generating code… check back in a few seconds</span>
                      </div>
                    )}
                    <p className="text-xs text-slate-400">
                      A code will be generated. Enter it in WhatsApp → Settings → Linked Devices → Link a Device → Link with phone number instead.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Connected info */}
        {isConnected && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800">WhatsApp is connected</p>
              {status?.lastConnectedAt && (
                <p className="text-xs text-green-600">
                  Since {new Date(status.lastConnectedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
