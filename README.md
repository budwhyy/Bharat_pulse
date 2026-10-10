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

**Fixed registry (24 news feeds + 2 indicator sources), checked every 10 minutes:**

| Kind | Sources |
| --- | --- |
| Official | PIB (English, Hindi; publish time read from each release), RBI press releases, RBI notifications, SEBI |
| English publishers | The Hindu, Hindustan Times, The Indian Express, The Times of India, NDTV, The Economic Times, Business Standard, Mint, Scroll, News18, Firstpost, BBC News |
| Hindi publishers | BBC Hindi, Amar Ujala, Live Hindustan, Dainik Bhaskar, NDTV India, Zee News Hindi |
| Indicators | RBI policy rates (homepage), World Bank WDI (population, age structure, fertility, female LFPR) |
| Release records | GDP, CPI, WPI, PLFS, UPI, elections, timeline, policies, risks — from the 11 Oct 2026 briefing, each cited |

**Hourly discovery scanner.** Every 60 minutes the server crawls the RSS directories and
homepages of a vetted list of 18 publishers (two levels deep, ten fetches per publisher) and
judges every feed it finds. A feed is added only if it is a national section (not sport,
entertainment, world, state/city or press-release wire copy), has at least five items, has a
story from the last 24 hours, is in the publisher's language, is mostly about national affairs,
and isn't mostly stories we already carry. At most three feeds per publisher and 24 discovered
feeds in total; discovered feeds that fail three times in a row, go quiet for 72 hours or stop
meeting the rules are retired. The scanner never leaves the vetted publisher list. Its status
is in **Settings → Data sources**.

On hosts that sleep between requests (Vercel), point any free scheduler at `GET /api/scan` once
an hour; it only does work that is already due, so extra calls cost nothing.

No market data is shown. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the data boundary,
freshness rules, the five-update selection and module layout.

## One-click start (Windows)

Download or clone this repo, then double-click **`Start-Bharat-Pulse.cmd`**. It checks for Node.js,
installs dependencies and builds on first run, starts the server and opens the dashboard in your
browser.
