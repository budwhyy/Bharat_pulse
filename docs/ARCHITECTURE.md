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
- **Credentials stay server-only.** Normal sources are public and keyless. CPCB is implemented but
  gated on both `DATA_GOV_IN_API_KEY` and `CPCB_CONCENTRATION_VERIFIED=true`. The latter must not be
  set until first-party field-unit and averaging-period verification is complete (owner decision,
  11 Oct 2026). Key alone does not register the source. Neither setting reaches the snapshot.
- **Outbound fetches are allowlisted** (`ALLOWED_HOSTS` in `src/server/sources.ts`), HTTPS-only,
  12 s timeout, 4 MB cap, conditional requests (ETag / Last-Modified), manual redirects so PIB's
  session cookie can be carried.

## Freshness model

| Kind | Cadence | Stale after | Notes |
| --- | --- | --- | --- |
| News feeds | every 10 min | 30 min without success | Failures back off 15 → 30 → 60 min |
| RBI policy rates | every 6 h | 18 h | Decision date reused only while the value matches the cited MPC decision |
| World Bank series | daily | 3 days | `lastupdated` from the API is shown as "data released" |
| FBIL reference rate | daily | 3 missed checks / observation > 5 days | Always shows the business-day date; weekend is not a new quote |
| NDMA SACHET | 15 min | 45 min without success | Severe keyword filter; retain 48 h, display 24 h; pin under 6 h |
| CPCB AQI (gated) | hourly | 3 h without success / observation > 3 h | Reject incomplete city responses, invalid stations, future or >24 h readings |
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

## Live Pulse

`buildSnapshot` drops roundups and records from removed sources before clustering. Dated / bounded
first-seen records in the last 24 hours are clustered within each language by deterministic token
overlap. Unknown-time backlogs and future records are excluded. The publisher registry unifies
fixed and discovered feeds so one publisher cannot inflate outlet coverage. Near-identical headlines
or detected shared wire attribution (including feed bylines) count as one estimated reporting group.
The earliest retained headline is quoted without rewriting. This is a heuristic, not fact-checking.

Score = `0.5^(hours since latest report / 6) * ln(1 + reportingGroups) * languageSpread`.
Language spread is 1; official clusters above score 0.35 are pinned before the score order.
The UI receives the top 30 per language plus all 24-hour cluster first-report times for visit deltas.
Map counts use clusters with a report in the last three hours and deterministic EN/HI state/city
matching. Simplified Survey of India boundaries (via bharatlas) form the SVG map; its 36 state/UT
shapes are interactive and four source polygons marked as internal disputes remain unassigned.
Political colours are not used. The equivalent state dropdown has a ≥44px touch target. It filters both clusters and the five-update list.
Severe alerts are separate from headline clusters and expand from a pinned official-alert disclosure
beside the map. Source failures keep cached values with stale/error labels.

FBIL is requested with ISO dates and displayed as a daily reference, with the previous returned
business day and up to 22 observations. CPCB's **unverified concentration contract** is fixture-tested:
station AQI needs three valid pollutants including PM2.5 or PM10, the worst sub-index wins, and the
city tile is a derived station mean. Observations from different timestamps are never mixed within
a station. Concentration bands are rounded to published precision, linearly interpolated and capped
at 500 using the handoff's finite severe-band endpoints. The source's units and averaging periods
must be verified before activation. Partial city failure retains previous values and labels the source
as error. API-key-bearing errors are never copied to public state.

The local JSON cache remains version 1: missing `fx`, `alerts` and `aqi` arrays load as empty defaults.
Only a localStorage timestamp records the last visit; no analytics, thumbnails, GDELT or
cross-language clustering. Counts since older visits are explicitly limited to the available 24 hours.

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
