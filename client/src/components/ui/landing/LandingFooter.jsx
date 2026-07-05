import React from "react";
import { Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon } from "@hugeicons/core-free-icons";

export default function LandingFooter() {
  return (
    <footer className="bg-gray-950 text-gray-500 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-700 flex items-center justify-center flex-shrink-0">
              <HugeiconsIcon aria-hidden="true" icon={Shield01Icon} className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">
                DRRM Training Portal
              </p>
              <p className="text-xs mt-0.5">
                Municipality of Bacolor, Pampanga
              </p>
              <p className="text-xs mt-3 max-w-xs leading-relaxed">
                A Multi-Level Learning Management and Certification System for
                Community-Based Disaster Preparedness Training.
              </p>
            </div>
          </div>

          <div>
            <p className="text-white text-xs font-bold mb-3 uppercase tracking-widest">
              Navigation
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="#features"
                  className="hover:text-red-400 transition-colors"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#hazards"
                  className="hover:text-red-400 transition-colors"
                >
                  Hazards Covered
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="hover:text-red-400 transition-colors"
                >
                  How It Works
                </a>
              </li>
              <li className="pt-2 mt-2 border-t border-gray-800">
                <Link
                  to="/privacy-policy"
                  className="hover:text-red-400 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-white text-xs font-bold mb-3 uppercase tracking-widest">
              Hazard Coverage
            </p>
            <ul className="space-y-2 text-xs">
              {[
                "Flooding & Inundation",
                "Earthquake Response",
                "Fire Safety & Prevention",
              ].map((h) => (
                <li key={h} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs">
          <p>
            Developed by{" "}
            <span className="text-gray-400 font-semibold">IT-18</span>
          </p>
          <p>
            Aligned with{" "}
            <span className="text-red-400 font-semibold">PRC</span> &{" "}
            <span className="text-red-400 font-semibold">NDRRMC</span>{" "}
            standards
          </p>
        </div>
      </div>
    </footer>
  );
}
