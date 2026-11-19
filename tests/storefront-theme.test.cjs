const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/products.json'), 'utf8'));

async function boot(products, { theme = true } = {}) {
  const elements = new Map(), events = {}, errors = [];
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
    document, window: { addEventListener() {} }, location: { hash: '' }, history: { replaceState() {} },
    IntersectionObserver: class { observe() {} }, AbortController,
    console: { error: (...args) => errors.push(args), warn: (...args) => errors.push(args) },
    fetch: async url => ({ ok: true, json: async () => url.startsWith('/data/gift-card-store') ? { products: [] } : products }),
    setTimeout() { return 1; }, clearTimeout() {}, setInterval() { return 1; }
  });
  for (const name of ['checkout', 'new-arrivals', 'gift-cards', 'storefront']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8'), context);
  }
  await events.DOMContentLoaded();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(errors, []);
  return { element, render: fixture => context.renderDeals(fixture) };
}

const airco = (name, price, extra = {}) => ({ name, price, category: 'acs', blackFriday: true, image: 'ac-catalog.webp', ...extra });

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
