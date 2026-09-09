/**
 * Decodes HTML entities (e.g., &amp;, &lt;, &gt;, &quot;, &#39;, &apos;)
 * into clean plain text for UI rendering.
 *
 * Prevents raw HTML entity display across module titles, level titles,
 * step titles, questions, choices, and metadata.
 *
 * @param {string} str - Raw string possibly containing HTML entities
 * @returns {string} - Decoded plain-text string
 */
export function decodeHtml(str) {
  if (!str || typeof str !== "string") return str || "";
  if (!str.includes("&")) return str;

  // Browser standard entity decoding using DOMParser
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
      // Fall through to regex fallback if DOMParser fails
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
