const express = require('express');
const { decode, getAllSignals, getSignalsByStore } = require('../services/priceDecoder');
const { lookupBarcode } = require('../services/productLookup');

const router = express.Router();

router.post('/api/decode-price', (req, res) => {
  const { store, price } = req.body || {};
  const result = decode(store, price);
  res.json(result);
});

router.get('/api/price-signals', (req, res) => {
  res.json(getAllSignals());
});

router.get('/api/price-signals/:store', (req, res) => {
  const store = decodeURIComponent(req.params.store || '');
  res.json(getSignalsByStore(store));
});

router.get('/api/product-lookup/:upc', async (req, res) => {
  try {
    const upc = decodeURIComponent(req.params.upc || '');
    const product = await lookupBarcode(upc);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.json(product);
  } catch (err) {
    console.error('GET /api/product-lookup/:upc error:', err);
    return res.status(500).json({ error: 'Failed to look up product' });
  }
});

module.exports = router;
