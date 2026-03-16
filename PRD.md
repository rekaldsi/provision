# PRD: PROVISION — All-In-One Personal Savings Intelligence Platform
**Version:** 5.0 FINAL | **Owner:** Jerry C. | **Status:** Ready to GSD

---

## 1. Mission

One platform for every dollar Jerry spends. Groceries, household, personal care, pharmacy, home improvement, auto care, prepper gear, gas, online shopping, back to school, and local markets — PROVISION watches everything and fires when the stack math makes it worth buying.

**"Stack deep. Buy smart. Give back."**

---

## 2. The Stack (Core Mechanic)

| Layer | Source |
|---|---|
| 1. Store sale / clearance | Weekly circular, clearance rack |
| 2. Store digital coupon | Loyalty card clip (Jewel, Kroger, Target Circle, Walmart) |
| 3. Manufacturer coupon | Coupons.com, P&G Everyday, SmartSource, Sunday insert |
| 4. Rebate app | Ibotta, Fetch Rewards, Checkout 51 |
| 5. Local paper insert | ValPak, Sunday Saver, RedPlum |
| 6. Credit card rewards | Rotating 5% categories (grocery, gas, home improvement) |
| 7. Digital wallet offers | PayPal Rewards, Honey, Apple Pay/Google Pay offers |

**BOGO rule:** Manufacturer coupon applies to paid unit — both units discounted. Handled separately.
**Clearance rule:** Clearance + coupon = maximum stack. Always flagged as highest priority.

---

## 3. Store Coverage

### Grocery
- **Jewel-Osco** (Kroger ecosystem — public API)
- **Mariano's** (Kroger ecosystem — same API)
- **Aldi** (no API — scrape weekly ad + flipp)
- **Tony's Finer Foods** (scrape weekly ad PDF)
- **H Mart** (scrape weekly ad PDF)
- **Seafood City** (scrape weekly ad PDF)
- **Target** (scrape + Target Circle)
- **Walmart** (walmart.io API)
- **Sam's Club** (scrape weekly savings)
- **Costco** (scrape monthly savings book)
- **Grocery Outlet** (if Chicagoland location confirmed — scrape)
- **Dollar General / Dollar Tree** (household staples — scrape weekly ad)
- **Restaurant Depot** (no circular — community price data + manual; commercial bulk at public prices with free membership)
- **Green Earth Grocery** (bulk bins — grains, oats, beans, spices; manual/periodic)
- **River Valley Market** (bulk grains + legumes in refillable containers; manual/periodic)
- **Local Polish delis/bakeries** (manual entry)

### Home Improvement
- Home Depot, Menards, Lowe's

### Auto Care
- Jiffy Lube, Midas, Firestone, Valvoline
- AutoZone, O'Reilly, Advance Auto Parts, Amazon auto

### Gas
- Sam's Club pump, Costco pump, GasBuddy area avg, Jewel Fuel Rewards

### Online
- Amazon, any retailer via Honey/PayPal Rewards

### Pharmacy
- GoodRx, Cost Plus Drugs (costplusdrugs.com), RxSaver, NeedyMeds
- Costco pharmacy, Sam's pharmacy, Walmart $4/$10 list
- Walgreens, CVS, Jewel/Kroger pharmacy

---

## 4. Category Coverage

### Food (Nutritious Focus — quality filter active)
- Fresh produce & meat / Whole grains / Dried legumes / Pasta / Canned goods / Dairy / Frozen vegetables & proteins / Bread / Oils, condiments, spices

*Quality filter: De-prioritize highly processed items, soda, candy. Items >30% calories from added sugar excluded from Donate Mode and deprioritized in alerts.*

### Household
- Paper towels, toilet paper, tissues, bottled water/filters
- Cleaning supplies, trash bags, storage bags, batteries, light bulbs

### Personal Care
- Shampoo, conditioner, body wash, bar soap
- Feminine hygiene (pads, tampons — daughter)
- Toothpaste, toothbrushes, deodorant, razors, lotion, sunscreen, first aid

### Pharmacy / Health
- Prescription medications (Jerry + family — private, encrypted)
- OTC medications, vitamins, supplements, medical supplies

### Auto Care
- Oil, filters, wiper blades, belts, tires
- Service coupons: oil change, brakes, alignment

### Home Improvement (Seasonal)
- Spring/Summer: grass seed, fertilizer, mulch, garden, AC, fans, grill
- Fall/Winter: snow gear, weatherization, indoor paint, holiday lighting
- Year-round: hardware, light bulbs, batteries

### Self-Sustainability / Resilience (formerly "prepper" — reframed as positive, forward-looking)
- Food storage hardware: mylar bags, O2 absorbers, food-grade buckets, gamma seal lids
- Vacuum sealers + bags (FoodSaver, Weston, chamber vacuum)
- Freeze dryer deals (Harvest Right — alert on sales)
- Shelving, plastic storage bins/totes (Rubbermaid, Sterilite, IRIS)
- Water storage: rain barrels, 55-gal barrels, 5-gal jugs
- Water filtration: Berkey, Sawyer, LifeStraw, gravity filters
- **Power independence:** solar panels (starter kits, rooftop), portable power stations (Jackery, EcoFlow, Bluetti), UPS battery backups (for computer + networking gear), inverter generators, propane tanks
- **Energy:** battery banks (high-capacity), solar chargers, hand-crank devices
- Communication: LoRa radios, Meshtastic nodes, walkie-talkies, GMRS
- First aid: trauma kits, wound care
- Tools: multi-tools, hand tools, fire starters, axes

### Garden & Growing (Chicagoland — USDA Zone 6a)
- Seeds: vegetables, herbs, companion plants (track deals on Baker Creek, Johnny's, Amazon)
- Growing supplies: raised bed kits, soil amendments, fertilizer, compost bins, grow lights, seed starting trays
- Deal tracking: seeds + supplies on Amazon, Home Depot, Menards, Lowe's

### Electronics / Hobbyist (Jerry's Interests)
- Raspberry Pi (all variants), Pi Zero, Pico
- LoRa/Meshtastic hardware (RAK, Heltec, LilyGo)
- SDR (RTL-SDR, HackRF), antennas
- Arduino, ESP32, microcontrollers
- Soldering, test gear, storage media

### Seasonal / Events
- Back to School (July–September): backpacks, supplies, clothing basics, calculators
- Gifts / Birthdays: proactive deal alerts 3-4 weeks before event dates

---

## 5. Core Features

### 5.1 My List
- Manual item entry (name, brand, category, quantity)
- Receipt upload → AWS Textract OCR → auto-populate
- Medication list (private, encrypted)
- "Never Pay Full Price" Watch List — set target price, alert on drop
- Category tagging + nutritional quality flag
- Household profile: family size, ages, known regular buys
- Event/birthday calendar
- **Family sharing** — multi-user access, real-time sync, role-based permissions (view/edit)

### 5.2 Pantry Inventory Manager (NEW — Core Feature)
- Track current stock: item, quantity, location (pantry shelf, freezer, long-term storage)
- Expiration / best-by date tracking
- **FIFO reminders** — use oldest stock first, alert before items expire
- **Reorder alerts** — notify when stock drops below threshold
- **"Pantry First" logic** — before buying an item, check if it's already stocked
- Barcode scan to add/remove items from pantry inventory
- Long-term storage section: sealed buckets, mylar bags (with seal date + projected shelf life)
- Donation tracker integration: when donating items, log from pantry

### 5.3 Stack Finder (THE ENGINE)
For every item:
1. Pull current sale prices (all stores)
2. Store digital coupon (Kroger, Target Circle, Walmart, Sam's)
3. Manufacturer coupon (Coupons.com Brandcaster API, P&G, SmartSource, ValPak)
4. Sunday insert coupons (Firecrawl scrape)
5. Rebate offers (Ibotta, Checkout 51, Fetch)
6. Credit card offer match (user's card categories entered manually)
7. Honey/PayPal Rewards (for online purchases)
8. Stack Price = sale − store coupon − manufacturer coupon − rebate − CC offer
9. BOGO math + clearance math handled separately
10. Flag: Near Free (<$0.25) / Free / Profit (negative)

### 5.4 Pharmacy Intelligence
- Family medication list (encrypted, private)
- **Multi-source price comparison:** GoodRx API + Cost Plus Drugs + RxSaver + Walmart $4 list + Costco/Sam's/Jewel pharmacy
- "New Rx interceptor" — before filling at default pharmacy, check full price landscape
- OTC medication deals + Ibotta rebates
- Manufacturer copay cards (manual entry + deep links to manufacturer sites)
- Prescription savings estimated monthly/annually

### 5.5 Community Deal Feed
- RSS: Hip2Save, The Krazy Coupon Lady, Slickdeals (grocery + tech + deals), DealNews, Brad's Deals
- Parsed daily, matched against My List
- Shown with stack math breakdown

### 5.6 Stack Alert System
- Near Free / Free / Profit
- BOGO + coupon stack
- Clearance + coupon
- Price match opportunity (Walmart vs. competitor)
- Watch list price hit
- Coupon expiry warning (<48h)
- Gas price alert (Sam's/Costco vs. area avg)
- Rx price drop (generic available, price change)
- Amazon Lightning Deal on tracked item
- Seasonal home improvement calendar alert
- Back to school sale start
- Birthday/event deal alert (3-4 weeks out)
- **Pantry low-stock reorder alert**
- **Expiration warning** (item in pantry expires within 30 days)
- **Location-aware** (optional): "Sam's Club near you has [item] on sale this week"
- **Customizable:** per-category frequency, daily digest option, snooze/dismiss

### 5.7 Shopping Plan
- Item → stack breakdown → final cost → store
- "STACK: $1.99 sale − $0.50 digital − $1.00 mfr coupon − $0.75 Ibotta = FREE after rebate"
- "PANTRY: Already have 2 lbs — skip this week"
- Digital coupon deep links
- Print coupon list
- Price match notes
- Pharmacy stop: "Fill [Rx] at Costco — $12.50 vs. $87 at Walgreens"
- Estimated trip savings + pending rebates

### 5.8 Price Match Intelligence
- Store price match policies database
- Auto-flag: "Buy at Walmart, show Jewel ad, then stack Walmart coupon on top"

### 5.9 Long-Term Storage Mode
- Triggers on bulk shelf-stable deals >30% off normal
- Storage method guide + shelf life (USDA + LDS data)
- Stock-up score = (discount%) × (shelf life months) / 100
- Freezer flag: meat deals → quantity + shelf life recommendation
- Prepper hardware alerts: when storage gear (mylar, buckets, O2 absorbers) goes on sale

### 5.10 Donate Mode
- Near-zero items for food pantry donation
- Quality filter: nutrition-dense shelf-stable items only
- Greater Chicago Food Depository wishlist integration
- Chicago-area food pantry directory + drop-off hours
- Donation tracker: lbs donated, retail value, families helped estimate
- Pantry cross-reference: flag excess pantry stock that could be donated before expiry

### 5.11 Gas Intelligence
- Sam's + Costco pump price vs. GasBuddy area average
- Jewel Fuel Rewards balance + redemption alert
- "Worth the trip" calculator

### 5.12 Home Improvement Deals
- Flipp + direct scrape: Home Depot, Menards, Lowe's
- Seasonal deal calendar
- Menards 11% rebate tracking (quarterly)
- Price comparison across all three

### 5.13 Auto Care Deals
- Service coupons: Jiffy Lube, Midas, Firestone, Valvoline
- Parts price tracking: AutoZone, O'Reilly, Amazon
- Seasonal alerts: winter wipers, winter tires

### 5.14 Amazon & Online Intelligence
- Price tracker: ASIN/URL → target price → alert
- CamelCamelCamel/Keepa price history
- Lightning Deal + Gold Box monitor
- **Honey/PayPal Rewards** — coupon codes + cash back layer
- Subscribe & Save optimizer (vs. in-store stacked deal)
- Amazon Warehouse Deals alerts
- Slickdeals + DealNews + Brad's Deals RSS (tech + deals)
- Hobbyist/electronics deal categories
- Event/birthday gift deal alerts

### 5.15 Spending Analysis (Receipt Scanner + Analytics)
- Upload receipt → AWS Textract AnalyzeExpense
- Auto-extract line items → My List
- Post-purchase rebate suggestions (Ibotta, Fetch)
- **Missed savings analysis**: "You paid full price for Tide — a $1.50 Ibotta rebate was active"
- Price history per item per store (builds "normal price" baseline)
- Monthly spending summary by category
- **Recipe cost analysis** (Phase 6+): enter a recipe, see total cost using current stacked deal prices

### 5.16 Store Brand vs. National Brand
- Always compare: stacked national brand vs. store brand
- Show full math — sometimes store brand wins, sometimes it doesn't

### 5.17 In-Store Barcode Scanner
- Mobile: scan UPC via camera
- Instant: current price at this store, all coupons, all rebates, full stack total
- Also: scan to add/remove from pantry inventory

### 5.18 Fuel Rewards Tracker
- Jewel/Kroger points balance + redemption alerts
- Sam's Club Plus gas savings
- Monthly gas savings tracker

### 5.19 Farmers Market Module
- Chicago-area market directory (Green City, Logan Square, etc.)
- Seasonal produce calendar: what's in season in Chicagoland by month
- "In season = likely cheaper at market" alerts (no API — static data)

### 5.20 Chicagoland Garden Intelligence (NEW)
- **Zone 6a planting calendar** — static, curated for Chicagoland:
  - Indoor seed start dates (February–April by plant type)
  - Last frost date (avg April 22 in Chicago area) — "safe to direct sow" alert
  - Direct sow / transplant dates by vegetable
  - Harvest windows
  - Fall planting guide (garlic in October, winter greens in September)
- **Companion planting guide** — what grows well together, what doesn't:
  - Good: tomato + basil, corn + beans + squash (Three Sisters), carrots + onions
  - Bad: fennel (allelopathic — grows alone), onions + beans, cabbage + strawberries
- **What to plant when:** "It's March 15 in Chicago — start tomatoes and peppers indoors now"
- **Seasonal task reminders:** soil prep, compost turning, mulching, succession planting
- **Seed deal tracker:** alert when seeds for your planned garden go on sale
- **AI-enhanced over time:** learns what you planted last year, suggests improvements

### 5.21 Self-Sustainability Resource Hub (NEW)
- **Solar & Power Independence tracker:**
  - Monitor deals on solar panels, portable power stations (Jackery, EcoFlow, Bluetti), UPS units
  - Educational content: "What size solar setup do you need to run your fridge + networking gear?"
  - Price history on Amazon for major power products (CamelCamelCamel)
- **Resource list:** curated, editable list of self-sustainability goals and gear — things to research, save toward, buy on sale
- **Guides library:** static reference guides (with seasonal updates):
  - Long-term food storage by category
  - Water storage and purification
  - Home solar basics
  - Composting + soil building
  - Seed saving
  - Food preservation (canning, fermenting, dehydrating)
- **Learning prompts:** "You haven't started your seed order yet and last frost is 6 weeks out"

### 5.22 Smart Planning Calendar (NEW — Core Feature)

The command center. Integrates every PROVISION data source into a unified week-by-week action plan.

**Calendar Views:**
- **Today** — what to act on right now (coupon expiring tonight, deal ending today)
- **This Week** — shopping trips, garden tasks, pantry actions, upcoming deal windows
- **This Month** — batch actions (canning window, bulk buy opportunity, seed order deadline)
- **Year at a Glance** — seasonal rhythm map:
  - Feb: order seeds, start peppers/tomatoes indoors
  - March: start cool-weather crops indoors (broccoli, cabbage, onions)
  - April: last frost prep, transplant window opens late April
  - May-June: direct sow, transplant outdoors
  - July: back to school sale alert, cucumber + zucchini harvest → pickle/ferment
  - Aug-Sept: tomato/pepper peak → water bath canning, sauce, salsa
  - Oct: garlic planting, apple harvest → dehydrate/sauce, bulk grain stock-up
  - Nov: holiday household stock-up, freeze dryer run
  - Dec-Jan: seed catalog planning, pantry inventory audit

**Trip Builder (One-Tap):**
- Pick a day → PROVISION generates the optimized shopping run:
  - Which stores to hit (ranked by savings potential + route efficiency)
  - What to buy at each store
  - Full stack math per item
  - All coupons queued and ready
- **Phone-ready coupon display** — cashier-scannable barcode/QR shown directly in app at checkout, no printing required
- Deep links to store loyalty apps for digital clip confirmation
- Estimated trip time + total savings

**Preservation & Food Processing Calendar:**
- Seasonal triggers: "Tomatoes are in season → water bath canning window (Aug 15–Sept 30)"
- Preservation method guide per food type:
  - **Water bath canning** (high-acid): tomatoes, pickles, jams, fruit, salsa
  - **Pressure canning** (low-acid): green beans, carrots, meat, soups — REQUIRES pressure canner
  - **Lacto-fermentation** (salt only, no vinegar): sauerkraut, kimchi, pickles, hot sauce — simplest method
  - **Vinegar pickling** (quick): cucumbers, peppers, onions, radishes — refrigerator or water bath
  - **Dehydrating**: apples, tomatoes, herbs, mushrooms, jerky — can be done in oven at 170°F
  - **Freeze drying**: best for long-term (25yr shelf life) — requires Harvest Right, premium method
  - **Root cellar / cool storage**: potatoes, squash, apples, carrots, garlic, onions — no equipment
  - **Freezing**: meat, blanched vegetables, bread, fruit — short-to-medium term (3-12 months)
- "It's mid-July: cucumbers are cheap at H Mart → make lacto-fermented pickles (salt + water, 1 week, zero vinegar required)"
- Recipe card links per preservation method (static reference library)

**Smart Reminders:**
- Coupon expiring in <48h that matches My List
- Seed start date approaching ("Start peppers indoors — 10 weeks before last frost")
- Pantry item hitting reorder threshold
- Canning supply sale (Ball jars, lids — track on Amazon + Home Depot)
- Rx refill window (based on day supply)
- Seasonal garden task (mulch before first frost, plant garlic in October)

### 5.23 PROVISION AI Assistant (NEW — Phase 7+)
- Natural language chat interface: ask PROVISION anything
  - "What should I plant this week in Chicago?"
  - "What's the cheapest way to stock 6 months of protein right now?"
  - "Which store has the best deals on paper goods this week?"
  - "My daughter needs school supplies — what's on sale?"
  - "I'm going to Sam's Club tomorrow — what should I grab?"
- Answers draw from: My List, Pantry Inventory, active deals, price history, planting calendar, storage guide
- **Learns from usage** over time: adjusts recommendations based on what Jerry actually buys, what he stockpiles, what he skips
- Powered by local LLM (Ollama/LM Studio) for privacy — no grocery/health data sent to cloud AI

### 5.23 Credit Card & Digital Wallet Optimization
- User enters card rewards categories (e.g., "Chase Freedom: 5% at grocery stores this quarter")
- PROVISION factors in CC cash back when calculating true stack price
- Alerts when a rotating category matches a deal on My List
- **Price protection card database**: which cards have price protection and their terms

### 5.24 FSA / HSA Spending Tracker
- User enters annual FSA/HSA balance and benefit year end date
- PROVISION flags FSA/HSA-eligible items in deals (OTC meds, sunscreen, bandages, medical supplies, menstrual care)
- Tracks spending against annual limit — "You have $340 remaining in your FSA. It expires Dec 31. Here are eligible items on sale this week."
- "Use it or lose it" alert: 60 days before year end, surfaces all eligible deals

### 5.25 Loyalty Wallet
- Single view of all active loyalty balances: Jewel/Kroger fuel points, Target Circle, Walgreens Balance Rewards, Sam's, Costco, CVS ExtraBucks
- Points expiry alerts — "Your Walgreens ExtraBucks expire in 14 days — $4.50 available"
- **Auto-clip coupons** (where API allows): PROVISION automatically clips relevant Kroger digital coupons to loyalty card — stack happens without Jerry touching the app
- Redemption recommendations tied to gas intelligence and shopping plan

### 5.26 Medication Safety & Health Intelligence
- **Medication-food interaction flags** (static reference): when a food deal hits for something that interacts with a tracked family medication, PROVISION quietly flags it (grapefruit + statins, leafy greens + Warfarin, etc.)
- **Allergy/dietary restriction tracking**: family member profiles with known allergies (peanuts, gluten, dairy, shellfish). Restricted item deals hidden or clearly flagged.

### 5.27 Illinois & Chicago Government Savings Programs
- Database of local programs surfaced contextually:
  - City of Chicago: rain barrel rebate, tree planting program, energy efficiency rebates
  - ComEd/Peoples Gas: efficiency rebates (LED, appliances, smart thermostat, weatherization)
  - Federal IRA credits: 30% solar tax credit, heat pumps, EV chargers
  - Illinois Cares Rx, LIHEAP (energy assistance), IHWAP (weatherization)
- Surfaces relevant programs based on what Jerry is tracking ("rain barrel in list → city rebate available")
- Annual reminder to check for new programs

### 5.28 Price Drop Refund Tracker
- Monitors price drops on recent purchases (via receipt scan history)
- Alert: "Tide at Jewel dropped $2.00 since you bought it March 10. Your Chase Sapphire has price protection — file a claim by May 10."
- User enters cards + their price protection policies; PROVISION tracks open claims + deadlines

### 5.30 Land Search & Homestead Scout (NEW — Long-Term Vision)
The final frontier of self-sustainability: own the land that feeds your family.

**What it does:**
- User sets search criteria: budget, states (Michigan, Wisconsin, Illinois, Indiana, Iowa), acreage (min/max), key requirements
- Criteria includes: no flood zone (FEMA flood map data), water access (stream, well, or pond), wooded acreage, distance from nearest town (supplies + feed), soil quality data
- PROVISION scrapes or monitors: Zillow land listings, LandWatch, Lands of America, Land And Farm, Realtor.com (land/acreage filter)
- Daily digest: new listings matching criteria pushed to calendar view
- **Evaluation scorecard per listing:**
  - Flood zone status (FEMA)
  - Soil type + Agricultural capability (USDA Web Soil Survey API — free)
  - Water access (listed or county records)
  - Distance to nearest town with farm supply store (Tractor Supply, feed store, lumber)
  - Distance from Chicago (Jerry's home base)
  - Estimated well/septic cost if not present
  - Zoning (agricultural vs. residential — can you farm + build?)
  - State-specific: Michigan UP, Wisconsin Driftless, northern Illinois — different climate zones, different growing potential
- **Partner search:** flag listings with enough acreage for 2+ families (for Frank + Jerry co-purchase scenario)
- **Pond potential:** flag listings with existing pond OR wetland/low-lying areas where pond excavation is feasible
- **Saved searches + comparison view:** compare multiple listings side by side on scorecard

**Data sources:**
- LandWatch API / Zillow API (land filter)
- FEMA National Flood Hazard Layer (free API)
- USDA Web Soil Survey (free API — soil capability class per parcel)
- County assessor records (parcel data, zoning)
- USDA Plant Hardiness Zone data (growing zone per location)

**Phase:** Post-Phase 7 (long-term roadmap item, add when core is stable)

### 5.31 Waste & Sustainability Tracker
- **Expiration waste log**: when an item leaves pantry as expired, log it
- Monthly waste report with trend line ("improving from last month")
- Composting guide: what kitchen scraps to compost, readiness calendar
- Rainwater harvesting calculator: Chicago avg rainfall by month + rain barrel sizing for garden

---

## 6. Data Sources

### APIs (Legitimate — Tier 1)
| Source | Coverage | Notes |
|---|---|---|
| Kroger API (developer.kroger.com) | Jewel + Mariano's | OAuth2, register app |
| Walmart API (walmart.io) | Walmart pricing | API key |
| GoodRx API | Rx prices by pharmacy | Free API key |
| Cost Plus Drugs (costplusdrugs.com) | Mark Cuban's pharmacy | Scrape or API if available |
| GasBuddy API | Gas prices by zip | Free tier |
| CamelCamelCamel API | Amazon price history | Free |
| AWS Textract | Receipt OCR | Pay-per-use (~$0.05/page) |
| Coupons.com Brandcaster | Manufacturer coupons | Affiliate program — apply first |

### Scrapers (Tier 2 — Built with rate limiting, caching, user-agent rotation)
| Source | Method | Cache |
|---|---|---|
| Flipp (all major store circulars) | Python OSS (flippscrape) | 7 days |
| P&G Everyday | Scrape | 7 days |
| SmartSource / Save.com | Scrape | 7 days |
| ValPak by zip | Firecrawl | 7 days |
| Costco.com/savings | Playwright | 30 days |
| Sam's Club savings | HTTP scrape | 7 days |
| Target.com deals | HTTP scrape | 7 days |
| Aldi weekly ad | HTTP scrape | 7 days |
| Home Depot / Menards / Lowe's | Via Flipp + direct | 7 days |
| H Mart / Tony's / Seafood City | PDF scrape via Firecrawl | 7 days |
| Dollar General / Dollar Tree | HTTP scrape | 7 days |
| Hip2Save, Krazy Coupon Lady | RSS | Daily |
| Slickdeals, DealNews, Brad's Deals | RSS | Daily |
| Jiffy Lube / Midas / Firestone coupons | RetailMeNot + direct | 7 days |
| Sam's / Costco gas | Scrape or GasBuddy | Daily |
| RxSaver, NeedyMeds | Scrape | Daily |
| GCFD wishlist | Scrape | Weekly |

### Rebate Apps (Link-Out Strategy)
| Platform | Strategy |
|---|---|
| Ibotta | Scraped rebate catalog (weekly) + deep links |
| Fetch Rewards | Post-purchase receipt scan reminder |
| Checkout 51 | Weekly offers + app link |
| Honey / PayPal Rewards | Browser extension for online; curated offers catalog for app |

---

## 7. Tech Stack

**Frontend:** Vite + React + TypeScript
- ShadCN/UI (clean, editorial)
- Mobile-first, PWA with full offline support (shopping list, stack math, coupons cached)
- Barcode scanner via camera (in-store + pantry)
- Real-time sync for family sharing (Supabase Realtime)

**Backend:** Node.js + Express
- REST API
- Daily/weekly cron jobs (scraper orchestration)
- Stack calculation engine
- Web push notifications (customizable per category)

**Scraper Service:** Python microservice
- Firecrawl for complex/PDF pages
- Playwright for JS-rendered pages (Costco, Aldi)
- Normalizes all sources to DealSchema JSON
- Aggressive caching (7-30 day TTL per source)

**Database:** Supabase (Postgres)
- Tables: items, stores, deals, manufacturer_coupons, rebates, inserts, stacks, price_history, receipts, pantry_inventory, storage_guide, donations, gas_prices, rx_prices, seasonal_calendar, events, amazon_watchlist, credit_card_offers, family_members

**Security:**
- Rx data: encrypted at rest (AES-256), column-level encryption in Supabase
- Receipt data: encrypted, 90-day retention then purge
- Auth: Supabase Auth with 2FA
- Family member access: role-based (owner / editor / viewer)
- No Rx data sent to any external API — local comparison only

**Deployment:** Railway
- Service 1: Node.js API + Vite static frontend
- Service 2: Python scraper service

**Repo:** rekaldsi/provision

---

## 8. Build Phases

### Phase 1 — Stack Engine Core (4-5 days)
- [ ] GitHub repo: rekaldsi/provision
- [ ] Supabase schema + seed data
- [ ] My List CRUD + household profile
- [ ] Kroger API connector (Jewel + Mariano's deals + digital coupons)
- [ ] Walmart API connector (pricing)
- [ ] Coupons.com Brandcaster integration (manufacturer coupons)
- [ ] Basic stack calculator (sale + store digital + manufacturer coupon)
- [ ] Shopping plan view
- [ ] Railway deploy

**Deliverable:** Working stack math on Kroger + Walmart + manufacturer coupons. Live on Railway.

### Phase 2 — Full Grocery Coverage + Pharmacy (4-5 days)
- [ ] Flipp scraper (all major store circulars including Aldi, Target, Sam's, Costco)
- [ ] Aldi weekly ad scraper
- [ ] ValPak + SmartSource scraper (Firecrawl)
- [ ] P&G Everyday coupon scraper
- [ ] Target scraper + Circle deep links
- [ ] BOGO detection + stack math
- [ ] Clearance + coupon alert
- [ ] Community deal feed (Hip2Save, Krazy Coupon Lady, Slickdeals, DealNews)
- [ ] **GoodRx API + Cost Plus Drugs + RxSaver** pharmacy module (MVP)
- [ ] Medication list (encrypted) + pharmacy price comparison
- [ ] In-store barcode scanner (mobile)

**Deliverable:** All grocery stores. Community deal intelligence. Pharmacy savings live.

### Phase 3 — Intelligence Layer (3-4 days)
- [ ] Stack Alert System (all alert types + customizable notification settings)
- [ ] Ibotta rebate catalog + deep links
- [ ] Checkout 51 + Fetch integration
- [ ] Honey / PayPal Rewards online layer
- [ ] Price match intelligence (Walmart vs. competitor)
- [ ] "Never Pay Full Price" watch list
- [ ] Receipt upload + AWS Textract OCR
- [ ] Missed savings analysis
- [ ] Price history tracking
- [ ] Store brand vs. national brand comparison
- [ ] Credit card / digital wallet offer layer (manual entry)

**Deliverable:** Full stack intelligence. Alerts fire in real time. Receipt scan builds price history.

### Phase 4 — Pantry + Storage + Donate (3-4 days)
- [ ] **Pantry Inventory Manager** (stock levels, expiry dates, FIFO, reorder alerts)
- [ ] Barcode scan to add/remove pantry items
- [ ] "Pantry First" logic in shopping plan
- [ ] Long-Term Storage Mode (bulk trigger + storage guide + stock-up score)
- [ ] Freezer flag for meat deals
- [ ] Off-grid/prepper category + hardware price tracking
- [ ] Donate Mode + GCFD wishlist + pantry directory
- [ ] Donation tracker (lbs, retail value, families helped)

**Deliverable:** Full pantry visibility. Stocking and donation missions fully operational.

### Phase 5 — Full Life Coverage (3-4 days)
- [ ] Gas Intelligence module (Sam's, Costco, GasBuddy, Fuel Rewards)
- [ ] Home Depot / Menards / Lowe's + seasonal calendar + Menards rebate
- [ ] Auto care deals (service coupons + parts tracking + seasonal)
- [ ] Dollar General / Dollar Tree household tracking
- [ ] Farmers market module (seasonal produce calendar)
- [ ] Location-aware deal alerts (optional GPS)
- [ ] Family sharing (multi-user, real-time sync, role-based)

**Deliverable:** Gas, home improvement, auto care, dollar stores, farmers markets, family access all live.

### Phase 6 — Amazon + Online + Events (3-4 days)
- [ ] Amazon price tracker (CamelCamelCamel/Keepa)
- [ ] Lightning Deal + Gold Box monitor
- [ ] Subscribe & Save optimizer
- [ ] Amazon Warehouse Deals alerts
- [ ] Hobbyist/electronics deal category (Pi, LoRa, SDR, etc.)
- [ ] Event/birthday calendar → proactive gift deal alerts
- [ ] Back to school module (July–September activation)
- [ ] Slickdeals + DealNews + Brad's Deals tech RSS
- [ ] Spending analytics dashboard (monthly breakdown by category)
- [ ] Missed savings trend report

### Phase 7 — Polish (2 days)
- [ ] Full mobile-first responsive design audit
- [ ] PWA offline mode verification (all critical features work without network)
- [ ] Web push notification refinement
- [ ] Printable coupon PDF
- [ ] H Mart / Tony's / Seafood City / Polish deli PDF ad parsers
- [ ] Fuel rewards tracker dashboard card
- [ ] 2FA security hardening

---

## 9. Savings Potential

| Category | Monthly Estimate |
|---|---|
| Grocery stack (full layers) | $150-400 |
| Pharmacy (vs. default pharmacy) | $50-300 |
| Gas (Sam's/Costco + fuel rewards) | $20-60 |
| Auto care (service coupons + DIY parts) | $20-80 |
| Home improvement (seasonal + Menards rebate) | $15-50 |
| Amazon / online (price history + Honey) | $20-100 |
| CC rewards optimization | $20-80 |
| **Total estimated monthly** | **$295-1,070** |
| **Annual** | **$3,540-12,840** |

Plus: donation impact. Near-zero bulk buys = hundreds of lbs of food to Chicagoland pantries per year at effectively no cost.

---

## 10. Quality Standards

**Prioritized by PROVISION:**
✅ Whole grains, legumes, rice, oats, pasta, canned goods
✅ Fresh and frozen vegetables + protein
✅ Dairy, bread, eggs
✅ Household staples: soap, paper goods, cleaning supplies
✅ Personal care: feminine hygiene, toothpaste, shampoo
✅ Medications and health supplies
✅ Long-term storage + prepper hardware
✅ Practical electronics (hobbyist gear with real utility)

**De-prioritized (only shown if explicitly on My List):**
❌ Highly processed snacks, soda, candy
❌ Frozen meals >800mg sodium
❌ Random impulse items outside Jerry's known categories

---

*PRD v5.0 FINAL — 2026-03-15 | Full scope locked | Ready to GSD*
