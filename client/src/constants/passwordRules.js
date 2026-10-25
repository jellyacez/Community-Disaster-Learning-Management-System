// The rules the server enforces on sign-up and admin password resets
export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "uppercase", label: "At least 1 uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "symbol", label: "At least 1 symbol, like ! @ # $ or .", test: (p) => /[!@#$%^&*_=+\-/.]/.test(p) },
];

export const meetsPasswordRules = (password) => PASSWORD_RULES.every((rule) => rule.test(password));
