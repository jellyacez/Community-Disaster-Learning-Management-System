import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Alert02Icon, Call02Icon } from "@hugeicons/core-free-icons";
import apiClient from "../../../lib/apiClient";
import useDocumentTitle from "../../../hooks/useDocumentTitle";
import { EMERGENCY_CONTACTS_KEY, noteEmergencyContactsVersion } from "../../../hooks/useEmergencyContacts";
import ConfirmationModal from "../../../components/ui/modals/ConfirmationModal";
import DashboardEmergencyContacts from "../../../components/ui/dashboard/DashboardEmergencyContacts";
import HotlineEntry from "../../../components/ui/HotlineEntry";
import HotlineRowEditor from "./emergency-contacts/HotlineRowEditor";
import { MAX_HOTLINES, validateHotlines, hasErrors, previewTel } from "./emergency-contacts/hotlineValidation";

const ADMIN_KEY = ["adminEmergencyContacts"];
const LANDING_COUNT = 3;

const toDraft = (contacts) =>
  contacts.map((c) => ({
    key: `id-${c.id}`,
    id: c.id,
    agency: c.agency,
    label: c.label,
    phone: c.phone,
    is_sample: c.is_sample,
    active: c.active,
  }));

const toPayload = (rows) =>
  rows.map((r) => ({
    ...(r.id !== undefined ? { id: r.id } : {}),
    agency: r.agency.trim(),
    label: r.label.trim(),
    phone: r.phone.trim(),
    is_sample: r.is_sample,
    active: r.active,
  }));

const sameList = (a, b) => JSON.stringify(toPayload(a)) === JSON.stringify(toPayload(b));

let newRowCount = 0;

const focusLater = (id) => requestAnimationFrame(() => document.getElementById(id)?.focus());

function lastSaved(contacts) {
  const newest = contacts.reduce((best, c) => (!best || c.updated_at > best.updated_at ? c : best), null);
  if (!newest) return null;
  const when = new Date(newest.updated_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
  return newest.updated_by_name ? `Last saved ${when} by ${newest.updated_by_name}` : `Last saved ${when}`;
}

export default function EmergencyContactsManager() {
  useDocumentTitle("Emergency Hotlines");
  const [editorKey, setEditorKey] = useState(0);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ADMIN_KEY,
    queryFn: async () => (await apiClient.get("/admin/emergency-contacts")).data,
  });

  const remount = useCallback(() => setEditorKey((k) => k + 1), []);
  const reload = useCallback(async () => {
    await refetch();
    remount();
  }, [refetch, remount]);

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-150 px-6 md:px-12 pt-2 pb-12">
      <nav className="flex text-sm text-gray-500 dark:text-slate-400 mb-2" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-2">
          <li className="inline-flex items-center">Admin Portal</li>
          <li className="flex items-center">
            <span className="mx-2 text-gray-400 dark:text-slate-500">&gt;</span>
            <span className="text-gray-900 dark:text-slate-100 font-semibold">Emergency Hotlines</span>
          </li>
        </ol>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Emergency Hotlines</h1>
      <p className="mt-1 max-w-[65ch] text-sm text-gray-500 dark:text-slate-400 text-pretty">
        The numbers residents and visitors see on the landing page, the footers and the resident dashboard.
        Sample numbers are shown with a tag and can&apos;t be dialed.
      </p>

      {isPending ? (
        <div className="mt-6 space-y-3" aria-busy="true" aria-label="Loading hotlines">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 dark:bg-slate-800/60 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-6 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-5 text-sm text-red-800 dark:text-red-200">
          <p className="font-semibold">Couldn&apos;t load the hotlines.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 inline-flex min-h-9 items-center rounded-xl bg-white dark:bg-slate-900 px-3 font-semibold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60 hover:bg-red-100 dark:hover:bg-red-950/50"
          >
            Try again
          </button>
        </div>
      ) : (
        <HotlineEditor key={editorKey} data={data} onReload={reload} onSaved={remount} />
      )}
    </div>
  );
}

function HotlineEditor({ data, onReload, onSaved }) {
  const queryClient = useQueryClient();
  const initial = useMemo(() => toDraft(data.contacts), [data.contacts]);
  const [baseVersion, setBaseVersion] = useState(data.version);
  const [rows, setRows] = useState(initial);
  const [serverErrors, setServerErrors] = useState(null);
  const [removing, setRemoving] = useState(null);

  const dirty = !sameList(rows, initial);
  const local = validateHotlines(rows);
  const invalid = hasErrors(local);
  const errorCount = local.rows.reduce((n, e) => n + Object.keys(e).length, 0) + (local.list ? 1 : 0);
  // Someone else saved since this draft was loaded (seen through SSE or a 409)
  const remoteVersion = data.version !== baseVersion ? data.version : null;

  // Nothing to lose: follow the other admin's save straight away
  useEffect(() => {
    if (remoteVersion && !dirty) onReload();
  }, [remoteVersion, dirty, onReload]);

  const save = useMutation({
    mutationFn: async (version) =>
      (await apiClient.put("/admin/emergency-contacts", { version, contacts: toPayload(rows) })).data,
    onSuccess: (saved) => {
      queryClient.setQueryData(ADMIN_KEY, saved);
      noteEmergencyContactsVersion(saved.version);
      queryClient.invalidateQueries({ queryKey: EMERGENCY_CONTACTS_KEY });
      toast.success("Hotlines saved. Residents see the new list now.");
      onSaved();
    },
    onError: (err) => {
      const status = err.response?.status;
      if (status === 409) {
        queryClient.invalidateQueries({ queryKey: ADMIN_KEY });
        toast.error("Another admin saved the hotlines first. Your edits are still here.");
      } else if (status === 400 && Array.isArray(err.response.data?.errors)) {
        setServerErrors(err.response.data.errors);
        toast.error("Some fields need fixing before this can be saved.");
      } else {
        toast.error("Couldn't save the hotlines. Check your connection and try again.");
      }
    },
  });

  // Server errors are shown until the next edit; local ones update as the admin types
  const rowErrors = rows.map((_, i) => {
    const fromServer = {};
    for (const e of serverErrors ?? []) if (e.index === i && e.field) fromServer[e.field] = e.message;
    return { ...fromServer, ...local.rows[i] };
  });
  const listError = local.list ?? serverErrors?.find((e) => e.index === undefined)?.message ?? null;

  const edit = (updater) => {
    setServerErrors(null);
    setRows(updater);
  };
  const change = (index, patch) => edit((rs) => rs.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const move = (index, step) => {
    const to = index + step;
    if (to < 0 || to >= rows.length) return;
    const key = rows[index].key;
    edit((rs) => {
      const next = [...rs];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
    const target = `hotline-${key}-${step < 0 ? "up" : "down"}`;
    const fallback = `hotline-${key}-${step < 0 ? "down" : "up"}`;
    requestAnimationFrame(() => {
      const el = document.getElementById(target);
      (el && !el.disabled ? el : document.getElementById(fallback))?.focus();
    });
  };
  const add = () => {
    const key = `new-${(newRowCount += 1)}`;
    edit((rs) => [...rs, { key, agency: "", label: "", phone: "", is_sample: false, active: true }]);
    focusLater(`hotline-${key}-agency`);
  };
  const askRemove = (index) => {
    const r = rows[index];
    const blank = r.id === undefined && !r.agency.trim() && !r.label.trim() && !r.phone.trim();
    if (blank) edit((rs) => rs.filter((_, i) => i !== index));
    else setRemoving(index);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!dirty || invalid || save.isPending) return;
    save.mutate(baseVersion);
  };
  const saveOverTheirs = () => {
    setBaseVersion(data.version);
    save.mutate(data.version);
  };

  const activeRows = rows.filter((r) => r.active);
  const landingKeys = new Set(activeRows.slice(0, LANDING_COUNT).map((r) => r.key));
  const preview = activeRows.map((r) => ({
    id: r.key,
    agency: r.agency.trim() || "Agency",
    label: r.label.trim() || "Line",
    phone: r.phone.trim() || "No number yet",
    is_sample: r.is_sample,
    tel: previewTel(r),
  }));
  const saved = lastSaved(data.contacts);
  const removingRow = removing === null ? null : rows[removing];

  return (
    <div className="mt-6 grid gap-6 2xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:items-start">
      <form
        onSubmit={submit}
        noValidate
        className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={Call02Icon} className="w-5 h-5 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Hotline list</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Order is the order residents see. The first {LANDING_COUNT} active hotlines appear on the landing page.
            </p>
          </div>
        </div>

        {remoteVersion && dirty && (
          <div
            role="alert"
            className="mx-6 mt-5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-900 dark:text-amber-100"
          >
            <p className="flex items-start gap-2 font-semibold">
              <HugeiconsIcon icon={Alert02Icon} className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Another admin saved the hotlines while you were editing.
            </p>
            <p className="mt-1 pl-6 text-amber-800 dark:text-amber-200/90">
              Load their version to start again from it, or save yours to replace it.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 pl-6">
              <button
                type="button"
                onClick={onReload}
                className="inline-flex min-h-9 items-center rounded-xl bg-white dark:bg-slate-900 px-3 font-semibold text-amber-900 dark:text-amber-100 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/60"
              >
                Load their version
              </button>
              <button
                type="button"
                onClick={saveOverTheirs}
                disabled={invalid || save.isPending}
                className="inline-flex min-h-9 items-center rounded-xl px-3 font-semibold text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-950/60 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save mine anyway
              </button>
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-500 dark:text-slate-400">
            No hotlines yet. Add at least one so residents have a number to call.
          </p>
        ) : (
          <ol className="divide-y divide-gray-100 dark:divide-slate-800" aria-label="Hotlines in display order">
            {rows.map((row, index) => (
              <HotlineRowEditor
                key={row.key}
                row={row}
                index={index}
                count={rows.length}
                errors={rowErrors[index]}
                onLanding={landingKeys.has(row.key)}
                onChange={change}
                onMove={move}
                onRemove={askRemove}
              />
            ))}
          </ol>
        )}

        {listError && (
          <p role="alert" className="mx-6 mb-1 mt-3 text-sm font-medium text-red-600 dark:text-red-400">
            {listError}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 dark:border-slate-800 px-6 py-4">
          <button
            type="button"
            onClick={add}
            disabled={rows.length >= MAX_HOTLINES}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-gray-200 dark:border-slate-700 px-3.5 text-sm font-semibold text-gray-800 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <HugeiconsIcon icon={Add01Icon} className="h-4 w-4" aria-hidden="true" />
            Add hotline
          </button>
          <span className="text-xs tabular-nums text-gray-500 dark:text-slate-400">
            {rows.length} of {MAX_HOTLINES}
          </span>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
            {dirty && invalid && (
              <span className="text-xs text-red-600 dark:text-red-400" aria-live="polite">
                Fix {errorCount} {errorCount === 1 ? "problem" : "problems"} to save
              </span>
            )}
            {dirty && (
              <button
                type="button"
                onClick={onReload}
                disabled={save.isPending}
                className="inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                Discard changes
              </button>
            )}
            <button
              type="submit"
              disabled={!dirty || invalid || save.isPending}
              className="inline-flex min-h-10 items-center justify-center px-4 bg-gray-900 dark:bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 dark:hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {save.isPending && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" aria-hidden="true" />
              )}
              {save.isPending ? "Saving..." : "Save hotlines"}
            </button>
          </div>
        </div>
        {saved && (
          <p className="border-t border-gray-100 dark:border-slate-800 px-6 py-3 text-xs text-gray-500 dark:text-slate-400">{saved}</p>
        )}
      </form>

      <aside aria-labelledby="hotline-preview-heading" className="2xl:sticky 2xl:top-6 grid gap-3 md:grid-cols-2 md:items-start 2xl:grid-cols-1">
        <div className="md:col-span-2 2xl:col-span-1">
          <h2 id="hotline-preview-heading" className="text-sm font-bold text-gray-900 dark:text-white">
            What residents see
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            {dirty ? "Preview of your unsaved changes." : "Matches the live list."}
          </p>
        </div>
        <DashboardEmergencyContacts contacts={preview} />
        <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/60 p-4 text-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">Landing page</p>
          <div className="mt-1.5 flex flex-col gap-1 text-gray-700 dark:text-slate-200">
            {preview.slice(0, LANDING_COUNT).map((c) => (
              <HotlineEntry key={c.id} contact={c} className="inline-flex items-center text-gray-700 dark:text-slate-200" linkClassName="underline underline-offset-4 decoration-gray-400 dark:decoration-slate-500">
                {c.agency} ({c.label}) {c.phone}
              </HotlineEntry>
            ))}
            {preview.length === 0 && <span className="text-gray-400 dark:text-slate-500">No active hotlines</span>}
          </div>
        </div>
      </aside>

      <ConfirmationModal
        isOpen={removingRow !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          edit((rs) => rs.filter((_, i) => i !== removing));
          setRemoving(null);
        }}
        type="danger"
        title={`Remove ${removingRow ? [removingRow.agency.trim(), removingRow.label.trim()].filter(Boolean).join(" / ") || "this hotline" : ""}?`}
        description="It leaves the landing page, the footers and the resident dashboard when you save. To hide it for now and keep the number, untick Active instead."
        confirmText="Remove"
      />
    </div>
  );
}
