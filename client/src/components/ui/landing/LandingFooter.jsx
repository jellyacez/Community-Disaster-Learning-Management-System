import { Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Facebook01Icon } from "@hugeicons/core-free-icons";
import { useBranding } from "../../../hooks/useBranding";
import BrandMark, { BrandName } from "../BrandMark";
import { useEmergencyContacts } from "../../../hooks/useEmergencyContacts";
import HotlineEntry from "../HotlineEntry";

// Official Facebook pages, matched by the agency name an admin gives a hotline
const FACEBOOK_PAGES = {
  "MDRRMO Bacolor": "https://www.facebook.com/BacolorRescue.DIMANteam",
  "BFP Bacolor": "https://www.facebook.com/profile.php?id=61569884632047",
};

// Hotlines grouped by agency, in the order an admin set
function groupByAgency(contacts) {
  const groups = new Map();
  for (const c of contacts) {
    if (!groups.has(c.agency)) groups.set(c.agency, []);
    groups.get(c.agency).push(c);
  }
  return [...groups].map(([name, phones]) => ({ name, phones, facebook: FACEBOOK_PAGES[name] }));
}

export default function LandingFooter() {
  const brand = useBranding();
  const offices = groupByAgency(useEmergencyContacts().contacts);
  return (
    <footer className="bg-gray-950 text-gray-400 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
          <div className="flex items-start gap-3">
            <BrandMark logoSrc={brand.logoSrc} pending={brand.logoPending} />
            <div className="min-w-0">
              <p className="text-white font-bold text-sm break-words">
                <BrandName name={brand.name} />
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
            {/* Columns, not a grid: each office stacks under the previous one in its column, so a tall office
                (several numbers) leaves no empty row beside a short one. Order runs down, then across. */}
            <div className="text-xs columns-1 sm:columns-2 md:columns-1 lg:columns-2 gap-x-10">
              {offices.map((office) => (
                <div key={office.name} className="break-inside-avoid mb-6 last:mb-0">
                  <p className="font-semibold text-gray-200">{office.name}</p>
                  <ul>
                    {office.phones.map((p) => (
                      <li key={p.id}>
                        <HotlineEntry
                          contact={p}
                          className="inline-flex min-h-11 items-center"
                          linkClassName="hover:text-white transition-colors"
                        >
                          {p.label} {p.phone}
                        </HotlineEntry>
                      </li>
                    ))}
                    {office.facebook && (
                    <li>
                      <a
                        href={office.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${office.name} on Facebook (opens in a new tab)`}
                        className="inline-flex min-h-11 items-center gap-1.5 hover:text-white transition-colors"
                      >
                        <HugeiconsIcon
                          aria-hidden="true"
                          icon={Facebook01Icon}
                          className="h-4 w-4"
                        />
                        Facebook page
                      </a>
                    </li>
                    )}
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
