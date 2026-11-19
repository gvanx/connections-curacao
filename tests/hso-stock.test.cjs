const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const stock = require('../js/hso-stock.js');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/hso-stock.js'), 'utf8');

const model = { id: 'iphone-15', name: 'iPhone 15', image: '/img/products/iphone-15-model.png' };
const unit = (overrides = {}) => ({ modelId: model.id, serial: 'TEST12345', storage: '128GB',
  color: 'Black', batteryHealth: null, status: 'available', ...overrides });
const product = (overrides = {}) => ({ name: 'iPhone 15', suffix: 'HSO', hsoModel: model.id,
  hsoStorage: '128GB', price: 1099, oldPrice: 1350, ...overrides });
const inventory = (units = [unit()]) => ({ updatedAt: '2026-11-19', models: [model], units });

test('published inventory is valid, preserves unique serials and does not invent missing battery readings', () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'data/hso-stock.json'), 'utf8'));
  assert.equal(stock.validateInventory(data), data);
  assert.equal(new Set(data.units.map(phone => phone.serial.toUpperCase())).size, data.units.length);
  for (const phone of data.units) {
    assert.equal(typeof phone.serial, 'string');
    if (phone.batteryHealth === null) assert.equal(stock.batteryText(phone), 'Ask for battery health');
  }
});

test('duplicate serials including case variants and duplicate or unknown models reject the import', () => {
  for (const serial of ['TEST12345', 'test12345']) {
    assert.throws(() => stock.validateInventory(inventory([unit(), unit({ serial })])), /Invalid phone record/);
  }
  const duplicateModel = inventory(); duplicateModel.models.push({ ...model });
  assert.throws(() => stock.validateInventory(duplicateModel), /Invalid model/);
  assert.throws(() => stock.validateInventory(inventory([unit({ modelId: 'iphone-unknown' })])), /Invalid phone record/);
});

test('battery health accepts an explicit unknown or an integer percentage and rejects malformed source values', () => {
  for (const value of [null, 0, 78, 100]) {
    const phone = unit({ batteryHealth: value });
    assert.doesNotThrow(() => stock.validateInventory(inventory([phone])));
    assert.equal(stock.batteryText(phone), value === null ? 'Ask for battery health' : value + '%');
  }
  for (const value of [undefined, -1, 101, 88.5, '88', '88%', NaN, Infinity]) {
    assert.throws(() => stock.validateInventory(inventory([unit({ batteryHealth: value })])), /Invalid phone record/);
  }
});

test('stock validation rejects missing identifiers, unknown statuses and incomplete model metadata', () => {
  for (const patch of [{ serial: 355300189680403 }, { serial: '' }, { serial: '<script>' },
    { color: '' }, { storage: '128' }, { status: 'in-stock' }, { status: undefined }]) {
    assert.throws(() => stock.validateInventory(inventory([unit(patch)])), /Invalid phone record/);
  }
  for (const status of ['available', 'reserved', 'sold']) {
    assert.doesNotThrow(() => stock.validateInventory(inventory([unit({ status })])));
  }
  for (const data of [null, {}, { ...inventory(), updatedAt: 'yesterday' },
    { ...inventory(), models: [{ ...model, id: '../iphone-15' }] },
    { ...inventory(), models: [{ ...model, name: '' }] }]) {
    assert.throws(() => stock.validateInventory(data));
  }
});

test('selection uses exact model, storage and color and excludes reserved and sold phones', () => {
  const data = inventory([
    unit(), unit({ serial: 'OTHER128GB', color: 'Blue' }),
    unit({ serial: 'OTHER256GB', storage: '256GB' }),
    unit({ serial: 'RESERVED1', status: 'reserved' }), unit({ serial: 'SOLD00001', status: 'sold' }),
    unit({ serial: 'OTHERPRO1', modelId: 'iphone-15-pro' })
  ]);
  const before = structuredClone(data);
  assert.deepEqual(stock.selectUnits(data, { model: model.id }).map(phone => phone.serial), ['TEST12345', 'OTHER128GB', 'OTHER256GB']);
  assert.deepEqual(stock.selectUnits(data, { model: model.id, storage: ' 128gb ', color: ' black ' }).map(phone => phone.serial), ['TEST12345']);
  assert.deepEqual(stock.selectUnits(data, { model: 'iphone-1' }), []);
  assert.deepEqual(stock.selectUnits(data, { model: model.id, storage: '512GB' }), []);
  assert.deepEqual(data, before);
  const html = stock.modelCardHTML(model, data, [product(), product({ hsoStorage: '256GB', price: 1399 })]);
  assert.match(html, /3 phones listed/);
  assert.match(html, /From XCG 1,099/);
  assert.doesNotMatch(html, /6 phones listed/);
});

test('a unit gets a price only from one exact HSO model and storage match, respecting color-specific listings', () => {
  const match = product({ hsoColor: ' black ' });
  const others = [product({ suffix: '' }), product({ hsoModel: 'iphone-15-pro' }),
    product({ hsoStorage: '256GB' }), product({ hsoColor: 'Blue' })];
  assert.equal(stock.productForUnit(unit(), [...others, match]), match);
  assert.equal(stock.productForUnit(unit({ color: 'Black Titanium' }), [...others, match]), null);
  assert.equal(stock.productForUnit(unit(), others), null);
  assert.equal(stock.productForUnit(unit(), [match, { ...match, price: 999 }]), null);
  assert.equal(stock.productForUnit(unit(), [product(), match]), null, 'generic plus color-specific prices are ambiguous');
  const html = stock.unitCardHTML(model, unit(), [product(), match]);
  assert.match(html, /Ask for price/);
  assert.doesNotMatch(html, /data-hso-serial|Checkout &amp; Pay|XCG/);
});

test('only available, priced, purchasable units enter checkout', () => {
  assert.equal(stock.canCheckout(unit(), product()), true);
  for (const phone of [unit({ status: 'sold' }), unit({ status: 'reserved' })]) {
    assert.equal(stock.canCheckout(phone, product()), false);
    const html = stock.unitCardHTML(model, phone, [product()]);
    assert.match(html, /disabled>Unavailable/);
    assert.doesNotMatch(html, /data-hso-serial|https:\/\/wa\.me/);
  }
  for (const candidate of [null, product({ soldOut: true }), product({ inquiryOnly: true }),
    product({ price: null }), product({ price: '1099' }), product({ price: -1 }), product({ price: 0 }), product({ price: Infinity })]) {
    assert.equal(stock.canCheckout(unit(), candidate), false);
  }
});

test('unit details, checkout identity and inquiries retain the serial, storage, color and actual battery reading', () => {
  const phone = unit({ batteryHealth: 88 });
  const expected = 'iPhone 15 HSO · 128GB · Black · Serial/IMEI: TEST12345 · Battery health: 88%';
  assert.equal(stock.orderName(model, phone), expected);
  const checkout = stock.unitCardHTML(model, phone, [product()]);
  assert.match(checkout, /data-hso-serial="TEST12345"/);
  assert.match(checkout, /88%/);
  assert.match(checkout, /XCG 1,099/);
  assert.match(checkout, /XCG 1,350/);
  for (const prices of [[], [product({ inquiryOnly: true })]]) {
    const html = stock.unitCardHTML(model, phone, prices);
    const rawUrl = html.match(/href="([^"]+)"/)[1].replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    const message = new URL(rawUrl).searchParams.get('text');
    assert.ok(message.includes(expected));
    assert.match(message, /Please confirm/);
    assert.doesNotMatch(html, /data-hso-serial/);
  }
  const unknown = stock.unitCardHTML(model, unit(), [product()]);
  assert.match(unknown, /Ask for battery health/);
  assert.doesNotMatch(unknown, />0%|>100%|null|undefined/);
});

test('untrusted names and colors render as text and image URLs stay within approved local product assets', () => {
  const unsafeModel = { ...model, name: '<script>model</script>', image: 'javascript:alert(1)' };
  const html = stock.detailHTML(unsafeModel, [unit({ color: '<img src=x onerror=alert(1)>' })], [product()]);
  assert.match(html, /&lt;script&gt;model&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x/);
  assert.doesNotMatch(html, /<script>|<img src=x|javascript:alert/);
});

function browser({ search = '', initialInventory = inventory(), initialProducts = [product()] } = {}) {
  const elements = new Map(), requests = [], checkouts = [], timers = new Map();
  let snapshot = { inventory: initialInventory, products: initialProducts }, customFetch = null, initialized = 0, timerId = 0;
  function element(id) {
    if (!elements.has(id)) {
      let html = '';
      const node = { id, hidden: false, textContent: '', attributes: {}, listeners: {}, buttons: [],
        set innerHTML(value) {
          html = value;
          this.buttons = [...value.matchAll(/<button[^>]*data-hso-serial="([^"]+)"[^>]*>([^<]*)<\/button>/g)].map(match => ({
            dataset: { hsoSerial: match[1] }, textContent: match[2], disabled: false, isConnected: true,
            closest(selector) { assert.equal(selector, 'button[data-hso-serial]'); return this; }
          }));
        },
        get innerHTML() { return html; },
        setAttribute(name, value) { this.attributes[name] = value; },
        addEventListener(name, callback) { this.listeners[name] = callback; },
        replaceChildren() { this.innerHTML = ''; }, querySelectorAll() { return this.buttons; }
      };
      elements.set(id, node);
    }
    return elements.get(id);
  }
  const events = {}, intervals = [];
  const document = { title: '', hidden: false, getElementById: element, createElement: () => ({}), addEventListener(name, fn) { events[name] = fn; } };
  const window = {
    document, location: { search },
    setInterval(fn, ms) { intervals.push({ fn, ms }); },
    addEventListener(name, fn) { events[name] = fn; },
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (customFetch) return customFetch(url, options);
      const data = structuredClone(url.includes('hso-stock') ? snapshot.inventory : snapshot.products);
      return { ok: true, json: async () => data };
    },
    initCheckoutModal() { initialized++; },
    openCheckout(...args) { checkouts.push(args); }
  };
  vm.runInNewContext(source, { window, URLSearchParams, AbortController, console,
    setTimeout(callback) { timers.set(++timerId, callback); return timerId; },
    clearTimeout(id) { timers.delete(id); }
  });
  return { element, document, requests, checkouts, timers, events, intervals, get initialized() { return initialized; },
    setSnapshot(next) { snapshot = next; customFetch = null; }, setFetch(callback) { customFetch = callback; },
    click(serial = 'TEST12345') {
      const button = element('hso-detail').buttons.find(button => button.dataset.hsoSerial === serial);
      assert.ok(button, 'Checkout button exists for ' + serial);
      return element('hso-detail').listeners.click({ target: button });
    },
    retry() { return element('hso-retry').listeners.click(); }
  };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('page loads available-only counts and renders model, filtered variant, unknown model and no-stock states', async () => {
  const stockFile = inventory([unit(), unit({ serial: 'BLUE00001', color: 'Blue' }), unit({ serial: 'SOLD00001', status: 'sold' })]);
  const app = browser({ initialInventory: stockFile });
  await flush();
  assert.equal(app.initialized, 1);
  assert.equal(app.element('hso-summary').textContent, '2 phones listed · 1 model');
  assert.equal(app.element('hso-models').hidden, false);
  assert.equal(app.element('hso-detail').hidden, true);
  assert.match(app.element('hso-models').innerHTML, /2 phones listed/);
  for (const [search, expectedTitle, expectedText] of [
    ['?model=iphone-15&storage=128GB&color=Black', 'iPhone 15 HSO', '1 phone listed'],
    ['?model=missing', 'Model not found', ''],
    ['?model=iphone-15&storage=512GB', 'iPhone 15 HSO', '0 phones listed']
  ]) {
    const view = browser({ search, initialInventory: stockFile }); await flush();
    assert.equal(view.element('hso-title').textContent, expectedTitle);
    assert.equal(view.element('hso-summary').textContent, expectedText);
    assert.equal(view.element('hso-detail').hidden, false);
    if (search.includes('512GB')) assert.match(view.element('hso-detail').innerHTML, /No phones listed for this selection/);
    if (search.includes('missing')) assert.match(view.element('hso-detail').innerHTML, /View all models/);
    if (search.includes('Black')) {
      assert.match(view.element('hso-detail').innerHTML, /TEST12345/);
      assert.doesNotMatch(view.element('hso-detail').innerHTML, /BLUE00001|SOLD00001/);
    }
  }
  assert.equal(app.timers.size, 0);
});

test('initial invalid stock fails closed and retry recovers without showing stale checkout buttons', async () => {
  const app = browser({ search: '?model=iphone-15', initialInventory: inventory([unit({ batteryHealth: 'unknown' })]) });
  await flush();
  assert.equal(app.element('hso-error').hidden, false);
  assert.equal(app.element('hso-loading').hidden, true);
  assert.equal(app.element('hso-detail').innerHTML, '');
  assert.equal(app.element('hso-models').attributes['aria-busy'], 'false');
  assert.equal(app.element('hso-summary').textContent, 'Stock is temporarily unavailable.');
  app.setSnapshot({ inventory: inventory(), products: [product()] });
  await app.retry();
  assert.equal(app.element('hso-error').hidden, true);
  assert.match(app.element('hso-detail').innerHTML, /TEST12345/);
  assert.equal(app.timers.size, 0);
});

test('checkout refreshes both sources without cache and uses the newest price with the exact unit identity', async () => {
  const app = browser({ search: '?model=iphone-15' }); await flush();
  app.setSnapshot({ inventory: inventory([unit({ batteryHealth: 91 })]), products: [product({ price: 999 })] });
  await app.click();
  assert.equal(app.requests.length, 4);
  for (const request of app.requests) {
    assert.equal(request.options.cache, 'no-store');
    assert.ok(request.options.signal);
  }
  assert.equal(app.checkouts.length, 1);
  const [name, price, opener] = app.checkouts[0];
  assert.equal(name, 'iPhone 15 HSO · 128GB · Black · Serial/IMEI: TEST12345 · Battery health: 91%');
  assert.equal(price, 999);
  assert.ok(app.element('hso-detail').buttons.includes(opener), 'focus returns to the refreshed, connected unit button');
  assert.equal(app.timers.size, 0);
});

test('fresh stock or pricing changes prevent checkout for a removed, reserved, sold or no-longer-priced unit', async () => {
  for (const next of [
    { inventory: inventory([]), products: [product()] },
    { inventory: inventory([unit({ status: 'reserved' })]), products: [product()] },
    { inventory: inventory([unit({ status: 'sold' })]), products: [product()] },
    { inventory: inventory(), products: [] },
    { inventory: inventory(), products: [product({ soldOut: true })] },
    { inventory: inventory(), products: [product(), product({ price: 900 })] }
  ]) {
    const app = browser({ search: '?model=iphone-15' }); await flush();
    app.setSnapshot(next); await app.click();
    assert.equal(app.checkouts.length, 0);
    assert.match(app.element('hso-summary').textContent, /no longer available for checkout/);
    assert.equal(app.element('hso-detail').buttons.length, 0);
  }
});

test('failed availability refresh never opens checkout and allows a successful retry', async () => {
  for (const failure of ['offline', 'http', 'invalid-catalog']) {
    const app = browser({ search: '?model=iphone-15' }); await flush();
    const originalButton = app.element('hso-detail').buttons[0];
    app.setFetch(async url => {
      if (failure === 'offline') throw new Error('Offline');
      if (failure === 'http') return { ok: false };
      return { ok: true, json: async () => url.includes('hso-stock') ? inventory() : {} };
    });
    await app.click();
    assert.equal(app.checkouts.length, 0);
    assert.equal(app.element('hso-error').hidden, false);
    assert.equal(app.element('hso-detail').buttons.length, 0);
    assert.equal(app.timers.size, 0);
    app.setSnapshot({ inventory: inventory(), products: [product()] });
    await app.retry();
    await app.click();
    assert.equal(app.checkouts.length, 1);
    assert.equal(app.element('hso-error').hidden, true);
  }
});

test('repeat taps during an availability request open only one checkout', async () => {
  const app = browser({ search: '?model=iphone-15' }); await flush();
  const pending = [];
  app.setFetch(url => new Promise(resolve => pending.push(() => resolve({ ok: true,
    json: async () => url.includes('hso-stock') ? inventory() : [product()] }))));
  const first = app.click();
  await app.click();
  assert.equal(pending.length, 2);
  assert.equal(app.element('hso-detail').buttons[0].disabled, true);
  assert.equal(app.checkouts.length, 0);
  pending.forEach(resolve => resolve()); await first;
  assert.equal(app.checkouts.length, 1);
});

test('live refresh removes sold models, restores restocks and skips hidden pages', async () => {
  const app = browser(); await flush();
  assert.equal(app.requests[0].url, '/.netlify/functions/hso-stock');
  assert.equal(app.intervals[0].ms, 30000);
  app.setSnapshot({ inventory: inventory([]), products: [product()] });
  app.document.hidden = true;
  await app.intervals[0].fn();
  assert.match(app.element('hso-models').innerHTML, /iPhone 15/);
  app.document.hidden = false;
  await app.events.visibilitychange();
  assert.equal(app.element('hso-summary').textContent, '0 phones listed · 0 models');
  assert.doesNotMatch(app.element('hso-models').innerHTML, /href="\/hso\/\?model/);
  app.setSnapshot({ inventory: inventory(), products: [product()] });
  await app.events.focus();
  assert.match(app.element('hso-models').innerHTML, /iPhone 15/);
  app.setFetch(async () => { throw new Error('Offline'); });
  await app.events.online();
  assert.equal(app.element('hso-models').innerHTML, '');
});

test('unchanged live polls preserve the connected checkout button', async () => {
  const app = browser({ search: '?model=iphone-15' }); await flush();
  const originalButton = app.element('hso-detail').buttons[0];
  await app.intervals[0].fn();
  assert.equal(app.element('hso-detail').buttons[0], originalButton);
  app.setSnapshot({ inventory: inventory(), products: [product({ price: 800 })] });
  await app.intervals[0].fn();
  assert.notEqual(app.element('hso-detail').buttons[0], originalButton);
  assert.match(app.element('hso-detail').innerHTML, /XCG 800/);
});

test('payment validator rejects sold phones, changed details and failures after checkout opened', async () => {
  for (const change of ['sold', 'price', 'color', 'battery', 'offline']) {
    const app = browser({ search: '?model=iphone-15' }); await flush();
    await app.click();
    const validate = app.checkouts[0][3];
    assert.equal(await validate(), true);
    if (change === 'offline') app.setFetch(async () => { throw new Error('Offline'); });
    else app.setSnapshot({ inventory: inventory(change === 'sold' ? [] : [unit({
      ...(change === 'color' ? { color: 'Blue' } : {}),
      ...(change === 'battery' ? { batteryHealth: 90 } : {})
    })]), products: [product(change === 'price' ? { price: 800 } : {})] });
    await assert.rejects(validate, /no longer available|details or price changed|could not verify/);
  }
});
