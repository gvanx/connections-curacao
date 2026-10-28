/* Shared by the storefront and catalogue maintenance script. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NewArrivals = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

  function addedAtTime(product) {
    // Require an explicit timezone so every customer sees the same expiry.
    const value = product && product.addedAt;
    if (typeof value !== 'string' || !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return NaN;
    return Date.parse(value);
  }

  function isNewArrival(product, now = Date.now()) {
    const added = addedAtTime(product);
    return Number.isFinite(added) && now >= added && now < added + WINDOW_MS;
  }

  function nextChangeAt(products, now = Date.now()) {
    let next = Infinity;
    for (const product of products) {
      const added = addedAtTime(product);
      if (!Number.isFinite(added)) continue;
      if (added > now) next = Math.min(next, added);
      else if (added + WINDOW_MS > now) next = Math.min(next, added + WINDOW_MS);
    }
    return next;
  }

  return { WINDOW_MS, addedAtTime, isNewArrival, nextChangeAt };
});
