/* Apple gift-card prices and availability come from the digital store. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GiftCards = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const STORE_URL = 'https://giftcard.connectionscuracao.net/';
  function isGiftCard(product) {
    return product.category === 'giftcards' && typeof product.giftCardName === 'string';
  }
  function purchaseUrl(product) {
    return STORE_URL + '#buy=' + encodeURIComponent(product.giftCardName);
  }
  function saleActive(sale, now) {
    if (!sale || !sale.enabled || !(sale.percent > 0)) return false;
    const today = new Date(now - 4 * 3600000).toISOString().slice(0, 10);
    return (!sale.startDate || today >= sale.startDate) && (!sale.endDate || today <= sale.endDate);
  }
  function mergeCatalog(products, store, now = Date.now()) {
    const valid = store && Array.isArray(store.products);
    const mode = valid && store.storeStatus && store.storeStatus.mode;
    const open = mode === 'full' || mode === 'apple-only';
    const sale = valid && store.config && store.config.sale;
    return products.map(product => {
      if (!isGiftCard(product)) return product;
      const item = { ...product, price: null, inquiryOnly: true, giftCardStatus: store === undefined ? 'loading' : 'unavailable' };
      delete item.oldPrice;
      if (!valid || !open || store.storeStatus.closed) return item;
      const matches = store.products.filter(p => p && p.cat === 'Apple' && p.name === product.giftCardName);
      if (matches.length !== 1 || !Number.isFinite(matches[0].price) || matches[0].price <= 0) return item;
      const source = matches[0];
      let price = source.price, oldPrice = source.originalPrice || null;
      // Match the digital store's rounding and per-product sale opt-out.
      if (saleActive(sale, now) && !oldPrice && !source.noSale) {
        const discounted = Math.round(price * (1 - sale.percent / 100));
        if (discounted > 0 && discounted < price) { oldPrice = price; price = discounted; }
      }
      item.price = price;
      if (Number.isFinite(oldPrice) && oldPrice > price) item.oldPrice = oldPrice;
      item.giftCardStatus = source.soldOut ? 'sold-out' : 'available';
      return item;
    });
  }
  return { STORE_URL, isGiftCard, purchaseUrl, mergeCatalog };
});
