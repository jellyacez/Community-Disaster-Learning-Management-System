import { createAuthClient } from "better-auth/react";
import { adminClient, twoFactorClient } from "better-auth/client/plugins";

const isDev = import.meta.env.DEV;

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BASE_URL || (isDev ? "http://localhost:5000" : ""),
  plugins: [adminClient(), twoFactorClient()],
});
