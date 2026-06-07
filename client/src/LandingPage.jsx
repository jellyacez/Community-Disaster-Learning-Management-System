import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  BookOpen,
  Award,
  Wifi,
  Users,
  ChevronRight,
  Waves,
  Flame,
  AlertTriangle,
  ArrowRight,
  Menu,
  X,
  Building2,
  MapPin,
  ArrowDown,
} from 'lucide-react';

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const hazards = [
    {
      icon: <Waves className="w-8 h-8" />,
      title: 'Flooding',
      description:
        "Learn flood preparedness protocols, evacuation routes, and emergency response procedures specific to Bacolor's flood-prone areas near Mt. Pinatubo.",
      gradient: 'from-blue-600 to-cyan-600',
      accent: 'text-blue-700',
      border: 'border-blue-200',
    },
    {
      icon: <AlertTriangle className="w-8 h-8" />,
      title: 'Earthquake',
      description:
        'Understand seismic safety measures, drop-cover-hold procedures, and post-earthquake protocols — critical preparation for "The Big One" scenario.',
      gradient: 'from-amber-500 to-orange-600',
      accent: 'text-amber-700',
      border: 'border-amber-200',
    },
    {
      icon: <Flame className="w-8 h-8" />,
      title: 'Fire',
      description:
        'Master fire prevention techniques, safe evacuation procedures, and community fire response methods aligned with local DRRM standards.',
      gradient: 'from-red-500 to-rose-700',
      accent: 'text-red-700',
      border: 'border-red-200',
    },
  ];

  const features = [
    {
      icon: <BookOpen className="w-5 h-5" />,
      title: 'Progressive Multi-Level Learning',
      description:
        'Advance through competency levels as you complete modules — starting from disaster basics and moving to advanced preparedness skills.',
    },
    {
      icon: <Award className="w-5 h-5" />,
      title: 'Verifiable Digital Certificates',
      description:
        'Earn QR-secured digital certificates upon completing training, recognized by barangay and municipal DRRM offices.',
    },
    {
      icon: <Wifi className="w-5 h-5" />,
      title: 'Offline Access via PWA',
      description:
        'Progressive Web App technology lets you continue your training even when internet connectivity is interrupted — built for barangay-level realities.',
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: 'Secure Role-Based Access',
      description:
        'Encrypted records and role-specific dashboards ensure your training data stays protected and accessible only to authorized users.',
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: 'Community-Wide Coverage',
      description:
        'Connects residents, barangay officials, and MDRRMO administrators in a unified platform for coordinated community preparedness.',
    },
    {
      icon: <Building2 className="w-5 h-5" />,
      title: 'Locally Adapted Content',
      description:
        "All training content is tailored to Bacolor's specific hazards, aligned with Philippine Red Cross and NDRRMC standards.",
    },
  ];

  const steps = [
    {
      num: '01',
      title: 'Create Your Account',
      desc: 'Register as a Bacolor resident to gain access to the training platform.',
    },
    {
      num: '02',
      title: 'Begin at Level 1',
      desc: 'Start with foundational disaster awareness modules designed for your community.',
    },
    {
      num: '03',
      title: 'Pass Competency Assessments',
      desc: 'Complete timed quizzes and scenario-based activities to advance to higher levels.',
    },
    {
      num: '04',
      title: 'Earn Your Certificate',
      desc: 'Receive a verifiable digital certificate tied to your profile upon successful completion.',
    },
  ];

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-md">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-xs text-gray-400 font-medium">Bacolor, Pampanga</p>
              <p className="text-sm font-bold text-gray-800">DRRM Training Portal</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-7">
            {['Features', 'Hazards', 'How It Works'].map((l) => (
              <a
                key={l}
                href={`#${l.toLowerCase().replace(/ /g, '-')}`}
                className="text-sm text-gray-500 hover:text-red-600 font-medium transition-colors"
              >
                {l}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/signin"
              className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow"
            >
              Register
            </Link>
          </div>

          <button
            className="md:hidden p-2 text-gray-500 hover:text-gray-800 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-white border-t border-gray-100 px-4 py-5 flex flex-col gap-4"
          >
            {['Features', 'Hazards', 'How It Works'].map((l) => (
              <a
                key={l}
                href={`#${l.toLowerCase().replace(/ /g, '-')}`}
                className="text-sm font-medium text-gray-700"
                onClick={() => setMenuOpen(false)}
              >
                {l}
              </a>
            ))}
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <Link
                to="/signin"
                className="flex-1 py-2 text-center text-sm font-semibold text-red-600 border border-red-200 rounded-lg"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="flex-1 py-2 text-center text-sm font-semibold text-white bg-red-600 rounded-lg"
              >
                Register
              </Link>
            </div>
          </motion.div>
        )}
      </nav>

      <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-red-950 to-gray-900" />
        <div className="absolute top-24 right-0 w-96 h-96 bg-red-700 opacity-10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-orange-600 opacity-10 rounded-full blur-3xl pointer-events-none" />

        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative max-w-6xl mx-auto px-4 py-28 w-full">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/30 text-red-300 text-xs font-semibold px-4 py-2 rounded-full mb-6"
            >
              <MapPin className="w-3 h-3" />
              Bacolor, Pampanga — Municipal DRRM Community Initiative
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6 tracking-tight"
            >
              Be Prepared.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                Stay Resilient.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-gray-300 leading-relaxed mb-10 max-w-2xl"
            >
              A community-based disaster preparedness learning system built for every
              Bacolor resident. Train, advance through levels, and earn certifications
              that prove your readiness.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <button
                onClick={() => navigate('/register')}
                className="flex items-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg transition-all"
              >
                Start Training Free
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => navigate('/signin')}
                className="flex items-center gap-2 px-8 py-4 text-white font-semibold rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm"
              >
                Sign In to Account
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.7 }}
              className="mt-16 pt-8 border-t border-white/10 flex flex-wrap gap-10"
            >
              {[
                { val: '3', sub: 'Disaster Types Covered' },
                { val: 'Multi-Level', sub: 'Progressive Modules' },
                { val: 'PWA', sub: 'Works Offline' },
                { val: 'QR-Verified', sub: 'Digital Certificates' },
              ].map((s, i) => (
                <div key={i}>
                  <p className="text-2xl font-extrabold text-white">{s.val}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-gray-500">
          <span className="text-xs tracking-wide">SCROLL</span>
          <ArrowDown className="w-4 h-4 animate-bounce" />
        </div>
      </section>

      <section id="hazards" className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="inline-block bg-red-100 text-red-700 text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wide">
              Covered Hazards
            </span>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-3">
              Training for Bacolor&apos;s Real Threats
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto text-sm leading-relaxed">
              Modules are grounded in the specific hazards that Bacolor communities face.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {hazards.map((h, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className={`rounded-2xl overflow-hidden border ${h.border} bg-white shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className={`bg-gradient-to-r ${h.gradient} p-6 flex items-center gap-4`}>
                  <span className="text-white">{h.icon}</span>
                  <h3 className="text-xl font-bold text-white">{h.title}</h3>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 text-sm leading-relaxed">{h.description}</p>
                  <button
                    onClick={() => navigate('/signin')}
                    className={`mt-5 inline-flex items-center gap-1 text-xs font-bold ${h.accent} hover:underline`}
                  >
                    Browse Modules <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="inline-block bg-gray-100 text-gray-600 text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wide">
              System Features
            </span>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-3">
              Built for the Community, Inside Out
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto text-sm leading-relaxed">
              Every feature accounts for barangay-level realities.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:border-red-100 hover:bg-red-50/20 transition-all group cursor-default"
              >
                <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-4 group-hover:bg-red-600 group-hover:text-white transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-2">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 bg-gradient-to-br from-gray-900 to-red-950">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="inline-block bg-red-600/20 border border-red-500/20 text-red-300 text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wide">
              How It Works
            </span>
            <h2 className="text-4xl font-extrabold text-white mb-3">
              Your Path to Preparedness
            </h2>
            <p className="text-gray-400 max-w-lg mx-auto text-sm leading-relaxed">
              A structured, progressive journey from awareness to verified community competency.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.14 }}
                className="relative"
              >
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-16 left-full w-6 h-px bg-red-500/40 z-10" />
                )}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center h-full">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-600/30 to-red-800/30 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
                    <span className="text-3xl font-black text-red-400">{s.num}</span>
                  </div>
                  <h3 className="font-bold text-white text-sm mb-2">{s.title}</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-6">
            Training Content Aligned With
          </p>
          <div className="flex flex-wrap justify-center items-center gap-10">
            {[
              'Philippine Red Cross',
              'NDRRMC',
              'Bacolor MDRRMO',
              'Republic Act 10121',
            ].map((org) => (
              <div key={org} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm font-bold text-gray-700">{org}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-r from-red-700 via-red-600 to-rose-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block bg-white/20 text-white/90 text-xs font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-wide border border-white/20">
              Join Your Community
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-5 leading-tight">
              Ready to Start Your Preparedness Training?
            </h2>
            <p className="text-red-100 max-w-xl mx-auto mb-10 leading-relaxed">
              Disaster readiness starts with a single step.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => navigate('/register')}
                className="flex items-center gap-2 px-10 py-4 bg-white text-red-700 font-extrabold rounded-xl shadow-xl hover:bg-red-50 transition-colors"
              >
                Create Free Account
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/signin')}
                className="px-10 py-4 text-white font-bold rounded-xl border-2 border-white/40 hover:bg-white/10 transition-colors"
              >
                Sign In
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="bg-gray-950 text-gray-500 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-700 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">DRRM Training Portal</p>
                <p className="text-xs mt-0.5">Municipality of Bacolor, Pampanga</p>
                <p className="text-xs mt-3 max-w-xs leading-relaxed">
                  A Multi-Level Learning Management and Certification System for
                  Community-Based Disaster Preparedness Training.
                </p>
              </div>
            </div>

            <div>
              <p className="text-white text-xs font-bold mb-3 uppercase tracking-widest">Navigation</p>
              <ul className="space-y-2 text-xs">
                <li><a href="#features" className="hover:text-red-400 transition-colors">Features</a></li>
                <li><a href="#hazards" className="hover:text-red-400 transition-colors">Hazards Covered</a></li>
                <li><a href="#how-it-works" className="hover:text-red-400 transition-colors">How It Works</a></li>
              </ul>
            </div>

            <div>
              <p className="text-white text-xs font-bold mb-3 uppercase tracking-widest">Hazard Coverage</p>
              <ul className="space-y-2 text-xs">
                {['Flooding & Inundation', 'Earthquake Response', 'Fire Safety & Prevention'].map((h) => (
                  <li key={h} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs">
            <p>Developed by <span className="text-gray-400 font-semibold">IT-18</span></p>
            <p>Aligned with <span className="text-red-400 font-semibold">PRC</span> & <span className="text-red-400 font-semibold">NDRRMC</span> standards</p>
          </div>
        </div>
      </footer>
    </div>
  );
}