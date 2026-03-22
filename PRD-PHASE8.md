# Provision — Phase 8 PRD: Clearance Intelligence Engine

**Status:** Active  
**Branch:** `feat/phase8-clearance-intelligence`  
**Created:** 2026-03-22  
**Owner:** Jerry C. / MrMagoochi

---

## Vision

Turn Provision from a coupon stacker into a **savings intelligence platform** — one that decodes store pricing language, predicts penny deals before they hit, and surfaces bulk-buy opportunities worth buying by the pallet.

**Core insight:** Every major retailer uses price endings as a secret language. `.97` at Costco means a manager marked it down and it won't be restocked. `$0.01` at Target means it's at end-of-life in the system. Once you know the code, every price tag is a signal.

---

## Phase 8 Milestones

---

### M001 — Price Signal Decoder (Core Intelligence Layer)

**What it is:** A lookup engine that decodes what any price ending means at a given store. Enter `$14.97` at Costco → "⚠️ Manager markdown. Won't be restocked. Buy now."

**Price Ending Dictionary (seed data):**

| Store | Ending | Signal | Action |
|---|---|---|---|
| Costco | `.97` | Manager markdown, not restocking | Buy now |
| Costco | `.89` | Further reduced — limited qty | Buy fast |
| Costco | `.00` | Instant rebate (limited time) | Stack with membership |
| Sam's Club | `.91` | Clearance — going soon | Buy now |
| Sam's Club | `.88` | Manager special | Buy now |
| Sam's Club | `.98` | Near-discontinuation signal | Last chance |
| Sam's Club | `.00` | Instant savings event | Time-limited |
| Walmart | `.00` | Clearance markdown | Buy now |
| Walmart | `.97` | Rollback (temporary price) | Good deal, not final |
| Walmart | `.01` | Penny item — system end-of-life | Buy everything |
| Target | `.01` | Penny clearance (Tues markdown cycle) | Buy everything |
| Target | `.98` | Final markdown stage | Penny incoming |
| Target | `.48` | Clearance in-progress | Watch for further drops |

**Deliverables:**
- `server/data/price-signals.json` — full store → ending → signal dictionary
- `server/services/priceDecoder.js` — `decode(store, price)` → `{ signal, action, confidence }`
- `/api/decode-price` endpoint — POST `{ store, price }` → decoded signal
- `/clearance` page with **Price Decoder** tool — tap store, enter price, get intel

---

### M002 — Penny Deal Calendar

**What it is:** A weekly calendar showing predicted penny/near-penny items by store and category, scraped from public deal communities.

**Data sources (no auth required):**
- Hip2Save penny deal posts: `hip2save.com/tag/penny-items/`
- Krazy Coupon Lady: `thekrazycouponlady.com/tips/store-hacks/`
- Reddit r/extremecouponing — penny deal megathreads (Reddit JSON API, no key needed)
- `@instoreclearance` Instagram — manual curation to start, scrape later

**Data model:**
```json
{
  "id": "uuid",
  "store": "Target",
  "item": "Seed Starter Kit 72-Cell",
  "category": "Garden",
  "price": 0.01,
  "original_price": 12.99,
  "savings_pct": 99.9,
  "spotted_date": "2026-03-20",
  "expires_approx": "2026-03-27",
  "source_url": "https://...",
  "bulk_worthy": true,
  "bulk_notes": "Bought pallet of 48 for $4.80 — donate/resell potential",
  "location_type": "in_store" | "online_only" | "both",
  "verified": false
}
```

**Deliverables:**
- `server/scrapers/penny-deals-scraper.js` — pulls from Hip2Save + KCL + Reddit
- `server/services/pennyDealIngester.js` — normalizes + dedupes + stores to Supabase
- Supabase migration: `penny_deals` table
- `/clearance` calendar view — week grid, grouped by store, penny items flagged 🎯
- PM2 cron: `kodex-penny-scraper` — runs 6 AM daily

---

### M003 — Online Clearance Scanner

**What it is:** Scrapes Walmart.com and Sam's Club online clearance sections for returned/online-only markdowns. Surfaces items worth buying in bulk.

**Why:** Returned items often get marked to clearance online before hitting stores. Sam's Club online has filterable clearance. These are often one-off quantities — act fast.

**Targets:**
- Walmart clearance: `walmart.com/browse/clearance` (public, no auth)
- Sam's Club clearance: `samsclub.com/s?searchTerm=clearance&type=product` (public)
- Filter: items with `original_price / current_price > 5x` = flag as bulk-worthy

**Deliverables:**
- `server/scrapers/walmart-clearance-scraper.js`
- `server/scrapers/samsclub-clearance-scraper.js`
- `/api/online-clearance` endpoint — returns top 50 bulk-worthy online deals
- `/clearance` → "Online Only" tab section

---

### M004 — Bulk Buy Intelligence + Donate Mode Integration

**What it is:** Surfaces penny/clearance items specifically worth buying in quantity — for resale, personal stockpile, or donation. Ties directly into existing `/donate` Donate Mode.

**Logic:**
- `bulk_worthy = true` if: `price <= $0.10 AND category IN (food, household, garden, health)`
- Show estimated "pallet value" — how much you'd save buying 50 units
- One-tap "Add to Donate List" — routes to existing Donate Mode flow

**Bulk Buy card:**
```
🎯 Seed Starter Kit — Target
$0.01 (was $12.99) · 99.9% off
Buy 48 → spend $0.48, donate $623 value
[Add to Donate List] [Add to Shopping List]
```

**Deliverables:**
- `server/services/bulkBuyScorer.js` — scores items for bulk-buy worthiness
- `/clearance` → "Bulk Buys" tab — top 10 bulk-worthy items this week
- Donate Mode integration — bulk penny items auto-suggest to Donate list
- "Pallet calculator" — input quantity → shows total cost + estimated retail value

---

### M005 — `/clearance` Full Page + Nav Integration

**What it is:** The unified Clearance Intelligence page pulling all four features together, surfaced in the app nav.

**Page layout (`/clearance`):**

```
[CLEARANCE INTEL]

[Decoder] [Calendar] [Online] [Bulk Buys]   ← tab row

── DECODER TAB ──
[Store selector: Costco | Sam's | Walmart | Target]
[Price input: $___.__]
[Decode →]
→ ⚠️ Costco .97 = Manager markdown. Not restocking. Buy now.

── CALENDAR TAB ──
This Week's Penny Deals
Mon  Tue  Wed  Thu  Fri  Sat  Sun
🎯   🎯        🎯
[deal cards by day]

── ONLINE TAB ──
Online-Only Clearance (updated 6 AM)
[deal cards: store, item, price, bulk flag]

── BULK BUYS TAB ──
Worth Buying by the Case
[bulk deal cards with pallet calculator]
```

**Nav integration:**
- Add "Clearance" to bottom nav (replace least-used item or add to More hub)
- Badge count on nav icon when new penny deals available

**Deliverables:**
- `client/src/pages/Clearance.tsx` — full tabbed page
- `client/src/components/PriceDecoder.tsx`
- `client/src/components/PennyDealCard.tsx`
- `client/src/components/BulkBuyCard.tsx`
- Bottom nav update in `App.tsx`
- Route registered: `/clearance`

---

## Data Architecture

### New Supabase Tables

```sql
-- Penny deals from scrapers
CREATE TABLE penny_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,
  item TEXT NOT NULL,
  category TEXT,
  price DECIMAL(10,2),
  original_price DECIMAL(10,2),
  savings_pct DECIMAL(5,2),
  spotted_date DATE,
  expires_approx DATE,
  source_url TEXT,
  bulk_worthy BOOLEAN DEFAULT false,
  bulk_notes TEXT,
  location_type TEXT DEFAULT 'in_store',
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price signal dictionary
CREATE TABLE price_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,
  price_ending TEXT NOT NULL,  -- e.g. '.97', '.01'
  signal TEXT NOT NULL,
  action TEXT NOT NULL,
  confidence TEXT DEFAULT 'high',
  source_notes TEXT,
  UNIQUE(store, price_ending)
);
```

---

## Scraper Ethics / Rate Limiting

- Hip2Save / KCL: RSS feed preferred over HTML scrape — lower impact
- Reddit: JSON API (`reddit.com/r/extremecouponing.json`) — no key, 1 req/2s
- Walmart/Sam's Club: 1 req/5s, Chrome UA, no login wall scraping
- Instagram: manual curation only for now — no automated scraping

---

## Success Criteria

- [ ] Price decoder returns correct signal for all 13 seed endings
- [ ] Penny deal calendar shows ≥5 deals on any given week
- [ ] Online clearance scanner returns ≥20 results daily
- [ ] Bulk buy scorer flags items with >5x savings correctly
- [ ] `/clearance` page loads under 1s
- [ ] Donate Mode accepts bulk penny items without errors
- [ ] Bottom nav updated, Clearance accessible in ≤2 taps

---

---

### M006 — Scan Intelligence (Barcode Scanner)

**What it is:** A camera-based barcode scanner accessible from anywhere in the app. Scan any product to add it to your pantry, shopping list, or instantly compare prices across nearby stores.

**Three scan flows:**

1. **Add to Pantry** — Scan → product lookup → quantity picker → saved to `pantry_inventory`. Long-term storage flag optional.
2. **Add to Shopping List** — Scan → product found → one-tap add to list. For "I want this later" moments in-store.
3. **Price Compare** — Scan → product found → searches Flipp deal database for matching items by name/brand → shows cheapest store right now. Answers "is this a good price?" on the spot.

**Tech stack:**
- `@zxing/library` — cross-browser camera barcode scanning (no native app, works in mobile Chrome/Safari)
- Open Food Facts API (`https://world.openfoodfacts.org/api/v0/product/{barcode}.json`) — free, no key, 2M+ products, returns name/brand/category/size
- UPCitemdb (`https://api.upcitemdb.com/prod/trial/lookup?upc={barcode}`) — free tier (100/day), fallback if Open Food Facts misses
- Existing Supabase `pantry_inventory` table — no new DB schema needed
- Existing `/api/list` endpoint — no changes needed

**UI:**
- Floating scan button (📷) in bottom nav or as a FAB on Pantry + Deals pages
- Full-screen camera overlay with scan target box
- After scan: bottom sheet slides up with product info + 3 action buttons: "Add to Pantry" | "Add to List" | "Compare Prices"
- Price compare result: deal cards for matching items, sorted by price

**Deliverables:**
- `npm install @zxing/library` in client package.json
- `client/src/components/BarcodeScanner.tsx` — camera overlay, ZXing integration, scan result callback
- `client/src/components/ScanActionSheet.tsx` — bottom sheet: product info + 3 CTA buttons
- `server/services/productLookup.js` — `lookupBarcode(upc)` → tries Open Food Facts, falls back to UPCitemdb, returns `{ name, brand, size, category, image_url }`
- `/api/product-lookup/:upc` endpoint — GET, returns product info
- Scan button wired into bottom nav (📷 icon, replaces or supplements existing nav)
- Price compare: reuses existing `/api/deals` search filtered by item name/brand

---

## Out of Scope (Phase 8)

- Push notifications for new penny deals (Phase 9)
- User-submitted community finds (requires auth — Phase 9)
- Price history tracking per item (needs accumulation time)
- Instagram automated scraping

---

## Files to Create

```
server/
  data/price-signals.json
  scrapers/penny-deals-scraper.js
  scrapers/walmart-clearance-scraper.js
  scrapers/samsclub-clearance-scraper.js
  services/priceDecoder.js
  services/pennyDealIngester.js
  services/bulkBuyScorer.js

client/src/
  pages/Clearance.tsx
  components/PriceDecoder.tsx
  components/PennyDealCard.tsx
  components/BulkBuyCard.tsx

supabase/migrations/
  20260322000000_penny_deals_table.sql
  20260322000001_price_signals_table.sql
```

---

## Resume Instructions

When picking up Phase 8:
1. Read this PRD
2. Check branch: `feat/phase8-clearance-intelligence`
3. Start with **M001** (Price Decoder) — pure data + logic, no scraping risk
4. M002 next (Penny Calendar) — scraper + Supabase table
5. M003–M005 follow in order
