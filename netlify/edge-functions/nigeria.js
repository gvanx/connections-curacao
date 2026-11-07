const CURACAO_HOME = 'https://connectionscuracao.net/';
// Only the digest is public. The random 256-bit invitation stays in the private
// link; neither it nor an authenticated preview cookie belongs in source control.
const PREVIEW_TOKEN_SHA256 = 'cb26dc4f7570f34191b3cf8dcdd775a93b6342908cb7cd4f3a3a28f012e837af';
const PREVIEW_EXPIRES_AT = '2026-11-14T21:06:00.000Z';
const PREVIEW_COOKIE = '__Secure-connections_ng_preview';
const NO_STORE = {
  'Cache-Control': 'private, no-store',
  'CDN-Cache-Control': 'no-store',
  'Netlify-CDN-Cache-Control': 'no-store',
};

// Match encoded spellings too: the origin must never resolve a protected file
// after the country check has mistaken its URL for an unrelated public path.
function normalizedPath(pathname) {
  let path = pathname;
  for (let i = 0; i < 5; i += 1) {
    let decoded;
    try { decoded = decodeURIComponent(path); } catch { return null; }
    if (decoded === path) {
      path = path.replace(/\\/g, '/').replace(/\/+/g, '/');
      return new URL(path, 'https://path.invalid').pathname.toLowerCase();
    }
    path = decoded;
  }
  return null;
}

function redirect(location) {
  return new Response(null, { status: 302, headers: { ...NO_STORE, Location: location } });
}

async function validPreviewToken(token) {
  if (Date.now() >= Date.parse(PREVIEW_EXPIRES_AT) ||
      typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return hex === PREVIEW_TOKEN_SHA256;
}

async function hasPreviewSession(request) {
  const matches = (request.headers.get('Cookie') || '').split(';')
    .map(part => part.trim()).filter(part => part.startsWith(PREVIEW_COOKIE + '='));
  // Ambiguous cookies must not select a different credential on different hops.
  return matches.length === 1 && validPreviewToken(matches[0].slice(PREVIEW_COOKIE.length + 1));
}

const PREVIEW_SCRIPT = `
(async function () {
  const token = location.hash.slice(1);
  history.replaceState(null, '', location.pathname);
  const status = document.getElementById('status');
  if (!token) {
    status.textContent = 'Please open the complete private preview link you were given.';
    return;
  }
  try {
    const response = await fetch('/nigeria/preview/', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    if (!response.ok) {
      status.textContent = 'This preview link has expired or is not valid.';
      return;
    }
    location.replace('/nigeria/');
  } catch {
    status.textContent = 'Unable to open the preview. Please try your private link again.';
  }
})();`;

async function previewEntry(request) {
  const privateHeaders = {
    ...NO_STORE, 'Referrer-Policy': 'no-referrer',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'X-Content-Type-Options': 'nosniff',
  };
  if (request.method === 'POST') {
    // The invitation is exchanged in the body, never a URL query or redirect.
    if (request.headers.get('Origin') !== new URL(request.url).origin ||
        request.headers.get('Content-Type')?.split(';')[0] !== 'application/json') {
      return new Response('Not allowed', { status: 403, headers: privateHeaders });
    }
    if (Number(request.headers.get('Content-Length')) > 256) {
      return new Response('Invalid request', { status: 400, headers: privateHeaders });
    }
    let token;
    try {
      const body = await request.text();
      if (body.length > 256) throw new Error('Request too large');
      token = JSON.parse(body).token;
    } catch {
      return new Response('Invalid request', { status: 400, headers: privateHeaders });
    }
    if (!await validPreviewToken(token)) {
      return new Response('Preview unavailable', { status: 403, headers: privateHeaders });
    }
    const maxAge = Math.max(0, Math.floor((Date.parse(PREVIEW_EXPIRES_AT) - Date.now()) / 1000));
    return new Response(null, {
      status: 204,
      headers: {
        ...privateHeaders,
        'Set-Cookie': PREVIEW_COOKIE + '=' + token + '; Path=/nigeria; Max-Age=' + maxAge +
          '; Secure; HttpOnly; SameSite=Lax',
      },
    });
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', {
      status: 405, headers: { ...privateHeaders, Allow: 'GET, HEAD, POST' },
    });
  }
  if (await hasPreviewSession(request)) return redirect('/nigeria/');
  const nonce = crypto.randomUUID();
  const headers = {
    ...privateHeaders, 'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': "default-src 'none'; script-src 'nonce-" + nonce +
      "'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  };
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Connections — Private preview</title>' +
    '<style>body{margin:0;padding:12vh 24px;background:#faf8f2;color:#143e35;font:16px/1.6 system-ui,sans-serif}' +
    'main{max-width:540px;margin:auto}h1{font-size:32px;letter-spacing:-1px}p{color:#596b62}</style>' +
    '</head><body><main><h1>Connections Nigeria</h1><p id="status">Opening your private preview…</p>' +
    '<noscript><p>Enable JavaScript to open your private preview.</p></noscript></main>' +
    '<script nonce="' + nonce + '">' + PREVIEW_SCRIPT + '</script></body></html>';
  return new Response(request.method === 'HEAD' ? null : html, { headers });
}

export default async function nigeria(request, context) {
  const url = new URL(request.url);
  const path = normalizedPath(url.pathname);
  if (path === null) {
    return new Response('Invalid URL', { status: 400, headers: NO_STORE });
  }
  if (path === '/nigeria/preview' || path === '/nigeria/preview/') {
    return previewEntry(request);
  }
  const isNigeriaPage = path === '/nigeria' || path.startsWith('/nigeria/');
  // Public visitors use trusted GeoIP. The sole exception is an unexpired,
  // cryptographically verified private preview session, explicitly requested
  // by the owner. Country cookies, query parameters and headers remain ignored.
  const inNigeria = context.geo?.country?.code === 'NG';

  if (isNigeriaPage) {
    if (!inNigeria && !await hasPreviewSession(request)) return redirect(CURACAO_HOME);
    const response = await context.next();
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(NO_STORE)) headers.set(key, value);
    headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    headers.set('Referrer-Policy', 'no-referrer');
    return new Response(response.body, {
      status: response.status, statusText: response.statusText, headers,
    });
  }

  if (inNigeria && (path === '/' || path === '/index.html') &&
      (request.method === 'GET' || request.method === 'HEAD')) {
    // A temporary redirect follows a visitor's current country. Keep campaign
    // query parameters, and keep deploy previews on their own origin.
    return redirect('/nigeria/' + url.search);
  }

  return undefined;
}

// Run before the CDN cache, including for direct HTML/asset URLs and encoded
// paths. Never enable manual caching or fail-open behavior for this gate.
export const config = { path: '/*', onError: 'fail' };
