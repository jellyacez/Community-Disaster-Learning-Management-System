import { Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon, Facebook01Icon } from "@hugeicons/core-free-icons";

const CONTACTS = [
  {
    name: "MDRRMO Bacolor",
    phones: [
      { label: "Globe 0966 136 5586", tel: "09661365586" },
      { label: "Smart 0929 446 1940", tel: "09294461940" },
    ],
    facebook: "https://www.facebook.com/BacolorRescue.DIMANteam",
  },
  {
    name: "BFP Bacolor Fire Station",
    phones: [{ label: "0923 103 8363", tel: "09231038363" }],
    facebook: "https://www.facebook.com/profile.php?id=61569884632047",
  },
];

export default function LandingFooter() {
  return (
    <footer className="bg-gray-950 text-gray-400 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shrink-0">
              <HugeiconsIcon aria-hidden="true" icon={Shield01Icon} className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">
                Bacolor Disaster LMS
              </p>
              <p className="text-xs mt-0.5">
                Municipality of Bacolor, Pampanga
              </p>
              <p className="text-xs mt-3 max-w-xs leading-relaxed text-pretty">
                A Multi-Level Learning Management and Certification System for
                Community-Based Disaster Preparedness Training.
              </p>
            </div>
          </div>

          <div>
            <p className="text-white text-xs font-bold mb-3 uppercase tracking-widest">
              Navigation
            </p>
            <ul className="text-xs">
              <li>
                <a
                  href="#hazards"
                  className="inline-flex min-h-11 items-center hover:text-white transition-colors"
                >
                  Hazards
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  className="inline-flex min-h-11 items-center hover:text-white transition-colors"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="inline-flex min-h-11 items-center hover:text-white transition-colors"
                >
                  How It Works
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="inline-flex min-h-11 items-center hover:text-white transition-colors"
                >
                  FAQ
                </a>
              </li>
              <li className="mt-1 border-t border-gray-800">
                <Link
                  to="/privacy-policy"
                  className="inline-flex min-h-11 items-center hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-white text-xs font-bold mb-3 uppercase tracking-widest">
              Contact
            </p>
            {/* Numbers and pages from each office's official Facebook page */}
            <div className="grid gap-6 text-xs sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 lg:gap-10">
              {CONTACTS.map((office) => (
                <div key={office.name}>
                  <p className="font-semibold text-gray-200">{office.name}</p>
                  <ul>
                    {office.phones.map((p) => (
                      <li key={p.tel}>
                        <a href={`tel:${p.tel}`} className="inline-flex min-h-11 items-center hover:text-white transition-colors">
                          {p.label}
                        </a>
                      </li>
                    ))}
                    <li>
                      <a
                        href={office.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${office.name} on Facebook (opens in a new tab)`}
                        className="inline-flex min-h-11 items-center gap-1.5 hover:text-white transition-colors"
                      >
                        <HugeiconsIcon aria-hidden="true" icon={Facebook01Icon} className="h-4 w-4" />
                        Facebook page
                      </a>
                    </li>
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs">
          <p>Modules published by the Bacolor MDRRMO</p>
          <p>Developed by IT-18</p>
        </div>
      </div>
    </footer>
  );
}
