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
      const response = await root.fetch('/.netlify/functions/hso-stock', { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('Stock unavailable');
      const inventory = await response.json();
      api.validateInventory(inventory);
      return { inventory };
    } finally { clearTimeout(timeout); }
  }

  function render() {
    const { inventory } = state;
    const model = inventory.models.find(model => model.id === selection.model);
    const showingDetail = !!selection.model;
    models.hidden = showingDetail;
    detail.hidden = !showingDetail;
    doc.getElementById('hso-back').hidden = !showingDetail;
    doc.getElementById('hso-updated').textContent = 'Stock updated ' + new Date(inventory.updatedAt + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Curacao' });
    if (!showingDetail) {
      doc.getElementById('hso-title').textContent = 'Find your next device.';
      doc.getElementById('hso-intro').textContent = 'Explore our second-hand collection. Pick a model, compare individual devices, then choose yours.';
      const count = inventory.units.filter(api.isAvailable).length;
      const availableModels = inventory.models.filter(model => api.selectUnits(inventory, { model: model.id }).length);
      doc.getElementById('hso-summary').textContent = `${count} ${count === 1 ? 'device' : 'devices'} listed · ${availableModels.length} ${availableModels.length === 1 ? 'model' : 'models'}`;
      models.innerHTML = availableModels.length ? availableModels.map(model => api.modelCardHTML(model, inventory)).join('') : '<p class="hso-empty">No devices available right now. Please check back soon.</p>';
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
    doc.getElementById('hso-intro').textContent = 'Choose your device. See the serial number or stock reference, color and battery health for each one below.';
    doc.getElementById('hso-summary').textContent = `${units.length} ${units.length === 1 ? 'device' : 'devices'} listed`;
    detail.innerHTML = api.detailHTML(model, units);
  }

  function showStockError() {
    state = null;
    error.hidden = false;
    models.replaceChildren(); detail.replaceChildren();
    doc.getElementById('hso-summary').textContent = 'Stock is temporarily unavailable.';
  }

  async function load(silent = false) {
    if (busy) return;
    busy = true;
    error.hidden = true;
    loading.hidden = silent;
    models.setAttribute('aria-busy', 'true');
    detail.setAttribute('aria-busy', 'true');
    try {
      const next = await fetchStock();
      const content = value => JSON.stringify([value.inventory.models, value.inventory.units, value.inventory.updatedAt]);
      const changed = !state || content(next) !== content(state);
      state = next;
      // An unchanged poll must not replace the device card a customer is using.
      if (changed) render();
    }
    catch (_) { showStockError(); } finally {
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
      const product = unit && api.productForUnit(unit);
      render();
      if (!unit || !model || !api.canCheckout(unit, product)) {
        doc.getElementById('hso-summary').textContent = 'This device is no longer available for checkout. Please choose another device or contact us.';
        return;
      }
      // Use the new, connected button as focus-return target after refreshing the list.
      const opener = Array.from(detail.querySelectorAll('button[data-hso-serial]')).find(node => node.dataset.hsoSerial === unit.serial);
      const chosenName = api.orderName(model, unit);
      root.openCheckout(chosenName, product.price, opener, async () => {
        let latest;
        try { latest = await fetchStock(); }
        catch (_) {
          showStockError();
          throw new Error('We could not verify this device’s availability. Please try again before paying.');
        }
        state = latest;
        render();
        const currentUnit = latest.inventory.units.find(item => item.serial === unit.serial);
        const currentModel = currentUnit && latest.inventory.models.find(item => item.id === currentUnit.modelId);
        const currentProduct = currentUnit && api.productForUnit(currentUnit);
        if (!currentUnit || !currentModel || !api.canCheckout(currentUnit, currentProduct)) {
          throw new Error('This device is no longer available. Close checkout and choose another device.');
        }
        if (currentProduct.price !== product.price || api.orderName(currentModel, currentUnit) !== chosenName) {
          throw new Error('This device’s details or price changed. Close checkout and review the updated listing.');
        }
        return true;
      });
    } catch (_) {
      showStockError();
    } finally { busy = false; }
  });
  doc.getElementById('hso-retry').addEventListener('click', () => load());
  const refresh = () => { if (!doc.hidden) return load(true); };
  root.setInterval(refresh, 30000);
  root.addEventListener('focus', refresh);
  root.addEventListener('online', refresh);
  doc.addEventListener('visibilitychange', refresh);
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
    if (!inventory || inventory.schemaVersion !== 2 || !Array.isArray(inventory.models) || !Array.isArray(inventory.units) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(inventory.updatedAt) || !Number.isFinite(Date.parse(inventory.updatedAt))) throw new Error('Invalid stock file');
    const modelIds = new Set(), serials = new Set();
    for (const model of inventory.models) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(model.id) || modelIds.has(model.id) || typeof model.name !== 'string' || !model.name.trim()) throw new Error('Invalid model');
      modelIds.add(model.id);
    }
    for (const unit of inventory.units) {
      if (!modelIds.has(unit.modelId) || typeof unit.serial !== 'string' || !/^[A-Za-z0-9]{1,20}$/.test(unit.serial) || serials.has(unit.serial.toUpperCase()) ||
          typeof unit.color !== 'string' || !unit.color.trim() || typeof unit.storage !== 'string' || (unit.storage !== '' && !/^\d+(GB|TB)$/.test(unit.storage)) ||
          !['available', 'reserved', 'sold'].includes(unit.status) ||
          !(unit.batteryHealth === null || (Number.isInteger(unit.batteryHealth) && unit.batteryHealth >= 0 && unit.batteryHealth <= 100))) throw new Error('Invalid device record');
      serials.add(unit.serial.toUpperCase());
    }
    return inventory;
  }
  function selectUnits(inventory, { model, storage = '', color = '' }) {
    return inventory.units.filter(unit => isAvailable(unit) && unit.modelId === model &&
      (!storage || equal(storage, unit.storage)) && (!color || equal(color, unit.color)));
  }
  function productForUnit(unit) {
    if (!unit) return null;
    // Sheet prices are authoritative. A blank or invalid price never falls back
    // to a historical catalog price, even when the model already exists there.
    return { price: Number.isFinite(unit.price) && unit.price > 0 ? unit.price : null,
      oldPrice: Number.isFinite(unit.oldPrice) && unit.oldPrice > 0 ? unit.oldPrice : null,
      blackFriday: unit.blackFriday === true };
  }
  const hasPrice = product => !!product && Number.isFinite(product.price) && product.price > 0;
  const canCheckout = (unit, product) => isAvailable(unit) && hasPrice(product) && product.soldOut !== true && !product.inquiryOnly;
  const batteryText = unit => Number.isInteger(unit.batteryHealth) && unit.batteryHealth >= 0 && unit.batteryHealth <= 100 ? unit.batteryHealth + '%' : 'Ask for battery health';
  const isStockReference = unit => typeof unit.serial === 'string' && unit.serial.length >= 1 && unit.serial.length <= 4;
  function orderName(model, unit) {
    return [`${model.name} HSO`, unit.storage, unit.color, `${isStockReference(unit) ? 'Stock reference' : 'Serial/IMEI'}: ${unit.serial}`, `Battery health: ${batteryText(unit)}`].filter(Boolean).join(' · ');
  }
  function safeImageURL(value) {
    if (typeof value !== 'string') return '';
    if (/^\/img\/products\/[A-Za-z0-9._-]+$/.test(value)) return value;
    if (/[\u0000-\u0020\u007f\\]/.test(value) || !value.startsWith('https://')) return '';
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
    } catch (_) { return ''; }
  }
  function visualHTML(model, className) {
    const image = safeImageURL(model.image);
    return image
      ? `<img class="${className}" src="${escapeHtml(image)}" alt="${escapeHtml(model.name)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
      : `<div class="hso-model-art"><span>SECOND-HAND / HSO</span><strong>${escapeHtml(model.name)}</strong></div>`;
  }
  function priceHTML(product) {
    if (!hasPrice(product)) return 'Ask for price';
    const old = Number.isFinite(product.oldPrice) && product.oldPrice > product.price;
    return `${old ? `<del><span class="sr-only">Was </span>${money(product.oldPrice)}</del> ` : ''}<strong>${money(product.price)}</strong>`;
  }
  function modelCardHTML(model, inventory) {
    const units = selectUnits(inventory, { model: model.id });
    const matched = units.map(unit => productForUnit(unit));
    const prices = matched.filter(hasPrice).map(p => p.price);
    const minimum = prices.length ? Math.min(...prices) : null;
    const same = prices.length === units.length && matched.every(product => samePrice(product, matched[0]));
    const product = same ? matched[0] : null;
    const price = minimum === null ? 'Ask for price' : same ? priceHTML(product) : 'From ' + money(minimum);
    const image = safeImageURL(model.image) || units.map(unit => safeImageURL(unit.image)).find(Boolean);
    const storage = [...new Set(units.map(unit => unit.storage).filter(Boolean))].join(' / ');
    return `<a class="hso-model-card" href="/hso/?model=${encodeURIComponent(model.id)}">${visualHTML({ ...model, image }, 'hso-model-image')}<div class="hso-model-body"><p class="hso-model-count">${units.length} ${units.length === 1 ? 'device' : 'devices'} listed</p><h2>${escapeHtml(model.name)} <span>HSO</span></h2>${storage ? `<p>${escapeHtml(storage)}</p>` : ''}<p class="hso-model-price">${price}</p><span class="hso-link">Choose your device <span aria-hidden="true">↗</span></span></div></a>`;
  }
  function unitCardHTML(model, unit) {
    const product = productForUnit(unit);
    let action;
    if (canCheckout(unit, product)) {
      action = `<button type="button" class="hso-unit-action" data-hso-serial="${escapeHtml(unit.serial)}">Checkout &amp; Pay</button>`;
    } else if (!isAvailable(unit) || product?.soldOut === true) {
      action = '<button type="button" class="hso-unit-action" disabled>Unavailable</button>';
    } else {
      const message = `Hi, I'm interested in ${orderName(model, unit)}${hasPrice(product) ? ' (' + money(product.price) + ')' : ''}. Please confirm ${hasPrice(product) ? 'availability' : 'the price and availability'}.`;
      action = `<a class="hso-unit-action" href="https://wa.me/59996782619?text=${escapeHtml(encodeURIComponent(message))}" target="_blank" rel="noopener">${hasPrice(product) ? 'Ask availability' : 'Ask for price'}</a>`;
    }
    return `<article class="hso-unit-card"><h3>${escapeHtml(unit.color)}${unit.storage ? ` <span>${escapeHtml(unit.storage)}</span>` : ''}</h3><dl><div><dt>${isStockReference(unit) ? 'Stock reference' : 'Serial / IMEI'}</dt><dd class="hso-serial">${escapeHtml(unit.serial)}</dd></div><div><dt>Battery health</dt><dd class="hso-unit-battery">${escapeHtml(batteryText(unit))}</dd></div></dl><p class="hso-unit-price">${priceHTML(product)}</p>${action}</article>`;
  }
  function samePrice(a, b) {
    return !!a && !!b && a.price === b.price && a.oldPrice === b.oldPrice;
  }
  function detailHTML(model, units) {
    const product = units.length ? productForUnit(units[0]) : null;
    const offer = units.length && units.every(unit => samePrice(productForUnit(unit), product)) ? priceHTML(product) : '';
    const unitImages = [...new Set(units.map(unit => safeImageURL(unit.image)).filter(Boolean))];
    const image = unitImages.length === 1 ? unitImages[0] : safeImageURL(model.image) || unitImages[0];
    return `<div class="hso-model-header"><div>${visualHTML({ ...model, image }, 'hso-detail-image')}<p class="hso-image-note">Model image. Colors listed below.</p></div><div><p class="hso-kicker">SECOND-HAND / HSO</p><h2>Choose your device</h2><p>Your selected device reference is included at checkout.</p><p class="hso-price">${offer}</p><p class="hso-stock-note">Our team confirms availability.</p></div></div>${units.length ? `<div class="hso-unit-grid">${units.map(unit => unitCardHTML(model, unit)).join('')}</div>` : '<div class="hso-empty"><h2>No devices listed for this selection</h2><p>Try another model or ask our team about upcoming stock.</p><a class="hso-link" href="/hso/">Browse all models</a></div>'}`;
  }
  return { validateInventory, isAvailable, selectUnits, productForUnit, canCheckout, batteryText, orderName, safeImageURL, priceHTML, modelCardHTML, unitCardHTML, detailHTML };
});
