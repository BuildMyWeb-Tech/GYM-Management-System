// components/employee/EmployeeNavbar.jsx
'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, LogOut, Dumbbell } from 'lucide-react';

export default function EmployeeNavbar({ branchInfo, employee, mobileOpen, setMobileOpen }) {
  const router = useRouter();
  const avatarLetter = employee?.name?.charAt(0)?.toUpperCase() || 'E';

  const handleLogout = () => {
    localStorage.removeItem('employeeToken');
    localStorage.removeItem('employeeData');
    router.push('/employee/login');
  };

  return (
    <div className="flex items-center justify-between px-4 sm:px-8 lg:px-12 py-3 border-b border-slate-200 bg-white shadow-sm sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <button
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link
          href="/employee/dashboard"
          className="relative text-2xl font-semibold text-slate-700 flex items-center gap-2"
        >
          <Dumbbell className="text-blue-600" size={22} />
          GymDesk
          <div className="absolute text-xs font-semibold -top-1.5 -right-16 px-2 py-0.5 rounded-full text-white bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm whitespace-nowrap">
            Receptionist
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium text-slate-800">{employee?.name}</p>
          <p className="text-xs text-slate-500">Receptionist • {branchInfo?.name}</p>
        </div>

        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm shadow-sm">
          {avatarLetter}
        </div>

        <button
          onClick={handleLogout}
          title="Logout"
          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}
