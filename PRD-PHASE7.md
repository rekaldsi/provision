# PRD: PROVISION Phase 7 — Deal Detail, Stack Engine Fix, Action Layer
**Version:** 1.0 | **Owner:** Jerry C. | **Status:** Ready to Build
**Date:** 2026-03-16 | **Priority:** Critical — ships tonight

---

## 1. Problem

Phase 1–6 shipped a working deals browser. But 4 independent reviewers (shopper, couponer, UX designer, data engineer) all hit the same wall:

> "I see a deal. I can't do anything with it."

The discovery → action loop is broken. Deal cards are dead ends. The stack calculator has no coupon data to calculate with. Brand/size fields are missing or buried in name strings. The pantry/list/pharmacy pages are shells — APIs exist but return empty because no data flows through them.

**Core failure:** Provision shows you deals. It doesn't help you act on them.

---

## 2. Goals

| Goal | Success Metric |
|---|---|
| Deal cards become actionable | Every deal card has "Add to List" + "View Detail" |
| Deal detail page exists | `/deal/:id` route shows full product info + stack breakdown + coupon links |
| Stack calculator works | `store_coupon_value` populated from deal source data (not hardcoded 0) |
| Brand/size as structured fields | `item_brand` and `item_size` extracted from name where missing |
| Add-to-list from deal | Tapping "Add to List" on a deal creates a My List item pre-filled with deal data |
| Pantry pre-populated | Users get 10 suggested common household items to seed their pantry on first load |
| Onboarding flow | 3-step wizard on first visit: ZIP code → store preferences → dietary filters |
| "More" nav restructured | Pantry promoted to main bottom nav tab |

## 3. Non-Goals

- Ibotta/Fetch API integration (requires partner API access — separate phase)
- Real receipt OCR (requires AWS Textract key — separate phase)
- Barcode scanner (native camera API — separate phase)
- Price history charts (requires historical data accumulation — future)
- Store locator map (separate phase)

---

## 4. Current State Audit

### Data gaps (from Carlos — data engineer review)
- `item_brand`: null on ~80% of deals (only populated when Flipp includes it explicitly)
- `item_size`: not a field — size buried in `item_name` string ("Pantene Shampoo 12oz") or in `unit` ("42ct")
- `store_coupon_value`: hardcoded to 0 on ALL deals
- `target_circle_url`: null on all deals
- `source_url`: null on all deals
- `flipp_item_id`: null on all deals
- Pantry API (`/api/pantry`): returns HTML (not wired)
- List API (`/api/list`): returns empty (not wired to deal cards)
- Pharmacy API (`/api/pharmacy`): returns HTML (not wired)

### UX gaps (from Sarah — UX designer review)
- No `/deal/:id` route — clicking a deal goes nowhere
- No "Add to List" button on deal cards
- "More" nav is a junk drawer — Pantry is core, should be tab 4
- Empty states are blank (Pantry: "Your pantry is empty" with no context)
- No onboarding (no ZIP, no store prefs, no dietary filters)
- Alerts page: unclear if personalized vs. system-generated

### Stacking gaps (from Derek — extreme couponer review)
- Stack calculator can't layer because `store_coupon_value = 0` always
- "Near Free" flags unreliable — based on discount% not true stacked price
- No coupon clip links
- Deal unit text ("Final Price With Coupon") conflates sale+coupon into one number — can't stack further

---

## 5. Proposed Solution

### 5.1 Deal Detail Page (`/deal/:id`)
New route. Shows everything about a single deal:
- Product image (if available via Flipp, else category icon placeholder)
- Full item name + brand + size/unit + store
- Price breakdown: Original → Sale → (Store coupon if available) → Final
- Alert tier badge (🔥 HOT DEAL / ⚡ NEAR FREE / 🆓 FREE / 💰 PROFIT)
- Valid dates + days remaining (red if <3 days)
- "Add to My List" primary CTA (green button)
- "View Full Ad" link (if source_url available)
- "Clip Digital Coupon" link (if coupon link available — Jewel, Kroger, Target Circle)
- Stack breakdown section: shows each layer (sale / coupon / rebate placeholder)
- Related deals from same store (bottom section)

### 5.2 Deal Cards → Actionable
Every deal card gets:
- Tappable (entire card) → navigates to `/deal/:id`
- "Add to List" chip button (bottom of card) — one tap, adds without navigating away
- "Copy Deal" long-press / secondary action (copies deal text to clipboard)

### 5.3 Brand + Size Extraction
Server-side preprocessing on deal ingest:
- Parse `item_name` for known brand names → populate `item_brand` if null
- Extract size patterns (e.g. `12oz`, `42ct`, `5 lb`, `2-pack`) → populate `item_size`
- Store extracted values in DB — don't mangle original `item_name`
- Apply to all existing deals via migration

### 5.4 Stack Calculator — Coupon Value Fix
- For Flipp deals where `unit` contains "with coupon" → split: estimate base sale price + coupon value
- For Kroger API deals → attempt to fetch digital coupon value from Kroger loyalty API
- For all others → show "Store coupon: check store app" with deep link
- Add `coupon_source` field: "kroger_digital" | "target_circle" | "flipp_embedded" | "unknown"

### 5.5 "Add to List" Flow
When user taps "Add to List" from a deal card or detail page:
- Creates item in My List with: name, brand, store, target_price = deal's sale_price
- Shows confirmation toast: "Added to your list ✓"
- Deal card shows checkmark badge if item is already on list
- My List item links back to deal (shows "Deal active — expires X")

### 5.6 Pantry Suggestions (First-Load Empty State)
When Pantry has 0 items, show:
- Headline: "Start tracking what you have"
- Body: "Add common items so Provision can tell you when you're running low."
- Quick-add chips: Paper Towels / Toilet Paper / Dish Soap / Laundry Detergent / Olive Oil / Pasta / Rice / Canned Tomatoes / Coffee / Shampoo
- One tap adds to pantry with qty=1, no expiry
- CTA: "Add my own item"

### 5.7 Onboarding (First Visit Only)
3-step wizard, stored in localStorage, appears once:

**Step 1 — Where do you shop?**
- ZIP code input (pre-fills from browser geolocation if permitted)
- Checkboxes: Jewel-Osco / Mariano's / Aldi / Walmart / Target / Sam's Club / Costco / H Mart / Tony's / Home Depot / Menards / Dollar General / Other
- "Select all near me" button

**Step 2 — What matters to you?**
- Toggles: Quality foods only / No junk food / Organic preferred / Vegan/Vegetarian / Budget mode (flag anything >50% off) / Bulk buyer (flag larger sizes)

**Step 3 — Deal alerts**
- "Notify me about:" checkboxes: Near Free deals / Free deals / Profit deals / Hot deals (≥40% off)
- "How often:" Daily digest / Real-time / Weekly summary
- Skip option

Store/preference data saved to localStorage (no backend auth needed yet).
Deals page filters pre-set based on store selection.

### 5.8 Nav Restructure
**Current:** Home | List | Deals | Alerts | More
**New:** Home | Deals | Pantry | Alerts | More

- Remove "List" from main nav (move to "More" section — less core than Pantry)
- Add "Pantry" as tab 3 (core to the "don't buy what you have" use case)
- "More" becomes: My List / Shopping Plan / Gas / Pharmacy / Amazon / Donate

### 5.9 Alerts Page Clarity
- Rename page title: "Deal Alerts"
- Add subheading: "Hot deals matching your preferences"
- Add "Set Alert" FAB button (opens modal: search item → set price threshold)
- Add source label on each card: "Matched: Hot Deals filter" or "Matched: On your list"
- Populate with top 10 deals by discount% as default (vs. current single card)

---

## 6. Architecture / Touchpoints

| File | Change |
|---|---|
| `client/src/App.tsx` | Add `/deal/:id` route, restructure bottom nav |
| `client/src/pages/DealDetail.tsx` | NEW — full deal detail page |
| `client/src/components/DealCard.tsx` | Add tap nav + "Add to List" chip |
| `client/src/pages/Pantry.tsx` | Add first-load suggestion chips |
| `client/src/pages/Alerts.tsx` | Rename, add FAB, fix empty state, populate 10 deals |
| `client/src/pages/More.tsx` | Add My List + Shopping Plan tiles |
| `client/src/components/Onboarding.tsx` | NEW — 3-step wizard, localStorage |
| `client/src/lib/api.ts` | Add `getDeal(id)`, `addToList(deal)`, `getOnboardingPrefs()` |
| `server/index.js` | Add `GET /api/deals/:id`, fix `POST /api/list` to accept deal payload |
| `server/services/dealEnricher.js` | NEW — brand/size extraction from item_name |
| `server/db/migrations/` | Migration to populate `item_brand`, `item_size` from existing data |

---

## 7. Risk + Blast Radius

- **Nav restructure:** Moving "List" to More could confuse current users — low risk (no production users yet)
- **Brand extraction:** Regex parsing of names — could mis-tag brands. Write conservative patterns, default to null if uncertain.
- **Deal detail page:** New route, no existing routes affected
- **Stack calc:** Only changing display logic, not deal ingestion — low risk

---

## 8. Rollback Plan

All changes on branch `feat/phase7-action-layer`. If deploy breaks:
- `git revert` the merge commit
- Railway auto-deploys from main — one command to revert

---

## 9. Test Plan

For each critical item:
1. **Deal detail page:** Tap any deal card → lands on `/deal/:id` → shows name, brand, store, price, valid dates, CTA
2. **Add to List:** Tap "Add to List" on deal → toast appears → item appears in My List → deal card shows checkmark
3. **Brand extraction:** Run enricher on 10 known deals → verify brand populated (Pantene, Tide, Bounty, etc.)
4. **Pantry empty state:** Clear pantry → verify 10 suggestion chips appear → tap chip → item added
5. **Onboarding:** Clear localStorage → refresh → wizard appears → complete → wizard doesn't appear again
6. **Nav:** Verify Pantry is tab 3, More has correct sub-items
7. **Alerts:** Verify 10 deals populate, subheading visible, FAB present

---

## 10. Execution Plan

### Phase 7a — Tonight (Critical)
1. Deal detail page (`/deal/:id`) — full component + route + API endpoint
2. Deal cards → tappable + "Add to List" chip
3. Brand/size extraction service + migration on existing deals
4. Stack calculator coupon display fix (show "check store app" vs. hardcoded $0)
5. Pantry empty state with suggestion chips
6. Nav restructure (Pantry to tab 3, List to More)
7. Alerts page: rename + populate 10 deals + FAB

### Phase 7b — Next session (High priority)
7. **[P1 — Jerry audio note 00:59 CST] Stack calculator must show brand + size + unit price** — When "Best Stack: Jewel-Osco" appears, user must see: brand (e.g. "Mahatma"), package size (e.g. "5 lb bag"), AND unit price (e.g. "$0.29/oz"). Without these, user cannot compare across stores or trust the recommendation. The brand extraction service from Phase 7a exists — wire it through to the stack result summary view.
8. **[P1] Store filter pills on Deals page** — Horizontal scrollable pill row: All | Jewel | Aldi | Target | Walmart | … — tap to filter deals to that store only. No page reload. (Jerry audio note 00:56 CST)
9. **[P1] Checkout Mode / Coupon Wallet** — (see full spec below). Full-screen cashier-scan mode.
10. Onboarding wizard (3-step, localStorage)
11. "Already on list" checkmark on deal cards
12. "Deal active" link from My List items back to deal
13. Alerts: "Set Alert" modal with price threshold
14. Pharmacy integration with deals (show OTC deals on Pharmacy page)

### Phase 7c — Polish
13. Price history sparkline (once data accumulates)
14. Store locator (ZIP → nearest store)
15. Barcode scanner
16. Push notifications

---

## Definition of Done (Phase 7a)
- [ ] Tapping any deal card navigates to `/deal/:id`
- [ ] Deal detail shows: name, brand, size, store, price, dates, tier badge, CTA
- [ ] "Add to List" works from both deal card and detail page
- [ ] item_brand populated for Pantene, Tide, Bounty, Cheerios, Progresso at minimum
- [ ] Pantry empty state shows 10 suggestion chips
- [ ] Bottom nav: Home | Deals | Pantry | Alerts | More
- [ ] Alerts page shows 10 deals (not 1), has subheading
- [ ] Build passes (npm run build in /client), zero TS errors
- [ ] Deployed to Railway, live at provision-production-3a3f.up.railway.app

---

## PHASE 7b ADDITION — Checkout Mode (Coupon Wallet)
**Filed:** 2026-03-16 00:54 CST — Jerry feedback

### The Problem
Shopping Plan shows "Cheerios — $1 off coupon" but there's no way to actually USE it at checkout. User has to leave the app, open the Jewel/Kroger app manually, find the coupon, and present it. This defeats the purpose of a one-stop platform.

### The Feature: Checkout Mode
**Entry point:** "Check Out" button in Shopping Plan (bottom of the list)

**Flow:**
1. User adds items to plan → taps "Check Out" button
2. App enters **Checkout Mode** — full screen, keep-awake, high brightness
3. Shows each coupon ONE AT A TIME in scan-ready format:
   - Store name + logo
   - Product name
   - Discount amount ("$1.00 off Cheerios")
   - **Scannable barcode** (if available) — large, full-width, cashier-ready
   - **OR** — Store app deep link ("Open Jewel App → Clip & Scan")
   - "Next Coupon →" button (advances to next)
4. Final screen: "All coupons presented — estimated savings: $X.XX"
5. Exit Checkout Mode → returns to plan

### Coupon Sources by Store
| Store | Coupon Method | What We Show |
|---|---|---|
| Jewel-Osco / Mariano's | Kroger Digital Coupon (clip in app/web) | Deep link to kroger.com/savings/cl/promotions + barcode if stored |
| Target | Target Circle (clip in app) | `target_circle_url` deep link |
| Walmart | Walmart app savings | Walmart item deep link |
| Sam's Club | Digital member coupons | Sam's Club app deep link |
| Dollar General | DG Digital Coupons | DG app deep link |
| Manufacturer (Coupons.com) | Printable or digital barcode | Render barcode from coupon code |
| Ibotta / Fetch | POST-PURCHASE rebate | Show AFTER checkout: "Don't forget to submit your receipt" |

### Data Requirements
- Add `coupon_barcode` field to deals table (stores raw barcode string for rendering)
- Add `coupon_deep_link` field (direct URL to clip/redeem in store app)
- Add `coupon_type` field: "digital_clip" | "printable" | "post_purchase_rebate" | "store_sale" | "loyalty_card"
- For Kroger API deals: fetch associated digital coupon codes from Kroger promotions API
- For Flipp deals marked "Final Price With Coupon": flag as `coupon_type: "loyalty_card"` — user must have store card

### Coupon Wallet View (standalone)
- New route: `/wallet`
- Shows ALL active coupons for items on My List
- Organized by store (so user can batch the trip)
- Each coupon: product, discount, expiry, clip status, barcode/link
- "Add to This Trip" button on each coupon
- Total estimated savings counter at top

### Checkout Mode UX Specs
- Full screen takeover (no bottom nav)
- Screen keep-awake (WakeLock API)
- Font size +2x for cashier readability
- Barcode: `react-barcode` or `jsbarcode` library — Code128 format (universal scanner compat)
- QR code fallback: `qrcode.react` — for stores that use QR-based redemption
- Progress indicator: "Coupon 2 of 5"
- Undo button (go back to previous coupon)
- "Skip" button (cashier already scanned / not available)

### Implementation Notes
- WakeLock API: `navigator.wakeLock.request('screen')` — supported on Chrome/Safari iOS 16.4+
- jsbarcode: `npm install jsbarcode` — renders to canvas, no server needed
- qrcode.react: `npm install qrcode.react`
- Store deep links (static map, no API needed):
  - Kroger/Jewel: `https://www.kroger.com/savings/cl/promotions`
  - Target Circle: `https://www.target.com/circle/offers`
  - Walmart: `https://www.walmart.com/coupons`
  - Dollar General: `https://www.dollargeneral.com/savings/coupons`
  - Sam's: `https://www.samsclub.com/savings`
