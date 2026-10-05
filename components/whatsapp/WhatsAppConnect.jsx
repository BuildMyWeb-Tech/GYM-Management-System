// components/whatsapp/WhatsAppConnect.jsx
'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getBranchAuthHeader } from '@/lib/authHeader';
import {
  Smartphone, Wifi, WifiOff, QrCode, RefreshCw, AlertCircle, CheckCircle2,
} from 'lucide-react';

const POLL_MS = 2500;

const STATE_META = {
  CONNECTED:     { label: 'Connected',      color: 'text-green-700',  bg: 'bg-green-100',  dot: 'bg-green-500' },
  STARTING:      { label: 'Starting…',      color: 'text-blue-700',   bg: 'bg-blue-100',   dot: 'bg-blue-400 animate-pulse' },
  QR_REQUIRED:   { label: 'Scan QR Code',   color: 'text-amber-700',  bg: 'bg-amber-100',  dot: 'bg-amber-400 animate-pulse' },
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

export default function WhatsAppConnect() {
  const { getToken } = useAuth();
  const [status, setStatus] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingConnect, setPendingConnect] = useState(false);
  const timerRef = useRef(null);
  const pendingTimeoutRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.get('/api/whatsapp/status', { headers });
      setStatus(data);
      // Clear pending state once the worker acknowledges the command
      if (data?.connectionState && data.connectionState !== 'DISCONNECTED') {
        setPendingConnect(false);
        if (pendingTimeoutRef.current) {
          clearTimeout(pendingTimeoutRef.current);
          pendingTimeoutRef.current = null;
        }
      }
    } catch (e) {
      // silently ignore network errors while polling
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

  const connect = async () => {
    setActionLoading(true);
    try {
      const headers = await getBranchAuthHeader(getToken);
      await axios.post('/api/whatsapp/connect', {}, { headers });
      toast.success('Connect request sent — QR code will appear shortly');
      setPendingConnect(true);
      // Auto-clear after 90 seconds if worker never responds
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
      toast.success('Disconnect request sent');
      await fetchStatus();
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const state = status?.connectionState || 'DISCONNECTED';
  const isConnected = state === 'CONNECTED';
  const isWorking = ['STARTING', 'QR_REQUIRED', 'RECONNECTING'].includes(state);
  const workerAlive = status?.isWorkerAlive;
  const showWorkerOffline = !workerAlive && !pendingConnect && state !== 'CONNECTED';

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
              <span>Waiting for WhatsApp worker to respond… QR code will appear here.</span>
            </div>
          )}

          {/* {showWorkerOffline && (
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>WhatsApp worker is offline. Start the server with <code className="font-mono bg-amber-100 px-1 rounded">npm run dev:full</code> (local) or deploy with <code className="font-mono bg-amber-100 px-1 rounded">node server.mjs</code>.</span>
            </div>
          )} */}

          {status?.lastError && state === 'ERROR' && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {status.lastError}
            </div>
          )}

          {status?.reconnectAttempts > 0 && (
            <p className="text-xs text-slate-500">Reconnect attempts: {status.reconnectAttempts}</p>
          )}

          <div className="flex gap-2 pt-1">
            {isConnected ? (
              <button
                onClick={disconnect}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {actionLoading ? (
                  <span className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                ) : (
                  <WifiOff size={16} />
                )}
                Disconnect
              </button>
            ) : (
              <button
                onClick={connect}
                disabled={actionLoading || isWorking}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {actionLoading || isWorking ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Wifi size={16} />
                )}
                {isWorking ? 'Connecting…' : 'Connect'}
              </button>
            )}
            
          </div>
        </div>

        {/* QR code */}
        {state === 'QR_REQUIRED' && status?.qrDataUri && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center space-y-3">
            <div className="flex items-center gap-2 justify-center text-amber-700 font-medium text-sm">
              <QrCode size={16} />
              Scan with WhatsApp
            </div>
            <img
              src={status.qrDataUri}
              alt="WhatsApp QR Code"
              className="w-48 h-48 mx-auto rounded-lg border border-slate-100"
            />
            <p className="text-xs text-slate-500">
              Open WhatsApp → Settings → Linked Devices → Link a Device
            </p>
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
