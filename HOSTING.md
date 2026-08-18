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
