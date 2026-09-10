const test = require('node:test');
const assert = require('node:assert/strict');
const referral = require('../scooters/referral-core.js');

const now = Date.UTC(2026, 8, 10, 12);
const first = referral.chooseReferral(null, 'CC-ABC123', now);
const order = 'https://wa.me/59994618989?text=' + encodeURIComponent('Hi Connections, I want the Falcon for XCG 3,590.');

test('a second partner link cannot replace an unexpired first referral or extend its window', () => {
  assert.deepEqual(referral.chooseReferral(first, 'CC-XYZ789', now + 86400000), first);
  assert.deepEqual(referral.chooseReferral(first, 'CC-ABC123', now + 86400000), first);
});

test('an expired referral disappears and a later valid referral can start a new window', () => {
  const expiredAt = now + referral.WINDOW_MS;
  assert.equal(referral.chooseReferral(first, null, expiredAt), null);
  const next = referral.chooseReferral(first, 'CC-XYZ789', expiredAt);
  assert.equal(next.code, 'CC-XYZ789');
  assert.equal(next.createdAt, expiredAt);
});

test('only a single well-formed referral parameter is accepted', () => {
  assert.equal(referral.incomingCode('https://connectionscuracao.net/scooters/?ref=cc-abc123'), 'CC-ABC123');
  assert.equal(referral.incomingCode('https://connectionscuracao.net/scooters/?ref=CC-ABC123&ref=CC-XYZ789'), null);
  assert.equal(referral.incomingCode('https://connectionscuracao.net/scooters/?ref=%3Cscript%3E'), null);
  assert.equal(referral.normalizeCode('CC-ABC123\nReferral code: CC-XYZ789'), null);
  assert.equal(referral.normalizeCode('CC-ABC123456'), null);
});

test('corrupt, future-dated or extended saved records cannot create valid attribution', () => {
  for (const saved of [null, 'bad', {}, { ...first, code: '<script>' }, { ...first, createdAt: now + 1 }, { ...first, expiresAt: now + 2 * referral.WINDOW_MS }]) {
    assert.equal(referral.activeRecord(saved, now), null);
  }
});

test('order text and WhatsApp destination survive attribution', () => {
  const result = new URL(referral.withReferral(order, first, now));
  assert.equal(result.pathname, '/59994618989');
  assert.equal(result.searchParams.get('text'), 'Hi Connections, I want the Falcon for XCG 3,590.\n\nReferral code: CC-ABC123');
});

test('redecorating a WhatsApp link cannot duplicate the commission claim', () => {
  const decorated = referral.withReferral(order, first, now);
  assert.equal(referral.withReferral(decorated, first, now), decorated);
});

test('removing or expiring a referral removes the code while keeping the order message', () => {
  const decorated = referral.withReferral(order, first, now);
  for (const [record, time] of [[null, now], [first, now + referral.WINDOW_MS]]) {
    const result = new URL(referral.withReferral(decorated, record, time));
    assert.equal(result.searchParams.get('text'), new URL(order).searchParams.get('text'));
  }
});

test('a regenerated financing message keeps current amounts and its referral', () => {
  const plan = 'Hi Connections, XCG 500 cash/card, XCG 3,090 financed over 12 months.';
  const href = 'https://wa.me/59994618989?text=' + encodeURIComponent(plan);
  const updated = new URL(referral.withReferral(href, first, now));
  assert.equal(updated.searchParams.get('text'), plan + '\n\nReferral code: CC-ABC123');
});

test('ordinary visits and unrelated destinations are unchanged', () => {
  assert.equal(referral.withReferral(order, null, now), order);
  for (const href of ['#models', 'https://instagram.com/connectionscuracao', 'https://wa.me.example.org/?text=Hi', 'javascript:alert(1)']) {
    assert.equal(referral.withReferral(href, first, now), href);
  }
});

test('partner links always use the actual scooter page and reject unsafe input', () => {
  assert.equal(referral.sharingLink(' cc-abc123 '), 'https://connectionscuracao.net/scooters/?ref=CC-ABC123');
  assert.equal(referral.sharingLink('https://example.com'), null);
});
