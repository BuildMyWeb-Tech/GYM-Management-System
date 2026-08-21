// components/members/MemberList.jsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getBranchAuthHeader } from '@/lib/authHeader';
import Loading from '@/components/Loading';
import {
  Search,
  UserPlus,
  Users,
  Fingerprint,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
} from 'lucide-react';

export default function MemberList({ basePath }) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.get('/api/member/list', {
        headers,
        params: { q, status, page, limit: 20 },
      });
      setMembers(data.members);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  }, [q, status, page]);

  useEffect(() => {
    const t = setTimeout(fetchMembers, 300);
    return () => clearTimeout(t);
  }, [fetchMembers]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const headers = await getBranchAuthHeader(getToken);
      const { data } = await axios.delete(`/api/member/delete?id=${deleteTarget.id}`, { headers });
      toast.success(data.message);
      setDeleteTarget(null);
      fetchMembers();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Users size={24} className="text-green-600" /> Members
          </h1>
          <p className="text-sm text-slate-500 mt-1">{pagination.total ?? 0} total members</p>
        </div>
        <Link
          href={`${basePath}/add`}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <UserPlus size={16} /> Register Member
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search by name or phone..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-100"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {loading ? (
        <Loading />
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-slate-50 rounded-xl border border-slate-200">
          <Users size={40} className="text-slate-300 mb-3" />
          <p className="text-slate-400">No members found</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-5 py-3 text-slate-500 font-medium">Member</th>
                    <th className="text-left px-5 py-3 text-slate-500 font-medium">Phone</th>
                    <th className="text-left px-5 py-3 text-slate-500 font-medium">Joined</th>
                    <th className="text-left px-5 py-3 text-slate-500 font-medium">Biometric</th>
                    <th className="text-left px-5 py-3 text-slate-500 font-medium">Status</th>
                    <th className="text-right px-5 py-3 text-slate-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {m.photo ? (
                            <Image
                              src={m.photo}
                              alt={m.fullName}
                              width={36}
                              height={36}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm">
                              {m.fullName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-slate-800">{m.fullName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{m.phone}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">
                        {new Date(m.joinDate).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        {m.deviceUserId ? (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            <Fingerprint size={12} /> Linked
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Not linked</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${m.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => router.push(`${basePath}/${m.id}`)}
                            title="View"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => router.push(`${basePath}/${m.id}/edit`)}
                            title="Edit"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(m)}
                            title="Delete"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-slate-500">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle size={18} />
                <h3 className="font-semibold">Delete Member</h3>
              </div>
              <button
                onClick={() => setDeleteTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-slate-800">{deleteTarget.fullName}</span>? This
              will permanently remove their record, membership history, and attendance logs. This
              cannot be undone.
            </p>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
