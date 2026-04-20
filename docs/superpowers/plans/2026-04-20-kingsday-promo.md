# Kingsday 2026 Promo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Kingsday Week (Apr 27 – May 2) promo across connectionscuracao.net and samsungcuracao.com, staged on a `kingsday` branch in each repo, ready to merge to `main` on launch day.

**Architecture:** Single-price model — Kingsday prices baked into `products.json`, new `kingsday: false` flag excludes motorcycles, renderers auto-add an orange "Kingsday" badge. New `/kingsday/` landing page reuses existing patterns. Currency migrated NAf → XCG site-wide (one-way). Full home hero takeover on samsung-curacao. All work lives on a `kingsday` branch until merge-to-main on launch day.

**Tech Stack:** Static HTML + vanilla JS, no build step. Python `http.server` for local preview. Git + GitHub + Netlify auto-deploy.

**Spec:** `docs/superpowers/specs/2026-04-20-kingsday-promo-design.md`

---

## Conventions for this plan

- **"Verify"** steps are manual — load the site in a browser (via `python3 -m http.server 8000`) and check the listed condition.
- **Commit messages** use imperative mood, scoped prefix (`catalog:`, `kingsday:`, `currency:`, `samsung:`).
- **Both repos share the `kingsday` branch name** for clarity.
- **No production deploys** until final merge-to-main task; everything lives on the branch.

---

### Task 1: Create `kingsday` branches in both repos

**Files:**
- Branch: `kingsday` on `connections-curacao`
- Branch: `kingsday` on `samsung-curacao`

- [ ] **Step 1: Confirm clean working tree in each repo**

```bash
cd /home/ganesh/connections-curacao && git status
cd /home/ganesh/samsung-curacao && git status
```

Expected: `nothing to commit, working tree clean` in both. If not clean, stash or commit unrelated work first.

- [ ] **Step 2: Create and check out the branch in connections-curacao**

```bash
cd /home/ganesh/connections-curacao
git checkout main
git pull origin main
git checkout -b kingsday
```

- [ ] **Step 3: Create and check out the branch in samsung-curacao**

```bash
cd /home/ganesh/samsung-curacao
git checkout main
git pull origin main
git checkout -b kingsday
```

- [ ] **Step 4: Verify branches**

```bash
cd /home/ganesh/connections-curacao && git branch --show-current
cd /home/ganesh/samsung-curacao && git branch --show-current
```

Expected: `kingsday` printed twice.

---

### Task 2: Update `products.json` — Apple category prices + new iPhone 15 variant + MacBook Neo

**Files:**
- Modify: `/home/ganesh/connections-curacao/data/products.json`

Currency-unit change: this task drops "NAf" thinking and writes numbers that represent XCG amounts. The JSON itself has no currency label — the renderer prepends it.

- [ ] **Step 1: Update iPhone prices and add new iPhone 15 (non-HSO) entry**

Open `data/products.json`. Apply these edits in order:

- iPhone 12 HSO: `"price": 599` → `"price": 549`
- iPhone 13 HSO: `"price": 749` → `"price": 699`
- iPhone 14 HSO: `"price": 849` → `"price": 775`
- iPhone 15 HSO: `"price": 1199` → `"price": 999`
- iPhone 15 Pro Max HSO: `"price": 1590` → `"price": 1499`
- iPhone 16: `"price": 1699` → `"price": 1599`
- iPhone 16 Pro Max HSO: `"price": 1990` → `"price": 1849`
- iPhone 17: `"price": 2100` → `"price": 1999`
- iPhone 17 Pro: `"price": 2890` → `"price": 2649`
- iPhone 17 Pro Max: `"price": 3030` → `"price": 2999`

After the iPhone 15 HSO entry (`image: iphone-15-model.jpg`), INSERT a new entry for the non-HSO iPhone 15:

```json
{
  "name": "iPhone 15",
  "suffix": "",
  "price": 1499,
  "category": "apple",
  "featured": true,
  "image": "iphone-15-model.jpg"
},
```

- [ ] **Step 2: Update iPad price and add MacBook Neo entry**

- iPad 11th 128GB: `"price": 790` → `"price": 739`

After the iPad 11th entry, INSERT:

```json
{
  "name": "MacBook Neo 256GB/8GB",
  "suffix": "",
  "price": 1499,
  "category": "apple",
  "featured": true,
  "image": "macbook-generic.png"
},
```

- [ ] **Step 3: Validate JSON**

```bash
cd /home/ganesh/connections-curacao
python3 -m json.tool data/products.json > /dev/null && echo "JSON valid"
```

Expected: `JSON valid`. If not, fix commas.

- [ ] **Step 4: Commit**

```bash
cd /home/ganesh/connections-curacao
git add data/products.json
git commit -m "catalog: apple kingsday prices + iphone 15 + macbook neo"
```

---

### Task 3: Update `products.json` — Samsung phones + new Samsung entries + M04

**Files:**
- Modify: `/home/ganesh/connections-curacao/data/products.json`

- [ ] **Step 1: Update existing Samsung phone prices**

- Galaxy A07: `"price": 199` → `"price": 189`
- Galaxy A16: `"price": 289` → `"price": 299`
- Galaxy A17: `"price": 349` → `"price": 339`
- Galaxy A26: `"price": 399` → `"price": 425`
- Galaxy A36: `"price": 575` → `"price": 549`
- Galaxy A37 5G: `"price": 0` → `"price": 789` (leave `landingPage` field in place — the renderer still honors it for `View Details` CTAs)
- Galaxy A56: `"price": 675` → `"price": 649`
- Galaxy A57 5G: `"price": 0` → `"price": 969` (leave `landingPage` in place)
- Galaxy S25 Ultra: `"price": 2190` → `"price": 1989`

- [ ] **Step 2: Add Samsung M04 after Galaxy A07**

```json
{
  "name": "Samsung M04 128GB",
  "suffix": "",
  "price": 250,
  "category": "samsung",
  "featured": false,
  "image": "samsung-m04-model.png"
},
```

- [ ] **Step 3: Update Galaxy S25 FE entry (as 128GB variant) and insert 256GB variant**

Rename existing `"Galaxy S25 FE"` → `"Galaxy S25 FE 128GB"` and change price 1290 → 1099. Keep `image: galaxy-s25-fe-model.jpg`, `featured: true`.

Immediately after the S25 FE 128GB entry, INSERT:

```json
{
  "name": "Galaxy S25 FE 256GB",
  "suffix": "",
  "price": 1249,
  "category": "samsung",
  "featured": false,
  "image": "galaxy-s25-fe-model.jpg"
},
```

- [ ] **Step 4: Add Galaxy S26 Ultra entries after Galaxy S25 Ultra**

```json
{
  "name": "Galaxy S26 Ultra",
  "suffix": "",
  "price": 2690,
  "category": "samsung",
  "featured": true,
  "image": "galaxy-s26-ultra-model.png"
},
{
  "name": "Galaxy S26 Ultra 512GB",
  "suffix": "",
  "price": 2890,
  "category": "samsung",
  "featured": false,
  "image": "galaxy-s26-ultra-model.png"
},
```

- [ ] **Step 5: Add Samsung tablets — after Galaxy S25 Ultra group (or wherever fits samsung category order)**

Place these at the end of the samsung group (after S26 Ultra entries):

```json
{
  "name": "Galaxy Tab A9+ WiFi",
  "suffix": "",
  "price": 399,
  "category": "samsung",
  "featured": false,
  "subcategory": "tablet",
  "image": "galaxy-tab-generic.png"
},
{
  "name": "Galaxy Tab A9 5G+",
  "suffix": "",
  "price": 499,
  "category": "samsung",
  "featured": false,
  "subcategory": "tablet",
  "image": "galaxy-tab-generic.png"
},
{
  "name": "Galaxy Tab A11",
  "suffix": "",
  "price": 279,
  "category": "samsung",
  "featured": false,
  "subcategory": "tablet",
  "image": "galaxy-tab-generic.png"
},
{
  "name": "Galaxy Tab A11+",
  "suffix": "",
  "price": 475,
  "category": "samsung",
  "featured": false,
  "subcategory": "tablet",
  "image": "galaxy-tab-generic.png"
},
```

- [ ] **Step 6: Add `subcategory: "tablet"` to the iPad 11th entry**

Locate the iPad 11th 128GB entry. Add the new field:

```json
"subcategory": "tablet",
```

(Place it between `featured` and `image` for consistency.)

- [ ] **Step 7: Validate JSON**

```bash
cd /home/ganesh/connections-curacao
python3 -m json.tool data/products.json > /dev/null && echo "JSON valid"
```

Expected: `JSON valid`.

- [ ] **Step 8: Commit**

```bash
cd /home/ganesh/connections-curacao
git add data/products.json
git commit -m "catalog: samsung kingsday prices + tablets + m04 + s26 ultra"
```

---

### Task 4: Update `products.json` — laptops and motorcycle exclusion

**Files:**
- Modify: `/home/ganesh/connections-curacao/data/products.json`

- [ ] **Step 1: Rewrite the Lenovo Laptop entry as Lenovo IdeaPad 1i**

Replace:

```json
{
  "name": "Lenovo Laptop",
  "suffix": "",
  "price": 399,
  "category": "laptops",
  "featured": true,
  "image": "laptop-generic.png"
},
```

With:

```json
{
  "name": "Lenovo IdeaPad 1i",
  "suffix": "",
  "price": 499,
  "category": "laptops",
  "featured": true,
  "image": "laptop-generic.png",
  "spec": "Celeron N4500 · 4GB · 128GB eMMC · 14\" 1920×1080 · W11 · Gray"
},
```

- [ ] **Step 2: Update HP Laptop entry with spec and new price**

Replace the existing HP Laptop block with:

```json
{
  "name": "HP Laptop",
  "suffix": "",
  "price": 499,
  "category": "laptops",
  "featured": true,
  "image": "laptop-generic.png",
  "spec": "Intel N150 · 4GB · 128GB UFS · 14\" 1366×768 · W11 · Sky Blue"
},
```

- [ ] **Step 3: Insert new Lenovo IdeaPad Slim 3i after the Lenovo IdeaPad 1i entry**

```json
{
  "name": "Lenovo IdeaPad Slim 3i",
  "suffix": "",
  "price": 549,
  "category": "laptops",
  "featured": true,
  "image": "laptop-generic.png",
  "spec": "Intel N100 · 4GB · 128GB SSD · 15.6\" 1920×1080 · Arctic Gray"
},
```

- [ ] **Step 4: Add `kingsday: false` to both motorcycle entries**

For both `150cc Motorcycle (Blue)` and `150cc Motorcycle (Black)`, add:

```json
"kingsday": false,
```

(Place between `featured` and `image`.)

- [ ] **Step 5: Validate JSON and commit**

```bash
cd /home/ganesh/connections-curacao
python3 -m json.tool data/products.json > /dev/null && echo "JSON valid"
git add data/products.json
git commit -m "catalog: laptop kingsday prices + specs + motorcycle excluded"
```

Expected: `JSON valid`.

---

### Task 5: Add placeholder image stubs for new products

**Files:**
- Create: `/home/ganesh/connections-curacao/img/products/samsung-m04-model.png` (copy of existing `iphone-generic.png`)
- Create: `/home/ganesh/connections-curacao/img/products/galaxy-s26-ultra-model.png` (copy of existing `galaxy-s25-ultra-model.png`)
- Create: `/home/ganesh/connections-curacao/img/products/galaxy-tab-generic.png` (copy of `iphone-generic.png`)
- Create: `/home/ganesh/connections-curacao/img/products/macbook-generic.png` (copy of `laptop-generic.png`)

These are stand-ins. Real product photos will replace them later without other changes.

- [ ] **Step 1: Copy existing generics as placeholders for new product images**

```bash
cd /home/ganesh/connections-curacao/img/products
cp iphone-generic.png samsung-m04-model.png
cp galaxy-s25-ultra-model.png galaxy-s26-ultra-model.png
cp iphone-generic.png galaxy-tab-generic.png
cp laptop-generic.png macbook-generic.png
```

- [ ] **Step 2: Verify files exist**

```bash
ls -la samsung-m04-model.png galaxy-s26-ultra-model.png galaxy-tab-generic.png macbook-generic.png
```

Expected: 4 files listed, each non-zero size.

- [ ] **Step 3: Commit**

```bash
cd /home/ganesh/connections-curacao
git add img/products/samsung-m04-model.png img/products/galaxy-s26-ultra-model.png img/products/galaxy-tab-generic.png img/products/macbook-generic.png
git commit -m "catalog: placeholder images for new kingsday products"
```

---

### Task 6: Currency migration — connections-curacao `index.html` (NAf → XCG)

**Files:**
- Modify: `/home/ganesh/connections-curacao/index.html`

The file has 23 `NAf` occurrences (formatPrice helper, checkout placeholders, radio labels, inline totals).

- [ ] **Step 1: Global replace `NAf` → `XCG` inside `index.html` only**

```bash
cd /home/ganesh/connections-curacao
sed -i 's/NAf /XCG /g' index.html
```

- [ ] **Step 2: Verify no `NAf` remains in `index.html`**

```bash
grep -c "NAf" index.html
```

Expected: `0`.

- [ ] **Step 3: Start local preview and manually verify**

```bash
cd /home/ganesh/connections-curacao
python3 -m http.server 8000
```

Open `http://localhost:8000/` in a browser (or via SSH tunnel). Verify:
- Product cards show "XCG 999" etc. instead of "NAf 999"
- Click "Checkout & Pay" on any product — the modal shows "XCG 0"-styled lines and the submit button says "Pay XCG … via Sentoo"
- Radio labels show "+XCG 100 downpayment" and "+XCG 35" for delivery

Stop the server (Ctrl-C) when done.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "currency: migrate NAf to XCG on home page"
```

---

### Task 7: Currency migration — connections-curacao sub-pages (NAf → XCG)

**Files:**
- Modify: `/home/ganesh/connections-curacao/iphone14/index.html` (14 occurrences)
- Modify: `/home/ganesh/connections-curacao/iphonefold/index.html` (2)
- Modify: `/home/ganesh/connections-curacao/macbookneo/index.html` (4)
- Modify: `/home/ganesh/connections-curacao/s25plus/index.html` (14)
- Modify: `/home/ganesh/connections-curacao/s26/index.html` (11)

- [ ] **Step 1: Batch replace across sub-pages**

```bash
cd /home/ganesh/connections-curacao
for f in iphone14 iphonefold macbookneo s25plus s26; do
  sed -i 's/NAf /XCG /g' "$f/index.html"
done
```

- [ ] **Step 2: Verify no `NAf` remains across repo**

```bash
grep -rn "NAf" --include="*.html" /home/ganesh/connections-curacao
```

Expected: no output (command exits with nonzero, which is fine — empty result).

- [ ] **Step 3: Spot-check one page**

```bash
cd /home/ganesh/connections-curacao
python3 -m http.server 8000
```

Open `http://localhost:8000/s26/` in browser. Verify displayed prices show `XCG`, not `NAf`. Stop server.

- [ ] **Step 4: Commit**

```bash
git add iphone14/index.html iphonefold/index.html macbookneo/index.html s25plus/index.html s26/index.html
git commit -m "currency: migrate NAf to XCG on landing sub-pages"
```

---

### Task 8: Add Kingsday badge to catalog renderer (connections-curacao home)

**Files:**
- Modify: `/home/ganesh/connections-curacao/index.html` — CSS additions + three render functions (`renderCategories`, `renderDeals`, `renderProducts`)

The three renderers live around lines 2048, 2290, 2352. Each builds HTML for a tile. Add the badge to tiles where `p.kingsday !== false`.

- [ ] **Step 1: Add Kingsday badge CSS**

In the `<style>` block of `index.html`, find the section containing `.badge-hso` rules (search for `.badge-hso`) and ADD right after it:

```css
.badge-kingsday {
  display: inline-block;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent-orange);
  background: rgba(255, 102, 0, 0.12);
  border: 1px solid rgba(255, 102, 0, 0.4);
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  margin-left: 0.4rem;
  vertical-align: middle;
}
.deal-card, .product-card { position: relative; }
.deal-card .badge-kingsday-corner,
.product-card .badge-kingsday-corner {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent-orange);
  background: rgba(255, 102, 0, 0.12);
  border: 1px solid rgba(255, 102, 0, 0.4);
  padding: 0.22rem 0.5rem;
  border-radius: 999px;
  z-index: 2;
}
```

- [ ] **Step 2: Inject Kingsday badge in `renderDeals()`**

In `renderDeals()`, find the template literal starting with `` `<div class="deal-card">`` (line ~2315). Change the opening of the template so it conditionally includes a corner badge:

REPLACE:

```js
        html += `
          <div class="deal-card">
```

WITH:

```js
        const kingsdayBadge = p.kingsday !== false ? `<span class="badge-kingsday-corner">Kingsday</span>` : '';
        html += `
          <div class="deal-card">
            ${kingsdayBadge}
```

- [ ] **Step 3: Inject Kingsday badge in `renderProducts()`**

Same pattern. REPLACE:

```js
          html += `
            <div class="product-card">
```

WITH:

```js
          const kingsdayBadge = p.kingsday !== false ? `<span class="badge-kingsday-corner">Kingsday</span>` : '';
          html += `
            <div class="product-card">
              ${kingsdayBadge}
```

- [ ] **Step 4: Leave `renderCategories()` unchanged**

Category tiles show counts, not products. No badge needed.

- [ ] **Step 5: Verify in browser**

```bash
cd /home/ganesh/connections-curacao
python3 -m http.server 8000
```

Open `http://localhost:8000/`. Verify:
- Every product card in the main grid has a small orange "Kingsday" pill in the top-right corner.
- Every featured deal card in the carousel has the pill.
- Motorcycles (150cc Blue and Black cards) do NOT have the pill.

Stop server.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "kingsday: add orange badge to catalog tiles"
```

---

### Task 9: Replace home banner with Kingsday banner (connections-curacao)

**Files:**
- Modify: `/home/ganesh/connections-curacao/index.html` — launch-banner block (styles ~lines 1547–1588, markup ~lines 1659–1672)

- [ ] **Step 1: Replace the `.launch-banner` CSS block**

In the CSS, find the comment `/* ---- Galaxy A-series launch banner ---- */` and REPLACE everything from that comment through the `@media` block that ends before the next unrelated CSS rule (the block contains `.launch-banner`, `.launch-banner-text`, `.launch-banner-cta`, `.launch-banner-close`, and a media query). Swap it for a Kingsday-themed banner:

```css
/* ---- Kingsday Week banner ---- */
.kingsday-banner {
  position: fixed;
  left: 50%;
  bottom: 1rem;
  transform: translateX(-50%);
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  background: linear-gradient(135deg, rgba(10,10,10,0.96), rgba(26,26,46,0.96));
  border: 1px solid rgba(255,102,0,0.45);
  border-radius: 999px;
  padding: 0.75rem 2.8rem 0.75rem 1.2rem;
  max-width: min(92vw, 640px);
  box-shadow: 0 10px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,102,0,0.1);
  backdrop-filter: blur(12px);
}
.kingsday-banner[hidden] { display: none; }
.kingsday-banner-text strong {
  color: var(--accent-orange);
  font-weight: 800;
  font-size: 0.95rem;
  letter-spacing: 0.02em;
}
.kingsday-banner-text p {
  margin: 0.2rem 0 0;
  color: rgba(255,255,255,0.7);
  font-size: 0.85rem;
}
.kingsday-banner-cta {
  background: var(--accent-orange);
  color: #0a0a0a;
  padding: 0.55rem 1rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
  transition: transform 180ms ease;
}
.kingsday-banner-cta:hover { transform: translateY(-1px); }
.kingsday-banner-close {
  position: absolute;
  right: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  font-size: 1rem;
}
.kingsday-banner-close:hover { color: #fff; }
@media (max-width: 640px) {
  .kingsday-banner { padding: 0.7rem 2.6rem 0.7rem 0.9rem; gap: 0.6rem; }
  .kingsday-banner-text strong { font-size: 0.85rem; }
  .kingsday-banner-text p { font-size: 0.78rem; }
  .kingsday-banner-cta { font-size: 0.78rem; padding: 0.45rem 0.8rem; }
}
```

- [ ] **Step 2: Replace the banner markup + dismissal script**

Find the `<!-- Galaxy A-series launch banner -->` comment and the `<aside id="launch-banner" ...>` block plus the `<script>` that reads `launch-banner-galaxy-a-dismissed`. REPLACE the whole block with:

```html
<!-- Kingsday Week banner -->
<aside id="kingsday-banner" class="kingsday-banner" role="region" aria-label="Kingsday Week promo">
  <div class="kingsday-banner-text">
    <strong>👑 Kingsday Week · Apr 27 – May 2</strong>
    <p>Royal deals across the catalog.</p>
  </div>
  <a class="kingsday-banner-cta" href="/kingsday/">Shop deals →</a>
  <button class="kingsday-banner-close" type="button" aria-label="Dismiss banner" onclick="this.parentElement.hidden=true;try{localStorage.setItem('kingsday-2026-dismissed','1')}catch(e){}">✕</button>
</aside>
<script>
  if (localStorage.getItem('kingsday-2026-dismissed') === '1') {
    document.getElementById('kingsday-banner').hidden = true;
  }
</script>
```

- [ ] **Step 3: Verify in browser**

```bash
cd /home/ganesh/connections-curacao
python3 -m http.server 8000
```

Open `http://localhost:8000/`. Verify:
- Dark-pill banner with "👑 Kingsday Week · Apr 27 – May 2" appears at the bottom-center.
- Orange "Shop deals →" CTA points to `/kingsday/`.
- Click ✕ to dismiss — banner disappears and stays dismissed on reload (check devtools localStorage for `kingsday-2026-dismissed = "1"`).
- Clear the localStorage key and reload — banner reappears.

Stop server.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "kingsday: swap launch banner for kingsday banner"
```

---

### Task 10: Build `/kingsday/` landing page (connections-curacao)

**Files:**
- Create: `/home/ganesh/connections-curacao/kingsday/index.html`

The landing page is self-contained: loads `../data/products.json`, renders a hero + 6 category sections (Apple / Samsung phones / Tablets / Laptops / TVs / ACs) + store panel + Sentoo checkout modal (reused pattern). Motorcycles excluded. Tablets are a derived section: iPad + any entry where `subcategory === "tablet"`.

- [ ] **Step 1: Create the directory**

```bash
mkdir -p /home/ganesh/connections-curacao/kingsday
```

- [ ] **Step 2: Write the landing page**

Create `/home/ganesh/connections-curacao/kingsday/index.html` with this content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kingsday Week 2026 — Connections Curaçao</title>
  <meta name="description" content="Kingsday Week Apr 27 – May 2. Royal deals on iPhone, Samsung Galaxy, iPad, laptops, TVs and more at Connections Curaçao.">
  <meta property="og:title" content="Kingsday Week 2026 — Connections Curaçao">
  <meta property="og:description" content="Royal deals on the full catalog. April 27 – May 2.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://connectionscuracao.net/kingsday/">
  <meta name="theme-color" content="#FF6600">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%23FF6600'/><text x='50' y='68' font-size='60' text-anchor='middle' fill='white'>👑</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Outfit:wght@500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0a0a0a;
      --surface: rgba(255,255,255,0.05);
      --surface-border: rgba(255,255,255,0.1);
      --accent: #FF6600;
      --accent-glow: rgba(255,102,0,0.3);
      --text: #fff;
      --text-muted: rgba(255,255,255,0.6);
      --whatsapp: #25D366;
      --radius: 20px;
      --radius-sm: 12px;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'DM Sans', system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      line-height: 1.6;
    }
    a { color: inherit; text-decoration: none; }
    img { max-width: 100%; display: block; }
    button { font: inherit; cursor: pointer; border: none; background: none; color: inherit; }

    .shell { max-width: 1200px; margin: 0 auto; padding: 0 1.2rem; }

    /* Topbar */
    .topbar {
      position: sticky; top: 0; z-index: 40;
      background: rgba(10,10,10,0.85); backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--surface-border);
    }
    .topbar-row { display: flex; justify-content: space-between; align-items: center; padding: 0.9rem 0; }
    .brand { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 1.05rem; letter-spacing: -0.01em; }
    .brand span.accent { color: var(--accent); }
    .top-cta { font-size: 0.85rem; padding: 0.55rem 1rem; border-radius: 999px; border: 1px solid var(--surface-border); }
    .top-cta:hover { border-color: var(--accent); color: var(--accent); }

    /* Hero */
    .hero {
      padding: 4rem 0 3rem; text-align: center; position: relative;
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
      border-bottom: 3px solid var(--accent);
    }
    .hero::before {
      content: ""; position: absolute; inset: 0; pointer-events: none;
      background: radial-gradient(60% 60% at 50% 30%, rgba(255,102,0,0.15), transparent 70%);
    }
    .hero-tag {
      display: inline-block; font-size: 0.78rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;
      color: var(--accent);
      background: rgba(255,102,0,0.12);
      padding: 0.35rem 0.9rem; border-radius: 999px; border: 1px solid rgba(255,102,0,0.45);
    }
    .hero h1 {
      font-family: 'Outfit', sans-serif; font-weight: 900;
      font-size: clamp(2.4rem, 6vw, 4.2rem); margin: 1rem 0 0.5rem;
      letter-spacing: -0.02em; line-height: 1;
    }
    .hero h1 .accent { color: var(--accent); }
    .hero p.sub { color: var(--text-muted); font-size: 1.05rem; max-width: 52ch; margin: 0 auto 1.6rem; }
    .hero-ctas { display: flex; gap: 0.7rem; justify-content: center; flex-wrap: wrap; }
    .btn {
      display: inline-block; padding: 0.85rem 1.4rem; border-radius: 999px;
      font-weight: 700; font-size: 0.95rem; transition: transform 180ms ease;
    }
    .btn-primary { background: var(--accent); color: #0a0a0a; font-weight: 800; }
    .btn-primary:hover { transform: translateY(-2px); }
    .btn-ghost { border: 1px solid rgba(255,255,255,0.2); color: #fff; }
    .btn-whatsapp { background: var(--whatsapp); color: #fff; font-weight: 700; }

    /* Section */
    section { padding: 3rem 0; }
    .section-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 1.4rem; }
    .section-title { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: clamp(1.4rem, 2.5vw, 1.9rem); letter-spacing: -0.01em; }
    .section-title .accent { color: var(--accent); }

    /* Product grid */
    .grid {
      display: grid; gap: 1rem;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    }
    .card {
      position: relative;
      background: linear-gradient(165deg, rgba(18,18,30,0.9), rgba(12,12,18,0.9));
      border: 1px solid var(--surface-border);
      border-radius: var(--radius-sm); padding: 1rem;
      display: flex; flex-direction: column; gap: 0.5rem;
      transition: border-color 160ms ease, transform 160ms ease;
    }
    .card:hover { border-color: rgba(255,102,0,0.4); transform: translateY(-3px); }
    .card-badge {
      position: absolute; top: 0.6rem; right: 0.6rem;
      font-size: 0.6rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--accent); background: rgba(255,102,0,0.12);
      border: 1px solid rgba(255,102,0,0.4);
      padding: 0.22rem 0.5rem; border-radius: 999px;
    }
    .card-img { height: 130px; display: grid; place-items: center; }
    .card-img img { max-height: 100%; object-fit: contain; }
    .card-name { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 0.95rem; letter-spacing: -0.01em; }
    .hso { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.1em; padding: 0.12rem 0.4rem; border-radius: 4px; background: rgba(255,255,255,0.1); color: var(--text-muted); margin-left: 0.3rem; vertical-align: middle; }
    .card-spec { font-size: 0.75rem; color: var(--text-muted); line-height: 1.4; }
    .card-price { font-weight: 700; font-size: 0.95rem; margin-top: auto; }
    .card-cta { font-size: 0.82rem; padding: 0.6rem 0.9rem; border-radius: 999px; background: var(--whatsapp); color: #fff; text-align: center; font-weight: 700; }

    /* Store panel */
    .store-panel {
      margin-top: 1rem;
      border-radius: var(--radius);
      border: 1px solid var(--surface-border);
      background: linear-gradient(165deg, rgba(18,18,30,0.9), rgba(12,12,18,0.9));
      padding: 1.8rem;
      display: grid; grid-template-columns: 1fr auto; gap: 1.5rem; align-items: start;
    }
    .store-panel h3 { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 1.15rem; margin-bottom: 0.8rem; }
    .store-list { list-style: none; display: grid; gap: 0.55rem; color: var(--text-muted); font-size: 0.92rem; }
    .store-list strong { color: #fff; }
    .store-cta { display: flex; flex-direction: column; gap: 0.6rem; align-self: center; }
    .store-cta .btn { text-align: center; min-width: 220px; }

    /* Checkout modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.7);
      display: none; align-items: center; justify-content: center; z-index: 100; padding: 1rem;
    }
    .modal-overlay.open { display: flex; }
    .modal {
      background: #111; border: 1px solid var(--surface-border);
      border-radius: var(--radius); padding: 1.8rem; max-width: 440px; width: 100%;
      max-height: 90vh; overflow-y: auto;
    }
    .modal h2 { font-family: 'Outfit', sans-serif; font-weight: 800; margin-bottom: 1rem; }
    .checkout-line { display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid var(--surface-border); font-size: 0.9rem; }
    .checkout-line.total { border: none; font-size: 1.05rem; margin-top: 0.5rem; font-weight: 700; }
    .checkout-line strong { font-weight: 700; }
    .checkout-row { margin-top: 1rem; }
    .checkout-row label.lbl { display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.4rem; }
    .checkout-radio { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0; font-size: 0.9rem; }
    .checkout-submit { display: block; width: 100%; background: var(--whatsapp); color: #fff; padding: 0.85rem; border-radius: 999px; font-weight: 800; margin-top: 1.2rem; }
    .checkout-close { position: absolute; top: 1rem; right: 1rem; background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.4rem; }

    /* Footer */
    footer { padding: 2rem 0 3rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; border-top: 1px solid var(--surface-border); }

    @media (max-width: 720px) {
      .store-panel { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

  <header class="topbar">
    <div class="shell topbar-row">
      <a class="brand" href="/">Connections <span class="accent">Curaçao</span></a>
      <a class="top-cta" href="https://wa.me/59996782619" target="_blank" rel="noopener">WhatsApp</a>
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="shell">
        <span class="hero-tag">April 27 – May 2</span>
        <h1><span class="accent">Kingsday</span> Week</h1>
        <p class="sub">Royal deals across the catalog. iPhone, Galaxy, iPad, laptops, TVs and more — at Kingsday prices.</p>
        <div class="hero-ctas">
          <a class="btn btn-primary" href="#cat-apple">Shop deals</a>
          <a class="btn btn-whatsapp" href="https://wa.me/59996782619?text=Hi%2C%20I%27m%20interested%20in%20your%20Kingsday%20deals." target="_blank" rel="noopener">Ask via WhatsApp</a>
        </div>
      </div>
    </section>

    <section>
      <div class="shell">
        <div class="section-head">
          <h2 class="section-title" id="cat-apple"><span class="accent">Apple</span> · Kingsday</h2>
        </div>
        <div id="grid-apple" class="grid"></div>
      </div>
    </section>

    <section>
      <div class="shell">
        <div class="section-head">
          <h2 class="section-title" id="cat-samsung"><span class="accent">Samsung</span> · Kingsday</h2>
        </div>
        <div id="grid-samsung" class="grid"></div>
      </div>
    </section>

    <section>
      <div class="shell">
        <div class="section-head">
          <h2 class="section-title" id="cat-tablets"><span class="accent">Tablets</span> · Kingsday</h2>
        </div>
        <div id="grid-tablets" class="grid"></div>
      </div>
    </section>

    <section>
      <div class="shell">
        <div class="section-head">
          <h2 class="section-title" id="cat-laptops"><span class="accent">Laptops</span> · Kingsday</h2>
        </div>
        <div id="grid-laptops" class="grid"></div>
      </div>
    </section>

    <section>
      <div class="shell">
        <div class="section-head">
          <h2 class="section-title" id="cat-tvs"><span class="accent">TVs</span> · Kingsday</h2>
        </div>
        <div id="grid-tvs" class="grid"></div>
      </div>
    </section>

    <section>
      <div class="shell">
        <div class="section-head">
          <h2 class="section-title" id="cat-acs"><span class="accent">Air Conditioning</span> · Kingsday</h2>
        </div>
        <div id="grid-acs" class="grid"></div>
      </div>
    </section>

    <section>
      <div class="shell">
        <div class="store-panel">
          <div>
            <h3>Visit us this Kingsday</h3>
            <ul class="store-list">
              <li>📍 <strong>Connections Punda</strong> · Ruyterkade 28, Willemstad</li>
              <li>📍 <strong>Connections Otrobanda</strong> · Bredestraat 12, Willemstad</li>
              <li>🕔 Mon–Sat 9:30–18:00</li>
              <li>💬 WhatsApp +599 9678 2619</li>
            </ul>
          </div>
          <div class="store-cta">
            <a class="btn btn-whatsapp" href="https://wa.me/59996782619?text=Hi%2C%20I%27m%20interested%20in%20your%20Kingsday%20deals." target="_blank" rel="noopener">Ask via WhatsApp</a>
            <a class="btn btn-ghost" href="/">Back to full catalog</a>
          </div>
        </div>
      </div>
    </section>
  </main>

  <!-- Sentoo checkout modal -->
  <div class="modal-overlay" id="checkout-overlay">
    <div class="modal" style="position: relative;">
      <button class="checkout-close" aria-label="Close" onclick="closeCheckout()">&times;</button>
      <h2 id="checkout-title">Checkout</h2>
      <div class="checkout-line"><span>Product Price</span><strong id="checkout-base">XCG 0</strong></div>
      <div class="checkout-line"><span>Pay Now</span><strong id="checkout-pay-now">XCG 0</strong></div>
      <div class="checkout-line"><span>Delivery Fee</span><strong id="checkout-fee">XCG 0</strong></div>
      <div class="checkout-line total"><span>Total</span><strong id="checkout-total">XCG 0</strong></div>

      <div class="checkout-row">
        <span class="lbl">Payment</span>
        <label class="checkout-radio"><input type="radio" name="checkout-payment" value="full" checked> Pay full</label>
        <label class="checkout-radio"><input type="radio" name="checkout-payment" value="reserve"> Reserve (+XCG 100 downpayment)</label>
      </div>
      <div class="checkout-row">
        <span class="lbl">Delivery</span>
        <label class="checkout-radio"><input type="radio" name="checkout-delivery" value="pickup" checked> Pickup in store</label>
        <label class="checkout-radio"><input type="radio" name="checkout-delivery" value="delivery"> Delivery (+XCG 35)</label>
      </div>

      <button type="button" class="checkout-submit" id="checkout-submit" onclick="submitCheckout()">Open Sentoo + WhatsApp</button>
    </div>
  </div>

  <footer>
    <div class="shell">
      Connections Curaçao · Kingsday Week Apr 27 – May 2, 2026 · Punda · Otrobanda
    </div>
  </footer>

  <script>
    const CHECKOUT_CONFIG = {
      sentooBaseUrl: 'https://sentoo.pro/connections-curacao',
      whatsappNumber: '59996782619',
      reserveDown: 100,
      deliveryFee: 35
    };

    const WA_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px"><path d="M12 2a10 10 0 00-8.6 15L2 22l5.1-1.3A10 10 0 1012 2zm5.9 14.2c-.3.7-1.4 1.3-1.9 1.4-.5.1-1 .2-3.2-.7-2.7-1.1-4.5-3.9-4.6-4.1-.1-.1-1.1-1.4-1.1-2.7 0-1.3.7-1.9.9-2.2.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5.2.5.7 1.9.8 2 .1.2.1.3 0 .5-.1.2-.1.3-.3.5-.2.2-.3.3-.5.5-.1.2-.3.4-.1.7.1.4.8 1.3 1.7 2.1 1.1 1 2.1 1.3 2.4 1.4.3.1.5.1.7-.1.2-.2.8-.9 1-1.2.2-.3.4-.2.7-.1.3.1 1.7.8 2 1 .3.1.5.2.5.3.1.1.1.7-.2 1.4z"/></svg>`;

    function formatPrice(price) { return 'XCG ' + price.toLocaleString('en-US'); }
    function sentooLink(amount) { return `${CHECKOUT_CONFIG.sentooBaseUrl}/${Math.round(amount * 100)}`; }
    function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

    let activeCheckout = null;

    function openCheckout(name, price) {
      activeCheckout = { name, price };
      document.getElementById('checkout-title').textContent = name;
      updateCheckoutTotals();
      document.getElementById('checkout-overlay').classList.add('open');
    }
    function closeCheckout() {
      document.getElementById('checkout-overlay').classList.remove('open');
      activeCheckout = null;
    }
    function getCheckoutMode() {
      const payment = document.querySelector('input[name="checkout-payment"]:checked').value;
      const delivery = document.querySelector('input[name="checkout-delivery"]:checked').value;
      return { payment, delivery };
    }
    function updateCheckoutTotals() {
      if (!activeCheckout) return;
      const { payment, delivery } = getCheckoutMode();
      const base = activeCheckout.price;
      const fee = delivery === 'delivery' ? CHECKOUT_CONFIG.deliveryFee : 0;
      const payNow = payment === 'reserve' ? CHECKOUT_CONFIG.reserveDown : base;
      const total = payNow + fee;
      document.getElementById('checkout-base').textContent = formatPrice(base);
      document.getElementById('checkout-pay-now').textContent = formatPrice(payNow);
      document.getElementById('checkout-fee').textContent = formatPrice(fee);
      document.getElementById('checkout-total').textContent = formatPrice(total);
      document.getElementById('checkout-submit').textContent = payment === 'reserve'
        ? `Reserve for ${formatPrice(total)}`
        : `Pay ${formatPrice(total)} via Sentoo`;
    }
    function submitCheckout() {
      if (!activeCheckout) return;
      const { payment, delivery } = getCheckoutMode();
      const base = activeCheckout.price;
      const fee = delivery === 'delivery' ? CHECKOUT_CONFIG.deliveryFee : 0;
      const payNow = payment === 'reserve' ? CHECKOUT_CONFIG.reserveDown : base;
      const total = payNow + fee;

      const lines = [
        `Hi, I want to order ${activeCheckout.name}.`,
        `Product price: ${formatPrice(base)}`,
        `Payment: ${payment === 'reserve' ? 'Reserve (down ' + formatPrice(payNow) + ')' : 'Pay full'}`,
        `Delivery: ${delivery === 'delivery' ? 'Delivery (+' + formatPrice(fee) + ')' : 'Pickup'}`,
        `Total: ${formatPrice(total)}`,
        '',
        'Payment: Sentoo'
      ];
      const waUrl = `https://wa.me/${CHECKOUT_CONFIG.whatsappNumber}?text=${encodeURIComponent(lines.join('\n'))}`;
      const payUrl = sentooLink(total);
      window.open(payUrl, '_blank', 'noopener');
      window.open(waUrl, '_blank', 'noopener');
      closeCheckout();
    }

    document.querySelectorAll('input[name="checkout-payment"], input[name="checkout-delivery"]').forEach(el => {
      el.addEventListener('change', updateCheckoutTotals);
    });
    document.getElementById('checkout-overlay').addEventListener('click', e => {
      if (e.target.id === 'checkout-overlay') closeCheckout();
    });

    function buildCardHtml(p) {
      const fullName = p.name + (p.suffix ? ' ' + p.suffix : '');
      const hsoBadge = p.suffix === 'HSO' ? '<span class="hso">HSO</span>' : '';
      const specLine = p.spec ? `<p class="card-spec">${escapeHtml(p.spec)}</p>` : '';
      const priceLine = p.price ? `<div class="card-price">${formatPrice(p.price)}</div>` : `<div class="card-price" style="color:var(--text-muted);font-weight:500">Ask in store</div>`;
      const cta = p.price
        ? `<button type="button" class="card-cta js-buy" data-name="${encodeURIComponent(fullName)}" data-price="${p.price}">${WA_ICON} Checkout &amp; Pay</button>`
        : `<a class="card-cta" href="${p.landingPage || ('https://wa.me/59996782619?text=' + encodeURIComponent('Hi, I\\'m interested in the ' + fullName + '. Is it available?'))}" ${p.landingPage ? '' : 'target="_blank" rel="noopener"'}>${WA_ICON} ${p.landingPage ? 'View Details' : 'Ask via WhatsApp'}</a>`;
      return `
        <div class="card">
          <span class="card-badge">Kingsday</span>
          <div class="card-img"><img src="../img/products/${p.image}" alt="${escapeHtml(fullName)}" loading="lazy" onerror="this.onerror=null;this.src='../img/products/${p.image.replace(/\\.png$/,'.jpg')}'"></div>
          <div class="card-name">${escapeHtml(p.name)}${hsoBadge}</div>
          ${specLine}
          ${priceLine}
          ${cta}
        </div>`;
    }

    function renderGrid(containerId, items) {
      const el = document.getElementById(containerId);
      if (!el) return;
      if (!items.length) { el.innerHTML = '<p style="color:var(--text-muted)">Coming soon.</p>'; return; }
      el.innerHTML = items.map(buildCardHtml).join('');
      el.querySelectorAll('.js-buy').forEach(btn => {
        btn.addEventListener('click', () => {
          const name = decodeURIComponent(btn.dataset.name);
          const price = Number(btn.dataset.price);
          openCheckout(name, price);
        });
      });
    }

    async function loadKingsday() {
      const res = await fetch('../data/products.json', { cache: 'no-store' });
      const products = await res.json();
      const active = products.filter(p => p.kingsday !== false);
      const isTablet = p => p.subcategory === 'tablet';

      const apple = active.filter(p => p.category === 'apple' && !isTablet(p));
      const samsung = active.filter(p => p.category === 'samsung' && !isTablet(p));
      const tablets = active.filter(isTablet);
      const laptops = active.filter(p => p.category === 'laptops');
      const tvs = active.filter(p => p.category === 'tvs');
      const acs = active.filter(p => p.category === 'acs');

      renderGrid('grid-apple', apple);
      renderGrid('grid-samsung', samsung);
      renderGrid('grid-tablets', tablets);
      renderGrid('grid-laptops', laptops);
      renderGrid('grid-tvs', tvs);
      renderGrid('grid-acs', acs);
    }

    loadKingsday().catch(err => console.error('Kingsday load failed:', err));
  </script>
</body>
</html>
```

- [ ] **Step 3: Verify in browser**

```bash
cd /home/ganesh/connections-curacao
python3 -m http.server 8000
```

Open `http://localhost:8000/kingsday/`. Verify:
- Hero shows "April 27 – May 2" tag and "Kingsday Week" heading (orange on "Kingsday").
- Six category sections render: Apple, Samsung, Tablets, Laptops, TVs, Air Conditioning.
- Every tile has an orange "Kingsday" corner pill.
- iPad shows under **Tablets** (not Apple). Galaxy Tab A11/A11+/A9+/A9 5G+ show under **Tablets** (not Samsung).
- Motorcycles do NOT appear in any section.
- Click "Checkout & Pay" on any tile — modal opens with XCG-prefixed values, radio changes recalculate total, submit button reads `Pay XCG … via Sentoo`.
- Store panel at bottom shows both stores + hours + WhatsApp.

Stop server.

- [ ] **Step 4: Commit**

```bash
git add kingsday/index.html
git commit -m "kingsday: add /kingsday/ landing page"
```

---

### Task 11: Samsung Curaçao — add Kingsday badge + XCG to `catalog.js`

**Files:**
- Modify: `/home/ganesh/samsung-curacao/js/catalog.js`

- [ ] **Step 1: Open and update `formatPrice` and tile renderer**

Read current file:

```bash
cat /home/ganesh/samsung-curacao/js/catalog.js
```

The line `const price = p.price ? \`<span class="tile-price">NAf ${p.price.toLocaleString()}</span>\` ...` produces the tile's price string.

Replace that construction so the price shows `XCG` and the tile gains a Kingsday corner pill unless `p.kingsday === false`.

REPLACE the existing tile template line:

```js
const price = p.price ? `<span class="tile-price">NAf ${p.price.toLocaleString()}</span>` : `<span class="tile-price muted">Message for pricing</span>`;
```

WITH:

```js
const price = p.price ? `<span class="tile-price">XCG ${p.price.toLocaleString()}</span>` : `<span class="tile-price muted">Message for pricing</span>`;
const kingsdayBadge = p.kingsday !== false ? '<span class="tile-kingsday">Kingsday</span>' : '';
```

Then in the tile HTML string produced by the same function, insert `${kingsdayBadge}` at the very top of the tile's inner markup (before the image / content). If the existing return statement is something like:

```js
return `
  <article class="tile">
    <img src="img/products/${p.image}" ...>
    ...
  </article>
`;
```

Change to:

```js
return `
  <article class="tile">
    ${kingsdayBadge}
    <img src="img/products/${p.image}" ...>
    ...
  </article>
`;
```

(Preserve the rest of the template exactly.)

- [ ] **Step 2: Add the `.tile-kingsday` CSS in `samsung-curacao/css/shared.css`**

Append to the end of `/home/ganesh/samsung-curacao/css/shared.css`:

```css
.tile-kingsday {
  position: absolute;
  top: 0.55rem;
  right: 0.55rem;
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #FF6600;
  background: rgba(255, 102, 0, 0.12);
  border: 1px solid rgba(255, 102, 0, 0.45);
  padding: 0.22rem 0.5rem;
  border-radius: 999px;
}
.tile { position: relative; }
```

- [ ] **Step 3: Verify in browser**

```bash
cd /home/ganesh/samsung-curacao
python3 -m http.server 8001
```

Open `http://localhost:8001/`. Verify:
- Every tile shows `XCG …` in the price.
- Every tile has an orange "Kingsday" corner pill.
- Tiles without a set price still show "Message for pricing" (no pill hidden underneath is acceptable — it's same position as badge).

Stop server.

- [ ] **Step 4: Commit**

```bash
cd /home/ganesh/samsung-curacao
git add js/catalog.js css/shared.css
git commit -m "samsung: kingsday badge + XCG currency"
```

---

### Task 12: Samsung Curaçao — home hero Kingsday takeover

**Files:**
- Modify: `/home/ganesh/samsung-curacao/index.html`

- [ ] **Step 1: Replace the hero `<section>` contents**

Find:

```html
<section class="hero">
  <div class="shell">
    <span class="badge">Now in stock</span>
    <h1>The new Galaxy <span class="c-a37">A37</span> &amp; <span class="c-a57">A57</span> 5G</h1>
    <p class="hero-sub">At Connections Curaçao. IP68, 50MP camera, 6 years of updates.</p>
    <div class="hero-phones">
      <div class="hero-phone a37"><span class="hero-phone-label c-a37">A37</span></div>
      <div class="hero-phone a57"><span class="hero-phone-label c-a57">A57</span></div>
    </div>
    <div class="hero-cta">
      <a class="btn btn-primary" href="/compare">Compare both</a>
      <a class="btn btn-a37" href="/a37">Explore A37</a>
      <a class="btn btn-a57" href="/a57">Explore A57</a>
    </div>
  </div>
</section>
```

REPLACE with:

```html
<section class="hero">
  <div class="shell">
    <span class="badge" style="color:#FF6600;background:rgba(255,102,0,0.12);border:1px solid rgba(255,102,0,0.45)">April 27 – May 2</span>
    <h1 style="border-bottom:3px solid #FF6600;padding-bottom:0.8rem"><span style="color:#FF6600">Kingsday</span> Week</h1>
    <p class="hero-sub">Galaxy deals across the full Samsung lineup. A37, A57, S25 Ultra and more.</p>
    <div class="hero-phones">
      <div class="hero-phone a37"><span class="hero-phone-label c-a37">A37</span></div>
      <div class="hero-phone a57"><span class="hero-phone-label c-a57">A57</span></div>
    </div>
    <div class="hero-cta">
      <a class="btn btn-primary" style="background:#FF6600;color:#0a0a0a" href="https://connectionscuracao.net/kingsday/">See all Kingsday deals</a>
      <a class="btn btn-a37" href="/a37">Explore A37</a>
      <a class="btn btn-a57" href="/a57">Explore A57</a>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Update the sticky bottom CTA**

Find:

```html
<div class="sticky-cta">
  <div>
    <strong>Galaxy A37 &amp; A57 5G</strong>
    <p>Now at Connections Curaçao</p>
  </div>
  <a class="btn btn-a37" href="/a37">A37</a>
  <a class="btn btn-a57" href="/a57">A57</a>
</div>
```

REPLACE the `<strong>` + `<p>` lines with:

```html
  <div>
    <strong style="color:#FF6600">Kingsday Week · Apr 27 – May 2</strong>
    <p>Galaxy deals now at Connections</p>
  </div>
```

Leave the `.btn-a37` and `.btn-a57` anchors unchanged.

- [ ] **Step 3: Verify in browser**

```bash
cd /home/ganesh/samsung-curacao
python3 -m http.server 8001
```

Open `http://localhost:8001/`. Verify:
- Hero shows orange "April 27 – May 2" tag.
- H1 reads "Kingsday Week" with "Kingsday" in orange and an orange underline below the heading.
- Primary CTA "See all Kingsday deals" is orange and links to connectionscuracao.net/kingsday/.
- A37/A57 buttons still present and styled as before.
- Sticky bottom bar shows "Kingsday Week · Apr 27 – May 2" in orange.
- `/a37`, `/a57`, `/compare` pages are untouched (open each, confirm hero there is unchanged).

Stop server.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "samsung: kingsday hero takeover on home"
```

---

### Task 13: End-to-end smoke test on the `kingsday` branch (both repos)

**Files:** none modified

- [ ] **Step 1: Serve both repos simultaneously**

```bash
cd /home/ganesh/connections-curacao && python3 -m http.server 8000 &
cd /home/ganesh/samsung-curacao && python3 -m http.server 8001 &
```

- [ ] **Step 2: Walkthrough checklist**

Open each URL in a browser and verify:

**`http://localhost:8000/`** (connections home)
- [ ] Kingsday pill banner visible at bottom, orange, with "Shop deals →" linking to `/kingsday/`.
- [ ] Featured Deals carousel: all cards (except motorcycles) have orange "Kingsday" corner pill.
- [ ] All category sections: every product card (except motorcycles) shows "Kingsday" corner pill.
- [ ] Prices show `XCG …` across all tiles.
- [ ] Checkout modal opens, shows XCG values, "Pay XCG … via Sentoo" CTA.

**`http://localhost:8000/kingsday/`**
- [ ] Hero shows orange "April 27 – May 2" tag + "Kingsday Week" (orange).
- [ ] Six sections render: Apple, Samsung, Tablets, Laptops, TVs, Air Conditioning.
- [ ] iPad appears under Tablets; tablets grid has Galaxy Tab A11/A11+/A9+/A9 5G+.
- [ ] No motorcycles anywhere.
- [ ] Store panel + WhatsApp CTA visible at bottom.
- [ ] Checkout modal fully functional.

**`http://localhost:8000/s26/`** (one sub-page spot check)
- [ ] No `NAf` text anywhere; only `XCG`.

**`http://localhost:8001/`** (samsung home)
- [ ] Hero: Kingsday takeover with orange accent, CTA linking to connectionscuracao.net/kingsday/.
- [ ] Catalog tiles: `XCG` prices + orange "Kingsday" corner pills.
- [ ] Sticky bottom bar: "Kingsday Week · Apr 27 – May 2".

**`http://localhost:8001/a37/`** (samsung sub-page untouched)
- [ ] Hero untouched — still shows the A37 product page content as before.

- [ ] **Step 3: Kill preview servers**

```bash
kill %1 %2 2>/dev/null
```

- [ ] **Step 4: Confirm each repo's branch state**

```bash
cd /home/ganesh/connections-curacao && git log --oneline main..kingsday
cd /home/ganesh/samsung-curacao && git log --oneline main..kingsday
```

Expected: commits from Tasks 1–12 listed in each repo. Nothing has been pushed to remote yet.

---

### Task 14: Push `kingsday` branch to GitHub (both repos) — staging only, no merge

**Files:** none modified

Branch deploy is fine — Netlify on both repos deploys *production* only from `main`. Pushing `kingsday` does not go live.

- [ ] **Step 1: Push connections-curacao**

```bash
cd /home/ganesh/connections-curacao
git push -u origin kingsday
```

- [ ] **Step 2: Push samsung-curacao**

```bash
cd /home/ganesh/samsung-curacao
git push -u origin kingsday
```

- [ ] **Step 3: Verify on GitHub**

Open each repo in the browser:
- `https://github.com/gvanx/connections-curacao/tree/kingsday`
- `https://github.com/gvanx/samsung-curacao/tree/kingsday`

Expected: branch exists with all Kingsday commits visible. `main` is unchanged. No PR needed unless you want one for review; this branch stays until launch day.

---

### Task 15: Launch-day runbook (do NOT execute until Mon Apr 27)

**Files:** none modified

This task is a reference. Do not run it yet.

Launch sequence when the operator is ready to flip Kingsday live:

```bash
# connections-curacao
cd /home/ganesh/connections-curacao
git checkout main
git pull origin main
git merge --no-ff kingsday -m "launch: kingsday week"
git push origin main

# samsung-curacao
cd /home/ganesh/samsung-curacao
git checkout main
git pull origin main
git merge --no-ff kingsday -m "launch: kingsday week"
git push origin main
```

Netlify auto-deploys both on push. Allow ~1 minute each, then verify:
- https://connectionscuracao.net/
- https://connectionscuracao.net/kingsday/
- https://samsungcuracao.com/

Rollback after May 2:

```bash
# connections-curacao
cd /home/ganesh/connections-curacao
git checkout main
git revert -m 1 <launch-merge-commit-sha>
git push origin main

# samsung-curacao — repeat analogous command
```

Currency migration to XCG is intentionally kept post-rollback (one-way change). If a price adjustment is needed for Unlisted products before launch day, edit `data/products.json` on the `kingsday` branch, commit, push to origin/kingsday.

---

## Self-review notes (plan author)

- **Spec coverage:** Every spec section has at least one task. Data model → T2-4, currency → T6-7/T11, catalog renderer → T8/T11, home banner → T9, landing page → T10, samsung hero → T12, staging → T1/T14, launch runbook → T15, rollback → T15.
- **Open item #1 (tablet filter):** resolved via `subcategory: "tablet"` field added in T3 Step 5–6.
- **Open item #2 (placeholder image):** resolved in T5 via copies of existing generics.
- **Open item #3 (unlisted prices):** not blocking launch; operator edits products.json on the `kingsday` branch before merge.
- **Open item #4 (banner copy):** finalized in T9 Step 2.
