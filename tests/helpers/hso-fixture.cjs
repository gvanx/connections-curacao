function stockFixture(stock, products = []) {
  if (!stock || stock.schemaVersion === 2) return stock;
  const managed = products.filter(product => product.suffix === 'HSO' && product.hsoModel);
  const productFor = unit => managed.find(product => product.hsoModel === unit.modelId &&
    (!product.hsoStorage || product.hsoStorage === unit.storage)) || {};
  const offer = (value, product) => ({ price: product.price ?? null, oldPrice: product.oldPrice ?? null,
    blackFriday: product.blackFriday === true, category: product.category || 'apple', image: product.image || null, ...value });
  const models = stock.models.map(model => ({ name: managed.find(product => product.hsoModel === model.id)?.name || model.id,
    image: managed.find(product => product.hsoModel === model.id)?.image || null, ...model }));
  const units = stock.units.map(unit => offer(unit, productFor(unit)));
  const variants = new Map();
  for (const product of managed) {
    const variant = offer({ modelId: product.hsoModel, storage: product.hsoStorage || '128GB', color: '' }, product);
    variants.set(variant.modelId + '|' + variant.storage, variant);
  }
  for (const unit of units) {
    const key = unit.modelId + '|' + unit.storage;
    if (!variants.has(key)) variants.set(key, { ...unit, color: '' });
  }
  return { ...stock, schemaVersion: 2, models, variants: [...variants.values()], units };
}
module.exports = { stockFixture };
