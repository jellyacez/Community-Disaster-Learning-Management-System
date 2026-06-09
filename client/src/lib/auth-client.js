import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
export const authClient = createAuthClient({
  baseURL: "http://localhost:5000",
  plugins: [adminClient()],
});

await authClient.revokeSession({
  token: "session-token",
});
