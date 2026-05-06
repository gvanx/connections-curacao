# Appliances Category + `/appliances/` Store — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `appliances` category to the connectionscuracao.net catalog (16 new items), drop in 11 more catalog items across existing `acs`/`motor`/`tvs` categories, and ship a functional `/appliances/` sub-page that uses the same single-product Sentoo+EmailJS+WhatsApp checkout as the main site.

**Architecture:** Static site, single repo, Netlify auto-deploy on push to `main`. Catalog driven by `data/products.json`; categories defined in `index.html`. Checkout JS lives inline in `index.html` today — extract it to a shared `js/checkout.js` so both `index.html` and the new `/appliances/index.html` can use it without duplication.

**Tech Stack:** Vanilla HTML/CSS/JS. EmailJS browser SDK, Sentoo payment links, WhatsApp click-to-chat. No build step, no framework, no test runner.

**Spec:** `docs/superpowers/specs/2026-05-06-appliances-design.md`

---

## File Structure

**Created**
- `js/checkout.js` — extracted shared checkout module (constants, format helpers, modal logic, EmailJS, Sentoo)
- `appliances/index.html` — new store sub-page (hero + sectioned grid + checkout modal)
- `img/products/appliance-generic.png` — fallback image for the new category

**Modified**
- `data/products.json` — add 27 product objects across `appliances` (16), `acs` (4), `motor` (1), `tvs` (7)
- `index.html` — add category infrastructure, swap inline checkout JS for `<script src="js/checkout.js">`, add nav link, update meta, bump cache buster
- `sitemap.xml` — add `/appliances/`
- `CATALOG_EDIT_CHEATSHEET.md` — add `appliances` to Allowed Categories list

**Note on testing:** Project has no test runner. Each task ends with a manual smoke test (browser visual + Network tab + click test) plus a commit.

---

## Task 1: Pre-flight check

**Files:**
- Read only: `index.html`, `data/products.json`

- [ ] **Step 1: Confirm clean working tree**

Run: `git status`
Expected: `nothing to commit, working tree clean` (or only the spec/plan files we just authored). If anything else is modified, stop and resolve before continuing.

- [ ] **Step 2: Confirm the inline checkout JS line range**

Run: `grep -n "function initEmailJS\|function initCheckoutModal" index.html`
Expected: two line numbers around 2060 and 2166 — the inline checkout helpers we'll extract.

- [ ] **Step 3: Confirm checkout dependencies live just above**

Run: `grep -n "const WA_NUMBER\|const CHECKOUT_CONFIG\|let activeCheckout\|function formatPrice\|const WA_ICON" index.html`
Expected: hits at lines ~1943, 1944, 1956, 1958, 2058. These are the constants/helpers that move with the checkout into `js/checkout.js`.

---

## Task 2: Create `appliance-generic.png` fallback image

**Files:**
- Create: `img/products/appliance-generic.png`

- [ ] **Step 1: Confirm existing fallbacks**

Run: `ls -la img/products/ | grep -E "generic|fallback"`
Expected: existing files like `ac-generic.png`, `tv-generic.png`, `laptop-generic.png`, `iphone-generic.png`, `motorcycle-generic.png`.

- [ ] **Step 2: Create the new fallback by copying an existing one**

Run: `cp img/products/ac-generic.png img/products/appliance-generic.png`

This is a temporary placeholder. Operator will swap in a proper generic appliance illustration later (or set per-product images).

- [ ] **Step 3: Verify it landed**

Run: `ls -la img/products/appliance-generic.png`
Expected: file exists, non-zero size.

- [ ] **Step 4: Commit**

```bash
git add img/products/appliance-generic.png
git commit -m "assets: add appliance-generic fallback image"
```

---

## Task 3: Extract inline checkout JS to `js/checkout.js`

**Files:**
- Create: `js/checkout.js`
- Modify: `index.html` — remove inline checkout block, add `<script src="js/checkout.js">` tag

The shared module will own: `WA_NUMBER`, `WA_ICON`, `CHECKOUT_CONFIG`, `activeCheckout` state, `formatPrice`, `initEmailJS`, `sentooLink`, `getCheckoutTotals`, `updateCheckoutSummary`, `closeCheckout`, `openCheckout`, `orderMessage`, `attachOrderButtons`, `initCheckoutModal`. All exposed as window globals (this is a vanilla site — no module system).

`waLink()` (currently at line ~1962, unused) **stays in `index.html`** — it's dead code unrelated to checkout, leave it for a separate cleanup commit.

- [ ] **Step 1: Create `js/` directory and the new file**

Run: `mkdir -p js`

Then create `js/checkout.js` with this exact content. (Copy each block from `index.html` at the line ranges noted; the result must be byte-identical to the inline original within those ranges.)

```js
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
```

- [ ] **Step 2: Remove the inline blocks from `index.html`**

Two edits, in this order:

**Edit A** — delete lines `1943` through `1960` of `index.html` (the constants + `formatPrice` + state). They're now in `js/checkout.js`.

The block to remove starts at:
```js
    const WA_NUMBER = '59996782619';
```
and ends at the line right before:
```js
    function waLink(name, price) {
```
(i.e. delete through the blank line after `let activeCheckout = null;` and `function formatPrice(...) { ... }` — stop just before `function waLink`).

Leave `waLink()` in place. Leave `const PRODUCTS_DATA_VERSION = '...'` in place.

**Edit B** — delete the entire WhatsApp icon constant + checkout function block. Start at `/* ---- WhatsApp SVG icon ---- */` (line ~2057) and remove through the closing `}` of `initCheckoutModal()` (line ~2262). Stop just before `/* ---- Deals Carousel ---- */`.

- [ ] **Step 3: Add the `<script>` tag**

In `index.html`, find the existing EmailJS CDN script (line ~1861):
```html
<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"></script>
```

Add immediately after it:
```html
<script src="js/checkout.js?v=2026-05-06-1"></script>
```

The cache-buster query keeps Netlify from serving stale checkout JS to returning visitors.

- [ ] **Step 4: Smoke test main checkout end-to-end**

Run: `python3 -m http.server 8765` in another terminal, then open `http://localhost:8765/` in a browser.

In the browser DevTools Console, confirm no `ReferenceError` for any of: `WA_NUMBER`, `CHECKOUT_CONFIG`, `formatPrice`, `openCheckout`, `attachOrderButtons`, `initCheckoutModal`.

Click any product card's "Buy" button — checkout modal must open with the correct product name and price. Toggle between Full/Reserve and Pickup/Delivery; the summary numbers must update. Close with the × button and with Escape.

Stop the server (Ctrl+C) once verified.

- [ ] **Step 5: Commit**

```bash
git add js/checkout.js index.html
git commit -m "refactor: extract inline checkout JS to js/checkout.js"
```

---

## Task 4: Add `appliances` category infrastructure to `index.html`

**Files:**
- Modify: `index.html` (5 touchpoints around lines 1591, 1615, 1925, 1934, 1942, 2015 — exact line numbers will have shifted after Task 3, use the surrounding code as anchors)

- [ ] **Step 1: Add the `appliances` SVG icon to `CATEGORY_ICONS`**

Find the `CATEGORY_ICONS` object (search for `motor:` to land on the existing motorcycles entry). Append a new entry **after** the `motor:` line, before the closing `}`:

```js
appliances: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"></rect><line x1="4" y1="11" x2="20" y2="11"></line><circle cx="7" cy="7" r="0.8" fill="currentColor"></circle><circle cx="7" cy="15" r="0.8" fill="currentColor"></circle></svg>`,
```

(Visual: a tall rectangle with a horizontal divider and two dots — reads as a fridge with freezer + handles.)

- [ ] **Step 2: Add the `appliances` entry to the `CATEGORIES` object**

Search for `motor:   { name: 'Motorcycles'` to anchor. Add a new entry immediately after it:

```js
appliances: { name: 'Appliances',     icon: CATEGORY_ICONS.appliances, gradient: 'linear-gradient(135deg, #2a1a3a, #4a2a5e)' },
```

Match the alignment of surrounding entries (column-align the `:` and `icon:` parts the same way). Whitespace doesn't affect behavior, but the file uses neat alignment — preserve it.

- [ ] **Step 3: Insert `'appliances'` into `CATEGORY_ORDER`**

Find:
```js
const CATEGORY_ORDER = ['apple', 'samsung', 'tvs', 'laptops', 'acs', 'motor', 'other'];
```

Replace with:
```js
const CATEGORY_ORDER = ['apple', 'samsung', 'tvs', 'laptops', 'acs', 'appliances', 'motor', 'other'];
```

- [ ] **Step 4: Add the fallback image entry**

Find the `fallbackByCategory` object (search for `motor: 'motorcycle-generic.png'`). Add immediately after it:

```js
appliances: 'appliance-generic.png',
```

- [ ] **Step 5: Add the desktop nav link**

Find (around line 1591):
```html
        <a href="#cat-tvs" data-cat="tvs">TVs</a>
        <a href="#locations">Locations</a>
```

Insert between them:
```html
        <a href="#cat-appliances" data-cat="appliances">Appliances</a>
```

- [ ] **Step 6: Add the mobile nav link**

Find (around line 1615):
```html
      <a href="#cat-tvs" class="nav-mobile-link" data-cat="tvs">TVs</a>
      <a href="#locations" class="nav-mobile-link">Locations</a>
```

Insert between them:
```html
      <a href="#cat-appliances" class="nav-mobile-link" data-cat="appliances">Appliances</a>
```

- [ ] **Step 7: Update meta descriptions**

Find:
```html
<meta name="description" content="Apple, Samsung, TVs, laptops and more. Curaçao's premium electronics store. Shop online or visit us in Willemstad.">
```

Replace with:
```html
<meta name="description" content="Apple, Samsung, TVs, laptops, appliances and more. Curaçao's premium electronics store. Shop online or visit us in Willemstad.">
```

Find the `og:description` line (~line 11) and apply the same edit (insert ", appliances" after "laptops").

- [ ] **Step 8: Bump the products.json cache buster**

Find:
```js
const PRODUCTS_DATA_VERSION = '2026-04-24-kingsday-2';
```

Replace with:
```js
const PRODUCTS_DATA_VERSION = '2026-05-06-appliances-1';
```

- [ ] **Step 9: Smoke test (no products in the new category yet — that's fine)**

Run: `python3 -m http.server 8765` and open `http://localhost:8765/`.

Verify in the browser:
1. Desktop nav shows: Deals · Apple · Samsung · TVs · **Appliances** · Locations · Repair · Contact
2. Mobile nav (resize window or open hamburger) includes the Appliances link
3. Categories grid section shows the new "Appliances" tile with the purple/charcoal gradient and fridge icon, count = 0
4. DevTools console: no errors

Stop server.

- [ ] **Step 10: Commit**

```bash
git add index.html
git commit -m "feat(catalog): add appliances category infrastructure (icon, nav, gradient)"
```

---

## Task 5: Add 16 appliance products to `data/products.json`

**Files:**
- Modify: `data/products.json` — append 16 new objects in the `appliances` block

Group order in the JSON: Coffee Makers → Air Cooler → Air Fryers → Microwaves → Refrigerators. (Order matters only for display in `/appliances/` since that page filters by name keywords; main catalog grid sorts by category then encounter order. Choose this order so it reads logically.)

- [ ] **Step 1: Append the 16 objects**

Open `data/products.json`. Find the closing `]` of the array. Insert the following block immediately before it (and add a comma after the last existing object).

```json
,
  {
    "name": "Electric Coffee Maker 12 Cups",
    "suffix": "CM-6428",
    "price": 135,
    "category": "appliances",
    "featured": false,
    "image": "appliance-generic.png"
  },
  {
    "name": "Coffee Maker 12 Cups w/Glass Jug",
    "suffix": "CM-9236",
    "price": 135,
    "category": "appliances",
    "featured": false,
    "image": "appliance-generic.png"
  },
  {
    "name": "Air Cooler 3L",
    "suffix": "CR-9001",
    "price": 149,
    "category": "appliances",
    "featured": false,
    "image": "appliance-generic.png"
  },
  {
    "name": "Air Fryer 5.5L",
    "suffix": "FRD-8101AFL",
    "price": 175,
    "category": "appliances",
    "featured": false,
    "image": "appliance-generic.png"
  },
  {
    "name": "Air Fryer Oven 8L Black",
    "suffix": "FRD-8864AF(B)",
    "price": 225,
    "category": "appliances",
    "featured": false,
    "image": "appliance-generic.png"
  },
  {
    "name": "Air Fryer 8L w/Digital Screen Black",
    "suffix": "FRD-9441AF",
    "price": 225,
    "category": "appliances",
    "featured": true,
    "image": "appliance-generic.png"
  },
  {
    "name": "Air Fryer 10.5L Digital Control",
    "suffix": "FRD-9473AF",
    "price": 249,
    "category": "appliances",
    "featured": false,
    "image": "appliance-generic.png"
  },
  {
    "name": "Microwave Oven 20L/0.7CuFt Silver",
    "suffix": "MW-6647S",
    "price": 225,
    "category": "appliances",
    "featured": false,
    "image": "appliance-generic.png"
  },
  {
    "name": "Microwave 20L/0.7CF Black",
    "suffix": "MW-8305B",
    "price": 199,
    "category": "appliances",
    "featured": false,
    "image": "appliance-generic.png"
  },
  {
    "name": "Microwave 20L/0.7CF White",
    "suffix": "MW-8928",
    "price": 199,
    "category": "appliances",
    "featured": false,
    "image": "appliance-generic.png"
  },
  {
    "name": "Hisense Refrigerator RT1N320NMDA",
    "suffix": "RT1N320NMDA",
    "price": 1278.12,
    "category": "appliances",
    "featured": false,
    "image": "appliance-generic.png"
  },
  {
    "name": "Hisense Refrigerator RT16N6CDX",
    "suffix": "RT16N6CDX",
    "price": 1500.40,
    "category": "appliances",
    "featured": true,
    "image": "appliance-generic.png"
  },
  {
    "name": "Hisense Refrigerator RT14N6CDX",
    "suffix": "RT14N6CDX",
    "price": 1440.56,
    "category": "appliances",
    "featured": false,
    "image": "appliance-generic.png"
  },
  {
    "name": "Hisense Refrigerator RS3P428NEDA2",
    "suffix": "RS3P428NEDA2",
    "price": 1393.54,
    "category": "appliances",
    "featured": false,
    "image": "appliance-generic.png"
  },
  {
    "name": "Hisense Refrigerator RS19W6WSN",
    "suffix": "RS19W6WSN",
    "price": 2504.95,
    "category": "appliances",
    "featured": false,
    "image": "appliance-generic.png"
  },
  {
    "name": "Hisense Refrigerator RB15N6FBX1",
    "suffix": "RB15N6FBX1",
    "price": 1876.57,
    "category": "appliances",
    "featured": false,
    "image": "appliance-generic.png"
  }
```

- [ ] **Step 2: Validate the JSON**

Run: `python3 -c "import json; json.load(open('data/products.json'))"`
Expected: no output (valid JSON). If you see a `JSONDecodeError`, fix the trailing/missing comma it points to.

- [ ] **Step 3: Smoke test — check rendering**

Run: `python3 -m http.server 8765` and open `http://localhost:8765/`.

Verify:
1. The Appliances category tile now shows count `16`
2. Click the Appliances tile → page scrolls to a new "Appliances" section with all 16 items rendered in the standard product card grid
3. Featured Deals carousel includes "Air Fryer 8L w/Digital Screen Black" and "Hisense Refrigerator RT16N6CDX"
4. Click "Buy" on any appliance — checkout modal opens, product name and price match, totals update

Stop server.

- [ ] **Step 4: Commit**

```bash
git add data/products.json
git commit -m "catalog: add 16 appliances (coffee makers, air cooler, air fryers, microwaves, Hisense fridges)"
```

---

## Task 6: Add 4 ACs, 1 motorcycle, 7 TVs to `data/products.json`

**Files:**
- Modify: `data/products.json` — append 12 new objects

These slot into existing categories. Place each object next to other items in its category (or just append to the end of the array — display order in the main page comes from `CATEGORY_ORDER`, not array position).

For simplicity: append all 12 to the **end** of the array (after the appliance objects added in Task 5).

- [ ] **Step 1: Append the 12 objects**

In `data/products.json`, find the closing `]`. Insert before it (and add a comma after the last appliance object from Task 5):

```json
,
  {
    "name": "AC Split 12000BTU (1+1) R410A",
    "suffix": "AA-8400SC12WN2",
    "price": 499.6766775,
    "category": "acs",
    "featured": false,
    "image": "ac-generic.png"
  },
  {
    "name": "AC Split 24000BTU (1+1) R410A",
    "suffix": "AA-8402SC24WN2",
    "price": 1090.692103,
    "category": "acs",
    "featured": false,
    "image": "ac-generic.png"
  },
  {
    "name": "Air Conditioner Split 18000BTU",
    "suffix": "AA-9454SC18",
    "price": 779.0657875,
    "category": "acs",
    "featured": false,
    "image": "ac-generic.png"
  },
  {
    "name": "AC Split 12000BTU Inverter (1+1) R410A White SEER 21",
    "suffix": "AA-9456SI12",
    "price": 576.5086828,
    "category": "acs",
    "featured": false,
    "image": "ac-generic.png"
  },
  {
    "name": "Gasoline Motorcycle 150CC",
    "suffix": "MOT-9184G",
    "price": 4500,
    "category": "motor",
    "featured": false,
    "image": "motorcycle-generic.png"
  },
  {
    "name": "65\" UHD Smart TV w/DVB-T2 Android (Whale OS) Frameless w/Voice RC",
    "suffix": "TV-9304SF65WKL",
    "price": 992.905914,
    "category": "tvs",
    "featured": false,
    "image": "tv-generic.png"
  },
  {
    "name": "50\" UHD Smart TV w/DVB-T2 Android (Whale OS) Frameless w/Voice RC",
    "suffix": "TV-9308SF50WKL",
    "price": 646.893247,
    "category": "tvs",
    "featured": false,
    "image": "tv-generic.png"
  },
  {
    "name": "32\" HD Smart TV w/DVB-T2 Tizen Frameless w/Voice RC",
    "suffix": "TV-9362SF32WHL",
    "price": 249,
    "category": "tvs",
    "featured": false,
    "image": "tv-generic.png"
  },
  {
    "name": "55\" QLED Smart TV w/DVB-T2 Tizen Frameless w/Voice RC",
    "suffix": "TV-9370SF55WQL",
    "price": 812.377566,
    "category": "tvs",
    "featured": true,
    "image": "tv-generic.png"
  },
  {
    "name": "32\" HD Smart TV w/DVB-T2 Android (Whale OS) Frameless w/Voice RC (1+1)",
    "suffix": "TV-9371SF32WHL",
    "price": 249,
    "category": "tvs",
    "featured": false,
    "image": "tv-generic.png"
  },
  {
    "name": "43\" FHD Smart TV w/DVB-T2 Android Frameless w/RC",
    "suffix": "TV-9412SF43WFN",
    "price": 436.276841,
    "category": "tvs",
    "featured": false,
    "image": "tv-generic.png"
  },
  {
    "name": "40\" FHD Smart TV w/DVB-T2 Android Frameless w/Voice RC",
    "suffix": "TV-9480SF40WFN",
    "price": 361.056696,
    "category": "tvs",
    "featured": false,
    "image": "tv-generic.png"
  }
```

Note the escaped `\"` for inch marks in TV names — required so the JSON stays valid.

- [ ] **Step 2: Validate the JSON**

Run: `python3 -c "import json; json.load(open('data/products.json'))"`
Expected: no output.

- [ ] **Step 3: Confirm new counts**

Run:
```bash
python3 -c "import json; d=json.load(open('data/products.json')); from collections import Counter; print(Counter(p['category'] for p in d))"
```

Expected: existing counts plus `'appliances': 16`, `'acs'` increased by 4, `'motor'` increased by 1, `'tvs'` increased by 7.

- [ ] **Step 4: Smoke test**

Run: `python3 -m http.server 8765` and open `http://localhost:8765/`.

Verify:
1. ACs section now includes the 4 new AC Split entries
2. Motorcycle section includes the gasoline 150CC
3. TVs section includes all 7 new smart TVs; the 55" QLED appears in Featured Deals
4. Click "Buy" on a new AC, motorcycle, and TV — each opens checkout with the correct name and (decimal) price displayed via `formatPrice`

Stop server.

- [ ] **Step 5: Commit**

```bash
git add data/products.json
git commit -m "catalog: add 4 ACs, 1 motorcycle, 7 smart TVs"
```

---

## Task 7: Build `/appliances/index.html` — store sub-page

**Files:**
- Create: `appliances/index.html`

The page is self-contained: pulls `data/products.json` via `fetch`, filters to `category === 'appliances'`, renders sectioned grids, includes the same `<div id="checkout-modal">` markup as main, loads the EmailJS CDN + `js/checkout.js`, and calls `initCheckoutModal()` on `DOMContentLoaded`.

Section filters use **suffix prefix** matching, scoped to `category === 'appliances'`:
- Refrigerators: `suffix` starts with `R` (RT/RS/RB)
- Air Fryers: `suffix` starts with `FRD-`
- Microwaves: `suffix` starts with `MW-`
- Coffee Makers: `suffix` starts with `CM-`
- Air Cooler: `suffix` starts with `CR-`

This is more reliable than name-keyword matching.

- [ ] **Step 1: Create the directory**

Run: `mkdir -p appliances`

- [ ] **Step 2: Create `appliances/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appliances | Connections Curacao — Fridges, Air Fryers, Microwaves & More</title>
  <meta name="description" content="Shop home appliances at Connections Curaçao: Hisense refrigerators, air fryers, microwaves, coffee makers, air coolers. Reserve online or pay full via Sentoo.">
  <meta property="og:title" content="Appliances | Connections Curacao">
  <meta property="og:description" content="Hisense fridges, air fryers, microwaves and more — shop online with Sentoo checkout.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://connectionscuracao.net/appliances/">
  <link rel="canonical" href="https://connectionscuracao.net/appliances/">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0a0a0f;
      --surface: rgba(255,255,255,0.04);
      --surface-hover: rgba(255,255,255,0.07);
      --line: rgba(255,255,255,0.08);
      --text: #f5f5f7;
      --muted: #8e8e93;
      --accent: #8b5cf6;        /* purple — matches category gradient */
      --accent-soft: #4a2a5e;
      --whatsapp: #25D366;
      --radius: 20px;
      --radius-sm: 12px;
      --font-display: 'Outfit', system-ui, sans-serif;
      --font-body: 'DM Sans', system-ui, sans-serif;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: var(--font-body);
      color: var(--text);
      background: var(--bg);
      -webkit-font-smoothing: antialiased;
      line-height: 1.6;
    }
    a { color: inherit; text-decoration: none; }
    button { font-family: inherit; cursor: pointer; border: none; background: none; color: inherit; }
    .shell { width: min(1100px, calc(100% - 2rem)); margin: 0 auto; }

    .topbar { padding: 1.25rem 0; border-bottom: 1px solid var(--line); }
    .topbar .shell { display: flex; align-items: center; justify-content: space-between; }
    .logo { font-family: var(--font-display); font-weight: 800; letter-spacing: -0.02em; font-size: 1.25rem; }
    .topbar a.back { color: var(--muted); font-size: 0.9rem; }
    .topbar a.back:hover { color: var(--text); }

    .hero { padding: 4rem 0 3rem; text-align: center;
      background: radial-gradient(circle at 50% 30%, rgba(139,92,246,0.18), transparent 60%); }
    .hero h1 { font-family: var(--font-display); font-weight: 800; font-size: clamp(2.2rem, 5vw, 3.5rem); letter-spacing: -0.03em; }
    .hero p { color: var(--muted); margin-top: 0.75rem; font-size: 1.05rem; }

    section.cat { padding: 2.5rem 0; border-top: 1px solid var(--line); }
    section.cat h2 { font-family: var(--font-display); font-weight: 700; font-size: 1.6rem; margin-bottom: 1.25rem; letter-spacing: -0.02em; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }

    .card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius);
      padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; transition: background .2s, border-color .2s; }
    .card:hover { background: var(--surface-hover); border-color: rgba(139,92,246,0.4); }
    .card .imgwrap { aspect-ratio: 1 / 1; background: rgba(255,255,255,0.03); border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .card img { max-width: 80%; max-height: 80%; object-fit: contain; }
    .card .name { font-weight: 600; font-size: 0.95rem; line-height: 1.3; min-height: 2.6em; }
    .card .sku { color: var(--muted); font-size: 0.78rem; letter-spacing: 0.04em; }
    .card .price { font-family: var(--font-display); font-weight: 700; font-size: 1.15rem; color: var(--accent); }
    .card .buy { background: var(--accent); color: #fff; padding: 0.6rem 0.9rem; border-radius: 12px;
      font-weight: 600; font-size: 0.9rem; text-align: center; transition: filter .15s; }
    .card .buy:hover { filter: brightness(1.1); }

    /* Checkout modal — same DOM ids/classes as main index.html so js/checkout.js binds */
    .checkout-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: none;
      align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
    .checkout-overlay.visible { display: flex; }
    .checkout-modal { background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius);
      padding: 1.5rem; width: min(440px, 100%); max-height: 90vh; overflow-y: auto; position: relative; }
    .checkout-close { position: absolute; top: 0.75rem; right: 0.75rem; width: 32px; height: 32px;
      border-radius: 50%; background: var(--surface); font-size: 1.25rem; }
    .checkout-title { font-family: var(--font-display); margin-bottom: 1rem; font-size: 1.3rem; }
    .checkout-lines { margin-bottom: 1rem; padding: 0.75rem; background: var(--surface); border-radius: var(--radius-sm); }
    .checkout-line { display: flex; justify-content: space-between; padding: 0.25rem 0; font-size: 0.9rem; }
    .checkout-line strong { font-weight: 600; }
    .checkout-line.total { border-top: 1px solid var(--line); padding-top: 0.5rem; margin-top: 0.5rem; font-size: 1rem; }
    .checkout-label { display: block; font-size: 0.85rem; color: var(--muted); margin: 0.75rem 0 0.25rem; }
    .checkout-input { width: 100%; padding: 0.6rem 0.75rem; background: var(--surface); border: 1px solid var(--line);
      border-radius: var(--radius-sm); color: var(--text); font-size: 0.95rem; }
    .checkout-input:focus { outline: none; border-color: var(--accent); }
    .checkout-options { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .checkout-radio { flex: 1 1 auto; padding: 0.5rem 0.75rem; background: var(--surface); border: 1px solid var(--line);
      border-radius: var(--radius-sm); font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem; cursor: pointer; }
    .checkout-radio input { margin: 0; }
    .checkout-terms { display: flex; align-items: flex-start; gap: 0.5rem; margin: 0.75rem 0; font-size: 0.85rem; color: var(--muted); }
    .checkout-terms input { margin-top: 0.25rem; }
    .checkout-error { color: #ff453a; font-size: 0.85rem; min-height: 1.2em; margin: 0.5rem 0; }
    .checkout-submit { width: 100%; background: var(--accent); color: #fff; padding: 0.75rem;
      border-radius: var(--radius-sm); font-weight: 600; font-size: 0.95rem; margin-top: 0.5rem; }

    footer { padding: 2.5rem 0 3rem; text-align: center; color: var(--muted); font-size: 0.85rem; border-top: 1px solid var(--line); }
    footer a { color: var(--text); }
  </style>
</head>
<body>

  <header class="topbar">
    <div class="shell">
      <a href="/" class="logo">CONNECTIONS</a>
      <a href="/" class="back">← Back to main</a>
    </div>
  </header>

  <section class="hero">
    <div class="shell">
      <h1>Appliances</h1>
      <p>Hisense refrigerators, air fryers, microwaves, coffee makers, and more — reserve online or pay full via Sentoo.</p>
    </div>
  </section>

  <main class="shell" id="main">
    <section class="cat" id="cat-fridges">
      <h2>Refrigerators</h2>
      <div class="grid" data-prefix="R"></div>
    </section>
    <section class="cat" id="cat-airfryers">
      <h2>Air Fryers</h2>
      <div class="grid" data-prefix="FRD-"></div>
    </section>
    <section class="cat" id="cat-microwaves">
      <h2>Microwaves</h2>
      <div class="grid" data-prefix="MW-"></div>
    </section>
    <section class="cat" id="cat-coffee">
      <h2>Coffee Makers</h2>
      <div class="grid" data-prefix="CM-"></div>
    </section>
    <section class="cat" id="cat-cooler">
      <h2>Air Cooler</h2>
      <div class="grid" data-prefix="CR-"></div>
    </section>
  </main>

  <footer>
    <div class="shell">
      &copy; 2026 Connections Curacao · <a href="/">connectionscuracao.net</a>
    </div>
  </footer>

  <!-- Checkout modal (same DOM ids as main index.html so js/checkout.js binds) -->
  <div id="checkout-modal" class="checkout-overlay" hidden>
    <div class="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
      <button id="checkout-close" class="checkout-close" type="button" aria-label="Close checkout">×</button>
      <h3 id="checkout-title" class="checkout-title">Checkout</h3>

      <div class="checkout-lines">
        <div class="checkout-line"><span>Product</span><strong id="checkout-product">-</strong></div>
        <div class="checkout-line"><span>Product Price</span><strong id="checkout-base">XCG 0</strong></div>
        <div class="checkout-line"><span>Payment Type</span><strong id="checkout-type">Full</strong></div>
        <div class="checkout-line"><span>Pay Now</span><strong id="checkout-pay-now">XCG 0</strong></div>
        <div class="checkout-line"><span>Delivery Fee</span><strong id="checkout-fee">XCG 0</strong></div>
        <div class="checkout-line total"><span>Total</span><strong id="checkout-total">XCG 0</strong></div>
      </div>

      <form id="checkout-form">
        <label class="checkout-label" for="checkout-name">Your Name</label>
        <input id="checkout-name" class="checkout-input" type="text" placeholder="Your name">

        <label class="checkout-label" for="checkout-phone">WhatsApp Number</label>
        <input id="checkout-phone" class="checkout-input" type="text" placeholder="e.g. +599 9 678 2619">

        <div class="checkout-label">Payment Option</div>
        <div class="checkout-options">
          <label class="checkout-radio"><input type="radio" name="checkout-payment" value="full" checked> Full Payment</label>
          <label class="checkout-radio"><input type="radio" name="checkout-payment" value="reserve"> Reserve (+XCG 100 downpayment)</label>
        </div>

        <div class="checkout-label">Delivery Option</div>
        <div class="checkout-options">
          <label class="checkout-radio"><input type="radio" name="checkout-delivery" value="pickup" checked> Pickup (Free)</label>
          <label class="checkout-radio"><input type="radio" name="checkout-delivery" value="delivery"> Delivery (+XCG 35)</label>
        </div>

        <div id="checkout-address-wrap" style="display:none;">
          <label class="checkout-label" for="checkout-address">Delivery Address</label>
          <input id="checkout-address" class="checkout-input" type="text" placeholder="Street, number, district">
        </div>

        <label class="checkout-terms">
          <input id="checkout-terms" type="checkbox">
          <span>I agree to the reserve/refund terms and confirm my contact details are correct.</span>
        </label>

        <div id="checkout-error" class="checkout-error"></div>

        <button class="checkout-submit" type="submit">Pay XCG 0 via Sentoo</button>
      </form>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"></script>
  <script src="../js/checkout.js?v=2026-05-06-1"></script>
  <script>
    /* Render appliances by suffix prefix into each .grid section */
    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }
    function cardHTML(p) {
      const img = `img/products/${p.image}`;
      return `
        <article class="card">
          <div class="imgwrap"><img src="../${img}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async"></div>
          <div class="name">${escapeHtml(p.name)}</div>
          <div class="sku">${escapeHtml(p.suffix)}</div>
          <div class="price">${formatPrice(p.price)}</div>
          <button class="buy js-order-btn"
            data-product-name="${encodeURIComponent(p.name)}"
            data-product-price="${p.price}">Buy / Reserve</button>
        </article>`;
    }
    async function renderAppliances() {
      const res = await fetch('../data/products.json?v=2026-05-06-appliances-1', { cache: 'no-cache' });
      const all = await res.json();
      const items = all.filter(p => p.category === 'appliances');

      document.querySelectorAll('.grid[data-prefix]').forEach((grid) => {
        const prefix = grid.dataset.prefix;
        const matches = items.filter(p => (p.suffix || '').startsWith(prefix));
        grid.innerHTML = matches.map(cardHTML).join('');
      });

      attachOrderButtons(document.getElementById('main'));
    }
    document.addEventListener('DOMContentLoaded', () => {
      initCheckoutModal();
      renderAppliances();
    });
  </script>
</body>
</html>
```

- [ ] **Step 3: Smoke test the new page**

Run: `python3 -m http.server 8765` and open `http://localhost:8765/appliances/`.

Verify:
1. Page loads, hero shows "Appliances" headline
2. Five sections render with the right items:
   - Refrigerators: 6 Hisense fridges
   - Air Fryers: 4 items
   - Microwaves: 3 items
   - Coffee Makers: 2 items
   - Air Cooler: 1 item (CR-9001)
3. Each card shows image (generic fallback), name, SKU, price (e.g. "XCG 1,500.4"), and Buy/Reserve button
4. Click any Buy button → checkout modal opens, displays correct product name + price, totals update on radio toggle, Escape closes
5. Close modal, click another product — modal reopens with that product
6. DevTools Console: no errors, no 404s in Network tab

Stop server.

- [ ] **Step 4: Commit**

```bash
git add appliances/index.html
git commit -m "feat(appliances): add /appliances/ store sub-page with shared checkout"
```

---

## Task 8: Add `/appliances/` to `sitemap.xml`

**Files:**
- Modify: `sitemap.xml`

- [ ] **Step 1: Inspect current sitemap**

Run: `cat sitemap.xml`
Note: existing entries should give you the format (`<url><loc>...</loc>...</url>`).

- [ ] **Step 2: Add the new entry**

Add this entry (place it adjacent to other product/landing entries — e.g. near the `/repair/` entry):

```xml
  <url>
    <loc>https://connectionscuracao.net/appliances/</loc>
    <lastmod>2026-05-06</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
```

If the existing entries use different fields (only `loc`, no `lastmod`/`changefreq`), match the existing pattern instead of inventing fields.

- [ ] **Step 3: Verify XML is well-formed**

Run: `python3 -c "import xml.etree.ElementTree as ET; ET.parse('sitemap.xml')"`
Expected: no output (valid XML).

- [ ] **Step 4: Commit**

```bash
git add sitemap.xml
git commit -m "seo: add /appliances/ to sitemap"
```

---

## Task 9: Update `CATALOG_EDIT_CHEATSHEET.md`

**Files:**
- Modify: `CATALOG_EDIT_CHEATSHEET.md`

- [ ] **Step 1: Add `appliances` to the Allowed Categories list**

Find:
```markdown
## 3) Allowed Categories

- `apple`
- `samsung`
- `tvs`
- `laptops`
- `acs`
- `motor`
```

Replace with:
```markdown
## 3) Allowed Categories

- `apple`
- `samsung`
- `tvs`
- `laptops`
- `acs`
- `appliances`
- `motor`
```

- [ ] **Step 2: Commit**

```bash
git add CATALOG_EDIT_CHEATSHEET.md
git commit -m "docs: add appliances to catalog cheatsheet"
```

---

## Task 10: Final end-to-end smoke test

**Files:** none modified — verification only

- [ ] **Step 1: Start local server**

Run: `python3 -m http.server 8765`

- [ ] **Step 2: Test main site (`http://localhost:8765/`)**

- [ ] Desktop nav shows Appliances link between TVs and Locations
- [ ] Mobile nav (resize browser to ~400px wide, open hamburger) shows Appliances link
- [ ] Categories grid section shows 7 tiles including the new Appliances tile (purple gradient, count = 16)
- [ ] Click Appliances tile → smooth scrolls to the new appliances section in the catalog
- [ ] All 16 appliance products render with correct names, SKUs (in suffix), prices
- [ ] Featured Deals carousel includes: 55" QLED TV, 8L digital air fryer, RT16N6CDX fridge
- [ ] Click "Buy" on a coffee maker → checkout modal opens with name and "XCG 135"
- [ ] Toggle Reserve → totals update; toggle Delivery → address field appears, fee shows "XCG 35"
- [ ] Press Escape → modal closes
- [ ] DevTools Console shows zero errors

- [ ] **Step 3: Test `/appliances/` (`http://localhost:8765/appliances/`)**

- [ ] Hero shows "Appliances" headline with sub-copy
- [ ] All 5 sections render with the correct counts (Fridges 6, Air Fryers 4, Microwaves 3, Coffee Makers 2, Air Cooler 1)
- [ ] Decimal prices render correctly (e.g. "XCG 1,500.4" for the RT16N6CDX)
- [ ] Click "Buy / Reserve" on the RT16N6CDX → modal opens with that fridge's name + price
- [ ] Submit the form with valid data (name, phone, terms checked) → two new tabs open: Sentoo payment URL + WhatsApp pre-filled message
- [ ] Close those test tabs without paying
- [ ] DevTools Console shows zero errors; Network tab shows `data/products.json` and `js/checkout.js` both fetched 200

- [ ] **Step 4: Test `/repair/` and `/macbookneo/` still load**

- [ ] `http://localhost:8765/repair/` loads, no console errors (we did not modify these pages, but verify the relative-path changes near them didn't break anything)
- [ ] `http://localhost:8765/macbookneo/` loads, no console errors

- [ ] **Step 5: Stop the server, push to deploy**

Stop server (Ctrl+C). Then:

```bash
git status
```
Expected: `working tree clean` — all task commits are in.

```bash
git log --oneline -10
```
Expected: ~9 new commits since `7c6dbca kingsday: orange strips...`, in this order:
1. `assets: add appliance-generic fallback image`
2. `refactor: extract inline checkout JS to js/checkout.js`
3. `feat(catalog): add appliances category infrastructure`
4. `catalog: add 16 appliances`
5. `catalog: add 4 ACs, 1 motorcycle, 7 smart TVs`
6. `feat(appliances): add /appliances/ store sub-page`
7. `seo: add /appliances/ to sitemap`
8. `docs: add appliances to catalog cheatsheet`

Then **ask the operator** before pushing — do not auto-push to `main` since this triggers Netlify production deploy:

> "All 9 commits are local. Ready to push to `main` and trigger Netlify auto-deploy?"

On approval:
```bash
git push origin main
```

- [ ] **Step 6: Post-deploy verification**

Wait ~1-2 minutes for Netlify, then visit:
- `https://connectionscuracao.net/` — Appliances tile present, count 16
- `https://connectionscuracao.net/appliances/` — page renders, all sections populate
- Click a Buy button on production — checkout modal opens correctly

If anything breaks on production but worked locally: most likely a caching issue. Hard-refresh with cache disabled (DevTools → Network → "Disable cache" + reload). If still broken, check Netlify deploy log for build errors.
