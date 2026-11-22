// Reduces a User-Agent string to what a session may be bound to: browser family (plus engine).
// OS and major version are returned too, but only for logging: they change legitimately
// (browser auto-update, DevTools device mode, "Request desktop site").
// Handwritten, no dependency; the order of the checks matters because Edge, Opera and Samsung
// Internet all also say "Chrome/", and Chrome also says "Safari/". Versions are capped at 4 digits and
// every pattern is linear (no nested or leading-wildcard scans): this runs on every authenticated
// request with an attacker-controlled header, and the result goes into log lines.

const FAMILIES = [
  { family: "edge", re: /\bEdg(?:e|A|iOS)?\/(\d{1,4})/, engine: "blink" },
  { family: "opera", re: /\b(?:OPR|Opera)\/(\d{1,4})/, engine: "blink" },
  { family: "samsung", re: /\bSamsungBrowser\/(\d{1,4})/, engine: "blink" },
  { family: "firefox", re: /\b(?:Firefox|FxiOS)\/(\d{1,4})/, engine: "gecko" },
  { family: "chrome", re: /\b(?:Headless)?(?:Chrome|Chromium|CriOS)\/(\d{1,4})/, engine: "blink" },
  { family: "safari", re: /\bVersion\/(\d{1,4})/, needs: /\bSafari\//, engine: "webkit" },
];

const detectOs = (ua) => {
  // iOS UAs contain "like Mac OS X" and Android UAs contain "Linux", so test those first
  if (/\b(?:iPhone|iPad|iPod)\b/.test(ua)) return "ios";
  if (/\bAndroid\b/.test(ua)) return "android";
  if (/\bWindows\b/.test(ua)) return "windows";
  if (/\bCrOS\b/.test(ua)) return "chromeos";
  if (/\b(?:Macintosh|Mac OS X)\b/.test(ua)) return "macos";
  if (/\bLinux\b/.test(ua)) return "linux";
  return "other";
};

/**
 * @param {string|null|undefined} userAgent raw header value, or a value stored by an older build
 * @returns {{family: string, engine: string, os: string, version: string}|null} null when blank
 */
const normalizeUserAgent = (userAgent) => {
  if (typeof userAgent !== "string" || !userAgent.trim()) return null;
  const ua = userAgent.trim();
  const os = detectOs(ua);

  for (const { family, re, needs, engine } of FAMILIES) {
    const match = ua.match(re);
    if (match && (!needs || needs.test(ua))) {
      // every browser on iOS renders with WebKit
      return { family, engine: os === "ios" ? "webkit" : engine, os, version: match[1] };
    }
  }

  // not a recognised browser (curl, python-requests, a bot): bind to the first product token
  const product = ua.match(/^([A-Za-z][\w.-]*)(?:\/(\d{1,4}))?/);
  return {
    family: product ? product[1].toLowerCase().slice(0, 40) : "unknown",
    engine: "other",
    os,
    version: product?.[2] || "",
  };
};

/**
 * Decides what to do when a session created with `storedUserAgent` is used with `incomingUserAgent`.
 * Only a browser-family change is a revoke: a stolen cookie replayed from a script or another
 * browser changes the family, while updates and device-mode emulation do not.
 *
 * @returns {{action: "allow"|"revoke", reason: string|null, expected: object|null, received: object|null}}
 *   `reason` is null when nothing worth logging changed.
 */
const compareClients = (storedUserAgent, incomingUserAgent) => {
  const expected = normalizeUserAgent(storedUserAgent);
  const received = normalizeUserAgent(incomingUserAgent);

  // sessions without a stored UA were never bound
  if (!expected) return { action: "allow", reason: null, expected, received };
  // a missing header proves nothing: some clients and proxies strip it
  if (!received) return { action: "allow", reason: "ua_missing", expected, received };
  if (expected.family !== received.family) {
    return { action: "revoke", reason: "browser_family_changed", expected, received };
  }
  if (expected.os !== received.os) return { action: "allow", reason: "os_changed", expected, received };
  if (expected.version !== received.version) return { action: "allow", reason: "version_changed", expected, received };
  return { action: "allow", reason: null, expected, received };
};

module.exports = { normalizeUserAgent, compareClients };
