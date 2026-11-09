(function (root) {
  'use strict';
  const names = ['iPhone 18 Pro Max 256GB', 'iPhone 17', 'iPhone 15', 'Galaxy S26 Ultra', 'Galaxy S25 FE 128GB', 'Galaxy A57 5G'];
  const rates = { 30: 1.07, 4: 1.28, 6: 1.42, 12: 1.465, 24: 1.98 };
  const cents = value => Math.round((value + Number.EPSILON) * 100) / 100;
  const money = value => 'XCG ' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function quote(price, topup = 0, months = 12) {
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(topup) || !rates[months]) throw new Error('Invalid plan');
    const base = cents(Math.max(0, price - Math.max(0, topup)));
    const financed = cents(base * 1.03);
    const total = financed * rates[months];
    return { months, base, fee: cents(financed - base), financed, total, payment: months === 30 ? total : total / months };
  }

  function selectProducts(catalog) {
    return names.map(name => catalog.find(product => product.name === name && !product.suffix &&
      Number.isFinite(product.price) && product.price > 0 && !product.inquiryOnly && !product.pricePending &&
      !/sold.?out|out.?of.?stock|unavailable/i.test(product.availability || ''))).filter(Boolean);
  }

  function imageSrc(product) {
    if (!product.image) return '';
    return product.image.startsWith('/') ? product.image : '/img/products/' + product.image;
  }

  function whatsappUrl(product) {
    const plan = quote(product.price);
    const message = `Hi Connections! I am interested in the ${product.name} with Suave.\nProduct price: ${money(product.price)}\n3% store fee: ${money(plan.fee)}\nEstimated payment: ${money(plan.payment)} per month for 12 months.\nSuave charges the first of these 12 monthly payments when I collect the device.\nPlease confirm stock, the final plan and Suave approval.`;
    return 'https://wa.me/59996782619?text=' + encodeURIComponent(message);
  }

  const api = { quote, selectProducts, imageSrc, whatsappUrl };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SuavePlans = api;
  if (typeof document === 'undefined') return;

  const copy = {
    en: { month: '/ month', term: '12 monthly payments', retail: 'Product price', fee: '3% store fee included', firstPayment: 'Suave charges the first monthly payment when you collect the device.', ask: 'Get this offer', adjust: 'Adjust this plan', featured: 'Featured in our ad', selected: 'Selected phone', unavailable: 'Phone offers are temporarily unavailable. Ask our team for current prices.', fallback: 'Ask on WhatsApp', calc: 'Calculate a 12-month plan', sticky: 'Choose your phone', heroMonthly: 'Estimated monthly payment', heroNote: '12 months · 3% store fee included · Subject to approval. Suave charges the first monthly payment when you collect the device.' },
    pap: { month: '/ luna', term: '12 pago mensual', retail: 'Preis di produkto', fee: '3% di kosto di tienda inkluí', firstPayment: 'Suave ta kobra e promé pago mensual ora bo buska e aparato.', ask: 'Mi ke e oferta aki', adjust: 'Ahustá e plan aki', featured: 'Den nos propaganda', selected: 'Telefòn skohe', unavailable: 'E ofertanan no ta disponibel awor. Puntra nos tim pa e preisnan aktual.', fallback: 'Puntra via WhatsApp', calc: 'Kalkulá un plan di 12 luna', sticky: 'Skohe bo telefòn', heroMonthly: 'Pago mensual kalkulá', heroNote: '12 luna · 3% di kosto inkluí · Bou di aprobashon. Suave ta kobra e promé pago mensual ora bo buska e aparato.' },
    es: { month: '/ mes', term: '12 pagos mensuales', retail: 'Precio del producto', fee: 'Cargo del 3% incluido', firstPayment: 'Suave cobra el primer pago mensual al recoger el dispositivo.', ask: 'Quiero esta oferta', adjust: 'Ajustar este plan', featured: 'En nuestro anuncio', selected: 'Teléfono seleccionado', unavailable: 'Las ofertas no están disponibles temporalmente. Consulta los precios con nuestro equipo.', fallback: 'Pregunta por WhatsApp', calc: 'Calcula un plan de 12 meses', sticky: 'Elige tu teléfono', heroMonthly: 'Pago mensual estimado', heroNote: '12 meses · Cargo del 3% incluido · Sujeto a aprobación. Suave cobra el primer pago mensual al recoger el dispositivo.' }
  };
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  function boot() {
    const grid = document.getElementById('phone-offers');
    const featured = document.getElementById('featured-phone');
    const form = document.getElementById('calculator');
    const priceInput = document.getElementById('price');
    const selection = document.getElementById('selected-phone');
    let products = [], selectedName = '', loadFailed = false;
    const strings = () => copy[document.documentElement.lang] || copy.en;

    function render() {
      const c = strings();
      document.getElementById('sticky-offers-label').textContent = c.sticky;
      selection.textContent = selectedName ? c.selected + ': ' + selectedName : c.calc;
      if (!products.length) {
        if (loadFailed) grid.innerHTML = `<p class="offers-error">${escape(c.unavailable)} <a href="https://wa.me/59996782619" data-contact="whatsapp" target="_blank" rel="noopener">${escape(c.fallback)} <svg class="ui-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" style="display:inline-block;vertical-align:-.125em;flex-shrink:0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></a></p>`;
        return;
      }
      grid.innerHTML = products.map((product, index) => {
        const plan = quote(product.price);
        return `<article class="phone-card${product.name === names[0] ? ' phone-card-featured' : ''}">
          <div class="phone-card-top"><span>${product.category === 'apple' ? 'APPLE' : 'SAMSUNG'}</span><span class="plan-pill">${escape(c.term)}</span></div>
          <div class="phone-image"><img src="${escape(imageSrc(product))}" alt="${escape(product.name)}" width="300" height="240" loading="lazy" decoding="async"></div>
          <h3>${escape(product.name)}</h3><p class="phone-retail">${escape(c.retail)} · ${money(product.price)}</p>
          <div class="phone-payment"><strong>${money(plan.payment)}</strong><span>${escape(c.month)}</span></div>
          <p class="phone-fee">${escape(c.fee)}<br>${escape(c.firstPayment)}</p>
          <a class="offer-cta" href="${escape(whatsappUrl(product))}" data-contact="whatsapp" data-product="${escape(product.name)}" target="_blank" rel="noopener">${escape(c.ask)} <span aria-hidden="true"><svg class="ui-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" style="display:inline-block;vertical-align:-.125em;flex-shrink:0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></span></a>
          <button class="adjust-plan" type="button" data-offer-index="${index}" aria-label="${escape(c.adjust + ': ' + product.name)}">${escape(c.adjust)}</button>
        </article>`;
      }).join('');
      const product = products.find(item => item.name === names[0]);
      if (!product) { featured.hidden = true; return; }
      const plan = quote(product.price);
      featured.hidden = false;
      featured.innerHTML = `<img src="${escape(imageSrc(product))}" alt="${escape(product.name)}" width="210" height="220" fetchpriority="high"><div><span class="featured-eyebrow">${escape(c.featured)}</span><h2>${escape(product.name)}</h2><span class="featured-label">${escape(c.heroMonthly)}</span><strong>${money(plan.payment)}<small>${escape(c.month)}</small></strong><p>${escape(c.heroNote)}</p></div>`;
    }

    form.addEventListener('input', event => {
      form.dataset.edited = 'true';
      if (event.target === priceInput) { selectedName = ''; selection.textContent = strings().calc; }
    });
    grid.addEventListener('click', event => {
      const button = event.target.closest('button[data-offer-index]');
      if (!button) return;
      const product = products[Number(button.dataset.offerIndex)];
      if (!product) return;
      priceInput.value = product.price;
      document.getElementById('topup').value = '0';
      document.querySelector('input[name="months"][value="12"]').checked = true;
      priceInput.dispatchEvent(new Event('input', { bubbles: true }));
      selectedName = product.name;
      selection.textContent = strings().selected + ': ' + selectedName;
      form.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      priceInput.focus({ preventScroll: true });
    });
    document.addEventListener('suave:languagechange', render);
    render();
    fetch('/data/products.json', { cache: 'no-cache' }).then(response => {
      if (!response.ok) throw new Error('Catalog unavailable');
      return response.json();
    }).then(catalog => {
      products = selectProducts(catalog);
      if (!products.length) throw new Error('No current offers');
      if (!form.dataset.edited) {
        priceInput.value = products[0].price;
        priceInput.dispatchEvent(new Event('input', { bubbles: true }));
        selectedName = products[0].name;
      }
      grid.removeAttribute('aria-busy');
      render();
    }).catch(() => { loadFailed = true; grid.removeAttribute('aria-busy'); render(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : globalThis);
