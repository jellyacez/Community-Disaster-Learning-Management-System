/** Decodes HTML entities (&amp;, &lt;, &#39;, ...) so titles, questions and choices render as plain text. */
export function decodeHtml(str) {
  if (!str || typeof str !== "string") return str || "";
  if (!str.includes("&")) return str;

  if (typeof window !== "undefined" && typeof DOMParser !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(str, "text/html");
      const decoded = doc.documentElement.textContent || str;
      // Guard against double-encoded entities like &amp;amp;
      if (decoded.includes("&amp;")) {
        return decoded.replace(/&amp;/g, "&");
      }
      return decoded;
    } catch {
      // fall through to the regex fallback
    }
  }

  // Regex fallback for SSR, test environments, or DOMParser failure
  let decoded = str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");

  if (decoded.includes("&amp;")) {
    decoded = decoded.replace(/&amp;/g, "&");
  }

  return decoded;
}
