# Web app (React + Vite)

The resident and admin web app. Setup and commands are in the repository's [docs/setup.md](../docs/setup.md); its environment variables (`VITE_API_URL`, `VITE_BASE_URL`, `VITE_TURNSTILE_SITE_KEY`) are in [docs/configuration.md](../docs/configuration.md#client-clientenv).

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on http://localhost:5173 |
| `npm run build` | Production build into `dist/` (environment values are baked in at build time) |
| `npm run preview` | Serve the build locally |
| `npm run lint` | ESLint |
