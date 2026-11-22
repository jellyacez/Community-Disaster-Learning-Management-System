import { useEmergencyContacts } from "../../hooks/useEmergencyContacts";
import HotlineEntry from "./HotlineEntry";

export default function PortalFooter() {
  const contacts = useEmergencyContacts().contacts.slice(0, 2);
  return (
    <footer className="shrink-0 w-full max-w-full bg-white dark:bg-slate-900 border-t border-gray-200/80 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 z-20">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-2 lg:gap-4 text-[11px] sm:text-xs text-gray-500 dark:text-slate-400 font-medium">

        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-x-2.5 gap-y-1 text-center sm:text-left min-w-0">
          <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-bold text-gray-800 dark:text-slate-200">
              Bacolor Disaster LMS
            </span>
          </div>
          <span className="hidden sm:inline text-gray-300 dark:text-slate-700 select-none">
            &bull;
          </span>
          <span className="text-gray-600 dark:text-slate-400 leading-snug">
            Municipal Disaster Risk Reduction and Management Office (MDRRMO)
          </span>
        </div>


        <div className="flex flex-wrap items-center justify-center lg:justify-end gap-x-2.5 gap-y-1 text-gray-400 dark:text-slate-500 shrink-0">
          <span className="hidden xl:inline whitespace-nowrap">
            Disaster Preparedness &amp; Training Division
          </span>
          <span className="hidden xl:inline text-gray-300 dark:text-slate-700 select-none">
            &bull;
          </span>
          <span className="inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 font-semibold text-gray-700 dark:text-slate-300 tabular-nums">
            Emergency:
            {contacts.map((c, i) => (
              <span key={c.id} className="inline-flex items-center gap-x-1.5">
                {i > 0 && <span aria-hidden="true">/</span>}
                <HotlineEntry
                  contact={c}
                  aria-label={`${c.agency} (${c.label}) ${c.phone}`}
                  className="inline-flex items-center whitespace-nowrap"
                  linkClassName="text-red-600 dark:text-red-400 font-bold hover:underline"
                />
              </span>
            ))}
          </span>
        </div>
      </div>
    </footer>
  );
}
