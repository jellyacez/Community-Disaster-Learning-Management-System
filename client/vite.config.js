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
        name: "Bacolor Disaster LMS",
        short_name: "Bacolor Disaster LMS",
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
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [],
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
    rollupOptions: {
      output: {
        // Chunk groups pull in their modules' dependencies by default, so the old
        // manualChunks rules dragged React, buffer, tslib, clsx, etc. into react-pdf-vendor
        // and recharts-vendor, and every page (even the landing page) downloaded the whole
        // PDF engine (~530 KB gz). React now gets its own chunk first, and the heavy
        // libraries capture only their own modules; shared code stays in shared chunks.
        codeSplitting: {
          groups: [
            {
              name: "react-vendor",
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: "react-pdf-vendor",
              test: /@react-pdf|pdfkit|fontkit|png-js|restructure/,
              priority: 20,
              includeDependenciesRecursively: false,
            },
            {
              name: "html5-qrcode-vendor",
              test: /html5-qrcode/,
              priority: 20,
              includeDependenciesRecursively: false,
            },
            {
              name: "recharts-vendor",
              test: /recharts|victory-vendor|[\\/]d3-/,
              priority: 20,
              includeDependenciesRecursively: false,
            },
          ],
        },
        // Recommended by Rolldown when groups skip their dependencies, so modules split
        // across chunks still run in import order
        strictExecutionOrder: true,
      },
    },
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
