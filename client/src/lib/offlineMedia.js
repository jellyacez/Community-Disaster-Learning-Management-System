const cacheName = userId => 'lms-downloaded-media-v1-' + encodeURIComponent(userId);
export async function saveMedia(url, userId) {
  const response = await fetch(url, { credentials: new URL(url, location.href).origin === location.origin ? 'include' : 'omit' });
  if (!response.ok || response.status === 206 || response.type === 'opaque') throw new Error('Could not download complete media: ' + url);
  const blob = await response.blob();
  if (!blob.size || /text\/html/.test(blob.type)) throw new Error('Invalid media response: ' + url);
  await (await caches.open(cacheName(userId))).put(url, new Response(blob, {headers: {'Content-Type': blob.type || 'application/octet-stream'}}));
}
export async function readMedia(url, userId) {
  if (!userId || !url || !('caches' in window)) return null;
  const response = await (await caches.open(cacheName(userId))).match(url);
  return response ? response.blob() : null;
}
export function mediaUrls(payload) {
  const urls = new Set();
  for (const level of payload.levels || []) {
    if (level.cover_image) urls.add(level.cover_image);
    for (const step of level.steps || []) {
      if (step.media_url) urls.add(step.media_url);
      const doc = new DOMParser().parseFromString(step.content || '', 'text/html');
      doc.querySelectorAll('img[src],video[src],source[src]').forEach(el => urls.add(el.getAttribute('src')));
    }
  }
  return [...urls].filter(url => !url.startsWith('data:'));
}
