import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon } from "@hugeicons/core-free-icons";
import apiClient from "../../../../../lib/apiClient";
import { getAdvisoryStatus, formatAdvisoryTime } from "../../../../../lib/advisoryStatus";
import { useLiftAnnouncement } from "../../../../../hooks/useLiftAnnouncement";

// Urgent advisories this barangay currently has pinned for residents, with a way to end them early.
// Renders nothing when none are in effect, so it only takes space when there is something to act on.
export default function ActiveAdvisoriesPanel() {
  const { data } = useQuery({
    queryKey: ["activeAdvisories"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/barangay/announcements");
      return res.data?.data || [];
    },
    refetchInterval: 60000,
  });
  const { lift, liftingId } = useLiftAnnouncement();

  const active = (Array.isArray(data) ? data : []).filter(
    (item) => getAdvisoryStatus(item)?.state === "in_effect"
  );
  if (active.length === 0) return null;

  return (
    <section
      aria-labelledby="active-advisories-heading"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/60 p-4 sm:p-5"
    >
      <h2
        id="active-advisories-heading"
        className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-300"
      >
        <HugeiconsIcon icon={Alert01Icon} className="w-4 h-4 shrink-0" />
        Urgent advisories in effect ({active.length})
      </h2>
      <ul className="mt-3 divide-y divide-gray-100 dark:divide-slate-800">
        {active.map((item) => {
          const { until } = getAdvisoryStatus(item);
          return (
            <li key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 break-words">{item.title}</p>
                <p className="text-xs text-gray-600 dark:text-slate-400 mt-0.5">
                  {until ? `Pinned for residents until ${formatAdvisoryTime(until)}` : "Pinned for residents until lifted"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => lift(item)}
                disabled={liftingId === item.id}
                className="h-11 px-4 shrink-0 rounded-xl border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold uppercase tracking-wide hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50 transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                {liftingId === item.id ? "Lifting..." : "Lift advisory"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
