const test = require('node:test');
const assert = require('node:assert/strict');
const feed = require('../netlify/functions/hso-stock.js');
const stock = require('../js/hso-stock.js');
const catalog = require('../js/hso-catalog.js');
test('temporary zero serial loads across HSO and catalog, then can be replaced', async () => {
  const registry = 'Model,Storage,Color (optional),Category,Image URL (optional)\niPad 11-inch A16,128GB,,Apple,/img/products/ipad-a16-gray.jpg';
  const header = 'Model,Storage,Color,Serial / IMEI,Battery health (%),Status,Price (XCG),Old price (XCG),Black Friday';
  for (const serial of ['0', 'IPAD123456']) {
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
