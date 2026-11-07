const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../netlify/edge-functions/nigeria.js'), 'utf8');
const edge = import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const home = 'https://connectionscuracao.net/';

async function invoke(urlPath, country, options = {}) {
  const { default: handler } = await edge;
  let served = false;
  const response = await handler(new Request((options.origin || home.slice(0, -1)) + urlPath, options.request), {
    geo: country === undefined ? undefined : { country: { code: country } },
    next: async () => {
      served = true;
      return new Response('Nigeria storefront', {
        headers: { 'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=3600' },
      });
    },
  });
  return { response, served };
}

test('Nigeria can load the regional page and its direct assets without shared caching', async () => {
  for (const url of ['/nigeria', '/nigeria/', '/nigeria/index.html', '/nigeria/styles.css', '/nigeria/storefront.js']) {
    const { response, served } = await invoke(url, 'NG');
    assert.equal(served, true);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    assert.equal(response.headers.get('Netlify-CDN-Cache-Control'), 'no-store');
    assert.equal(await response.text(), 'Nigeria storefront');
  }
});

test('all other and unknown countries redirect before protected content is read', async () => {
  for (const country of ['CW', 'US', 'GB', '', undefined, 'ng']) {
    for (const url of ['/nigeria', '/nigeria/', '/nigeria/index.html', '/nigeria/styles.css']) {
      const { response, served } = await invoke(url, country);
      assert.equal(served, false);
      assert.equal(response.status, 302);
      assert.equal(response.headers.get('Location'), home);
      assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
      assert.equal(await response.text(), '');
    }
  }
});

test('encoded, case-varied, repeated slash and backslash paths cannot bypass the country gate', async () => {
  for (const url of ['/n%69geria/', '/%6eigeria/index.html', '/nigeria%2findex.html',
    '/%256eigeria/', '/NIGERIA/', '//nigeria//index.html', '/nigeria%5cindex.html',
    '/public/%2e%2e/nigeria/', '/public%2f..%2fnigeria/']) {
    const { response, served } = await invoke(url, 'CW');
    assert.equal(served, false, url);
    assert.equal(response.status, 302, url);
    assert.equal(response.headers.get('Location'), home, url);
  }
});

test('country cookies, query parameters and spoofed headers never grant access', async () => {
  const { response, served } = await invoke('/nigeria/?country=NG&preview=true&redirect=https://example.com', 'CW', {
    request: { headers: { Cookie: 'nf_country=NG', 'X-Country': 'NG', 'CF-IPCountry': 'NG', 'Accept-Language': 'en-NG' } },
  });
  assert.equal(served, false);
  assert.equal(response.headers.get('Location'), home);
});

test('the same country gate covers deploy preview and native Netlify hosts', async () => {
  for (const origin of ['https://example.netlify.app', 'https://deploy-preview-123--example.netlify.app']) {
    const { response, served } = await invoke('/nigeria/', 'US', { origin });
    assert.equal(served, false);
    assert.equal(response.headers.get('Location'), home);
  }
});

test('Nigeria homepage visits use a temporary regional redirect and retain campaign parameters', async () => {
  for (const url of ['/?utm_source=instagram', '/index.html?utm_source=instagram']) {
    const { response } = await invoke(url, 'NG');
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('Location'), '/nigeria/?utm_source=instagram');
    assert.equal(response.headers.get('CDN-Cache-Control'), 'no-store');
  }
  const { response } = await invoke('/', 'NG', { request: { method: 'HEAD' } });
  assert.equal(response.headers.get('Location'), '/nigeria/');
});

test('Curaçao homepage, existing product pages, shared assets and POSTs pass through', async () => {
  for (const country of ['CW', undefined]) {
    assert.equal((await invoke('/', country)).response, undefined);
  }
  for (const url of ['/suave/', '/data/products.json', '/img/products/apple-gift-card.svg', '/nigerian-news']) {
    assert.equal((await invoke(url, 'NG')).response, undefined);
  }
  assert.equal((await invoke('/', 'NG', { request: { method: 'POST', body: 'test' } })).response, undefined);
});

test('malformed encodings fail closed and upstream failures are not bypassed', async () => {
  assert.equal((await invoke('/nigeria%ZZ/', 'US')).response.status, 400);
  const { default: handler, config } = await edge;
  assert.equal(config.onError, 'fail');
  assert.equal(config.cache, undefined);
  assert.equal(config.path, '/*');
  await assert.rejects(() => handler(new Request(home + 'nigeria/'), {
    geo: { country: { code: 'NG' } }, next: async () => { throw new Error('Origin unavailable'); },
  }), /Origin unavailable/);
});

function inquiry(product, values, valid = true) {
  let submit, destination;
  const form = { dataset: { product }, reportValidity: () => valid,
    addEventListener(name, handler) { if (name === 'submit') submit = handler; } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../nigeria/storefront.js'), 'utf8'), {
    document: { querySelectorAll: () => [form], documentElement: { classList: { add() {} } } },
    FormData: class { get(key) { return values[key]; } },
    window: { location: { assign(url) { destination = url; } } },
    encodeURIComponent,
  });
  submit({ preventDefault() {} });
  return destination ? new URL(destination) : null;
}

test('Apple inquiry carries requested value and account region to the correct WhatsApp number', () => {
  const url = inquiry('apple', { amount: '50 USD', region: 'United States & territories' });
  assert.equal(url.origin + url.pathname, 'https://wa.me/59996782619');
  const message = url.searchParams.get('text');
  assert.match(message, /Connections Nigeria/);
  assert.match(message, /Card value: 50 USD/);
  assert.match(message, /Apple Account region: United States & territories/);
  assert.match(message, /confirm availability, the total price and payment details/);
});

test('USDT inquiry carries amount and optional network without quoting a rate', () => {
  for (const network of ['', 'Requested network']) {
    const url = inquiry('usdt', { amount: '125.50', network });
    assert.equal(url.pathname, '/59996782619');
    const message = url.searchParams.get('text');
    assert.match(message, /buy 125.50 USDT/);
    assert.ok(message.includes(network || 'Please help me confirm the right network'));
    assert.match(message, /total price, any fees and payment details/);
  }
});

test('invalid and whitespace-only form submissions do not open WhatsApp', () => {
  assert.equal(inquiry('usdt', { amount: '-1' }, false), null);
  assert.equal(inquiry('apple', { amount: ' ', region: 'US' }), null);
  assert.equal(inquiry('apple', { amount: '50 USD', region: ' ' }), null);
});

test('retired preview cookies never grant access and are expired on the response', async () => {
  for (const country of ['CW', 'US', undefined]) {
    for (const url of ['/nigeria/', '/nigeria/index.html', '/nigeria/styles.css', '/nigeria/storefront.js', '/nigeria/preview/']) {
      const { response, served } = await invoke(url, country, {
        request: { headers: { Cookie: '__Secure-connections_ng_preview=' + 'a'.repeat(43) } },
      });
      assert.equal(served, false);
      assert.equal(response.status, 302);
      assert.equal(response.headers.get('Location'), home);
      assert.equal(response.headers.get('Set-Cookie'), '__Secure-connections_ng_preview=; Path=/nigeria; Max-Age=0; Secure; HttpOnly; SameSite=Lax');
    }
  }
});

test('the retired invitation exchange redirects without issuing preview access', async () => {
  const { response, served } = await invoke('/nigeria/preview/', 'CW', {
    request: { method: 'POST', headers: { Origin: home.slice(0, -1), 'Content-Type': 'application/json' }, body: JSON.stringify({ token: 'a'.repeat(43) }) },
  });
  assert.equal(served, false);
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('Location'), home);
  assert.match(response.headers.get('Set-Cookie'), /Max-Age=0/);
});
