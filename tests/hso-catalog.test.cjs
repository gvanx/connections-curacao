const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { detailsUrl, filterAvailable, projectCatalog, campaignProduct, safeImage, fetchInventory } = require('../js/hso-catalog.js');
const { stockFixture } = require('./helpers/hso-fixture.cjs');

const priceVariant = (modelId, storage, price, extra = {}) => ({ modelId, storage, color: '', price, oldPrice: null, blackFriday: false, category: 'apple', image: null, ...extra });
const phoneUnit = (variant, serial, extra = {}) => ({ ...variant, serial, color: 'Black', batteryHealth: 90, status: 'available', ...extra });

test('HSO detail URLs preserve exact model, storage and color without turning data into URL parameters', () => {
  const product = { suffix: 'HSO', hsoModel: 'iphone-16-pro-max', hsoStorage: ' 512GB ', hsoColor: 'White & Gold' };
  const url = new URL(detailsUrl(product), 'https://connectionscuracao.net');
  assert.equal(url.pathname, '/hso/');
  assert.equal(url.searchParams.get('model'), 'iphone-16-pro-max');
  assert.equal(url.searchParams.get('storage'), '512GB');
  assert.equal(url.searchParams.get('color'), 'White & Gold');
  assert.equal([...url.searchParams].length, 3);
  assert.equal(detailsUrl({ suffix: 'HSO', hsoModel: 'iphone-15' }), '/hso/?model=iphone-15');
});

test('only explicitly managed HSO models get a local selector route', () => {
  for (const value of [null, {}, { suffix: 'HSO' }, { suffix: '', hsoModel: 'iphone-15' }]) {
    assert.equal(detailsUrl(value), '');
  }
  for (const hsoModel of ['../iphone-15', 'https://example.com', 'iphone-15?storage=512GB',
    'iPhone-15', '', '<script>', 'a'.repeat(81), 15]) {
    assert.equal(detailsUrl({ suffix: 'HSO', hsoModel }), '');
  }
});

test('published pages load HSO routing before their renderers and main navigation stays on the main site', () => {
  const root = path.resolve(__dirname, '..');
  const main = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const campaign = fs.readFileSync(path.join(root, 'blackfriday/index.html'), 'utf8');
  assert.equal((main.match(/href="\/hso\/"/g) || []).length, 4);
  assert.doesNotMatch(main, /hso2\.connectionscuracao\.net/);
  for (const [html, renderer] of [[main, 'js/storefront.js'], [campaign, 'blackfriday/deals.js']]) {
    const helper = html.indexOf('js/hso-catalog.js');
    assert.ok(helper > 0 && helper < html.indexOf(renderer));
  }
});

test('live availability filters only managed HSO and respects storage, color and status without mutating catalog', () => {
  const base = { suffix: 'HSO', hsoModel: 'iphone-15', hsoStorage: '128GB' };
  const products = [
    { ...base, name: 'Any color' }, { ...base, name: 'Black', hsoColor: 'Black' },
    { ...base, name: 'Pink', hsoColor: 'Pink' }, { ...base, name: '256GB', hsoStorage: '256GB' },
    { ...base, name: 'Different model', hsoModel: 'iphone-14' },
    { name: 'Unmanaged HSO', suffix: 'HSO' }, { name: 'New phone', hsoModel: 'iphone-15' }
  ];
  const inventory = { units: [{ modelId: 'iphone-15', storage: ' 128gb ', color: ' black ', status: 'available' }] };
  const snapshot = structuredClone(products);
  assert.deepEqual(filterAvailable(products, inventory).map(p => p.name), ['Any color', 'Black', 'Unmanaged HSO', 'New phone']);
  for (const status of ['reserved', 'sold', '', 'Available']) {
    inventory.units[0].status = status;
    assert.deepEqual(filterAvailable(products, inventory).map(p => p.name), ['Unmanaged HSO', 'New phone']);
  }
  for (const unavailable of [null, {}, { units: [] }]) {
    assert.deepEqual(filterAvailable(products, unavailable).map(p => p.name), ['Unmanaged HSO', 'New phone']);
  }
  inventory.units[0].status = 'available';
  assert.equal(filterAvailable(products, inventory).length, 4);
  assert.deepEqual(products, snapshot);
});

test('live fetch uses the uncached same-origin endpoint and fails closed on errors or invalid units', async () => {
  const inventory = stockFixture({ models: [{ id: 'iphone-15', name: 'iPhone 15' }], units: [{ modelId: 'iphone-15', serial: 'ABC12345', storage: '128GB', color: 'Black', status: 'available' }] });
  assert.deepEqual(await fetchInventory(async (url, options) => {
    assert.equal(url, '/.netlify/functions/hso-stock');
    assert.equal(options.cache, 'no-store');
    assert.ok(options.signal);
    return { ok: true, json: async () => inventory };
  }), inventory);
  for (const value of [null, [], { units: [] }, { ...inventory, units: [null] },
    { ...inventory, units: [...inventory.units, ...inventory.units] },
    ...[{ serial: 123456 }, { modelId: 'unknown' }, { storage: 'banana' }, { color: '' }, { status: 'yes' }].map(change => ({ ...inventory, units: [{ ...inventory.units[0], ...change }] }))]) {
    assert.equal(await fetchInventory(async () => ({ ok: true, json: async () => value })), null);
  }
  assert.equal(await fetchInventory(async () => ({ ok: false })), null);
  assert.equal(await fetchInventory(async () => { throw new Error('Offline'); }), null);
  const empty = { schemaVersion: 2, models: [], variants: [], units: [] };
  assert.deepEqual(await fetchInventory(async () => ({ ok: true, json: async () => empty })), empty);
});

test('live projections replace only claimed legacy variants, retain claims at zero stock, and add new devices', () => {
  const base = [
    { name: 'iPhone 12', suffix: 'HSO', price: 549 },
    { name: 'iPhone 12', suffix: '', price: 799 },
    { name: 'iPhone 16', suffix: 'HSO', price: 1350 },
    { name: 'iPhone 15 Pro Max 512GB Black Titanium', suffix: 'HSO', price: 1599, specifications: { Storage: '512GB', Color: 'Black Titanium' } },
    { name: 'MacBook Pro 13-inch (2020) 256GB/8GB', suffix: 'HSO', price: 1290 },
    { name: 'Ordinary television', price: 500 }
  ];
  const variants = [priceVariant('iphone-12', '128GB', 399), priceVariant('iphone-15-pro-max', '256GB', 1499),
    priceVariant('hso-controller-1234567890', '', 89, { category: 'other' })];
  const inventory = { schemaVersion: 2,
    models: [{ id: 'iphone-12', name: 'iPhone 12' }, { id: 'iphone-15-pro-max', name: 'iPhone 15 Pro Max' }, { id: 'hso-controller-1234567890', name: 'Wireless Controller' }],
    variants, units: variants.map((variant, index) => phoneUnit(variant, 'SERIAL00' + index)) };
  const snapshot = structuredClone(base);
  const projected = projectCatalog(base, inventory);
  assert.equal(projected.filter(product => product.name.startsWith('iPhone 12') && product.suffix === 'HSO').length, 1);
  assert.equal(projected.find(product => product.hsoModel === 'iphone-12').price, 399);
  for (const retained of base.slice(1)) assert.ok(projected.includes(retained));
  const controller = projected.find(product => product.hsoModel === 'hso-controller-1234567890');
  assert.equal(controller.category, 'other');
  assert.equal(detailsUrl(controller), '/hso/?model=hso-controller-1234567890');
  assert.equal(controller.imageUnavailable, true);
  const sold = projectCatalog(base, { ...inventory, units: [] });
  assert.equal(sold.includes(base[0]), false);
  assert.equal(sold.includes(base[3]), true);
  const claimed512 = { ...inventory, units: [], variants: [...variants, priceVariant('iphone-15-pro-max', '512GB', 1550)] };
  assert.equal(projectCatalog(base, claimed512).includes(base[3]), false);
  const claimedLaptop = { ...inventory, units: [], models: [...inventory.models, { id: 'macbook-pro-2020', name: 'MacBook Pro 13-inch (2020)' }],
    variants: [...variants, priceVariant('macbook-pro-2020', '256GB', 1290, { category: 'laptops' })] };
  assert.equal(projectCatalog(base, claimedLaptop).includes(base[4]), false);
  assert.deepEqual(base, snapshot);
});

test('live prices override stale catalog state and unchanged polls reuse cards while price changes replace them', () => {
  const variant = priceVariant('iphone-15', '128GB', 1000, { oldPrice: 1300, blackFriday: true });
  const inventory = { schemaVersion: 2, models: [{ id: 'iphone-15', name: 'iPhone 15' }], variants: [variant], units: [phoneUnit(variant, 'SERIAL001')] };
  const base = [{ name: 'iPhone 15', suffix: 'HSO', hsoModel: 'iphone-15', hsoStorage: '128GB', price: 1099,
    oldPrice: 1350, soldOut: true, inquiryOnly: true, spec: 'Old battery health 55%', featured: true }];
  const [live] = projectCatalog(base, inventory);
  assert.equal(live.price, 1000);
  assert.equal(live.oldPrice, 1300);
  assert.equal(live.soldOut, undefined);
  assert.equal(live.inquiryOnly, undefined);
  assert.doesNotMatch(live.spec, /55%/);
  const unchanged = projectCatalog(base, { ...structuredClone(inventory), syncedAt: 'later' }, { previous: [live] });
  assert.equal(unchanged[0], live);
  const changed = structuredClone(inventory); changed.units[0].price = 950;
  const [updated] = projectCatalog(base, changed, { previous: [live] });
  assert.notEqual(updated, live);
  assert.equal(updated.price, 950);
  changed.units[0].price = null; changed.units[0].oldPrice = null;
  const [unpriced] = projectCatalog(base, changed);
  assert.equal(unpriced.price, null);
  assert.equal(unpriced.oldPrice, null);
});

test('color price overrides form one card and Black Friday advertises only eligible-unit prices and savings', () => {
  const generic = priceVariant('iphone-15', '128GB', 500);
  const color = priceVariant('iphone-15', '128GB', 600, { color: 'Pink', oldPrice: 750, blackFriday: true });
  const inventory = { schemaVersion: 2, models: [{ id: 'iphone-15', name: 'iPhone 15' }], variants: [generic, color],
    units: [phoneUnit(generic, 'SERIAL001'), phoneUnit(color, 'SERIAL002', { color: 'Pink' })] };
  const cards = projectCatalog([], inventory);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].price, 500);
  assert.equal(cards[0].hsoPriceFrom, true);
  assert.equal(cards[0].oldPrice, null);
  const campaign = campaignProduct(cards[0]);
  assert.equal(campaign.price, 600);
  assert.equal(campaign.oldPrice, 750);
  assert.equal(campaign.hsoPriceFrom, false);
  assert.equal(campaign.hsoUnitCount, 1);
  const withoutCampaignStock = projectCatalog([], { ...inventory, units: [inventory.units[0]] });
  assert.equal(withoutCampaignStock[0].blackFriday, false);
  assert.equal(withoutCampaignStock[0].hsoBlackFridayOffer, undefined);
});

test('sheet images support local product assets and HTTPS without executable or credential-bearing URLs', () => {
  assert.equal(safeImage('/img/products/model.jpg'), '/img/products/model.jpg');
  assert.equal(safeImage('https://example.com/model.png'), 'https://example.com/model.png');
  for (const value of ['javascript:alert(1)', 'http://example.com/model.png', '//example.com/a.png', '/img/products/../../x', 'https://user:pass@example.com/a.png']) assert.equal(safeImage(value), '');
});

test('an unavailable current registry hides every HSO row, including legacy entries newly claimed in the sheet', () => {
  const legacy = { name: 'iPhone 12', suffix: 'HSO', price: 549 };
  const managed = { name: 'iPhone 15', suffix: 'HSO', hsoModel: 'iphone-15', price: 1099 };
  const ordinary = { name: 'New phone', price: 700 };
  for (const inventory of [null, undefined, { schemaVersion: 1, models: [], units: [] }]) {
    assert.deepEqual(projectCatalog([legacy, managed, ordinary], inventory), [ordinary]);
  }
  const healthy = { schemaVersion: 2, models: [], variants: [], units: [] };
  assert.deepEqual(projectCatalog([legacy, ordinary], healthy), [legacy, ordinary]);
});
