const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { detailsUrl, filterAvailable, fetchInventory } = require('../js/hso-catalog.js');

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
  const inventory = { models: [{ id: 'iphone-15' }], units: [{ modelId: 'iphone-15', serial: 'ABC12345', storage: '128GB', color: 'Black', status: 'available' }] };
  assert.deepEqual(await fetchInventory(async (url, options) => {
    assert.equal(url, '/.netlify/functions/hso-stock');
    assert.equal(options.cache, 'no-store');
    assert.ok(options.signal);
    return { ok: true, json: async () => inventory };
  }), inventory);
  for (const value of [null, [], { units: [] }, { ...inventory, units: [null] },
    { ...inventory, units: [...inventory.units, ...inventory.units] },
    ...[{ serial: 123456 }, { modelId: 'unknown' }, { storage: '' }, { color: '' }, { status: 'yes' }].map(change => ({ ...inventory, units: [{ ...inventory.units[0], ...change }] }))]) {
    assert.equal(await fetchInventory(async () => ({ ok: true, json: async () => value })), null);
  }
  assert.equal(await fetchInventory(async () => ({ ok: false })), null);
  assert.equal(await fetchInventory(async () => { throw new Error('Offline'); }), null);
  assert.deepEqual(await fetchInventory(async () => ({ ok: true, json: async () => ({ models: [], units: [] }) })), { models: [], units: [] });
});
