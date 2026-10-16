<div align="center">

# 🇮🇳 Bharat Pulse

**India at a glance — the latest balanced national updates, key indicators, elections, policy and risk, in one calm dashboard.**

English · हिन्दी · Light & dark · Mobile-first · Installable (PWA)

![TanStack Start](https://img.shields.io/badge/TanStack_Start-React_19-0b7285)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6)
![Vite](https://img.shields.io/badge/Vite-8-646cff)
![Tests](https://img.shields.io/badge/tests-128_passing-2f9e44)
![Deploy](https://img.shields.io/badge/deploy-Vercel-000)

</div>

---

## What it does

| Section | What you get |
| --- | --- |
| **Latest updates** | The five newest national stories — one per category (politics, economy, policy, society, major risk) — from official and reported sources, de-duplicated across publishers |
| **Indicators** | GDP, CPI, WPI, PLFS, UPI, RBI policy rates and World Bank demographics — each with its release date and when it was last checked |
| **Elections** | Recent results and the electoral timeline |
| **Policy tracker** | Major policies and where they stand |
| **Risk register** | An analyst-style register of national risks |

**What "live" means here:** news sources are checked every 10 minutes; statistics show the latest
*official release*. Monthly and quarterly numbers always carry their release date — nothing pretends
to be second-by-second. No market data is shown.

## Principles

- **Nothing is invented.** If a source fails, its last verified data stays on screen, clearly marked stale. Nothing is substituted.
- **The browser never calls a source.** All fetching happens server-side, against an allowlist of HTTPS hosts with timeouts and size caps.
- **No accounts, no keys, no tracking.** Every source is public and keyless.
- **Balanced by design.** Category slots stop any one topic or publisher from dominating the top five.

## Sources

| Kind | Sources |
| --- | --- |
| Official | PIB (English & Hindi), RBI press releases & notifications, SEBI |
| English publishers | The Hindu, Hindustan Times, The Indian Express, The Times of India, NDTV, The Economic Times, Business Standard, Mint, Scroll, News18, Firstpost, BBC News |
| Hindi publishers | BBC Hindi, Amar Ujala, Live Hindustan, Dainik Bhaskar, NDTV India, Zee News Hindi |
| Indicators | RBI policy rates, World Bank WDI (population, age structure, fertility, female LFPR) |
| Release records | GDP, CPI, WPI, PLFS, UPI, elections, timeline, policies, risks — from the 11 Oct 2026 briefing, each cited |

24 fixed news feeds plus an **hourly discovery scanner** that may add up to 24 more national-section
feeds from a vetted list of 18 publishers (strict rules on language, recency, relevance and overlap;
feeds that fail or go quiet are retired). Scanner status lives in **Settings → Data sources**.

## Quick start

Requires **Node 22.12+**.

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build
npm start          # http://127.0.0.1:3000  (set HOST / PORT to change)
```

**Windows one-click:** double-click `Start-Bharat-Pulse.cmd` — it checks for Node, installs, builds,
starts the server and opens the dashboard.

## Deploy

### Vercel

Import the repo into Vercel — no settings needed. The build detects `VERCEL=1` and emits Vercel
functions via Nitro automatically.

Vercel sleeps between requests, so point any free scheduler (e.g. cron-job.org, GitHub Actions) at:

```
GET https://<your-deployment>/api/scan    # once an hour
```

It only runs work that's already due, so extra calls cost nothing.

> **Cache note:** the source cache is a file (`data/cache/cache.json`, override with
> `BHARAT_PULSE_CACHE_DIR`). On serverless hosts it doesn't persist between cold starts, so the first
> visit after a sleep takes a few seconds while sources are fetched. For an always-warm cache, run
> `npm start` on a host with a persistent disk.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build |
| `npm start` | Serve the build (`serve.mjs`, no extra dependencies) |
| `npm test` | Unit + component tests (offline) |
| `npm run typecheck` | TypeScript check |
| `npm run test:live` | Opt-in smoke test against the real sources |

## Project layout

```
src/
├── routes/        # pages + /api/scan
├── components/    # updates, kpi, economy, politics, risks, timeline, charts, settings
├── server/        # adapters, cache, discovery scanner, dashboard service (server-only)
├── domain/        # pure logic: merge, dedupe, categorise, freshness, top-five selection
├── data/          # cited release records from the briefing
├── i18n/          # English + Hindi strings
└── preferences/   # language, theme and display settings
```

Deeper detail — data boundary, freshness rules, the five-update selection — is in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Tech

TanStack Start (React 19, Router, Query) · Vite 8 · Nitro (Vercel preset) · Recharts · lucide-react ·
Inter · Vitest + Testing Library + axe-core
