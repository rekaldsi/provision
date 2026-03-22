const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode && res.statusCode >= 400) {
          return resolve(null);
        }

        try {
          resolve(JSON.parse(raw));
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy(new Error('Request timeout'));
    });
  });
}

function normalizeOpenFoodFacts(body) {
  if (!body || body.status !== 1 || !body.product) return null;

  const product = body.product;
  return {
    name: product.product_name || null,
    brand: product.brands || null,
    size: product.quantity || null,
    category: Array.isArray(product.categories_tags) ? product.categories_tags[0] || null : null,
    image_url: product.image_front_url || null,
    source: 'openfoodfacts',
  };
}

function normalizeUpcItemDb(body) {
  const item = body && Array.isArray(body.items) ? body.items[0] : null;
  if (!item) return null;

  return {
    name: item.title || null,
    brand: item.brand || null,
    size: item.size || null,
    category: item.category || null,
    image_url: Array.isArray(item.images) ? item.images[0] || null : null,
    source: 'upcitemdb',
  };
}

async function lookupBarcode(upc) {
  const safeUpc = String(upc || '').trim();
  if (!safeUpc) return null;

  try {
    const offData = await fetchJson(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(safeUpc)}.json`);
    const normalizedOff = normalizeOpenFoodFacts(offData);
    if (normalizedOff && normalizedOff.name) return normalizedOff;
  } catch (err) {
    // Continue to fallback API.
  }

  try {
    const upcData = await fetchJson(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(safeUpc)}`);
    const normalizedUpc = normalizeUpcItemDb(upcData);
    if (normalizedUpc && normalizedUpc.name) return normalizedUpc;
  } catch (err) {
    // Return null below.
  }

  return null;
}

module.exports = { lookupBarcode };
