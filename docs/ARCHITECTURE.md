# Bharat Pulse — architecture notes

## Data boundary

```
 Browser (public, no account)            Server (Node, TanStack Start)                  Outside world
 ───────────────────────────            ──────────────────────────────                  ─────────────
 / route loader ── fetchDashboard ──▶   DashboardService.snapshot()                     PIB EN/HI RSS (+ release pages)
 TanStack Query poll (60 s; 5 s while   ├─ due sources? ── refresh (single-flight) ──▶  RBI press RSS, RBI homepage rates
   the server is refreshing)            │    adapters → normalize → merge → prune        The Hindu, HT, BBC, Mint, BBC Hindi,
 Refresh button ── refreshDashboard ─▶  │    (allowlisted hosts, timeouts, size cap)       Amar Ujala, Live Hindustan RSS
                                        ├─ file cache  data/cache/cache.json            World Bank WDI API
                                        └─ buildSnapshot()  (pure)
```

- **The browser never contacts a source.** All fetching happens in `src/server/*` behind two server
  functions (`src/server/dashboard.functions.ts`). The client bundle contains RPC stubs only; a build
  check confirmed no adapter, parser, source URL or cache code reaches `dist/client`.
- **No credentials exist.** Every source is public and keyless. CPCB / data.gov.in adapters are not
  built because no key was supplied; a future key would live in a server env var only.
- **Outbound fetches are allowlisted** (`ALLOWED_HOSTS` in `src/server/sources.ts`), HTTPS-only,
  12 s timeout, 4 MB cap, conditional requests (ETag / Last-Modified), manual redirects so PIB's
  session cookie can be carried.

## Freshness model

| Kind | Cadence | Stale after | Notes |
| --- | --- | --- | --- |
| News feeds | every 10 min | 30 min without success | Failures back off 15 → 30 → 60 min |
| RBI policy rates | every 6 h | 18 h | Decision date reused only while the value matches the cited MPC decision |
| World Bank series | daily | 3 days | `lastupdated` from the API is shown as "data released" |
| Release records | not fetched | — | Flagged "newer release likely out" 2 days after `nextReleaseDue` |

Reads are stale-while-revalidate: a snapshot request returns the cache immediately and starts a
refresh of whatever is due. Only the very first request on an empty cache waits (up to 9 s) so the
first server render has live data. A manual refresh re-checks news sources not hit in the last
minute, so the button cannot be used to hammer publishers.

A failed source keeps its last verified items/values; the snapshot marks them stale/error and the UI
says so. Nothing is ever substituted. An empty feed, a non-feed response, or a feed in the wrong
script (PIB silently serves Hindi without `reg=3`) counts as a failure.

### Time of an update

`timeBasis` on each record:

- `published` — the publisher's own timestamp (future stamps beyond 15 min of skew are rejected);
- `first-seen` — no publisher time, but the source was being watched, so it appeared within one
  refresh interval;
- `unknown` — no publisher time and the item was already there when watching began (first fetch or
  after an outage). Ranked below dated items and shown as "Time not stated".

PIB's feed carries no dates, so the adapter reads "Posted On" from each new release page (all of
them on a first fetch, the 10 newest undated ones per routine refresh, 3 at a time).

### The five latest updates

`selectLatest` (`src/domain/select.ts`), per language:

1. one slot per category — politics, economy, policy, society, major risk — taking that category's
   newest item within 48 h of the newest item overall, preferring at most two items per publisher;
2. remaining slots go to the newest items overall (again preferring publisher variety);
3. if the language has fewer than five items, the gap is filled from the other language and
   labelled; headlines are never machine-translated.

Categories come from deterministic keyword rules (`src/domain/categorize.ts`, English and Hindi)
plus a weak per-source prior. Daily digests / generic live blogs are dropped.

## Source discovery

`src/server/discovery.ts`, run by `DashboardService.discover()` at most once an hour (started in
the background by a snapshot request once some stories are cached, or by `GET /api/scan`).

1. **Crawl** — for each publisher in `src/server/publishers.ts`: best-first, breadth-first from
   its seed pages; a fetched page that parses as a feed is a candidate, otherwise its feed links
   (`<link rel="alternate">` and feed-looking anchors) are queued, up to depth 2 and 10 fetches.
   Links must stay on the publisher's hosts (FeedBurner paths are restricted per publisher).
2. **Section rule** — `isNationalSection`: the URL path, feed title and link text (with the
   publisher's own name removed) must contain a national term — India, national, politics,
   economy, business, policy, government, elections, देश, राष्ट्रीय, राजनीति … — and nothing
   excluded (sport, entertainment, world, lifestyle, state/city sections, …). Press-release
   feeds qualify only for official publishers. Catch-all feeds (top, latest, breaking, home) mix
   in world and entertainment news and are not accepted.
3. **Judge** — `judgeFeed`: ≥ 5 items, ≥ half dated, newest within 24 h, publisher's script,
   ≥ 50 % of items in a national category, ≥ 40 % of items not already carried by another
   source. Survivors are ranked by recent volume, relevance and novelty.
4. **Admit / retire** — best feeds fill the publisher's remaining slots (3 per publisher
   including fixed sources; 24 discovered overall). Each scan first retires discovered feeds
   with 3 consecutive failures, 72 h without a new story, or that no longer meet the rules.

Discovered feeds are ordinary sources from then on: same fetcher, allowlist, cadence, health,
dedupe and five-update selection, labelled "Auto-discovered" in Settings.

## Modules

```
src/
  domain/        Pure, isomorphic logic — types, canonical URLs, dedupe/merge, categorization,
                 selection, freshness labels. Fully unit-tested.
  data/          Release records and context from the 11 Oct 2026 briefing, every figure cited.
  server/        Source registry, vetted publishers, discovery scanner, HTTP fetcher,
                 adapters (rss, news, pib, rbi, worldbank), file cache, DashboardService
                 (refresh + discovery orchestration), snapshot builder, server functions.
  routes/api/    GET /api/scan — scheduler hook for hosts that sleep between requests.
  queries/       TanStack Query options for the snapshot (poll cadence).
  i18n/          English/Hindi message catalogue + Intl formatters (always IST).
  preferences/   Theme + language: device defaults, read from localStorage after hydration.
  components/    common (tags, tabs, tables), charts (cards, Recharts plots — lazy-loaded),
                 kpi, updates, timeline, politics, economy, risks, settings, layout, sections.
  routes/        __root (document, head, theme boot script), index (the dashboard at `/`).
serve.mjs       Dependency-free Node production server for dist/.
```

## Provenance labels

- **Official · live check** — fetched from an official Indian source (RBI).
- **World Bank · live check** — fetched from the World Bank WDI API.
- **Release record** — a dated release transcribed from a cited report in the briefing. GDP, CPI,
  WPI, PLFS and UPI are release records because MoSPI's API was unreachable from this host and NPCI
  blocks scripted access (HTTP 403); they are labelled as such, never as live.

Election results, the timeline, the policy tracker and the risk register are briefing content. Risk
scores are explicitly labelled as analyst assessment.

## Accessibility & motion

- One `main`, one `nav` (sidebar ⇄ bottom bar), one `header`; skip link; headings h1 → h2 → h3;
  focus moves to the section heading on navigation.
- Tabs use roving focus (arrows, Home/End); the risk matrix is one tab stop with arrow-key movement
  and a synchronized register and detail panel (`aria-live`).
- Every chart is a `figure` with a text summary, a keyboard-reachable data table in a labelled scroll
  region, and its provenance. Colours come from a CVD-validated palette; projections are hatched;
  status uses icon + text.
- Recharts' JS animation is disabled (it hides labels until a rAF loop ends, which stalls in
  background tabs); entrances are CSS and switch off under `prefers-reduced-motion`.
- axe-core (WCAG 2.2 AA + best practice) reports 0 violations on all five sections in light and
  dark themes and in the Settings dialog.
