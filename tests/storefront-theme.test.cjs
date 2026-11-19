const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { cardHTML } = require('../blackfriday/deals.js');
const { stockFixture } = require('./helpers/hso-fixture.cjs');

const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/products.json'), 'utf8'));

async function boot(products, { theme = true, inventory, giftCatalog, hsoHelper = true } = {}) {
  const elements = new Map(), events = {}, errors = [], windowEvents = {}, intervals = [];
  const defaultInventory = {
    models: [...new Set(products.filter(p => p.suffix === 'HSO' && p.hsoModel).map(p => p.hsoModel))].map(id => ({ id })),
    units: products.filter(p => p.suffix === 'HSO' && p.hsoModel).map((p, index) => ({
      modelId: p.hsoModel, storage: p.hsoStorage || '128GB', color: p.hsoColor || 'Black',
      serial: 'TEST000' + index, status: 'available'
    }))
  };
  function element(key) {
    if (!elements.has(key)) elements.set(key, {
      innerHTML: '', style: {}, value: '', children: [],
      replaceChildren() { this.children = []; }, appendChild(child) { this.children.push(child); },
      classList: {
        toggle() {}, remove() {}, add() {},
        contains(name) { return key === 'body' && theme && name === 'black-friday-theme'; }
      },
      querySelector: selector => element(key + ' ' + selector), querySelectorAll: () => [],
      closest: selector => element(selector), addEventListener() {}, setAttribute() {}, scrollIntoView() {}
    });
    return elements.get(key);
  }
  const document = {
    hidden: false, body: element('body'), createElement: tag => ({ tagName: tag }),
    getElementById: id => element('#' + id), querySelector: element, querySelectorAll: () => [],
    addEventListener: (name, callback) => { events[name] = callback; }
  };
  const context = vm.createContext({
    document, window: { addEventListener(type, callback) { (windowEvents[type] ||= []).push(callback); } }, location: { hash: '' }, history: { replaceState() {} },
    IntersectionObserver: class { observe() {} }, AbortController, URL,
    console: { error: (...args) => errors.push(args), warn: (...args) => errors.push(args) },
    fetch: async url => ({ ok: true, json: async () => url.startsWith('/data/gift-card-store') ? (giftCatalog ? giftCatalog() : { products: [] }) :
      url === '/.netlify/functions/hso-stock' ? stockFixture(inventory ? inventory() : defaultInventory, products) : products }),
    setTimeout() { return 1; }, clearTimeout() {}, setInterval(callback, delay) { intervals.push({ callback, delay }); return 1; }
  });
  for (const name of ['checkout', 'new-arrivals', 'gift-cards', 'hso-catalog', 'storefront']) {
    if (name === 'hso-catalog' && !hsoHelper) continue;
    vm.runInContext(fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8'), context);
  }
  await events.DOMContentLoaded();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(errors, []);
  return { element, render: fixture => context.renderDeals(fixture), intervals, document,
    chooseCategory: category => context.openProductCategory(category),
    dispatch: async type => { await Promise.all((windowEvents[type] || []).map(callback => callback())); },
    visibility: () => events.visibilitychange() };
}

const airco = (name, price, extra = {}) => ({ name, price, category: 'acs', blackFriday: true, image: 'ac-catalog.webp', ...extra });

async function offerSurfaces(product) {
  const app = await boot([product]);
  return [
    ['catalog', app.element('#product-results').innerHTML],
    ['homepage deals', app.element('#deals .container').innerHTML],
    ['Black Friday', cardHTML(product)]
  ];
}

test('managed HSO image, title and action lead to the exact model and variant before checkout', async () => {
  const product = { name: 'iPhone 15', suffix: 'HSO', hsoModel: 'iphone-15', hsoStorage: '128GB',
    hsoColor: 'Black Titanium', category: 'apple', image: 'iphone-15-model.jpg', price: 1099,
    oldPrice: 1350, blackFriday: true, inquiryOnly: true };
  const snapshot = structuredClone(product);
  for (const [surface, html] of await offerSurfaces(product)) {
    const expected = '/hso/?model=iphone-15&amp;storage=128GB' + (surface === 'Black Friday' ? '&amp;color=Black%20Titanium' : '');
    assert.equal(html.split(`href="${expected}"`).length - 1, 3, surface);
    assert.match(html, /class="hso-product-link"[^>]*aria-label="View available iPhone 15(?: 128GB)? HSO devices"/, surface);
    assert.match(html, /Choose your device/, surface);
    assert.match(html, /XCG 1,099/, surface);
    assert.match(html, /XCG 1,350/, surface);
    assert.doesNotMatch(html, /js-order-btn|data-product-price|wa\.me|<a[^>]*>\s*<button/, surface);
  }
  assert.deepEqual(product, snapshot);
});

test('unmanaged HSO and new phones retain their existing checkout route', async () => {
  for (const extra of [{ suffix: 'HSO' }, { suffix: '', hsoModel: 'iphone-15' }]) {
    for (const [surface, html] of await offerSurfaces({ name: 'iPhone 15', category: 'apple',
      price: 1099, blackFriday: true, ...extra })) {
      assert.match(html, /js-order-btn/, surface);
      assert.match(html, /data-product-price="1099"/, surface);
      assert.doesNotMatch(html, /Choose your device|\/hso\//, surface);
    }
  }
});

test('managed sold-out HSO cannot bypass stock state through generic checkout', async () => {
  const product = { name: 'iPhone 15', suffix: 'HSO', hsoModel: 'iphone-15', category: 'apple',
    price: 1099, blackFriday: true, soldOut: true };
  const app = await boot([product], { inventory: () => ({ models: [{ id: 'iphone-15' }], units: [] }) });
  assert.doesNotMatch(app.element('#product-results').innerHTML, /iPhone 15|Choose your device|js-order-btn/);
  for (const html of [cardHTML(product)]) {
    assert.match(html, /disabled>Sold out/);
    assert.doesNotMatch(html, /Choose your device|js-order-btn|data-product-price/);
  }
  assert.equal(app.element('#deals .container').innerHTML, '');
});

test('selling the last HSO unit removes catalog and homepage offers, gift refresh cannot restore it, and restocking restores both', async () => {
  const phone = { name: 'Managed iPhone', suffix: 'HSO', hsoModel: 'iphone-15', hsoStorage: '128GB', category: 'apple', price: 1099, blackFriday: true };
  const gift = catalog.find(product => product.category === 'giftcards');
  const available = { models: [{ id: 'iphone-15' }], units: [{ modelId: 'iphone-15', serial: 'ABC12345', storage: '128GB', color: 'Black', status: 'available' }] };
  let inventory = structuredClone(available);
  const app = await boot([phone, gift, airco('Ordinary airco', 444)], { inventory: () => inventory });
  const surfaces = () => [app.element('#product-results').innerHTML, app.element('#deals .container').innerHTML];
  for (const html of surfaces()) assert.match(html, /Managed iPhone/);
  inventory = { ...available, units: [] };
  await app.dispatch('focus');
  for (const html of surfaces()) { assert.doesNotMatch(html, /Managed iPhone/); assert.match(html, /Ordinary airco/); }
  inventory = available;
  app.intervals.find(timer => timer.delay === 60000).callback();
  await new Promise(resolve => setImmediate(resolve));
  for (const html of surfaces()) assert.doesNotMatch(html, /Managed iPhone/);
  await app.dispatch('online');
  for (const html of surfaces()) assert.match(html, /Managed iPhone/);
  inventory = null;
  app.intervals.find(timer => timer.delay === 30000).callback();
  await new Promise(resolve => setImmediate(resolve));
  for (const html of surfaces()) { assert.doesNotMatch(html, /Managed iPhone/); assert.match(html, /Ordinary airco/); }
  inventory = available;
  app.document.hidden = true;
  app.intervals.find(timer => timer.delay === 30000).callback();
  await new Promise(resolve => setImmediate(resolve));
  for (const html of surfaces()) assert.doesNotMatch(html, /Managed iPhone/);
  app.document.hidden = false;
  app.visibility();
  await new Promise(resolve => setImmediate(resolve));
  for (const html of surfaces()) assert.match(html, /Managed iPhone/);
});

test('an HSO feed outage at first load leaves ordinary products usable', async () => {
  const app = await boot([
    { name: 'Managed iPhone', suffix: 'HSO', hsoModel: 'iphone-15', category: 'apple', price: 1099, blackFriday: true },
    { name: 'Legacy iPhone 12', suffix: 'HSO', category: 'apple', price: 549, blackFriday: true },
    airco('Available airco', 444)
  ], { inventory: () => { throw new Error('Feed offline'); } });
  assert.doesNotMatch(app.element('#product-results').innerHTML, /Managed iPhone/);
  assert.doesNotMatch(app.element('#product-results').innerHTML, /Legacy iPhone|XCG 549/);
  assert.match(app.element('#product-results').innerHTML, /Available airco/);
  assert.match(app.element('#product-results').innerHTML, /data-product-price="444"/);
});

test('a missing HSO helper hides managed phones and leaves ordinary checkout working', async () => {
  const app = await boot([
    { name: 'Managed iPhone', suffix: 'HSO', hsoModel: 'iphone-15', category: 'apple', price: 1099, blackFriday: true },
    { name: 'Legacy iPhone 12', suffix: 'HSO', category: 'apple', price: 549, blackFriday: true },
    airco('Available airco', 444)
  ], { hsoHelper: false });
  assert.doesNotMatch(app.element('#product-results').innerHTML, /Managed iPhone/);
  assert.doesNotMatch(app.element('#product-results').innerHTML, /Legacy iPhone|XCG 549/);
  assert.match(app.element('#product-results').innerHTML, /Available airco/);
  assert.match(app.element('#product-results').innerHTML, /data-product-price="444"/);
});

test('a failed refresh cannot reuse an old registry to show a legacy phone newly claimed in the sheet', async () => {
  const legacy = { name: 'iPhone 12', suffix: 'HSO', category: 'apple', price: 549, blackFriday: true };
  let inventory = { schemaVersion: 2, models: [], variants: [], units: [] };
  const app = await boot([legacy, airco('Available airco', 444)], { inventory: () => inventory });
  assert.match(app.element('#product-results').innerHTML, /XCG 549/);
  inventory = null; // A new pricing row may exist, but the current registry is unavailable.
  await app.dispatch('focus');
  assert.doesNotMatch(app.element('#product-results').innerHTML, /iPhone 12|XCG 549/);
  assert.match(app.element('#product-results').innerHTML, /Available airco/);
  const variant = { modelId: 'iphone-12', storage: '128GB', color: '', price: 399, oldPrice: null, blackFriday: true, category: 'apple', image: null };
  inventory = { schemaVersion: 2, models: [{ id: 'iphone-12', name: 'iPhone 12' }], variants: [variant], units: [{ ...variant, color: 'Black', serial: 'SERIAL001', status: 'available' }] };
  await app.dispatch('online');
  assert.match(app.element('#product-results').innerHTML, /XCG 399/);
  assert.doesNotMatch(app.element('#product-results').innerHTML, /XCG 549|data-product-price="399"/);
  inventory = null;
  await app.dispatch('focus');
  assert.doesNotMatch(app.element('#product-results').innerHTML, /iPhone 12|XCG 399|XCG 549/);
});

test('a newly configured model appears without a static catalog entry and live prices drive all campaign surfaces', async () => {
  const model = { id: 'hso-galaxy-fold-1234567890', name: 'Galaxy Fold', image: 'https://example.com/fold.jpg' };
  const generic = { modelId: model.id, storage: '256GB', color: '', price: 500, oldPrice: null, blackFriday: false, category: 'samsung', image: model.image };
  const special = { ...generic, color: 'Silver', price: 650, oldPrice: 850, blackFriday: true };
  let inventory = { schemaVersion: 2, models: [], variants: [], units: [] };
  const app = await boot([airco('Ordinary airco', 444)], { inventory: () => inventory });
  inventory = { schemaVersion: 2, models: [model], variants: [generic, special], units: [
    { ...generic, color: 'Black', serial: 'SERIAL001', status: 'available' },
    { ...special, serial: 'SERIAL002', status: 'available' }
  ] };
  await app.dispatch('focus');
  let html = app.element('#product-results').innerHTML;
  assert.match(html, /Galaxy Fold 256GB/);
  assert.match(html, /From XCG 500/);
  assert.match(html, /https:\/\/example.com\/fold.jpg/);
  assert.match(app.element('#deals .container').innerHTML, /XCG 650/);
  assert.doesNotMatch(app.element('#deals .container').innerHTML, /XCG 500/);
  app.chooseCategory('blackfriday');
  html = app.element('#product-results').innerHTML;
  assert.match(html, /XCG 650/);
  assert.match(html, /XCG 850/);
  assert.doesNotMatch(html, /XCG 500/);
  inventory.units[1].price = 625;
  await app.dispatch('online');
  assert.match(app.element('#product-results').innerHTML, /XCG 625/);
  assert.doesNotMatch(app.element('#product-results').innerHTML, /XCG 650/);
  const unchanged = app.element('#product-results').innerHTML;
  inventory = { ...structuredClone(inventory), syncedAt: 'later' };
  await app.dispatch('focus');
  assert.equal(app.element('#product-results').innerHTML, unchanged);
  inventory.units = [inventory.units[0]];
  await app.dispatch('focus');
  assert.doesNotMatch(app.element('#product-results').innerHTML, /Galaxy Fold/);
  app.chooseCategory('all');
  assert.match(app.element('#product-results').innerHTML, /Galaxy Fold/);
  assert.match(app.element('#product-results').innerHTML, /XCG 500/);
});

test('per-serial prices on otherwise identical phones update main and campaign prices without a false crossout', async () => {
  const variant = { modelId: 'iphone-15', storage: '128GB', color: '', price: 9999, oldPrice: 11999, blackFriday: false, category: 'apple', image: null };
  let inventory = { schemaVersion: 2, models: [{ id: 'iphone-15', name: 'iPhone 15' }], variants: [variant], units: [
    { ...variant, serial: 'SERIAL001', color: 'Black', status: 'available', price: 990, oldPrice: 1250, blackFriday: false },
    { ...variant, serial: 'SERIAL002', color: 'Black', status: 'available', price: 1099, oldPrice: 1350, blackFriday: true },
    { ...variant, serial: 'SERIAL003', color: 'Black', status: 'available', price: 1190, oldPrice: 1490, blackFriday: true }
  ] };
  const app = await boot([], { inventory: () => inventory });
  let html = app.element('#product-results').innerHTML;
  assert.match(html, /From XCG 990/);
  assert.doesNotMatch(html, /old-price|XCG 9,999|XCG 11,999/);
  let deals = app.element('#deals .container').innerHTML;
  assert.match(deals, /From XCG 1,099/);
  assert.doesNotMatch(deals, /XCG 990|old-price/);
  app.chooseCategory('blackfriday');
  assert.match(app.element('#product-results').innerHTML, /From XCG 1,099/);

  inventory.units = inventory.units.filter(unit => unit.serial !== 'SERIAL002');
  await app.dispatch('focus');
  html = app.element('#product-results').innerHTML;
  assert.match(html, /XCG 1,190/);
  assert.match(html, /class="old-price">XCG 1,490/);
  assert.doesNotMatch(html, /From XCG|XCG 1,099|XCG 1,350/);
  inventory.units[1].price = 1150;
  await app.dispatch('online');
  assert.match(app.element('#product-results').innerHTML, /XCG 1,150/);
  app.chooseCategory('all');
  assert.match(app.element('#product-results').innerHTML, /From XCG 990/);
});

test('unpriced in-store specials show their label and an identified inquiry without a payment amount or invented savings', async () => {
  for (const price of [null, undefined]) {
    const product = { name: 'iPhone 18 Pro', suffix: '256GB', category: 'apple', price, oldPrice: 3999,
      inStoreSpecial: true, inquiryOnly: true, inquiryLabel: 'Ask about in-store special', blackFriday: true };
    for (const [surface, html] of await offerSurfaces(product)) {
      assert.match(html, /(?:class="(?:product-price|deal-price)"|<strong)>In-store special</, surface);
      assert.match(html, /Ask about in-store special/, surface);
      assert.doesNotMatch(html, /data-product-price|js-order-btn|Checkout &amp; Pay|Save XCG|old-price|<del>|XCG 3,999/, surface);
      const link = html.match(/href="(https:\/\/wa\.me\/[^\"]+)"/);
      assert.ok(link, surface);
      const message = new URL(link[1].replace(/&#39;/g, "'").replace(/&amp;/g, '&')).searchParams.get('text');
      assert.match(message, /in-store special/, surface);
      assert.match(message, /iPhone 18 Pro 256GB/, surface);
      assert.doesNotMatch(message, /XCG|null|undefined/, surface);
    }
  }
});

test('ordinary missing prices and price-pending products keep their existing labels', async () => {
  for (const extra of [{}, { inStoreSpecial: 'true' }, { pricePending: true }]) {
    const product = { name: 'Ordinary phone', category: 'apple', price: null, blackFriday: true, ...extra };
    for (const [surface, html] of await offerSurfaces(product)) {
      assert.doesNotMatch(html, /In-store special|in-store special|data-product-price|js-order-btn/, surface);
      if (surface === 'Black Friday') assert.match(html, /<strong>Ask for price<\/strong>/);
      else assert.ok(html.includes(extra.pricePending ? 'Price coming soon' : 'Ask in store'), surface);
    }
  }
});

test('a later numeric price takes precedence over a stale special flag and preserves checkout and real savings', async () => {
  const product = { name: 'Now-priced phone', category: 'apple', price: 1500, oldPrice: 1800,
    inStoreSpecial: true, inquiryOnly: false, blackFriday: true };
  for (const [surface, html] of await offerSurfaces(product)) {
    assert.match(html, /XCG 1,500/, surface);
    assert.match(html, /data-product-price="1500"/, surface);
    assert.match(html, /Checkout &amp; Pay/, surface);
    assert.match(html, /XCG 1,800/, surface);
    assert.doesNotMatch(html, /In-store special|in-store special/, surface);
    if (surface === 'Black Friday') assert.match(html, /Save XCG 300/);
  }
});

test('a priced inquiry-only offer keeps its amount visible without gaining checkout from the special flag', async () => {
  const product = { name: 'Priced inquiry', category: 'apple', price: 1500,
    inStoreSpecial: true, inquiryOnly: true, blackFriday: true };
  for (const [surface, html] of await offerSurfaces(product)) {
    assert.match(html, /XCG 1,500/, surface);
    assert.doesNotMatch(html, /In-store special|in-store special|data-product-price|js-order-btn/, surface);
    assert.match(html, /https:\/\/wa\.me\//, surface);
  }
});

test('the themed homepage loads the cheapest advertised airco into an eager-image checkout hero', async () => {
  const app = await boot(catalog);
  const hero = app.element('#bf-home-spotlight').innerHTML;
  assert.match(hero, /Premier 9,000 BTU Inverter AC/);
  assert.match(hero, /src="img\/products\/ac-catalog\.webp"/);
  assert.match(hero, /loading="eager" fetchpriority="high"/);
  assert.match(hero, /data-product-price="444"/);
  assert.match(hero, /js-order-btn/);
  assert.match(hero, /Checkout &amp; Pay/);
  assert.doesNotMatch(hero, /loading="lazy"|Galaxy Tab|Chromebook|bf-spotlight-fallback/);
});

test('homepage hero rejects unavailable, unpriced, untagged and digital offers while prioritizing the cheapest eligible airco', async () => {
  const app = await boot([]);
  const products = [
    airco('Untagged airco', 1, { blackFriday: false }),
    airco('String-tagged airco', 2, { blackFriday: 'true' }),
    airco('Sold airco', 3, { soldOut: true }),
    airco('Inquiry airco', 4, { inquiryOnly: true }),
    airco('String price', '5'), airco('Zero price', 0), airco('Negative price', -1),
    airco('Missing price', null), airco('Not finite', Infinity), airco('Not a number', NaN),
    { name: 'Digital card', category: 'giftcards', giftCardName: 'Apple Gift Card $10', blackFriday: true, price: 6 },
    { name: 'Cheaper tablet', category: 'samsung', blackFriday: true, price: 7 },
    airco('Eligible higher', 875), airco('Eligible lowest', 444)
  ];
  const snapshot = structuredClone(products);
  app.render(products);
  const hero = app.element('#bf-home-spotlight').innerHTML;
  assert.match(hero, /Eligible lowest/);
  assert.match(hero, /data-product-price="444"/);
  for (const p of products.filter(p => p.name !== 'Eligible lowest')) assert.ok(!hero.includes(p.name), p.name);
  assert.deepEqual(products, snapshot);

  app.render(products.filter(p => p.name !== 'Eligible lowest' && p.name !== 'Eligible higher' && p.name !== 'Cheaper tablet'));
  const fallback = app.element('#bf-home-spotlight').innerHTML;
  assert.match(fallback, /bf-spotlight-fallback/);
  assert.match(fallback, /href="#products"/);
  assert.doesNotMatch(fallback, /js-order-btn|data-product-price|Eligible lowest/);
});

test('the themed deals rail includes tagged offers instead of ordinary featured products', async () => {
  const products = [
    { name: 'Ordinary featured phone', category: 'apple', price: 50, featured: true },
    { name: 'Tagged tablet', category: 'samsung', price: 339, blackFriday: true, featured: false },
    airco('Higher airco', 875), airco('Lower airco', 444), airco('Sold campaign item', 10, { soldOut: true }),
    airco('Incorrect string tag', 20, { blackFriday: 'true', featured: true })
  ];
  const app = await boot(products);
  const deals = app.element('#deals .container').innerHTML;
  assert.match(deals, /BLACK FRIDAY PICKS/);
  assert.match(deals, /href="\/blackfriday"/);
  assert.match(deals, /Tagged tablet/);
  assert.match(deals, /Lower airco/);
  assert.match(deals, /Higher airco/);
  assert.doesNotMatch(deals, /Ordinary featured phone|Sold campaign item|Incorrect string tag/);
  assert.ok(deals.indexOf('Lower airco') < deals.indexOf('Higher airco'));
  assert.ok(deals.indexOf('Higher airco') < deals.indexOf('Tagged tablet'));
  assert.equal((deals.match(/class="deal-card"/g) || []).length, 3);

  app.render(products.filter(p => p.blackFriday !== true || p.soldOut));
  assert.equal(app.element('#deals .container').innerHTML, '');
  assert.match(app.element('#bf-home-spotlight').innerHTML, /bf-spotlight-fallback/);
});

test('without the theme the normal featured rail remains and the campaign hero is untouched', async () => {
  const app = await boot([
    { name: 'Ordinary featured phone', category: 'apple', price: 99, featured: true },
    airco('Campaign airco', 444, { featured: false })
  ], { theme: false });
  const deals = app.element('#deals .container').innerHTML;
  assert.match(deals, /Ordinary featured phone/);
  assert.match(deals, /Good finds at Connections/);
  assert.doesNotMatch(deals, /Campaign airco|BLACK FRIDAY PICKS/);
  assert.equal(app.element('#bf-home-spotlight').innerHTML, '');
});
