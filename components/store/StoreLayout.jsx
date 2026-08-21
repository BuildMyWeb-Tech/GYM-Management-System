// components/store/StoreLayout.jsx
'use client';
import { useEffect, useState } from 'react';
import Loading from '../Loading';
import Link from 'next/link';
import { ShieldAlert, LogIn } from 'lucide-react';
import BranchNavbar from './StoreNavbar';
import BranchSidebar from './StoreSidebar';
import { useAuth, SignIn } from '@clerk/nextjs';
import axios from 'axios';

const StoreLayout = ({ children }) => {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [isBranchOwner, setIsBranchOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [branchInfo, setBranchInfo] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [employeeSession, setEmployeeSession] = useState(null);
  const [hasEmployeeToken, setHasEmployeeToken] = useState(false);

  const fetchAccess = async () => {
    try {
      const empToken = typeof window !== 'undefined' ? localStorage.getItem('employeeToken') : null;

      if (empToken) {
        setHasEmployeeToken(true);
        try {
          const { data } = await axios.get('/api/store/employee-auth', {
            headers: { Authorization: `Bearer ${empToken}` },
          });

          if (data?.valid && data?.branch) {
            setBranchInfo(data.branch);
            setEmployeeSession(data.employee);
            setIsBranchOwner(true);
            setLoading(false);
            return;
          }
        } catch {
          // invalid token — fall through
        }
        localStorage.removeItem('employeeToken');
        localStorage.removeItem('employeeData');
        setHasEmployeeToken(false);
      }

      if (!isSignedIn) {
        setLoading(false);
        return;
      }

      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const { data } = await axios.get('/api/store/is-seller', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setIsBranchOwner(data.isBranchOwner || false);
      setBranchInfo(data.branch || null);
      setEmployeeSession(null);
    } catch (error) {
      console.error('StoreLayout auth error:', error);
      setIsBranchOwner(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;
    fetchAccess();
  }, [isLoaded]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        mobileMenuOpen &&
        !e.target.closest('.mobile-menu-content') &&
        !e.target.closest('.mobile-menu-toggle')
      ) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [mobileMenuOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [mobileMenuOpen]);

  if (!isLoaded || loading) return <Loading />;

  if (isBranchOwner) {
    return (
      <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
        <BranchNavbar
          branchInfo={branchInfo}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          employee={employeeSession}
        />
        <div className="flex flex-1 h-full overflow-hidden relative">
          {mobileMenuOpen && (
            <div
              className="fixed inset-0 bg-slate-900/50 z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}
          <div
            className={`fixed md:relative md:flex h-full z-50 transition-transform duration-300 ease-in-out transform ${
              mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            } mobile-menu-content`}
          >
            <BranchSidebar
              branchInfo={branchInfo}
              closeMobileMenu={() => setMobileMenuOpen(false)}
              employee={employeeSession}
            />
          </div>
          <div className="flex-1 h-full overflow-y-auto hide-scrollbar bg-slate-50 relative">
            <div className="relative z-10">{children}</div>
            
          </div>
        </div>
      </div>
    );
  }

  if (!isSignedIn && !hasEmployeeToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SignIn fallbackRedirectUrl="/store" routing="hash" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-md bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
        <div className="bg-red-50 w-20 h-20 flex items-center justify-center rounded-full mx-auto mb-6">
          <ShieldAlert size={36} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-800 mb-3">Access Denied</h1>
        <p className="text-slate-500 mb-6 text-sm">
          You need to be a branch owner or receptionist to access this dashboard.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/create-store"
            className="bg-gradient-to-r from-green-600 to-green-700 text-white flex items-center justify-center gap-2 py-3 px-6 rounded-lg text-sm font-medium shadow-md hover:from-green-700 hover:to-green-800 transition"
          >
            <LogIn size={16} /> Branch / Receptionist Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StoreLayout;
