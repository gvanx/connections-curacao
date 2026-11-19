(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!root.document) return;
  const doc = root.document;
  const grid = doc.getElementById('bf-products');
  if (!grid) return;
  const filters = doc.getElementById('bf-filters');
  const sort = doc.getElementById('bf-sort');
  const count = doc.getElementById('bf-count');
  const empty = doc.getElementById('bf-empty');
  const error = doc.getElementById('bf-error');
  const toolbar = doc.getElementById('bf-toolbar');
  const spotlight = doc.getElementById('bf-spotlight');
  let products = [], category = 'all', loading = false;
  function render() {
    const visible = api.selectDeals(products, category, sort.value);
    grid.innerHTML = visible.map(api.cardHTML).join('');
    root.attachOrderButtons(grid);
    count.textContent = `${visible.length} Black Friday ${visible.length === 1 ? 'deal' : 'deals'}`;
    empty.hidden = visible.length > 0;
    filters.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === category)));
  }
  async function load() {
    if (loading) return;
    loading = true;
    grid.setAttribute('aria-busy', 'true');
    error.hidden = true;
    empty.hidden = true;
    count.textContent = 'Loading Black Friday deals…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await root.fetch('/data/products.json?v=2026-11-19-blackfriday-checkout', { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('Catalog unavailable');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid catalog');
      products = data.filter(p => p && typeof p.name === 'string');
      const categories = [...new Set(api.selectDeals(products).map(p => p.category))];
      if (!categories.includes(category)) category = 'all';
      filters.innerHTML = [['all', 'All deals'], ...categories.map(key => [key, api.categoryName(key)])].map(([key, label]) => `<button type="button" data-category="${api.escapeHtml(key)}" aria-pressed="${key === category}">${api.escapeHtml(label)}</button>`).join('');
      toolbar.hidden = !categories.length;
      if (spotlight) {
        const lead = api.selectDeals(products, 'acs', 'price-asc').find(p => Number.isFinite(p.price) && p.price > 0 && !p.inquiryOnly && !p.soldOut);
        spotlight.hidden = !lead;
        spotlight.innerHTML = lead ? api.cardHTML(lead) : '';
        root.attachOrderButtons(spotlight);
      }
      render();
    } catch (_) {
      grid.replaceChildren(); toolbar.hidden = true; error.hidden = false;
      if (spotlight) { spotlight.hidden = true; spotlight.replaceChildren(); }
      count.textContent = 'Black Friday deals are temporarily unavailable.';
    } finally {
      loading = false; clearTimeout(timeout); grid.setAttribute('aria-busy', 'false');
    }
  }
  filters.addEventListener('click', event => {
    const button = event.target.closest('button[data-category]');
    if (button) { category = button.dataset.category; render(); }
  });
  sort.addEventListener('change', render);
  doc.getElementById('bf-retry').addEventListener('click', load);
  function recoverImage(event) {
    if (event.target.tagName === 'IMG') {
      const frame = event.target.closest('.bf-card-image');
      (frame || event.target.parentElement).innerHTML = api.modelArt(event.target.alt, 'Connections');
    }
  }
  grid.addEventListener('error', recoverImage, true);
  if (spotlight) spotlight.addEventListener('error', recoverImage, true);
  root.initCheckoutModal();
  load();
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const labels = { acs: 'Airco specials', samsung: 'Samsung', apple: 'Apple', laptops: 'Laptops', phones: 'Phones', tvs: 'Televisions', appliances: 'Appliances', motor: 'Scooters', other: 'More deals', giftcards: 'Gift cards' };
  function categoryName(key) { return labels[key] || 'More deals'; }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
  function hasPrice(p) { return Number.isFinite(p.price) && p.price > 0; }
  function savings(p) { return hasPrice(p) && Number.isFinite(p.oldPrice) && p.oldPrice > p.price ? Math.round((p.oldPrice - p.price) * 100) / 100 : 0; }
  function money(value) { return 'XCG ' + value.toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  function selectDeals(products, category = 'all', sort = 'featured') {
    const list = products.filter(p => p.blackFriday === true && (category === 'all' || p.category === category));
    if (sort === 'price-asc') return list.sort((a, b) => (hasPrice(a) ? a.price : Infinity) - (hasPrice(b) ? b.price : Infinity));
    if (sort === 'price-desc') return list.sort((a, b) => (hasPrice(b) ? b.price : -Infinity) - (hasPrice(a) ? a.price : -Infinity));
    if (sort === 'savings') return list.sort((a, b) => savings(b) - savings(a));
    return list.sort((a, b) => Number(b.category === 'acs') - Number(a.category === 'acs') || Number(!!b.featured) - Number(!!a.featured));
  }
  function modelArt(name, brand) {
    return `<div class="bf-model-art" role="img" aria-label="${escapeHtml(name)}"><span>${escapeHtml(brand)}</span><strong>${escapeHtml(name.replace(/^Premier /, '').replace(/ Inverter AC$/, ''))}</strong><span>${/Inverter AC$/.test(name) ? 'INVERTER AIR CONDITIONER' : 'BLACK FRIDAY COLLECTION'}</span></div>`;
  }
  function imageSrc(p) {
    if (!p.image || p.imageUnavailable) return '';
    if (p.image.startsWith('/')) return p.image;
    const requested = p.image.replace(/\.jpe?g$/i, '.png');
    const overrides = { 'tv-generic.png': 'tv-catalog.webp', 'laptop-generic.png': 'laptop-catalog.webp', 'ac-generic.png': 'ac-catalog.webp', 'iphone-16-plus-model.png': 'iphone-16-plus-model.jpg' };
    return '/img/products/' + (overrides[requested] || requested);
  }
  function validImageCrop(crop) {
    if (!crop || typeof crop !== 'object' || Array.isArray(crop)) return false;
    const { x, y, width, height, sourceWidth, sourceHeight } = crop;
    return [x, y, width, height, sourceWidth, sourceHeight].every(Number.isSafeInteger) &&
      x >= 0 && y >= 0 && width > 0 && height > 0 && sourceWidth > 0 && sourceHeight > 0 &&
      x <= sourceWidth - width && y <= sourceHeight - height;
  }
  function visualHTML(p, name) {
    const src = imageSrc(p);
    if (!src) return modelArt(name, /^Premier/.test(name) ? 'PREMIER' : categoryName(p.category));
    if (validImageCrop(p.imageCrop)) {
      const c = p.imageCrop;
      return `<div class="bf-photo-crop" style="aspect-ratio:${c.width}/${c.height}"><img src="${escapeHtml(src)}" alt="${escapeHtml(name)}" loading="lazy" decoding="async" style="width:${c.sourceWidth / c.width * 100}%;left:${-c.x / c.width * 100}%;top:${-c.y / c.height * 100}%"></div>`;
    }
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(name)}" loading="lazy" decoding="async">`;
  }
  function actionHTML(p, name) {
    // Digital-card prices and checkout remain authoritative in their own store.
    if (p.category === 'giftcards') return '<a class="bf-card-button" href="https://giftcard.connectionscuracao.net/">View gift-card store</a>';
    if (p.soldOut === true) return '<button class="bf-card-button" type="button" disabled>Sold out</button>';
    if (p.inquiryOnly || !hasPrice(p)) {
      const number = /^\d+$/.test(p.contactNumber || '') ? p.contactNumber : '59996782619';
      const message = `Hi, I'm interested in the Black Friday offer: ${name}${hasPrice(p) ? ' (' + money(p.price) + ')' : ''}. Please send me the details and availability.`;
      const landing = typeof p.landingPage === 'string' && /^\/(?!\/)/.test(p.landingPage) ? p.landingPage : '';
      return `<a class="bf-card-button" href="${escapeHtml(landing || 'https://wa.me/' + number + '?text=' + encodeURIComponent(message))}"${landing ? '' : ' target="_blank" rel="noopener"'}>${escapeHtml(landing ? 'View details' : p.inquiryLabel || 'Ask about this offer')}</a>`;
    }
    return `<button type="button" class="bf-card-button js-order-btn" data-product-name="${escapeHtml(encodeURIComponent(name))}" data-product-price="${p.price}">Checkout &amp; Pay</button>`;
  }
  function cardHTML(p) {
    const name = [p.name, p.suffix].filter(Boolean).join(' '), saving = savings(p), digital = p.category === 'giftcards';
    return `<article class="bf-card"><div class="bf-card-image"><span class="bf-badge">BLACK FRIDAY</span>${visualHTML(p, name)}</div><div class="bf-card-body"><p class="bf-card-category">${escapeHtml(categoryName(p.category))}</p><h3>${escapeHtml(name)}</h3><p class="bf-card-spec">${escapeHtml(p.spec || '')}</p><div class="bf-price-row">${!digital && saving ? `<del><span class="sr-only">Was </span>${money(p.oldPrice)}</del>` : ''}<strong>${digital ? 'Check current price' : hasPrice(p) ? money(p.price) : 'Ask for price'}</strong></div><p class="bf-saving">${!digital && saving ? 'Save ' + money(saving) : 'Black Friday pick'}</p>${actionHTML(p, name)}</div></article>`;
  }
  return { categoryName, escapeHtml, selectDeals, savings, cardHTML, modelArt, imageSrc, validImageCrop };
});
