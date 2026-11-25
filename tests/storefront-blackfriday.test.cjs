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
  const pills = ['all', 'blackfriday', 'samsung', 'acs', 'blackfriday-appliances', 'tvs', 'blackfriday-electronics'].map(category => {
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

test('Electronics deep link includes tagged devices and accessories, preserves the full campaign, and supports navigation and filters', async () => {
  const electronics = [
    { name: 'Campaign phone', category: 'apple', price: 1799 },
    { name: 'Campaign tablet', category: 'samsung', price: 325 },
    { name: 'Campaign laptop', category: 'laptops', price: 399 },
    { name: 'Campaign Apple laptop', category: 'apple', price: 999 },
    { name: 'Campaign earbuds', category: 'other', price: 49 },
    { name: 'Campaign watch', category: 'apple', price: 1390 },
    { name: 'Campaign other phone', category: 'phones', price: 209 },
    { name: 'Campaign in-store phone', category: 'apple', price: null, inStoreSpecial: true, inquiryOnly: true }
  ].map(p => ({ ...p, blackFriday: true }));
  const separate = [
    { name: 'Campaign television', category: 'tvs', price: 299, blackFridayAppliance: true },
    { name: 'Campaign airco', category: 'acs', price: 444, blackFridayAppliance: true },
    { name: 'Campaign chopper', category: 'appliances', price: 39, blackFridayAppliance: true },
    { name: 'Campaign scooter', category: 'motor', price: 3000 },
    { name: 'Campaign gift card', category: 'giftcards', price: 20 },
    { name: 'Explicit appliance override', category: 'apple', price: 50, blackFridayAppliance: true }
  ].map(p => ({ ...p, blackFriday: true }));
  const products = [...electronics, ...separate,
    { name: 'Ordinary electronics', category: 'samsung', price: 88 },
    { name: 'Mistagged electronics', category: 'apple', price: 77, blackFriday: 'true' }];
  const h = await boot('#blackfriday-electronics', products);
  const results = () => h.element('#product-results').innerHTML;
  const electronicsPill = h.pills.find(p => p.dataset.cat === 'blackfriday-electronics');
  assert.match(results(), /Black Friday Electronics · 8 results/);
  for (const p of electronics) assert.ok(results().includes(p.name), `${p.name} is included`);
  for (const p of [...separate, ...products.slice(-2)]) assert.ok(!results().includes(p.name), `${p.name} is excluded`);
  assert.equal(electronicsPill.attributes['aria-pressed'], 'true');
  assert.equal(h.element('.pf-pill-electronics .pf-pill-total').textContent, 8);
  assert.equal(h.element('.pf-pill-blackfriday .pf-pill-total').textContent, 14);
  assert.match(h.element('#product-toolbar').innerHTML, /Black Friday Electronics <span class="pf-pill-total">8<\/span>/);
  assert.match(results(), /In-store special|Ask about in-store special/);
  assert.doesNotMatch(results(), /data-product-name="Campaign%20in-store%20phone"/);
  h.element('#product-toolbar #pf-sort').events.change({ target: { value: 'price-asc' } });
  assert.deepEqual([...results().matchAll(/data-product-price="([^"]+)"/g)].map(m => Number(m[1])), [49, 209, 325, 399, 999, 1390, 1799]);
  h.element('#product-toolbar #pf-price').events.change({ target: { value: '300-700' } });
  assert.match(results(), /Black Friday Electronics · 2 results/);
  h.element('#product-toolbar #pf-search').value = 'laptop';
  h.element('#product-toolbar #pf-search').events.input();
  h.flushSearch();
  assert.match(results(), /Black Friday Electronics · 1 result/);
  assert.match(results(), /Campaign laptop/);
  h.location.hash = '#blackfriday';
  h.windowEvents.hashchange();
  assert.match(results(), /Black Friday · 14 results/);
  for (const p of [...electronics, ...separate]) assert.ok(results().includes(p.name), `${p.name} stays in all Black Friday`);
  electronicsPill.events.click();
  assert.equal(h.location.hash, '#blackfriday-electronics');
  assert.match(results(), /Black Friday Electronics · 8 results/);
  h.pills.find(p => p.dataset.cat === 'samsung').events.click();
  assert.equal(h.location.hash, '#products');
  assert.match(results(), /Ordinary electronics/);
  h.location.hash = '#blackfriday-electronics';
  h.windowEvents.hashchange();
  assert.match(results(), /Black Friday Electronics · 8 results/);
  assert.equal(electronicsPill.attributes['aria-pressed'], 'true');
});

test('appliance tab deep link groups the 26 offers, includes aircos and TVs, and preserves search, sorting and category navigation', async () => {
  const products = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/products.json'), 'utf8'));
  const h = await boot('#blackfriday-appliances', products);
  const results = () => h.element('#product-results').innerHTML;
  const appliancePill = h.pills.find(p => p.dataset.cat === 'blackfriday-appliances');
  assert.match(results(), /Black Friday Appliances · 26 results/);
  assert.match(results(), /BKAC 12 K 9652/);
  assert.match(results(), /XCG 519/);
  assert.match(results(), /Personal care/);
  assert.match(results(), /Kitchen essentials/);
  assert.match(results(), /Fans &amp; air conditioning|Fans & air conditioning/);
  assert.match(results(), /Televisions/);
  const coolingGroup = results().match(/<section class="product-section" aria-label="Fans &(?:amp;)? air conditioning">([\s\S]*?)<\/section>/);
  assert.ok(coolingGroup, 'Fans and all five aircos share the cooling group');
  assert.deepEqual([...coolingGroup[1].matchAll(/data-product-price="([^"]+)"/g)].map(match => Number(match[1])),
    [45, 444, 519, 875, 1099, 1799]);
  assert.equal((coolingGroup[1].match(/src="img\/products\/ac-catalog\.webp"/g) || []).length, 4);
  assert.equal((results().match(/class="old-price"/g) || []).length, 4);
  const televisionGroup = results().match(/<section class="product-section" aria-label="Televisions">([\s\S]*?)<\/section>/);
  assert.ok(televisionGroup, 'Televisions has a dedicated appliance group');
  assert.deepEqual([...televisionGroup[1].matchAll(/data-product-price="([^"]+)"/g)].map(match => Number(match[1])),
    [299, 349, 599, 649, 875, 925]);
  assert.match(results(), /TV-954432H/);
  assert.match(results(), /TV-9480SF40WFN/);
  assert.doesNotMatch(results(), /iPhone|Galaxy|Ask availability/);
  const orderButtons = [...results().matchAll(/class="[^"]*js-order-btn" data-product-name="([^"]+)" data-product-price="([^"]+)"/g)];
  const offers = products.filter(p => p.blackFriday === true && p.blackFridayAppliance === true);
  assert.equal(orderButtons.length, 26);
  assert.deepEqual(Object.fromEntries(orderButtons.map(match => [decodeURIComponent(match[1]), Number(match[2])])),
    Object.fromEntries(offers.map(p => [[p.name, p.suffix].filter(Boolean).join(' '), p.price])));
  const aircoOffers = [['Premier 9,000 BTU Inverter AC', 444, 650], ['Premier 18,000 BTU Inverter AC', 875, 1150],
    ['Premier 24,000 BTU Inverter AC', 1099, 1390], ['Premier 36,000 BTU Inverter AC', 1799, 2100]];
  for (const [name, price, oldPrice] of aircoOffers) {
    const matching = orderButtons.filter(match => decodeURIComponent(match[1]) === name);
    assert.equal(matching.length, 1, `${name} appears once with checkout`);
    assert.equal(Number(matching[0][2]), price);
    assert.equal(products.find(p => p.name === name).oldPrice, oldPrice);
    assert.ok(coolingGroup[1].includes(`<span class="old-price">XCG ${oldPrice.toLocaleString('en-US')}</span>`));
  }
  const tvOffers = [['TV-954432H', 299], ['TV-9480SF40WFN', 349], ['TV-9308SF50WKL', 599],
    ['55" UHD Smart TV (Whale OS)', 649], ['60" UHD Smart TV', 875], ['TV-9304SF65WKL', 925]];
  for (const [identifier, price] of tvOffers) {
    const button = orderButtons.find(match => decodeURIComponent(match[1]).includes(identifier));
    assert.ok(button, `${identifier} checkout button`);
    assert.equal(Number(button[2]), price);
  }
  assert.equal((results().match(/src="\/img\/products\/tv-catalog\.webp"[^>]*alt="[^"]+ — illustration"/g) || []).length, 6);
  assert.equal((results().match(/Checkout &amp; Pay/g) || []).length, 26);
  assert.equal(appliancePill.attributes['aria-pressed'], 'true');
  assert.match(h.element('#product-toolbar').innerHTML, /Black Friday Appliances <span class="pf-pill-total">26<\/span>/);
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
  assert.match(results(), /Black Friday Appliances · 26 results/);
  h.pills.find(p => p.dataset.cat === 'samsung').events.click();
  assert.equal(h.location.hash, '#products');
  assert.match(results(), /Galaxy/);
  assert.doesNotMatch(results(), /Premier [\d,]+ BTU Inverter AC/);
  assert.doesNotMatch(results(), /SN 023|BKAC 12 K 9652|TV-954432H|TV-9480SF40WFN|TV-9308SF50WKL|TV-9304SF65WKL|55&quot; UHD Smart TV|60&quot; UHD Smart TV/);
  h.pills.find(p => p.dataset.cat === 'acs').events.click();
  const acButtons = [...results().matchAll(/class="[^"]*js-order-btn" data-product-name="([^"]+)" data-product-price="([^"]+)"/g)];
  for (const [name, price] of [...aircoOffers, ['Blaupunkt 12,000 BTU Inverter AC BKAC 12 K 9652', 519]]) {
    const matching = acButtons.filter(match => decodeURIComponent(match[1]) === name);
    assert.equal(matching.length, 1, `${name} stays in the Air Conditioning category`);
    assert.equal(Number(matching[0][2]), price);
  }
  h.pills.find(p => p.dataset.cat === 'tvs').events.click();
  const tvButtons = [...results().matchAll(/class="[^"]*js-order-btn" data-product-name="([^"]+)" data-product-price="([^"]+)"/g)];
  for (const [identifier, price] of tvOffers) {
    const matching = tvButtons.filter(match => decodeURIComponent(match[1]).includes(identifier));
    assert.equal(matching.length, 1, `${identifier} appears once in the TV category`);
    assert.equal(Number(matching[0][2]), price);
  }
  assert.doesNotMatch(results(), /Galaxy|SN 023|BKAC 12 K 9652/);
  appliancePill.events.click();
  assert.equal(h.location.hash, '#blackfriday-appliances');
  assert.match(results(), /Black Friday Appliances · 26 results/);
  assert.equal(appliancePill.attributes['aria-pressed'], 'true');
});
