const CURACAO_HOME = 'https://connectionscuracao.net/';
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

export default async function nigeria(request, context) {
  const url = new URL(request.url);
  const path = normalizedPath(url.pathname);
  if (path === null) {
    return new Response('Invalid URL', { status: 400, headers: NO_STORE });
  }
  const isNigeriaPage = path === '/nigeria' || path.startsWith('/nigeria/');
  // Only Netlify's trusted GeoIP context decides access. Do not use cookies,
  // query parameters, Accept-Language, or client-supplied country headers.
  const inNigeria = context.geo?.country?.code === 'NG';

  if (isNigeriaPage) {
    if (!inNigeria) return redirect(CURACAO_HOME);
    const response = await context.next();
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(NO_STORE)) headers.set(key, value);
    headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
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
