const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { mergeCatalog, purchaseUrl } = require('../js/gift-cards.js');

const card = { name: 'Apple Gift Card US$10', category: 'giftcards', giftCardName: 'Apple Gift Card $10', price: null, inquiryOnly: true, pricePending: true, featured: true };
const physical = { name: 'Example phone', category: 'samsung', suffix: '', price: 399 };
const store = (changes = {}) => ({ config: {}, storeStatus: { mode: 'apple-only', closed: false }, products: [{ cat: 'Apple', name: 'Apple Gift Card $10', price: 35, ...changes }] });

test('digital prices are sourced from the exact Apple denomination with a stable checkout link', () => {
  const result = mergeCatalog([physical, card], store());
  assert.equal(result[0], physical);
  assert.equal(result[1].price, 35);
  assert.equal(result[1].giftCardStatus, 'available');
  assert.equal(result[1].inquiryOnly, true);
  assert.equal(purchaseUrl(card), 'https://giftcard.connectionscuracao.net/#buy=Apple%20Gift%20Card%20%2410');
});

test('sold-out, missing, duplicate, malformed and closed catalogues cannot produce a buyable card', () => {
  assert.equal(mergeCatalog([card], store({ soldOut: true }))[0].giftCardStatus, 'sold-out');
  const duplicate = store(); duplicate.products.push({ ...duplicate.products[0] });
  const missing = store(); missing.products = [];
  const closed = store(); closed.storeStatus = { mode: 'closed', closed: true };
  const wrongBrand = store({ cat: 'PSN' });
  for (const bad of [null, {}, duplicate, missing, closed, wrongBrand, store({ price: -1 }), store({ price: '35' }), store({ price: NaN })]) {
    const [result] = mergeCatalog([{ ...card, price: 99, oldPrice: 100, giftCardStatus: 'available' }], bad);
    assert.equal(result.giftCardStatus, 'unavailable');
    assert.equal(result.price, null);
    assert.equal(result.oldPrice, undefined);
  }
  assert.equal(mergeCatalog([card])[0].giftCardStatus, 'loading');
});

test('live pricing follows the source sale dates in Curaçao, rounding, original price and opt-out', () => {
  const feed = store();
  feed.config.sale = { enabled: true, percent: 5, startDate: '2026-10-28', endDate: '2026-10-28' };
  const now = Date.parse('2026-10-29T03:59:59Z');
  const [sale] = mergeCatalog([card], feed, now);
  assert.equal(sale.price, 33);
  assert.equal(sale.oldPrice, 35);
  assert.equal(mergeCatalog([card], feed, now + 1000)[0].price, 35);
  feed.products[0].noSale = true;
  assert.equal(mergeCatalog([card], feed, now)[0].price, 35);
  delete feed.products[0].noSale;
  feed.products[0].originalPrice = 40;
  assert.equal(mergeCatalog([card], feed, now)[0].price, 35);
  assert.equal(mergeCatalog([card], feed, now)[0].oldPrice, 40);
});

async function boot({ fail = false, feed = store(), stall = false, hash = '#gift-cards' } = {}) {
  const elements = new Map(), listeners = new Map(), events = {}, intervals = [], timers = new Map();
  const requests = [], errors = [];
  let nextTimer = 0;
  const state = { feed, fail };
  function element(key) {
    if (!elements.has(key)) elements.set(key, {
      innerHTML: '', style: {}, value: '', dataset: {},
      classList: { toggle() {}, remove() {}, add() {}, contains() { return false; } },
      querySelector: selector => element(key + ' ' + selector), querySelectorAll: () => [],
      closest: selector => element(selector), addEventListener() {}, setAttribute() {}, scrollIntoView() {}
    });
    return elements.get(key);
  }
  const document = {
    hidden: false, body: element('body'),
    getElementById: id => element('#' + id), querySelector: element, querySelectorAll: () => [],
    addEventListener(name, callback) {
      const callbacks = listeners.get(name) || []; callbacks.push(callback); listeners.set(name, callbacks);
    }
  };
  const context = vm.createContext({
    Date, AbortController, document, window: { addEventListener(name, callback) { events[name] = callback; } },
    IntersectionObserver: class { observe() {} }, location: { hash }, history: { replaceState() {} },
    console: { error: (...args) => errors.push(args.map(String).join(' ')) },
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (url.startsWith('data/products.json')) return { ok: true, json: async () => [physical, card] };
      if (stall) return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('Timed out'))));
      if (state.fail) throw new Error('Catalogue offline');
      return { ok: true, json: async () => state.feed };
    },
    setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); }, setInterval(callback, delay) { intervals.push({ callback, delay }); }
  });
  for (const name of ['checkout', 'new-arrivals', 'gift-cards', 'storefront']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', name + '.js'), 'utf8'), context);
  }
  for (const callback of listeners.get('DOMContentLoaded')) await callback();
  const settle = () => new Promise(resolve => setImmediate(resolve));
  await settle();
  assert.deepEqual(errors, []);
  return { elements, element, requests, intervals, timers, state, settle, context, events };
}

test('real product and featured cards link to digital checkout without a physical-order button', async () => {
  const h = await boot();
  for (const id of ['#product-results', '#deals .container']) {
    const html = h.elements.get(id).innerHTML;
    assert(html.includes(purchaseUrl(card)));
    assert(html.includes('XCG 35'));
    assert(!html.includes('js-order-btn'));
  }
  assert(h.elements.get('#product-results').innerHTML.includes('US Apple accounts'));
  assert.equal(h.intervals[0].delay, 60000);
  const request = h.requests.find(r => r.url === '/data/gift-card-store.json');
  assert.equal(request.options.cache, 'no-store');
  assert(request.options.signal);
  h.state.feed = store({ price: 40, soldOut: true });
  h.intervals[0].callback(); await h.settle();
  for (const id of ['#product-results', '#deals .container']) {
    const html = h.elements.get(id).innerHTML;
    assert(html.includes('XCG 40'));
    assert(html.includes('disabled>Sold out'));
    assert(!html.includes('#buy='));
  }
  h.state.feed = store({ price: 42 });
  h.events.focus(); await h.settle();
  assert(h.elements.get('#product-results').innerHTML.includes('XCG 42'));
  assert(h.elements.get('#product-results').innerHTML.includes('#buy='));
});

test('feed failure clears stale prices and offers the source store without breaking other products', async () => {
  const h = await boot();
  h.state.fail = true;
  h.events.online(); await h.settle();
  const html = h.elements.get('#product-results').innerHTML;
  assert(html.includes('Check current price'));
  assert(html.includes('View gift-card store'));
  assert(!html.includes('XCG 35'));
  assert(!html.includes('#buy='));
  assert(h.elements.get('#categories .container').innerHTML.includes('Samsung'));
  assert(h.elements.get('#product-toolbar').innerHTML.includes('Apple Gift Cards'));
});

test('a stalled gift-card feed times out while physical products remain purchasable', async () => {
  const h = await boot({ stall: true, hash: '#products' });
  let html = h.elements.get('#product-results').innerHTML;
  assert(html.includes('Example phone'));
  assert(html.includes('js-order-btn'));
  assert(html.includes('Checking stock'));
  const timeout = [...h.timers.values()].find(timer => timer.delay === 5000);
  timeout.callback(); await h.settle();
  html = h.elements.get('#product-results').innerHTML;
  assert(html.includes('View gift-card store'));
  assert(html.includes('js-order-btn'));
  assert(!html.includes('#buy='));
});

test('published gift-card metadata cannot enter physical checkout or hardcode a payment amount', () => {
  const products = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/products.json')));
  const cards = products.filter(p => p.category === 'giftcards');
  assert(cards.length > 0);
  for (const item of cards) {
    assert.equal(item.price, null);
    assert.equal(item.inquiryOnly, true);
    assert(/^Apple Gift Card \$\d+(?:\.\d{1,2})?$/.test(item.giftCardName));
    assert(item.name.includes('US$'));
  }
});
