(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HSOCatalog = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';

  function detailsUrl(product) {
    if (!product || product.suffix !== 'HSO' || typeof product.hsoModel !== 'string' ||
        product.hsoModel.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.hsoModel)) return '';
    let url = '/hso/?model=' + encodeURIComponent(product.hsoModel);
    for (const [field, parameter] of [['hsoStorage', 'storage'], ['hsoColor', 'color']]) {
      if (typeof product[field] === 'string' && product[field].trim()) {
        url += '&' + parameter + '=' + encodeURIComponent(product[field].trim());
      }
    }
    return url;
  }

  function isManaged(product) {
    return !!product && product.suffix === 'HSO' && typeof product.hsoModel === 'string' && !!product.hsoModel;
  }

  const normalized = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
  function filterAvailable(products, inventory) {
    const units = inventory && Array.isArray(inventory.units) ? inventory.units : [];
    return products.filter(product => !isManaged(product) || units.some(unit =>
      unit.status === 'available' && unit.modelId === product.hsoModel &&
      (!product.hsoStorage || normalized(unit.storage) === normalized(product.hsoStorage)) &&
      (!product.hsoColor || normalized(unit.color) === normalized(product.hsoColor))));
  }

  const priced = value => Number.isFinite(value) && value > 0;
  const storageKey = value => normalized(value).replace(/\s+/g, '');
  const groupKey = value => value.modelId + '|' + storageKey(value.storage);
  function safeImage(value) {
    if (typeof value !== 'string') return '';
    if (/^\/img\/products\/[A-Za-z0-9._-]+$/.test(value)) return value;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
    } catch (_) { return ''; }
  }
  function legacyIdentity(product, models) {
    if (!product || product.suffix !== 'HSO') return null;
    const named = normalized(product.name);
    const model = models.slice().sort((a, b) => b.name.length - a.name.length).find(item => {
      const name = normalized(item.name);
      const remainder = named.startsWith(name + ' ') ? named.slice(name.length).trim() : null;
      return named === name || (remainder !== null && /^\d+\s*(gb|tb)(?:[\s/]|$)/i.test(remainder));
    });
    const modelId = product.hsoModel || model?.id;
    if (!modelId) return null;
    const storage = product.hsoStorage || product.specifications?.Storage || (product.name.match(/\b\d+\s*(?:GB|TB)\b/i) || [])[0] || '';
    return { modelId, storage: storageKey(storage), color: normalized(product.hsoColor || product.specifications?.Color) };
  }
  function claimed(product, inventory) {
    if (isManaged(product)) return true;
    const identity = legacyIdentity(product, inventory.models);
    if (!identity) return false;
    return inventory.variants.some(variant => variant.modelId === identity.modelId &&
      (!identity.storage || storageKey(variant.storage) === identity.storage) &&
      (!variant.color || !identity.color || normalized(variant.color) === identity.color ||
        normalized(variant.color) === identity.color.replace(/ titanium$/, '')));
  }
  function offerFields(units, storage) {
    const prices = units.map(unit => unit.price).filter(priced);
    const price = prices.length ? Math.min(...prices) : null;
    const from = price !== null && (prices.length !== units.length || prices.some(value => value !== price));
    const oldPrice = priced(price) && !from && units.length && units.every(unit => unit.oldPrice === units[0].oldPrice) &&
      priced(units[0].oldPrice) && units[0].oldPrice > price ? units[0].oldPrice : null;
    return { price, oldPrice, hsoPriceFrom: from, hsoUnitCount: units.length,
      spec: [storage, units.length + ' available'].filter(Boolean).join(' · ') };
  }
  function campaignProduct(product) {
    return product.hsoBlackFridayOffer ? { ...product, ...product.hsoBlackFridayOffer } : product;
  }
  function projectCatalog(base, inventory, { previous = [] } = {}) {
    // Without the current registry, even an old unmarked HSO row may now be
    // owned by the sheet. Never restore its static price or direct checkout.
    if (!inventory || inventory.schemaVersion !== 2) return base.filter(product => product.suffix !== 'HSO');
    const models = new Map(inventory.models.map(model => [model.id, model]));
    const variants = new Map();
    inventory.variants.forEach(variant => { if (!variants.has(groupKey(variant))) variants.set(groupKey(variant), variant); });
    const groups = new Map();
    for (const unit of inventory.units) {
      if (unit.status !== 'available' || !variants.has(groupKey(unit))) continue;
      const key = groupKey(unit);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(unit);
    }
    const retained = base.filter(product => !claimed(product, inventory));
    const previousByKey = new Map(previous.filter(product => product.hsoCatalogKey).map(product => [product.hsoCatalogKey, product]));
    for (const [key, units] of groups) {
      const variant = variants.get(key), model = models.get(variant.modelId);
      if (!model) continue;
      const template = base.find(product => {
        const identity = legacyIdentity(product, inventory.models);
        return identity && identity.modelId === variant.modelId && identity.storage === storageKey(variant.storage);
      });
      const image = safeImage(model.image) || safeImage(variant.image) || safeImage(units[0].image);
      const campaignUnits = units.filter(unit => unit.blackFriday === true);
      const product = {
        name: model.name + (variant.storage ? ' ' + variant.storage : ''), suffix: 'HSO',
        category: variant.category || 'other', image, imageUnavailable: !image,
        hsoModel: model.id, hsoStorage: variant.storage, hsoCatalogKey: key,
        featured: template?.featured === true, blackFriday: campaignUnits.length > 0,
        ...offerFields(units, variant.storage)
      };
      if (typeof template?.addedAt === 'string') product.addedAt = template.addedAt;
      if (typeof template?.restockedAt === 'string') product.restockedAt = template.restockedAt;
      if (campaignUnits.length) product.hsoBlackFridayOffer = offerFields(campaignUnits, variant.storage);
      const previousProduct = previousByKey.get(key);
      retained.push(previousProduct && JSON.stringify(previousProduct) === JSON.stringify(product) ? previousProduct : product);
    }
    return retained;
  }

  async function fetchInventory(fetcher) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetcher('/.netlify/functions/hso-stock', { cache: 'no-store', signal: controller.signal });
      if (!response.ok) return null;
      const inventory = await response.json();
      if (!inventory || inventory.schemaVersion !== 2 || !Array.isArray(inventory.models) || !Array.isArray(inventory.variants) || !Array.isArray(inventory.units)) return null;
      const models = new Set(inventory.models.map(model => model && model.id));
      if (models.size !== inventory.models.length || inventory.models.some(model => !model ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(model.id) || typeof model.name !== 'string' || !model.name.trim())) return null;
      const validOffer = value => value && models.has(value.modelId) && typeof value.storage === 'string' && /^(?:\d+(?:GB|TB))?$/i.test(value.storage) &&
        (value.price === null || priced(value.price)) && (value.oldPrice === null || priced(value.oldPrice)) &&
        typeof value.blackFriday === 'boolean' && ['apple', 'samsung', 'phones', 'laptops', 'other'].includes(value.category);
      if (inventory.variants.some(variant => !validOffer(variant) || typeof variant.color !== 'string')) return null;
      const serials = new Set();
      for (const unit of inventory.units) {
        if (!validOffer(unit) || typeof unit.serial !== 'string' ||
            !/^[a-z0-9]{5,20}$/i.test(unit.serial) || serials.has(unit.serial.toLowerCase()) ||
            typeof unit.color !== 'string' || !unit.color.trim() ||
            !['available', 'reserved', 'sold'].includes(unit.status)) return null;
        serials.add(unit.serial.toLowerCase());
      }
      return inventory;
    } catch (_) { return null; }
    finally { clearTimeout(timeout); }
  }

  return { detailsUrl, isManaged, filterAvailable, projectCatalog, campaignProduct, safeImage, fetchInventory };
});
