/**
 * Kroger API Connector
 * Covers: Jewel-Osco, Mariano's (Kroger ecosystem)
 * Docs: developer.kroger.com
 * Auth: OAuth2 client_credentials
 */

const axios = require('axios');

const KROGER_AUTH_URL = 'https://api.kroger.com/v1/connect/oauth2/token';
const KROGER_API_BASE = 'https://api.kroger.com/v1';

let tokenCache = {
  access_token: null,
  expires_at: null,
};

/**
 * Get or refresh OAuth2 access token (client_credentials)
 * Tokens expire in 30 minutes — cached in memory
 */
async function getAccessToken() {
  const now = Date.now();
  if (tokenCache.access_token && tokenCache.expires_at && now < tokenCache.expires_at) {
    return tokenCache.access_token;
  }

  const clientId = process.env.KROGER_CLIENT_ID;
  const clientSecret = process.env.KROGER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('KROGER_CLIENT_ID and KROGER_CLIENT_SECRET must be set in environment');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await axios.post(
    KROGER_AUTH_URL,
    'grant_type=client_credentials&scope=product.compact',
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const { access_token, expires_in } = response.data;
  tokenCache = {
    access_token,
    expires_at: now + (expires_in - 60) * 1000, // 60s buffer before expiry
  };

  return access_token;
}

/**
 * Search products at a specific Kroger location
 * @param {string} query - Product search term
 * @param {string} locationId - Kroger location ID
 * @returns {Array} Products with pricing
 */
async function searchProducts(query, locationId) {
  const token = await getAccessToken();

  const params = {
    'filter.term': query,
    'filter.locationId': locationId,
    'filter.limit': 20,
  };

  const response = await axios.get(`${KROGER_API_BASE}/products`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });

  const products = response.data.data || [];

  return products.map((p) => ({
    id: p.productId,
    name: p.description,
    brand: p.brand || '',
    upc: p.upc || '',
    size: p.items?.[0]?.size || '',
    price: p.items?.[0]?.price?.regular || null,
    salePrice: p.items?.[0]?.price?.promo || null,
    onSale: p.items?.[0]?.price?.promo != null,
    imageUrl: p.images?.[0]?.sizes?.find((s) => s.size === 'medium')?.url || null,
    categories: p.categories || [],
  }));
}

/**
 * Get current deals/promotions at a Kroger location
 * Searches across common deal categories
 * @param {string} locationId - Kroger location ID
 * @returns {Array} Deals with sale pricing
 */
async function getDeals(locationId) {
  const token = await getAccessToken();

  // Search for promoted items across key categories
  const dealSearchTerms = [
    'laundry detergent',
    'shampoo conditioner',
    'paper towels',
    'toilet paper',
    'cereal',
    'pasta',
    'canned goods',
    'frozen vegetables',
    'chicken',
    'ground beef',
  ];

  const allDeals = [];

  for (const term of dealSearchTerms) {
    try {
      const response = await axios.get(`${KROGER_API_BASE}/products`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          'filter.term': term,
          'filter.locationId': locationId,
          'filter.limit': 10,
          'filter.fulfillment': 'ais',
        },
      });

      const products = response.data.data || [];
      const deals = products
        .filter((p) => p.items?.[0]?.price?.promo != null)
        .map((p) => ({
          id: p.productId,
          item_name: p.description,
          item_brand: p.brand || '',
          sale_price: p.items[0].price.promo,
          original_price: p.items[0].price.regular,
          unit: p.items[0].size || '',
          discount_pct: p.items[0].price.regular
            ? Math.round(((p.items[0].price.regular - p.items[0].price.promo) / p.items[0].price.regular) * 100)
            : 0,
          source: 'kroger_api',
          source_url: `https://www.kroger.com/p/${p.productId}`,
          category: p.categories?.[0] || 'general',
        }));

      allDeals.push(...deals);
    } catch (err) {
      console.error(`Kroger getDeals error for term "${term}":`, err.message);
    }
  }

  return allDeals;
}

/**
 * Find nearest Jewel-Osco or Mariano's by zip code
 * @param {string} zipCode
 * @returns {Object|null} Nearest store with locationId
 */
async function findNearestStore(zipCode) {
  const token = await getAccessToken();

  const response = await axios.get(`${KROGER_API_BASE}/locations`, {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      'filter.zipCode.near': zipCode,
      'filter.radiusInMiles': 15,
      'filter.limit': 10,
      'filter.chain': 'JEWEL-OSCO',
    },
  });

  const locations = response.data.data || [];
  if (locations.length === 0) {
    // Try Mariano's if no Jewel-Osco found
    const marianos = await axios.get(`${KROGER_API_BASE}/locations`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        'filter.zipCode.near': zipCode,
        'filter.radiusInMiles': 15,
        'filter.limit': 5,
        'filter.chain': 'MARIANOS',
      },
    });
    const marianosLocations = marianos.data.data || [];
    if (marianosLocations.length === 0) return null;
    const m = marianosLocations[0];
    return {
      locationId: m.locationId,
      name: m.name,
      chain: 'Mariano\'s',
      address: m.address?.addressLine1,
      city: m.address?.city,
      state: m.address?.state,
      zip: m.address?.zipCode,
    };
  }

  const store = locations[0];
  return {
    locationId: store.locationId,
    name: store.name,
    chain: 'Jewel-Osco',
    address: store.address?.addressLine1,
    city: store.address?.city,
    state: store.address?.state,
    zip: store.address?.zipCode,
  };
}

module.exports = { getAccessToken, searchProducts, getDeals, findNearestStore };
