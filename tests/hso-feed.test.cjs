const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCSV, parseInventory, sourceURL, loadStock, createHandler } = require('../netlify/functions/hso-stock.js');
const header = 'Model,Storage,Color,Serial / IMEI,Battery health (%),Status';
const models = [{ id: 'iphone-15', name: 'iPhone 15', image: '/img/products/iphone-15-model.png' }];
const now = new Date('2026-11-20T02:30:00Z');
const config = { csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-test/pub?gid=42&single=true&output=csv' };
const row = (overrides = {}) => ({ model: 'iPhone 15', storage: '128GB', color: 'Black',
  serial: '001234567890123', battery: '88', status: 'Available', ...overrides });
const encode = value => '"' + String(value).replace(/"/g, '""') + '"';
const csv = (...records) => [header, ...records.map(record => Object.values(row(record)).map(encode).join(','))].join('\r\n');
const parse = input => parseInventory(input, models, now);
const response = (body, options = {}) => new Response(body, { headers: { 'Content-Type': 'text/csv' }, ...options });

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
    serial: '001234567890123', batteryHealth: 88, status: 'available' }]);
  assert.equal(data.updatedAt, '2026-11-19');
  assert.equal(data.syncedAt, now.toISOString());
  assert.deepEqual(data.models, models);
});

test('blank battery stays unknown; integer and percent readings never become fabricated fractions', () => {
  for (const [battery, expected] of [['', null], ['0', 0], ['100', 100], ['88', 88], ['88 %', 88]]) {
    assert.equal(parse(csv({ battery })).units[0].batteryHealth, expected);
  }
  for (const battery of ['0.88', '88.5', '101', '-1', 'good', '88%%', 'Infinity']) {
    assert.throws(() => parse(csv({ battery })), /battery/);
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

test('malformed available rows, missing headers and unexpected models fail closed', () => {
  for (const record of [{ model: 'iPhone 15 Pro' }, { model: '' }, { storage: '128' }, { color: '' },
    { serial: '' }, { serial: '1.23456E+14' }, { serial: '12<script>' }]) {
    assert.throws(() => parse(csv(record)), /Invalid available/);
  }
  for (const input of ['', '<html>Sign in</html>', header.replace('Status', 'State'),
    csv({}) + ',unexpected', header + ',Extra\r\n']) {
    assert.throws(() => parse(input));
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
    calls.push(args); return response(csv({ serial: 'LIVE12345' }));
  } });
  assert.deepEqual(data.units.map(unit => unit.serial), ['LIVE12345']);
  assert.equal(calls.length, 1);
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
    async () => response(csv({ battery: '105' })),
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
  const handler = createHandler({ config, models, now, fetchImpl: async () => { calls++; return response(header); } });
  const result = await handler({ httpMethod: 'GET', queryStringParameters: { csvUrl: 'https://evil.example' } });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(JSON.parse(result.body).units, []);
  assert.equal(result.headers['Cache-Control'], 'no-store');
  for (const httpMethod of ['POST', 'PUT', 'DELETE']) {
    const denied = await handler({ httpMethod });
    assert.equal(denied.statusCode, 405);
    assert.equal(denied.headers.Allow, 'GET');
  }
  assert.equal(calls, 1);
});
