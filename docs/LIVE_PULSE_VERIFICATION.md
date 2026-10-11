# Live Pulse — verification, 11 Oct 2026

Scope: Phase 1 first screen, state cartogram, story clustering/coverage, FBIL reference rate,
severe SACHET alerts, gated CPCB adapter, bilingual methodology. No GDELT or analytics.

This file records the original tile-grid release. A later revision replaces its cartogram with
SVG state boundaries simplified from the Survey of India dataset distributed by bharatlas.
The map source and current behavior are documented in README.md and docs/ARCHITECTURE.md.

Map revision, 11 Oct 2026: 36 simplified state/UT paths from the Survey of India derivative
distributed by bharatlas; four internal dispute polygons left unassigned. At 375 and 390 px,
the first story starts at 397 px with no horizontal overflow. Light and dark axe scans found
zero violations. Delhi selection filters stories and updates, and the 44 px dropdown provides
an equivalent touch control. The direct Survey of India download portal returned an error during
retrieval; the derivative source and processing script are linked in the repository.

## Automated checks

- `npm.cmd run typecheck`: passed.
- `npm.cmd test`: 172 passed; real-network smoke and local-cache benchmark are opt-in.
- `npm.cmd run build`: passed.
- `$env:VERCEL='1'; npm.cmd run build`: passed; Vercel output generated.
- Existing bundler warnings: main client chunk exceeds 500 kB; Nitro reports third-party
  `use client` directives. Neither fails the builds.
- Public client JavaScript checked for API-key env identifiers, indicator parser identifiers,
  outbound allowlist and private data.gov.in/FBIL endpoint strings: no matches.
- Local-cache benchmark: 1,900 real cached records, 647 clusters, 141.3 ms on this host.
  This is a local measurement, not a deployed latency guarantee.

## Browser checks

Headless Chromium, local dev server, real cached/fetched data, reduced motion enabled:

- 375 × 844: first cluster top 395 px, map 202 px high, no horizontal page overflow.
- 390 × 844: first cluster top 391 px. The next card remains visible below the first.
- Tile targets are at least 24 px at 375 px; the equivalent state selector is 44 px high.
  Map codes, borders, accessible count labels and dropdown counts supplement grayscale intensity.
- axe-core WCAG 2.2 AA + best-practice checks: zero violations in English light/dark and
  Hindi light/dark; Settings, expanded headline comparisons, expanded official alerts and
  Hindi methodology also have zero violations.
- Freshness opens Settings → Data sources and focuses its heading; Escape returns focus.
- Delhi selection updates the pressed tile and filters clusters and the five-update list.
- Compare headlines exposes retained original headlines, publisher links and report times.
- Alert disclosure opens independently of headline clusters.
- Returning visits use localStorage; denied storage is unit-tested and falls back to the 3-hour view.
- No browser page errors in the completed checks.

The initial small tiles failed target-size checks and were enlarged. An intermediate audit that
changed the theme attribute directly produced inconsistent timeline styles; the final audit used
the actual Settings theme control and passed without modifying the existing timeline.

## Data and remaining limits

- FBIL and SACHET returned data in the local dev run. The latest FBIL observation returned was
  dated 1 Oct 2026; it is displayed with that date and a stale label, not presented as today's quote.
- CPCB network access and field semantics are **not verified**. The owner explicitly chose to keep
  activation gated. Both `DATA_GOV_IN_API_KEY` and `CPCB_CONCENTRATION_VERIFIED=true` are required;
  do not set the second until first-party verification establishes that `pollutant_avg` contains
  concentrations with the correct units and averaging periods. Sub-indices require an adapter change.
- AQI/parser tests use constructed fixtures, not a claimed captured/live CPCB response.
- Clustering, wire identification and state tagging are deterministic heuristics; the methodology
  explains possible false matches and omissions. No source-bias or fact-check verdict is claimed.
- Alert keyword filtering can miss warnings and does not determine whether an authority has
  cancelled or extended one. The authority's original link remains the source of instructions.
- Publisher terms and legal disclosure/privacy questions remain for legal review; no compliance claim.

Screenshots and full local QA JSON are saved outside the repository in the Codex visualization
folder for this chat. `HANDOFF.md` is the pre-existing owner handoff and remains untouched.
