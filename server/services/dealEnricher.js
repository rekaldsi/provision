/**
 * Deal Enricher — extracts brand + size from item_name
 * Conservative patterns: only tag when confident
 */

const BRAND_PATTERNS = [
  // Personal Care
  'Pantene', 'Head & Shoulders', 'Herbal Essences', 'Garnier', 'Dove', 'Axe', 'Degree',
  'Old Spice', 'Gillette', 'Venus', 'Schick', 'Colgate', 'Crest', 'Oral-B', 'Listerine',
  'Aveeno', 'Neutrogena', 'Olay', 'Nivea', 'Suave', 'TRESemmé', 'Tresemme',
  // Household Cleaning
  'Tide', 'Gain', 'Downy', 'Bounce', 'Arm & Hammer', 'OxiClean', 'Persil',
  'Dawn', 'Palmolive', 'Cascade', 'Finish', 'Mr. Clean', 'Swiffer', 'Febreze',
  'Lysol', 'Clorox', 'Fabuloso', 'Pine-Sol', 'Windex', 'Scrubbing Bubbles',
  'Bounty', 'Charmin', 'Cottonelle', 'Scott', 'Puffs', 'Kleenex', 'Viva',
  'Ziploc', 'Hefty', 'Glad',
  // Food - Breakfast / Cereal
  'Cheerios', "General Mills", "Kellogg's", 'Post', 'Quaker',
  // Food - Soup / Canned
  "Campbell's", 'Progresso', 'Heinz', 'Del Monte', 'Bush', "Hunt's",
  // Food - Condiments / Staples
  'Kraft', "Hellmann's", 'Hellmanns', 'Hellman', 'Best Foods',
  "Vlasic", 'Smucker', "Jif", 'Peter Pan',
  // Food - Snacks
  "Lay's", 'Lays', 'Doritos', 'Cheetos', 'Fritos', 'Pringles', "Ruffles",
  "Oreo", 'Nabisco', 'Chips Ahoy', "Keebler",
  // Beverages
  "Coca-Cola", 'Coke', 'Pepsi', "Dr Pepper", "Mountain Dew", "Sprite",
  "Tropicana", "Minute Maid", "Simply", "V8",
  "Folgers", "Maxwell House", "Dunkin'", "Starbucks", "Nescafe",
  // Frozen / Dairy
  "Birds Eye", "Green Giant", "Totino's", "DiGiorno", "Red Baron",
  "Yoplait", "Chobani", "Dannon", "Activia",
  "Land O'Lakes", "Challenge", "Horizon",
  // Baby
  "Huggies", "Pampers", "Luvs", "Seventh Generation",
]

// Build a regex from brands list (longest first to avoid partial matches)
const BRAND_REGEX = new RegExp(
  '\\b(' +
  BRAND_PATTERNS
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(b => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|') +
  ')\\b',
  'i'
)

const SIZE_REGEX = /\b(\d+(?:\.\d+)?)\s*(oz|fl\.?\s*oz|lb[s]?|g|kg|ml|ct|count|pk|pack|roll[s]?|sheet[s]?|load[s]?|piece[s]?|pod[s]?|tab[s]?|capsule[s]?|cap[s]?)\b/i

/**
 * Extract brand from item_name string
 * Returns brand string or null if not found
 */
function extractBrand(itemName) {
  if (!itemName) return null
  const match = itemName.match(BRAND_REGEX)
  return match ? match[1] : null
}

/**
 * Extract size from item_name string
 * Returns size string like "12 oz" or null
 */
function extractSize(itemName) {
  if (!itemName) return null
  const match = itemName.match(SIZE_REGEX)
  if (!match) return null
  return `${match[1]} ${match[2].toLowerCase()}`
}

/**
 * Enrich a single deal object in-place
 * Only sets fields if they are currently null/undefined
 */
function enrichDealRecord(deal) {
  const enriched = { ...deal }
  if (!enriched.item_brand) {
    const brand = extractBrand(enriched.item_name)
    if (brand) enriched.item_brand = brand
  }
  if (!enriched.item_size) {
    const size = extractSize(enriched.item_name)
    if (size) enriched.item_size = size
  }
  return enriched
}

module.exports = { extractBrand, extractSize, enrichDealRecord, BRAND_REGEX, SIZE_REGEX }
