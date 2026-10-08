/* ============================================
       NAVIGATION JS
       ============================================ */
    (() => {
      const nav = document.getElementById('nav');
      const hamburger = nav.querySelector('.nav-hamburger');
      const mobileLinks = nav.querySelectorAll('.nav-mobile-menu a');

      // Scroll: add/remove nav-scrolled class
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            nav.classList.toggle('nav-scrolled', window.scrollY > 50);
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });

      // Hamburger toggle
      hamburger.addEventListener('click', () => {
        nav.classList.toggle('menu-open');
        hamburger.setAttribute('aria-expanded', String(nav.classList.contains('menu-open')));
        document.body.style.overflow = nav.classList.contains('menu-open') ? 'hidden' : '';
      });

      // Close mobile menu on link click
      mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
          nav.classList.remove('menu-open');
          hamburger.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        });
      });

      // Close mobile menu on Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && nav.classList.contains('menu-open')) {
          nav.classList.remove('menu-open');
          hamburger.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        }
      });
    })();

    /* ============================================
       FADE-IN OBSERVER
       ============================================ */
    const fadeObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.fade-in').forEach(el => fadeObserver.observe(el));

    /* ============================================
       PRODUCT DATA LOADING & RENDERING
       ============================================ */
    const CATEGORY_ICONS = {
      apple: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5"></rect><line x1="10" y1="5.5" x2="14" y2="5.5"></line><line x1="11" y1="18.5" x2="13" y2="18.5"></line></svg>`,
      samsung: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5"></rect><line x1="9.5" y1="5.5" x2="14.5" y2="5.5"></line><circle cx="12" cy="18.5" r="1"></circle></svg>`,
      tvs: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="2"></rect><line x1="9" y1="21" x2="15" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
      laptops: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="10" rx="1.8"></rect><path d="M3 18h18"></path><path d="M8 18h8"></path></svg>`,
      acs: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18"></path><path d="M4.5 7.5l15 9"></path><path d="M19.5 7.5l-15 9"></path><circle cx="12" cy="12" r="2.4"></circle></svg>`,
      motor: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6.5" cy="16.5" r="2.5"></circle><circle cx="17.5" cy="16.5" r="2.5"></circle><path d="M9 16.5h5l2-4h2.5"></path><path d="M7.5 12.5h4l1.2 2"></path><path d="M13 10h2.5"></path></svg>`,
      appliances: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"></rect><line x1="4" y1="11" x2="20" y2="11"></line></svg>`,
      other:   `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect></svg>`
    };

    const CATEGORY_META = {
      apple:   { name: 'Apple',           icon: CATEGORY_ICONS.apple, gradient: 'linear-gradient(135deg, #1a1a4e, #4b2ca0)' },
      samsung: { name: 'Samsung',         icon: CATEGORY_ICONS.samsung, gradient: 'linear-gradient(135deg, #0a1628, #1a3a6e)' },
      tvs:     { name: 'Televisions',     icon: CATEGORY_ICONS.tvs, gradient: 'linear-gradient(135deg, #1a1a1a, #3a3a3a)' },
      laptops: { name: 'Laptops',         icon: CATEGORY_ICONS.laptops, gradient: 'linear-gradient(135deg, #1a2a1a, #2a4a3a)' },
      acs:     { name: 'Air Conditioning', icon: CATEGORY_ICONS.acs, gradient: 'linear-gradient(135deg, #0a2a3a, #1a4a5e)' },
      motor:   { name: 'Scooters & motorcycles',     icon: CATEGORY_ICONS.motor, gradient: 'linear-gradient(135deg, #2a1a0a, #5a3a1a)' },
      appliances: { name: 'Appliances',     icon: CATEGORY_ICONS.appliances, gradient: 'linear-gradient(135deg, #2a1a3a, #4a2a5e)' },
      other:   { name: 'Other',           icon: CATEGORY_ICONS.other, gradient: 'linear-gradient(135deg, #2a2a3a, #4a4a5e)' }
    };

    const CATEGORY_ORDER = ['apple', 'samsung', 'tvs', 'laptops', 'acs', 'appliances', 'motor', 'other'];
    const PRODUCTS_DATA_VERSION = '2026-10-08-1010-prices';

    function waLink(name, price) {
      const msg = `Hi, I'm interested in the ${name} (${formatPrice(price)})`;
      return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
    }

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function productImageSrc(product) {
      if (!product.image) return '';
      if (product.image.startsWith('/')) return product.image;
      const requested = product.image.replace(/\.jpe?g$/i, '.png');
      const overrides = { 'tv-generic.png': 'tv-catalog.webp', 'laptop-generic.png': 'laptop-catalog.webp', 'ac-generic.png': 'ac-catalog.webp', 'iphone-16-plus-model.png': 'iphone-16-plus-model.jpg' };
      return 'img/products/' + (overrides[requested] || requested);
    }

    const GENERIC_IMAGE_FILES = new Set([
      'appliance-generic.png',
      'tablet-generic.png'
    ]);

    function productBrand(product) {
      const text = `${product.name || ''} ${product.spec || ''}`.toLowerCase();
      const brands = ['Samsung', 'Hisense', 'Skytech', 'Amazon', 'Lenovo', 'HP', 'Ninja', 'Frigidaire', 'San-Den', 'Oster', 'Toshiba'];
      return brands.find(brand => text.includes(brand.toLowerCase())) || CATEGORY_META[product.category]?.name || 'Connections';
    }

    function productType(product) {
      if (/macbook/i.test(product.name)) return 'Laptop';
      const labels = {
        tvs: 'Television',
        laptops: 'Laptop',
        acs: 'Climate',
        appliances: 'Home appliance',
        other: 'Essential',
        motor: '150cc collection'
      };
      return labels[product.category] || 'Technology';
    }

    function productVisualHTML(product, fullName) {
      const filename = (product.image || '').replace(/\.jpe?g$/i, '.png');
      if (product.image && !product.imageUnavailable && !GENERIC_IMAGE_FILES.has(filename)) {
        return `<img src="${productImageSrc(product)}" alt="${escapeHtml(fullName)}" loading="lazy" decoding="async">`;
      }
      const mark = ({ tvs: 'TV', laptops: 'PC', acs: '°', appliances: '+' })[product.category] || '•';
      return `<div class="model-art" data-category="${escapeHtml(product.category)}" data-mark="${mark}" role="img" aria-label="${escapeHtml(fullName)}">
        <span class="model-art-brand">${escapeHtml(productBrand(product))}</span>
        <span class="model-art-type">${escapeHtml(productType(product))}</span>
        <strong class="model-art-name">${escapeHtml(fullName)}</strong>
      </div>`;
    }

    /* ---- Category Grid ---- */
    function renderCategories(products) {
      const container = document.querySelector('#categories .container');
      const grouped = {};
      CATEGORY_ORDER.forEach(c => grouped[c] = 0);
      CATEGORY_ORDER.forEach(cat => { grouped[cat] = products.filter(p => matchesCategory(p, cat)).length; });

      let html = '<div class="category-heading"><h2>What are you looking for?</h2><a href="#products">Browse the collection →</a></div>';
      html += '<div class="categories-grid fade-in">';

      CATEGORY_ORDER.forEach(cat => {
        const meta = CATEGORY_META[cat];
        html += `
          <button type="button" class="category-card" data-target="cat-${cat}" aria-label="Browse ${meta.name}">
            <div class="cat-icon">${meta.icon}</div>
            <div class="cat-name">${meta.name}</div>
            <div class="cat-count">${grouped[cat]} product${grouped[cat] !== 1 ? 's' : ''}</div>
          </button>`;
      });

      html += '</div>';
      container.innerHTML = html;

      // Click a category card → filter to that category + scroll to products
      container.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
          const cat = card.dataset.target.replace(/^cat-/, '');
          resetFilters();
          const pill = document.querySelector(`.pf-pill[data-cat="${cat}"]`);
          if (pill) {
            pill.click();
            const products = document.getElementById('products');
            if (products) products.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            const target = document.getElementById(card.dataset.target);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });

      // Observe new fade-in elements
      container.querySelectorAll('.fade-in').forEach(el => fadeObserver.observe(el));
    }

    /* ---- Deals Carousel ---- */
    /* Sale ribbon + strikethrough old price (opt-in via product.oldPrice) */
    function saleInfo(p) {
      const onSale = p.price && p.oldPrice && p.oldPrice > p.price;
      const pct = onSale ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
      return {
        ribbon: onSale ? `<span class="badge-sale">-${pct}%</span>` : '',
        oldPriceHtml: onSale ? ` <span class="old-price">${formatPrice(p.oldPrice)}</span>` : ''
      };
    }

    function renderDeals(products) {
      const featured = products.filter(p => p.featured);
      if (!featured.length) return;

      const container = document.querySelector('#deals .container');
      let html = '<div class="section-heading"><div><p class="eyebrow">Hello, September</p><h2>This month’s good finds.</h2></div><a class="text-link" href="#products">Shop the collection ↗</a></div>';
      html += '<div class="deals-wrapper fade-in">';

      // Arrow buttons
      html += `<button class="deals-arrow deals-arrow--left" aria-label="Scroll left">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>`;
      html += `<button class="deals-arrow deals-arrow--right" aria-label="Scroll right">
        <svg viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18"></polyline></svg>
      </button>`;

      html += '<div class="deals-track">';

      featured.forEach(p => {
        const fullName = p.name + (p.suffix ? ' ' + p.suffix : '');
        const hsoBadge = p.suffix === 'HSO' ? '<span class="badge-hso">HSO</span>' : '';
        const activeBadge = p.suffix === 'Active' ? '<span class="badge-active" role="button" tabindex="0" title="New &amp; sealed. Apple warranty is already running — phone carries a 1-year warranty with Connections.">Active ⓘ</span>' : '';
        const activeNote = p.suffix === 'Active' ? '<div class="active-note" hidden>New &amp; sealed. Apple warranty is already running — phone carries a <strong>1-year warranty with Connections</strong>.</div>' : '';
        const productVisual = productVisualHTML(p, fullName);
        const encodedName = encodeURIComponent(fullName);
        const { ribbon, oldPriceHtml } = saleInfo(p);
        const limitedBadge = p.limited === true ? '<span class="badge-limited" role="button" tabindex="0" title="Limited stock. Price rises once this batch sells out.">⚡ Limited supply</span>' : '';
        const limitedNote = p.limited === true ? '<div class="limited-note" hidden>⚡ <strong>Limited stock.</strong> Price rises once this batch sells out — grab it now.</div>' : '';
        const corner = (ribbon || limitedBadge) ? `<div class="card-ribbons">${ribbon}${limitedBadge}</div>` : '';
        html += `
          <div class="deal-card">
            ${corner}
            <div class="deal-img">
              ${productVisual}
            </div>
            <div class="deal-body">
              <div class="deal-name">${escapeHtml(p.name)}${hsoBadge}${activeBadge}${p.suffix && !['HSO', 'Active'].includes(p.suffix) ? ' <span class="product-suffix">' + escapeHtml(p.suffix) + '</span>' : ''}</div>
              ${activeNote}${limitedNote}
              <div class="deal-price">${p.price ? formatPrice(p.price) + oldPriceHtml : 'Ask in store'}</div>
              ${p.price && !p.inquiryOnly ? `<button type="button" class="btn-whatsapp js-order-btn" data-product-name="${encodedName}" data-product-price="${p.price}">
                ${WA_ICON} Checkout &amp; Pay
              </button>` : `<a class="btn-whatsapp" href="${p.landingPage || ('https://wa.me/' + (p.contactNumber || WA_NUMBER) + '?text=' + encodeURIComponent("Hi, I'm interested in the " + fullName + ". Is it available?"))}" ${p.landingPage ? '' : 'target="_blank" rel="noopener"'}>
                ${WA_ICON} ${p.landingPage ? 'View Details' : 'Ask availability'}
              </a>`}
            </div>
          </div>`;
      });

      html += '</div></div>';
      container.innerHTML = html;

      // Arrow scroll logic
      const track = container.querySelector('.deals-track');
      const leftBtn = container.querySelector('.deals-arrow--left');
      const rightBtn = container.querySelector('.deals-arrow--right');
      const scrollAmt = 300;

      leftBtn.addEventListener('click', () => {
        track.scrollBy({ left: -scrollAmt, behavior: 'smooth' });
      });
      rightBtn.addEventListener('click', () => {
        track.scrollBy({ left: scrollAmt, behavior: 'smooth' });
      });

      attachOrderButtons(container);
      container.querySelectorAll('.fade-in').forEach(el => fadeObserver.observe(el));
    }

    /* ---- Single product card markup (shared by grouped + filtered views) ---- */
    function productCardHTML(p) {
      const fullName = p.name + (p.suffix ? ' ' + p.suffix : '');
      const hsoBadge = p.suffix === 'HSO' ? '<span class="badge-hso">HSO</span>' : '';
      const activeBadge = p.suffix === 'Active' ? '<span class="badge-active" role="button" tabindex="0" title="New &amp; sealed. Apple warranty is already running — phone carries a 1-year warranty with Connections.">Active ⓘ</span>' : '';
      const activeNote = p.suffix === 'Active' ? '<div class="active-note" hidden>New &amp; sealed. Apple warranty is already running — phone carries a <strong>1-year warranty with Connections</strong>.</div>' : '';
      const productVisual = productVisualHTML(p, fullName);
      const encodedName = encodeURIComponent(fullName);
      const { ribbon, oldPriceHtml } = saleInfo(p);
      const limitedBadge = p.limited === true ? '<span class="badge-limited" role="button" tabindex="0" title="Limited stock. Price rises once this batch sells out.">⚡ Limited supply</span>' : '';
      const limitedNote = p.limited === true ? '<div class="limited-note" hidden>⚡ <strong>Limited stock.</strong> Price rises once this batch sells out — grab it now.</div>' : '';
      const corner = (ribbon || limitedBadge) ? `<div class="card-ribbons">${ribbon}${limitedBadge}</div>` : '';
      return `
        <div class="product-card">
          ${corner}
          <div class="product-img">
            ${productVisual}
          </div>
          <div class="product-body">
            <div class="product-name">${escapeHtml(p.name)}${hsoBadge}${activeBadge}${p.suffix && !['HSO', 'Active'].includes(p.suffix) ? ' <span class="product-suffix">' + escapeHtml(p.suffix) + '</span>' : ''}</div>
            ${activeNote}${limitedNote}
            ${p.spec ? `<div class="product-spec">${escapeHtml(p.spec)}</div>` : ''}
            <div class="product-price">${p.price ? formatPrice(p.price) + oldPriceHtml : 'Ask in store'}</div>
            ${p.price && !p.inquiryOnly ? `<button type="button" class="btn-whatsapp-sm js-order-btn" data-product-name="${encodedName}" data-product-price="${p.price}">
              ${WA_ICON} Checkout &amp; Pay
            </button>` : `<a class="btn-whatsapp-sm" href="${p.landingPage || ('https://wa.me/' + (p.contactNumber || WA_NUMBER) + '?text=' + encodeURIComponent("Hi, I'm interested in the " + fullName + ". Is it available?"))}" ${p.landingPage ? '' : 'target="_blank" rel="noopener"'}>
              ${WA_ICON} ${p.landingPage ? 'View Details' : 'Ask availability'}
            </a>`}
          </div>
        </div>`;
    }

    /* ---- Product Sections (grouped by category, or flat when filtering) ---- */
    function renderProducts(products, opts) {
      opts = opts || {};
      const container = document.querySelector('#product-results');
      let html = '';

      if (opts.flat) {
        if (!products.length) {
          html = `<div class="pf-empty">
            <div class="pf-empty-emoji">🔍</div>
            <div>No products match your search.</div>
            <button type="button" id="pf-reset">Clear filters</button>
          </div>`;
        } else {
          const label = products.length === 1 ? '1 result' : `${products.length} results`;
          html = `<div class="product-section">
            <h2 class="results-title">${label}</h2>
            <div class="product-grid">${products.map(productCardHTML).join('')}</div>
          </div>`;
        }
      } else {
        const grouped = {};
        CATEGORY_ORDER.forEach(c => grouped[c] = []);
        products.forEach(p => { if (grouped[p.category]) grouped[p.category].push(p); });

        CATEGORY_ORDER.forEach(cat => {
          const items = grouped[cat];
          if (!items.length) return;
          const meta = CATEGORY_META[cat];
          html += `<div id="cat-${cat}" class="product-section">`;
          html += `<h2 class="section-title">${meta.name}</h2>`;
          html += `<div class="product-grid">${items.map(productCardHTML).join('')}</div>`;
          html += '</div>';
        });
      }

      container.innerHTML = html;
      attachOrderButtons(container);
      const reset = container.querySelector('#pf-reset');
      if (reset) reset.addEventListener('click', resetFilters);
      container.querySelectorAll('.fade-in').forEach(el => fadeObserver.observe(el));
    }

    /* ---- Search / filter / sort toolbar ---- */
    let ALL_PRODUCTS = [];
    function matchesCategory(p, category) { return p.category === category || (category === 'laptops' && /macbook/i.test(p.name)); }
    const filterState = { search: '', category: 'all', price: 'all', sort: 'featured' };

    const PRICE_BUCKETS = {
      all:        () => true,
      'u300':     p => p.price && p.price < 300,
      '300-700':  p => p.price && p.price >= 300 && p.price < 700,
      '700-1500': p => p.price && p.price >= 700 && p.price < 1500,
      '1500-3000':p => p.price && p.price >= 1500 && p.price < 3000,
      '3000plus': p => p.price && p.price >= 3000
    };

    function applyFilters() {
      const q = filterState.search.trim().toLowerCase();
      let list = ALL_PRODUCTS.filter(p => {
        const name = (p.name + ' ' + (p.suffix || '') + ' ' + (p.spec || '')).toLowerCase();
        if (q && !name.includes(q)) return false;
        if (filterState.category !== 'all' && !matchesCategory(p, filterState.category)) return false;
        if (!PRICE_BUCKETS[filterState.price](p)) return false;
        return true;
      });

      const s = filterState.sort;
      if (s === 'featured') list = [...list].sort((a, b) => Number(b.featured) - Number(a.featured));
      else if (s === 'price-asc')  list = [...list].sort((a, b) => (a.price || Infinity) - (b.price || Infinity));
      else if (s === 'price-desc') list = [...list].sort((a, b) => (b.price || -Infinity) - (a.price || -Infinity));
      else if (s === 'name')  list = [...list].sort((a, b) => a.name.localeCompare(b.name));

      const flat = !!q || filterState.category !== 'all' || filterState.price !== 'all' || s !== 'featured';
      renderProducts(list, { flat });

      const count = document.querySelector('#pf-count');
      if (count) count.textContent = flat ? '' : `${ALL_PRODUCTS.length} products`;
    }

    function resetFilters() {
      filterState.search = '';
      filterState.category = 'all';
      filterState.price = 'all';
      filterState.sort = 'featured';
      const search = document.querySelector('#pf-search');
      const price = document.querySelector('#pf-price');
      const sort = document.querySelector('#pf-sort');
      if (search) { search.value = ''; search.closest('.pf-search').classList.remove('has-value'); }
      if (price) price.value = 'all';
      if (sort) sort.value = 'featured';
      document.querySelectorAll('.pf-pill').forEach(b => b.classList.toggle('active', b.dataset.cat === 'all'));
      applyFilters();
    }

    function renderToolbar(products) {
      const toolbar = document.querySelector('#product-toolbar');
      if (!toolbar) return;

      const counts = {};
      products.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
      const cats = CATEGORY_ORDER.filter(c => counts[c]);

      let pills = `<button type="button" class="pf-pill active" data-cat="all">All</button>`;
      cats.forEach(c => {
        pills += `<button type="button" class="pf-pill" data-cat="${c}">${CATEGORY_META[c].name}</button>`;
      });

      toolbar.innerHTML = `
        <div class="pf-toolbar">
          <div class="pf-row">
            <div class="pf-search">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="search" id="pf-search" placeholder="Search products…" autocomplete="off" aria-label="Search products">
              <button type="button" class="pf-clear" id="pf-clear" aria-label="Clear search">×</button>
            </div>
            <select class="pf-select" id="pf-price" aria-label="Filter by price">
              <option value="all">All prices</option>
              <option value="u300">Under XCG 300</option>
              <option value="300-700">XCG 300 – 700</option>
              <option value="700-1500">XCG 700 – 1,500</option>
              <option value="1500-3000">XCG 1,500 – 3,000</option>
              <option value="3000plus">XCG 3,000+</option>
            </select>
            <select class="pf-select" id="pf-sort" aria-label="Sort products">
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name">Name: A–Z</option>
            </select>
          </div>
          <div class="pf-row">
            <div class="pf-pills">${pills}</div>
            <div class="pf-count" id="pf-count"></div>
          </div>
        </div>`;

      const search = toolbar.querySelector('#pf-search');
      const clearBtn = toolbar.querySelector('#pf-clear');
      const searchWrap = toolbar.querySelector('.pf-search');
      let debounce;
      search.addEventListener('input', () => {
        filterState.search = search.value;
        searchWrap.classList.toggle('has-value', search.value.length > 0);
        clearTimeout(debounce);
        debounce = setTimeout(applyFilters, 150);
      });
      clearBtn.addEventListener('click', () => {
        search.value = '';
        filterState.search = '';
        searchWrap.classList.remove('has-value');
        applyFilters();
        search.focus();
      });

      toolbar.querySelector('#pf-price').addEventListener('change', (e) => {
        filterState.price = e.target.value;
        applyFilters();
      });
      toolbar.querySelector('#pf-sort').addEventListener('change', (e) => {
        filterState.sort = e.target.value;
        applyFilters();
      });
      toolbar.querySelectorAll('.pf-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          filterState.category = btn.dataset.cat;
          toolbar.querySelectorAll('.pf-pill').forEach(b => b.classList.toggle('active', b === btn));
          applyFilters();
        });
      });
    }

    /* ---- Active badge: tap/click to reveal warranty note ---- */
    const NOTE_BADGES = [
      { sel: '.badge-active', note: '.active-note' },
      { sel: '.badge-limited', note: '.limited-note' }
    ];
    function findNoteBadge(target) {
      if (!target || !target.closest) return null;
      for (const nb of NOTE_BADGES) {
        const badge = target.closest(nb.sel);
        if (badge) return { badge, noteSel: nb.note };
      }
      return null;
    }
    function toggleCardNote(badge, noteSel) {
      const card = badge.closest('.deal-card, .product-card');
      const note = card && card.querySelector(noteSel);
      if (note) note.hidden = !note.hidden;
    }
    document.addEventListener('click', (e) => {
      const hit = findNoteBadge(e.target);
      if (hit) { e.stopPropagation(); toggleCardNote(hit.badge, hit.noteSel); }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const hit = findNoteBadge(e.target);
      if (hit) { e.preventDefault(); toggleCardNote(hit.badge, hit.noteSel); }
    });

    /* ---- Init ---- */
    document.addEventListener('DOMContentLoaded', async () => {
      try {
        const res = await fetch(`data/products.json?v=${PRODUCTS_DATA_VERSION}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Products fetch failed: ${res.status}`);
        const products = await res.json();
        ALL_PRODUCTS = products;
        renderCategories(products);
        renderDeals(products);
        renderToolbar(products);
        applyFilters();
        initCheckoutModal();
      } catch (e) {
        console.error('Failed to load products:', e);
        document.getElementById('product-results').innerHTML = '<div class="pf-empty"><h3>Let’s find your next upgrade.</h3><p>The catalog could not load. Please reload or ask our team.</p><a class="btn-primary" href="https://wa.me/59996782619">Chat on WhatsApp ↗</a></div>';
      }
    });

    // Use category links consistently after search/filtering has changed the DOM.
    document.addEventListener('click', event => {
      const link = event.target.closest('a[data-cat]');
      if (!link || !ALL_PRODUCTS.length) return;
      event.preventDefault();
      resetFilters();
      const pill = document.querySelector('.pf-pill[data-cat="' + link.dataset.cat + '"]');
      if (pill) pill.click();
      document.getElementById('products').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
