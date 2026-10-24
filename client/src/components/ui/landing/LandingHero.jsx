import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Location01Icon, ArrowRight01Icon, CheckmarkBadge01Icon } from "@hugeicons/core-free-icons";

// Miniature of the real certificate (pages/user/certificates/certTemplate.jsx): same wording,
// navy and gold. The QR opens the public verification page.
// Motion: once the card settles, a scan line passes over the QR, then the badge confirms it.
const SCAN_DELAY = 1.1;

function SampleCertificate({ reduceMotion }) {
  const verifyUrl = `${window.location.origin}/verify`;

  return (
    <div className="relative bg-[#fcfbf8] p-1.5 border-[3px] border-blue-900 shadow-[0_24px_48px_-16px_rgba(15,23,42,0.35)]">
      <div className="relative border border-[#b89f5d] px-5 sm:px-8 pt-12 pb-6 text-center">
        <div className="absolute top-3 left-3 h-11 w-11 overflow-hidden">
          <QRCodeSVG
            value={verifyUrl}
            size={44}
            level="M"
            bgColor="#fcfbf8"
            fgColor="#0f172a"
            role="img"
            aria-label="QR code linking to the certificate verification page"
          />
          {!reduceMotion && (
            <motion.span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-3 border-b-2 border-emerald-500 bg-emerald-400/25"
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: [-12, 44], opacity: [0, 1, 1, 0] }}
              transition={{ delay: SCAN_DELAY, duration: 0.8, ease: "easeInOut", times: [0, 0.15, 0.85, 1] }}
            />
          )}
        </div>
        <p className="absolute top-3 right-3 text-[10px] text-gray-500 tabular-nums">Control No. 2026-0417</p>

        <p className="text-[10px] uppercase tracking-[0.18em] text-gray-600">Republic of the Philippines</p>
        <p className="mt-1 text-[10px] sm:text-[11px] leading-snug text-gray-600">
          Municipality of Bacolor, Pampanga
          <br />
          Municipal Disaster Risk Reduction and Management Office
        </p>

        <p className="mt-5 text-2xl sm:text-3xl font-bold tracking-[0.12em] text-blue-900">CERTIFICATE</p>
        <p className="text-xs sm:text-sm tracking-[0.1em] text-[#6f5c2e]">OF COMPLETION</p>

        <p className="mt-4 text-[11px] text-gray-600">This is to officially certify that</p>
        <p className="mx-auto mt-1 max-w-[16rem] border-b border-blue-900 pb-1 text-lg sm:text-xl font-bold text-gray-900">
          Juan dela Cruz
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-wider text-gray-500">
          Authorized Resident — Brgy. Cabalantian
        </p>
        <p className="mt-3 text-[11px] leading-relaxed text-gray-700">
          has completed the <span className="font-bold">Flood Preparedness</span> training module.
        </p>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div className="flex-1 border-t border-gray-800 pt-1 text-[9px] text-gray-600">Barangay Captain</div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-dashed border-[#b89f5d] text-[7px] font-bold uppercase leading-tight text-[#6f5c2e]">
            MDRRMO
            <br />
            Seal
          </div>
          <div className="flex-1 border-t border-gray-800 pt-1 text-[9px] text-gray-600">MDRRMO Officer</div>
        </div>
      </div>

      <motion.div
        className="absolute -bottom-4 -right-3 sm:-right-5 inline-flex origin-bottom-right items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-[0_6px_16px_-6px_rgba(15,23,42,0.3)]"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: SCAN_DELAY + 0.75, type: "spring", stiffness: 420, damping: 24 }}
      >
        <HugeiconsIcon aria-hidden="true" icon={CheckmarkBadge01Icon} className="h-4 w-4" />
        Checkable by QR code
      </motion.div>
    </div>
  );
}

export default function LandingHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-white pt-16">
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pt-14 pb-20 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:pt-24 lg:pb-28">
        <div>
          <p className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600">
            <HugeiconsIcon aria-hidden="true" icon={Location01Icon} className="h-4 w-4 text-gray-500" />
            Bacolor, Pampanga — Municipal DRRM Community Initiative
          </p>

          <h1 className="mb-6 text-5xl font-extrabold leading-[1.05] tracking-tight text-gray-950 text-balance md:text-6xl">
            Be Prepared. Stay Resilient.
          </h1>

          <p className="mb-9 max-w-xl text-lg leading-relaxed text-gray-600 text-pretty">
            A community-based disaster preparedness learning system built for
            every Bacolor resident. Train, advance through levels, and earn
            certifications that prove your readiness.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <Link
              to="/register"
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 px-8 py-4 font-bold text-white shadow-[0_8px_20px_-8px_rgba(220,38,38,0.6)] transition-colors hover:bg-red-700"
            >
              Create Free Account
              <HugeiconsIcon aria-hidden="true" icon={ArrowRight01Icon} className="h-5 w-5" />
            </Link>

            <Link
              to="/signin"
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-8 py-4 font-semibold text-gray-900 transition-colors hover:border-gray-400 hover:bg-gray-100"
            >
              Sign In
            </Link>
          </div>
        </div>

        <figure className="mx-auto w-full max-w-md lg:max-w-none">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 32, rotate: 0 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <SampleCertificate reduceMotion={reduceMotion} />
          </motion.div>
          <figcaption className="mt-9 text-center text-sm text-gray-600 lg:text-left">
            Sample certificate. Each one carries a QR code anyone can scan to check it.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
