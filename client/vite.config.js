import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      buffer: "buffer/",
    },
  },
  define: {
    global: "window",
  },
  build: {
    sourcemap: false, // Prevents source code leakage in production
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [], // Strips console logs in production
  },
  server: {
    // Bind to all interfaces so the dev server is reachable outside a Docker container.
    // Has no effect in normal local dev (localhost still works as usual).
    host: '0.0.0.0',
    port: 5173,
    // Tell the browser to connect HMR WebSocket to localhost instead of the
    // container's internal hostname — required for hot reload inside Docker.
    hmr: {
      host: 'localhost',
      port: 5173,
    },
  },
}));
