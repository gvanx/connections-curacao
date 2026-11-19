const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function boot(hash = '#blackfriday') {
  const elements = new Map(), documentEvents = {}, windowEvents = {}, errors = [];
  const products = [
    { name: 'Campaign tablet', price: 339, category: 'samsung', blackFriday: true },
    { name: 'Campaign airco', price: 444, oldPrice: 650, category: 'acs', blackFriday: true, inquiryOnly: true },
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
  const pills = ['all', 'blackfriday', 'samsung', 'acs'].map(category => {
    const pill = element('pill:' + category); pill.dataset.cat = category; return pill;
  });
  const document = {
    hidden: false, body: element('body'), getElementById: id => element('#' + id), createElement: tag => ({ tagName: tag }),
    querySelector: element, querySelectorAll: selector => selector === '.pf-pill' ? pills : [],
    addEventListener(name, callback) { (documentEvents[name] ||= []).push(callback); }
  };
  const location = { hash };
  const context = vm.createContext({
    Date, document, location, window: { addEventListener(name, callback) { windowEvents[name] = callback; } },
    history: { replaceState(_state, _title, hash) { location.hash = hash; } },
    IntersectionObserver: class { observe() {} }, console: { error: (...args) => errors.push(args.map(String).join(' ')) },
    fetch: async () => ({ ok: true, json: async () => products }),
    setTimeout() {}, clearTimeout() {}, setInterval() {}
  });
  for (const name of ['checkout', 'new-arrivals', 'gift-cards', 'storefront']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', name + '.js'), 'utf8'), context);
  }
  for (const callback of documentEvents.DOMContentLoaded) await callback();
  assert.deepEqual(errors, []);
  return { element, pills, location, windowEvents };
}

test('Black Friday deep link selects only explicitly tagged offers and preserves purchase modes', async () => {
  const h = await boot();
  const html = h.element('#product-results').innerHTML;
  assert.match(html, /Black Friday · 2 results/);
  assert.match(html, /Campaign tablet/);
  assert.match(html, /Campaign airco/);
  assert.doesNotMatch(html, /Ordinary phone|Mistagged phone/);
  assert.match(html, /data-product-price="339"/);
  assert.doesNotMatch(html, /data-product-price="444"/);
  assert.match(html, /Ask availability/);
  assert.equal(h.pills[1].attributes['aria-pressed'], 'true');
  assert.match(h.element('#product-toolbar').innerHTML, /Black Friday <span class="pf-pill-total">2<\/span>/);
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
