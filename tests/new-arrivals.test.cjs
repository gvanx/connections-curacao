const test = require('node:test');
const assert = require('node:assert/strict');
const { WINDOW_MS, isNewArrival, nextChangeAt } = require('../js/new-arrivals.js');
const { productKey, syncNewArrivals } = require('../scripts/sync-new-arrivals.cjs');

const addedAt = '2026-10-28T19:30:00-04:00';
const start = Date.parse(addedAt);
const phone = { name: 'Example phone', category: 'samsung', suffix: '', price: 399, addedAt };
const empty = () => ({ version: 1, firstSeen: {} });

test('badge expires exactly 14 days after listing across timezones', () => {
  assert(!isNewArrival(phone, start - 1));
  assert(isNewArrival(phone, start));
  assert(isNewArrival(phone, start + WINDOW_MS - 1));
  assert(!isNewArrival(phone, start + WINDOW_MS));
  assert(!isNewArrival({ ...phone, addedAt: undefined, newArrival: true }, start));
  assert(!isNewArrival({ ...phone, addedAt: 'invalid' }, start));
  assert(!isNewArrival({ ...phone, addedAt: '2026-10-28' }, start));
});

test('timer finds the next launch/expiry and stops when nothing remains', () => {
  assert.equal(nextChangeAt([phone], start - 1), start);
  assert.equal(nextChangeAt([phone], start), start + WINDOW_MS);
  assert.equal(nextChangeAt([phone], start + WINDOW_MS), Infinity);
});

test('all new listings are automatically tagged, regardless of category or flag', () => {
  const items = ['apple', 'samsung', 'laptops', 'appliances', 'other'].map(category => ({ name: 'New item', category, suffix: '', price: 100, newArrival: false }));
  const result = syncNewArrivals(items, empty(), start);
  assert(result.products.every(p => p.newArrival && Date.parse(p.addedAt) === start));
  assert.equal(Object.keys(result.history.firstSeen).length, items.length);
});

test('price/spec/photo edits and repeated runs preserve the original clock', () => {
  const first = syncNewArrivals([phone], empty(), start);
  const second = syncNewArrivals([{ ...first.products[0], price: 500, spec: 'Updated', image: 'new.jpg', addedAt: undefined }], first.history, start + 7 * 86400000);
  assert.equal(second.products[0].addedAt, addedAt);
  assert(second.products[0].newArrival);
  const expired = syncNewArrivals(second.products, second.history, start + WINDOW_MS);
  assert.equal(expired.products[0].newArrival, undefined);
  assert.equal(expired.products[0].addedAt, addedAt);
  assert.deepEqual(syncNewArrivals(expired.products, expired.history, start + WINDOW_MS + 1), expired);
});

test('existing undated products and removed/reintroduced listings are not reset', () => {
  const old = { name: 'Old item', category: 'apple', suffix: '' };
  const history = { version: 1, firstSeen: { [productKey(old)]: null, [productKey(phone)]: addedAt } };
  const result = syncNewArrivals([old, phone], history, start + WINDOW_MS);
  assert(result.products.every(p => !p.newArrival));
  assert.equal(result.products[0].addedAt, undefined);
  assert.equal(result.products[1].addedAt, addedAt);
});

test('distinct storage/condition variants stay separate; duplicates and invalid dates fail', () => {
  const variants = [phone, { ...phone, suffix: 'HSO' }, { ...phone, name: 'Example phone 512GB' }];
  assert.equal(Object.keys(syncNewArrivals(variants, empty(), start).history.firstSeen).length, 3);
  assert.throws(() => syncNewArrivals([phone, phone], empty(), start), /Duplicate/);
  assert.throws(() => syncNewArrivals([{ ...phone, addedAt: 'bad' }], empty(), start), /Invalid/);
});

test('storefront updates cards, New Arrivals filter and open tabs at expiry', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const root = path.resolve(__dirname, '..');
  const fixture = [
    { ...phone, featured: true, newArrival: true },
    { name: 'Older phone', category: 'apple', suffix: '', price: 100 }
  ];
  let now = start;
  class Clock extends Date { static now() { return now; } }
  const elements = new Map(), events = {}, errors = [];
  let timer;
  function element(key) {
    if (!elements.has(key)) elements.set(key, {
      innerHTML: '', style: {}, value: '',
      classList: { toggle() {}, remove() {}, add() {}, contains() { return false; } },
      querySelector: selector => element(key + ' ' + selector), querySelectorAll: () => [],
      closest: selector => element(selector), addEventListener() {}, setAttribute() {}, scrollIntoView() {}
    });
    return elements.get(key);
  }
  const document = {
    hidden: false, body: element('body'),
    getElementById: id => element('#' + id), querySelector: element, querySelectorAll: () => [],
    addEventListener: (name, callback) => { if (['DOMContentLoaded', 'visibilitychange'].includes(name)) events[name] = callback; }
  };
  const context = vm.createContext({
    Date: Clock, document, window: { addEventListener() {} },
    IntersectionObserver: class { observe() {} }, location: { hash: '#new-arrivals' },
    history: { replaceState() {} }, console: { error: error => errors.push(error) },
    fetch: async () => ({ ok: true, json: async () => fixture }),
    setTimeout: (callback, delay) => { timer = { callback, delay }; return 1; }, clearTimeout() {}
  });
  for (const name of ['checkout', 'new-arrivals', 'storefront']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8'), context);
  }
  await events.DOMContentLoaded();
  assert.deepEqual(errors, []);
  assert.equal((elements.get('#product-results').innerHTML.match(/class="product-card"/g) || []).length, 1);
  assert(elements.get('#product-results').innerHTML.includes('New Arrival'));
  assert.equal(timer.delay, WINDOW_MS + 10);
  now = start + WINDOW_MS;
  timer.callback();
  assert(!elements.get('#product-results').innerHTML.includes('badge-new-arrival'));
  assert(!elements.get('#deals .container').innerHTML.includes('badge-new-arrival'));
  assert.equal((elements.get('#product-results').innerHTML.match(/class="product-card"/g) || []).length, 2);
  assert.equal(element('.pf-pill[data-cat="new-arrivals"]').hidden, true);
  // Resuming a suspended tab also refreshes the displayed state.
  now = start;
  events.visibilitychange();
  assert(elements.get('#product-results').innerHTML.includes('badge-new-arrival'));
  assert.equal(element('.pf-pill[data-cat="new-arrivals"]').hidden, false);
});
