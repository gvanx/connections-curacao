const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { selectDeals, savings, cardHTML, imageSrc } = require('../blackfriday/deals.js');

const root = path.join(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/products.json'), 'utf8'));
const script = fs.readFileSync(path.join(root, 'blackfriday/deals.js'), 'utf8');

test('only explicitly tagged products join the campaign, and filtering/sorting preserves the source catalog', () => {
  const products = [
    { name: 'Unrelated sale', price: 10, oldPrice: 100, category: 'acs' },
    { name: 'String tag', price: 15, blackFriday: 'true', category: 'acs' },
    { name: 'Tablet', price: 339, blackFriday: true, category: 'samsung' },
    { name: 'Airco', price: 444, oldPrice: 650, blackFriday: true, category: 'acs' },
    { name: 'Ask first', price: null, blackFriday: true, category: 'acs' }
  ];
  const snapshot = structuredClone(products);
  assert.deepEqual(selectDeals(products).map(p => p.name), ['Airco', 'Ask first', 'Tablet']);
  assert.deepEqual(selectDeals(products, 'acs', 'price-asc').map(p => p.name), ['Airco', 'Ask first']);
  assert.deepEqual(selectDeals(products, 'all', 'price-asc').map(p => p.name), ['Tablet', 'Airco', 'Ask first']);
  assert.deepEqual(selectDeals(products, 'all', 'price-desc').map(p => p.name), ['Airco', 'Tablet', 'Ask first']);
  assert.deepEqual(selectDeals(products, 'all', 'savings').map(p => p.name), ['Airco', 'Tablet', 'Ask first']);
  assert.deepEqual(selectDeals(products, 'apple'), []);
  assert.deepEqual(products, snapshot);
});

test('the four advertised aircos use the main-site illustration and checkout at the exact advertised prices', () => {
  const expected = [[9000, 444, 650, 206], [18000, 875, 1150, 275], [24000, 1099, 1390, 291], [36000, 1799, 2100, 301]];
  for (const [btu, price, oldPrice, saving] of expected) {
    const name = `Premier ${btu.toLocaleString('en-US')} BTU Inverter AC`;
    const product = selectDeals(catalog).find(p => p.name === name);
    assert.ok(product, name);
    assert.equal(product.price, price);
    assert.equal(product.oldPrice, oldPrice);
    assert.equal(savings(product), saving);
    const html = cardHTML(product);
    assert.ok(html.includes(`Save XCG ${saving}`));
    assert.ok(html.includes(`XCG ${price.toLocaleString('en-US')}`));
    assert.equal(product.inquiryOnly, false);
    assert.match(html, /js-order-btn/);
    assert.match(html, /Checkout &amp; Pay/);
    assert.ok(html.includes(`data-product-price="${price}"`));
    assert.equal(decodeURIComponent(html.match(/data-product-name="([^"]+)"/)[1]), name);
    assert.doesNotMatch(html, /Ask about this offer|wa\.me|bf-model-art/);
    assert.equal(product.image, 'ac-catalog.webp');
    assert.equal(Object.hasOwn(product, 'imageCrop'), false);
    assert.match(html, /src="\/img\/products\/ac-catalog\.webp"/);
    assert.doesNotMatch(html, /bf-photo-crop|airco-specials-2026\.jpeg/);
  }
});

test('existing tagged tablet and laptop keep checkout using their current catalog prices', () => {
  const offers = selectDeals(catalog).filter(p => ['samsung', 'laptops'].includes(p.category));
  assert.ok(offers.length >= 2);
  for (const p of offers) {
    const html = cardHTML(p);
    assert.ok(html.includes(`data-product-price="${p.price}"`));
    assert.match(html, /js-order-btn/);
    assert.doesNotMatch(html, /<del>|Save XCG/);
  }
});

test('invalid comparisons never invent savings, and unavailable items cannot enter physical checkout', () => {
  for (const p of [
    { price: 20 }, { price: 20, oldPrice: 20 }, { price: 20, oldPrice: 10 },
    { price: null, oldPrice: 20 }, { price: 20, oldPrice: '30' }, { price: NaN, oldPrice: 30 }
  ]) {
    assert.equal(savings(p), 0);
    assert.doesNotMatch(cardHTML({ name: 'Offer', category: 'other', ...p }), /<del>|Save XCG/);
  }
  assert.equal(savings({ price: 12.4, oldPrice: 20.5 }), 8.1);
  const soldOut = cardHTML({ name: 'Unavailable', category: 'other', price: 100, soldOut: true });
  assert.match(soldOut, /disabled>Sold out/);
  assert.doesNotMatch(soldOut, /js-order-btn/);
  const pending = cardHTML({ name: 'Pending', category: 'other', price: null, pricePending: true });
  assert.match(pending, /Ask for price/);
  assert.doesNotMatch(pending, /js-order-btn/);
  const digital = cardHTML({ name: 'Gift card', category: 'giftcards', price: 100, oldPrice: 200 });
  assert.match(digital, /Check current price/);
  assert.match(digital, /https:\/\/giftcard\.connectionscuracao\.net\//);
  assert.doesNotMatch(digital, /js-order-btn|XCG 100|Save XCG|<del>/);
});

test('catalog strings are escaped and image paths preserve supported existing artwork', () => {
  const html = cardHTML({ name: '<img src=x onerror=alert(1)>', suffix: '" & model', spec: '<script>bad()</script>', category: 'other', price: 20 });
  assert.doesNotMatch(html, /<script>|<img src=x/);
  assert.match(html, /&lt;img/);
  assert.match(html, /&quot; &amp; model/);
  assert.equal(imageSrc({ image: '/img/products/lenovo-ideapad-3-chromebook-15ijl6.jpg' }), '/img/products/lenovo-ideapad-3-chromebook-15ijl6.jpg');
  assert.equal(imageSrc({ image: 'galaxy-tab-a11-model.png' }), '/img/products/galaxy-tab-a11-model.png');
  assert.equal(imageSrc({ image: 'ac-generic.png' }), '/img/products/ac-catalog.webp');
  assert.equal(imageSrc({ image: 'ac-generic.png', imageUnavailable: true }), '');
});

function browser(fetch, { spotlight = true } = {}) {
  const elements = new Map();
  function element(id) {
    let html = '';
    return {
      id, hidden: ['bf-toolbar', 'bf-empty', 'bf-error', 'bf-spotlight'].includes(id), value: 'featured', textContent: '',
      listeners: {}, attributes: {}, buttons: [],
      set innerHTML(value) {
        html = value;
        this.buttons = [...value.matchAll(/data-category="([^"]+)"/g)].map(match => ({
          dataset: { category: match[1] }, attributes: {},
          setAttribute(key, value) { this.attributes[key] = value; },
          closest() { return this; }
        }));
      },
      get innerHTML() { return html; },
      querySelectorAll() { return this.buttons; },
      setAttribute(key, value) { this.attributes[key] = value; },
      addEventListener(type, callback) { this.listeners[type] = callback; },
      replaceChildren() { this.innerHTML = ''; }
    };
  }
  for (const id of ['bf-products', 'bf-filters', 'bf-sort', 'bf-count', 'bf-empty', 'bf-error', 'bf-toolbar', 'bf-retry']) elements.set(id, element(id));
  if (spotlight) elements.set('bf-spotlight', element('bf-spotlight'));
  const timers = new Map();
  const boundScopes = [];
  let nextTimer = 0, initialized = 0;
  const window = {
    document: { getElementById: id => elements.get(id) }, fetch,
    initCheckoutModal() { initialized++; },
    attachOrderButtons(scope) {
      assert.ok(['bf-products', 'bf-spotlight'].includes(scope.id));
      boundScopes.push(scope.id);
    }
  };
  vm.runInNewContext(script, {
    window, AbortController,
    setTimeout(callback) { timers.set(++nextTimer, callback); return nextTimer; },
    clearTimeout(id) { timers.delete(id); }
  });
  return { elements, timers, boundScopes, get initialized() { return initialized; } };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

test('browser loading binds checkout, filters tagged categories, sorts, and recovers missing images', async () => {
  const requests = [];
  const app = browser(async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => catalog };
  });
  await flush();
  const e = id => app.elements.get(id);
  assert.equal(app.initialized, 1);
  assert.deepEqual(app.boundScopes, ['bf-spotlight', 'bf-products']);
  assert.equal(requests[0].options.cache, 'no-store');
  assert.match(requests[0].url, /^\/data\/products\.json\?/);
  assert.equal(e('bf-products').attributes['aria-busy'], 'false');
  assert.equal(e('bf-count').textContent, `${selectDeals(catalog).length} Black Friday deals`);
  assert.equal(e('bf-toolbar').hidden, false);
  assert.equal(e('bf-spotlight').hidden, false);
  assert.match(e('bf-spotlight').innerHTML, /Premier 9,000 BTU Inverter AC/);
  assert.match(e('bf-spotlight').innerHTML, /js-order-btn/);
  assert.match(e('bf-spotlight').innerHTML, /data-product-price="444"/);
  assert.doesNotMatch(e('bf-spotlight').innerHTML, /Galaxy Tab|Chromebook/);
  const airco = e('bf-filters').buttons.find(button => button.dataset.category === 'acs');
  e('bf-filters').listeners.click({ target: airco });
  assert.equal(e('bf-count').textContent, '4 Black Friday deals');
  assert.equal(airco.attributes['aria-pressed'], 'true');
  assert.doesNotMatch(e('bf-products').innerHTML, /Galaxy Tab/);
  e('bf-sort').value = 'price-desc';
  e('bf-sort').listeners.change();
  assert.ok(e('bf-products').innerHTML.indexOf('36,000') < e('bf-products').innerHTML.indexOf('9,000'));
  for (const scope of ['bf-products', 'bf-spotlight']) {
    const frame = { innerHTML: '<img src="/missing.webp">' };
    e(scope).listeners.error({ target: {
      tagName: 'IMG', alt: 'Missing <model>', parentElement: frame,
      closest(selector) { assert.equal(selector, '.bf-card-image'); return frame; }
    } });
    assert.match(frame.innerHTML, /Missing &lt;model&gt;/);
    assert.doesNotMatch(frame.innerHTML, /<img/);
  }
  assert.equal(app.timers.size, 0);
});

test('catalog errors show retry instead of fake empty results, and duplicate retries do not duplicate requests', async () => {
  let calls = 0, resolveRetry;
  const app = browser(async () => {
    calls++;
    if (calls === 1) return { ok: false, status: 503 };
    return new Promise(resolve => { resolveRetry = resolve; });
  });
  await flush();
  const e = id => app.elements.get(id);
  assert.equal(e('bf-error').hidden, false);
  assert.equal(e('bf-empty').hidden, true);
  assert.equal(e('bf-toolbar').hidden, true);
  assert.equal(e('bf-products').innerHTML, '');
  assert.equal(e('bf-spotlight').hidden, true);
  assert.equal(e('bf-spotlight').innerHTML, '');
  const pending = e('bf-retry').listeners.click();
  await e('bf-retry').listeners.click();
  assert.equal(calls, 2);
  assert.equal(e('bf-products').attributes['aria-busy'], 'true');
  resolveRetry({ ok: true, json: async () => catalog });
  await pending;
  assert.equal(e('bf-error').hidden, true);
  assert.equal(e('bf-empty').hidden, true);
  assert.equal(e('bf-toolbar').hidden, false);
  assert.match(e('bf-products').innerHTML, /Premier 9,000 BTU/);
  assert.equal(e('bf-spotlight').hidden, false);
  assert.match(e('bf-spotlight').innerHTML, /data-product-price="444"/);
  assert.equal(app.timers.size, 0);
});

test('empty, malformed, offline and timed-out catalogs finish with an accurate visible state', async () => {
  for (const fetch of [
    async () => ({ ok: true, json: async () => ({ products: [] }) }),
    async () => ({ ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } }),
    async () => { throw new TypeError('Offline'); }
  ]) {
    const app = browser(fetch);
    await flush();
    assert.equal(app.elements.get('bf-error').hidden, false);
    assert.equal(app.elements.get('bf-empty').hidden, true);
    assert.equal(app.elements.get('bf-products').attributes['aria-busy'], 'false');
    assert.equal(app.elements.get('bf-spotlight').hidden, true);
    assert.equal(app.elements.get('bf-spotlight').innerHTML, '');
    assert.equal(app.timers.size, 0);
  }
  const empty = browser(async () => ({ ok: true, json: async () => [{ name: 'Not tagged', price: 10 }] }));
  await flush();
  assert.equal(empty.elements.get('bf-empty').hidden, false);
  assert.equal(empty.elements.get('bf-error').hidden, true);
  assert.equal(empty.elements.get('bf-toolbar').hidden, true);
  assert.equal(empty.elements.get('bf-spotlight').hidden, true);
  const stalled = browser((url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Timed out', 'AbortError')));
  }));
  [...stalled.timers.values()][0]();
  await flush();
  assert.equal(stalled.elements.get('bf-error').hidden, false);
  assert.equal(stalled.elements.get('bf-products').attributes['aria-busy'], 'false');
  assert.equal(stalled.elements.get('bf-spotlight').hidden, true);
  assert.equal(stalled.timers.size, 0);
});

test('spotlight selects only a purchasable tagged airco, clears on later failure, and remains optional', async () => {
  const products = [
    { name: 'Ordinary airco', category: 'acs', price: 1 },
    { name: 'Tagged tablet', category: 'samsung', price: 2, blackFriday: true },
    { name: 'Inquiry airco', category: 'acs', price: 3, blackFriday: true, inquiryOnly: true },
    { name: 'Sold out airco', category: 'acs', price: 4, blackFriday: true, soldOut: true },
    { name: 'Pending airco', category: 'acs', price: null, blackFriday: true },
    { name: 'Eligible higher', category: 'acs', price: 875, blackFriday: true },
    { name: 'Eligible lowest', category: 'acs', price: 444, blackFriday: true }
  ];
  let calls = 0;
  const app = browser(async () => ++calls === 1 ? { ok: true, json: async () => products } : { ok: false, status: 503 });
  await flush();
  const spotlight = app.elements.get('bf-spotlight');
  assert.equal(spotlight.hidden, false);
  assert.match(spotlight.innerHTML, /Eligible lowest/);
  assert.match(spotlight.innerHTML, /data-product-price="444"/);
  assert.doesNotMatch(spotlight.innerHTML, /Ordinary|Tagged tablet|Inquiry airco|Sold out|Pending|Eligible higher/);
  await app.elements.get('bf-retry').listeners.click();
  assert.equal(spotlight.hidden, true);
  assert.equal(spotlight.innerHTML, '');
  const noEligible = browser(async () => ({ ok: true, json: async () => products.slice(0, 5) }));
  await flush();
  assert.equal(noEligible.elements.get('bf-spotlight').hidden, true);
  assert.equal(noEligible.elements.get('bf-spotlight').innerHTML, '');
  const absent = browser(async () => ({ ok: true, json: async () => products }), { spotlight: false });
  await flush();
  assert.deepEqual(absent.boundScopes, ['bf-products']);
  assert.equal(absent.elements.get('bf-error').hidden, true);
  assert.match(absent.elements.get('bf-products').innerHTML, /Eligible lowest/);
});
