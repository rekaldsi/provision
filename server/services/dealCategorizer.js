/**
 * PROVISION — Deal Categorization Engine (Phase 2)
 * - Quality filter: score 1-10 (whole food = 10, ultra-processed = 1)
 * - Processed score: identifies junk vs. whole food
 * - Store brand vs. national brand detection
 * - Category normalization
 */

// ── Quality scoring keywords ──────────────────────────────────────────────────
const QUALITY_MAP = {
  10: ['fresh produce', 'organic', 'whole grain', 'wild caught', 'grass fed', 'pasture raised'],
  9: ['chicken breast', 'ground beef', 'salmon', 'tilapia', 'cod', 'shrimp', 'eggs', 'whole milk', 'greek yogurt', 'cottage cheese', 'legumes', 'lentils', 'black beans', 'kidney beans', 'chickpeas', 'brown rice', 'oats', 'quinoa', 'nuts', 'almonds', 'walnuts', 'nut butter', 'peanut butter', 'olive oil', 'avocado oil', 'vegetables', 'broccoli', 'spinach', 'kale', 'cauliflower', 'carrots', 'apples', 'bananas', 'berries', 'tomatoes', 'potatoes'],
  7: ['whole wheat bread', 'pasta', 'white rice', 'flour', 'canned beans', 'canned tomatoes', 'canned fish', 'tuna', 'sardines', 'cream cheese', 'cheddar', 'mozzarella', 'butter', 'frozen vegetables', 'frozen fruit', 'orange juice', 'apple juice', 'granola', 'honey', 'maple syrup', 'vinegar', 'soy sauce'],
  5: ['bread', 'cereal', 'crackers', 'pretzels', 'popcorn', 'tortillas', 'wraps', 'bagels', 'english muffin', 'soup', 'broth', 'salad dressing', 'ketchup', 'mustard', 'mayo', 'hummus', 'salsa', 'guacamole', 'protein bar', 'granola bar'],
  3: ['white bread', 'instant noodles', 'ramen', 'mac and cheese', 'instant', 'frozen meal', 'frozen dinner', 'hot pocket', 'pizza rolls', 'corn syrup', 'white flour', 'fruit snacks', 'juice drink', 'sports drink', 'gatorade', 'powerade'],
  2: ['soda', 'pop', 'cola', 'pepsi', 'coke', 'mountain dew', 'sprite', 'dr pepper', 'kool-aid', 'lemonade mix', 'energy drink', 'monster', 'red bull', 'rockstar', 'bang', 'candy', 'chocolate bar', 'skittles', 'starburst', 'gummy', 'chips', 'doritos', 'cheetos', 'funyuns', 'pork rinds', 'cookies', 'oreos', 'chips ahoy', 'cake', 'cupcakes', 'donuts', 'pastries', 'pop tarts', 'toaster strudel', 'cereal with marshmallow', 'lucky charms', 'fruit loops', 'cocoa puffs', 'frosted flakes', 'froot loops'],
};

// ── Store brand / private label keywords ─────────────────────────────────────
const STORE_BRANDS = {
  'Jewel-Osco': ['jewel', 'signature select', 'lucerne', 'o organics', 'open nature', 'value corner', 'debi lilly'],
  "Mariano's": ['marianos', 'signature select', 'lucerne', 'o organics', 'open nature'],
  'Aldi': ['aldis', 'specially selected', 'simply nature', 'friendly farms', 'baker\'s corner', 'nature\'s nectar', 'fit & active', 'millville', 'kirkwood', 'park street deli'],
  'Target': ['good & gather', 'market pantry', 'up & up', 'favorite day', 'simply balanced'],
  'Walmart': ['great value', 'sam\'s choice', 'equate', 'mainstays', 'parent\'s choice'],
  "Sam's Club": ['member\'s mark', 'sam\'s choice'],
  'Costco': ['kirkland', 'kirkland signature'],
  'Dollar General': ['clover valley', 'smart & simple', 'rexall'],
};

// ── National brands commonly compared ────────────────────────────────────────
const NATIONAL_BRANDS = [
  'tide', 'gain', 'downy', 'bounce', 'all', 'arm & hammer',
  'bounty', 'charmin', 'scott', 'cottonelle', 'angel soft', 'puffs', 'kleenex',
  'dawn', 'palmolive', 'cascade', 'finish',
  'lysol', 'clorox', 'mr. clean', 'windex', 'febreze',
  'glad', 'hefty', 'ziploc', 'reynolds',
  'pantene', 'head & shoulders', 'herbal essences', 'dove', 'olay', 'nivea',
  'colgate', 'crest', 'oral-b', 'listerine',
  'gillette', 'venus', 'schick',
  'tide pods', 'gain pods',
  'cheerios', 'wheaties', 'honey bunches', 'special k', 'kellogg',
  'campbell', 'progresso', "amy's",
  'kraft', 'philadelphia', 'sargento', 'kraft singles',
  'hormel', 'jennie-o', 'oscar mayer', 'ball park', 'hebrew national',
  'nature valley', 'clif', 'kind', 'larabar', 'rxbar',
  'skippy', 'jif', "peter pan",
  'bertolli', 'barilla', 'prego', 'ragu', 'hunt\'s', 'classico',
  'heinz', 'del monte', 'dole', "birds eye",
  'stacy\'s', 'ritz', 'triscuit', 'wheat thins', 'nabisco',
  'coca-cola', 'pepsi', 'dr pepper', 'sprite', 'mountain dew',
  'tropicana', 'minute maid', 'simply orange',
  'activia', 'chobani', 'fage', 'yoplait', 'dannon', 'stonyfield',
  'land o lakes', 'kerrygold', 'challenge',
  'tylenol', 'advil', 'aleve', 'benadryl', 'claritin', 'zyrtec', 'flonase',
  'centrum', 'one a day', 'nature made', 'vitafusion',
];

// ── Category taxonomy ─────────────────────────────────────────────────────────
const CATEGORY_RULES = [
  { keywords: ['chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'tilapia', 'cod', 'tuna', 'sardine', 'turkey', 'lamb', 'meat', 'seafood', 'crab', 'lobster'], category: 'food.protein' },
  { keywords: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'eggs', 'dairy'], category: 'food.dairy' },
  { keywords: ['apple', 'banana', 'orange', 'grape', 'strawberry', 'blueberry', 'raspberry', 'peach', 'pear', 'mango', 'pineapple', 'watermelon', 'produce', 'fruit'], category: 'food.produce' },
  { keywords: ['broccoli', 'spinach', 'kale', 'lettuce', 'carrot', 'celery', 'pepper', 'tomato', 'cucumber', 'zucchini', 'squash', 'onion', 'garlic', 'potato', 'sweet potato', 'vegetable', 'veggie', 'salad'], category: 'food.produce' },
  { keywords: ['bread', 'pasta', 'rice', 'flour', 'oats', 'cereal', 'granola', 'tortilla', 'bagel', 'crackers', 'grains'], category: 'food.grains' },
  { keywords: ['beans', 'lentils', 'chickpeas', 'legume', 'tofu', 'tempeh'], category: 'food.legumes' },
  { keywords: ['frozen', 'ice cream', 'popsicle'], category: 'food.frozen' },
  { keywords: ['soup', 'broth', 'stock', 'canned'], category: 'food.canned' },
  { keywords: ['olive oil', 'vegetable oil', 'canola', 'coconut oil', 'avocado oil', 'oil', 'vinegar', 'condiment', 'ketchup', 'mustard', 'mayo', 'sauce', 'dressing', 'salsa', 'hot sauce', 'soy sauce', 'spice', 'seasoning'], category: 'food.condiments' },
  { keywords: ['soda', 'juice', 'water', 'drink', 'beverage', 'coffee', 'tea', 'energy drink', 'sports drink'], category: 'food.beverages' },
  { keywords: ['chips', 'cookies', 'candy', 'chocolate', 'snack', 'crackers', 'popcorn', 'gummy', 'bar'], category: 'food.snacks' },
  { keywords: ['paper towel', 'toilet paper', 'tissue', 'napkin', 'paper plate', 'paper cup', 'aluminum foil', 'plastic wrap', 'trash bag', 'zip lock', 'storage bag', 'plastic bag'], category: 'household.paper_plastic' },
  { keywords: ['laundry', 'detergent', 'fabric softener', 'dryer sheet', 'bleach', 'stain remover', 'tide', 'gain', 'downy', 'bounce'], category: 'household.laundry' },
  { keywords: ['dish soap', 'dishwasher', 'cleaning', 'cleaner', 'spray', 'wipes', 'mop', 'sponge', 'scrub', 'lysol', 'windex', 'clorox'], category: 'household.cleaning' },
  { keywords: ['batteries', 'bulb', 'candle', 'air freshener', 'storage bin', 'organizer', 'hangers'], category: 'household.general' },
  { keywords: ['shampoo', 'conditioner', 'body wash', 'bar soap', 'hand soap', 'lotion', 'moisturizer', 'face wash', 'toner', 'serum', 'sunscreen', 'spf'], category: 'personal_care.skin_hair' },
  { keywords: ['toothpaste', 'toothbrush', 'floss', 'mouthwash', 'whitening'], category: 'personal_care.oral' },
  { keywords: ['deodorant', 'antiperspirant'], category: 'personal_care.deodorant' },
  { keywords: ['razor', 'shave', 'shaving'], category: 'personal_care.shaving' },
  { keywords: ['pads', 'tampons', 'feminine', 'always', 'tampax', 'kotex', 'playtex', 'carefree'], category: 'personal_care.feminine' },
  { keywords: ['vitamin', 'supplement', 'probiotic', 'omega', 'fish oil', 'zinc', 'magnesium', 'calcium', 'iron'], category: 'pharmacy.otc_vitamins' },
  { keywords: ['ibuprofen', 'tylenol', 'aspirin', 'advil', 'aleve', 'pain reliever', 'cold', 'flu', 'cough', 'allergy', 'antihistamine', 'antacid', 'pepto', 'tums', 'miralax', 'melatonin', 'first aid', 'bandage', 'thermometer'], category: 'pharmacy.otc_medicine' },
  { keywords: ['mulch', 'fertilizer', 'grass seed', 'garden', 'plant', 'soil', 'weed', 'pesticide', 'insecticide', 'lawn'], category: 'home_improvement.garden' },
  { keywords: ['paint', 'brush', 'roller', 'caulk', 'sealant', 'putty', 'patch', 'drywall'], category: 'home_improvement.paint' },
  { keywords: ['drill', 'saw', 'hammer', 'screwdriver', 'wrench', 'pliers', 'tool', 'fastener', 'screw', 'nail', 'bolt', 'hardware'], category: 'home_improvement.tools' },
  { keywords: ['motor oil', 'oil filter', 'air filter', 'wiper blade', 'car wash', 'antifreeze', 'windshield washer', 'brake', 'tire'], category: 'auto' },
  { keywords: ['gas', 'gasoline', 'fuel'], category: 'gas' },
];

function categorizeDeal(itemName, existingCategory = '') {
  const name = itemName.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(k => name.includes(k))) {
      return rule.category;
    }
  }
  // Fall back to existing category if present
  return existingCategory || 'general';
}

function qualityScore(itemName) {
  const name = itemName.toLowerCase();
  for (const [score, keywords] of Object.entries(QUALITY_MAP).sort((a, b) => parseInt(b[0]) - parseInt(a[0]))) {
    if (keywords.some(k => name.includes(k))) return parseInt(score);
  }
  return 5; // default neutral
}

function processedScore(itemName) {
  const name = itemName.toLowerCase();
  // Ultra-processed markers
  const ultraProcessed = QUALITY_MAP[2].some(k => name.includes(k));
  if (ultraProcessed) return 1;
  const processed = QUALITY_MAP[3].some(k => name.includes(k));
  if (processed) return 3;
  const minimal = QUALITY_MAP[9].some(k => name.includes(k)) || QUALITY_MAP[10].some(k => name.includes(k));
  if (minimal) return 9;
  return 5;
}

function detectStoreBrand(itemName, storeName = '') {
  const name = itemName.toLowerCase();
  const brands = STORE_BRANDS[storeName] || [];
  return brands.some(b => name.includes(b.toLowerCase()));
}

function detectNationalBrand(itemName) {
  const name = itemName.toLowerCase();
  return NATIONAL_BRANDS.some(b => name.includes(b.toLowerCase()));
}

function isJunkFood(itemName) {
  const name = itemName.toLowerCase();
  const junkKeywords = [...(QUALITY_MAP[2] || []), ...(QUALITY_MAP[3] || [])];
  return junkKeywords.some(k => name.includes(k));
}

/**
 * Full deal enrichment — adds quality, category, brand signals
 */
function enrichDeal(deal, storeName = '') {
  const name = deal.item_name || '';
  return {
    ...deal,
    category: categorizeDeal(name, deal.category),
    quality_score: qualityScore(name),
    processed_score: processedScore(name),
    is_store_brand: detectStoreBrand(name, storeName),
    is_national_brand: detectNationalBrand(name),
    is_junk_food: isJunkFood(name),
  };
}

module.exports = {
  categorizeDeal,
  qualityScore,
  processedScore,
  detectStoreBrand,
  detectNationalBrand,
  isJunkFood,
  enrichDeal,
  WALMART_GENERICS: null, // imported from pharmacy.js
};
