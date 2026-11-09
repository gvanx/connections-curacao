(function (root) {
  'use strict';

  function normalizePhone(value) {
    const raw = String(value || '').trim();
    if (!raw || /[^+\d\s().-]/.test(raw)) return null;
    let phone = raw.replace(/[\s().-]/g, '');
    if (/^00/.test(phone)) phone = '+' + phone.slice(2);
    if (/^\d{7}$/.test(phone)) phone = '+5999' + phone;
    else if (/^9\d{7}$/.test(phone)) phone = '+599' + phone;
    else if (/^5999\d{7}$/.test(phone)) phone = '+' + phone;
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) return null;
    // Curaçao mobile numbers use +599 9 followed by seven digits.
    if (phone.startsWith('+5999') && !/^\+5999\d{7}$/.test(phone)) return null;
    return phone;
  }

  async function submitSignup(form, { fetch: send, signal } = {}) {
    const phone = normalizePhone(form.whatsapp);
    if (!phone) throw new Error('Enter a valid WhatsApp number. Use 7 digits for Curaçao, or include +country code.');
    if (form.consent !== true) throw new Error('Please agree to receive the Black Friday poster on WhatsApp.');
    if (String(form.website || '').trim()) throw new Error('We couldn’t save your number. Please try again.');

    const body = new URLSearchParams({
      'form-name': 'blackfriday-whatsapp-2026',
      campaign: 'Black Friday 2026',
      'consent-version': 'bf2026-whatsapp-v1',
      whatsapp: phone,
      consent: 'I agree to receive the Connections Curaçao Black Friday 2026 poster on WhatsApp. I can reply STOP to opt out.',
      website: ''
    });
    const response = await send('/blackfriday/thanks/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal
    });
    if (!response.ok) throw new Error('We couldn’t save your number. Please try again in a moment.');
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { normalizePhone, submitSignup };
  if (!root.document) return;

  const form = root.document.getElementById('whatsapp-signup');
  if (!form) return;
  const phoneInput = form.elements.whatsapp;
  const consentInput = form.elements.consent;
  const button = form.querySelector('[type="submit"]');
  const error = root.document.getElementById('signup-error');
  const success = root.document.getElementById('signup-success');
  const fields = [...form.querySelectorAll('input, button')];
  let submitting = false;

  phoneInput.addEventListener('input', () => { phoneInput.setCustomValidity(''); });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting) return;
    error.hidden = true;
    phoneInput.setCustomValidity(normalizePhone(phoneInput.value) ? '' : 'Enter 7 digits for Curaçao, or an international number starting with +country code.');
    if (!form.reportValidity()) return;

    const data = { whatsapp: phoneInput.value, consent: consentInput.checked, website: form.elements.website.value };
    submitting = true;
    fields.forEach(field => { field.disabled = true; });
    form.setAttribute('aria-busy', 'true');
    button.textContent = 'Saving your number…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      await submitSignup(data, { fetch: root.fetch.bind(root), signal: controller.signal });
      form.reset();
      form.hidden = true;
      success.hidden = false;
      success.focus();
    } catch (failure) {
      error.textContent = failure.name === 'AbortError'
        ? 'The connection timed out. Please try again in a moment.'
        : failure instanceof TypeError
          ? 'We couldn’t connect. Check your internet connection and try again.'
          : failure.message;
      error.hidden = false;
    } finally {
      clearTimeout(timeout);
      submitting = false;
      fields.forEach(field => { field.disabled = false; });
      form.removeAttribute('aria-busy');
      button.textContent = 'Update me ↗';
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
