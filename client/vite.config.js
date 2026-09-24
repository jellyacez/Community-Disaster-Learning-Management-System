import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons.svg", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "Bacolor LMS",
        short_name: "Bacolor LMS",
        description:
          "Community Disaster Learning Management System for disaster preparedness training, announcements, and resident learning support.",
        theme_color: "#dc2626",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api/], // CRITICAL: Excludes all API and SSE streams
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
        },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      buffer: "buffer/",
    },
  },
  define: {
    global: "window",
  },
  build: {
    sourcemap: false,
  },
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    hmr: {
      host: "localhost",
      port: 5173,
    },
  },
  preview: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
}));