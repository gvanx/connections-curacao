/* Connections Curacao — single-product checkout (extracted from index.html) */

/* ---- Constants & state ---- */
const WA_NUMBER = '59996782619';

const CHECKOUT_CONFIG = {
  sentooBaseUrl: 'https://sentoo.pro/connections-curacao',
  reserveAmount: 100,
  deliveryFee: 35,
  crypto: {
    enabled: true,
    exchangeRate: 1.74,
    network: 'Ethereum (ERC-20)',
    addresses: {
      USDT: '0x4E7d1D58Ed7dfe63a15EdCa83437BB6AC7A6eF0e',
      USDC: '0x4E7d1D58Ed7dfe63a15EdCa83437BB6AC7A6eF0e'
    }
  },
  email: {
    serviceID: 'service_jbzcbpk',
    templateID: 'template_ckyri4m',
    publicKey: 'H4OR1MKdC7n5o8A4G'
  }
};

let activeCheckout = null;
let checkoutOpener = null;
let checkoutBodyOverflow = null;

/* ---- Format helper (used by checkout AND product card rendering) ---- */
function formatPrice(price) {
  return 'XCG ' + price.toLocaleString('en-US');
}

/* ---- WhatsApp SVG icon (used by checkout buttons) ---- */
const WA_ICON = `<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.352 0-4.55-.738-6.354-1.996l-.244-.167-3.735 1.251 1.251-3.735-.167-.244A9.953 9.953 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>`;

function initEmailJS() {
  try {
    if (window.emailjs && CHECKOUT_CONFIG.email.publicKey) {
      emailjs.init(CHECKOUT_CONFIG.email.publicKey);
    }
  } catch (e) {
    console.warn('EmailJS init failed', e);
  }
}

function sentooLink(amount) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid payment amount.');
  return `${CHECKOUT_CONFIG.sentooBaseUrl}/${Math.round(amount * 100)}`;
}

function cryptoPaymentSettings(method) {
  const config = CHECKOUT_CONFIG.crypto;
  const address = config?.addresses?.[method];
  if (!['USDT', 'USDC'].includes(method) || config?.enabled !== true ||
      !Number.isFinite(config.exchangeRate) || config.exchangeRate <= 0 ||
      typeof config.network !== 'string' || !config.network.trim() ||
      typeof address !== 'string' || !/^[A-Za-z0-9]{25,100}$/.test(address)) {
    throw new Error('This crypto payment option is unavailable. Please choose Sentoo or contact us on WhatsApp.');
  }
  if (config.network === 'Ethereum (ERC-20)') {
    if (!/^0x[0-9a-fA-F]{40}$/.test(address) || /^0x0{40}$/.test(address)) throw new Error('Invalid Ethereum receiving address.');
  } else {
    throw new Error('This payment network is not configured.');
  }
  return { method, network: config.network, address, exchangeRate: config.exchangeRate };
}

function paymentQuote(total, method) {
  const cents = Math.round(total * 100);
  if (!Number.isFinite(total) || total <= 0 || !Number.isSafeInteger(cents) || cents < 1) {
    throw new Error('Please check the order amount.');
  }
  if (method === 'sentoo') return { method, label: 'Sentoo', amount: formatPrice(total), total };
  const settings = cryptoPaymentSettings(method);
  const tokenCents = Math.round(cents / settings.exchangeRate);
  if (!Number.isSafeInteger(tokenCents) || tokenCents < 1) throw new Error('Please check the crypto amount.');
  const tokenAmount = (tokenCents / 100).toFixed(2);
  return { ...settings, label: method, total, tokenAmount, amount: `${tokenAmount} ${method}` };
}

function populatePaymentMethods() {
  const select = document.getElementById('checkout-method');
  select.replaceChildren();
  const sentoo = document.createElement('option');
  sentoo.value = 'sentoo'; sentoo.textContent = 'Sentoo — local bank';
  select.appendChild(sentoo);
  for (const method of ['USDT', 'USDC']) {
    try {
      const settings = cryptoPaymentSettings(method);
      const option = document.createElement('option');
      option.value = method; option.textContent = `${method} — ${settings.network}`;
      select.appendChild(option);
    } catch (_) { /* Offer only payment destinations configured by the store. */ }
  }
  select.value = 'sentoo';
  const notice = document.getElementById('crypto-payment-notice');
  if (notice) {
    const available = Array.from(select.children).filter(option => option.value !== 'sentoo').map(option => option.value);
    notice.hidden = available.length === 0;
    notice.textContent = available.length
      ? `Pay with ${available.join(' or ')} on ${CHECKOUT_CONFIG.crypto.network}. No Connections fee. Select crypto at checkout.` : '';
  }
}

function getCheckoutTotals() {
  if (!activeCheckout) return { paymentType: 'full', paymentAmount: 0, fee: 0, total: 0, deliveryType: 'pickup' };
  const paymentType = (document.querySelector('input[name="checkout-payment"]:checked') || {}).value || 'full';
  const deliveryType = (document.querySelector('input[name="checkout-delivery"]:checked') || {}).value || 'pickup';
  const paymentAmount = paymentType === 'reserve' ? Math.min(CHECKOUT_CONFIG.reserveAmount, activeCheckout.price) : activeCheckout.price;
  const fee = deliveryType === 'delivery' ? CHECKOUT_CONFIG.deliveryFee : 0;
  return { paymentType, paymentAmount, fee, total: paymentAmount + fee, deliveryType };
}

function updateCheckoutSummary() {
  if (!activeCheckout) return;
  const { paymentType, paymentAmount, fee, total, deliveryType } = getCheckoutTotals();
  const submitBtn = document.querySelector('.checkout-submit');
  const typeLabel = paymentType === 'reserve' ? 'Reserve' : 'Full';

  document.getElementById('checkout-product').textContent = activeCheckout.name;
  document.getElementById('checkout-base').textContent = formatPrice(activeCheckout.price);
  document.getElementById('checkout-type').textContent = typeLabel;
  document.getElementById('checkout-pay-now').textContent = formatPrice(paymentAmount);
  document.getElementById('checkout-fee').textContent = formatPrice(fee);
  document.getElementById('checkout-total').textContent = formatPrice(total);
  document.getElementById('checkout-address-wrap').style.display = deliveryType === 'delivery' ? 'block' : 'none';
  if (submitBtn) {
    try {
      const quote = paymentQuote(total, document.getElementById('checkout-method').value);
      document.getElementById('checkout-quote').textContent = quote.method === 'sentoo'
        ? 'Pay with your local bank through Sentoo. Your order remains pending until payment is verified.'
        : `Send ${quote.amount} on ${quote.network}. ${formatPrice(total)} ÷ ${quote.exchangeRate}. No Connections fee. Your wallet or exchange may charge a network or withdrawal fee.`;
      submitBtn.textContent = quote.method === 'sentoo'
        ? `${paymentType === 'reserve' ? 'Reserve for' : 'Pay'} ${formatPrice(total)} via Sentoo`
        : `Continue with ${quote.amount}`;
      submitBtn.disabled = false;
    } catch (error) {
      document.getElementById('checkout-quote').textContent = error.message;
      submitBtn.disabled = true;
    }
  }
}

function closeCheckout() {
  const overlay = document.getElementById('checkout-modal');
  if (!overlay) return;
  overlay.classList.remove('visible');
  overlay.setAttribute('hidden', '');
  activeCheckout = null;
  if (checkoutBodyOverflow !== null) {
    document.body.style.overflow = checkoutBodyOverflow;
    checkoutBodyOverflow = null;
  }
  const opener = checkoutOpener;
  checkoutOpener = null;
  if (opener && opener.isConnected && typeof opener.focus === 'function') {
    opener.focus({ preventScroll: true });
  }
}

function openCheckout(name, price, opener = document.activeElement) {
  if (typeof name !== 'string' || !name.trim() || !Number.isFinite(price) || price <= 0) return;
  const overlay = document.getElementById('checkout-modal');
  if (!overlay) return;

  if (!overlay.classList.contains('visible')) {
    checkoutOpener = opener;
    checkoutBodyOverflow = document.body.style.overflow;
  }
  document.body.style.overflow = 'hidden';
  activeCheckout = { name, price };
  const form = document.getElementById('checkout-form');
  form.reset();
  form.hidden = false;
  const confirmation = document.getElementById('checkout-confirmation');
  confirmation.hidden = true;
  confirmation.replaceChildren();
  populatePaymentMethods();
  document.getElementById('checkout-error').textContent = '';
  document.querySelector('input[name="checkout-payment"][value="full"]').checked = true;
  document.querySelector('input[name="checkout-delivery"][value="pickup"]').checked = true;
  updateCheckoutSummary();

  overlay.classList.add('visible');
  overlay.removeAttribute('hidden');
  document.getElementById('checkout-name').focus();
}

function orderMessage(details) {
  const deliveryLine = details.deliveryType === 'delivery'
    ? `Delivery (+${formatPrice(details.deliveryFee)})`
    : 'Pickup (Free)';

  const lines = [
    'Hi Connections!',
    'Store: Connections Curaçao',
    `Created (UTC): ${details.createdAt}`,
    `Order: ${details.orderId}`,
    `Product: ${details.productName}`,
    `Product price: ${formatPrice(details.basePrice)}`,
    `Payment type: ${details.paymentType === 'reserve' ? 'RESERVE' : 'FULL PAYMENT'}`,
    `Pay now: ${formatPrice(details.paymentAmount)}`,
    `Delivery: ${deliveryLine}`,
    `Total: ${formatPrice(details.total)}`,
    `Name: ${details.customerName}`,
    `Phone: ${details.customerPhone}`
  ];
  if (details.paymentType === 'reserve') {
    lines.push(`Remaining product balance: ${formatPrice(details.basePrice - details.paymentAmount)}`);
  }
  if (details.address) lines.push(`Address: ${details.address}`);
  const quote = details.quote || { method: 'sentoo', label: 'Sentoo', amount: formatPrice(details.total) };
  lines.push('', `Payment: ${quote.label}`, `Amount due: ${quote.amount}`);
  if (quote.method !== 'sentoo') {
    lines.push(`Network: ${quote.network}`, `Receiving wallet: ${quote.address}`,
      `Conversion: XCG total ÷ ${quote.exchangeRate}; no Connections fee.`,
      'I will send my transaction hash and proof of payment for verification.');
  }
  lines.push('Status: Awaiting payment verification');
  return lines.join('\n');
}

function showPaymentInstructions(details, message) {
  const quote = details.quote;
  const confirmation = document.getElementById('checkout-confirmation');
  confirmation.replaceChildren();
  const addText = (tag, text, className = '') => {
    const element = document.createElement(tag);
    element.textContent = text; element.className = className;
    confirmation.appendChild(element);
    return element;
  };
  const heading = addText('h4', 'Payment pending verification');
  heading.tabIndex = -1;
  addText('p', `Order ${details.orderId} · ${details.productName}`);
  addText('strong', `Amount due: ${quote.amount}`, 'checkout-amount');
  const addLink = (label, href) => {
    const link = addText('a', label, 'btn-whatsapp');
    link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer';
  };
  const addCopy = (label, text) => {
    const button = addText('button', label, 'checkout-copy');
    button.type = 'button';
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(text);
        document.getElementById('checkout-copy-status').textContent = 'Copied to clipboard.';
      } catch (_) {
        document.getElementById('checkout-copy-status').textContent = 'Please select and copy the displayed text.';
      }
    });
  };
  if (quote.method === 'sentoo') {
    addText('p', 'Complete your payment with Sentoo, then send your order on WhatsApp.');
    addLink('Open Sentoo', sentooLink(details.total));
  } else {
    addText('p', `Network: ${quote.network}`, 'checkout-network');
    addText('p', `Send only ${quote.label} using ${quote.network}. Check the coin and network in your wallet before sending.`);
    addText('code', quote.address, 'checkout-wallet');
    addCopy('Copy wallet address', quote.address);
    addCopy('Copy amount', quote.tokenAmount);
    addText('p', `${formatPrice(details.total)} ÷ ${quote.exchangeRate}. No Connections fee. Wallet or exchange fees are separate.`);
    addText('p', 'After payment, send your transaction hash and proof of payment on WhatsApp. Our team will verify receipt before confirming your reservation, pickup or delivery.');
  }
  addLink('Send order on WhatsApp', `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`);
  const status = addText('p', '', 'checkout-copy-status');
  status.id = 'checkout-copy-status'; status.setAttribute('role', 'status');
  document.getElementById('checkout-form').hidden = true;
  confirmation.hidden = false;
  heading.focus();
}

function attachOrderButtons(scope) {
  scope.querySelectorAll('.js-order-btn').forEach((btn) => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const productName = decodeURIComponent(btn.dataset.productName || '');
      const productPrice = Number(btn.dataset.productPrice || 0);
      if (!productName || Number.isNaN(productPrice)) return;
      openCheckout(productName, productPrice, btn);
    });
  });
}

function initCheckoutModal() {
  initEmailJS();

  const overlay = document.getElementById('checkout-modal');
  const closeBtn = document.getElementById('checkout-close');
  const form = document.getElementById('checkout-form');
  const errorEl = document.getElementById('checkout-error');

  if (!overlay || !closeBtn || !form || !errorEl) return;
  populatePaymentMethods();
  document.getElementById('checkout-method').addEventListener('change', updateCheckoutSummary);

  closeBtn.addEventListener('click', closeCheckout);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCheckout();
  });

  document.querySelectorAll('input[name="checkout-delivery"]').forEach((radio) => {
    radio.addEventListener('change', updateCheckoutSummary);
  });
  document.querySelectorAll('input[name="checkout-payment"]').forEach((radio) => {
    radio.addEventListener('change', updateCheckoutSummary);
  });

  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('visible')) return;
    if (e.key === 'Escape') {
      closeCheckout();
      return;
    }
    if (e.key !== 'Tab') return;

    const focusable = Array.from(overlay.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]'
    )).filter((element) => element.tabIndex >= 0 && !element.matches(':disabled') &&
      !element.closest('[hidden], [inert]') && element.getClientRects().length > 0 &&
      window.getComputedStyle(element).visibility !== 'hidden');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (!first) {
      e.preventDefault();
      const dialog = overlay.querySelector('[role="dialog"]') || overlay;
      dialog.tabIndex = -1;
      dialog.focus();
    } else if (!focusable.includes(document.activeElement)) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!activeCheckout || form.hidden) return;

    const customerName = document.getElementById('checkout-name').value.trim();
    const customerPhone = document.getElementById('checkout-phone').value.trim();
    const address = document.getElementById('checkout-address').value.trim();
    const termsAccepted = document.getElementById('checkout-terms').checked;
    const { paymentType, paymentAmount, fee, total, deliveryType } = getCheckoutTotals();

    if (!customerName) {
      errorEl.textContent = 'Please enter your name.';
      return;
    }
    if (!customerPhone) {
      errorEl.textContent = 'Please enter your WhatsApp number.';
      return;
    }
    if (deliveryType === 'delivery' && !address) {
      errorEl.textContent = 'Please enter your delivery address.';
      return;
    }
    if (!termsAccepted) {
      errorEl.textContent = 'Please accept the terms to continue.';
      return;
    }

    errorEl.textContent = '';
    let quote;
    try { quote = paymentQuote(total, document.getElementById('checkout-method').value); }
    catch (error) { errorEl.textContent = error.message; return; }
    const orderId = `CON-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const details = {
      orderId,
      createdAt: new Date().toISOString(),
      productName: activeCheckout.name,
      basePrice: activeCheckout.price,
      paymentType,
      paymentAmount,
      deliveryType,
      deliveryFee: fee,
      total,
      customerName,
      customerPhone,
      address: deliveryType === 'delivery' ? address : '',
      quote
    };
    const message = orderMessage(details);
    showPaymentInstructions(details, message);
    if (quote.method === 'sentoo') {
      try { window.open(sentooLink(total), '_blank', 'noopener,noreferrer'); } catch (_) { /* The confirmation includes a direct link. */ }
    }

    try {
      if (window.emailjs && CHECKOUT_CONFIG.email.serviceID && CHECKOUT_CONFIG.email.templateID) {
        Promise.resolve(emailjs.send(CHECKOUT_CONFIG.email.serviceID, CHECKOUT_CONFIG.email.templateID, {
          storeName: 'Connections Curaçao',
          storeUrl: 'https://connectionscuracao.net',
          createdAt: details.createdAt,
          orderId,
          name: customerName,
          whatsapp: customerPhone,
          product: details.productName,
          items: `${details.productName} — 1 × ${formatPrice(details.basePrice)}`,
          itemCount: 1,
          amount: quote.amount,
          totalXCG: formatPrice(total),
          productSubtotal: formatPrice(details.basePrice),
          payNowXCG: formatPrice(paymentAmount),
          deliveryFee: formatPrice(fee),
          remainingBalance: formatPrice(details.basePrice - paymentAmount),
          paymentType: paymentType === 'reserve' ? 'RESERVE' : 'FULL',
          delivery: deliveryType === 'delivery' ? 'Delivery' : 'Pickup',
          address: details.address || 'Not applicable',
          payment: quote.method === 'sentoo' ? 'Sentoo — PENDING VERIFICATION' : `${quote.label} on ${quote.network} — PENDING VERIFICATION`,
          type: quote.method === 'sentoo' ? 'SENTOO — PENDING VERIFICATION' : `${quote.label} — PENDING VERIFICATION`,
          status: 'Awaiting payment verification',
          network: quote.network || 'Not applicable',
          wallet: quote.address || 'Not applicable',
          exchangeRate: quote.exchangeRate ? `XCG total ÷ ${quote.exchangeRate}` : 'Not applicable',
          cryptoFee: '0.00',
          transactionHash: 'Not submitted',
          verificationMethod: 'Manual review required',
          termsAccepted: 'Yes',
          message
        })).catch((err) => console.warn('EmailJS send failed', err));
      }
    } catch (err) {
      console.warn('EmailJS send failed', err);
    }

  });
}

