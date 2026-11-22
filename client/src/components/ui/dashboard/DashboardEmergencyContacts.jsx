import { HugeiconsIcon } from "@hugeicons/react";
import {
  Call02Icon,
  Copy01Icon,
  Facebook01Icon,
} from "@hugeicons/core-free-icons";
import toast from "react-hot-toast";
import { useEmergencyContacts } from "../../../hooks/useEmergencyContacts";
import HotlineEntry from "../HotlineEntry";

export default function DashboardEmergencyContacts() {
  const isTouchDevice =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;

  const contacts = useEmergencyContacts().contacts.map((c) => ({
    ...c,
    name: `${c.agency} (${c.label})`,
  }));

  const handleContactClick = (e, contact) => {
    if (!isTouchDevice) {
      e.preventDefault();
      if (navigator.clipboard) {
        navigator.clipboard.writeText(contact.phone);
        toast.success(`Copied ${contact.name}: ${contact.phone}`);
      }
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
          <HugeiconsIcon icon={Call02Icon} className="w-5 h-5 stroke-[2]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Emergency Contacts
          </h2>
          <p className="text-xs text-gray-500">
            {isTouchDevice
              ? "Tap to call local hotlines"
              : "Click to copy hotline number"}
          </p>
        </div>
      </div>
      <div className="space-y-2.5">
        {contacts.map((c) => (
          <HotlineEntry
            key={c.id}
            contact={c}
            onClick={(e) => handleContactClick(e, c)}
            title={
              isTouchDevice
                ? `Call ${c.name} at ${c.phone}`
                : `Click to copy ${c.name}: ${c.phone}`
            }
            aria-label={`${c.name} at ${c.phone}. ${isTouchDevice ? "Tap to call" : "Click to copy"}`}
            className="flex justify-between items-center gap-2 p-3 bg-gray-50 rounded-xl border border-transparent shadow-2xs group"
            linkClassName="hover:bg-red-50 hover:border-red-200 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 outline-hidden"
            tagClassName="text-amber-700"
          >
            {(sampleTag) => (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <HugeiconsIcon
                    icon={Call02Icon}
                    className={`w-4 h-4 shrink-0 text-gray-400 ${sampleTag ? "" : "group-hover:text-red-600 transition-colors"}`}
                  />
                  <span className={`font-semibold text-xs sm:text-sm text-gray-700 ${sampleTag ? "" : "group-hover:text-red-700"}`}>
                    {c.name}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <span className={`text-xs sm:text-sm font-bold font-mono tracking-tight ${sampleTag ? "text-gray-500" : "text-red-600"}`}>
                    {c.phone}
                  </span>
                  {sampleTag}
                  {!sampleTag && !isTouchDevice && (
                    <HugeiconsIcon
                      icon={Copy01Icon}
                      className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  )}
                </div>
              </>
            )}
          </HotlineEntry>
        ))}
      </div>
      <a
        href="https://www.facebook.com/BacolorRescue.DIMANteam"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Latest advisories from MDRRMO Bacolor on Facebook (opens in a new tab)"
        className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-700 underline underline-offset-4 hover:text-gray-950"
      >
        <HugeiconsIcon
          icon={Facebook01Icon}
          className="w-4 h-4 shrink-0"
          aria-hidden="true"
        />
        Latest advisories: MDRRMO Bacolor on Facebook
      </a>
    </div>
  );
}
