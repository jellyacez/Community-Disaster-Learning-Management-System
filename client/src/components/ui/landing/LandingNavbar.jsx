import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon, Menu01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";

export default function LandingNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-md">
            <HugeiconsIcon icon={Shield01Icon} className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-xs text-gray-400 font-medium">Bacolor, Pampanga</p>
            <p className="text-sm font-bold text-gray-800">DRRM Training Portal</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-7">
          {["Features", "Hazards", "How It Works"].map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase().replace(/ /g, "-")}`}
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
          {menuOpen ? (
            <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
          ) : (
            <HugeiconsIcon icon={Menu01Icon} className="w-5 h-5" />
          )}
        </button>
      </div>

      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-white border-t border-gray-100 px-4 py-5 flex flex-col gap-4"
        >
          {["Features", "Hazards", "How It Works"].map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase().replace(/ /g, "-")}`}
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
  );
}
