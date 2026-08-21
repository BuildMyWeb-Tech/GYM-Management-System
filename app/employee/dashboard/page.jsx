// app/employee/dashboard/page.jsx
'use client';
import { useEffect, useState } from 'react';
import {
  Users,
  CalendarCheck,
  Dumbbell,
  CreditCard,
  ShoppingBag,
  BarChart2,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { PERMISSIONS } from '@/middlewares/authEmployee';

export default function EmployeeDashboard() {
  const [employee, setEmployee] = useState(null);

  useEffect(() => {
    const empData = localStorage.getItem('employeeData');
    if (empData) setEmployee(JSON.parse(empData));
  }, []);

  if (!employee) return null;

  const permissions = employee.permissions || {};
  const branch = employee.branch || {};

  const allModules = [
    {
      key: PERMISSIONS.MANAGE_MEMBERS,
      name: 'Members',
      desc: 'Register and manage members',
      href: '/employee/members',
      icon: Users,
      color: 'bg-green-50 border-green-200',
      iconColor: 'bg-green-100 text-green-600',
    },
    {
      key: PERMISSIONS.MARK_ATTENDANCE,
      name: 'Attendance',
      desc: 'Check-in, check-out, corrections',
      href: '/employee/attendance',
      icon: CalendarCheck,
      color: 'bg-amber-50 border-amber-200',
      iconColor: 'bg-amber-100 text-amber-600',
    },
    {
      key: PERMISSIONS.MANAGE_MEMBERSHIPS,
      name: 'Plans',
      desc: 'View membership plans',
      href: '/employee/plans',
      icon: Dumbbell,
      color: 'bg-teal-50 border-teal-200',
      iconColor: 'bg-teal-100 text-teal-600',
    },
    {
      key: PERMISSIONS.COLLECT_PAYMENT,
      name: 'Checkout',
      desc: 'Collect payments, sell plans',
      href: '/employee/checkout',
      icon: CreditCard,
      color: 'bg-indigo-50 border-indigo-200',
      iconColor: 'bg-indigo-100 text-indigo-600',
    },
    {
      key: PERMISSIONS.COLLECT_PAYMENT,
      name: 'Payments',
      desc: 'View payment and order history',
      href: '/employee/orders',
      icon: ShoppingBag,
      color: 'bg-blue-50 border-blue-200',
      iconColor: 'bg-blue-100 text-blue-600',
    },
    {
      key: PERMISSIONS.VIEW_REPORTS,
      name: 'Reports',
      desc: 'View attendance and revenue reports',
      href: '/employee/reports',
      icon: BarChart2,
      color: 'bg-purple-50 border-purple-200',
      iconColor: 'bg-purple-100 text-purple-600',
    },
  ];

  const accessibleModules = allModules.filter((m) => permissions[m.key] === true);

  const grantedPermissions = Object.entries(permissions)
    .filter(([, v]) => v === true)
    .map(([k]) => k);

  return (
    <div className="space-y-6 pb-20 px-3 sm:px-6 py-4 sm:py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome back, {employee.name} 👋</h1>
          <p className="text-slate-500 text-sm mt-1">Receptionist • {branch.name || 'Branch'}</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
          <ShieldCheck size={16} className="text-blue-600" />
          <span className="text-sm font-medium text-blue-700">
            {accessibleModules.length} module{accessibleModules.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {grantedPermissions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-700 mb-3">Your Permissions</p>
          <div className="flex flex-wrap gap-2">
            {grantedPermissions.map((key) => (
              <span
                key={key}
                className="px-3 py-1 rounded-full text-xs font-medium border bg-green-50 text-green-700 border-green-200"
              >
                {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            ))}
          </div>
        </div>
      )}

      {accessibleModules.length > 0 ? (
        <div>
          <p className="text-sm font-medium text-slate-600 mb-3">Quick Access</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {accessibleModules.map((mod) => (
              <Link
                key={mod.href}
                href={mod.href}
                className={`flex flex-col gap-3 p-5 rounded-xl border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 ${mod.color}`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${mod.iconColor}`}
                >
                  <mod.icon size={20} />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{mod.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{mod.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={28} className="text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">No modules assigned yet</p>
          <p className="text-slate-400 text-sm mt-1">
            Contact your branch owner to get permissions
          </p>
        </div>
      )}
    </div>
  );
}
