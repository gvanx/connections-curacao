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

  async function fetchInventory(fetcher) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetcher('/.netlify/functions/hso-stock', { cache: 'no-store', signal: controller.signal });
      if (!response.ok) return null;
      const inventory = await response.json();
      if (!inventory || !Array.isArray(inventory.models) || !Array.isArray(inventory.units)) return null;
      const models = new Set(inventory.models.map(model => model && model.id));
      const serials = new Set();
      for (const unit of inventory.units) {
        if (!unit || !models.has(unit.modelId) || typeof unit.serial !== 'string' ||
            !/^[a-z0-9]{5,20}$/i.test(unit.serial) || serials.has(unit.serial.toLowerCase()) ||
            typeof unit.storage !== 'string' || !/^\d+(?:GB|TB)$/i.test(unit.storage) ||
            typeof unit.color !== 'string' || !unit.color.trim() ||
            !['available', 'reserved', 'sold'].includes(unit.status)) return null;
        serials.add(unit.serial.toLowerCase());
      }
      return inventory;
    } catch (_) { return null; }
    finally { clearTimeout(timeout); }
  }

  return { detailsUrl, isManaged, filterAvailable, fetchInventory };
});
