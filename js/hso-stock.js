(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!root.document) return;
  root.HSOStock = api;
  const doc = root.document;
  const models = doc.getElementById('hso-models');
  if (!models) return;
  const detail = doc.getElementById('hso-detail');
  const loading = doc.getElementById('hso-loading');
  const error = doc.getElementById('hso-error');
  const params = new URLSearchParams(root.location.search);
  const selection = { model: params.get('model') || '', storage: params.get('storage') || '', color: params.get('color') || '' };
  let state = null;
  let busy = false;

  async function fetchStock() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const responses = await Promise.all(['/data/hso-stock.json', '/data/products.json'].map(url =>
        root.fetch(url, { cache: 'no-store', signal: controller.signal })));
      if (responses.some(response => !response.ok)) throw new Error('Stock unavailable');
      const [inventory, products] = await Promise.all(responses.map(response => response.json()));
      api.validateInventory(inventory);
      if (!Array.isArray(products)) throw new Error('Catalog unavailable');
      return { inventory, products };
    } finally { clearTimeout(timeout); }
  }

  function render() {
    const { inventory, products } = state;
    const model = inventory.models.find(model => model.id === selection.model);
    const showingDetail = !!selection.model;
    models.hidden = showingDetail;
    detail.hidden = !showingDetail;
    doc.getElementById('hso-back').hidden = !showingDetail;
    doc.getElementById('hso-updated').textContent = 'Stock updated ' + new Date(inventory.updatedAt + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Curacao' });
    if (!showingDetail) {
      doc.getElementById('hso-title').textContent = 'Find your next iPhone.';
      doc.getElementById('hso-intro').textContent = 'Explore our second-hand collection. Pick a model, compare individual phones, then choose yours.';
      const count = inventory.units.filter(api.isAvailable).length;
      doc.getElementById('hso-summary').textContent = `${count} ${count === 1 ? 'phone' : 'phones'} listed · ${inventory.models.length} ${inventory.models.length === 1 ? 'model' : 'models'}`;
      models.innerHTML = inventory.models.map(model => api.modelCardHTML(model, inventory, products)).join('');
      return;
    }
    if (!model) {
      doc.getElementById('hso-title').textContent = 'Model not found';
      doc.getElementById('hso-intro').textContent = 'Browse the second-hand collection to choose another model.';
      doc.getElementById('hso-summary').textContent = '';
      detail.innerHTML = '<a class="hso-link" href="/hso/">View all models</a>';
      return;
    }
    const units = api.selectUnits(inventory, selection);
    doc.title = model.name + ' HSO | Connections Curaçao';
    doc.getElementById('hso-title').textContent = model.name + ' HSO';
    doc.getElementById('hso-intro').textContent = 'Choose your phone. See the serial number, color and battery health for each one below.';
    doc.getElementById('hso-summary').textContent = `${units.length} ${units.length === 1 ? 'phone' : 'phones'} listed`;
    detail.innerHTML = api.detailHTML(model, units, products);
  }

  async function load() {
    if (busy) return;
    busy = true;
    error.hidden = true;
    loading.hidden = false;
    models.setAttribute('aria-busy', 'true');
    detail.setAttribute('aria-busy', 'true');
    try { state = await fetchStock(); render(); }
    catch (_) {
      error.hidden = false;
      models.replaceChildren(); detail.replaceChildren();
      doc.getElementById('hso-summary').textContent = 'Stock is temporarily unavailable.';
    } finally {
      busy = false;
      loading.hidden = true;
      models.setAttribute('aria-busy', 'false'); detail.setAttribute('aria-busy', 'false');
    }
  }

  detail.addEventListener('click', async event => {
    const button = event.target.closest('button[data-hso-serial]');
    if (!button || busy) return;
    busy = true;
    button.disabled = true;
    button.textContent = 'Checking availability…';
    error.hidden = true;
    try {
      state = await fetchStock();
      const unit = state.inventory.units.find(unit => unit.serial === button.dataset.hsoSerial);
      const model = unit && state.inventory.models.find(model => model.id === unit.modelId);
      const product = unit && api.productForUnit(unit, state.products);
      render();
      if (!unit || !model || !api.canCheckout(unit, product)) {
        doc.getElementById('hso-summary').textContent = 'This phone is no longer available for checkout. Please choose another phone or contact us.';
        return;
      }
      // Use the new, connected button as focus-return target after refreshing the list.
      const opener = Array.from(detail.querySelectorAll('button[data-hso-serial]')).find(node => node.dataset.hsoSerial === unit.serial);
      root.openCheckout(api.orderName(model, unit), product.price, opener);
    } catch (_) {
      error.hidden = false;
      button.disabled = false;
      button.textContent = 'Checkout & Pay';
    } finally { busy = false; }
  });
  doc.getElementById('hso-retry').addEventListener('click', load);
  function imageFallback(event) {
    if (event.target.tagName !== 'IMG') return;
    const image = event.target;
    const fallback = doc.createElement('div');
    fallback.className = 'hso-model-art';
    fallback.textContent = image.alt;
    image.replaceWith(fallback);
  }
  models.addEventListener('error', imageFallback, true);
  detail.addEventListener('error', imageFallback, true);
  root.initCheckoutModal();
  load();
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const money = price => 'XCG ' + price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && a.trim().toLowerCase() === b.trim().toLowerCase();
  const isAvailable = unit => unit.status === 'available';
  function validateInventory(inventory) {
    if (!inventory || !Array.isArray(inventory.models) || !Array.isArray(inventory.units) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(inventory.updatedAt) || !Number.isFinite(Date.parse(inventory.updatedAt))) throw new Error('Invalid stock file');
    const modelIds = new Set(), serials = new Set();
    for (const model of inventory.models) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(model.id) || modelIds.has(model.id) || typeof model.name !== 'string' || !model.name.trim()) throw new Error('Invalid model');
      modelIds.add(model.id);
    }
    for (const unit of inventory.units) {
      if (!modelIds.has(unit.modelId) || typeof unit.serial !== 'string' || !/^[A-Za-z0-9]{5,20}$/.test(unit.serial) || serials.has(unit.serial.toUpperCase()) ||
          typeof unit.color !== 'string' || !unit.color.trim() || !/^\d+(GB|TB)$/.test(unit.storage) ||
          !['available', 'reserved', 'sold'].includes(unit.status) ||
          !(unit.batteryHealth === null || (Number.isInteger(unit.batteryHealth) && unit.batteryHealth >= 0 && unit.batteryHealth <= 100))) throw new Error('Invalid phone record');
      serials.add(unit.serial.toUpperCase());
    }
    return inventory;
  }
  function selectUnits(inventory, { model, storage = '', color = '' }) {
    return inventory.units.filter(unit => isAvailable(unit) && unit.modelId === model &&
      (!storage || equal(storage, unit.storage)) && (!color || equal(color, unit.color)));
  }
  function productForUnit(unit, products) {
    const matches = products.filter(p => p.suffix === 'HSO' && p.hsoModel === unit.modelId &&
      equal(p.hsoStorage, unit.storage) && (!p.hsoColor || equal(p.hsoColor, unit.color)));
    // Ambiguous prices must never silently pick a catalog row.
    return matches.length === 1 ? matches[0] : null;
  }
  const hasPrice = product => !!product && Number.isFinite(product.price) && product.price > 0;
  const canCheckout = (unit, product) => isAvailable(unit) && hasPrice(product) && product.soldOut !== true && !product.inquiryOnly;
  const batteryText = unit => Number.isInteger(unit.batteryHealth) && unit.batteryHealth >= 0 && unit.batteryHealth <= 100 ? unit.batteryHealth + '%' : 'Ask for battery health';
  function orderName(model, unit) {
    return `${model.name} HSO · ${unit.storage} · ${unit.color} · Serial/IMEI: ${unit.serial} · Battery health: ${batteryText(unit)}`;
  }
  function visualHTML(model, className) {
    return typeof model.image === 'string' && /^\/img\/products\/[A-Za-z0-9._-]+$/.test(model.image)
      ? `<img class="${className}" src="${escapeHtml(model.image)}" alt="${escapeHtml(model.name)}" loading="lazy" decoding="async">`
      : `<div class="hso-model-art"><span>APPLE / HSO</span><strong>${escapeHtml(model.name)}</strong></div>`;
  }
  function priceHTML(product) {
    if (!hasPrice(product)) return 'Ask for price';
    const old = Number.isFinite(product.oldPrice) && product.oldPrice > product.price;
    return `${old ? `<del><span class="sr-only">Was </span>${money(product.oldPrice)}</del> ` : ''}<strong>${money(product.price)}</strong>`;
  }
  function modelCardHTML(model, inventory, products) {
    const units = selectUnits(inventory, { model: model.id });
    const matched = units.map(unit => productForUnit(unit, products));
    const prices = matched.filter(hasPrice).map(p => p.price);
    const minimum = prices.length ? Math.min(...prices) : null;
    const same = prices.length === units.length && prices.every(price => price === minimum);
    const product = same ? matched[0] : null;
    const price = minimum === null ? 'Ask for price' : same ? priceHTML(product) : 'From ' + money(minimum);
    return `<a class="hso-model-card" href="/hso/?model=${encodeURIComponent(model.id)}">${visualHTML(model, 'hso-model-image')}<div class="hso-model-body"><p class="hso-model-count">${units.length} ${units.length === 1 ? 'phone' : 'phones'} listed</p><h2>${escapeHtml(model.name)} <span>HSO</span></h2><p>${escapeHtml([...new Set(units.map(unit => unit.storage))].join(' / '))}</p><p class="hso-model-price">${price}</p><span class="hso-link">Choose your phone <span aria-hidden="true">↗</span></span></div></a>`;
  }
  function unitCardHTML(model, unit, products) {
    const product = productForUnit(unit, products);
    let action;
    if (canCheckout(unit, product)) {
      action = `<button type="button" class="hso-unit-action" data-hso-serial="${escapeHtml(unit.serial)}">Checkout &amp; Pay</button>`;
    } else if (!isAvailable(unit) || product?.soldOut === true) {
      action = '<button type="button" class="hso-unit-action" disabled>Unavailable</button>';
    } else {
      const message = `Hi, I'm interested in ${orderName(model, unit)}${hasPrice(product) ? ' (' + money(product.price) + ')' : ''}. Please confirm ${hasPrice(product) ? 'availability' : 'the price and availability'}.`;
      action = `<a class="hso-unit-action" href="https://wa.me/59996782619?text=${escapeHtml(encodeURIComponent(message))}" target="_blank" rel="noopener">${hasPrice(product) ? 'Ask availability' : 'Ask for price'}</a>`;
    }
    return `<article class="hso-unit-card"><h3>${escapeHtml(unit.color)} <span>${escapeHtml(unit.storage)}</span></h3><dl><div><dt>Serial / IMEI</dt><dd class="hso-serial">${escapeHtml(unit.serial)}</dd></div><div><dt>Battery health</dt><dd class="hso-unit-battery">${escapeHtml(batteryText(unit))}</dd></div></dl><p class="hso-unit-price">${priceHTML(product)}</p>${action}</article>`;
  }
  function detailHTML(model, units, products) {
    const product = units.length ? productForUnit(units[0], products) : null;
    const offer = units.length && units.every(unit => productForUnit(unit, products) === product) ? priceHTML(product) : '';
    return `<div class="hso-model-header"><div>${visualHTML(model, 'hso-detail-image')}<p class="hso-image-note">Model image. Colors listed below.</p></div><div><p class="hso-kicker">SECOND-HAND / HSO</p><h2>Choose your phone</h2><p>Your selected serial number is included at checkout.</p><p class="hso-price">${offer}</p><p class="hso-stock-note">Our team confirms availability.</p></div></div>${units.length ? `<div class="hso-unit-grid">${units.map(unit => unitCardHTML(model, unit, products)).join('')}</div>` : '<div class="hso-empty"><h2>No phones listed for this selection</h2><p>Try another model or ask our team about upcoming stock.</p><a class="hso-link" href="/hso/">Browse all models</a></div>'}`;
  }
  return { validateInventory, isAvailable, selectUnits, productForUnit, canCheckout, batteryText, orderName, priceHTML, modelCardHTML, unitCardHTML, detailHTML };
});
