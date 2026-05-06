/* Connections Curacao — single-product checkout (extracted from index.html) */

/* ---- Constants & state ---- */
const WA_NUMBER = '59996782619';

const CHECKOUT_CONFIG = {
  sentooBaseUrl: 'https://sentoo.pro/connections-curacao',
  reserveAmount: 100,
  deliveryFee: 35,
  email: {
    serviceID: 'service_jbzcbpk',
    templateID: 'template_ckyri4m',
    publicKey: 'H4OR1MKdC7n5o8A4G'
  }
};

let activeCheckout = null;

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
  return `${CHECKOUT_CONFIG.sentooBaseUrl}/${Math.round(amount * 100)}`;
}

function getCheckoutTotals() {
  if (!activeCheckout) return { paymentType: 'full', paymentAmount: 0, fee: 0, total: 0, deliveryType: 'pickup' };
  const paymentType = (document.querySelector('input[name="checkout-payment"]:checked') || {}).value || 'full';
  const deliveryType = (document.querySelector('input[name="checkout-delivery"]:checked') || {}).value || 'pickup';
  const paymentAmount = paymentType === 'reserve' ? CHECKOUT_CONFIG.reserveAmount : activeCheckout.price;
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
    submitBtn.textContent = paymentType === 'reserve'
      ? `Reserve for ${formatPrice(total)}`
      : `Pay ${formatPrice(total)} via Sentoo`;
  }
}

function closeCheckout() {
  const overlay = document.getElementById('checkout-modal');
  if (!overlay) return;
  overlay.classList.remove('visible');
  overlay.setAttribute('hidden', '');
  activeCheckout = null;
}

function openCheckout(name, price) {
  const overlay = document.getElementById('checkout-modal');
  if (!overlay) return;

  activeCheckout = { name, price };
  const form = document.getElementById('checkout-form');
  form.reset();
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
  lines.push('', 'Payment: Sentoo');
  return lines.join('\n');
}

function attachOrderButtons(scope) {
  scope.querySelectorAll('.js-order-btn').forEach((btn) => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const productName = decodeURIComponent(btn.dataset.productName || '');
      const productPrice = Number(btn.dataset.productPrice || 0);
      if (!productName || Number.isNaN(productPrice)) return;
      openCheckout(productName, productPrice);
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
    if (e.key === 'Escape' && overlay.classList.contains('visible')) {
      closeCheckout();
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeCheckout) return;

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
    const orderId = `CON-${Date.now().toString(36).toUpperCase()}`;
    const message = orderMessage({
      orderId,
      productName: activeCheckout.name,
      basePrice: activeCheckout.price,
      paymentType,
      paymentAmount,
      deliveryType,
      deliveryFee: fee,
      total,
      customerName,
      customerPhone,
      address
    });

    const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
    const payUrl = sentooLink(total);

    try {
      if (window.emailjs && CHECKOUT_CONFIG.email.serviceID && CHECKOUT_CONFIG.email.templateID) {
        await emailjs.send(CHECKOUT_CONFIG.email.serviceID, CHECKOUT_CONFIG.email.templateID, {
          orderId,
          name: customerName,
          whatsapp: customerPhone,
          product: activeCheckout.name,
          amount: formatPrice(total),
          paymentType: paymentType === 'reserve' ? 'RESERVE' : 'FULL',
          delivery: deliveryType === 'delivery' ? 'Delivery' : 'Pickup',
          address: address || '',
          payment: 'Sentoo'
        });
      }
    } catch (err) {
      console.warn('EmailJS send failed', err);
    }

    window.open(payUrl, '_blank', 'noopener');
    window.open(waUrl, '_blank', 'noopener');
    closeCheckout();
  });
}
