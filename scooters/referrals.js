(function () {
  'use strict';
  const api = window.ConnectionsReferrals;
  if (!api) return;
  const banner = document.getElementById('referralBanner');
  const codeLabel = document.getElementById('activeReferralCode');
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(api.STORAGE_KEY)); } catch (_) { /* Private browsing may block storage. */ }
  let record = api.chooseReferral(saved, api.incomingCode(window.location.href), Date.now());

  function persist() {
    try {
      if (record) localStorage.setItem(api.STORAGE_KEY, JSON.stringify(record));
      else localStorage.removeItem(api.STORAGE_KEY);
    } catch (_) { /* The current page still carries the referral if storage is unavailable. */ }
  }

  function decorate(link) {
    if (!link || link.hasAttribute('data-referral-ignore')) return;
    const current = link.getAttribute('href');
    if (!current) return;
    const next = api.withReferral(current, record, Date.now());
    if (next !== current) link.setAttribute('href', next);
  }

  function refresh() {
    if (record && !api.activeRecord(record, Date.now())) {
      record = null;
      persist();
    }
    banner.hidden = !record;
    codeLabel.textContent = record ? record.code : '';
    document.querySelectorAll('a[href*="wa.me/"]').forEach(decorate);
  }

  persist();
  refresh();
  // The existing calculator replaces its WhatsApp link whenever the payment plan changes.
  new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === 'attributes') decorate(mutation.target);
      else mutation.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        if (node.matches('a[href]')) decorate(node);
        node.querySelectorAll('a[href*="wa.me/"]').forEach(decorate);
      });
    });
  }).observe(document.querySelector('main'), { subtree: true, childList: true, attributes: true, attributeFilter: ['href'] });

  document.addEventListener('click', function (event) {
    const link = event.target.closest && event.target.closest('a[href]');
    if (link && !link.hasAttribute('data-referral-ignore')) {
      refresh();
      decorate(link);
    }
  }, true);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
  window.addEventListener('storage', function (event) {
    if (event.key !== api.STORAGE_KEY && event.key !== null) return;
    try { record = api.activeRecord(JSON.parse(localStorage.getItem(api.STORAGE_KEY)), Date.now()); }
    catch (_) { record = null; }
    refresh();
  });

  document.getElementById('removeReferral').addEventListener('click', function () {
    record = null;
    persist();
    const url = new URL(window.location.href);
    url.searchParams.delete('ref');
    window.history.replaceState(window.history.state, '', url.toString());
    refresh();
  });

  const form = document.getElementById('referralLinkForm');
  form.hidden = false;
  const codeInput = document.getElementById('partnerCode');
  const result = document.getElementById('partnerLinkResult');
  const linkInput = document.getElementById('partnerLink');
  const status = document.getElementById('referralLinkStatus');
  codeInput.addEventListener('input', function () {
    codeInput.setCustomValidity('');
    result.hidden = true;
    status.textContent = '';
  });
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    const code = api.normalizeCode(codeInput.value);
    if (!code) {
      codeInput.setCustomValidity('Enter the code Connections sent you, for example CC-ABC123.');
      codeInput.reportValidity();
      return;
    }
    codeInput.value = code;
    linkInput.value = api.sharingLink(code);
    const message = 'Looking for a scooter in Curaçao? Browse Connections and contact their team through my link: ' + linkInput.value + '\nPlease include my referral code ' + code + ' in your first message. I may earn a referral reward if you buy.';
    document.getElementById('shareReferralLink').href = 'https://wa.me/?text=' + encodeURIComponent(message);
    result.hidden = false;
    status.textContent = 'Your link is ready. Share it only after Connections confirms your code is active.';
  });
  document.getElementById('copyReferralLink').addEventListener('click', async function () {
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(linkInput.value);
      status.textContent = 'Link copied. You can paste it into your message or WhatsApp Status.';
    } catch (_) {
      linkInput.focus();
      linkInput.select();
      status.textContent = 'Your link is selected. Copy it with your device’s copy command.';
    }
  });
})();
