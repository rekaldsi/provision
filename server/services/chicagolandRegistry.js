'use strict';

const CHICAGOLAND_STORES = {
  walmart: { zips: ['60601', '60614', '60640', '60803', '60126'], name: 'Walmart' },
  target: { storeIds: ['T-0274', 'T-0596', 'T-2707'], name: 'Target' },
  homedepot: { storeIds: ['1909', '1918', '1919'], name: 'Home Depot' },
  lowes: { storeIds: ['0595', '2409', '2432'], name: "Lowe's" },
  bestbuy: { storeIds: ['281', '427', '444'], name: 'Best Buy' },
  menards: { storeIds: ['3237', '3243', '3246'], name: 'Menards' },
  meijer: { zips: ['60525', '60559', '60143'], name: 'Meijer' },
};

module.exports = { CHICAGOLAND_STORES };
