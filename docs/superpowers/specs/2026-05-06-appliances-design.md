# Appliances Category + `/appliances/` Store — Design

**Status:** Approved · ready for implementation plan
**Created:** 2026-05-06
**Repo:** `connections-curacao` (single repo)
**Surfaces:** main catalog + new `/appliances/` sub-page

## Scope

1. **New `appliances` category** in the main catalog (joins `apple`, `samsung`, `tvs`, `laptops`, `acs`, `motor`)
2. **27 catalog adds** across `appliances`, `acs`, `motor`, `tvs`
3. **`/appliances/` sub-page** that functions as a store — same single-product Sentoo + EmailJS + WhatsApp checkout flow as the main site
4. **Refactor:** extract checkout JS from inline `index.html` into shared `js/checkout.js`, used by both surfaces

## Key decisions

| Topic | Decision |
|---|---|
| Category key | `appliances` |
| Display name | Appliances |
| Position in nav order | Between `acs` and `motor` |
| Gradient | `linear-gradient(135deg, #2a1a3a, #4a2a5e)` (purple/charcoal) |
| Icon | Fridge/oven SVG glyph (new `CATEGORY_ICONS.appliances`) |
| Fallback image | `appliance-generic.png` |
| Prices | Recorded **verbatim** as supplied (decimals preserved); operator will round later if desired |
| Currency | All prices XCG. Hisense `$` values are XCG (Curaçao convention), stored as plain numbers |
| Suffix field | Holds SKU code (same field that stores `"HSO"` etc. on existing products) |
| Featured Deals picks | TV-9370SF55WQL (55" QLED), FRD-9441AF (8L digital air fryer), RT16N6CDX (Hisense fridge) |
| `/appliances/` checkout | Single-product, same flow as main (Sentoo + EmailJS + WhatsApp) |
| Checkout JS | Extracted to `js/checkout.js`, loaded by both `index.html` and `/appliances/index.html` |
| Cache buster | Bump `products.json?v=` query param (existing pattern, e.g. commit `cc87972`) |

## Inventory to add

### `category: "appliances"` (NEW — 16 items)

**Coffee makers**
- `CM-6428` — Electric Coffee Maker 12 Cups — 135
- `CM-9236` — Coffee Maker, 12 Cups, w/Glass Jug — 135

**Air cooler**
- `CR-9001` — Air Cooler, 3L — 149

**Air fryers**
- `FRD-8101AFL` — Air Fryer 5.5L — 175
- `FRD-8864AF(B)` — Air Fryer Oven 8L, Black — 225
- `FRD-9441AF` — Air Fryer 8L, w/Digital Screen, Black — 225 *(featured)*
- `FRD-9473AF` — Air Fryer 10.5L, Digital Control — 249

**Microwaves**
- `MW-6647S` — Microwave Oven 20L/0.7CuFt Silver — 225
- `MW-8305B` — Microwave 20L/0.7CF, Black — 199
- `MW-8928` — Microwave 20L/0.7CF, White — 199

**Refrigerators (Hisense, placeholder lineup)**
- `RT1N320NMDA` — Hisense — 1278.12
- `RT16N6CDX` — Hisense — 1500.40 *(featured)*
- `RT14N6CDX` — Hisense — 1440.56
- `RS3P428NEDA2` — Hisense — 1393.54
- `RS19W6WSN` — Hisense — 2504.95
- `RB15N6FBX1` — Hisense — 1876.57

### `category: "acs"` (4 adds)

- `AA-8400SC12WN2` — AC Split 12000BTU (1+1) R410A — 499.6766775
- `AA-8402SC24WN2` — AC Split 24000BTU (1+1) R410A — 1090.692103
- `AA-9454SC18` — Air Conditioner Split 18000BTU — 779.0657875
- `AA-9456SI12` — AC Split 12000BTU Inverter (1+1) R410A, White, SEER 21 — 576.5086828

### `category: "motor"` (1 add)

- `MOT-9184G` — Gasoline Motorcycle, 150CC — 4500

### `category: "tvs"` (7 adds)

- `TV-9304SF65WKL` — 65" UHD Smart TV w/DVB-T2, Android (Whale OS), Frameless, w/Voice RC — 992.905914
- `TV-9308SF50WKL` — 50" UHD Smart TV w/DVB-T2, Android (Whale OS), Frameless, w/Voice RC — 646.893247
- `TV-9362SF32WHL` — 32" HD Smart TV w/DVB-T2, Tizen, Frameless, w/Voice RC — 249
- `TV-9370SF55WQL` — 55" QLED Smart TV w/DVB-T2, Tizen, Frameless, w/Voice RC — 812.377566 *(featured)*
- `TV-9371SF32WHL` — 32" HD Smart TV w/DVB-T2, Android (Whale OS), Frameless, w/Voice RC (1+1) — 249
- `TV-9412SF43WFN` — 43" FHD Smart TV w/DVB-T2, Android, Frameless, w/RC — 436.276841
- `TV-9480SF40WFN` — 40" FHD Smart TV w/DVB-T2, Android, Frameless, w/Voice RC — 361.056696

## Architecture

### Data model — `data/products.json`

Each new product follows the existing object shape — no schema change. Sample:

```json
{
  "name": "Air Fryer 5.5L",
  "suffix": "FRD-8101AFL",
  "price": 175,
  "category": "appliances",
  "featured": false,
  "image": "appliance-generic.png"
}
```

The `suffix` field holds the SKU. `image` defaults to the category-generic fallback; operator drops real photos into `img/products/` later and updates the filename in JSON.

### Category infrastructure — `index.html`

Five touchpoints, all in existing patterns:

1. **`CATEGORY_ICONS.appliances`** — new SVG (~line 1928 area)
2. **`CATEGORIES.appliances`** — `{ name: 'Appliances', icon, gradient: 'linear-gradient(135deg, #2a1a3a, #4a2a5e)' }` (~line 1934 area)
3. **`CATEGORY_ORDER`** — insert `'appliances'` between `'acs'` and `'motor'` (~line 1942)
4. **Fallback image map** — `appliances: 'appliance-generic.png'` (~line 2015 area)
5. **Nav links** — main nav exposes a *curated* set of categories (Deals, Apple, Samsung, TVs, Locations, Repair, Contact); add **Appliances** between TVs and Locations in both the desktop block (~line 1591) and the mobile menu (~line 1615): `<a href="#cat-appliances" data-cat="appliances">Appliances</a>`. Other categories (`laptops`, `acs`, `motor`) remain off the top nav as today; they are still reachable via the category cards section.

Plus:
- Update `<meta description>` and `<meta og:description>` to mention appliances
- Bump `products.json?v=` cache buster
- Move inline checkout JS (lines ~2060–2260) to `js/checkout.js`; replace inline block with `<script src="js/checkout.js"></script>`

### `js/checkout.js` — extracted shared module

Contains: `CHECKOUT_CONFIG`, `initEmailJS()`, `sentooLink()`, `openCheckout()`, modal close/open handlers, form submit handler. Exposes `window.openCheckout(name, price)` for catalog click handlers to call.

The `<div id="checkout-modal">` HTML stays inline in each page that uses it (main `index.html` and `/appliances/index.html`) — same DOM ids so the shared script binds cleanly.

### `/appliances/index.html` — store sub-page

Structure mirrors `/repair/`'s shell (header, hero, sectioned content, footer) with store behavior bolted in:

- **Header / nav** — same nav as main, "Appliances" link active
- **Hero** — purple/charcoal gradient matching the category theme; headline + sub-copy
- **Sectioned product grid** — five sections, each filtering `category === 'appliances'` and matching by name keywords:
  1. Refrigerators (`name` includes "Hisense" or model prefix `R[BST]`)
  2. Air Fryers (`name` includes "Air Fryer")
  3. Microwaves (`name` includes "Microwave")
  4. Coffee Makers (`name` includes "Coffee")
  5. Air Cooler (`name` includes "Air Cooler")
- **Product cards** — image, name, SKU, price, "Buy / Reserve" CTA → `openCheckout(name, price)`
- **Checkout modal** — same `<div id="checkout-modal">` markup as main
- **Footer** — same footer as main
- **Scripts** — `js/checkout.js` + EmailJS CDN + page-specific render code

### Assets

- `img/products/appliance-generic.png` — new fallback (purple/charcoal-toned generic)
- Real product photos arrive over time; operator updates `image` field per product when ready

### SEO / discovery

- Add `/appliances/` to `sitemap.xml`
- Optional: `_redirects` entry if any pretty URL is wanted

## Out of scope

- Multi-item shopping cart (existing flow is single-product; no change here)
- Real product photography (operator handles separately)
- Pricing rationalization / psychological rounding (operator will edit `products.json` later)
- Inventory/stock management
- Subdomain (`appliances.connectionscuracao.net`) — explicitly not chosen

## Risks / things to verify during implementation

- Checkout extraction must preserve **all** existing behavior on main `index.html`. Smoke-test main checkout end-to-end after the refactor before adding `/appliances/`.
- Cache busting: anyone who has `products.json` cached will see the old catalog. Bump version param; consider stronger cache headers if drift becomes a pattern.
- Hisense fridge SKUs use letters that overlap with TV SKU prefixes (`R...`); if filtering on `/appliances/` ever uses prefix matching, scope it to `category === 'appliances'` first.
