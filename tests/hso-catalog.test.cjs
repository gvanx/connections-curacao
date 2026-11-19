const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { detailsUrl } = require('../js/hso-catalog.js');

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
