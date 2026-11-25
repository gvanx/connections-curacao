const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { selectDeals, savings, cardHTML, imageSrc } = require('../blackfriday/deals.js');

const root = path.join(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/products.json'), 'utf8'));
const script = fs.readFileSync(path.join(root, 'blackfriday/deals.js'), 'utf8');
const hsoCatalog = require('../js/hso-catalog.js');
const { stockFixture } = require('./helpers/hso-fixture.cjs');
const stock = stockFixture(JSON.parse(fs.readFileSync(path.join(root, 'data/hso-stock.json'), 'utf8')), catalog);

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

test('tagged tablets, phones and laptops keep checkout and savings aligned with the catalog', () => {
  const offers = selectDeals(catalog).filter(p => ['samsung', 'laptops'].includes(p.category));
  assert.ok(offers.length >= 2);
  for (const p of offers) {
    const html = cardHTML(p);
    assert.ok(html.includes(`data-product-price="${p.price}"`));
    assert.match(html, /js-order-btn/);
    if (savings(p) > 0) {
      assert.match(html, /<del>/);
      assert.ok(html.includes(`Save XCG ${savings(p).toLocaleString('en-US')}`));
    } else {
      assert.doesNotMatch(html, /<del>|Save XCG/);
    }
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

function browser(fetch, { spotlight = true, inventory, localStorage, hash = '' } = {}) {
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
  const events = {}, intervals = [];
  let sourceProducts = [];
  const window = {
    HSOCatalog: hsoCatalog,
    location: { hash },
    history: { replaceState(_state, _title, hash) { window.location.hash = hash; } },
    ...(localStorage ? { localStorage } : {}),
    document: { hidden: false, getElementById: id => elements.get(id), addEventListener(type, callback) { events[type] = callback; } },
    fetch: async (url, options) => {
      if (url === '/.netlify/functions/hso-stock') return { ok: true, json: async () => {
        if (inventory) return inventory();
        const ids = new Set(sourceProducts.filter(product => product.suffix === 'HSO').map(product => product.hsoModel));
        return { ...stock, models: stock.models.filter(model => ids.has(model.id)), variants: stock.variants.filter(variant => ids.has(variant.modelId)), units: stock.units.filter(unit => ids.has(unit.modelId)) };
      } };
      const response = await fetch(url, options);
      return { ...response, json: async () => { sourceProducts = await response.json(); return sourceProducts; } };
    },
    addEventListener(type, callback) { events[type] = callback; },
    initCheckoutModal() { initialized++; },
    attachOrderButtons(scope) {
      assert.ok(['bf-products', 'bf-spotlight'].includes(scope.id));
      boundScopes.push(scope.id);
    }
  };
  vm.runInNewContext(script, {
    window, AbortController,
    setTimeout(callback) { timers.set(++nextTimer, callback); return nextTimer; },
    clearTimeout(id) { timers.delete(id); },
    setInterval(callback, delay) { intervals.push({ callback, delay }); }
  });
  return { elements, timers, boundScopes, events, intervals, document: window.document, location: window.location, get initialized() { return initialized; } };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

test('appliance deep link includes all 26 exact offers, groups aircos and TVs, sorts globally and keeps phone tabs separate', async () => {
  const expected = {
    'SN 023': 19, 'SN 025': 19, 'SN 026': 25, 'DL 9258': 29,
    'SN 138': 29, 'SN 107': 29, 'DL 9272': 29, 'BKMC 7003': 39,
    'BKSM 9817': 39, 'BKSM 002': 39, 'BKSM 021': 39, 'BKPTB 2334 BK': 69,
    'BKPB 6076': 89, 'BK18SF 9917': 45, 'BHS 10461': 69, 'BKAC 12 K 9652': 519,
    'TV-954432H': 199, 'TV-9480SF40WFN': 349, 'TV-9308SF50WKL': 599,
    '55" UHD Smart TV (Whale OS)': 649, '60" UHD Smart TV': 875, 'TV-9304SF65WKL': 925,
    'Premier 9,000 BTU Inverter AC': 444, 'Premier 18,000 BTU Inverter AC': 875,
    'Premier 24,000 BTU Inverter AC': 1099, 'Premier 36,000 BTU Inverter AC': 1799
  };
  const aircoOldPrices = {
    'Premier 9,000 BTU Inverter AC': 650, 'Premier 18,000 BTU Inverter AC': 1150,
    'Premier 24,000 BTU Inverter AC': 1390, 'Premier 36,000 BTU Inverter AC': 2100
  };
  const offers = selectDeals(catalog, 'appliances');
  assert.deepEqual(Object.fromEntries(offers.map(p => [p.sku || p.name, p.price])), expected);
  const tvIdentifiers = ['TV-954432H', 'TV-9480SF40WFN', 'TV-9308SF50WKL',
    '55" UHD Smart TV (Whale OS)', '60" UHD Smart TV', 'TV-9304SF65WKL'];
  for (const identifier of tvIdentifiers) {
    const matching = catalog.filter(p => p.sku === identifier || p.suffix === identifier || p.name === identifier);
    assert.equal(matching.length, 1, `${identifier} must have one catalog listing`);
    const tv = matching[0];
    assert.equal(tv.category, 'tvs');
    if (identifier.startsWith('TV-')) assert.equal(tv.model, identifier);
    else {
      assert.equal(tv.model, undefined, 'An obscured model must not be invented');
      assert.equal(tv.sku, undefined, 'An obscured SKU must not be invented');
    }
    assert.equal(tv.applianceGroup, 'televisions');
    assert.equal(tv.inquiryOnly, false);
    assert.equal(tv.price, expected[identifier]);
    assert.equal(tv.image, '/img/products/tv-catalog.webp');
    assert.equal(tv.imagePlaceholder, true);
    assert.ok(fs.existsSync(path.join(root, tv.image)), `${identifier} placeholder exists`);
    assert.ok(cardHTML(tv).includes(`src="${tv.image}"`));
    assert.match(cardHTML(tv), /alt="[^"]+ — illustration"/);
  }
  for (const p of offers) {
    const html = cardHTML(p);
    assert.match(html, /js-order-btn/);
    assert.match(html, /Checkout &amp; Pay/);
    assert.doesNotMatch(html, /Ask availability|wa\.me/);
    if (Object.hasOwn(aircoOldPrices, p.name)) {
      assert.equal(catalog.filter(item => item.name === p.name).length, 1);
      assert.equal(p.category, 'acs');
      assert.equal(p.applianceGroup, 'cooling');
      assert.equal(p.oldPrice, aircoOldPrices[p.name]);
      assert.equal(p.image, 'ac-catalog.webp');
      assert.match(html, /<del>/);
      assert.ok(html.includes(`Save XCG ${p.oldPrice - p.price}`));
    } else assert.doesNotMatch(html, /<del>|Save XCG/);
    assert.equal(Number(html.match(/data-product-price="([^"]+)"/)[1]), expected[p.sku || p.name]);
    const checkoutName = decodeURIComponent(html.match(/data-product-name="([^"]+)"/)[1]);
    assert.equal(checkoutName, [p.name, p.suffix].filter(Boolean).join(' '));
    assert.ok(checkoutName.includes(p.sku || p.name));
  }
  const app = browser(async () => ({ ok: true, json: async () => catalog }), { hash: '#appliances' });
  await flush();
  const e = id => app.elements.get(id);
  assert.equal(e('bf-count').textContent, '26 Black Friday deals');
  const groups = [...e('bf-products').innerHTML.matchAll(/<section class="bf-appliance-group"[^>]*>([\s\S]*?)<\/section>/g)];
  assert.deepEqual(groups.map(group => (group[1].match(/<article /g) || []).length), [8, 6, 6, 6]);
  const coolingGroup = groups.find(group => /<h3>Fans &(?:amp;)? air conditioning<\/h3>/.test(group[1]));
  assert.ok(coolingGroup, 'Fans and all five aircos share the cooling group');
  assert.deepEqual([...coolingGroup[1].matchAll(/data-product-price="([^"]+)"/g)].map(match => Number(match[1])),
    [45, 444, 519, 875, 1099, 1799]);
  assert.equal((coolingGroup[1].match(/src="\/img\/products\/ac-catalog\.webp"/g) || []).length, 4);
  const televisionGroup = groups.find(group => /<h3>Televisions<\/h3>/.test(group[1]));
  assert.ok(televisionGroup, 'Televisions has a dedicated appliance group');
  assert.deepEqual([...televisionGroup[1].matchAll(/data-product-price="([^"]+)"/g)].map(match => Number(match[1])),
    [199, 349, 599, 649, 875, 925]);
  assert.match(e('bf-products').innerHTML, /Personal care/);
  assert.match(e('bf-products').innerHTML, /Kitchen essentials/);
  assert.match(e('bf-products').innerHTML, /Fans &amp; air conditioning|Fans & air conditioning/);
  assert.match(e('bf-products').innerHTML, /Televisions/);
  assert.doesNotMatch(e('bf-products').innerHTML, /iPhone|Galaxy/);
  assert.equal((e('bf-products').innerHTML.match(/js-order-btn/g) || []).length, 26);
  assert.equal((e('bf-products').innerHTML.match(/<del>/g) || []).length, 4);
  assert.doesNotMatch(e('bf-products').innerHTML, /Ask availability/);
  e('bf-sort').value = 'price-asc';
  e('bf-sort').listeners.change();
  assert.doesNotMatch(e('bf-products').innerHTML, /bf-appliance-group/);
  const prices = [...e('bf-products').innerHTML.matchAll(/<strong>XCG ([\d,]+)<\/strong>/g)].map(m => Number(m[1].replace(/,/g, '')));
  assert.deepEqual(prices, Object.values(expected).sort((a, b) => a - b));
  const samsung = e('bf-filters').buttons.find(button => button.dataset.category === 'samsung');
  e('bf-filters').listeners.click({ target: samsung });
  assert.equal(app.location.hash, '#samsung');
  assert.doesNotMatch(e('bf-products').innerHTML, /SN 023|BKAC 12 K 9652|TV-954432H|TV-9480SF40WFN|TV-9308SF50WKL|TV-9304SF65WKL|55&quot; UHD Smart TV|60&quot; UHD Smart TV/);
  assert.match(e('bf-products').innerHTML, /Galaxy/);
  assert.doesNotMatch(e('bf-products').innerHTML, /Premier [\d,]+ BTU Inverter AC/);
  const aircos = e('bf-filters').buttons.find(button => button.dataset.category === 'acs');
  e('bf-filters').listeners.click({ target: aircos });
  assert.equal(app.location.hash, '#acs');
  assert.equal(e('bf-count').textContent, '5 Black Friday deals');
  assert.deepEqual([...e('bf-products').innerHTML.matchAll(/data-product-price="([^"]+)"/g)].map(match => Number(match[1])),
    [444, 519, 875, 1099, 1799]);
  const televisions = e('bf-filters').buttons.find(button => button.dataset.category === 'tvs');
  e('bf-filters').listeners.click({ target: televisions });
  assert.equal(app.location.hash, '#tvs');
  assert.equal(e('bf-count').textContent, '6 Black Friday deals');
  const tvPrices = [...e('bf-products').innerHTML.matchAll(/data-product-price="([^"]+)"/g)].map(match => Number(match[1]));
  assert.deepEqual(tvPrices, [199, 349, 599, 649, 875, 925]);
  assert.doesNotMatch(e('bf-products').innerHTML, /Galaxy|SN 023|BKAC 12 K 9652/);
  app.location.hash = '#appliances';
  app.events.hashchange();
  assert.equal(e('bf-count').textContent, '26 Black Friday deals');
  assert.match(e('bf-products').innerHTML, /BKAC 12 K 9652/);
  assert.equal(e('bf-filters').buttons.find(button => button.dataset.category === 'appliances').attributes['aria-pressed'], 'true');
});

test('live HSO stock updates Black Friday cards without losing ordinary deals or restocked phones', async () => {
  const phone = { name: 'Managed iPhone', suffix: 'HSO', hsoModel: 'iphone-15', hsoStorage: '128GB', category: 'apple', price: 1099, blackFriday: true };
  const ordinary = { name: 'Ordinary airco', category: 'acs', price: 444, blackFriday: true };
  const available = stockFixture({ models: [{ id: 'iphone-15' }], units: [{ modelId: 'iphone-15', serial: 'ABC12345', storage: '128GB', color: 'Black', status: 'available' }] }, [phone]);
  let inventory = available;
  const app = browser(async () => ({ ok: true, json: async () => [phone, ordinary] }), { inventory: () => inventory });
  await flush();
  const grid = app.elements.get('bf-products');
  assert.match(grid.innerHTML, /Managed iPhone/);
  inventory = { ...available, units: [] };
  await app.events.focus();
  assert.doesNotMatch(grid.innerHTML, /Managed iPhone/);
  assert.match(grid.innerHTML, /Ordinary airco/);
  assert.equal(app.elements.get('bf-count').textContent, '1 Black Friday deal');
  inventory = available;
  await app.events.online();
  assert.match(grid.innerHTML, /Managed iPhone/);
  inventory = null;
  app.intervals.find(timer => timer.delay === 30000).callback();
  await flush();
  assert.doesNotMatch(grid.innerHTML, /Managed iPhone/);
  assert.equal(app.elements.get('bf-error').hidden, true);
  assert.match(app.elements.get('bf-spotlight').innerHTML, /data-product-price="444"/);
  inventory = available;
  app.document.hidden = true;
  app.intervals[0].callback();
  await flush();
  assert.doesNotMatch(grid.innerHTML, /Managed iPhone/);
  app.document.hidden = false;
  app.events.visibilitychange();
  await flush();
  assert.match(grid.innerHTML, /Managed iPhone/);
});

test('Black Friday discovers new models and uses campaign-only live prices instead of a cheaper regular phone', async () => {
  const model = { id: 'hso-tablet-1234567890', name: 'New Tablet' };
  const variant = { modelId: model.id, storage: '128GB', color: '', price: 500, oldPrice: null, blackFriday: false, category: 'samsung', image: null };
  let inventory = { schemaVersion: 2, models: [], variants: [], units: [] };
  const app = browser(async () => ({ ok: true, json: async () => [] }), { inventory: () => inventory });
  await flush();
  inventory = { schemaVersion: 2, models: [model], variants: [variant], units: [
    { ...variant, color: 'Black', serial: 'SERIAL001', status: 'available' },
    { ...variant, color: 'Silver', serial: 'SERIAL002', status: 'available', price: 600, oldPrice: 750, blackFriday: true }
  ] };
  await app.events.focus();
  const grid = app.elements.get('bf-products');
  assert.match(grid.innerHTML, /New Tablet 128GB/);
  assert.match(grid.innerHTML, /XCG 600/);
  assert.match(grid.innerHTML, /Save XCG 150/);
  assert.doesNotMatch(grid.innerHTML, /XCG 500|From XCG/);
  inventory.units[1].price = 550;
  await app.events.online();
  assert.match(grid.innerHTML, /XCG 550/);
  assert.match(grid.innerHTML, /Save XCG 200/);
  inventory.units.pop();
  await app.events.focus();
  assert.doesNotMatch(grid.innerHTML, /New Tablet/);
  assert.equal(app.elements.get('bf-empty').hidden, false);
});

test('per-phone Black Friday prices stay separate from identical noncampaign phones and show only supported savings', async () => {
  const variant = { modelId: 'iphone-15', storage: '128GB', color: '', price: 9999, oldPrice: 11999, blackFriday: false, category: 'apple', image: null };
  let inventory = { schemaVersion: 2, models: [{ id: 'iphone-15', name: 'iPhone 15' }], variants: [variant], units: [
    { ...variant, serial: 'SERIAL001', color: 'Black', status: 'available', price: 990, oldPrice: 1250, blackFriday: false },
    { ...variant, serial: 'SERIAL002', color: 'Black', status: 'available', price: 1099, oldPrice: 1350, blackFriday: true },
    { ...variant, serial: 'SERIAL003', color: 'Black', status: 'available', price: 1190, oldPrice: 1490, blackFriday: true }
  ] };
  const app = browser(async () => ({ ok: true, json: async () => [] }), { inventory: () => inventory });
  await flush();
  const grid = app.elements.get('bf-products');
  assert.match(grid.innerHTML, /From XCG 1,099/);
  assert.doesNotMatch(grid.innerHTML, /XCG 990|<del>|Save XCG|XCG 9,999/);
  inventory.units = inventory.units.filter(unit => unit.serial !== 'SERIAL002');
  await app.events.focus();
  assert.match(grid.innerHTML, /XCG 1,190/);
  assert.match(grid.innerHTML, /XCG 1,490/);
  assert.match(grid.innerHTML, /Save XCG 300/);
  assert.doesNotMatch(grid.innerHTML, /From XCG|XCG 1,099|XCG 1,350/);
  inventory.units[1].blackFriday = false;
  await app.events.online();
  assert.doesNotMatch(grid.innerHTML, /iPhone 15/);
});

test('Black Friday feed failures hide legacy HSO on cold load and after a previously healthy registry', async () => {
  const legacy = { name: 'iPhone 12', suffix: 'HSO', category: 'apple', price: 549, blackFriday: true };
  const ordinary = { name: 'Available airco', category: 'acs', price: 444, blackFriday: true };
  let inventory = null;
  const app = browser(async () => ({ ok: true, json: async () => [legacy, ordinary] }), { inventory: () => inventory });
  await flush();
  const grid = app.elements.get('bf-products');
  assert.doesNotMatch(grid.innerHTML, /iPhone 12|XCG 549/);
  assert.match(grid.innerHTML, /Available airco/);
  inventory = { schemaVersion: 2, models: [], variants: [], units: [] };
  await app.events.focus();
  assert.match(grid.innerHTML, /iPhone 12/);
  inventory = null;
  await app.events.online();
  assert.doesNotMatch(grid.innerHTML, /iPhone 12|XCG 549/);
  assert.match(grid.innerHTML, /data-product-price="444"/);
});

test('a stock-feed outage reuses recent good stock across loads but never stale or sold-out stock', async () => {
  const values = new Map();
  const localStorage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value))
  };
  const legacy = { name: 'Managed iPhone', suffix: 'HSO', hsoModel: 'iphone-15', hsoStorage: '128GB', category: 'apple', price: 1099, blackFriday: true };
  const ordinary = { name: 'Available airco', category: 'acs', price: 444, blackFriday: true };
  const available = stockFixture({ models: [{ id: 'iphone-15' }], units: [
    { modelId: 'iphone-15', serial: 'ABC12345', storage: '128GB', color: 'Black', status: 'available' }
  ] }, [legacy]);
  let inventory = available;
  const fetchProducts = async () => ({ ok: true, json: async () => [legacy, ordinary] });
  const app = browser(fetchProducts, { inventory: () => inventory, localStorage });
  await flush();
  const grid = app.elements.get('bf-products');
  assert.match(grid.innerHTML, /Managed iPhone/);
  assert.ok(values.has('bf-hso-stock-v1'));

  inventory = null;
  await app.events.online();
  assert.match(grid.innerHTML, /Managed iPhone/);

  const cold = browser(fetchProducts, { inventory: () => null, localStorage });
  await flush();
  assert.match(cold.elements.get('bf-products').innerHTML, /Managed iPhone/);

  inventory = { ...available, units: [] };
  await app.events.focus();
  assert.doesNotMatch(grid.innerHTML, /Managed iPhone/);
  assert.match(grid.innerHTML, /Available airco/);

  const saved = JSON.parse(values.get('bf-hso-stock-v1'));
  saved.savedAt = Date.now() - 31 * 60 * 1000;
  values.set('bf-hso-stock-v1', JSON.stringify(saved));
  const expired = browser(fetchProducts, { inventory: () => null, localStorage });
  await flush();
  assert.doesNotMatch(expired.elements.get('bf-products').innerHTML, /Managed iPhone/);
  assert.match(expired.elements.get('bf-products').innerHTML, /Available airco/);
});

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
  assert.match(e('bf-spotlight').innerHTML, /<h2 class="sr-only">Featured Black Friday deal<\/h2>/);
  assert.match(e('bf-spotlight').innerHTML, /Premier 9,000 BTU Inverter AC/);
  assert.match(e('bf-spotlight').innerHTML, /js-order-btn/);
  assert.match(e('bf-spotlight').innerHTML, /data-product-price="444"/);
  assert.doesNotMatch(e('bf-spotlight').innerHTML, /Galaxy Tab|Chromebook/);
  const airco = e('bf-filters').buttons.find(button => button.dataset.category === 'acs');
  e('bf-filters').listeners.click({ target: airco });
  assert.equal(e('bf-count').textContent, '5 Black Friday deals');
  assert.equal(airco.attributes['aria-pressed'], 'true');
  assert.doesNotMatch(e('bf-products').innerHTML, /Galaxy Tab/);
  e('bf-sort').value = 'price-desc';
  e('bf-sort').listeners.change();
  assert.ok(e('bf-products').innerHTML.indexOf('36,000') < e('bf-products').innerHTML.indexOf('9,000'));
  for (const scope of ['bf-products', 'bf-spotlight']) {
    const frame = { innerHTML: '<img src="/missing.webp">' };
    e(scope).listeners.error({ target: {
      tagName: 'IMG', alt: 'Missing <model>', parentElement: frame,
      closest(selector) { if (selector === '.hso-product-link') return null; assert.equal(selector, '.bf-card-image'); return frame; }
    } });
    assert.match(frame.innerHTML, /Missing &lt;model&gt;/);
    assert.doesNotMatch(frame.innerHTML, /<img/);
  }
  assert.equal(app.timers.size, 0);
});

test('missing HSO artwork keeps the clickable model link intact', async () => {
  const app = browser(async () => ({ ok: true, json: async () => [] }));
  await flush();
  const link = { innerHTML: '<img src="/missing.webp">', href: '/hso/?model=iphone-15' };
  const frame = { innerHTML: 'Original card frame' };
  app.elements.get('bf-products').listeners.error({ target: {
    tagName: 'IMG', alt: 'iPhone 15 HSO', parentElement: frame,
    closest(selector) { return selector === '.hso-product-link' ? link : frame; }
  } });
  assert.match(link.innerHTML, /iPhone 15 HSO/);
  assert.equal(link.href, '/hso/?model=iphone-15');
  assert.equal(frame.innerHTML, 'Original card frame');
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
