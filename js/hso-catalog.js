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

  return { detailsUrl };
});
