import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon, Menu01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";

const SECTIONS = ["Hazards", "Features", "How It Works", "FAQ"];
const sectionHref = (label) => `#${label.toLowerCase().replace(/ /g, "-")}`;

export default function LandingNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);
  const toggleRef = useRef(null);

  // While the mobile menu is open: close on an outside tap or Escape, and keep Tab inside the navbar
  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (e) => {
      if (!navRef.current?.contains(e.target)) setMenuOpen(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !navRef.current) return;
      const focusable = [...navRef.current.querySelectorAll("a[href], button")].filter(
        (el) => el.offsetParent !== null
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
      {menuOpen && <div className="md:hidden fixed inset-0 z-40 bg-gray-950/30" aria-hidden="true" />}

      <nav ref={navRef} aria-label="Main" className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex min-h-11 items-center gap-3" aria-label="Bacolor Disaster LMS — home">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center">
              <HugeiconsIcon aria-hidden="true" icon={Shield01Icon} className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-xs text-gray-600 font-medium">Pampanga, Philippines</p>
              <p className="text-sm font-bold text-gray-800">Bacolor Disaster LMS</p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-7">
            {SECTIONS.map((l) => (
              <a
                key={l}
                href={sectionHref(l)}
                className="inline-flex min-h-11 items-center text-sm text-gray-600 hover:text-gray-950 font-medium transition-colors"
              >
                {l}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/signin"
              className="inline-flex min-h-11 items-center px-4 text-sm font-semibold text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="inline-flex min-h-11 items-center px-4 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow"
            >
              Create Account
            </Link>
          </div>

          <button
            ref={toggleRef}
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-menu"
            className="md:hidden inline-flex h-11 w-11 items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <HugeiconsIcon aria-hidden="true" icon={menuOpen ? Cancel01Icon : Menu01Icon} className="w-5 h-5" />
          </button>
        </div>

        {menuOpen && (
          <motion.div
            id="landing-mobile-menu"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-white border-t border-gray-100 px-4 py-3 flex flex-col"
          >
            {SECTIONS.map((l) => (
              <a
                key={l}
                href={sectionHref(l)}
                className="flex min-h-11 items-center text-sm font-medium text-gray-700"
                onClick={() => setMenuOpen(false)}
              >
                {l}
              </a>
            ))}
            <div className="flex gap-3 pt-3 mt-2 border-t border-gray-100">
              <Link
                to="/signin"
                className="flex-1 inline-flex min-h-11 items-center justify-center text-sm font-semibold text-gray-900 border border-gray-300 rounded-lg"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="flex-1 inline-flex min-h-11 items-center justify-center text-sm font-semibold text-white bg-red-600 rounded-lg"
              >
                Create Account
              </Link>
            </div>
          </motion.div>
        )}
      </nav>
    </>
  );
}
