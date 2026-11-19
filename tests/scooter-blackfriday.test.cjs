const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { selectDeals, cardHTML } = require('../blackfriday/deals.js');

const catalog = require('../data/products.json');
const html = fs.readFileSync(path.join(__dirname, '../scooters/index.html'), 'utf8');
const offers = [
  { model: 'Falcon', name: 'Falcon 8 150cc', price: 3290, oldPrice: 3590 },
  { model: 'Fantasy', name: 'Fantasy 150cc', price: 3290, oldPrice: 3590 },
  { model: 'Monkey IV', name: 'Monkey IV 150cc', price: 3290, oldPrice: 3590 },
  { model: 'Trophy', name: 'Trophy 150cc', price: 3000, oldPrice: 3300 },
  { model: 'R8', name: 'R8 150cc', price: 3190, oldPrice: 3490 },
  { model: 'NVH', name: 'NVH 150cc', price: 3799, oldPrice: 4099 }
];
const money = value => 'XCG ' + value.toLocaleString('en-US', { maximumFractionDigits: 2 });
const amount = text => Number(text.replace(/[^\d.-]/g, ''));
const options = [...html.match(/<select\b[^>]*id="scooter"[^>]*>([\s\S]*?)<\/select>/)[1]
  .matchAll(/<option\b[^>]*value="([^"]+)"[^>]*>([^<]+)<\/option>/g)]
  .map(([, value, text]) => ({ value, text }));

test('the six current scooters each receive the authorized XCG 300 Black Friday discount', () => {
  const scooters = catalog.filter(product => product.category === 'motor');
  assert.deepEqual(scooters.map(product => product.name).sort(), offers.map(offer => offer.name).sort());
  for (const offer of offers) {
    const product = scooters.find(product => product.name === offer.name);
    assert.equal(product.price, offer.price, offer.name);
    assert.equal(product.oldPrice, offer.oldPrice, offer.name);
    assert.equal(product.oldPrice - product.price, 300, offer.name);
    assert.equal(product.blackFriday, true, offer.name);
    assert.equal(product.inquiryOnly, false, offer.name);
    assert.notEqual(product.soldOut, true, offer.name);
  }
});

test('all three discontinued motorcycle listings are absent from the active catalog', () => {
  const removed = /^(?:150cc Motorcycle \((?:Blue|Black)\)|Gasoline Motorcycle 150CC)$/i;
  assert.ok(catalog.every(product => !removed.test(product.name)));
  assert.ok(catalog.every(product => !/^MOT-?918[45]G$/i.test(product.suffix || '')));
});

test('the Black Friday collection exposes all six scooters with checkout at the discounted price', () => {
  const scooters = selectDeals(catalog, 'motor');
  assert.deepEqual(scooters.map(product => product.name).sort(), offers.map(offer => offer.name).sort());
  for (const product of scooters) {
    const card = cardHTML(product);
    assert.ok(card.includes(`data-product-price="${product.price}"`), product.name);
    assert.ok(card.includes(money(product.oldPrice)), product.name);
    assert.match(card, /Save XCG 300/);
    assert.match(card, /Checkout &amp; Pay/);
    assert.doesNotMatch(card, /Ask availability|Ask about this offer/);
  }
});

test('scooter cards and WhatsApp order amounts agree with the active catalog', () => {
  const cards = [...html.matchAll(/<article\b[^>]*class="card"[^>]*>([\s\S]*?)<\/article>/g)]
    .map(([, card]) => card);
  assert.equal(cards.length, offers.length);
  for (const offer of offers) {
    const card = cards.find(card => card.includes(`<h3 class="model">${offer.model}</h3>`));
    assert.ok(card, offer.model);
    const current = card.match(/<strong>\s*(XCG[^<]+)<\/strong>/)[1];
    const previous = card.match(/<del\b[^>]*>\s*(XCG[^<]+)<\/del>/)[1];
    assert.equal(amount(current), offer.price, offer.model);
    assert.equal(amount(previous), offer.oldPrice, offer.model);
    const order = new URL(card.match(/<a\b[^>]*class="order"[^>]*href="([^"]+)"/)[1]);
    assert.equal(order.hostname, 'wa.me');
    const message = order.searchParams.get('text');
    assert.ok(message.includes(offer.model), offer.model);
    assert.ok(message.includes(money(offer.price)), offer.model);
    assert.ok(!message.includes(money(offer.oldPrice)), offer.model);
  }
  assert.match(html, /href="\/blackfriday#offers"[^>]*>Checkout &amp; Pay/);
});

test('all scooter calculator options use the advertised sale price', () => {
  assert.equal(options.length, offers.length);
  for (const offer of offers) {
    const option = options.find(option => option.text.startsWith(offer.model + ' — '));
    assert.ok(option, offer.model);
    assert.equal(Number(option.value), offer.price, offer.model);
    assert.equal(amount(option.text.split(' — ')[1]), offer.price, offer.model);
  }
});

function bootCalculator() {
  const elements = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, {
      value: '', textContent: '', href: '', events: {}, previousElementSibling: {},
      insertAdjacentHTML() {},
      addEventListener(event, callback) { this.events[event] = callback; }
    });
    return elements.get(selector);
  };
  Object.assign(element('#scooter'), { value: options[0].value, options, selectedIndex: 0 });
  for (const id of ['cash', 'cashNumber']) {
    element('#' + id).value = html.match(new RegExp(`<input\\b[^>]*id="${id}"[^>]*value="([^"]+)"`))[1];
  }
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map(([, source]) => source).find(source => source.includes('function updatePlan'));
  assert.ok(script, 'Scooter payment calculator script exists');
  vm.runInNewContext(script, { document: { querySelector: element, querySelectorAll: () => [] } });
  const select = model => {
    const scooter = element('#scooter');
    scooter.selectedIndex = options.findIndex(option => option.text.startsWith(model + ' — '));
    scooter.value = options[scooter.selectedIndex].value;
    scooter.events.change();
  };
  return { element, select };
}

test('calculator initial amounts and WhatsApp quote reflect the discounted first scooter', () => {
  const app = bootCalculator();
  for (const id of ['cashResult', 'suaveResult', 'monthlyResult', 'feeResult']) {
    const staticValue = html.match(new RegExp(`<strong\\b[^>]*id="${id}"[^>]*>([^<]+)<\\/strong>`))[1];
    assert.equal(amount(staticValue), amount(app.element('#' + id).textContent), id);
  }
  assert.equal(amount(app.element('#suaveResult').textContent), 2873.7);
  assert.equal(amount(app.element('#monthlyResult').textContent), 919.58);
  const quote = new URL(app.element('#planLink').href).searchParams.get('text');
  assert.match(quote, /Falcon scooter/);
  assert.match(quote, /XCG 2,790 financed/);
});

test('cash slider rounding cannot exceed any sale price or create negative financing', () => {
  const app = bootCalculator();
  for (const offer of offers) {
    app.select(offer.model);
    const slider = app.element('#cash');
    slider.value = String(offer.price);
    slider.events.input();
    assert.ok(Number(slider.value) <= offer.price, offer.model);
    assert.ok(Number(app.element('#cashNumber').value) <= offer.price, offer.model);
    assert.equal(amount(app.element('#cashResult').textContent), offer.price, offer.model);
    assert.equal(amount(app.element('#suaveResult').textContent), 0, offer.model);
    assert.equal(amount(app.element('#monthlyResult').textContent), 0, offer.model);
    assert.equal(amount(app.element('#feeResult').textContent), 0, offer.model);
    const quote = new URL(app.element('#planLink').href).searchParams.get('text');
    assert.ok(quote.includes(`${money(offer.price)} cash/card and XCG 0 financed`), offer.model);
    assert.doesNotMatch(quote, /XCG -/);
  }
});

test('typed cash above the price and a switch to a cheaper scooter both clamp to the current price', () => {
  const app = bootCalculator();
  app.select('NVH');
  const input = app.element('#cashNumber');
  input.value = '99999';
  input.events.input();
  assert.equal(Number(input.value), 3799);
  assert.equal(amount(app.element('#suaveResult').textContent), 0);
  app.select('Trophy');
  assert.equal(Number(input.value), 3000);
  assert.equal(Number(app.element('#cash').max), 3000);
  assert.equal(amount(app.element('#suaveResult').textContent), 0);
  assert.match(new URL(app.element('#planLink').href).searchParams.get('text'), /XCG 3,000 cash\/card and XCG 0 financed/);
});
