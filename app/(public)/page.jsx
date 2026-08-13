// app/(public)/page.jsx
'use client';
import Link from "next/link";
import { Dumbbell, Fingerprint, CalendarCheck, BarChart3, ArrowRight, Building2 } from "lucide-react";

const features = [
  {
    icon: Fingerprint,
    title: "Biometric Attendance",
    description: "Members check in with a fingerprint scan — no manual registers, no double entries.",
  },
  {
    icon: CalendarCheck,
    title: "Membership Tracking",
    description: "Plans, renewals, and freezes tracked automatically, with expiry reminders sent before members lapse.",
  },
  {
    icon: BarChart3,
    title: "Reports That Matter",
    description: "Daily attendance, revenue, and member growth — all in one dashboard, exportable in a click.",
  },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Dumbbell size={15} /> Multi-Branch Gym Management
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 leading-tight max-w-3xl mx-auto">
            Run every branch, every member, every scan — from one dashboard
          </h1>
          <p className="mt-5 text-slate-500 max-w-xl mx-auto text-base md:text-lg">
            GymDesk handles member registration, biometric attendance, membership renewals, and payments — so your front desk can focus on members, not paperwork.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/create-store"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-7 py-3 rounded-xl font-medium shadow-sm transition-all">
              Register Your Branch <ArrowRight size={16} />
            </Link>
            <Link href="/store/login"
              className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-7 py-3 rounded-xl font-medium transition-all">
              <Building2 size={16} /> Branch / Receptionist Login
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full mb-3">
              WHY GYMDESK
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Built for how gyms actually run</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-7 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center mb-5">
                  <f.icon size={22} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-green-600 to-green-700">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Ready to bring your gym online?</h2>
          <p className="text-green-50 mb-8">Register your branch and get approved within 1-2 business days.</p>
          <Link href="/create-store"
            className="inline-flex items-center gap-2 bg-white text-green-700 px-7 py-3 rounded-xl font-medium hover:bg-green-50 transition-colors">
            Get Started <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}