'use strict';

// Static imports are bundled by Netlify. Only model metadata is used from the
// snapshot: stock always comes from the live, separately published sheet tab.
const MODEL_CATALOG = require('../../data/hso-stock.json').models;
const HEADERS = ['Model', 'Storage', 'Color', 'Serial / IMEI', 'Battery health (%)', 'Status'];
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

function modelMetadata(models) {
  if (!Array.isArray(models) || !models.length) throw new Error('Missing model catalog');
  const ids = new Set(), names = new Set();
  return models.map(model => {
    if (!model || typeof model.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(model.id) ||
        typeof model.name !== 'string' || !cleanText(model.name)) throw new Error('Invalid model catalog');
    const name = cleanText(model.name), key = name.toLowerCase();
    if (ids.has(model.id) || names.has(key)) throw new Error('Ambiguous model catalog');
    ids.add(model.id); names.add(key);
    return { id: model.id, name, image: typeof model.image === 'string' &&
      /^\/img\/products\/[A-Za-z0-9._-]+$/.test(model.image) ? model.image : null };
  });
}

function parseInventory(csv, models = MODEL_CATALOG, now = new Date()) {
  const rows = parseCSV(csv);
  const header = rows.shift();
  if (!header || header.length !== HEADERS.length || header.some((value, index) => value.trim() !== HEADERS[index])) {
    throw new Error('Missing stock columns');
  }
  const metadata = modelMetadata(models);
  const modelNames = new Map(metadata.map(model => [model.name.toLowerCase(), model.id]));
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
    if (row.length !== HEADERS.length) throw new Error('Malformed available phone');
    const modelId = modelNames.get(cleanText(row[0]).toLowerCase());
    const storage = row[1].replace(/\s+/g, '').toUpperCase();
    const color = cleanText(row[2]);
    const battery = row[4].trim();
    let batteryHealth = null;
    if (battery) {
      if (!/^\d{1,3}\s*%?$/.test(battery)) throw new Error('Invalid battery health');
      batteryHealth = Number(battery.replace(/\s*%$/, ''));
      if (!Number.isInteger(batteryHealth) || batteryHealth < 0 || batteryHealth > 100) throw new Error('Invalid battery health');
    }
    if (!modelId || !/^\d+(?:GB|TB)$/.test(storage) || !color || color.length > 80 ||
        /[\u0000-\u001f\u007f]/.test(color) || !/^[A-Za-z0-9]{5,20}$/.test(serial)) throw new Error('Invalid available phone');
    units.push({ modelId, serial, storage, color, batteryHealth, status: 'available' });
  }
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('Invalid sync time');
  const date = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Curacao', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return { updatedAt: `${date.year}-${date.month}-${date.day}`, syncedAt: now.toISOString(), models: metadata, units };
}

function sourceURL(config) {
  if (!config || typeof config.csvUrl !== 'string') throw new Error('Missing stock source');
  const url = new URL(config.csvUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com' || url.port || url.username || url.password ||
      !/^\/spreadsheets\/d\/e\/[A-Za-z0-9_-]+\/pub$/.test(url.pathname) || url.hash ||
      url.searchParams.get('output') !== 'csv' || url.searchParams.get('single') !== 'true' ||
      !/^\d+$/.test(url.searchParams.get('gid') || '')) throw new Error('Invalid stock source');
  return url.href;
}

async function loadStock(options = {}) {
  const config = options.config || require('../../data/hso-feed.json');
  const url = sourceURL(config);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 8000);
  try {
    const response = await (options.fetchImpl || globalThis.fetch)(url, {
      cache: 'no-store', signal: controller.signal, headers: { Accept: 'text/csv' }
    });
    if (!response.ok) throw new Error('Stock source unavailable');
    const type = response.headers.get('content-type') || '';
    const length = Number(response.headers.get('content-length'));
    if ((type && !/^(?:text\/(?:csv|plain)|application\/octet-stream)(?:;|$)/i.test(type)) ||
        length > MAX_CSV_LENGTH) throw new Error('Invalid stock response');
    return parseInventory(await response.text(), options.models || MODEL_CATALOG, options.now || new Date());
  } finally { clearTimeout(timeout); }
}

function createHandler(options = {}) {
  return async function handler(event = {}) {
    if (event.httpMethod && event.httpMethod !== 'GET') {
      return { statusCode: 405, headers: { ...RESPONSE_HEADERS, Allow: 'GET' }, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
    try {
      return { statusCode: 200, headers: RESPONSE_HEADERS, body: JSON.stringify(await loadStock(options)) };
    } catch (_) {
      return { statusCode: 503, headers: RESPONSE_HEADERS, body: JSON.stringify({ error: 'Phone stock is temporarily unavailable. Please try again.' }) };
    }
  };
}

module.exports = { handler: createHandler(), createHandler, loadStock, parseInventory, parseCSV, sourceURL };
