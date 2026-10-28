import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Download04Icon } from "@hugeicons/core-free-icons";

// Local calendar date as YYYY-MM-DD (toISOString would shift it to UTC)
const toDateInput = (d) => d.toLocaleDateString("en-CA");

const quarterStart = (d) => new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);

const PERIODS = [
  {
    id: "this_month",
    label: "This month",
    range: (now) => ({ from: new Date(now.getFullYear(), now.getMonth(), 1), to: now }),
  },
  {
    id: "last_month",
    label: "Last month",
    range: (now) => ({
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      to: new Date(now.getFullYear(), now.getMonth(), 0),
    }),
  },
  {
    id: "this_quarter",
    label: "This quarter",
    range: (now) => ({ from: quarterStart(now), to: now }),
  },
  {
    id: "last_quarter",
    label: "Last quarter",
    range: (now) => {
      const start = quarterStart(now);
      return {
        from: new Date(start.getFullYear(), start.getMonth() - 3, 1),
        to: new Date(start.getFullYear(), start.getMonth(), 0),
      };
    },
  },
  {
    id: "this_year",
    label: "This year",
    range: (now) => ({ from: new Date(now.getFullYear(), 0, 1), to: now }),
  },
];

const parseInput = (value) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
};

function formatRange(from, to) {
  if (!from || !to) return "";
  const a = parseInput(from);
  const b = parseInput(to);
  const sameYear = a.getFullYear() === b.getFullYear();
  const short = { month: "short", day: "numeric" };
  const left = a.toLocaleDateString("en-US", sameYear ? short : { ...short, year: "numeric" });
  const right = b.toLocaleDateString("en-US", { ...short, year: "numeric" });
  return `${left} – ${right}`;
}

// Mounting the dialog only while open gives every opening fresh state and dates.
// sheetOptions: [{ id, label, detail, locked? }]; locked sheets are always included and
// never sent, the rest are sent to onExport as `sheets` when checked.
export default function ExportReportModal({ isOpen, ...props }) {
  return isOpen ? <ExportReportDialog {...props} /> : null;
}

function ExportReportDialog({ sheetOptions, onClose, onExport, isExporting }) {
  const dialogRef = useRef(null);
  // Resolve every preset once per opening so labels and the export agree
  const [presets] = useState(() => {
    const now = new Date();
    return PERIODS.map((p) => {
      const r = p.range(now);
      const from = toDateInput(r.from);
      const to = toDateInput(r.to);
      return { ...p, from, to, rangeLabel: formatRange(from, to) };
    });
  });
  const [periodId, setPeriodId] = useState("this_month");
  const [custom, setCustom] = useState(() => ({ from: presets[0].from, to: presets[0].to }));
  const [sheets, setSheets] = useState(() => new Set(sheetOptions.map((s) => s.id)));

  const range = periodId === "custom" ? custom : presets.find((p) => p.id === periodId);
  const rangeError =
    !range.from || !range.to
      ? "Choose both dates."
      : range.from > range.to
        ? "The start date must be on or before the end date."
        : null;

  // The parent re-renders on its 60s poll with a new onClose; read the latest values
  // through refs so the focus setup below runs once per opening, not on every render
  const latest = useRef({ onClose, isExporting });
  useEffect(() => {
    latest.current = { onClose, isExporting };
  });

  // Focus trap and Escape, matching ConfirmationModal
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const getFocusable = () =>
      [...(dialogRef.current?.querySelectorAll("button:not([disabled]), input:not([disabled])") || [])].filter(
        (el) => !(el.type === "radio" && !el.checked),
      );
    dialogRef.current?.querySelector("input[type=radio]:checked")?.focus();
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !latest.current.isExporting) {
        latest.current.onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) return;
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
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, []);

  const toggleSheet = (id) =>
    setSheets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rangeError || isExporting) return;
    onExport({
      from: range.from,
      to: range.to,
      sheets: sheetOptions.filter((s) => !s.locked && sheets.has(s.id)).map((s) => s.id),
    });
  };

  // `relative` keeps each sr-only input inside its row; without it the input is placed
  // against the dialog, and focusing it scrolls the whole dialog out of position
  const rowBase =
    "relative flex items-center gap-3 min-h-12 px-4 py-2.5 cursor-pointer transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-red-600";
  const sectionLabel = "text-xs font-bold text-gray-900 dark:text-slate-100 mb-2";

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isExporting) onClose();
      }}
    >
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-report-title"
        aria-describedby="export-report-desc"
        onSubmit={handleSubmit}
        className="relative flex w-full sm:max-w-lg max-h-[92dvh] flex-col overflow-clip rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.35)] animate-in zoom-in-95 duration-200 motion-reduce:animate-none"
      >
        <header className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 pb-4 border-b border-gray-100 dark:border-slate-800">
          <div className="min-w-0">
            <h2 id="export-report-title" className="text-lg font-bold text-gray-900 dark:text-white text-balance">
              Export accomplishment report
            </h2>
            <p id="export-report-desc" className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">
              Downloads an Excel workbook (<span className="font-semibold text-gray-700 dark:text-slate-200">.xlsx</span>) for the period you choose.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            disabled={isExporting}
            className="-mr-2 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 dark:focus-visible:ring-slate-300 disabled:opacity-50"
          >
            <HugeiconsIcon aria-hidden="true" icon={Cancel01Icon} className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 space-y-6">
          <fieldset>
            <legend className={sectionLabel}>Reporting period</legend>
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-800 overflow-hidden">
              {[...presets, { id: "custom", label: "Custom range" }].map((p) => {
                const selected = periodId === p.id;
                return (
                  <label
                    key={p.id}
                    className={`${rowBase} ${selected ? "bg-red-50/70 dark:bg-red-950/30" : "hover:bg-gray-50 dark:hover:bg-slate-800/60"}`}
                  >
                    <input
                      type="radio"
                      name="report-period"
                      value={p.id}
                      checked={selected}
                      onChange={() => setPeriodId(p.id)}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                        selected ? "border-red-600 dark:border-red-500" : "border-gray-300 dark:border-slate-600"
                      }`}
                    >
                      {selected && <span className="h-1.5 w-1.5 rounded-full bg-red-600 dark:bg-red-500" />}
                    </span>
                    <span className={`flex-1 text-sm ${selected ? "font-semibold text-gray-900 dark:text-white" : "font-medium text-gray-700 dark:text-slate-300"}`}>
                      {p.label}
                    </span>
                    {p.id !== "custom" && (
                      <span className="text-xs tabular-nums text-gray-500 dark:text-slate-400 whitespace-nowrap">
                        {p.rangeLabel}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            {periodId === "custom" && (
              <div className="mt-3 grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
                {[
                  { key: "from", label: "From", max: custom.to || undefined },
                  { key: "to", label: "To", min: custom.from || undefined },
                ].map((f) => (
                  <label key={f.key} className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                    {f.label}
                    <input
                      type="date"
                      value={custom[f.key]}
                      min={f.min}
                      max={f.max}
                      onChange={(e) => setCustom((c) => ({ ...c, [f.key]: e.target.value }))}
                      className="mt-1 w-full min-h-11 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-medium tabular-nums text-gray-900 dark:text-slate-100 [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                    />
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <fieldset>
            <legend className={sectionLabel}>Sheets to include</legend>
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-800 overflow-hidden">
              {sheetOptions.map((s) => {
                const checked = s.locked || sheets.has(s.id);
                return (
                  <label
                    key={s.id}
                    className={`${rowBase} ${s.locked ? "cursor-default" : "hover:bg-gray-50 dark:hover:bg-slate-800/60"}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={s.locked}
                      onChange={() => toggleSheet(s.id)}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`grid h-4 w-4 shrink-0 place-items-center rounded border-2 transition-colors ${
                        checked
                          ? s.locked
                            ? "border-gray-400 bg-gray-400 dark:border-slate-500 dark:bg-slate-500"
                            : "border-red-600 bg-red-600 dark:border-red-500 dark:bg-red-500"
                          : "border-gray-300 dark:border-slate-600"
                      }`}
                    >
                      {checked && (
                        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2.5 6.2 5 8.5l4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-800 dark:text-slate-200">
                        {s.label}
                        {s.locked && <span className="ml-1.5 text-xs font-normal text-gray-500 dark:text-slate-400">Always included</span>}
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-slate-400">{s.detail}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>

        <footer className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-900">
          <p
            role={rangeError ? "alert" : undefined}
            className={`flex-1 min-w-0 text-xs ${rangeError ? "font-semibold text-red-700 dark:text-red-400" : "text-gray-500 dark:text-slate-400"}`}
          >
            {rangeError || (
              <>
                <span className="tabular-nums">{formatRange(range.from, range.to)}</span>
                {" · "}
                {sheetOptions.filter((s) => s.locked || sheets.has(s.id)).length} of {sheetOptions.length} sheets
              </>
            )}
          </p>
          <div className="flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="flex-1 sm:flex-initial min-h-11 px-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 dark:focus-visible:ring-slate-300 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!!rangeError || isExporting}
              className="flex-1 sm:flex-initial min-h-11 px-4 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-bold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <span aria-hidden="true" className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin motion-reduce:animate-none" />
              ) : (
                <HugeiconsIcon aria-hidden="true" icon={Download04Icon} className="w-4 h-4" />
              )}
              {isExporting ? "Preparing…" : "Download .xlsx"}
            </button>
          </div>
        </footer>
      </form>
    </div>,
    document.body,
  );
}
