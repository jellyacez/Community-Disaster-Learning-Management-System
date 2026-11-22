import { useQuery } from "@tanstack/react-query";
import apiClient from "../lib/apiClient";
import { localDb } from "../lib/localDb";

// Spec: docs/specs/emergency-contacts.md
export const EMERGENCY_CONTACTS_KEY = ["emergencyContacts"];
const CACHE_KEY = "emergency_contacts";
const TEL_RE = /^\+?[0-9]{3,15}$/;

// Shown only when the API fails and this device has never saved a list.
export const FALLBACK_CONTACTS = [
  { id: "fallback-911", agency: "National Emergency", label: "Emergency hotline", phone: "911", tel: "911", is_sample: false },
];

// Latest list version announced over SSE. Sent as ?v= so the refetch skips the browser's 30 s copy.
let announcedVersion = null;
export function noteEmergencyContactsVersion(version) {
  if (Number.isInteger(version)) announcedVersion = version;
}

// Keeps only well-formed rows. A sample row, or one without a valid tel, is never dialable.
function clean(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((c) => c && typeof c.agency === "string" && typeof c.label === "string" && typeof c.phone === "string")
    .map((c) => ({
      id: c.id,
      agency: c.agency,
      label: c.label,
      phone: c.phone,
      is_sample: c.is_sample === true,
      tel: c.is_sample !== true && typeof c.tel === "string" && TEL_RE.test(c.tel) ? c.tel : null,
    }));
}

async function readSaved() {
  try {
    const entry = await localDb.app_cache.get(CACHE_KEY);
    const contacts = clean(entry?.contacts);
    return contacts.length ? contacts : null;
  } catch {
    return null;
  }
}

// Never throws: the global query error handler would toast, and a failed hotline fetch must not.
async function fetchContacts({ signal }) {
  try {
    const params = announcedVersion ? { v: announcedVersion } : undefined;
    const res = await apiClient.get("/public/emergency-contacts", { params, signal });
    const contacts = clean(res.data?.contacts);
    if (!contacts.length) throw new Error("empty contact list");
    localDb.app_cache.put({ key: CACHE_KEY, contacts, saved_at: Date.now() }).catch(() => {});
    return { contacts, source: "live" };
  } catch {
    const saved = await readSaved();
    return saved ? { contacts: saved, source: "cache" } : { contacts: FALLBACK_CONTACTS, source: "fallback" };
  }
}

// The hotlines for every resident- and visitor-facing surface.
// contacts is [] until the first answer (live, saved copy or 911 fallback).
export function useEmergencyContacts() {
  const { data, isPending } = useQuery({
    queryKey: EMERGENCY_CONTACTS_KEY,
    queryFn: fetchContacts,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    networkMode: "always", // run offline too, so the saved copy is shown
  });
  return { contacts: data?.contacts ?? [], source: data?.source ?? null, isPending };
}
