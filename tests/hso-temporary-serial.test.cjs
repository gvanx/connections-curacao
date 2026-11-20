const test = require('node:test');
const assert = require('node:assert/strict');
const feed = require('../netlify/functions/hso-stock.js');
const stock = require('../js/hso-stock.js');
const catalog = require('../js/hso-catalog.js');
test('temporary zero serial loads across HSO and catalog, then can be replaced', async () => {
  const registry = 'Model,Storage,Color (optional),Category,Image URL (optional)\niPad 11-inch A16,128GB,,Apple,/img/products/ipad-a16-gray.jpg';
  const header = 'Model,Storage,Color,Serial / IMEI,Battery health (%),Status,Price (XCG),Old price (XCG),Black Friday';
  for (const serial of ['0', '00', '000', 'IPAD123456']) {
    const row = `iPad 11-inch A16,128GB,Gray,${serial},98,Available,790,,Yes`;
    const inv = feed.parseInventory(header + '\n' + row, registry);
    assert.equal(inv.units.length, 1);
    stock.validateInventory(inv);
    assert.equal(stock.canCheckout(inv.units[0], stock.productForUnit(inv.units[0])), true);
    assert.match(stock.detailHTML(inv.models[0], inv.units), /98%/);
    assert.equal((await catalog.fetchInventory(async () => ({ok:true,json:async()=>inv}))).units[0].serial, serial);
    const projected = catalog.projectCatalog([], inv);
    assert.equal(projected.length, 1);
    assert.equal(projected[0].price, 790);
    assert.equal(projected[0].blackFriday, true);
    assert.throws(() => feed.parseInventory(header + '\n' + row + '\n' + row, registry), /Duplicate/);
  }
});

test('short stock references stay distinct across the feed, catalog and HSO page', async () => {
  const registry = 'Model,Storage,Color (optional),Category,Image URL (optional)\niPhone 13,128GB,,Apple,/img/products/hso-iphone-13-midnight.jpg\niPhone 13 No Face ID,128GB,,Apple,/img/products/hso-iphone-13-midnight.jpg';
  const header = 'Model,Storage,Color,Serial / IMEI,Battery health (%),Status,Price (XCG),Old price (XCG),Black Friday';
  const inv = feed.parseInventory(header + '\n' + [
    'iPhone 13,128GB,Black,0,88,Available,675,890,Yes',
    'iPhone 13,128GB,Black,00,67,Available,425,450,Yes',
    'iPhone 13 No Face ID,128GB,Black,000,82,Available,325,350,Yes'
  ].join('\n'), registry);
  stock.validateInventory(inv);
  const live = await catalog.fetchInventory(async () => ({ok:true,json:async()=>inv}));
  assert.deepEqual(live.units.map(unit => [unit.serial, unit.price]), [['0',675],['00',425],['000',325]]);
  const products = catalog.projectCatalog([], live);
  assert.equal(products.length, 2);
  const regular = products.find(product => product.hsoModel === 'iphone-13');
  assert.equal(regular.price, 425);
  assert.match(stock.detailHTML(live.models[0], live.units.filter(unit => unit.modelId === 'iphone-13')), /data-hso-serial="00"/);
  const restricted = live.models.find(model => /No Face ID/.test(model.name));
  const selected = live.units.find(unit => unit.serial === '000');
  assert.match(stock.orderName(restricted, selected), /No Face ID HSO.*Stock reference: 000/);
  assert.equal(products.find(product => product.hsoModel === restricted.id).price, 325);
});
