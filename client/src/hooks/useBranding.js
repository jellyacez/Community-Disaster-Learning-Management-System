import { useQuery } from "@tanstack/react-query";
import apiClient from "../lib/apiClient";
import { localDb } from "../lib/localDb";
import { DEFAULT_SYSTEM_NAME, SYSTEM_NAME_MAX } from "../constants/branding";

// Spec: docs/specs/branding.md
export const BRANDING_KEY = ["branding"];
const SAVED_KEY = ["branding", "saved"];
const CACHE_KEY = "branding";
// Small synchronous copy of the name, so a returning visitor never sees the wrong name flash
const HINT_KEY = "branding_hint";
const LOGO_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

// Latest version announced over SSE. Sent as ?v= so the refetch skips the browser's 60 s copy.
let announcedVersion = null;
export function noteBrandingVersion(version) {
  if (Number.isInteger(version)) announcedVersion = version;
}

const validName = (name) => typeof name === "string" && name.trim().length > 0 && [...name].length <= SYSTEM_NAME_MAX;

function clean(entry) {
  if (!entry || !validName(entry.name) || !Number.isInteger(entry.version)) return null;
  const logoDataUrl = typeof entry.logoDataUrl === "string" && LOGO_DATA_URL.test(entry.logoDataUrl) ? entry.logoDataUrl : null;
  return { name: entry.name, version: entry.version, logoDataUrl };
}

function readHint() {
  try {
    const hint = JSON.parse(localStorage.getItem(HINT_KEY) || "null");
    return hint && validName(hint.name) ? { name: hint.name, hasLogo: hint.hasLogo === true } : null;
  } catch {
    return null;
  }
}

function save(value) {
  localDb.app_cache.put({ key: CACHE_KEY, ...value, saved_at: Date.now() }).catch(() => {});
  try {
    localStorage.setItem(HINT_KEY, JSON.stringify({ name: value.name, hasLogo: Boolean(value.logoDataUrl) }));
  } catch { /* storage full or blocked: the IndexedDB copy still works */ }
}

async function readSaved() {
  try {
    return clean(await localDb.app_cache.get(CACHE_KEY));
  } catch {
    return null;
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Never throws (the global query error handler would toast); null means "use the saved copy".
async function fetchBranding({ signal }) {
  try {
    const params = announcedVersion ? { v: announcedVersion } : undefined;
    const { data } = await apiClient.get("/public/branding", { params, signal });
    if (!validName(data?.name) || !Number.isInteger(data?.version)) return null;

    const saved = await readSaved();
    let logoDataUrl = null;
    if (data.logo) {
      if (saved?.version === data.version && saved.logoDataUrl) {
        logoDataUrl = saved.logoDataUrl;
      } else {
        try {
          const res = await apiClient.get("/public/branding/logo", { params: { v: data.version }, responseType: "blob", signal });
          const url = await blobToDataUrl(res.data);
          logoDataUrl = LOGO_DATA_URL.test(url) ? url : null;
        } catch {
          logoDataUrl = saved?.logoDataUrl ?? null; // keep the last logo rather than flip to the default
        }
      }
    }
    const value = { name: data.name, version: data.version, logoDataUrl };
    save(value);
    return value;
  } catch {
    return null;
  }
}

/**
 * The system name and logo for every surface, signed in, signed out and offline.
 * name is null only on a first visit before any answer: render an empty slot, not a wrong name.
 * logoPending is true while a saved logo is still being read: render a blank tile, not the default.
 */
export function useBranding() {
  const saved = useQuery({
    queryKey: SAVED_KEY,
    queryFn: readSaved,
    staleTime: Infinity,
    networkMode: "always",
  });
  const live = useQuery({
    queryKey: BRANDING_KEY,
    queryFn: fetchBranding,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    networkMode: "always", // run offline too, so the saved copy is shown
  });

  const value = live.data ?? saved.data;
  if (value) return { name: value.name, logoSrc: value.logoDataUrl, logoPending: false, source: live.data ? "live" : "cache" };

  const settled = !saved.isPending && !live.isPending;
  if (settled) return { name: DEFAULT_SYSTEM_NAME, logoSrc: null, logoPending: false, source: "fallback" };

  const hint = readHint();
  return { name: hint?.name ?? null, logoSrc: null, logoPending: Boolean(hint?.hasLogo), source: null };
}
