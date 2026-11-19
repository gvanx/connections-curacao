const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCSV, parseInventory, parsePriceRegistry, parsePrice, safeImage, sourceURL, loadStock, createHandler } = require('../netlify/functions/hso-stock.js');
const header = 'Model,Storage,Color,Serial / IMEI,Battery health (%),Status';
const unitHeader = header + ',Price (XCG),Old price (XCG),Black Friday';
const priceHeader = 'Model,Storage,Color (optional),Price (XCG),Old price (XCG),Black Friday,Category,Image URL (optional)';
const modelHeader = 'Model,Storage,Color (optional),Category,Image URL (optional)';
const models = [{ id: 'iphone-15', name: 'iPhone 15', image: '/img/products/iphone-15-model.png' }];
const now = new Date('2026-11-20T02:30:00Z');
const config = { csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-test/pub?gid=42&single=true&output=csv',
  priceCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-test/pub?gid=43&single=true&output=csv' };
const row = (overrides = {}) => ({ model: 'iPhone 15', storage: '128GB', color: 'Black',
  serial: '001234567890123', battery: '88', status: 'Available', ...overrides });
const encode = value => '"' + String(value).replace(/"/g, '""') + '"';
const csv = (...records) => [header, ...records.map(record => Object.values(row(record)).map(encode).join(','))].join('\r\n');
const unitCSV = (...records) => [unitHeader, ...records.map(record => {
  const { price = '1099', oldPrice = '1350', blackFriday = 'Yes', ...stock } = record;
  return [...Object.values(row(stock)), price, oldPrice, blackFriday].map(encode).join(',');
})].join('\r\n');
const priceRow = (overrides = {}) => ({ model: 'iPhone 15', storage: '128GB', color: '', price: '1099',
  oldPrice: '1350', blackFriday: 'Yes', category: 'Apple', image: '', ...overrides });
const prices = (...records) => [priceHeader, ...records.map(record => Object.values(priceRow(record)).map(encode).join(','))].join('\r\n');
const modelRegistry = (...records) => [modelHeader, ...records.map(record => {
  const value = priceRow(record);
  return [value.model, value.storage, value.color, value.category, value.image].map(encode).join(',');
})].join('\r\n');
const parse = (input, pricing = prices({})) => parseInventory(input, pricing, models, now);
const response = (body, options = {}) => new Response(body, { headers: { 'Content-Type': 'text/csv' }, ...options });
const fetchSources = (stock = csv({}), pricing = prices({})) => async url => response(url === config.csvUrl ? stock : pricing);

test('CSV parsing preserves quoted commas, escaped quotes, embedded newlines and string identifiers', () => {
  assert.deepEqual(parseCSV('\uFEFFA,B,C\r\n"Black, blue","say ""hello""","line1\nline2"\r\n00123,word,'),
    [['A', 'B', 'C'], ['Black, blue', 'say "hello"', 'line1\nline2'], ['00123', 'word', '']]);
  for (const malformed of ['"unclosed', 'ab"cd,ef', '"value"oops,next']) {
    assert.throws(() => parseCSV(malformed), /Malformed/);
  }
});

test('available phones preserve serials, normalize sheet formatting and use Curaçao sync date', () => {
  const data = parse(csv({ model: ' iphone 15 ', storage: '128 gb', color: ' Black, Titanium ',
    battery: ' 88% ', status: ' AVAILABLE ' }));
  assert.deepEqual(data.units, [{ modelId: 'iphone-15', storage: '128GB', color: 'Black, Titanium',
    serial: '001234567890123', batteryHealth: 88, status: 'available', price: 1099, oldPrice: 1350,
    blackFriday: true, category: 'apple', image: models[0].image }]);
  assert.equal(data.schemaVersion, 2);
  assert.equal(data.updatedAt, '2026-11-19');
  assert.equal(data.syncedAt, now.toISOString());
  assert.deepEqual(data.models, models);
});

test('blank battery stays unknown; integer and percent readings never become fabricated fractions', () => {
  for (const [battery, expected] of [['', null], ['0', 0], ['100', 100], ['88', 88], ['88 %', 88]]) {
    assert.equal(parse(csv({ battery })).units[0].batteryHealth, expected);
  }
  for (const battery of ['0.88', '88.5', '101', '-1', 'good', '88%%', 'Infinity']) {
    assert.deepEqual(parse(csv({ battery })).units, []);
  }
});

test('sold, reserved, blank and unknown statuses never expose a phone', () => {
  for (const status of ['Sold', ' Reserved ', '', 'in stock', 'TRUE']) {
    const data = parse(csv({ status, model: 'unmapped', battery: 'not known' }));
    assert.deepEqual(data.units, []);
    assert.equal(JSON.stringify(data).includes('001234567890123'), false);
  }
  assert.deepEqual(parse(header + '\r\n,,,,,\r\n').units, []);
  assert.deepEqual(parse(header).units, []);
});

test('duplicates including conflicting available/sold rows reject the whole stock response', () => {
  for (const second of [{ serial: 'TESTabc12' }, { serial: 'testABC12' }, { serial: 'testabc12', status: 'Sold' }]) {
    assert.throws(() => parse(csv({ serial: 'TESTabc12' }, second)), /Duplicate/);
  }
});

test('incomplete available rows and unknown unpriced devices are omitted without breaking other stock', () => {
  for (const record of [{ model: 'iPhone 15 Pro' }, { model: '' }, { storage: '128' }, { color: '' },
    { serial: '' }, { serial: '1.23456E+14' }, { serial: '12<script>' }]) {
    assert.deepEqual(parse(csv(record, { serial: 'VALID12345' })).units.map(unit => unit.serial), ['VALID12345']);
  }
  assert.deepEqual(parse(csv({}) + ',unexpected').units, []);
});

test('missing or corrupt table headers fail closed instead of interpreting six-column stock as prices', () => {
  for (const input of ['', '<html>Sign in</html>', header.replace('Status', 'State'),
    header + ',Extra\r\n']) {
    assert.throws(() => parse(input));
  }
  for (const pricing of ['', '<html>Sign in</html>', csv({}), priceHeader.replace('Price (XCG)', 'Price')]) {
    assert.throws(() => parse(csv({}), pricing));
  }
  assert.throws(() => parseCSV('x'.repeat(256 * 1024 + 1)), /Invalid stock/);
});

test('only the fixed published single-tab Google CSV source is accepted', () => {
  assert.equal(sourceURL(config), config.csvUrl);
  for (const csvUrl of [config.csvUrl.replace('https:', 'http:'), config.csvUrl.replace('docs.google.com', 'evil.example'),
    config.csvUrl.replace('output=csv', 'output=html'), config.csvUrl.replace('single=true', 'single=false'),
    config.csvUrl.replace('gid=42', 'gid=all'), config.csvUrl + '#fragment',
    config.csvUrl.replace('docs.google.com', 'user:pass@docs.google.com')]) {
    assert.throws(() => sourceURL({ csvUrl }));
  }
});

test('loading requests fresh stock and never imports snapshot units', async () => {
  const calls = [];
  const data = await loadStock({ config, models, now, fetchImpl: async (...args) => {
    calls.push(args); return response(args[0] === config.csvUrl ? csv({ serial: 'LIVE12345' }) : prices({ price: '1075' }));
  } });
  assert.deepEqual(data.units.map(unit => unit.serial), ['LIVE12345']);
  assert.equal(data.units[0].price, 1075);
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], config.csvUrl);
  assert.equal(calls[0][1].cache, 'no-store');
  assert.equal(calls[0][1].headers.Accept, 'text/csv');
  assert.ok(calls[0][1].signal instanceof AbortSignal);
});

test('upstream errors, sign-in HTML, oversized bodies and timeouts return an uncached 503 without stale units', async () => {
  const failures = [
    async () => { throw new Error('Network failed'); },
    async () => response('Private', { status: 403 }),
    async () => response('<html>Sign in</html>', { headers: { 'Content-Type': 'text/html' } }),
    async () => response(csv({}), { headers: { 'Content-Type': 'text/csv', 'Content-Length': '999999' } }),
    async () => response('x'.repeat(256 * 1024 + 1)),
    async () => response(csv({})),
    async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true });
    })
  ];
  for (const fetchImpl of failures) {
    const result = await createHandler({ config, models, now, fetchImpl, timeoutMs: 5 })({ httpMethod: 'GET' });
    assert.equal(result.statusCode, 503);
    assert.equal(result.headers['Cache-Control'], 'no-store');
    assert.equal(result.headers['Netlify-CDN-Cache-Control'], 'no-store');
    assert.deepEqual(Object.keys(JSON.parse(result.body)), ['error']);
    assert.doesNotMatch(result.body, /001234567890123|units|Sign in|Network failed/);
  }
});

test('handler serves valid empty inventory and rejects mutations before contacting Google', async () => {
  let calls = 0;
  const handler = createHandler({ config, models, now, fetchImpl: async url => {
    calls++; return response(url === config.csvUrl ? header : prices({}));
  } });
  const result = await handler({ httpMethod: 'GET', queryStringParameters: { csvUrl: 'https://evil.example' } });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(JSON.parse(result.body).units, []);
  assert.equal(result.headers['Cache-Control'], 'no-store');
  for (const httpMethod of ['POST', 'PUT', 'DELETE']) {
    const denied = await handler({ httpMethod });
    assert.equal(denied.statusCode, 405);
    assert.equal(denied.headers.Allow, 'GET');
  }
  assert.equal(calls, 2);
});

test('sheet prices are authoritative, including blank/invalid prices that disable checkout without old-price fallback', () => {
  for (const price of ['', 'invalid', '#N/A', '0', '-10', '1e3', '1,25', '12.345', 'XCG 500', 'Infinity']) {
    const data = parse(csv({}), prices({ price }));
    assert.equal(data.units.length, 1);
    assert.equal(data.units[0].price, null);
    assert.equal(data.units[0].oldPrice, null);
    assert.equal(data.variants[0].price, null);
  }
  for (const [value, expected] of [['675', 675], ['675.50', 675.5], ['1,250', 1250], ['1,250.75', 1250.75]]) {
    assert.equal(parsePrice(value), expected);
  }
  for (const oldPrice of ['', '900', '1099', 'invalid']) {
    assert.equal(parse(csv({}), prices({ oldPrice })).units[0].oldPrice, null);
  }
});

test('exact color pricing overrides generic pricing without inventing a fallback for a blank exact-color price', () => {
  const data = parse(csv({ color: 'Black' }, { color: 'Blue', serial: 'BLUE12345' }),
    prices({ price: '1000' }, { color: ' black ', price: '', oldPrice: '1400', blackFriday: 'No', category: 'Other Phones' }));
  assert.deepEqual(data.units.map(unit => [unit.color, unit.price, unit.oldPrice, unit.blackFriday, unit.category]),
    [['Black', null, null, false, 'phones'], ['Blue', 1000, 1350, true, 'apple']]);
});

test('duplicate pricing variants never choose an arbitrary amount, promotion or metadata', () => {
  const data = parse(csv({}), prices({ price: '1000', image: 'https://example.com/a.jpg' },
    { model: ' iphone 15 ', storage: '128 gb', price: '900', category: 'Other', image: 'https://example.com/b.jpg' }));
  assert.equal(data.variants.length, 1);
  assert.equal(data.units[0].price, null);
  assert.equal(data.units[0].oldPrice, null);
  assert.equal(data.units[0].blackFriday, false);
  assert.equal(data.units[0].image, models[0].image);
  assert.equal(data.units[0].category, data.variants[0].category);
});

test('new models and storage variants become managed automatically while zero-stock registry entries remain', () => {
  const pricing = prices({ model: 'Lenovo Yoga 7', storage: '512GB', price: '950', category: 'Laptops', image: 'https://example.com/yoga.jpg' },
    { model: 'Lenovo Yoga 7', storage: '1TB', price: '1200', category: 'laptops' },
    { model: 'Galaxy Watch 7', storage: '', price: '399', category: 'Samsung' });
  const stock = csv({ model: 'Lenovo Yoga 7', storage: '512GB' }, { model: 'Galaxy Watch 7', storage: '', serial: 'WATCH12345', battery: '' });
  const data = parse(stock, pricing);
  assert.equal(data.models.length, 2);
  assert.equal(data.variants.length, 3);
  assert.equal(data.units.length, 2);
  assert.equal(data.units[0].category, 'laptops');
  assert.equal(data.units[1].storage, '');
  assert.equal(data.units[1].batteryHealth, null);
  assert.equal(data.models[0].image, 'https://example.com/yoga.jpg');
  assert.ok(data.models.every(model => /^hso-[a-z0-9-]+$/.test(model.id)));
  const empty = parse(header, pricing);
  assert.deepEqual(empty.models, data.models);
  assert.deepEqual(empty.variants, data.variants);
  assert.deepEqual(empty.units, []);
});

test('new model IDs are stable across row order/case and cannot collide merely because punctuation is removed', () => {
  const first = parsePriceRegistry(prices({ model: 'Device A/B' }, { model: 'Device A-B' }), models);
  const reordered = parsePriceRegistry(prices({ model: ' device a-b ' }, { model: 'DEVICE A/B' }), models);
  assert.notEqual(first.models[0].id, first.models[1].id);
  assert.equal(first.models[0].id, reordered.models[1].id);
  assert.equal(first.models[1].id, reordered.models[0].id);
  assert.equal(parsePriceRegistry(prices({}), models).models[0].id, 'iphone-15');
});

test('category labels normalize, missing model photos fall back, and images never cause backend network requests', async () => {
  for (const [category, expected] of [['Apple', 'apple'], ['Samsung', 'samsung'], ['Other Phones', 'phones'],
    ['phones', 'phones'], ['Laptops', 'laptops'], ['Other', 'other'], ['', 'apple'], ['__proto__', 'apple']]) {
    assert.equal(parse(csv({}), prices({ category })).units[0].category, expected);
  }
  assert.equal(parsePriceRegistry(prices({ model: 'Unknown Device', category: '' }), models).variants[0].category, 'other');
  assert.equal(safeImage('https://connectionscuracao.net/img/products/phone.jpg'), 'https://connectionscuracao.net/img/products/phone.jpg');
  assert.equal(safeImage('/img/products/phone.webp'), '/img/products/phone.webp');
  for (const image of ['http://example.com/a.jpg', 'https://user:pass@example.com/a.jpg', 'javascript:alert(1)',
    'data:image/svg+xml,test', '//example.com/a.jpg', '/img/products/../secret', 'https://example.com/a b.jpg']) {
    assert.equal(safeImage(image), null);
    assert.equal(parse(csv({}), prices({ image })).units[0].image, models[0].image);
  }
  const calls = [];
  await loadStock({ config, models, now, fetchImpl: async url => {
    calls.push(url); return response(url === config.csvUrl ? csv({}) : prices({ image: 'https://example.com/photo.jpg' }));
  } });
  assert.deepEqual(calls, [config.csvUrl, config.priceCsvUrl]);
});

test('both feeds are mandatory and an unavailable price feed cannot restore catalog prices', async () => {
  let calls = 0;
  const missingConfig = await createHandler({ config: { csvUrl: config.csvUrl }, fetchImpl: async () => { calls++; } })({ httpMethod: 'GET' });
  assert.equal(missingConfig.statusCode, 503);
  assert.equal(calls, 0);
  for (const failedURL of [config.csvUrl, config.priceCsvUrl]) {
    const result = await createHandler({ config, models, now, fetchImpl: async url => {
      if (url === failedURL) return response('Unavailable', { status: 503 });
      return response(url === config.csvUrl ? csv({}) : prices({}));
    } })({ httpMethod: 'GET' });
    assert.equal(result.statusCode, 503);
    assert.equal(result.headers['Cache-Control'], 'no-store');
    assert.deepEqual(Object.keys(JSON.parse(result.body)), ['error']);
  }
  const empty = await loadStock({ config, models, now, fetchImpl: fetchSources(csv({}), priceHeader) });
  assert.deepEqual(empty.models, []);
  assert.deepEqual(empty.variants, []);
  assert.deepEqual(empty.units, []);
});

test('individual phones of one model retain separate prices, comparison prices and Black Friday flags', () => {
  const data = parse(unitCSV({ serial: 'PHONE00001', price: '1099', oldPrice: '1350', blackFriday: 'Yes' },
    { serial: 'PHONE00002', price: '999', oldPrice: '1190', blackFriday: 'No' },
    { serial: 'PHONE00003', price: '1075.50', oldPrice: '1075.50', blackFriday: 'yes' }));
  assert.deepEqual(data.units.map(unit => [unit.serial, unit.price, unit.oldPrice, unit.blackFriday]),
    [['PHONE00001', 1099, 1350, true], ['PHONE00002', 999, 1190, false], ['PHONE00003', 1075.5, null, true]]);
  assert.equal(data.variants[0].price, 1099, 'legacy registry data cannot override unit prices');
});

test('blank or malformed individual prices never fall back to a model price, including truncated empty trailing cells', () => {
  for (const price of ['', 'bad', '#REF!', '0', '-1', '1e3', '1,25', '100.005']) {
    const data = parse(unitCSV({ price, oldPrice: '1500', blackFriday: '' }));
    assert.equal(data.units.length, 1);
    assert.equal(data.units[0].price, null);
    assert.equal(data.units[0].oldPrice, null);
    assert.equal(data.units[0].blackFriday, false);
  }
  const noPriceCells = unitHeader + '\r\n' + csv({}).split('\r\n')[1];
  const unit = parse(noPriceCells).units[0];
  assert.equal(unit.price, null);
  assert.equal(unit.oldPrice, null);
  assert.equal(unit.blackFriday, false);
});

test('individual old prices must exceed that phone price, and only an explicit Yes enables its promotion', () => {
  for (const oldPrice of ['', 'bad', '999', '1099', '-1']) {
    assert.equal(parse(unitCSV({ price: '1099', oldPrice })).units[0].oldPrice, null);
  }
  assert.equal(parse(unitCSV({ price: '1000', oldPrice: '1100' })).units[0].oldPrice, 1100);
  for (const blackFriday of ['', 'No', 'true', '1', 'unknown']) {
    assert.equal(parse(unitCSV({ blackFriday })).units[0].blackFriday, false);
  }
  assert.equal(parse(unitCSV({ blackFriday: ' YES ' })).units[0].blackFriday, true);
});

test('individual prices remain authoritative over exact-color registry defaults and sold units stay excluded', () => {
  const registry = prices({ price: '1000' }, { color: 'Black', price: '800', oldPrice: '900', blackFriday: 'No' });
  const data = parse(unitCSV({ price: '777', oldPrice: '1000', blackFriday: 'Yes' },
    { serial: 'SOLD12345', status: 'Sold', price: '500' }, { serial: 'HOLD12345', status: 'Reserved', price: '600' }), registry);
  assert.equal(data.units.length, 1);
  assert.equal(data.units[0].price, 777);
  assert.equal(data.units[0].oldPrice, 1000);
  assert.equal(data.units[0].blackFriday, true);
});

test('the five-column model registry supplies only identity and artwork while nine-column stock supplies money', () => {
  const registry = modelRegistry({ category: 'Other Phones', image: 'https://example.com/phone.jpg' });
  const data = parse(unitCSV({ price: '1125', oldPrice: '1300', blackFriday: 'Yes' }), registry);
  assert.deepEqual(data.variants[0], { modelId: 'iphone-15', storage: '128GB', color: '', price: null,
    oldPrice: null, blackFriday: false, category: 'phones', image: 'https://example.com/phone.jpg' });
  assert.equal(data.units[0].price, 1125);
  assert.equal(data.units[0].oldPrice, 1300);
  assert.equal(data.units[0].blackFriday, true);
  assert.equal(data.units[0].category, 'phones');
  assert.equal(data.units[0].image, 'https://example.com/phone.jpg');
  assert.deepEqual(parse(unitHeader, registry).variants, data.variants, 'zero-stock registry identity stays managed');
});

test('six-column stock remains compatible during rollout and five-column registry never invents prices', () => {
  assert.equal(parse(csv({}), prices({ price: '975' })).units[0].price, 975);
  const waitingForNewStock = parse(csv({}), modelRegistry({}));
  assert.equal(waitingForNewStock.units.length, 1);
  assert.equal(waitingForNewStock.units[0].price, null);
  assert.equal(waitingForNewStock.units[0].oldPrice, null);
  assert.equal(waitingForNewStock.units[0].blackFriday, false);
  for (const malformed of [unitHeader.replace('Price (XCG)', 'Unit price'), header + ',Price (XCG)', modelHeader]) {
    assert.throws(() => parse(malformed));
  }
});

test('new device models work with per-unit prices once registered, but unregistered variants remain omitted', () => {
  const registry = modelRegistry({ model: 'Lenovo Yoga 7', storage: '512GB', category: 'Laptops' });
  const data = parse(unitCSV({ model: 'Lenovo Yoga 7', storage: '512GB', price: '850', oldPrice: '1000', blackFriday: 'No' },
    { model: 'Lenovo Yoga 7', storage: '1TB', serial: 'OTHER12345', price: '1100' }), registry);
  assert.equal(data.models.length, 1);
  assert.equal(data.units.length, 1);
  assert.equal(data.units[0].modelId, data.models[0].id);
  assert.equal(data.units[0].price, 850);
  assert.equal(data.units[0].category, 'laptops');
});
