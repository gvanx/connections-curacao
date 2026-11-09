const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { normalizePhone, submitSignup } = require('../blackfriday/signup.js');

test('Curaçao local numbers and formatted international numbers normalize without losing their country code', () => {
  for (const number of ['1234567', '9 123 4567', '59991234567', '+599 (9) 123-4567', '00599 9 123 4567']) {
    assert.equal(normalizePhone(number), '+59991234567');
  }
  assert.equal(normalizePhone('+1 (202) 555-0101'), '+12025550101');
  assert.equal(normalizePhone('0031 6 12345678'), '+31612345678');
  for (const number of ['', '123', 'call me', '+0 12345678', '++59991234567', '+599912345678', '+1234567890123456', '2025550101', '+12025550101 ext 2']) {
    assert.equal(normalizePhone(number), null, number);
  }
});

test('no request is made without a valid phone, explicit consent, and an empty honeypot', async () => {
  let requests = 0;
  const send = async () => { requests++; return { ok: true }; };
  for (const data of [
    { whatsapp: 'invalid', consent: true },
    { whatsapp: '+12025550101', consent: false },
    { whatsapp: '+12025550101', consent: 'on' },
    { whatsapp: '+12025550101', consent: true, website: 'spam.example' }
  ]) await assert.rejects(submitSignup(data, { fetch: send }));
  assert.equal(requests, 0);
});

test('signup sends the normalized number and scoped consent in the request body, never in the URL', async () => {
  let request;
  const signal = new AbortController().signal;
  await submitSignup({ whatsapp: '+1 (202) 555-0101', consent: true }, {
    signal,
    fetch: async (url, options) => { request = { url, options }; return { ok: true }; }
  });
  assert.equal(request.url, '/blackfriday/thanks/');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.signal, signal);
  assert.equal(request.options.headers['Content-Type'], 'application/x-www-form-urlencoded');
  const body = new URLSearchParams(request.options.body);
  assert.equal(body.get('whatsapp'), '+12025550101');
  assert.equal(body.get('consent-version'), 'bf2026-whatsapp-v1');
  assert.match(body.get('consent'), /Black Friday 2026 poster on WhatsApp/);
  assert.match(body.get('consent'), /STOP/);
  const html = fs.readFileSync(path.join(__dirname, '../blackfriday/index.html'), 'utf8');
  for (const key of body.keys()) assert.ok(html.includes(`name="${key}"`), `${key} must be registered with Netlify`);
});

test('rejected or interrupted storage requests cannot be reported as saved', async () => {
  const data = { whatsapp: '+12025550101', consent: true };
  for (const status of [400, 404, 429, 500]) {
    await assert.rejects(submitSignup(data, { fetch: async () => ({ ok: false, status }) }), /couldn’t save/);
  }
  await assert.rejects(submitSignup(data, { fetch: async () => { throw new TypeError('offline'); } }), /offline/);
  await assert.rejects(submitSignup(data, { fetch: async () => { throw new DOMException('Timed out', 'AbortError'); } }), { name: 'AbortError' });
});
