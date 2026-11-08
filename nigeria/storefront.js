(function () {
  'use strict';
  const whatsapp = 'https://wa.me/59996782619';
  for (const form of document.querySelectorAll('.quote-form')) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const amount = String(data.get('amount') || '').trim();
      const isApple = form.dataset.product === 'apple';
      const currency = form.dataset.product === 'usdc' ? 'USDC' : 'USDT';
      const region = String(data.get('region') || '').trim();
      if (!amount || (isApple && !region)) return;
      const network = String(data.get('network') || '').trim();
      const message = isApple
        ? `Hi Connections Nigeria, I'd like to buy an Apple gift card.\nCard value: ${amount}\nApple Account region: ${region}\nPlease confirm availability, the total price and payment details.`
        : `Hi Connections Nigeria, I'd like to buy ${amount} ${currency}.\nPreferred network: ${network || 'Please help me confirm the right network'}\nPlease confirm availability, the total price, any fees and payment details.`;
      // Navigating directly keeps the handoff usable on mobile without relying
      // on popup permissions. Nothing is submitted until the customer sends it.
      window.location.assign(whatsapp + '?text=' + encodeURIComponent(message));
    });
  }
  // Without JavaScript, the product-specific WhatsApp links remain usable.
  document.documentElement.classList.add('js');
})();
