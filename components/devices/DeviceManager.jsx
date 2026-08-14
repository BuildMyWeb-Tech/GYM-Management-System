// components/devices/DeviceManager.jsx
'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getBranchAuthHeader } from '@/lib/authHeader';
import Loading from '@/components/Loading';
import { Fingerprint, Plus, Trash2, Power, Copy, X } from 'lucide-react';

export default function DeviceManager() {
  const { getToken } = useAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ deviceSerial: '', name: '', location: '' });

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.get('/api/biometric-device', { headers });
      setDevices(data.devices);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const createDevice = async (e) => {
    e.preventDefault();
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.post('/api/biometric-device', form, { headers });
      toast.success(data.message);
      setShowModal(false);
      setForm({ deviceSerial: '', name: '', location: '' });
      fetchDevices();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    }
  };

  const toggleDevice = async (d) => {
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.put(
        '/api/biometric-device',
        { id: d.id, isActive: !d.isActive },
        { headers }
      );
      toast.success(data.message);
      fetchDevices();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    }
  };

  const deleteDevice = async (id) => {
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.delete(`/api/biometric-device?id=${id}`, { headers });
      toast.success(data.message);
      fetchDevices();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    }
  };

  const copySecret = (secret) => {
    navigator.clipboard.writeText(secret);
    toast.success('Secret copied');
  };

  if (loading) return <Loading />;

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
          <Fingerprint size={24} className="text-green-600" /> Biometric Devices
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
        >
          <Plus size={16} /> Register Device
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
        Webhook endpoint:{' '}
        <code className="bg-white px-2 py-0.5 rounded border border-amber-200 text-xs">
          /api/attendance/device
        </code>
        — configure each terminal to POST here with its{' '}
        <code className="text-xs">deviceSerial</code> and <code className="text-xs">secret</code>{' '}
        (shown below per device).
      </div>

      {devices.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200 text-slate-400">
          No devices registered yet
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {devices.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-slate-800">{d.name}</p>
                  <p className="text-xs text-slate-400">{d.location || 'No location set'}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${d.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}
                >
                  {d.isActive ? 'Active' : 'Disabled'}
                </span>
              </div>
              <div className="mt-3 space-y-1.5 text-xs">
                <p className="text-slate-500">
                  Serial: <span className="font-mono text-slate-700">{d.deviceSerial}</span>
                </p>
                <div className="flex items-center gap-1.5">
                  <p className="text-slate-500">
                    Secret:{' '}
                    <span className="font-mono text-slate-700">{d.secret.slice(0, 12)}...</span>
                  </p>
                  <button
                    onClick={() => copySecret(d.secret)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <Copy size={12} />
                  </button>
                </div>
                <p className="text-slate-400">
                  Last sync: {d.lastSyncAt ? new Date(d.lastSyncAt).toLocaleString() : 'Never'}
                </p>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => toggleDevice(d)}
                  className="flex-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg flex items-center justify-center gap-1"
                >
                  <Power size={12} /> {d.isActive ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => deleteDevice(d.id)}
                  className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Register Device</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={createDevice} className="space-y-3">
              <input
                required
                placeholder="Device serial number"
                value={form.deviceSerial}
                onChange={(e) => setForm({ ...form, deviceSerial: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100"
              />
              <input
                required
                placeholder="Name (e.g. Front Desk Terminal)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100"
              />
              <input
                placeholder="Location (optional)"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100"
              />
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium"
              >
                Register
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
