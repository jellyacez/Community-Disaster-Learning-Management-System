// Shown when the API is unreachable and this device never saved branding. Keep in step with
// DEFAULT_SYSTEM_NAME in server/config/constants.js. Spec: docs/specs/branding.md
export const DEFAULT_SYSTEM_NAME = "Bacolor Disaster LMS";

// Must match the server check in server/utils/branding.js
export const MAX_LOGO_BYTES = 500 * 1024;
export const SYSTEM_NAME_MAX = 60;
export const LOGO_ACCEPT = "image/png,image/jpeg,image/webp";
