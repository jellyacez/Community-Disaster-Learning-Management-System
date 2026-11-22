// One-shot notice for the sign-in page, set when the server ends a session for a reason the user
// should be told about. sessionStorage survives the full-page redirect to /signin.
export const SESSION_BROWSER_CHANGED = "SESSION_BROWSER_CHANGED";

const KEY = "authNotice";

const NOTICES = {
  [SESSION_BROWSER_CHANGED]: "You were signed out because your browser changed. Please sign in again.",
};

export const setAuthNotice = (code) => {
  if (NOTICES[code]) sessionStorage.setItem(KEY, code);
};

// Reading does not clear: React may run state initializers twice. Call clearAuthNotice() after.
export const readAuthNotice = () => NOTICES[sessionStorage.getItem(KEY)] ?? null;

export const clearAuthNotice = () => sessionStorage.removeItem(KEY);
