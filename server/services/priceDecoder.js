const signals = require('../data/price-signals.json');

function normalizeStore(store) {
  return String(store || '').trim().toLowerCase();
}

function getEnding(price) {
  const numeric = Number(price);
  if (!Number.isFinite(numeric)) return '';
  return numeric.toFixed(2).slice(-3);
}

function decode(store, price) {
  const normalizedStore = normalizeStore(store);
  const ending = getEnding(price);
  const foundSignal = signals.find((item) => (
    normalizeStore(item.store) === normalizedStore && item.ending === ending
  ));

  if (!foundSignal) {
    return {
      store,
      price,
      ending,
      signal: null,
      action: null,
      confidence: null,
      found: false,
    };
  }

  return {
    store,
    price,
    ending,
    signal: foundSignal.signal,
    action: foundSignal.action,
    confidence: foundSignal.confidence,
    found: true,
  };
}

function getAllSignals() {
  return signals;
}

function getSignalsByStore(store) {
  const normalizedStore = normalizeStore(store);
  return signals.filter((item) => normalizeStore(item.store) === normalizedStore);
}

module.exports = {
  decode,
  getAllSignals,
  getSignalsByStore,
};
