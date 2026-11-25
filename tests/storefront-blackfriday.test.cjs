const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stockFixture } = require('./helpers/hso-fixture.cjs');

async function boot(hash = '#blackfriday', suppliedProducts) {
  const elements = new Map(), documentEvents = {}, windowEvents = {}, errors = [];
  const products = suppliedProducts || [
    { name: 'Campaign tablet', price: 339, category: 'samsung', blackFriday: true },
    { name: 'Campaign airco', price: 444, oldPrice: 650, category: 'acs', blackFriday: true, inquiryOnly: false, featured: true,
      image: 'ac-catalog.webp' },
    { name: 'Ordinary phone', price: 299, category: 'samsung', blackFriday: false },
    { name: 'Mistagged phone', price: 199, category: 'samsung', blackFriday: 'true' }
  ];
  function element(key) {
    if (!elements.has(key)) elements.set(key, {
      innerHTML: '', style: {}, value: '', dataset: {}, events: {}, attributes: {}, children: [],
      replaceChildren() { this.children = []; }, appendChild(child) { this.children.push(child); },
      classList: { toggle() {}, remove() {}, add() {}, contains() { return false; } },
      querySelector: selector => element(key + ' ' + selector),
      querySelectorAll(selector) { return selector === '.pf-pill' ? pills : []; },
      closest: selector => element(selector), scrollIntoView() {},
      addEventListener(name, callback) { this.events[name] = callback; },
      setAttribute(name, value) { this.attributes[name] = value; }
    });
    return elements.get(key);
  }
  const pills = ['all', 'blackfriday', 'samsung', 'acs', 'blackfriday-appliances', 'tvs'].map(category => {
    const pill = element('pill:' + category); pill.dataset.cat = category; return pill;
  });
  const document = {
    hidden: false, body: element('body'), getElementById: id => element('#' + id), createElement: tag => ({ tagName: tag }),
    querySelector: element, querySelectorAll: selector => selector === '.pf-pill' ? pills : [],
    addEventListener(name, callback) { (documentEvents[name] ||= []).push(callback); }
  };
  const location = { hash };
  let searchDebounce;
  const context = vm.createContext({
    Date, AbortController, document, location, window: { addEventListener(name, callback) { windowEvents[name] = callback; } },
    history: { replaceState(_state, _title, hash) { location.hash = hash; } },
    IntersectionObserver: class { observe() {} }, console: { error: (...args) => errors.push(args.map(String).join(' ')) },
    fetch: async url => ({ ok: true, json: async () => url === '/.netlify/functions/hso-stock' ?
      stockFixture(JSON.parse(fs.readFileSync(path.join(__dirname, '../data/hso-stock.json'), 'utf8')), products) : products }),
    setTimeout(callback, delay) { if (delay === 150) searchDebounce = callback; }, clearTimeout() {}, setInterval() {}
  });
  for (const name of ['checkout', 'new-arrivals', 'gift-cards', 'hso-catalog', 'storefront']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', name + '.js'), 'utf8'), context);
  }
  for (const callback of documentEvents.DOMContentLoaded) await callback();
  assert.deepEqual(errors, []);
  return { element, pills, location, windowEvents, flushSearch() { searchDebounce?.(); } };
}

test('Black Friday deep link selects only explicitly tagged offers with checkout enabled for authorized aircos', async () => {
  const h = await boot();
  const html = h.element('#product-results').innerHTML;
  assert.match(html, /Black Friday · 2 results/);
  assert.match(html, /Campaign tablet/);
  assert.match(html, /Campaign airco/);
  assert.doesNotMatch(html, /Ordinary phone|Mistagged phone/);
  assert.match(html, /data-product-price="339"/);
  assert.match(html, /data-product-price="444"/);
  assert.doesNotMatch(html, /Ask availability/);
  assert.equal(h.pills[1].attributes['aria-pressed'], 'true');
  assert.match(h.element('#product-toolbar').innerHTML, /Black Friday <span class="pf-pill-total">2<\/span>/);
});

test('catalog and featured cards display the clean airco catalog image', async () => {
  const h = await boot();
  for (const id of ['#product-results', '#deals .container']) {
    const html = h.element(id).innerHTML;
    assert.match(html, /src="img\/products\/ac-catalog\.webp" alt="Campaign airco"/);
    assert.match(html, /data-product-price="444"/);
  }
});

test('all four published Premier Black Friday aircos have the clean catalog image and advertised checkout price', async () => {
  const products = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/products.json'), 'utf8'))
    .filter(product => product.category === 'acs' && product.blackFriday === true && product.name.startsWith('Premier '));
  assert.equal(products.length, 4);
  const h = await boot('#blackfriday', products);
  const html = h.element('#product-results').innerHTML;
  assert.equal((html.match(/src="img\/products\/ac-catalog\.webp"/g) || []).length, 4);
  for (const price of [444, 875, 1099, 1799]) assert.ok(html.includes(`data-product-price="${price}"`));
  assert.doesNotMatch(html, /Ask availability|Ask about this offer|model-art/);
});

test('campaign pill navigation and hash changes keep the filter and URL in sync', async () => {
  const h = await boot('#products');
  h.pills[1].events.click();
  assert.equal(h.location.hash, '#blackfriday');
  assert.doesNotMatch(h.element('#product-results').innerHTML, /Ordinary phone/);
  h.pills[2].events.click();
  assert.equal(h.location.hash, '#products');
  assert.match(h.element('#product-results').innerHTML, /Ordinary phone/);
  assert.doesNotMatch(h.element('#product-results').innerHTML, /Campaign airco/);
  h.location.hash = '#blackfriday';
  h.windowEvents.hashchange();
  assert.match(h.element('#product-results').innerHTML, /Black Friday · 2 results/);
  assert.equal(h.pills[1].attributes['aria-pressed'], 'true');
  assert.equal(h.pills[2].attributes['aria-pressed'], 'false');
});

test('appliance tab deep link groups the 18 offers, includes TVs, and preserves search, sorting and category navigation', async () => {
  const products = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/products.json'), 'utf8'));
  const h = await boot('#blackfriday-appliances', products);
  const results = () => h.element('#product-results').innerHTML;
  const appliancePill = h.pills.find(p => p.dataset.cat === 'blackfriday-appliances');
  assert.match(results(), /Black Friday Appliances · 18 results/);
  assert.match(results(), /BKAC 12 K 9652/);
  assert.match(results(), /XCG 519/);
  assert.match(results(), /Personal care/);
  assert.match(results(), /Kitchen essentials/);
  assert.match(results(), /Fans &amp; air conditioning|Fans & air conditioning/);
  assert.match(results(), /Televisions/);
  assert.match(results(), /TV-954432H/);
  assert.match(results(), /TV-9480SF40WFN/);
  assert.doesNotMatch(results(), /iPhone|Galaxy|Premier 9,000 BTU|Ask availability|Save XCG/);
  const orderButtons = [...results().matchAll(/class="[^"]*js-order-btn" data-product-name="([^"]+)" data-product-price="([^"]+)"/g)];
  const offers = products.filter(p => p.blackFriday === true && p.blackFridayAppliance === true);
  assert.equal(orderButtons.length, 18);
  assert.deepEqual(Object.fromEntries(orderButtons.map(match => [decodeURIComponent(match[1]), Number(match[2])])),
    Object.fromEntries(offers.map(p => [[p.name, p.suffix].filter(Boolean).join(' '), p.price])));
  for (const [sku, price] of [['TV-954432H', 299], ['TV-9480SF40WFN', 349]]) {
    const button = orderButtons.find(match => decodeURIComponent(match[1]).includes(sku));
    assert.ok(button, `${sku} checkout button`);
    assert.equal(Number(button[2]), price);
    assert.ok(results().includes(`src="/img/products/blackfriday-appliances/premier-${sku.toLowerCase()}.png"`));
  }
  assert.equal((results().match(/Checkout &amp; Pay/g) || []).length, 18);
  assert.equal(appliancePill.attributes['aria-pressed'], 'true');
  assert.match(h.element('#product-toolbar').innerHTML, /Black Friday Appliances <span class="pf-pill-total">18<\/span>/);
  h.element('#product-toolbar #pf-sort').events.change({ target: { value: 'price-asc' } });
  assert.doesNotMatch(results(), /<h3 class="section-title">/);
  assert.ok(results().indexOf('SN 023') < results().indexOf('BKAC 12 K 9652'));
  h.element('#product-toolbar #pf-search').value = 'BKAC 12 K 9652';
  h.element('#product-toolbar #pf-search').events.input();
  h.flushSearch();
  assert.match(results(), /Black Friday Appliances · 1 result/);
  assert.doesNotMatch(results(), /SN 023/);
  h.location.hash = '#blackfriday-appliances';
  h.windowEvents.hashchange();
  assert.match(results(), /Black Friday Appliances · 18 results/);
  h.pills.find(p => p.dataset.cat === 'samsung').events.click();
  assert.equal(h.location.hash, '#products');
  assert.match(results(), /Galaxy/);
  assert.doesNotMatch(results(), /SN 023|BKAC 12 K 9652|TV-954432H|TV-9480SF40WFN/);
  h.pills.find(p => p.dataset.cat === 'tvs').events.click();
  assert.match(results(), /TV-954432H/);
  assert.match(results(), /TV-9480SF40WFN/);
  assert.doesNotMatch(results(), /Galaxy|SN 023|BKAC 12 K 9652/);
  appliancePill.events.click();
  assert.equal(h.location.hash, '#blackfriday-appliances');
  assert.match(results(), /Black Friday Appliances · 18 results/);
  assert.equal(appliancePill.attributes['aria-pressed'], 'true');
});
