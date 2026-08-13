// app/admin/approve/page.jsx
'use client';
import BranchInfo from '@/components/admin/BranchInfo';
import Loading from '@/components/Loading';
import { CheckCircleIcon, XCircleIcon, Building2Icon, AlertCircleIcon, ClockIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function AdminApprove() {
  const [branches, setBranches] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/admin/approve-store', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setBranches(data.branches);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (branchId, action) => {
    try {
      const res = await fetch('/api/admin/approve-store', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      toast.success(data.message);
      await fetchBranches();
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => { fetchBranches(); }, []);

  if (loading) return <Loading />;

  const pending  = branches.filter((b) => b.status === 'PENDING');
  const rejected = branches.filter((b) => b.status === 'REJECTED');

  return (
    <div className="text-slate-500 mb-28 pt-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl flex items-center gap-2">
          <span className="bg-amber-50 text-amber-600 p-2 rounded-md inline-flex"><Building2Icon size={20} /></span>
          Branch <span className="text-slate-800 font-medium ml-1">Applications</span>
        </h1>
        <div className="flex gap-2">
          <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-xs font-medium">{pending.length} Pending</span>
          <span className="bg-red-50 text-red-500 px-3 py-1 rounded-full text-xs font-medium">{rejected.length} Rejected</span>
        </div>
      </div>

      {branches.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-80 bg-slate-50 rounded-xl border border-slate-200">
          <AlertCircleIcon size={48} className="text-slate-300 mb-4" />
          <h1 className="text-2xl text-slate-400 font-medium">No Applications Pending</h1>
          <p className="text-slate-400 mt-2">All branch applications have been processed</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5 mt-6">
          {branches.map((branch) => (
            <div key={branch.id} className="bg-white border rounded-lg shadow-sm p-5 md:p-6 flex max-md:flex-col gap-5 md:items-end max-w-4xl hover:shadow-md transition-shadow">
              <BranchInfo branch={branch} />
              <div className="flex gap-3 pt-2 flex-wrap items-center">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${branch.status === 'PENDING' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'}`}>
                  <ClockIcon size={12} /> {branch.status}
                </span>
                <button
                  onClick={() => toast.promise(handleAction(branch.id, 'APPROVE'), { loading: 'Approving...' })}
                  className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-2"
                >
                  <CheckCircleIcon size={16} /> Approve
                </button>
                {branch.status === 'PENDING' && (
                  <button
                    onClick={() => toast.promise(handleAction(branch.id, 'REJECT'), { loading: 'Rejecting...' })}
                    className="px-4 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 text-sm font-medium flex items-center gap-2"
                  >
                    <XCircleIcon size={16} /> Reject
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}