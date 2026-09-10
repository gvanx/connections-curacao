(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ConnectionsReferrals = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
  const STORAGE_KEY = 'connections.scooters.referral.v1';
  const ORIGIN = 'https://connectionscuracao.net';

  function normalizeCode(value) {
    if (typeof value !== 'string') return null;
    const code = value.trim().toUpperCase();
    return /^CC-[A-Z0-9]{6}$/.test(code) ? code : null;
  }

  function incomingCode(href) {
    try {
      const values = new URL(href, ORIGIN).searchParams.getAll('ref');
      return values.length === 1 ? normalizeCode(values[0]) : null;
    } catch (_) { return null; }
  }

  function activeRecord(value, now) {
    if (!value || typeof value !== 'object') return null;
    const code = normalizeCode(value.code);
    if (!code || !Number.isFinite(value.createdAt) || !Number.isFinite(value.expiresAt)) return null;
    if (value.createdAt > now || value.expiresAt <= now || value.expiresAt - value.createdAt !== WINDOW_MS) return null;
    return { code, createdAt: value.createdAt, expiresAt: value.expiresAt };
  }

  function chooseReferral(saved, incoming, now) {
    const first = activeRecord(saved, now);
    if (first) return first;
    const code = normalizeCode(incoming);
    return code ? { code, createdAt: now, expiresAt: now + WINDOW_MS } : null;
  }

  function sharingLink(value) {
    const code = normalizeCode(value);
    return code ? ORIGIN + '/scooters/?ref=' + encodeURIComponent(code) : null;
  }

  function withReferral(href, record, now) {
    let url;
    try { url = new URL(href); } catch (_) { return href; }
    if (url.protocol !== 'https:' || url.hostname !== 'wa.me') return href;
    const original = url.searchParams.get('text') || '';
    const clean = original.replace(/\n\nReferral code: CC-[A-Z0-9]{6}(?=\n|$)/g, '');
    const active = activeRecord(record, now);
    const message = clean + (active ? '\n\nReferral code: ' + active.code : '');
    if (message === original) return href;
    url.searchParams.set('text', message);
    return url.toString();
  }

  return { WINDOW_MS, STORAGE_KEY, normalizeCode, incomingCode, activeRecord, chooseReferral, sharingLink, withReferral };
});
