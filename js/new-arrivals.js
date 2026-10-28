/* Shared by the storefront and catalogue maintenance script. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NewArrivals = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

  function timestamp(value) {
    // Require an explicit timezone so every customer sees the same expiry.
    if (typeof value !== 'string' || !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return NaN;
    return Date.parse(value);
  }

  function addedAtTime(product) {
    return timestamp(product && product.addedAt);
  }

  function restockedAtTime(product) {
    return timestamp(product && product.restockedAt);
  }

  function isNewArrival(product, now = Date.now()) {
    const added = addedAtTime(product);
    return Number.isFinite(added) && now >= added && now < added + WINDOW_MS;
  }

  function isBackInStock(product, now = Date.now()) {
    const restocked = restockedAtTime(product);
    return Number.isFinite(restocked) && now >= restocked && now < restocked + WINDOW_MS;
  }

  function nextChangeAt(products, now = Date.now()) {
    let next = Infinity;
    for (const product of products) {
      for (const eventTime of [addedAtTime(product), restockedAtTime(product)]) {
        if (!Number.isFinite(eventTime)) continue;
        if (eventTime > now) next = Math.min(next, eventTime);
        else if (eventTime + WINDOW_MS > now) next = Math.min(next, eventTime + WINDOW_MS);
      }
    }
    return next;
  }

  return { WINDOW_MS, addedAtTime, restockedAtTime, isNewArrival, isBackInStock, nextChangeAt };
});

