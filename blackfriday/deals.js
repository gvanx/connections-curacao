(function (root, factory) {
  'use strict';
  const hsoCatalog = root.HSOCatalog || (typeof HSOCatalog !== 'undefined' ? HSOCatalog :
    typeof module === 'object' && module.exports ? require('../js/hso-catalog.js') : null);
  const api = factory(hsoCatalog);
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
  let products = [], baseProducts = [], inventory = null, category = categoryFromHash(), loading = false, refreshing = false;
  function categoryFromHash() {
    const key = (root.location?.hash || '').slice(1);
    return ['appliances', 'acs', 'samsung', 'apple', 'laptops', 'phones', 'tvs', 'motor', 'other', 'giftcards'].includes(key) ? key : 'all';
  }
  const INVENTORY_CACHE_KEY = 'bf-hso-stock-v1';
  const INVENTORY_CACHE_MAX_AGE_MS = 30 * 60 * 1000;
  function cachedInventory() {
    try {
      const saved = JSON.parse(root.localStorage?.getItem(INVENTORY_CACHE_KEY) || 'null');
      const stock = saved?.inventory;
      if (!stock || stock.schemaVersion !== 2 || !Array.isArray(stock.models) ||
          !Array.isArray(stock.variants) || !Array.isArray(stock.units) ||
          !Number.isFinite(saved.savedAt) || Date.now() - saved.savedAt > INVENTORY_CACHE_MAX_AGE_MS) return null;
      return stock;
    } catch (_) { return null; }
  }
  function rememberInventory(stock) {
    try {
      root.localStorage?.setItem(INVENTORY_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), inventory: stock }));
    } catch (_) { /* Private browsing or a full quota must not break the deals page. */ }
  }
  async function currentInventory() {
    try {
      const stock = await hsoCatalog.fetchInventory(root.fetch.bind(root));
      if (stock) { rememberInventory(stock); return stock; }
    } catch (_) { /* Use the last known good registry below. */ }
    return cachedInventory();
  }
  function applyAvailability() {
    const available = hsoCatalog ? hsoCatalog.projectCatalog(baseProducts, inventory, { previous: products }) : baseProducts.filter(p => p.suffix !== 'HSO');
    if (available.length === products.length && available.every((product, index) => product === products[index])) return false;
    products = available;
    const categories = [...new Set(api.selectDeals(products).map(p => p.category))];
    if (!categories.includes('appliances') && api.selectDeals(products).some(p => p.blackFridayAppliance === true)) categories.push('appliances');
    if (!categories.includes(category)) category = 'all';
    filters.innerHTML = [['all', 'All deals'], ...categories.map(key => [key, api.categoryName(key)])].map(([key, label]) => `<button type="button" data-category="${api.escapeHtml(key)}" aria-pressed="${key === category}">${api.escapeHtml(label)}</button>`).join('');
    toolbar.hidden = !categories.length;
    return true;
  }
  async function refreshInventory() {
    if (loading || refreshing || !hsoCatalog) return;
    refreshing = true;
    try {
      inventory = await currentInventory();
      if (applyAvailability()) render();
    } finally { refreshing = false; }
  }
  function render() {
    const visible = api.selectDeals(products, category, sort.value);
    grid.innerHTML = category === 'appliances' && sort.value === 'featured' ? api.applianceGroupsHTML(visible) : visible.map(api.cardHTML).join('');
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
      const response = await root.fetch('/data/products.json?v=2026-11-25-bf-appliance-checkout', { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('Catalog unavailable');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid catalog');
      baseProducts = data.filter(p => p && typeof p.name === 'string');
      inventory = hsoCatalog ? await currentInventory() : null;
      applyAvailability();
      if (spotlight) {
        const lead = api.selectDeals(products, 'acs', 'price-asc').find(p => Number.isFinite(p.price) && p.price > 0 && !p.inquiryOnly && !p.soldOut);
        spotlight.hidden = !lead;
        spotlight.innerHTML = lead ? '<h2 class="sr-only">Featured Black Friday deal</h2>' + api.cardHTML(lead) : '';
        root.attachOrderButtons(spotlight);
      }
      render();
      if (category === 'appliances') doc.getElementById('offers')?.scrollIntoView?.({ block: 'start' });
    } catch (_) {
      baseProducts = []; products = []; inventory = null;
      grid.replaceChildren(); toolbar.hidden = true; error.hidden = false;
      if (spotlight) { spotlight.hidden = true; spotlight.replaceChildren(); }
      count.textContent = 'Black Friday deals are temporarily unavailable.';
    } finally {
      loading = false; clearTimeout(timeout); grid.setAttribute('aria-busy', 'false');
    }
  }
  filters.addEventListener('click', event => {
    const button = event.target.closest('button[data-category]');
    if (button) {
      category = button.dataset.category;
      root.history?.replaceState(null, '', category === 'all' ? '#offers' : '#' + category);
      render();
    }
  });
  root.addEventListener('hashchange', () => {
    category = categoryFromHash();
    render();
    if (category === 'appliances') doc.getElementById('offers')?.scrollIntoView?.({ block: 'start' });
  });
  sort.addEventListener('change', render);
  doc.getElementById('bf-retry').addEventListener('click', load);
  function recoverImage(event) {
    if (event.target.tagName === 'IMG') {
      const frame = event.target.closest('.hso-product-link') || event.target.closest('.bf-card-image');
      (frame || event.target.parentElement).innerHTML = api.modelArt(event.target.alt, 'Connections');
    }
  }
  grid.addEventListener('error', recoverImage, true);
  if (spotlight) spotlight.addEventListener('error', recoverImage, true);
  root.initCheckoutModal();
  root.addEventListener('focus', refreshInventory);
  root.addEventListener('online', refreshInventory);
  doc.addEventListener('visibilitychange', () => { if (!doc.hidden) refreshInventory(); });
  setInterval(() => { if (!doc.hidden) refreshInventory(); }, 30000);
  load();
})(typeof window === 'undefined' ? globalThis : window, function (hsoCatalog) {
  'use strict';
  const labels = { acs: 'Airco specials', samsung: 'Samsung', apple: 'Apple', laptops: 'Laptops', phones: 'Phones', tvs: 'Televisions', appliances: 'Appliances', motor: 'Scooters', other: 'More deals', giftcards: 'Gift cards' };
  function categoryName(key) { return labels[key] || 'More deals'; }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
  function hasPrice(p) { return Number.isFinite(p.price) && p.price > 0; }
  function isInStoreSpecial(p) { return p.inStoreSpecial === true && p.price == null; }
  function savings(p) { return hasPrice(p) && Number.isFinite(p.oldPrice) && p.oldPrice > p.price ? Math.round((p.oldPrice - p.price) * 100) / 100 : 0; }
  function money(value) { return 'XCG ' + value.toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  function selectDeals(products, category = 'all', sort = 'featured') {
    const list = products.filter(p => p.blackFriday === true && (category === 'all' || p.category === category || (category === 'appliances' && p.blackFridayAppliance === true))).map(p => hsoCatalog ? hsoCatalog.campaignProduct(p) : p);
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
    if (p.image.startsWith('/') || p.image.startsWith('https://')) return p.image;
    const requested = p.image.replace(/\.jpe?g$/i, '.png');
    const overrides = { 'tv-generic.png': 'tv-catalog.webp', 'laptop-generic.png': 'laptop-catalog.webp', 'ac-generic.png': 'ac-catalog.webp', 'iphone-16-plus-model.png': 'iphone-16-plus-model.jpg' };
    return '/img/products/' + (overrides[requested] || requested);
  }
  function visualHTML(p, name) {
    const src = imageSrc(p);
    if (!src && p.blackFridayAppliance === true && p.sku) return `<div class="bf-model-art bf-appliance-art" role="img" aria-label="${escapeHtml(name)}"><span>${escapeHtml(p.type || categoryName(p.category))}</span><strong>${escapeHtml(p.sku)}</strong></div>`;
    if (!src) return modelArt(name, /^Premier/.test(name) ? 'PREMIER' : categoryName(p.category));
    return `<img src="${escapeHtml(src)}" class="${p.category === 'acs' && !p.imagePlaceholder ? 'bf-airco-image' : 'bf-product-image'}" alt="${escapeHtml(name + (p.imagePlaceholder ? ' — illustration' : ''))}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`;
  }
  function detailsUrl(p) {
    return hsoCatalog ? hsoCatalog.detailsUrl(p) : p.suffix === 'HSO' && p.hsoModel ? '/hso/' : '';
  }
  function detailLink(url, content, label) {
    return url ? `<a class="hso-product-link" href="${escapeHtml(url)}"${label ? ` aria-label="${escapeHtml(label)}"` : ''}>${content}</a>` : content;
  }
  function actionHTML(p, name) {
    // Digital-card prices and checkout remain authoritative in their own store.
    if (p.category === 'giftcards') return '<a class="bf-card-button" href="https://giftcard.connectionscuracao.net/">View gift-card store</a>';
    if (p.soldOut === true) return '<button class="bf-card-button" type="button" disabled>Sold out</button>';
    const hsoUrl = detailsUrl(p);
    if (hsoUrl) return `<a class="bf-card-button" href="${escapeHtml(hsoUrl)}">Choose your device</a>`;
    if (p.inquiryOnly || !hasPrice(p)) {
      const number = /^\d+$/.test(p.contactNumber || '') ? p.contactNumber : '59996782619';
      const message = `Hi, I'm interested in the Black Friday ${isInStoreSpecial(p) ? 'in-store special' : 'offer'}: ${name}${hasPrice(p) ? ' (' + money(p.price) + ')' : ''}. Please send me the details and availability.`;
      const landing = typeof p.landingPage === 'string' && /^\/(?!\/)/.test(p.landingPage) ? p.landingPage : '';
      return `<a class="bf-card-button" href="${escapeHtml(landing || 'https://wa.me/' + number + '?text=' + encodeURIComponent(message))}"${landing ? '' : ' target="_blank" rel="noopener"'}>${escapeHtml(landing ? 'View details' : p.inquiryLabel || 'Ask about this offer')}</a>`;
    }
    return `<button type="button" class="bf-card-button js-order-btn" data-product-name="${escapeHtml(encodeURIComponent(name))}" data-product-price="${p.price}">Checkout &amp; Pay</button>`;
  }
  function cardHTML(p) {
    const name = [p.name, p.suffix].filter(Boolean).join(' '), saving = savings(p), digital = p.category === 'giftcards';
    const hsoUrl = detailsUrl(p);
    return `<article class="bf-card"><div class="bf-card-image"><span class="bf-badge">BLACK FRIDAY</span>${detailLink(hsoUrl, visualHTML(p, name), 'View available ' + name + ' devices')}</div><div class="bf-card-body"><p class="bf-card-category">${escapeHtml(categoryName(p.category))}</p><h3>${detailLink(hsoUrl, escapeHtml(name))}</h3><p class="bf-card-spec">${escapeHtml(p.spec || '')}</p><div class="bf-price-row">${!digital && saving ? `<del><span class="sr-only">Was </span>${money(p.oldPrice)}</del>` : ''}<strong>${digital ? 'Check current price' : hasPrice(p) ? (p.hsoPriceFrom ? 'From ' : '') + money(p.price) : isInStoreSpecial(p) ? 'In-store special' : 'Ask for price'}</strong></div><p class="bf-saving">${!digital && saving ? 'Save ' + money(saving) : 'Black Friday pick'}</p>${actionHTML(p, name)}</div></article>`;
  }
  function applianceGroupsHTML(products) {
    const groups = { 'personal-care': 'Personal care', kitchen: 'Kitchen essentials', cooling: 'Fans & air conditioning' };
    return Object.entries(groups).map(([key, label]) => {
      const items = products.filter(p => p.applianceGroup === key);
      return items.length ? `<section class="bf-appliance-group" aria-label="${label}"><h3>${label}</h3><div class="bf-grid">${items.map(cardHTML).join('')}</div></section>` : '';
    }).join('') + products.filter(p => !groups[p.applianceGroup]).map(cardHTML).join('');
  }
  return { categoryName, escapeHtml, selectDeals, savings, cardHTML, modelArt, imageSrc, applianceGroupsHTML };
});
