const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { countdownParts, initCountdown, initAll } = require('../js/blackfriday-countdown.js');

const START = '2026-11-23T00:00:00-04:00';
const target = Date.parse(START);

test('Black Friday Week begins at Curaçao midnight, regardless of the visitor timezone', () => {
  assert.equal(target, Date.parse('2026-11-23T04:00:00Z'));
  assert.deepEqual(countdownParts(START, target - 90061000), {
    valid: true, started: false, totalSeconds: 90061, days: 1, hours: 1, minutes: 1, seconds: 1
  });
  for (const equivalent of ['2026-11-23T04:00:00Z', '2026-11-23T05:00:00+01:00', '2026-11-22T20:00:00-08:00']) {
    assert.deepEqual(countdownParts(equivalent, target - 123456), countdownParts(START, target - 123456));
  }
});

test('the final fraction of a second stays visible, and expiry never produces negative time', () => {
  assert.equal(countdownParts(START, target - 1001).seconds, 2);
  assert.equal(countdownParts(START, target - 1000).seconds, 1);
  assert.equal(countdownParts(START, target - 1).seconds, 1);
  assert.equal(countdownParts(START, target - 1).started, false);
  for (const now of [target, target + 1, target + 86400000]) {
    assert.deepEqual(countdownParts(START, now), {
      valid: true, started: true, totalSeconds: 0, days: 0, hours: 0, minutes: 0, seconds: 0
    });
  }
});

test('missing, invalid or timezone-less targets cannot show a fabricated countdown', () => {
  for (const startsAt of [undefined, null, '', '2026-11-23', '2026-11-23T00:00:00', 'next Monday', '2026-99-23T00:00:00-04:00']) {
    const parts = countdownParts(startsAt, target - 1000);
    assert.equal(parts.valid, false);
    assert.equal(parts.started, false);
    for (const value of Object.values(parts)) assert.notEqual(Number.isNaN(value), true);
  }
  assert.equal(countdownParts(START, NaN).valid, false);
});

function fixture({ startsAt = START, now = target - 90061000, hidden = false, missing = [] } = {}) {
  const nodes = new Map();
  const node = () => ({ hidden: false, textContent: '', attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } });
  for (const name of ['clock', 'status', 'live', 'days', 'hours', 'minutes', 'seconds']) {
    if (!missing.includes(name)) nodes.set(name, node());
  }
  const listeners = new Map(), windowListeners = new Map(), timers = new Map();
  let nextTimer = 0;
  const document = {
    hidden,
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type, fn) { if (listeners.get(type) === fn) listeners.delete(type); },
    querySelectorAll() { return [element]; }
  };
  const element = {
    ownerDocument: document,
    getAttribute(name) { assert.equal(name, 'data-starts-at'); return startsAt; },
    querySelector(selector) { return nodes.get(selector.match(/^\[data-countdown-(.+)\]$/)[1]) || null; }
  };
  const host = {
    document,
    Date: { now: () => now, parse: Date.parse },
    setTimeout(fn, delay) { timers.set(++nextTimer, { fn, delay }); return nextTimer; },
    clearTimeout(id) { timers.delete(id); },
    addEventListener(type, fn) { windowListeners.set(type, fn); },
    removeEventListener(type, fn) { if (windowListeners.get(type) === fn) windowListeners.delete(type); }
  };
  return {
    nodes, element, host, document, timers, listeners, windowListeners,
    setNow(value) { now = value; },
    runTimer() { const entry = [...timers.values()][0]; assert.ok(entry); entry.fn(); },
    visibility(value) { document.hidden = value; listeners.get('visibilitychange')?.(); },
    focus() { windowListeners.get('focus')?.(); }
  };
}

test('visible countdown uses one clock-based timer and corrects delayed callbacks without drift', () => {
  const app = fixture();
  const dispose = initCountdown(app.element, app.host);
  assert.equal(app.nodes.get('days').textContent, '01');
  assert.equal(app.nodes.get('hours').textContent, '01');
  assert.equal(app.nodes.get('minutes').textContent, '01');
  assert.equal(app.nodes.get('seconds').textContent, '01');
  assert.equal(app.nodes.get('clock').attributes['aria-live'], 'off');
  assert.equal(app.nodes.get('live').hidden, true);
  assert.equal(app.timers.size, 1);
  assert.equal(initCountdown(app.element, app.host), dispose);
  assert.equal(app.timers.size, 1);
  app.setNow(target - 10001);
  app.runTimer();
  assert.equal(app.nodes.get('days').textContent, '00');
  assert.equal(app.nodes.get('seconds').textContent, '11');
  assert.equal(app.timers.size, 1);
  assert.equal([...app.timers.values()][0].delay, 1);
  app.focus();
  assert.equal(app.timers.size, 1);
  dispose();
  assert.equal(app.timers.size, 0);
  assert.equal(app.listeners.size, 0);
  assert.equal(app.windowListeners.size, 0);
});

test('hidden tabs stop scheduling and resume from actual time, including when the deadline passes', () => {
  const app = fixture({ now: target - 60000 });
  initCountdown(app.element, app.host);
  app.visibility(true);
  assert.equal(app.timers.size, 0);
  app.setNow(target - 15000);
  app.visibility(false);
  assert.equal(app.nodes.get('seconds').textContent, '15');
  assert.equal(app.timers.size, 1);
  app.visibility(true);
  app.setNow(target + 1);
  app.visibility(false);
  assert.equal(app.nodes.get('clock').hidden, true);
  assert.equal(app.nodes.get('status').hidden, true);
  assert.equal(app.nodes.get('live').hidden, false);
  assert.equal(app.timers.size, 0);
  app.setNow(target - 60000);
  app.focus();
  assert.equal(app.nodes.get('live').hidden, false);
  assert.equal(app.timers.size, 0);
});

test('exact expiry and already-started visits expose the live message and stop the clock', () => {
  const app = fixture({ now: target - 1 });
  initCountdown(app.element, app.host);
  assert.equal(app.nodes.get('seconds').textContent, '01');
  assert.equal([...app.timers.values()][0].delay, 1);
  app.setNow(target);
  app.runTimer();
  assert.equal(app.nodes.get('live').hidden, false);
  assert.equal(app.nodes.get('clock').hidden, true);
  assert.equal(app.timers.size, 0);
  const later = fixture({ now: target + 86400000 });
  initCountdown(later.element, later.host);
  assert.equal(later.nodes.get('live').hidden, false);
  assert.equal(later.timers.size, 0);
});

test('invalid targets and missing optional elements are safe and do not leak a running timer', () => {
  const invalid = fixture({ startsAt: 'not a date' });
  initCountdown(invalid.element, invalid.host);
  assert.equal(invalid.nodes.get('clock').hidden, true);
  assert.equal(invalid.nodes.get('live').hidden, true);
  assert.match(invalid.nodes.get('status').textContent, /Countdown unavailable/);
  assert.equal(invalid.timers.size, 0);
  const sparse = fixture({ missing: ['status', 'live', 'days', 'minutes'], hidden: true });
  assert.doesNotThrow(() => initCountdown(sparse.element, sparse.host));
  assert.equal(sparse.timers.size, 0);
  assert.doesNotThrow(() => initCountdown(null, sparse.host)());
  assert.deepEqual(initAll(null, sparse.host), []);
});

test('browser bootstrap waits for markup and initializes existing wrappers only once', () => {
  const source = fs.readFileSync(path.join(__dirname, '../js/blackfriday-countdown.js'), 'utf8');
  for (const readyState of ['loading', 'complete']) {
    const app = fixture();
    app.document.readyState = readyState;
    const context = { ...app.host };
    vm.runInNewContext(source, context);
    if (readyState === 'loading') {
      assert.equal(app.timers.size, 0);
      app.listeners.get('DOMContentLoaded')();
    }
    assert.equal(app.timers.size, 1);
    context.BlackFridayCountdown.initAll(app.document, context);
    assert.equal(app.timers.size, 1);
  }
});
