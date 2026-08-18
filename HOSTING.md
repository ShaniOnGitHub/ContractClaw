# ContractClaw Hosting Guide

This document explains where each part of ContractClaw should be hosted, why, and how to change hosts if needed.

## Recommended setup (current)

| Part | Host | Why |
| --- | --- | --- |
| Frontend (React/Vite) | **Vercel** | Static site, free tier is excellent, automatic GitHub deploys. |
| Backend (FastAPI) | **Render** (or Railway / fly.io) | Long-running process with a persistent filesystem, which the app requires. |

The root `vercel.json` already proxies frontend `/api/**` requests to the deployed backend, so the frontend always works from any device. The only value you must keep correct is the backend URL in `vercel.json` (or the `BACKEND_URL` environment variable in the Vercel dashboard).

## Why the backend cannot run on Vercel serverless functions

The ContractClaw backend stores real, user-specific data in three places that must **survive between requests**:

1. `contractclaw.db` — SQLite database with all users, passwords, contracts, and credits
2. `uploads/<user_id>/` — uploaded PDF contract files
3. `chroma_db/` — per-user vector stores powering contract search and analysis

Vercel's Python serverless functions are **stateless**: each request runs on a fresh, ephemeral copy of the code, and the filesystem is wiped between invocations. Concretely:

- A user who signs up on request #1 would be **gone** by request #2.
- Uploaded PDFs and their vector indexes would disappear, so "Contracts", "Analyze", and "Query" would silently return empty data or crash.
- PDF parsing and vector indexing run as background tasks after the response is returned; Vercel kills background work when the response is sent (10-second default execution limit), so uploads would get stuck in "Indexing..." forever.
- Free-tier Vercel rejects request payloads over 4.5 MB, but the app allows 25 MB PDFs.
- The heavy dependencies (LangChain, sentence-transformers, PDF parsers) cause cold starts measured in seconds to minutes on serverless, making every first request slow.

None of these can be fixed with a config change — they require replacing SQLite with a managed cloud database (e.g., Supabase Postgres), PDFs with object storage (S3/R2), and the background worker with a task queue. That is a large architecture rewrite, not a hosting change.

## What that means for you

**Keep the backend on Render (or move it to Railway/fly.io).** Render's free plan fits this app exactly: always-available process, persistent disk, 25 MB+ request bodies, and long background tasks.

If you specifically want everything under one Vercel account, the closest equivalent is:

| Option | Effort | Cost | Notes |
| --- | --- | --- | --- |
| Keep Render (recommended) | None — already set up | Free tier | Just redeploy after code changes |
| Move backend to Railway | Low — almost identical to Render | Free trial, then ~$5/mo | Same Docker/Web Service model as Render |
| Move backend to fly.io | Low | Free allowance, then usage-based | Docker-based, persistent volumes available |
| Full Vercel (serverless + Supabase + S3) | High — major refactor | Free tier + cloud DB | Only worth it at much larger scale |

## Switching the backend host

If you move the backend from Render to another host, two things must change:

1. Deploy the backend at the new host (e.g., `python3 -m uvicorn api:app` on a Web Service).
2. Update the proxy target: change the destination in the root `vercel.json` rewrite (or set the `BACKEND_URL` environment variable in the Vercel dashboard). Example:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://YOUR-NEW-BACKEND-HOST/api/$1" }
  ]
}
```

Then verify from a mobile browser: create a new account, upload a PDF, and confirm the queue reaches "Ready for analysis".

## Environment variables (backend)

| Variable | Required? | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` or `OPENAI_API_KEY` | Recommended | Full AI risk analysis and redlining. Without either, the app falls back to the deterministic rule engine automatically. |
| `BACKEND_URL` (Vercel frontend) | Optional | Override the proxied backend URL if your host name differs from the one in `vercel.json`. |

## Railway deployment notes (added after $PORT startup crash)

If your Railway deploy log shows `Invalid value for '--port': '$PORT' is not a valid integer`, the platform ran the start command without expanding the `$PORT` shell variable.

Fix: Railway now automatically uses `railway.json` in this repo, which starts the server with `python main.py` — a portable entry point that reads the `PORT` environment variable itself (falling back to 8000), so no shell expansion is ever needed. The `Procfile` provides the same `python main.py` start for any other platform that reads Procfiles.

If you prefer to set the start command manually in Railway's Variables/Settings panel, use exactly:

```
python main.py
```

Do NOT use `uvicorn api:app --port $PORT` as a raw command, since single-quote/quoting issues in Railway's command field can pass the literal `$PORT` string to uvicorn.

## Self-hosted single URL (Railway recommended setup)

The backend embeds the built React frontend and serves it from the **same URL** as the API. One deployment, one URL, everything works — desktop, mobile, any network, no proxy rewrites and no separate frontend host required.

How it works: `api.py` checks whether `frontend/dist` exists. If so, it mounts `/assets` (JS/CSS) as static files and adds a catch-all route that serves `index.html` for every non-API path (this is what makes React SPA routes like `/login` and `/dashboard` work). If the folder is missing, the server runs in API-only mode with a warning.

Deployment steps for Railway (or Render/fly.io):

1. Push this repo to GitHub.
2. In Railway: **New Project → Deploy from GitHub → select this repo**. Railway reads `railway.json` automatically (start command `python main.py`, healthcheck `/api/health`).
3. Set your secrets in Railway → Variables: `GROQ_API_KEY` or `OPENAI_API_KEY`, `JWT_SECRET`, `CONTRACTCLAW_CREATOR_EMAIL`.
4. That's it. One domain (e.g. `https://yourapp.up.railway.app`) serves both the app UI and all `/api/v1/**` endpoints.

Notes:

- `railway.json` + `Procfile` + `main.py` are the only deployment files; `vercel.json` remains only for users who choose to host the frontend separately on Vercel.
- The frontend build is committed under `frontend/dist`, so Railway builds do not need Node.js — the Python image is enough. If you change frontend code, run `cd frontend && npm run build` locally and commit the rebuilt `dist` before pushing.
- Railway healthchecks poll `/api/health` (registered as a legacy route returning `{"status":"ok"}`), which continues to work with the embedded frontend.
