// app/(public)/about/page.jsx
import Link from 'next/link';
import {
  Dumbbell,
  Fingerprint,
  CalendarCheck,
  Building2,
  Users,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

const values = [
  {
    icon: Fingerprint,
    title: 'Built for Real Front Desks',
    description:
      "No manual attendance registers, no double-entry. Biometric check-in ties directly to membership status, so your staff always know who's actually paid and current.",
  },
  {
    icon: Building2,
    title: 'Multi-Branch From Day One',
    description:
      'Whether you run one gym or a growing chain, every branch gets its own members, plans, and staff — with a single admin view across all of them.',
  },
  {
    icon: ShieldCheck,
    title: 'Data You Can Trust',
    description:
      'Every membership, payment, and attendance record is tracked automatically and audit-ready — no more chasing down a lost paper register.',
  },
];

const stats = [
  { label: 'Built For', value: 'Gyms & Fitness Studios' },
  { label: 'Core Focus', value: 'Members, Attendance, Payments' },
  { label: 'Access', value: 'Owner + Receptionist Roles' },
];

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Dumbbell size={15} /> About GymDesk
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 leading-tight max-w-2xl mx-auto">
            We built GymDesk because front desks deserve better than a paper register
          </h1>
          <p className="mt-5 text-slate-500 max-w-xl mx-auto">
            GymDesk brings member management, biometric attendance, and payment tracking into one
            place — so gym owners spend less time on admin and more time growing their business.
          </p>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-slate-100 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {stats.map((s, i) => (
            <div key={i}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                {s.label}
              </p>
              <p className="text-lg font-semibold text-slate-800 mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full mb-3">
              WHAT WE BELIEVE
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">
              Software that fits how gyms actually run
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {values.map((v, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-7">
                <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center mb-5">
                  <v.icon size={22} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{v.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Users size={36} className="text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-3">
            Built for owners, receptionists, and members alike
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Branch owners get a full dashboard across members, revenue, and attendance.
            Receptionists get exactly the tools they need at the front desk — registration,
            check-in, and checkout — without extra clutter. And members get a smoother, faster
            experience walking through the door.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-green-600 to-green-700">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <CalendarCheck size={32} className="text-white mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Ready to see it running in your gym?
          </h2>
          <p className="text-green-50 mb-8">
            Register your branch and get approved within 1-2 business days.
          </p>
          <Link
            href="/create-store"
            className="inline-flex items-center gap-2 bg-white text-green-700 px-7 py-3 rounded-xl font-medium hover:bg-green-50 transition-colors"
          >
            Get Started <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
