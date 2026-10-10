# Bharat Pulse

A public, mobile-friendly dashboard of India: the five newest balanced national updates from
official and reported sources, headline indicators with their release dates, election results, a
policy tracker and an analyst risk register — in English and Hindi, light and dark.

"Live" means near-real-time for news (sources checked every 10 minutes) and the latest available
official release for statistics. Monthly and quarterly indicators are always shown with when they
were released and when they were last checked; nothing implies second-by-second data.

## Run it

Requires Node 22.12+.

```bash
npm install
npm run dev            # http://localhost:3000
```

```bash
npm run build
npm start              # http://127.0.0.1:3000  (HOST / PORT env vars to change)
```

The first request with an empty cache fetches every source (a few seconds). The cache lives in
`data/cache/cache.json` (override with `BHARAT_PULSE_CACHE_DIR`) and survives restarts; it is local
to the machine running the server, so use a host with a persistent disk rather than a serverless
platform.

## Check it

```bash
npm test               # unit + component tests (no network)
npm run typecheck
npm run test:live      # opt-in: hits the real sources and prints what each returned
```

## Sources

| Source | Kind | Language | Used for |
| --- | --- | --- | --- |
| PIB RSS + release pages | Official | EN, HI | Announcements (publish time read from each release) |
| RBI press-release RSS | Official | EN | Announcements |
| RBI homepage "Policy Rates" | Official | — | Repo rate |
| The Hindu, Hindustan Times, BBC News, Mint | Reported | EN | Headlines + short teaser, linked |
| BBC Hindi, Amar Ujala, Live Hindustan | Reported | HI | Headlines + short teaser, linked |
| World Bank WDI API | International | — | Population, age structure, fertility, female LFPR |
| Bharat Pulse briefing (11 Oct 2026) | Release records | EN/HI | GDP, CPI, WPI, PLFS, UPI, elections, timeline, policies, risks — each with its citation |

No market data is shown. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the data boundary,
freshness rules, the five-update selection and module layout.

## One-click start (Windows)

Download or clone this repo, then double-click **`Start-Bharat-Pulse.cmd`**. It checks for Node.js,
installs dependencies and builds on first run, starts the server and opens the dashboard in your
browser.
