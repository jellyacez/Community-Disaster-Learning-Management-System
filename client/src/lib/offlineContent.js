export const contentKey = (owner, kind) => `lms_content_v1:${encodeURIComponent(owner)}:${kind}`;
export function readContent(owner, kind) {
  if (!owner) return null;
  try {
    const entry = JSON.parse(localStorage.getItem(contentKey(owner, kind)) || 'null');
    return entry?.owner === String(owner) ? entry : null;
  } catch { return null; }
}

export function writeContent(owner, kind, value) {
  const entry = { owner: String(owner), value, savedAt: Date.now(), fromCache: false, persisted: true };
  try { localStorage.setItem(contentKey(owner, kind), JSON.stringify(entry)); }
  catch { return {...entry, persisted: false}; }
  return entry;
}

export async function loadContent(owner, kind, fetchValue) {
  if (!owner) throw new Error('Sign in to read saved content.');
  const cached = readContent(owner, kind);
  if (!navigator.onLine) {
    if (cached) return {...cached, fromCache: true};
    const error = new Error('No saved copy on this device. Open this page online first.');
    error.code = 'ERR_NETWORK';
    throw error;
  }
  try { return writeContent(owner, kind, await fetchValue()); }
  catch (error) {
    // Never present old data as a fallback for an explicit authorization/server rejection.
    if (!error.response && cached) return {...cached, fromCache: true};
    if (error.response?.status === 401 || error.response?.status === 403 || error.response?.status === 404) {
      try { localStorage.removeItem(contentKey(owner, kind)); } catch { /* restricted storage */ }
    }
    throw error;
  }
}

export function mergeAnnouncements(oldItems = [], incoming = []) {
  const records = new Map();
  for (const item of [...oldItems, ...incoming]) {
    if (item?.id != null) records.set(String(item.id), item);
  }
  return [...records.values()].sort((a,b) => {
    const stamp = item => new Date(item.created_at || item.createdAt || item.date || 0).getTime() || 0;
    return stamp(b) - stamp(a) || String(b.id).localeCompare(String(a.id), undefined, {numeric:true});
  });
}
