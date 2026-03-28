# PRD — Phase 9: Chicagoland Clearance Hunter
**Status:** APPROVED — GSD v2 sprint  
**Created:** 2026-03-22  
**Owner:** Jerry C.

---

## Phase 1: Intake

**What we're building:**  
Autonomous penny/clearance deal detection across Chicagoland big box stores — not just Home Depot. The system should run on a schedule, scrape multiple store chains, detect penny-tier pricing, and surface deals in the Provision UI with location awareness (Chicagoland ZIPs/store IDs).

**Success Criteria:**
- [ ] 6+ big box store scrapers running autonomously via PM2 cron
- [ ] Deals filtered to Chicagoland locations (ZIP codes or store IDs)
- [ ] Penny ($0.01) / Near-Penny (≤$0.25) / Deep Clearance (>70% off) tiers detected
- [ ] Results stored in Supabase `penny_deals` table with `location_type='in_store'` + `zip_code` field
- [ ] New `/clearance` tab "Big Box" showing Chicagoland-specific results
- [ ] Autonomous refresh: 6 AM + 2 PM CST daily via PM2 cron
- [ ] Slickdeals + Reddit deal feeds ingested as supplemental signal

**Constraints:**
- No paid APIs (BrickSeek is paid — use public store price-check endpoints instead)
- Rate limit: max 1 req/10s per domain
- No scraping behind login walls
- Existing `penny_deals` Supabase table schema must be preserved (additive only)
- Railway budget: single service, no new dynos

**Unknowns / Assumptions:**
- Target price-check API: using `redsky.target.com` public endpoint (no auth required for basic lookups) — assumption confirmed by community scrapers
- Menards: no public API, will scrape clearance section HTML
- Best Buy: has a public products API (`bestbuyapis.com`) — free tier, 5 req/s
- Meijer: no public API, RSS + web scrape clearance section
- Home Depot: has a public product API (`developer.homedepot.com`) — free
- Lowe's: no public API, scrape `lowes.com/pl/clearance`

---

## Phase 2: PRD

### Problem
Phase 8 built the clearance intelligence foundation, but deal sources are limited:
- RSS blogs (Hip2Save, KrazyCouponLady) — passive, delayed, not location-specific
- Walmart + Sam's Club online clearance — generic, not Chicagoland-specific
- No Target, Home Depot, Lowe's, Best Buy, Menards, or Meijer coverage

Jerry wants autonomous, Chicagoland-aware penny deal detection across all major big box stores.

### Goals
- **In scope:** Store scrapers for 6+ chains, Chicagoland location filtering, penny/tier detection, Supabase persistence, PM2 cron automation, UI tab
- **Out of scope:** Push notifications (Phase 10), user location personalization, in-store navigation, store-specific markdown calendars (too deep, Phase 10), paid API integrations

### Current State
```
server/scrapers/
  walmart-clearance-scraper.js    ← generic, online clearance only
  samsclub-clearance-scraper.js   ← generic, online clearance only
  penny-deals-scraper.js          ← RSS only (Hip2Save, KrazyCouponLady)

server/routes/clearance.js        ← /api/online-clearance, /api/penny-deals, /api/bulk-buys
server/services/priceDecoder.js   ← store markdown signal logic

client/src/pages/Clearance.tsx    ← 4 tabs: Decoder | Calendar | Online | Bulk Buys
```

Supabase `penny_deals` table schema:
```sql
id, store, item, category, price, original_price, savings_pct,
spotted_date, expires_approx, source_url, source_name,
bulk_worthy, bulk_notes, location_type, verified
```
Missing fields needed: `zip_code`, `store_id`, `chicagoland`

### Proposed Solution

**Architecture:**
1. **New scrapers** (one file per store) in `server/scrapers/`
2. **Chicagoland store registry** — hardcoded list of store IDs/ZIPs for Chicagoland locations
3. **Penny tier classifier** — shared service, reused across all scrapers
4. **Supabase migration** — add `zip_code`, `store_id`, `chicagoland` boolean columns
5. **New API endpoint** — `/api/chicagoland-deals` with tier + store filters
6. **New cron script** — `server/jobs/chicagoland-sweep.js` (replaces per-scraper crons)
7. **UI** — new "Big Box" tab on `/clearance` page

**Chicagoland Store Registry (hardcoded for MVP):**
```
Walmart:   ZIP 60601, 60614, 60640, 60803, 60126 (5 stores)
Target:    Store IDs T-0274 (Chicago), T-0596 (Evanston), T-2707 (Oak Park)
Home Depot: Store 1909 (Chicago), 1918 (Schaumburg), 1919 (Naperville)
Lowe's:    Store 0595 (Chicago), 2409 (Skokie), 2432 (Bolingbrook)
Best Buy:  Store 281 (Chicago), 427 (Oakbrook), 444 (Orland Park)
Menards:   Store 3237 (Chicago), 3243 (Bridgeview), 3246 (Addison)
Meijer:    ZIP 60525 (LaGrange), 60559 (Westmont), 60143 (Itasca)
```

**Penny Tier Logic:**
```
PENNY       price <= 0.25
DEEP        savings_pct >= 70
CLEARANCE   savings_pct >= 30
```

**Scraper Strategy per Store:**
- **Walmart** → extend existing scraper with ZIP param on `walmart.com/store/{storeId}/clearance`
- **Target** → `redsky.target.com/redsky_aggregations/v1/web/plp_search_v2` with store_id param
- **Home Depot** → `api.homedepot.com/catalog/v1/products` clearance filter + store_id
- **Lowe's** → scrape `lowes.com/pl/clearance?storeId={id}` HTML (Next.js __NEXT_DATA__)
- **Best Buy** → `api.bestbuy.com/v1/products` with `clearance=true` + store ZIP
- **Menards** → scrape `menards.com/main/sale-clearance/` HTML + filter IL stores
- **Meijer** → scrape `meijer.com/shopping/clearance` + ZIP param
- **Community feeds** → Reddit r/extremecouponing RSS + Slickdeals RSS (new sources in penny-deals-scraper.js)

### Architecture / Touchpoints
```
NEW:
  server/scrapers/target-clearance-scraper.js
  server/scrapers/homedepot-clearance-scraper.js
  server/scrapers/lowes-clearance-scraper.js
  server/scrapers/bestbuy-clearance-scraper.js
  server/scrapers/menards-clearance-scraper.js
  server/scrapers/meijer-clearance-scraper.js
  server/services/chicagolandRegistry.js   ← store IDs/ZIPs
  server/services/pennyTierClassifier.js   ← PENNY/DEEP/CLEARANCE logic
  server/jobs/chicagoland-sweep.js         ← orchestrates all scrapers + upserts to Supabase
  supabase/migrations/20260322_phase9_chicagoland.sql

MODIFIED:
  server/routes/clearance.js              ← add /api/chicagoland-deals endpoint
  server/scrapers/penny-deals-scraper.js  ← add Reddit + Slickdeals RSS sources
  ecosystem.config.cjs                    ← add chicagoland-sweep PM2 cron (6am + 2pm)
  client/src/pages/Clearance.tsx          ← add "Big Box" tab
  client/src/lib/api.ts                   ← add getChicagolandDeals()
```

### Risk + Blast Radius
- **Medium:** Store websites change HTML structure → scrapers return 0 results (graceful empty, no crash)
- **Low:** Supabase migration adds columns, existing queries unaffected
- **Low:** New PM2 cron job is additive — doesn't touch existing processes
- **Low:** New UI tab is additive — existing 4 tabs unchanged

### Rollback Plan
```bash
# Revert migration
supabase migration repair --status reverted 20260322_phase9_chicagoland

# Remove PM2 cron
pm2 delete chicagoland-sweep

# Revert UI tab
git revert HEAD --no-edit
```

### Test Plan
- [ ] Each scraper returns at least 1 item OR graceful empty array (not crash)
- [ ] `chicagoland-sweep.js` runs end-to-end without unhandled exceptions
- [ ] Supabase upsert writes rows with `chicagoland=true` and `zip_code` populated
- [ ] `/api/chicagoland-deals` returns JSON with `deals` array
- [ ] UI "Big Box" tab renders without crashing (empty state acceptable)
- [ ] PM2 cron starts and doesn't immediately error
- [ ] Existing `/api/online-clearance` still works (regression)
- [ ] Existing `/clearance` page tabs still render (regression)

---

## Execution Plan (Milestones)

### M001 — Foundation + Registry (30 min)
1. Supabase migration: add `zip_code VARCHAR(10)`, `store_id VARCHAR(50)`, `chicagoland BOOLEAN DEFAULT FALSE`
2. `server/services/chicagolandRegistry.js` — store ID/ZIP map for all 7 chains
3. `server/services/pennyTierClassifier.js` — tier logic (PENNY/DEEP/CLEARANCE)

### M002 — Store Scrapers (60 min)
4. `target-clearance-scraper.js` — redsky API + store IDs
5. `homedepot-clearance-scraper.js` — HD API + store IDs
6. `lowes-clearance-scraper.js` — HTML scrape + store IDs
7. `bestbuy-clearance-scraper.js` — BB API + ZIP
8. `menards-clearance-scraper.js` — HTML scrape
9. `meijer-clearance-scraper.js` — HTML scrape + ZIP
10. Extend `walmart-clearance-scraper.js` to accept store ZIP param

### M003 — Orchestration + Persistence (30 min)
11. `server/jobs/chicagoland-sweep.js` — runs all scrapers, classifies tiers, upserts to Supabase
12. Add Reddit + Slickdeals RSS to `penny-deals-scraper.js`
13. Add `/api/chicagoland-deals` endpoint to `clearance.js`

### M004 — PM2 Cron + UI (30 min)
14. Add `chicagoland-sweep` to `ecosystem.config.cjs` (6 AM + 2 PM CST cron)
15. Add "Big Box" tab to `Clearance.tsx` with deal cards + tier badges
16. Add `getChicagolandDeals()` to `api.ts`

### M005 — Test + Deploy (20 min)
17. Run sweep manually: `node server/jobs/chicagoland-sweep.js`
18. Verify Supabase rows inserted
19. Verify API endpoint returns data
20. Build + deploy to Railway
21. Verify production UI tab renders
