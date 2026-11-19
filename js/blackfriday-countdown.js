/* A fixed campaign deadline: the same instant for every visitor. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.BlackFridayCountdown = api;
    const start = () => api.initAll(root.document, root);
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const bindings = new WeakMap();

  function startTime(value) {
    // Never interpret a timezone-less date using the visitor's local timezone.
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
      ? Date.parse(value) : NaN;
  }

  function countdownParts(startsAt, now = Date.now()) {
    const target = startTime(startsAt);
    const valid = Number.isFinite(target) && Number.isFinite(now);
    const totalSeconds = valid ? Math.max(0, Math.ceil((target - now) / 1000)) : 0;
    return {
      valid, started: valid && now >= target, totalSeconds,
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor(totalSeconds / 3600) % 24,
      minutes: Math.floor(totalSeconds / 60) % 60,
      seconds: totalSeconds % 60
    };
  }

  function initCountdown(element, host = globalThis) {
    if (!element || typeof element.querySelector !== 'function') return () => {};
    if (bindings.has(element)) return bindings.get(element);
    const doc = element.ownerDocument || host.document;
    const startsAt = element.getAttribute('data-starts-at');
    const target = startTime(startsAt);
    const clock = element.querySelector('[data-countdown-clock]');
    const status = element.querySelector('[data-countdown-status]');
    const live = element.querySelector('[data-countdown-live]');
    const units = ['days', 'hours', 'minutes', 'seconds'].map(key => [key, element.querySelector(`[data-countdown-${key}]`)]);
    let timer = null, stopped = false, started = false;
    if (clock) clock.setAttribute('aria-live', 'off');

    function clearTimer() {
      if (timer !== null) host.clearTimeout(timer);
      timer = null;
    }
    function tick() {
      clearTimer();
      if (stopped) return;
      const now = host.Date.now();
      const parts = countdownParts(startsAt, now);
      if (!parts.valid) {
        if (clock) clock.hidden = true;
        if (live) live.hidden = true;
        if (status) { status.hidden = false; status.textContent = 'Countdown unavailable. Check back for Black Friday Week.'; }
        return;
      }
      // Once the week has started, do not restart the clock in this session.
      started = started || parts.started;
      if (clock) clock.hidden = started;
      if (status) status.hidden = started;
      if (live) live.hidden = !started;
      for (const [key, node] of units) {
        if (node) node.textContent = String(started ? 0 : parts[key]).padStart(2, '0');
      }
      if (!started && !doc?.hidden) {
        // Resample the clock instead of decrementing cached seconds after tab throttling.
        const delay = Math.max(1, (target - now) % 1000 || 1000);
        timer = host.setTimeout(tick, delay);
      }
    }
    function dispose() {
      stopped = true;
      clearTimer();
      doc?.removeEventListener('visibilitychange', tick);
      host.removeEventListener?.('focus', tick);
      bindings.delete(element);
    }
    bindings.set(element, dispose);
    doc?.addEventListener('visibilitychange', tick);
    host.addEventListener?.('focus', tick);
    tick();
    return dispose;
  }

  function initAll(document, host = globalThis) {
    if (!document?.querySelectorAll) return [];
    return [...document.querySelectorAll('[data-bf-countdown]')].map(element => initCountdown(element, host));
  }
  return { countdownParts, initCountdown, initAll };
});
