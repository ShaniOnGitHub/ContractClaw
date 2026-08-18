# ContractClaw Frontend

Vite + React 19 + TypeScript + TailwindCSS frontend for ContractClaw, deployed on **Vercel**.

## How API requests are routed

The frontend API client (`src/services/api.ts`) resolves the API base URL in this order:

1. **`VITE_API_BASE_URL` environment variable** — if set (e.g., in the Vercel dashboard under your project's Environment Variables, or in a `.env.production` file), all API calls go to that exact URL. This is the override knob if your backend is deployed anywhere other than the default.
2. **Same-origin relative path (`/api`)** — for every deployed host (vercel.app, custom domains, etc.), requests are sent relative to the frontend's own origin. The root `vercel.json` contains a rewrite rule that proxies all `/api/*` requests to the deployed backend (`https://contractclaw-api.onrender.com/api/*`). Because the URL is relative, it works identically on desktop, mobile, LAN previews, and any network — this is what fixes the "Network Error" and 405 failures.
3. **Local development fallback (`http://localhost:8000/api`)** — only used when the hostname is `localhost`, `127.0.0.1`, or a dotless LAN hostname (e.g., a phone previewing the desktop dev server over the same network). Never used on production hosts.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | No | Absolute backend URL (e.g., `https://contractclaw-api.onrender.com/api`). Only needed if your Render service has a different name/URL than the one in root `vercel.json`. |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | No | Optional Supabase auth integration; if both are set, login/signup use Supabase instead of the FastAPI backend. |

## Local development

```bash
pnpm install
pnpm dev        # starts Vite dev server (frontend requests localhost:8000)
```

The FastAPI backend (`api.py` at repo root) must be running on port 8000:

```bash
cd ..
pip install -r requirements.txt
uvicorn api:app --host 0.0.0.0 --port 8000
```

## Deployment

Deploy the **repository root** to Vercel. `vercel.json` at the root handles building the frontend (`cd frontend && npm install && npm run build`) and proxies `/api/*` to the backend. After deployment, sign up and log in from both desktop and mobile — both use the same origin and therefore the same working path.

## Known template info (Oxlint)

Two official plugins are available: `@vitejs/plugin-react` (uses Oxc) and `@vitejs/plugin-react-swc` (uses SWC). The React Compiler is not enabled because of its impact on dev & build performances.
