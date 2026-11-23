// Email HTML is built from strings: every interpolated value goes through escapeHtml, every href through frontendUrl.
const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);

// FRONTEND_URL + path (+ URL-encoded query), refused unless http(s), escaped for an href attribute.
// Read at call time so a misconfigured value fails the send instead of mailing a javascript: link.
const frontendUrl = (path, query = {}) => {
  const base = process.env.FRONTEND_URL || "http://localhost:5173";
  const qs = Object.entries(query)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  const href = `${base}${path}${qs ? `?${qs}` : ""}`;
  let protocol;
  try {
    protocol = new URL(href).protocol;
  } catch {
    protocol = null;
  }
  if (protocol !== "http:" && protocol !== "https:") {
    throw new Error("FRONTEND_URL must be an absolute http(s) URL");
  }
  return escapeHtml(href);
};

module.exports = { escapeHtml, frontendUrl };
