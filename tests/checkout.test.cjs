const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/checkout.js'), 'utf8');
const wallet = '0x4E7d1D58Ed7dfe63a15EdCa83437BB6AC7A6eF0e';

function harness() {
  const nodes = new Map();
  const emails = [], popups = [], copied = [];
  function element(tag = 'div') {
    const classes = new Set(), listeners = new Map();
    return {
      tagName: tag, children: [], style: {}, value: '', checked: false, hidden: false, disabled: false, textContent: '',
      classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
      replaceChildren() { this.children = []; }, appendChild(child) { this.children.push(child); },
      setAttribute() {}, removeAttribute() {}, focus() {}, reset() {},
      addEventListener(name, callback) { listeners.set(name, callback); },
      fire(name) { return listeners.get(name)?.({ preventDefault() {} }); }
    };
  }
  const get = id => { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); };
  const radios = {
    'checkout-payment': ['full', 'reserve'].map(value => Object.assign(element('input'), { value, checked: value === 'full' })),
    'checkout-delivery': ['pickup', 'delivery'].map(value => Object.assign(element('input'), { value, checked: value === 'pickup' }))
  };
  const formControls = () => [
    ...['checkout-name', 'checkout-phone', 'checkout-address', 'checkout-terms', 'checkout-method', 'submit'].map(get),
    ...Object.values(radios).flat()
  ];
  Object.defineProperty(get('checkout-form'), 'elements', { get: formControls });
  const document = {
    body: element(), activeElement: null, getElementById: get, createElement: element, addEventListener() {},
    querySelector(selector) {
      if (selector === '.checkout-submit') return get('submit');
      const name = selector.match(/name="([^"]+)"/)?.[1];
      const value = selector.match(/value="([^"]+)"/)?.[1];
      return radios[name]?.find(radio => value ? radio.value === value : radio.checked);
    },
    querySelectorAll(selector) { return radios[selector.match(/name="([^"]+)"/)?.[1]] || []; }
  };
  const emailjs = { init() {}, send(service, template, params) { emails.push(params); return Promise.resolve(); } };
  const context = vm.createContext({ document, window: { emailjs, open(...args) { popups.push(args); } },
    emailjs, console: { warn() {} }, navigator: { clipboard: { writeText: async value => copied.push(value) } } });
  vm.runInContext(source + '\nglobalThis.api = { config: CHECKOUT_CONFIG, paymentQuote, openCheckout, closeCheckout, initCheckoutModal, getCheckoutTotals, updateCheckoutSummary, populatePaymentMethods };', context);
  const api = context.api;
  api.initCheckoutModal();
  const selectRadio = (name, value) => radios[name].forEach(radio => { radio.checked = radio.value === value; });
  function open({ method = 'sentoo', price = 174, payment = 'full', delivery = 'pickup', name = 'Test phone <&>', validateAvailability } = {}) {
    api.openCheckout(name, price, undefined, validateAvailability);
    selectRadio('checkout-payment', payment); selectRadio('checkout-delivery', delivery);
    get('checkout-method').value = method;
    get('checkout-name').value = 'Test customer'; get('checkout-phone').value = '+5999 1234567';
    get('checkout-address').value = 'Test address'; get('checkout-terms').checked = true;
    api.updateCheckoutSummary();
  }
  return { api, context, get, open, emails, popups, copied, formControls, submit: () => get('checkout-form').fire('submit') };
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('both published tokens use the supplied Ethereum wallet, 1.74 rate and no added fee', () => {
  const h = harness();
  assert.deepEqual(Array.from(h.get('checkout-method').children, item => item.value), ['sentoo', 'suave', 'USDT', 'USDC']);
  for (const token of ['USDT', 'USDC']) {
    const quote = h.api.paymentQuote(174, token);
    assert.equal(quote.amount, `100.00 ${token}`);
    assert.equal(quote.address, wallet);
    assert.equal(quote.network, 'Ethereum (ERC-20)');
    assert.equal(quote.exchangeRate, 1.74);
  }
  assert.match(h.get('crypto-payment-notice').textContent, /USDT or USDC.*Ethereum.*No Connections fee/);
});

for (const method of ['USDT', 'USDC']) {
  for (const [payment, delivery, price, total, expected] of [
    ['full', 'pickup', 174, 174, '100.00'], ['full', 'delivery', 174, 209, '120.11'],
    ['reserve', 'pickup', 348, 100, '57.47'], ['reserve', 'delivery', 348, 135, '77.59'],
    ['reserve', 'pickup', 35, 35, '20.11']
  ]) {
    test(`${method} ${payment} ${delivery} for XCG ${price} quotes and submits the same amount`, () => {
      const h = harness(); h.open({ method, payment, delivery, price });
      assert.equal(h.api.getCheckoutTotals().total, total);
      assert.match(h.get('checkout-quote').textContent, new RegExp(`${expected} ${method}`));
      h.submit();
      assert.equal(h.popups.length, 0, 'crypto must not launch Sentoo or send a WhatsApp message automatically');
      assert.equal(h.emails.length, 1);
      assert.equal(h.emails[0].amount, `${expected} ${method}`);
      assert.equal(h.emails[0].wallet, wallet);
      assert.match(h.emails[0].payment, /Ethereum \(ERC-20\).*PENDING VERIFICATION/);
      const confirmation = h.get('checkout-confirmation');
      assert.equal(confirmation.hidden, false);
      assert.equal(h.get('checkout-form').hidden, true);
      const text = confirmation.children.map(child => child.textContent).join('\n');
      assert.match(text, /Payment pending verification/);
      assert.ok(text.includes(wallet));
      assert.ok(text.includes(`${expected} ${method}`));
      assert.match(text, /transaction hash/);
      const link = confirmation.children.find(child => child.tagName === 'a');
      const url = new URL(link.href);
      assert.equal(url.hostname, 'wa.me'); assert.equal(url.pathname, '/59996782619');
      const message = url.searchParams.get('text');
      assert.ok(message.includes(`Amount due: ${expected} ${method}`));
      assert.ok(message.includes(wallet)); assert.match(message, /Status: Awaiting payment verification/);
      if (payment === 'reserve') assert.ok(message.includes(`Remaining product balance: XCG ${price - Math.min(100, price)}`));
      h.submit(); assert.equal(h.emails.length, 1, 'a completed form cannot submit twice');
    });
  }
}

test('Sentoo retains integer-cent payment links, including reservation and delivery, with a persistent fallback', () => {
  for (const [payment, total] of [['full', 383], ['reserve', 135]]) {
    const h = harness(); h.open({ price: 348, payment, delivery: 'delivery' }); h.submit();
    assert.deepEqual(h.popups, [[`https://sentoo.pro/connections-curacao/${total * 100}`, '_blank', 'noopener,noreferrer']]);
    assert.equal(h.emails[0].amount, `XCG ${total}`);
    assert.match(h.emails[0].payment, /SENTOO|Sentoo/);
    assert.ok(h.get('checkout-confirmation').children.some(child => child.href === h.popups[0][0]));
  }
});

test('invalid amounts, tokens, networks, addresses and rates cannot create crypto instructions', () => {
  const h = harness();
  for (const total of [0, -1, NaN, Infinity, '174', Number.MAX_VALUE]) assert.throws(() => h.api.paymentQuote(total, 'USDT'));
  for (const method of ['BTC', 'usdt', '', '__proto__']) assert.throws(() => h.api.paymentQuote(174, method));
  for (const change of [
    config => { config.enabled = false; }, config => { config.network = ''; }, config => { config.network = 'Tron'; },
    config => { config.exchangeRate = 0; }, config => { config.exchangeRate = Infinity; },
    config => { config.addresses.USDT = ''; }, config => { config.addresses.USDT = '0x' + '0'.repeat(40); },
    config => { config.addresses.USDT = 'javascript:alert(1)'; }, config => { config.addresses.USDT = wallet.slice(0, -1); }
  ]) {
    const app = harness(); change(app.api.config.crypto);
    assert.throws(() => app.api.paymentQuote(174, 'USDT'));
    app.api.populatePaymentMethods();
    assert(!app.get('checkout-method').children.some(option => option.value === 'USDT'));
    app.open({ method: 'USDT' }); app.submit();
    assert.equal(app.emails.length, 0); assert.equal(app.popups.length, 0);
    assert.equal(app.get('submit').disabled, true);
  }
});

test('customer details, delivery address and consent are required before preparing any payment', () => {
  for (const method of ['sentoo', 'suave', 'USDT', 'USDC']) for (const field of ['checkout-name', 'checkout-phone', 'checkout-address', 'checkout-terms']) {
    const h = harness(); h.open({ method, delivery: 'delivery' });
    if (field === 'checkout-terms') h.get(field).checked = false; else h.get(field).value = '';
    h.submit(); assert.equal(h.emails.length, 0); assert.equal(h.popups.length, 0);
    assert.ok(h.get('checkout-error').textContent);
  }
});

test('copy buttons use the exact wallet and token amount and reopening clears old payment instructions', async () => {
  const h = harness(); h.open({ method: 'USDC' }); h.submit();
  for (const button of h.get('checkout-confirmation').children.filter(child => child.tagName === 'button')) await button.fire('click');
  assert.deepEqual(h.copied, [wallet, '100.00']);
  h.api.closeCheckout(); h.open({ price: 348 });
  assert.equal(h.get('checkout-confirmation').hidden, true);
  assert.equal(h.get('checkout-confirmation').children.length, 0);
  assert.equal(h.get('checkout-method').value, 'sentoo');
  assert.equal(h.get('checkout-form').hidden, false);
});

test('email failure does not block instructions or the WhatsApp handoff', async () => {
  const h = harness(); h.context.emailjs.send = () => Promise.reject(new Error('Offline'));
  h.open({ method: 'USDT' }); h.submit();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.get('checkout-confirmation').hidden, false);
  assert.ok(h.get('checkout-confirmation').children.some(child => child.href?.startsWith('https://wa.me/')));
});

test('order emails populate every template field with correct totals and manual status', () => {
  const template = fs.readFileSync(require('node:path').join(__dirname, '../docs/emailjs-order-template.html'), 'utf8');
  for (const method of ['sentoo', 'USDT', 'USDC']) {
    const h = harness(); h.open({ method, price: 348, payment: 'reserve', delivery: 'delivery' }); h.submit();
    const mail = h.emails[0];
    assert.equal(mail.storeName, 'Connections Curaçao');
    assert.equal(mail.productSubtotal, 'XCG 348');
    assert.equal(mail.payNowXCG, 'XCG 100');
    assert.equal(mail.deliveryFee, 'XCG 35');
    assert.equal(mail.totalXCG, 'XCG 135');
    assert.equal(mail.remainingBalance, 'XCG 248');
    assert.equal(mail.transactionHash, 'Not submitted');
    assert.equal(mail.verificationMethod, 'Manual review required');
    assert.equal(mail.termsAccepted, 'Yes');
    assert.ok(Number.isFinite(Date.parse(mail.createdAt)));
    for (const [, key] of template.matchAll(/{{(\w+)}}/g)) {
      assert.ok(mail[key] !== undefined && mail[key] !== '', `missing template field: ${key}`);
    }
  }
});

test('pickup notifications omit a previously entered delivery address', () => {
  const h = harness(); h.open({ method: 'USDC', delivery: 'pickup' }); h.submit();
  assert.equal(h.emails[0].address, 'Not applicable');
  assert.doesNotMatch(h.emails[0].message, /Test address/);
});

test('HSO selection retains the exact unit identity in checkout, confirmation, email and WhatsApp for every payment method', () => {
  const { orderName } = require('../js/hso-stock.js');
  const name = orderName({ name: 'iPhone 15' }, { storage: '128GB', color: 'Black', serial: 'HF04HX445H', batteryHealth: 88 });
  for (const method of ['sentoo', 'suave', 'USDT', 'USDC']) {
    const h = harness(); h.open({ method, name, price: 1099 });
    assert.equal(h.get('checkout-product').textContent, name);
    h.submit();
    assert.equal(h.emails.length, 1);
    assert.equal(h.emails[0].product, name);
    assert.equal(h.emails[0].items, `${name} — 1 × XCG 1,099`);
    assert.ok(h.emails[0].message.includes(`Product: ${name}`));
    const confirmation = h.get('checkout-confirmation');
    assert.ok(confirmation.children.some(child => child.textContent.includes(name)));
    const link = confirmation.children.find(child => child.href?.startsWith('https://wa.me/'));
    assert.ok(link);
    assert.ok(new URL(link.href).searchParams.get('text').includes(`Product: ${name}`));
  }
});

for (const [payment, delivery, price, expected, fee, remaining] of [
  ['full', 'pickup', 100, '103.00', '3.00', 0],
  ['full', 'delivery', 100, '139.05', '4.05', 0],
  ['reserve', 'pickup', 348, '103.00', '3.00', 248],
  ['reserve', 'delivery', 348, '139.05', '4.05', 248],
  ['reserve', 'pickup', 35, '36.05', '1.05', 0],
  ['full', 'pickup', 49.99, '51.49', '1.50', 0]
]) {
  test(`Suave ${payment} ${delivery} at ${price} requests a QR for XCG ${expected}`, () => {
    const h = harness(); h.open({ method:'suave', payment, delivery, price });
    assert.equal(h.get('checkout-total').textContent, `XCG ${expected}`);
    assert.equal(h.get('checkout-payment-fee').textContent, `XCG ${fee}`);
    assert.match(h.get('submit').textContent, /Request Suave QR/);
    h.submit(); h.submit();
    assert.equal(h.emails.length,1); assert.equal(h.popups.length,0);
    const mail=h.emails[0];
    assert.equal(mail.amount, `XCG ${expected}`);
    assert.equal(mail.qrAmount,mail.amount); assert.equal(mail.totalXCG,mail.amount);
    assert.equal(mail.paymentFee, `XCG ${fee} (Suave 3%)`);
    assert.equal(mail.remainingBalance, `XCG ${remaining}`);
    assert.equal(mail.network,'Not applicable'); assert.equal(mail.wallet,'Not applicable');
    assert.match(mail.status,/Awaiting Suave QR code/); assert.ok(mail.staffAction.includes(mail.amount));
    const confirmation=h.get('checkout-confirmation');
    assert.match(confirmation.children.map(n=>n.textContent).join('\n'),/Payment is not verified yet/);
    const link=confirmation.children.find(n=>n.tagName==='a');
    assert.equal(link.textContent,'Request Suave QR on WhatsApp');
    const message=new URL(link.href).searchParams.get('text');
    assert.ok(message.includes(`Suave QR amount: XCG ${expected}`));
    assert.doesNotMatch(message,/undefined|Receiving wallet|Ethereum|transaction hash/);
  });
}

test('Suave can be paused and changing methods clears its surcharge', () => {
  const h=harness(); h.open({method:'suave',price:100});
  h.get('checkout-method').value='sentoo'; h.api.updateCheckoutSummary();
  assert.equal(h.get('checkout-total').textContent,'XCG 100');
  assert.equal(h.get('checkout-payment-fee').textContent,'XCG 0.00');
  h.api.config.suave.enabled=false; h.api.populatePaymentMethods();
  assert(!h.get('checkout-method').children.some(n=>n.value==='suave'));
  assert.throws(()=>h.api.paymentQuote(100,'suave'));
  for(const amount of [0,-1,NaN,Infinity,'100']) assert.throws(()=>h.api.paymentQuote(amount,'suave'));
});

test('a phone sold while checkout is open cannot prepare payment or notify the store', async () => {
  for (const method of ['sentoo', 'suave', 'USDT', 'USDC']) {
    const h = harness();
    let available = true, checks = 0;
    h.open({ method, validateAvailability: async () => {
      checks++;
      if (!available) throw new Error('This phone has been sold. Please choose another phone.');
      return true;
    } });
    assert.equal(checks, 0, 'availability is checked at submit, not only when opening');
    available = false;
    await h.submit();
    assert.equal(checks, 1);
    assert.equal(h.emails.length, 0);
    assert.equal(h.popups.length, 0);
    assert.equal(h.get('checkout-confirmation').hidden, true);
    assert.equal(h.get('checkout-form').hidden, false);
    assert.match(h.get('checkout-error').textContent, /has been sold/);
    assert(h.formControls().every(control => !control.disabled));
  }
});

test('upstream availability failures fail closed and a fresh retry can succeed', async () => {
  const h = harness();
  let offline = true;
  h.open({ validateAvailability: async () => {
    if (offline) throw new Error('Stock is temporarily unavailable. Please try again.');
    return true;
  } });
  const submitLabel = h.get('submit').textContent;
  await h.submit();
  assert.match(h.get('checkout-error').textContent, /temporarily unavailable/);
  assert.equal(h.get('submit').textContent, submitLabel);
  assert.equal(h.emails.length, 0);
  assert.equal(h.popups.length, 0);
  assert(h.formControls().every(control => !control.disabled));
  offline = false;
  await h.submit();
  assert.equal(h.emails.length, 1);
  assert.equal(h.popups.length, 1);
  assert.equal(h.get('checkout-error').textContent, '');
});

test('pending stock checks freeze checkout details and ignore duplicate submissions', async () => {
  const h = harness(), check = deferred();
  let checks = 0;
  h.open({ method: 'suave', price: 1099, payment: 'reserve', delivery: 'delivery', validateAvailability: () => {
    checks++;
    return check.promise;
  } });
  const pending = h.submit();
  assert(h.formControls().every(control => control.disabled));
  assert.match(h.get('submit').textContent, /Checking availability/);
  h.api.updateCheckoutSummary();
  assert(h.formControls().every(control => control.disabled), 'summary events cannot unlock a pending checkout');
  await h.submit();
  assert.equal(checks, 1);
  assert.equal(h.emails.length, 0);
  assert.equal(h.popups.length, 0);
  check.resolve(true);
  await pending;
  assert.equal(h.emails.length, 1);
  assert.equal(h.emails[0].amount, 'XCG 139.05');
  assert.equal(h.emails[0].name, 'Test customer');
  assert.equal(h.emails[0].address, 'Test address');
  await h.submit();
  assert.equal(h.emails.length, 1);
});

test('closing a checkout while checking availability discards a successful result', async () => {
  const h = harness(), check = deferred();
  h.open({ validateAvailability: () => check.promise });
  const pending = h.submit();
  h.api.closeCheckout();
  assert(h.formControls().every(control => !control.disabled));
  check.resolve(true);
  await pending;
  assert.equal(h.emails.length, 0);
  assert.equal(h.popups.length, 0);
  assert.equal(h.get('checkout-confirmation').hidden, true);
});

test('reopening checkout cannot receive an old check result or unlock the new check', async () => {
  for (const rejected of [false, true]) {
    const h = harness(), oldCheck = deferred(), newCheck = deferred();
    h.open({ name: 'Old phone', validateAvailability: () => oldCheck.promise });
    const oldPending = h.submit();
    if (rejected) h.api.closeCheckout();
    h.open({ name: 'New phone', validateAvailability: () => newCheck.promise });
    const newPending = h.submit();
    if (rejected) oldCheck.reject(new Error('Old phone has been sold.'));
    else oldCheck.resolve(true);
    await oldPending;
    assert.equal(h.get('checkout-product').textContent, 'New phone');
    assert.equal(h.get('checkout-error').textContent, '');
    assert(h.formControls().every(control => control.disabled));
    assert.equal(h.emails.length, 0);
    assert.equal(h.popups.length, 0);
    newCheck.resolve(true);
    await newPending;
    assert.equal(h.emails.length, 1);
    assert.equal(h.emails[0].product, 'New phone');
    assert.equal(h.popups.length, 1);
  }
});

test('availability requires explicit success and preserves returned failure messages', async () => {
  for (const result of [false, undefined, null, 'This phone is reserved.']) {
    const h = harness();
    h.open({ validateAvailability: async () => result });
    await h.submit();
    assert.equal(h.emails.length, 0);
    assert.equal(h.popups.length, 0);
    assert.match(h.get('checkout-error').textContent, typeof result === 'string' ? /reserved/ : /not available/);
  }
});
