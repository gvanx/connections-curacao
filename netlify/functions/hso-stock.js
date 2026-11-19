'use strict';

// Static imports are bundled by Netlify. The snapshot provides known model IDs
// and artwork only. Both stock and prices always come from published sheet tabs.
const MODEL_CATALOG = require('../../data/hso-stock.json').models;
const { createHash } = require('node:crypto');
const HEADERS = ['Model', 'Storage', 'Color', 'Serial / IMEI', 'Battery health (%)', 'Status'];
const UNIT_HEADERS = [...HEADERS, 'Price (XCG)', 'Old price (XCG)', 'Black Friday'];
const PRICE_HEADERS = ['Model', 'Storage', 'Color (optional)', 'Price (XCG)', 'Old price (XCG)', 'Black Friday', 'Category', 'Image URL (optional)'];
const MODEL_HEADERS = ['Model', 'Storage', 'Color (optional)', 'Category', 'Image URL (optional)'];
const MAX_CSV_LENGTH = 256 * 1024;
const RESPONSE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Netlify-CDN-Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
};

function parseCSV(source) {
  if (typeof source !== 'string' || source.length > MAX_CSV_LENGTH) throw new Error('Invalid stock response');
  const text = source.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], value = '', quoted = false, closedQuote = false;
  const endField = () => { row.push(value); value = ''; closedQuote = false; };
  const endRow = () => { endField(); rows.push(row); row = []; };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { value += '"'; i++; }
        else { quoted = false; closedQuote = true; }
      } else value += char;
      continue;
    }
    if (closedQuote && char !== ',' && char !== '\r' && char !== '\n') throw new Error('Malformed stock CSV');
    if (char === '"') {
      if (value.length) throw new Error('Malformed stock CSV');
      quoted = true;
    } else if (char === ',') endField();
    else if (char === '\r' || char === '\n') {
      endRow();
      if (char === '\r' && text[i + 1] === '\n') i++;
    } else value += char;
  }
  if (quoted) throw new Error('Malformed stock CSV');
  if (value.length || row.length || closedQuote) endRow();
  return rows;
}

function cleanText(value) { return String(value).trim().replace(/\s+/g, ' '); }
const normalized = value => cleanText(value).toLowerCase();
const validStorage = value => value === '' || /^\d+(?:GB|TB)$/.test(value);
const variantKey = (modelId, storage, color) => `${modelId}\u0000${storage}\u0000${normalized(color)}`;

function safeImage(value) {
  if (typeof value !== 'string') return null;
  const image = value.trim();
  if (/^\/img\/products\/[A-Za-z0-9._-]+$/.test(image)) return image;
  try {
    const url = new URL(image);
    return url.protocol === 'https:' && !url.username && !url.password && !/[\u0000-\u0020\u007f]/.test(image) ? url.href : null;
  } catch (_) { return null; }
}

function parsePrice(value) {
  const price = String(value).trim();
  // Accept plain decimals and correctly grouped CSV currency numbers, never
  // scientific notation, ambiguous decimal commas, signs or currency prefixes.
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(price)) return null;
  const amount = Number(price.replace(/,/g, ''));
  return Number.isFinite(amount) && amount > 0 && Number.isSafeInteger(Math.round(amount * 100)) ? amount : null;
}

function categoryFor(value, knownModel) {
  const categories = { apple: 'apple', samsung: 'samsung', phones: 'phones', 'other phones': 'phones', laptops: 'laptops', other: 'other' };
  const key = normalized(value);
  return Object.hasOwn(categories, key) ? categories[key] : knownModel ? 'apple' : 'other';
}

function newModelId(name) {
  const key = normalized(name);
  const slug = key.normalize('NFKD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 55).replace(/-+$/, '') || 'device';
  return `hso-${slug}-${createHash('sha256').update(key).digest('hex').slice(0, 10)}`;
}

function modelMetadata(models) {
  if (!Array.isArray(models) || !models.length) throw new Error('Missing model catalog');
  const ids = new Set(), names = new Set();
  return models.map(model => {
    if (!model || typeof model.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(model.id) ||
        typeof model.name !== 'string' || !cleanText(model.name)) throw new Error('Invalid model catalog');
    const name = cleanText(model.name), key = name.toLowerCase();
    if (ids.has(model.id) || names.has(key)) throw new Error('Ambiguous model catalog');
    ids.add(model.id); names.add(key);
    return { id: model.id, name, image: safeImage(model.image) };
  });
}

function readTable(csv, schemas) {
  const rows = parseCSV(csv);
  const header = rows.shift();
  const headers = schemas.find(columns => header && header.length === columns.length &&
    header.every((value, index) => value.trim() === columns[index]));
  if (!headers) throw new Error('Missing sheet columns');
  return { rows, headers };
}

function parsePriceRegistry(csv, models = MODEL_CATALOG) {
  const knownModels = new Map(modelMetadata(models).map(model => [normalized(model.name), model]));
  const registry = new Map(), variants = new Map();
  const { rows, headers } = readTable(csv, [PRICE_HEADERS, MODEL_HEADERS]);
  const legacyPrices = headers === PRICE_HEADERS;
  for (const source of rows) {
    if (source.every(value => !value.trim()) || source.length > headers.length) continue;
    const row = Array.from({ length: headers.length }, (_, index) => source[index] || '');
    const name = cleanText(row[0]), storage = row[1].replace(/\s+/g, '').toUpperCase(), color = cleanText(row[2]);
    if (!name || name.length > 120 || /[\u0000-\u001f\u007f]/.test(name) || !validStorage(storage) ||
        color.length > 80 || /[\u0000-\u001f\u007f]/.test(color)) continue;
    const known = knownModels.get(normalized(name));
    const model = registry.get(normalized(name)) || { id: known ? known.id : newModelId(name), name: known ? known.name : name, image: known ? known.image : null };
    registry.set(normalized(name), model);
    const price = legacyPrices ? parsePrice(row[3]) : null, previous = legacyPrices ? parsePrice(row[4]) : null;
    const variant = { modelId: model.id, storage, color, price,
      oldPrice: price !== null && previous !== null && previous > price ? previous : null,
      blackFriday: legacyPrices && normalized(row[5]) === 'yes', category: categoryFor(row[legacyPrices ? 6 : 3], !!known),
      image: safeImage(row[legacyPrices ? 7 : 4]) || (known ? known.image : null) };
    const key = variantKey(model.id, storage, color);
    if (variants.has(key)) {
      // Never choose an arbitrary amount or promotion from duplicate rows.
      const duplicate = variants.get(key);
      variants.set(key, { ...duplicate, price: null, oldPrice: null, blackFriday: false,
        category: duplicate.category === variant.category ? duplicate.category : categoryFor('', !!known),
        image: duplicate.image === variant.image ? duplicate.image : known ? known.image : null });
    } else variants.set(key, variant);
  }
  const list = [...variants.values()];
  for (const model of registry.values()) {
    const choices = list.filter(variant => variant.modelId === model.id && variant.image);
    model.image = (choices.find(variant => !variant.color) || choices[0])?.image || model.image;
  }
  return { models: [...registry.values()], variants: list };
}

function parseInventory(csv, pricesCSV, models = MODEL_CATALOG, now = new Date()) {
  const { rows, headers } = readTable(csv, [HEADERS, UNIT_HEADERS]);
  const perUnitPricing = headers === UNIT_HEADERS;
  const registry = parsePriceRegistry(pricesCSV, models);
  const modelNames = new Map(registry.models.map(model => [normalized(model.name), model.id]));
  const variants = new Map(registry.variants.map(variant => [variantKey(variant.modelId, variant.storage, variant.color), variant]));
  const units = [], serials = new Set();
  for (const row of rows) {
    if (row.every(value => !value.trim())) continue;
    const serial = (row[3] || '').trim();
    // Conflicting rows must not make a sold/reserved serial available again.
    if (serial) {
      const key = serial.toUpperCase();
      if (serials.has(key)) throw new Error('Duplicate stock serial');
      serials.add(key);
    }
    if ((row[5] || '').trim().toLowerCase() !== 'available') continue;
    // Empty trailing price cells are still authoritative; they must not cause
    // a legacy model price to be restored while someone edits a device row.
    if (row.length < HEADERS.length || row.length > headers.length) continue;
    const modelId = modelNames.get(normalized(row[0]));
    const storage = row[1].replace(/\s+/g, '').toUpperCase();
    const color = cleanText(row[2]);
    const battery = row[4].trim();
    let batteryHealth = null;
    if (battery) {
      if (!/^\d{1,3}\s*%?$/.test(battery)) continue;
      batteryHealth = Number(battery.replace(/\s*%$/, ''));
      if (!Number.isInteger(batteryHealth) || batteryHealth < 0 || batteryHealth > 100) continue;
    }
    if (!modelId || !validStorage(storage) || !color || color.length > 80 ||
        /[\u0000-\u001f\u007f]/.test(color) || !/^(?:0|[A-Za-z0-9]{5,20})$/.test(serial)) continue;
    const variant = variants.get(variantKey(modelId, storage, color)) || variants.get(variantKey(modelId, storage, ''));
    if (!variant) continue;
    const price = perUnitPricing ? parsePrice(row[6] || '') : variant.price;
    const previous = perUnitPricing ? parsePrice(row[7] || '') : variant.oldPrice;
    units.push({ modelId, serial, storage, color, batteryHealth, status: 'available',
      price, oldPrice: price !== null && previous !== null && previous > price ? previous : null,
      blackFriday: perUnitPricing ? normalized(row[8] || '') === 'yes' : variant.blackFriday,
      category: variant.category, image: variant.image });
  }
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('Invalid sync time');
  const date = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Curacao', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return { schemaVersion: 2, updatedAt: `${date.year}-${date.month}-${date.day}`, syncedAt: now.toISOString(),
    models: registry.models, variants: registry.variants, units };
}

function sourceURL(config, field = 'csvUrl') {
  if (!config || typeof config[field] !== 'string') throw new Error('Missing sheet source');
  const url = new URL(config[field]);
  if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com' || url.port || url.username || url.password ||
      !/^\/spreadsheets\/d\/e\/[A-Za-z0-9_-]+\/pub$/.test(url.pathname) || url.hash ||
      url.searchParams.get('output') !== 'csv' || url.searchParams.get('single') !== 'true' ||
      !/^\d+$/.test(url.searchParams.get('gid') || '')) throw new Error('Invalid stock source');
  return url.href;
}

async function loadStock(options = {}) {
  const config = options.config || require('../../data/hso-feed.json');
  // Validate both URLs before making either request. Pricing is mandatory.
  const urls = [sourceURL(config), sourceURL(config, 'priceCsvUrl')];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 8000);
  try {
    const sources = await Promise.all(urls.map(async url => {
      const response = await (options.fetchImpl || globalThis.fetch)(url, {
        cache: 'no-store', signal: controller.signal, headers: { Accept: 'text/csv' }
      });
      if (!response.ok) throw new Error('Sheet source unavailable');
      const type = response.headers.get('content-type') || '';
      const length = Number(response.headers.get('content-length'));
      if ((type && !/^(?:text\/(?:csv|plain)|application\/octet-stream)(?:;|$)/i.test(type)) ||
          length > MAX_CSV_LENGTH) throw new Error('Invalid sheet response');
      return response.text();
    }));
    return parseInventory(sources[0], sources[1], options.models || MODEL_CATALOG, options.now || new Date());
  } finally { clearTimeout(timeout); controller.abort(); }
}

function createHandler(options = {}) {
  return async function handler(event = {}) {
    if (event.httpMethod && event.httpMethod !== 'GET') {
      return { statusCode: 405, headers: { ...RESPONSE_HEADERS, Allow: 'GET' }, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
    try {
      return { statusCode: 200, headers: RESPONSE_HEADERS, body: JSON.stringify(await loadStock(options)) };
    } catch (_) {
      return { statusCode: 503, headers: RESPONSE_HEADERS, body: JSON.stringify({ error: 'Device stock and pricing are temporarily unavailable. Please try again.' }) };
    }
  };
}

module.exports = { handler: createHandler(), createHandler, loadStock, parseInventory, parsePriceRegistry, parsePrice,
  parseCSV, sourceURL, safeImage };
