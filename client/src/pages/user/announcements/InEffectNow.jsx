import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon, Call02Icon, Clock01Icon } from "@hugeicons/core-free-icons";
import { getAdvisoryStatus, formatAdvisoryLabel, formatAdvisoryTime, formatIssuedAt } from "../../../lib/advisoryStatus";

// Confirmed numbers only: an urgent advisory's call button must never dial a wrong number.
// Add the MDRRMO hotline here once its real number is confirmed.
const EMERGENCY_CALLS = [{ label: "Call 911", tel: "911" }];

// Urgent advisories currently in effect, set apart from routine posts and loud on purpose:
// a resident must get what to do, until when, and whom to call within a few seconds.
export default function InEffectNow({ advisories }) {
  if (advisories.length === 0) return null;

  return (
    <section aria-labelledby="in-effect-heading" className="space-y-3">
      <h2 id="in-effect-heading" className="flex items-center gap-2 text-xl font-extrabold text-red-700 dark:text-red-400">
        <HugeiconsIcon icon={Alert01Icon} className="h-5 w-5 shrink-0" aria-hidden="true" />
        In effect now
      </h2>

      {advisories.map((item) => {
        const { until } = getAdvisoryStatus(item) || {};
        const titleId = `advisory-${item.id}-title`;
        return (
          <article
            key={item.id}
            aria-labelledby={titleId}
            className="rounded-2xl bg-red-700 text-white p-5 sm:p-7 shadow-[0_8px_24px_-12px_rgba(185,28,28,0.55)]"
          >
            <h3 id={titleId} className="text-xl sm:text-2xl font-extrabold leading-tight text-balance">
              {item.title}
            </h3>
            <p className="mt-2 text-sm text-red-100">
              {formatAdvisoryLabel(item)} · Issued {formatIssuedAt(item.created_at)}
              {item.issuer ? ` by ${item.issuer}` : ""}
            </p>

            <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-800/70 px-3 py-2 text-base font-bold">
              <HugeiconsIcon icon={Clock01Icon} className="h-5 w-5 shrink-0" aria-hidden="true" />
              {until ? `In effect until ${formatAdvisoryTime(until)}` : "In effect until further notice"}
            </p>

            <p className="mt-4 max-w-[65ch] text-base leading-relaxed whitespace-pre-line text-white">
              {item.content}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {EMERGENCY_CALLS.map((call) => (
                <a
                  key={call.tel}
                  href={`tel:${call.tel}`}
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-white dark:bg-white px-5 text-base font-bold text-red-700 dark:text-red-700 hover:bg-red-50 dark:hover:bg-red-50 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
                >
                  <HugeiconsIcon icon={Call02Icon} className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {call.label}
                </a>
              ))}
            </div>
          </article>
        );
      })}
    </section>
  );
}
