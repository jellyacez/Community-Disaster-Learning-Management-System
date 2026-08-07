import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";


export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), ],
  build: {
    sourcemap: false, // Prevents source code leakage in production
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [], // Strips console logs in production
  },
}));
