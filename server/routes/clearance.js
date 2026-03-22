const express = require('express');
const { decode, getAllSignals, getSignalsByStore } = require('../services/priceDecoder');

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

module.exports = router;
