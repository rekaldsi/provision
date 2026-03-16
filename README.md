# PROVISION

**Stack deep. Buy smart. Give back.**

All-in-one personal savings intelligence platform for Chicagoland households. PROVISION watches every grocery store, stacks every available discount layer, and fires alerts when the math makes a purchase worth it — including near-free and profit deals.

---

## What is PROVISION?

PROVISION is a personal savings engine that combines:
- **Store sale prices** from Kroger (Jewel-Osco, Mariano's), Walmart, and 14+ local stores
- **Store digital coupons** (Kroger loyalty, Target Circle, Walmart)
- **Manufacturer coupons** (Coupons.com, P&G, SmartSource)
- **Rebate app offers** (Ibotta, Fetch, Checkout 51)
- **Stack math** — computes the true final price after all layers

When the stack hits near-free (<$0.25), free ($0.00), or profit (negative price) — PROVISION fires an alert.

---

## Phase 1 Features

- **My List** — Personal shopping list with CRUD, categories, notes
- **Stack Calculator** — Core engine: sale + store coupon + manufacturer coupon = final price
- **Deal Browser** — Browse all active deals, filterable by store, category, search
- **Shopping Plan** — This week's optimized shopping run, ranked by savings, grouped by store
- **Kroger Integration** — Live deal data from Jewel-Osco and Mariano's via OAuth2 API
- **Walmart Integration** — Product pricing via walmart.io Affiliate API
- **Stack Detail** — Full breakdown per item: every discount layer visualized

---

## Setup

### Prerequisites
- Node.js 18+
- Supabase account (or PostgreSQL)
- Kroger Developer account (developer.kroger.com)
- Walmart.io API key (walmart.io)

### Install
```bash
git clone https://github.com/rekaldsi/provision
cd provision
npm run install:all
```

### Configure
```bash
cp .env.example .env
# Edit .env with your credentials
```

### Database
Run `server/db/schema.sql` against your Supabase/PostgreSQL instance.

### Run (development)
```bash
npm run dev
# Backend: http://localhost:3001
# Frontend: http://localhost:5173
```

### Deploy (Railway)
Push to Railway — nixpacks auto-detects Node.js.
Set all env vars from `.env.example` in Railway dashboard.

---

## Phase Roadmap

| Phase | Deliverable |
|-------|-------------|
| **1** | Stack engine core — Kroger + Walmart + manufacturer coupons. Live on Railway. |
| **2** | Full grocery coverage (Aldi, Target, Sam's, Costco) + Pharmacy module (GoodRx) |
| **3** | Intelligence layer — alerts, Ibotta rebates, receipt OCR, price history |
| **4** | Pantry Inventory Manager + Long-Term Storage Mode + Donate Mode |
| **5** | Gas, home improvement, auto care, dollar stores, family sharing |
| **6** | Amazon price tracker, events calendar, back-to-school, spending analytics |
| **7** | Polish — PWA offline, push notifications, barcode scanner, 2FA |

---

## API Docs

See routes in `server/index.js`. Key endpoints:
- `GET /api/items` — My List
- `GET /api/deals/match` — Match deals to My List
- `POST /api/stack/calculate` — Run stack math for any item + store
- `GET /api/shopping-plan` — Full optimized shopping plan

---

*PROVISION v1.0 — Phase 1 | Built for Chicagoland*
