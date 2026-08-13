// components/members/MemberList.jsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import { getBranchAuthHeader } from '@/lib/authHeader';
import Loading from '@/components/Loading';
import { Search, UserPlus, Users, Fingerprint, ChevronLeft, ChevronRight } from 'lucide-react';

export default function MemberList({ basePath }) {
  const { getToken } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1 });

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
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-slate-50 hover:bg-slate-50/60 cursor-pointer"
                    >
                      <td className="px-5 py-3">
                        <Link href={`${basePath}/${m.id}`} className="flex items-center gap-3">
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
                          <span className="font-medium text-slate-800 hover:text-green-600">
                            {m.fullName}
                          </span>
                        </Link>
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
    </div>
  );
}
