const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { quote, selectProducts, imageSrc, whatsappUrl } = require('../suave/offers.js');
const catalog = require('../data/products.json');

test('the advertised phone includes the store fee once in the 12-month estimate', () => {
  const plan = quote(3750);
  assert.equal(plan.fee, 112.5);
  assert.equal(plan.financed, 3862.5);
  assert.equal(plan.payment.toFixed(2), '471.55');
});
test('cash contribution reduces the financed amount before the fee, with no negative balance', () => {
  assert.equal(quote(1000, 100).financed, 927);
  assert.equal(quote(1000, 1200).payment, 0);
  assert.equal(quote(1000, -100).financed, 1030);
  assert.equal(quote(99.99).financed, 102.99);
  assert.equal(quote(100, 0, 4).payment, 32.96);
  assert.equal(quote(100, 0, 30).payment.toFixed(2), '110.21');
  assert.throws(() => quote(NaN));
  assert.throws(() => quote(100, 0, 5));
});
test('six current models use catalog prices and existing images, excluding HSO', () => {
  const products = selectProducts(catalog);
  assert.equal(products.length, 6);
  assert.equal(products.filter(p => p.category === 'apple').length, 3);
  assert.equal(products.filter(p => p.category === 'samsung').length, 3);
  assert.ok(products.every(p => !p.suffix));
  products.forEach(p => assert.ok(fs.existsSync(path.join(__dirname, '..', imageSrc(p))), p.name));
  const updated = catalog.map(p => p.name === 'iPhone 17' ? { ...p, price: 2100 } : p);
  assert.equal(selectProducts(updated).find(p => p.name === 'iPhone 17').price, 2100);
});
test('missing, unavailable, inquiry-only and unpriced phones are not advertised', () => {
  assert.equal(selectProducts([]).length, 0);
  for (const changes of [{ availability: 'out of stock' }, { inquiryOnly: true }, { pricePending: true }, { price: 0 }]) {
    assert.equal(selectProducts([{ name: 'iPhone 17', price: 2200, ...changes }]).length, 0);
  }
});
test('WhatsApp draft identifies the phone, exact estimate, fee and term without claiming approval', () => {
  const phone = selectProducts(catalog)[0];
  const url = new URL(whatsappUrl(phone));
  assert.equal(url.hostname, 'wa.me');
  assert.equal(url.pathname, '/59996782619');
  const message = url.searchParams.get('text');
  assert.match(message, /iPhone 18 Pro Max 256GB/);
  assert.match(message, /XCG 471.55 per month for 12 months/);
  assert.match(message, /3% store fee: XCG 112.50/);
  assert.match(message, /Please confirm stock, the final plan and Suave approval/);
});
