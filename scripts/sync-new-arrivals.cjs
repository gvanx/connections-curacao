#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { addedAtTime, isNewArrival } = require('../js/new-arrivals.js');

function productKey(product) {
  return JSON.stringify([product.category, product.name, product.suffix || '']);
}

function syncNewArrivals(products, history, now = Date.now()) {
  if (!Array.isArray(products) || history.version !== 1 || !history.firstSeen) {
    throw new Error('Expected a product array and version 1 catalogue history.');
  }
  const firstSeen = { ...history.firstSeen };
  const seen = new Set();
  const updated = products.map(product => {
    const item = { ...product };
    const key = productKey(item);
    if (seen.has(key)) throw new Error('Duplicate product: ' + key);
    seen.add(key);
    if (item.addedAt !== undefined && !Number.isFinite(addedAtTime(item))) {
      throw new Error('Invalid addedAt timestamp: ' + key);
    }
    if (!Object.hasOwn(firstSeen, key)) {
      firstSeen[key] = item.addedAt || new Date(now).toISOString();
    }
    const addedAt = firstSeen[key];
    if (addedAt !== null && !Number.isFinite(addedAtTime({ addedAt }))) {
      throw new Error('Invalid catalogue history timestamp: ' + key);
    }
    if (addedAt === null) delete item.addedAt;
    else item.addedAt = addedAt;
    if (isNewArrival(item, now)) item.newArrival = true;
    else delete item.newArrival;
    return item;
  });
  return { products: updated, history: { version: 1, firstSeen } };
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const productsPath = path.join(root, 'data/products.json');
  const historyPath = path.join(root, 'data/catalog-history.json');
  const result = syncNewArrivals(
    JSON.parse(fs.readFileSync(productsPath, 'utf8')),
    JSON.parse(fs.readFileSync(historyPath, 'utf8'))
  );
  let changed = 0;
  for (const [file, value] of [[productsPath, result.products], [historyPath, result.history]]) {
    const text = JSON.stringify(value, null, 2) + '\n';
    if (fs.readFileSync(file, 'utf8') !== text) {
      fs.writeFileSync(file, text);
      changed++;
    }
  }
  console.log(`New Arrivals: ${result.products.filter(p => isNewArrival(p)).length} active; ${changed} files updated.`);
}

module.exports = { productKey, syncNewArrivals };
