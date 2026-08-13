// components/store/StoreNavbar.jsx
'use client';
import { useUser, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { Dumbbell, Menu, X, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

const StoreNavbar = ({ branchInfo, mobileMenuOpen, setMobileMenuOpen, employee }) => {
  const { user } = useUser();
  const router = useRouter();

  const isEmployeeMode = !!employee;
  const displayName = isEmployeeMode ? employee.name : user?.firstName || 'User';
  const displayRole = isEmployeeMode ? 'Receptionist' : 'Branch Owner';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const handleEmployeeLogout = () => {
    localStorage.removeItem('employeeToken');
    localStorage.removeItem('employeeData');
    router.push('/store/login');
  };

  return (
    <div className="flex items-center justify-between px-4 sm:px-8 lg:px-12 py-3 border-b border-slate-200 bg-white shadow-sm sticky top-0 z-40">
      <div className="flex items-center">
        <button
          className="mr-3 p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <Link
          href="/store"
          className="relative text-3xl font-semibold text-slate-700 flex items-center gap-2"
        >
          <Dumbbell className="text-green-600" size={26} />
          GymDesk
          <div className="absolute text-xs font-semibold -top-1.5 -right-14 px-3 py-0.5 rounded-full text-white bg-gradient-to-r from-green-500 to-green-600 shadow-sm">
            Branch
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-slate-800">Hi, {displayName.split(' ')[0]}</p>
            <p className="text-xs text-slate-500">{displayRole}</p>
          </div>

          {isEmployeeMode ? (
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {avatarLetter}
              </div>
              <button
                onClick={handleEmployeeLogout}
                title="Logout"
                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <UserButton />
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreNavbar;
