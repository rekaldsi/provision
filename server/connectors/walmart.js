/**
 * Walmart API Connector
 * Uses walmart.io Affiliate API
 * Docs: walmart.io
 * Auth: API Key header
 */

const axios = require('axios');

const WALMART_API_BASE = 'https://developer.api.walmart.com/api-proxy/service/affil/product/v2';

function getHeaders() {
  const apiKey = process.env.WALMART_API_KEY;
  if (!apiKey) {
    throw new Error('WALMART_API_KEY must be set in environment');
  }
  return {
    'WM_CONSUMER.ID': apiKey,
    'WM_SEC.KEY_VERSION': '1',
    'WM_CONSUMER.INTIMESTAMP': Date.now().toString(),
    Accept: 'application/json',
  };
}

/**
 * Search Walmart products by query
 * @param {string} query - Product search term
 * @returns {Array} Products with pricing
 */
async function searchProducts(query) {
  const response = await axios.get(`${WALMART_API_BASE}/search`, {
    headers: getHeaders(),
    params: {
      query,
      numItems: 20,
      responseGroup: 'base',
      sortBy: 'price',
      order: 'ascending',
    },
  });

  const items = response.data.items || [];

  return items.map((item) => ({
    id: item.itemId,
    name: item.name,
    brand: item.brandName || '',
    upc: item.upc || '',
    size: item.size || '',
    price: item.salePrice || item.msrp || null,
    msrp: item.msrp || null,
    onSale: item.salePrice != null && item.msrp != null && item.salePrice < item.msrp,
    thumbnailUrl: item.thumbnailImage || null,
    productUrl: item.productUrl || null,
    category: item.categoryPath || '',
    inStock: item.availableOnline || false,
  }));
}

/**
 * Get real-time price for a specific Walmart item
 * @param {string} itemId - Walmart item ID
 * @returns {Object} Product with current price
 */
async function getProductPrice(itemId) {
  const response = await axios.get(`${WALMART_API_BASE}/items`, {
    headers: getHeaders(),
    params: {
      ids: itemId,
    },
  });

  const items = response.data.items || [];
  if (items.length === 0) return null;

  const item = items[0];
  return {
    id: item.itemId,
    name: item.name,
    brand: item.brandName || '',
    price: item.salePrice || item.msrp || null,
    msrp: item.msrp || null,
    salePrice: item.salePrice || null,
    onSale: item.salePrice != null && item.msrp != null && item.salePrice < item.msrp,
    inStock: item.availableOnline || false,
  };
}

module.exports = { searchProducts, getProductPrice };
