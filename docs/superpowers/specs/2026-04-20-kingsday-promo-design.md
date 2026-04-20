# Kingsday 2026 Promo — Design

**Status:** Approved · ready for implementation plan
**Created:** 2026-04-20
**Promo window:** Mon Apr 27 – Sat May 2, 2026 (Kingsday through end-of-week)
**Staging:** `kingsday` branch in both repos; merge to `main` on launch day

## Scope

Three surfaces affected across two repos:

1. **connections-curacao** — new `/kingsday/` landing page + themed home banner + Kingsday prices in catalog
2. **samsung-curacao** — home hero takeover for Kingsday Week (A37/A57/compare pages untouched)
3. **Currency migration** — NAf → XCG site-wide, both repos

Code changes ship via a `kingsday` branch; nothing reaches production until the operator merges to `main`.

## Key decisions

| Topic | Decision |
|---|---|
| Duration | Mon Apr 27 – Sat May 2 |
| Price display | Just the Kingsday price + "Kingsday" badge. No strike-through, no "save XX" label. |
| Currency | Migrate NAf → **XCG** site-wide (both repos). One-way. |
| Landing page URL | `/kingsday/` (subdir) |
| Landing page type | Self-contained: hero → 6 category sections → store panel + Sentoo checkout |
| Home banner | Replace "Galaxy A-series launch banner" with Kingsday banner for the week |
| Samsung Curaçao depth | Full home hero takeover (option C) — a37/a57/compare pages untouched |
| Theme direction | Hybrid (C) — dark base + orange accent line + orange badges + orange CTAs |
| Unlisted products | Current catalog price + Kingsday badge (uniform treatment) |
| New products | Add permanently to `products.json` with placeholder image |
| Excluded from promo | Motorcycles (`kingsday: false` flag) |
| Payments | Sentoo (existing integration, amounts-only, label change only) |
| Staging | `kingsday` branch in both repos; merge on launch day |
| Rollback after May 2 | Revert merge commit; currency stays XCG |

## Architecture

### Data model — `data/products.json`

- Bake Kingsday prices as the new `price` value (single-price model; no `kingsdayPrice` field).
- Add `kingsday: false` to both motorcycle entries. Renderer treats absence as `true`.
- Add 13 new products with placeholder image filenames (to be replaced when photos arrive).
- Rename existing generic "Lenovo Laptop" (NAf 399) → "Lenovo IdeaPad 1i" (XCG 499) with new spec string.
- Update HP Laptop entry with new spec string.
- A37/A57 get real prices (789 / 969); the `landingPage` field is left in place — during the promo, tiles should still link to the dedicated samsung-curacao pages. That's a catalog-renderer decision, not a data-model decision.

### Catalog renderer (connections-curacao `index.html` + samsung-curacao `js/catalog.js`)

- Add Kingsday badge logic: render an orange-outlined "Kingsday" pill on every tile unless `kingsday === false`.
- `formatPrice()` updated: `'XCG ' + ...` in both repos.

### `/kingsday/` landing page (connections-curacao, new)

File layout:
- `kingsday/index.html` — page markup + styles (reuses design tokens from main `index.html`, no new CSS file)
- Assets reused from main site (`img/products/`, fonts from Google)

Page structure (single long page):
1. **Topbar** — same brand header as home (logo left, WhatsApp right)
2. **Hero** — dark gradient, orange "April 27 – May 2" tag, "Kingsday Week" headline (orange on "Kingsday"), subtitle, two CTAs (WhatsApp + "Jump to deals")
3. **Six category sections**, in order: Apple · Samsung · Tablets · Laptops · TVs · ACs. Each has a section heading and a product grid reading from `data/products.json` filtered by category. Tablets are a sub-group — items identified by name match ("Galaxy Tab ..." / "iPad ...") since the data file has no `subcategory` field; alternative is to add a `subcategory: "tablet"` field to applicable entries. See Open Questions.
4. **Store panel** — Punda + Otrobanda addresses, hours, WhatsApp CTA (mirrors home site)
5. **Sentoo checkout modal** — same pattern as home, reusing `CHECKOUT_CONFIG` + `sentooLink()`
6. **Footer** — same as home

Motorcycle category is omitted entirely.

### Connections home (connections-curacao `index.html`)

- Replace the "Galaxy A-series launch banner" markup + associated styles with a "Kingsday Week" banner (dismissible, orange outline, CTA → `/kingsday/`).
- New localStorage key: `kingsday-2026-dismissed` (so users who previously dismissed the launch banner still see Kingsday).
- Remove/comment existing `launch-banner-galaxy-a-dismissed` handling.
- Catalog renders with Kingsday badges automatically via the renderer change.
- Hero section unchanged.

### Samsung Curaçao (samsung-curacao `index.html`)

Full home hero takeover:
- Replace current `<section class="hero">` contents with Kingsday Week messaging (orange accent on "Kingsday", "April 27 – May 2" tag, subtitle "Galaxy deals + the full lineup").
- CTAs: `Explore A37`, `Explore A57`, `See all deals` → `https://connectionscuracao.net/kingsday/`.
- Catalog grid below unchanged structurally; `catalog.js` adds Kingsday badge to each tile.
- A37, A57, compare pages: untouched.

### Currency migration (NAf → XCG)

**connections-curacao:**
- `index.html` — `formatPrice()` helper; checkout placeholders (`"NAf 0"` × 4); checkout radio labels (`"+NAf 100 downpayment"`, `"+NAf 35"`); any visible inline `NAf` strings.
- Sub-pages under `/iphone14/`, `/s25plus/`, `/s26/`, `/macbookneo/`, `/iphonefold/`, `/iphone17e/`, `/galaxy-a/`, `/iptv/`, `/repair/` — grep each `index.html` for `NAf` and replace.
- Sentoo amount logic untouched (numeric).

**samsung-curacao:**
- `js/catalog.js` — `formatPrice()`.
- Grep the rest of the repo for stray `NAf`.

## Kingsday prices (XCG)

### Samsung phones
| Product | Kingsday | Prior catalog |
|---|---:|---:|
| Galaxy A07 | 189 | 199 |
| Galaxy A16 | 299 | 289 |
| Galaxy A17 | 339 | 349 |
| Galaxy A26 | 425 | 399 |
| Galaxy A36 | 549 | 575 |
| Galaxy A37 5G | 789 | (Ask in store) |
| Galaxy A56 | 649 | 675 |
| Galaxy A57 5G | 969 | (Ask in store) |
| Galaxy S25 FE 128GB | 1099 | 1290 |
| Galaxy S25 FE 256GB | 1249 | NEW |
| Galaxy S25 Ultra | 1989 | 2190 |
| Galaxy S26 Ultra | 2690 | NEW |
| Galaxy S26 Ultra 512GB | 2890 | NEW |
| Samsung M04 128GB | 250 | NEW |

### iPhones
| Product | Kingsday | Prior catalog |
|---|---:|---:|
| iPhone 12 HSO | 549 | 599 |
| iPhone 13 HSO | 699 | 749 |
| iPhone 14 HSO | 775 | 849 |
| iPhone 15 HSO | 999 | 1199 |
| iPhone 15 Pro Max HSO | 1499 | 1590 |
| iPhone 16 Pro Max HSO | 1849 | 1990 |
| iPhone 15 (new) | 1499 | NEW |
| iPhone 16 (new) | 1599 | 1699 |
| iPhone 17 (new) | 1999 | 2100 |
| iPhone 17 Pro | 2649 | 2890 |
| iPhone 17 Pro Max | 2999 | 3030 |

### iPad / Mac
| Product | Kingsday | Prior |
|---|---:|---:|
| iPad 11th 128GB | 739 | 790 |
| MacBook Neo 256/8GB | 1499 | NEW |

### Samsung tablets
| Product | Kingsday | Status |
|---|---:|---|
| Galaxy Tab A11 | 279 | NEW |
| Galaxy Tab A11+ | 475 | NEW |
| Galaxy Tab A9+ WiFi | 399 | NEW |
| Galaxy Tab A9 5G+ | 499 | NEW |

### Laptops
| Product | Kingsday | Prior | Spec |
|---|---:|---:|---|
| HP Laptop (N150) | 499 | 525 | Intel N150, 4GB, 128GB UFS, Intel graphics, BT, 14" 1366×768, W11, Sky Blue |
| Lenovo IdeaPad Slim 3i | 549 | NEW | Intel N100, 4GB, 128GB SSD, UHD graphics, 15.6" 1920×1080, Arctic Gray |
| Lenovo IdeaPad 1i | 499 | (replaces generic "Lenovo Laptop" @ 399) | Celeron N4500, 4GB, 128GB eMMC, 14" 1920×1080, W11, Gray |

### Unlisted (kept at current catalog price + Kingsday badge)

iPhone 16 Plus · iPhone 17 Air · Galaxy S24 FE · Galaxy S24 Ultra · Galaxy S25 Plus · all TVs · all ACs. Prices may be adjusted before launch.

### Excluded (no badge)

150cc Motorcycle Blue/Black (`kingsday: false`).

## Open items (can resolve during implementation)

1. **Tablet section filtering** on `/kingsday/` — add `subcategory: "tablet"` to iPad + Tab entries, or filter by name match? Prefer the explicit field (no brittle string matching).
2. **Placeholder image file** for new products — confirm we use existing `laptop-generic.png` / `tv-generic.png` / `ac-generic.png` style, or add a single `product-placeholder.png`.
3. **Final Kingsday prices** for the "Unlisted" group — operator to provide before Monday.
4. **Banner copy** — draft: "Kingsday Week · Apr 27 – May 2 · Royal deals across the catalog" → CTA "Shop Kingsday deals →"

## Files touched

### connections-curacao
- `data/products.json` — prices, new entries, motorcycle flag
- `index.html` — banner swap, `formatPrice` → XCG, catalog renderer badge logic
- `kingsday/index.html` — NEW (full landing page)
- `img/products/` — placeholder copies for new products (or repoint to existing generics)
- Sub-page `index.html` files under `/iphone14/`, `/s25plus/`, `/s26/`, `/macbookneo/`, `/iphonefold/`, `/iphone17e/`, `/galaxy-a/`, `/iptv/`, `/repair/` — currency grep-replace

### samsung-curacao
- `index.html` — hero takeover + banner
- `js/catalog.js` — `formatPrice` → XCG, Kingsday badge logic
- Any pages containing `NAf` — grep-replace

## Staging & launch

1. Create `kingsday` branch in each repo
2. Implement all changes on the branch
3. Local preview (`python3 -m http.server` at repo root) on each to verify
4. Pre-launch day: final prices for unlisted group go into `products.json` on the branch
5. Mon Apr 27 morning: `git checkout main && git merge kingsday && git push` in each repo
6. Netlify auto-deploys both
7. May 2 end-of-day: revert the merge commit on main, push. Currency stays XCG.
