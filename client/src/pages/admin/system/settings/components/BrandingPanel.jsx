import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../../../lib/apiClient";
import toast from "react-hot-toast";
import { HugeiconsIcon } from "@hugeicons/react";
import { Image01Icon, Delete02Icon, AlertCircleIcon } from "@hugeicons/core-free-icons";
import { BRANDING_KEY } from "../../../../../hooks/useBranding";
import BrandMark from "../../../../../components/ui/BrandMark";
import { DEFAULT_SYSTEM_NAME, MAX_LOGO_BYTES, SYSTEM_NAME_MAX, LOGO_ACCEPT } from "../../../../../constants/branding";

// Spec: docs/specs/branding.md. The server repeats every check (server/utils/branding.js).
const LOGO_TYPES = LOGO_ACCEPT.split(",");

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function BrandingPanel({ settingsData }) {
  const queryClient = useQueryClient();
  const savedName = settingsData?.system_name || DEFAULT_SYSTEM_NAME;
  const [name, setName] = useState(savedName);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // The field follows the saved value until the admin edits it
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(savedName);
  }, [savedName]);

  // Object URL for the picked file, revoked when it changes or is cleared
  useEffect(() => {
    if (!file) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Fetched on its own so the polled settings query stays small
  const { data: logo } = useQuery({
    queryKey: ["systemLogo"],
    queryFn: async () => (await apiClient.get("/admin/settings/logo")).data.data,
    // The logo only changes on save, which invalidates this query; don't re-download it per visit
    staleTime: Infinity,
  });
  const currentLogo = logo?.system_logo || null;
  const unsupported = logo?.logo_supported === false;

  const trimmed = name.trim();
  const nameChanged = trimmed !== savedName;
  const nameValid = [...trimmed].length >= 2 && [...trimmed].length <= SYSTEM_NAME_MAX;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
    queryClient.invalidateQueries({ queryKey: ["systemLogo"] });
    queryClient.invalidateQueries({ queryKey: BRANDING_KEY, exact: true });
  };

  const pickFile = (e) => {
    const picked = e.target.files?.[0] ?? null;
    e.target.value = ""; // picking the same file again still fires change
    if (!picked) return;
    if (!LOGO_TYPES.includes(picked.type)) {
      toast.error("Use a PNG, JPG or WEBP image. SVG logos aren't accepted.", { id: "branding" });
      return;
    }
    if (picked.size > MAX_LOGO_BYTES) {
      toast.error("Logo image is too large. Maximum size is 500 KB.", { id: "branding" });
      return;
    }
    setFile(picked);
  };

  const send = async (body, pending, done) => {
    try {
      setIsSaving(true);
      toast.loading(pending, { id: "branding" });
      await apiClient.patch("/admin/settings/branding", body);
      toast.success(done, { id: "branding" });
      setFile(null);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update branding", { id: "branding" });
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!nameValid) {
      toast.error(`System name must be 2 to ${SYSTEM_NAME_MAX} characters.`, { id: "branding" });
      return;
    }
    const body = {};
    if (nameChanged) body.system_name = trimmed;
    if (file) body.system_logo = await readAsDataUrl(file);
    await send(body, "Updating branding...", "Branding updated");
  };

  const shownLogo = preview || currentLogo;
  const canSave = !isSaving && nameValid && (nameChanged || Boolean(file));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gray-100 dark:bg-slate-800">
          <HugeiconsIcon icon={Image01Icon} className="w-5 h-5 text-gray-600 dark:text-slate-300" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">System Branding</h2>
          <p className="text-sm mt-1 max-w-md text-gray-500 dark:text-slate-400 text-pretty">
            Changes the name and logo shown in the app and in emails. The installed app&apos;s name and home-screen
            icon are set when the app is built and don&apos;t change here.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label htmlFor="system_name" className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
            System Name
          </label>
          <input
            id="system_name"
            type="text"
            name="system_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={SYSTEM_NAME_MAX}
            required
            aria-describedby="system_name_help"
            className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-brand-500/20"
          />
          <p id="system_name_help" className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">
            2 to {SYSTEM_NAME_MAX} characters. {[...name].length}/{SYSTEM_NAME_MAX}
          </p>
        </div>

        <div>
          <span className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Platform Logo</span>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 px-3 py-2">
              <BrandMark logoSrc={shownLogo} />
              <span className="text-xs text-gray-600 dark:text-slate-300">
                {preview ? "New logo (not saved yet)" : currentLogo ? "Current logo" : "Default logo"}
              </span>
            </div>
            <label
              htmlFor="system_logo"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-dashed border-gray-300 dark:border-slate-600 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-slate-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 focus-within:ring-2 focus-within:ring-gray-900/20 dark:focus-within:ring-brand-500/40 transition-colors"
            >
              <HugeiconsIcon icon={Image01Icon} className="w-4 h-4 text-gray-500 dark:text-slate-400" aria-hidden="true" />
              {file ? "Choose a different image" : "Choose image"}
              <input
                id="system_logo"
                type="file"
                name="system_logo"
                accept={LOGO_ACCEPT}
                onChange={pickFile}
                aria-describedby="system_logo_help"
                className="sr-only"
              />
            </label>
            {file && (
              <button
                type="button"
                onClick={() => setFile(null)}
                className="min-h-10 px-3 text-xs font-semibold text-gray-600 dark:text-slate-300 hover:underline"
              >
                Cancel new logo
              </button>
            )}
            {!file && (currentLogo || unsupported) && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => send({ remove_logo: true }, "Removing logo...", "Logo removed; the default logo is shown")}
                className="inline-flex min-h-10 items-center gap-1.5 px-3 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
              >
                <HugeiconsIcon icon={Delete02Icon} className="w-4 h-4" aria-hidden="true" />
                Remove logo
              </button>
            )}
          </div>
          <p id="system_logo_help" className="mt-2 text-[11px] text-gray-500 dark:text-slate-400 text-pretty">
            PNG, JPG or WEBP, up to 500 KB. Upload an exported logo image, not a phone photo.
            {file && <span className="block mt-0.5 text-gray-700 dark:text-slate-300">Selected: {file.name}</span>}
          </p>
          {unsupported && !file && (
            <p role="status" className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              <HugeiconsIcon icon={AlertCircleIcon} className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
              The saved logo isn&apos;t a supported format (SVG or a link). Upload a PNG, JPG or WEBP, or remove it.
            </p>
          )}
        </div>

        <div className="pt-4 border-t border-gray-100/50 dark:border-slate-800">
          <button
            type="submit"
            disabled={!canSave}
            className="flex items-center justify-center px-4 py-2 bg-gray-900 dark:bg-brand-600 text-white text-sm font-bold rounded-lg hover:bg-black dark:hover:bg-brand-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />}
            {isSaving ? "Saving..." : "Save Branding"}
          </button>
        </div>
      </form>
    </div>
  );
}
