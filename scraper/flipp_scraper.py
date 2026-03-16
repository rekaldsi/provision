#!/usr/bin/env python3
"""
PROVISION — Flipp Deal Scraper (v2)
Uses Flipp's search API to pull real deals for all target stores.
Upserts directly to Supabase via REST API.
"""

import requests
import json
import sys
import time
import os
from datetime import datetime

# ─── CONFIG ───────────────────────────────────────────────────────────────────
POSTAL_CODE = "60646"  # Portage Park / Jefferson Park, Chicago
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://zvyslqwmmjhawplhnhmb.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

TARGET_MERCHANTS = [
    "jewel-osco", "jewel", "mariano's", "marianos", "aldi",
    "tony's fresh market", "tony's finer foods", "tony",
    "h mart", "hmart", "seafood city",
    "target", "walmart", "sam's club", "costco",
    "dollar general", "family dollar", "dollar tree",
    "home depot", "menards", "lowe's"
]

# Search terms covering all categories in PROVISION
SEARCH_QUERIES = [
    # Food
    "chicken", "beef", "pork", "fish", "salmon", "shrimp",
    "milk", "cheese", "yogurt", "eggs", "butter",
    "bread", "pasta", "rice", "beans", "cereal", "oats",
    "fruit", "apple", "orange", "banana", "produce", "vegetables",
    "frozen", "canned", "tomato", "soup",
    # Household
    "paper towels", "toilet paper", "laundry detergent", "tide", "dish soap",
    "trash bags", "cleaning", "lysol", "windex",
    # Personal care
    "shampoo", "conditioner", "soap", "toothpaste", "deodorant",
    "razor", "pads", "tampons", "lotion", "sunscreen",
    # Home improvement
    "mulch", "fertilizer", "grass seed", "paint",
    # OTC
    "vitamins", "ibuprofen", "allergy", "cold flu",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "en-US,en;q=0.9",
}

# ─── HELPERS ──────────────────────────────────────────────────────────────────

def is_target(merchant_name):
    name = (merchant_name or "").lower()
    return any(t in name for t in TARGET_MERCHANTS)

def flipp_search(query, postal_code=POSTAL_CODE):
    url = f"https://backflipp.wishabi.com/flipp/items/search?locale=en-US&postal_code={postal_code}&q={requests.utils.quote(query)}"
    try:
        time.sleep(0.4)  # rate limit
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
        d = r.json()
        return d.get("items", [])
    except Exception as e:
        print(f"  [WARN] search '{query}': {e}", file=sys.stderr)
        return []

def get_store_id_map():
    """Fetch store IDs from Supabase to map merchant names → UUIDs."""
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/stores?select=id,name,chain&active=eq.true",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        },
        timeout=10
    )
    r.raise_for_status()
    stores = r.json()
    mapping = {}
    for s in stores:
        mapping[s["name"].lower()] = s["id"]
        mapping[s["chain"].lower()] = s["id"]
    return mapping

def match_store_id(merchant_name, store_map):
    name = (merchant_name or "").lower()
    # Exact
    if name in store_map:
        return store_map[name]
    # Partial
    for key, sid in store_map.items():
        if key in name or name in key:
            return sid
    return None

def normalize(item, store_id):
    name = (item.get("name") or "").strip()
    if not name:
        return None
    price = item.get("current_price")
    if price is None:
        return None
    try:
        price = float(price)
    except (ValueError, TypeError):
        return None

    original = item.get("original_price")
    try:
        original = float(original) if original else None
    except (ValueError, TypeError):
        original = None

    discount_pct = None
    if original and original > price:
        discount_pct = round((1 - price / original) * 100, 1)

    valid_from = (item.get("valid_from") or "")[:10] or datetime.now().strftime("%Y-%m-%d")
    valid_until = (item.get("valid_to") or "")[:10]

    # Categorize
    l1 = (item.get("_L1") or "").lower()
    l2 = (item.get("_L2") or "").lower()
    if "food" in l1 or "food" in l2 or "beverage" in l1:
        category = "food"
    elif "personal" in l1 or "health" in l1 or "beauty" in l1:
        category = "personal_care"
    elif "home" in l1 or "garden" in l1:
        category = "home_improvement"
    elif "household" in l2 or "cleaning" in l2 or "paper" in l2:
        category = "household"
    else:
        category = "general"

    return {
        "item_name": name[:200],
        "item_brand": None,
        "store_id": store_id,
        "sale_price": price,
        "original_price": original,
        "unit": (item.get("post_price_text") or item.get("sale_story") or "")[:100] or None,
        "discount_pct": discount_pct,
        "source": "flipp",
        "source_url": None,
        "valid_from": valid_from,
        "valid_until": valid_until or None,
        "category": category,
    }

def upsert_deals(deals):
    """Upsert deals to Supabase in batches."""
    if not deals:
        return 0
    inserted = 0
    batch_size = 100
    for i in range(0, len(deals), batch_size):
        batch = deals[i:i+batch_size]
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/deals",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates",
            },
            json=batch,
            timeout=20
        )
        if r.status_code in (200, 201):
            inserted += len(batch)
        else:
            print(f"  [ERROR] upsert batch: {r.status_code} {r.text[:200]}", file=sys.stderr)
    return inserted

# ─── MAIN ─────────────────────────────────────────────────────────────────────

def run():
    print(f"[PROVISION] Flipp scraper starting — zip {POSTAL_CODE}")

    if not SUPABASE_KEY:
        print("[ERROR] SUPABASE_SERVICE_ROLE_KEY not set", file=sys.stderr)
        sys.exit(1)

    print("[PROVISION] Loading store IDs from Supabase...")
    store_map = get_store_id_map()
    print(f"  {len(store_map)} store mappings loaded")

    all_deals = []
    seen_ids = set()

    for query in SEARCH_QUERIES:
        items = flipp_search(query)
        added = 0
        for item in items:
            if not is_target(item.get("merchant_name")):
                continue
            item_id = item.get("flyer_item_id") or item.get("id")
            if item_id in seen_ids:
                continue
            seen_ids.add(item_id)

            store_id = match_store_id(item.get("merchant_name"), store_map)
            if not store_id:
                continue

            deal = normalize(item, store_id)
            if deal:
                all_deals.append(deal)
                added += 1

        print(f"  '{query}': +{added} new deals (total: {len(all_deals)})")

    print(f"\n[PROVISION] Scraped {len(all_deals)} unique deals. Upserting to Supabase...")
    inserted = upsert_deals(all_deals)
    print(f"[PROVISION] ✅ Done — {inserted} deals inserted/updated")

    # Save local backup
    with open("/tmp/provision-deals.json", "w") as f:
        json.dump(all_deals, f, indent=2)
    print(f"[PROVISION] Backup saved to /tmp/provision-deals.json")

if __name__ == "__main__":
    run()
