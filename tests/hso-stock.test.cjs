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
  color: 'Black', batteryHealth: null, status: 'available', price: 1099, oldPrice: 1350,
  blackFriday: true, category: 'apple', image: model.image, ...overrides });
const product = (overrides = {}) => ({ name: 'iPhone 15', suffix: 'HSO', hsoModel: model.id,
  hsoStorage: '128GB', price: 1099, oldPrice: 1350, ...overrides });
const inventory = (units = [unit()]) => ({ schemaVersion: 2, updatedAt: '2026-11-19', models: [model], units });

test('live inventory requires schema 2 and preserves exact serials and unknown battery readings', () => {
  const data = inventory([unit({ serial: '001234567890123' })]);
  assert.equal(stock.validateInventory(data), data);
  assert.equal(new Set(data.units.map(phone => phone.serial.toUpperCase())).size, data.units.length);
  for (const phone of data.units) {
    assert.equal(typeof phone.serial, 'string');
    if (phone.batteryHealth === null) assert.equal(stock.batteryText(phone), 'Ask for battery health');
  }
  for (const schemaVersion of [undefined, 1, '2']) assert.throws(() => stock.validateInventory({ ...data, schemaVersion }));
});

test('duplicate serials including case variants and duplicate or unknown models reject the import', () => {
  for (const serial of ['TEST12345', 'test12345']) {
    assert.throws(() => stock.validateInventory(inventory([unit(), unit({ serial })])), /Invalid device record/);
  }
  const duplicateModel = inventory(); duplicateModel.models.push({ ...model });
  assert.throws(() => stock.validateInventory(duplicateModel), /Invalid model/);
  assert.throws(() => stock.validateInventory(inventory([unit({ modelId: 'iphone-unknown' })])), /Invalid device record/);
});

test('one-to-four character IDs use stock-reference labels while full serials keep their label', () => {
  for (const serial of ['0', '00', '000', 'A', 'Ab12', 'ABCDE', '12345678901234567890']) {
    const device = unit({ serial });
    assert.doesNotThrow(() => stock.validateInventory(inventory([device])));
    const short = serial.length <= 4;
    const html = stock.unitCardHTML(model, device);
    assert.ok(html.includes(`<dt>${short ? 'Stock reference' : 'Serial / IMEI'}</dt><dd class="hso-serial">${serial}</dd>`));
    assert.ok(stock.orderName(model, device).includes(`${short ? 'Stock reference' : 'Serial/IMEI'}: ${serial} ·`));
    const inquiry = stock.unitCardHTML(model, { ...device, price: null });
    const url = inquiry.match(/href="([^"]+)"/)[1].replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    assert.ok(new URL(url).searchParams.get('text').includes(`${short ? 'Stock reference' : 'Serial/IMEI'}: ${serial} ·`));
  }
  for (const serial of [0, '', ' ', 'A B', 'A-B', '123456789012345678901']) {
    assert.throws(() => stock.validateInventory(inventory([unit({ serial })])), /Invalid device record/);
  }
  assert.throws(() => stock.validateInventory(inventory([unit({ serial: 'a1' }), unit({ serial: 'A1' })])), /Invalid device record/);
});

test('battery health accepts an explicit unknown or an integer percentage and rejects malformed source values', () => {
  for (const value of [null, 0, 78, 100]) {
    const phone = unit({ batteryHealth: value });
    assert.doesNotThrow(() => stock.validateInventory(inventory([phone])));
    assert.equal(stock.batteryText(phone), value === null ? 'Ask for battery health' : value + '%');
  }
  for (const value of [undefined, -1, 101, 88.5, '88', '88%', NaN, Infinity]) {
    assert.throws(() => stock.validateInventory(inventory([unit({ batteryHealth: value })])), /Invalid device record/);
  }
});

test('stock validation rejects missing identifiers, unknown statuses and incomplete model metadata', () => {
  for (const patch of [{ serial: 355300189680403 }, { serial: '' }, { serial: '<script>' },
    { color: '' }, { storage: '128' }, { status: 'in-stock' }, { status: undefined }]) {
    assert.throws(() => stock.validateInventory(inventory([unit(patch)])), /Invalid device record/);
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
    unit({ serial: 'OTHER256GB', storage: '256GB', price: 1399 }),
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
  assert.match(html, /3 devices listed/);
  assert.match(html, /From XCG 1,099/);
  assert.doesNotMatch(html, /6 devices listed/);
});

test('sheet unit prices are authoritative and blank or malformed prices never fall back to catalog prices', () => {
  assert.deepEqual(stock.productForUnit(unit({ price: 888, oldPrice: 1200 }), [product()]), { price: 888, oldPrice: 1200, blackFriday: true });
  for (const price of [null, undefined, '', '1099', 0, -1, NaN, Infinity]) {
    const phone = unit({ price });
    const candidate = stock.productForUnit(phone, [product()]);
    assert.equal(candidate.price, null);
    assert.equal(stock.canCheckout(phone, candidate), false);
    const html = stock.unitCardHTML(model, phone, [product()]);
    assert.match(html, /Ask for price/);
    assert.doesNotMatch(html, /data-hso-serial|Checkout &amp; Pay|XCG/);
  }
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
  for (const price of [null, undefined]) {
    const html = stock.unitCardHTML(model, { ...phone, price });
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

test('untrusted names and colors render as text and unsafe images use neutral model art', () => {
  const unsafeModel = { ...model, name: '<script>model</script>', image: 'javascript:alert(1)' };
  const html = stock.detailHTML(unsafeModel, [unit({ color: '<img src=x onerror=alert(1)>', image: 'javascript:alert(1)' })]);
  assert.match(html, /&lt;script&gt;model&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x/);
  assert.doesNotMatch(html, /<script>|<img src=x|javascript:alert/);
  assert.match(html, /SECOND-HAND \/ HSO/);
  assert.doesNotMatch(html, /APPLE \/ HSO/);
});

test('safe model and variant photos accept local assets or HTTPS without credentials', () => {
  for (const image of ['/img/products/hso-iphone-15-black.jpg', 'https://images.example.com/tablet.png?size=800&color=blue']) {
    assert.equal(stock.safeImageURL(image), image);
    const html = stock.detailHTML({ ...model, image }, [unit({ image })]);
    assert.match(html, /<img class="hso-detail-image"/);
    assert.match(html, /referrerpolicy="no-referrer"/);
    if (image.includes('&')) assert.match(html, /size=800&amp;color=blue/);
  }
  for (const image of [null, '', 'javascript:alert(1)', 'data:image/svg+xml,<svg/>', '//example.com/a.jpg',
    'http://example.com/a.jpg', 'https://user:secret@example.com/a.jpg', '/img/products/../private.png',
    '/img/products/a.svg?onload=bad', 'https://example.com/\nphoto.jpg', 'https:\\example.com\\photo.jpg']) {
    assert.equal(stock.safeImageURL(image), '');
    assert.doesNotMatch(stock.detailHTML({ ...model, image }, [unit({ image })]), /<img /);
  }
  const specific = 'https://images.example.com/blue-tablet.png';
  const html = stock.detailHTML(model, [unit({ image: specific })]);
  assert.ok(html.includes(`src="${specific}"`), 'a selected variant uses its specific photo');
  assert.ok(stock.detailHTML(model, [unit({ image: null })]).includes(`src="${model.image}"`), 'missing variant photo uses known model photo');
});

test('devices with optional storage retain clean identity and do not show empty storage labels', () => {
  const tablet = { id: 'drawing-tablet', name: 'Drawing Tablet', image: null };
  const device = unit({ modelId: tablet.id, storage: '', image: null, price: 150, oldPrice: null });
  const data = { ...inventory([device]), models: [tablet] };
  assert.doesNotThrow(() => stock.validateInventory(data));
  assert.equal(stock.orderName(tablet, device), 'Drawing Tablet HSO · Black · Serial/IMEI: TEST12345 · Battery health: Ask for battery health');
  assert.doesNotMatch(stock.unitCardHTML(tablet, device), /<span><\/span>| ·  · /);
  assert.doesNotMatch(stock.modelCardHTML(tablet, data), /<p><\/p>|APPLE/);
  assert.match(stock.unitCardHTML(tablet, device), /Checkout &amp; Pay/);
});

test('common live prices compare values and discounts display only when old price is higher', () => {
  const devices = [unit(), unit({ serial: 'ANOTHER01' })];
  assert.match(stock.detailHTML(model, devices), /<p class="hso-price"><del>.*XCG 1,350.*XCG 1,099/);
  assert.match(stock.detailHTML(model, [unit(), unit({ serial: 'ANOTHER01', price: 999 })]), /<p class="hso-price"><\/p>/);
  for (const oldPrice of [null, 0, 1099, 999, '1350', Infinity]) {
    assert.doesNotMatch(stock.unitCardHTML(model, unit({ oldPrice })), /<del>/);
  }
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
  vm.runInNewContext(source, { window, URL, URLSearchParams, AbortController, console,
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
  assert.equal(app.element('hso-summary').textContent, '2 devices listed · 1 model');
  assert.equal(app.element('hso-models').hidden, false);
  assert.equal(app.element('hso-detail').hidden, true);
  assert.match(app.element('hso-models').innerHTML, /2 devices listed/);
  for (const [search, expectedTitle, expectedText] of [
    ['?model=iphone-15&storage=128GB&color=Black', 'iPhone 15 HSO', '1 device listed'],
    ['?model=missing', 'Model not found', ''],
    ['?model=iphone-15&storage=512GB', 'iPhone 15 HSO', '0 devices listed']
  ]) {
    const view = browser({ search, initialInventory: stockFile }); await flush();
    assert.equal(view.element('hso-title').textContent, expectedTitle);
    assert.equal(view.element('hso-summary').textContent, expectedText);
    assert.equal(view.element('hso-detail').hidden, false);
    if (search.includes('512GB')) assert.match(view.element('hso-detail').innerHTML, /No devices listed for this selection/);
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

test('checkout refreshes the live endpoint only and uses the newest sheet price with exact unit identity', async () => {
  const app = browser({ search: '?model=iphone-15' }); await flush();
  app.setSnapshot({ inventory: inventory([unit({ batteryHealth: 91, price: 999 })]), products: [product({ price: 9999 })] });
  await app.click();
  assert.equal(app.requests.length, 2);
  for (const request of app.requests) {
    assert.equal(request.url, '/.netlify/functions/hso-stock');
    assert.equal(request.options.cache, 'no-store');
    assert.ok(request.options.signal);
  }
  assert.equal(app.checkouts.length, 1);
  const [name, price, opener, , options] = app.checkouts[0];
  assert.equal(name, 'iPhone 15 HSO · 128GB · Black · Serial/IMEI: TEST12345 · Battery health: 91%');
  assert.equal(price, 999);
  assert.equal(options.reserveAmount, 499.5, 'HSO reserves 50% of the selected device price');
  assert.ok(app.element('hso-detail').buttons.includes(opener), 'focus returns to the refreshed, connected unit button');
  assert.equal(app.timers.size, 0);
});

test('fresh stock or pricing changes prevent checkout for a removed, reserved, sold or no-longer-priced unit', async () => {
  for (const next of [
    { inventory: inventory([]), products: [product()] },
    { inventory: inventory([unit({ status: 'reserved' })]), products: [product()] },
    { inventory: inventory([unit({ status: 'sold' })]), products: [product()] },
    { inventory: inventory([unit({ price: null })]), products: [product()] },
    { inventory: inventory([unit({ price: 0 })]), products: [product()] },
    { inventory: inventory([unit({ price: '900' })]), products: [product()] }
  ]) {
    const app = browser({ search: '?model=iphone-15' }); await flush();
    app.setSnapshot(next); await app.click();
    assert.equal(app.checkouts.length, 0);
    assert.match(app.element('hso-summary').textContent, /no longer available for checkout/);
    assert.equal(app.element('hso-detail').buttons.length, 0);
  }
});

test('failed availability refresh never opens checkout and allows a successful retry', async () => {
  for (const failure of ['offline', 'http', 'invalid-stock']) {
    const app = browser({ search: '?model=iphone-15' }); await flush();
    const originalButton = app.element('hso-detail').buttons[0];
    app.setFetch(async url => {
      if (failure === 'offline') throw new Error('Offline');
      if (failure === 'http') return { ok: false };
      return { ok: true, json: async () => ({ ...inventory(), schemaVersion: 1 }) };
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
  assert.equal(pending.length, 1);
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
  assert.equal(app.element('hso-summary').textContent, '0 devices listed · 0 models');
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
  app.setSnapshot({ inventory: inventory([unit({ price: 800 })]), products: [product()] });
  await app.intervals[0].fn();
  assert.notEqual(app.element('hso-detail').buttons[0], originalButton);
  assert.match(app.element('hso-detail').innerHTML, /XCG 800/);
});

test('payment validator rejects sold phones, changed details and failures after checkout opened', async () => {
  for (const change of ['sold', 'price', 'unpriced', 'color', 'battery', 'offline']) {
    const app = browser({ search: '?model=iphone-15' }); await flush();
    await app.click();
    const validate = app.checkouts[0][3];
    assert.equal(await validate(), true);
    if (change === 'offline') app.setFetch(async () => { throw new Error('Offline'); });
    else app.setSnapshot({ inventory: inventory(change === 'sold' ? [] : [unit({
      ...(change === 'color' ? { color: 'Blue' } : {}),
      ...(change === 'battery' ? { batteryHealth: 90 } : {}),
      ...(change === 'price' ? { price: 800 } : {}),
      ...(change === 'unpriced' ? { price: null } : {})
    })]), products: [product()] });
    await assert.rejects(validate, /no longer available|details or price changed|could not verify/);
  }
});

test('new sheet models and storage variants appear and check out without catalog entries', async () => {
  const tablet = { id: 'galaxy-tab-a11', name: 'Galaxy Tab A11', image: 'https://images.example.com/tab-a11.jpg' };
  const tabletUnit = unit({ modelId: tablet.id, serial: 'TABLET001', storage: '64GB', price: 325, oldPrice: 550, image: tablet.image, category: 'samsung' });
  const tabletData = { ...inventory([tabletUnit]), models: [model, tablet] };
  const overview = browser({ initialInventory: inventory([]), initialProducts: [] });
  await flush();
  overview.setSnapshot({ inventory: tabletData, products: [] });
  await overview.events.focus();
  assert.equal(overview.element('hso-summary').textContent, '1 device listed · 1 model');
  assert.match(overview.element('hso-models').innerHTML, /Galaxy Tab A11/);
  assert.doesNotMatch(overview.element('hso-models').innerHTML, /iPhone 15/);
  const detail = browser({ search: '?model=galaxy-tab-a11', initialInventory: tabletData, initialProducts: [] });
  await flush();
  await detail.click('TABLET001');
  assert.equal(detail.checkouts[0][1], 325);
  assert.match(detail.checkouts[0][0], /Galaxy Tab A11 HSO · 64GB/);
  const newVariant = unit({ serial: 'STORAGE01', storage: '512GB', price: 1499, oldPrice: null });
  const newData = inventory([unit(), newVariant]);
  const variantView = browser({ search: '?model=iphone-15&storage=512GB', initialInventory: newData, initialProducts: [] });
  await flush();
  assert.equal(variantView.element('hso-summary').textContent, '1 device listed');
  await variantView.click('STORAGE01');
  assert.equal(variantView.checkouts[0][1], 1499);
  assert.match(variantView.checkouts[0][0], /512GB/);
});

test('a live blank price is shown as an inquiry even when an old catalog price exists', async () => {
  const app = browser({ search: '?model=iphone-15', initialInventory: inventory([unit({ price: null })]), initialProducts: [product()] });
  await flush();
  assert.equal(app.element('hso-detail').buttons.length, 0);
  assert.match(app.element('hso-detail').innerHTML, /Ask for price/);
  assert.doesNotMatch(app.element('hso-detail').innerHTML, /XCG 1,099/);
  assert(app.requests.every(request => request.url === '/.netlify/functions/hso-stock'));
});

test('identical model variants keep independent serial prices, old prices and unpriced inquiries', async () => {
  const devices = [
    unit({ serial: 'LOWPRICE1', price: 899, oldPrice: 1150 }),
    unit({ serial: 'HIGHPRICE', price: 1099, oldPrice: 1350 }),
    unit({ serial: 'NOPRICE01', price: null, oldPrice: null })
  ];
  const data = { ...inventory(devices), models: [{ ...model, price: 1200 }],
    variants: [{ modelId: model.id, storage: '128GB', color: '', price: 1200, oldPrice: 1500 }] };
  const overview = stock.modelCardHTML(model, data);
  assert.match(overview, /From XCG 899/);
  assert.doesNotMatch(overview, /<del>/, 'different serial offers must not advertise one shared old price');
  const app = browser({ search: '?model=iphone-15&storage=128GB&color=Black', initialInventory: data });
  await flush();
  const html = app.element('hso-detail').innerHTML;
  assert.match(html, /<p class="hso-price"><\/p>/, 'different serial offers have no shared header price');
  const cards = [...html.matchAll(/<article class="hso-unit-card">([\s\S]*?)<\/article>/g)].map(match => match[1]);
  assert.equal(cards.length, 3);
  const low = cards.find(card => card.includes('LOWPRICE1'));
  const high = cards.find(card => card.includes('HIGHPRICE'));
  const unknown = cards.find(card => card.includes('NOPRICE01'));
  assert.match(low, /XCG 1,150<\/del> <strong>XCG 899/);
  assert.doesNotMatch(low, /XCG 1,099|XCG 1,350/);
  assert.match(high, /XCG 1,350<\/del> <strong>XCG 1,099/);
  assert.doesNotMatch(high, /XCG 899|XCG 1,150/);
  assert.match(unknown, /Ask for price/);
  assert.doesNotMatch(unknown, /XCG|data-hso-serial/);
  await app.click('HIGHPRICE');
  await app.click('LOWPRICE1');
  assert.deepEqual(app.checkouts.map(([, price]) => price), [1099, 899]);
  assert.match(app.checkouts[0][0], /Serial\/IMEI: HIGHPRICE/);
  assert.match(app.checkouts[1][0], /Serial\/IMEI: LOWPRICE1/);
});

test('changing one serial price leaves sibling checkout valid and invalidates only the changed serial', async () => {
  const first = unit({ serial: 'UNITFIRST', price: 899, oldPrice: 1150 });
  const second = unit({ serial: 'UNITOTHER', price: 1099, oldPrice: 1350 });
  const app = browser({ search: '?model=iphone-15', initialInventory: inventory([first, second]) });
  await flush();
  await app.click('UNITOTHER');
  const validateSelected = app.checkouts[0][3];
  app.setSnapshot({ inventory: inventory([{ ...first, price: 849, oldPrice: 1100 }, second]) });
  assert.equal(await validateSelected(), true, 'editing a sibling must not change the selected device’s order');
  assert.equal(app.checkouts[0][1], 1099);
  assert.match(app.checkouts[0][0], /Serial\/IMEI: UNITOTHER/);
  await app.click('UNITFIRST');
  assert.equal(app.checkouts[1][1], 849, 'the changed serial gets its new price when opened');
  const validateFirst = app.checkouts[1][3];
  app.setSnapshot({ inventory: inventory([{ ...first, price: 849, oldPrice: 1100 }, { ...second, price: 999 }]) });
  await assert.rejects(validateSelected, /details or price changed/);
  assert.equal(await validateFirst(), true, 'the other serial’s open checkout is still valid');
  app.setSnapshot({ inventory: inventory([{ ...first, price: null, oldPrice: null }, { ...second, price: 999 }]) });
  await assert.rejects(validateFirst, /no longer available/);
  assert.deepEqual(app.element('hso-detail').buttons.map(button => button.dataset.hsoSerial), ['UNITOTHER']);
  await app.click('UNITOTHER');
  assert.equal(app.checkouts[2][1], 999);
});

test('0, 00 and 000 remain distinct through listing, checkout and refresh with No Face ID wording', async () => {
  const noFaceID = { ...model, id: 'iphone-11-no-face-id', name: 'iPhone 11 (No Face ID)' };
  const devices = ['0', '00', '000'].map((serial, index) => unit({ modelId: noFaceID.id, serial, price: 300 + index * 50 }));
  const data = { ...inventory(devices), models: [noFaceID] };
  assert.doesNotThrow(() => stock.validateInventory(data));
  const app = browser({ search: '?model=iphone-11-no-face-id', initialInventory: data });
  await flush();
  assert.equal(app.element('hso-title').textContent, 'iPhone 11 (No Face ID) HSO');
  assert.match(app.element('hso-intro').textContent, /serial number or stock reference/);
  assert.match(app.element('hso-detail').innerHTML, /selected device reference is included at checkout/);
  assert.deepEqual(app.element('hso-detail').buttons.map(button => button.dataset.hsoSerial), ['0', '00', '000']);
  for (const device of devices) await app.click(device.serial);
  assert.deepEqual(app.checkouts.map(([, price]) => price), [300, 350, 400]);
  for (const [index, device] of devices.entries()) {
    const [name, , opener, validate] = app.checkouts[index];
    assert.ok(name.startsWith('iPhone 11 (No Face ID) HSO ·'));
    assert.ok(name.includes(`Stock reference: ${device.serial} ·`));
    assert.doesNotMatch(name, /Serial\/IMEI/);
    assert.equal(opener.dataset.hsoSerial, device.serial);
    assert.equal(await validate(), true);
  }
  app.setSnapshot({ inventory: { ...data, units: devices.filter(device => device.serial !== '00') } });
  await assert.rejects(app.checkouts[1][3], /no longer available/);
  assert.equal(await app.checkouts[0][3](), true);
  assert.equal(await app.checkouts[2][3](), true);
  assert.deepEqual(app.element('hso-detail').buttons.map(button => button.dataset.hsoSerial), ['0', '000']);
});
