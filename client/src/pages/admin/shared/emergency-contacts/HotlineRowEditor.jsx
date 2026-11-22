import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUp01Icon, ArrowDown01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import StatusBadge from "../../../../components/ui/StatusBadge";

const INPUT =
  "w-full px-3 py-2 border bg-white dark:bg-slate-800/80 text-gray-900 dark:text-white rounded-xl text-sm placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-colors";
const INPUT_OK = "border-gray-200 dark:border-slate-700 focus:ring-blue-500/20 focus:border-blue-500";
const INPUT_BAD = "border-red-400 dark:border-red-500/70 focus:ring-red-500/20 focus:border-red-500";
const ICON_BUTTON =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-30 disabled:pointer-events-none transition-colors";

function Field({ id, label, value, error, onChange, placeholder, inputMode, mono }) {
  const errorId = `${id}-error`;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        inputMode={inputMode}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`${INPUT} ${error ? INPUT_BAD : INPUT_OK} ${mono ? "font-mono tabular-nums" : ""}`}
      />
      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

// One editable hotline. Order buttons sit on the left so the list reads top to bottom as residents see it.
export default function HotlineRowEditor({ row, index, count, errors, onLanding, onChange, onMove, onRemove }) {
  const base = `hotline-${row.key}`;
  const name = [row.agency.trim(), row.label.trim()].filter(Boolean).join(" / ") || `hotline ${index + 1}`;

  return (
    <li className={`px-4 py-4 sm:px-6 ${row.active ? "" : "bg-gray-50/70 dark:bg-slate-900/40"}`}>
      <div className="flex gap-3 sm:gap-4">
        <div className="flex flex-col items-center pt-5">
          <button
            type="button"
            id={`${base}-up`}
            className={ICON_BUTTON}
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            aria-label={`Move ${name} up`}
          >
            <HugeiconsIcon icon={ArrowUp01Icon} className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="text-xs font-semibold tabular-nums text-gray-400 dark:text-slate-500" aria-hidden="true">
            {index + 1}
          </span>
          <button
            type="button"
            id={`${base}-down`}
            className={ICON_BUTTON}
            onClick={() => onMove(index, 1)}
            disabled={index === count - 1}
            aria-label={`Move ${name} down`}
          >
            <HugeiconsIcon icon={ArrowDown01Icon} className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <Field
              id={`${base}-agency`}
              label="Agency"
              value={row.agency}
              error={errors.agency}
              placeholder="e.g. MDRRMO Bacolor"
              onChange={(v) => onChange(index, { agency: v })}
            />
            <Field
              id={`${base}-label`}
              label="Line"
              value={row.label}
              error={errors.label}
              placeholder="e.g. Globe, Landline"
              onChange={(v) => onChange(index, { label: v })}
            />
            <Field
              id={`${base}-phone`}
              label="Number"
              value={row.phone}
              error={errors.phone}
              placeholder="e.g. 0917 123 4567"
              inputMode="tel"
              mono
              onChange={(v) => onChange(index, { phone: v })}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={row.active}
                onChange={(e) => onChange(index, { active: e.target.checked })}
                className="h-4 w-4 rounded accent-blue-600"
              />
              Active
            </label>
            <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={row.is_sample}
                onChange={(e) => onChange(index, { is_sample: e.target.checked })}
                aria-describedby={`${base}-sample-hint`}
                className="h-4 w-4 rounded accent-amber-600"
              />
              Sample number
              <span id={`${base}-sample-hint`} className="sr-only">
                Sample numbers are shown with a tag and cannot be dialed.
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-1.5">
              {onLanding && <StatusBadge color="blue">Landing page</StatusBadge>}
              {row.is_sample && <StatusBadge color="amber">Sample, not dialable</StatusBadge>}
              {!row.active && <StatusBadge color="gray">Hidden from residents</StatusBadge>}
            </div>

            <button
              type="button"
              onClick={() => onRemove(index)}
              className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-gray-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors"
              aria-label={`Remove ${name}`}
            >
              <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" aria-hidden="true" />
              Remove
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
