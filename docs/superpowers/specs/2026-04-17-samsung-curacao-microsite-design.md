# Samsung Curaçao Microsite + Galaxy A37/A57 Launch — Design

**Date:** 2026-04-17
**Author:** Ganesh + Claude (brainstorm)
**Status:** Draft — pending user review

## Purpose

Launch the Samsung Galaxy A37 5G and A57 5G at Connections Curaçao with dedicated product pages, and capture value from the already-owned `samsungcuracao.com` domain by turning it into a Samsung-only microsite that also raises SEO + ad-quality surface for Samsung searches.

## Goals

- Every visitor reaching a Samsung A-series page lands on a page tailored to the specific phone (A37 or A57), not a generic combined page.
- `samsungcuracao.com` serves an actual Samsung-branded site, not just a redirect — so it can be used for Google/Meta ads, in-store signage, and receipts.
- The existing `connectionscuracao.net` homepage prominently announces the launch without breaking the current deals carousel.
- Visitors can reach WhatsApp in one tap from every page.
- No runtime coupling between the two domains; each deploys independently.

## Non-goals

- No pro Samsung device photography for launch. CSS/SVG silhouettes with accent gradients fill in; official press renders can be swapped in later.
- No Papiamentu or Dutch translations at launch (English-only). Flagged for phase 2.
- No reply-as-from-custom-domain workflow in third-party email clients; iCloud web / iOS Mail is acceptable.
- No shared component library between the two repos at launch. Extract if the microsite grows.

## Architecture

### Domains

| Domain | Role | Host |
|---|---|---|
| `connectionscuracao.net` | Existing main site, all-category catalog | Netlify (existing) |
| `samsungcuracao.com` | New Samsung-only microsite | Netlify (new site) |

### Site maps

**`samsungcuracao.com`:**
```
/               Samsung microsite home (A37+A57 launch hero + full Samsung catalog)
/a37            Galaxy A37 5G dedicated landing
/a57            Galaxy A57 5G dedicated landing
/compare        A37 vs A57 side-by-side (ported from existing /galaxy-a/)
```

**`connectionscuracao.net` (changes):**
```
/               Homepage — add launch banner above deals carousel
/galaxy-a/      Existing page — becomes a thin pointer to samsungcuracao.com/compare
/data/products.json
                A37/A57 entries updated: landingPage = "https://samsungcuracao.com/a37" / "/a57"
/img/products/  Add galaxy-a37-model.jpg + galaxy-a57-model.jpg so deals cards render
```

### File layout — `samsung-curacao` repo

```
samsung-curacao/
├── index.html               # microsite home
├── a37/index.html
├── a57/index.html
├── compare/index.html
├── data/products.json       # Samsung-only slice (own copy)
├── img/products/            # duplicated Samsung product images
├── img/og/                  # per-page OG images (SVG → PNG at build or inline SVG)
├── _redirects               # Netlify short-path rewrites
├── robots.txt
├── sitemap.xml
├── manifest.json
└── .gitignore
```

**`_redirects`:**
```
/a37       /a37/index.html      200
/a57       /a57/index.html      200
/compare   /compare/index.html  200
```

## Components (page anatomy)

Each page is a self-contained static HTML file with inline CSS (matches existing `connections-curacao` pattern — no build step, no framework).

### Shared visual language

- Base bg `#08080c`, text `#eceaf5`, `Outfit` (display) + `Figtree` (body) from Google Fonts
- **A37 accent:** `#4ca4d4` (blue)
- **A57 accent:** `#b484f0` (purple)
- Shared Samsung gradient: linear between the two accents
- Subtle SVG grain overlay + radial glow backgrounds (reuse existing `/galaxy-a/` CSS verbatim)

### `samsungcuracao.com/` — microsite home

1. Sticky topbar: Samsung Curaçao wordmark (gradient dot) · "Visit Store" · "WhatsApp"
2. Launch hero: "The New Galaxy A-Series" · dual A37-blue + A57-purple phone silhouettes · "Compare Both" + "Ask via WhatsApp"
3. Three-feature strip: IP68 · 120Hz AMOLED · 6 years of updates
4. Samsung catalog grid: every entry in `data/products.json` where `category=samsung`, featured first, each tile has name, price (if set), short spec chip, WhatsApp CTA
5. Store panel: Punda + Otrobanda + hours
6. Footer: link to `connectionscuracao.net` for non-Samsung products

### `samsungcuracao.com/a37` (blue identity)

1. Topbar with "← Back to Samsung"
2. Hero: giant "A37 5G" + blue silhouette + one-liner + primary "Ask via WhatsApp" CTA
3. Quick-spec strip: 6.7″ AMOLED · 50MP · 5000mAh · IP68
4. Full spec table (same data as existing `/galaxy-a/` A37 card, expanded)
5. "Why A37": 3 reason cards (value, durability, longevity)
6. Cross-sell: "Prefer flagship-feel? Meet the A57" → `/a57`
7. Store panel + sticky WhatsApp CTA

### `samsungcuracao.com/a57` (purple identity)

Same skeleton as `/a37` with purple accent. Upgrade rows (OIS, Exynos 1680, Galaxy AI, 179g / 6.9mm) visually called out. Cross-sell points back to `/a37` for value-focused buyers.

### `samsungcuracao.com/compare`

Direct port of the compare section from existing `/galaxy-a/index.html`, expanded:
- Bigger side-by-side spec table
- "Upgrade" rows in A57 purple
- Dual CTAs (WhatsApp for each phone)

### `connectionscuracao.net/` — homepage change

Slim **launch banner** above the deals carousel:
- Dual A37+A57 gradient background
- Copy: "The new Galaxy A-series is here. A37 & A57 5G, now at Connections."
- CTA: "Explore at samsungcuracao.com"
- Dismissible (localStorage key `launch-banner-galaxy-a-dismissed`) so repeat visitors don't see it forever

## Data flow

- Microsite's `index.html` fetches `/data/products.json` on load (same pattern as `connectionscuracao.net`), filters `category=samsung`, renders tiles.
- A37/A57 dedicated pages do **not** fetch JSON — their specs are hand-authored in HTML so they're SEO-indexable without JS.
- Main site's `products.json` gets updated `landingPage` values for A37/A57 so the existing deals-carousel logic routes visitors directly to the new pages.

## Content

### Voice

Confident, plain, Caribbean-warm. Short sentences. No jargon.

### CTAs

- Primary on every page: **"Ask via WhatsApp"** → `wa.me/59996782619?text=...` with pre-filled, page-specific message
- Secondary: "Visit our stores" → anchor to store panel
- Tertiary on `/a37` and `/a57`: link to `/compare`

Because A37/A57 have `price: 0` in `products.json`, CTAs do **not** show a price. Copy reads "Available now — message us for launch pricing."

### Key copy blocks

- **Microsite home hero:** "The new Galaxy A-series. / A37 & A57 5G, now at Connections Curaçao. / IP68 · 50MP · 6 years of updates."
- **A37 hero:** "Galaxy A37 5G. / Built to last. Six years of updates, IP68, 120Hz AMOLED — at the price you'd expect from A-series."
- **A57 hero:** "Galaxy A57 5G. / The upgrade. OIS camera, Galaxy AI, slimmer build — flagship feel, A-series value."
- **Homepage launch banner:** "The new Galaxy A-series is here. A37 & A57 5G, now at Connections. → Explore at samsungcuracao.com"

## SEO

| Page | Title | Meta description |
|---|---|---|
| `samsungcuracao.com/` | Samsung Curaçao — Galaxy Phones at Connections | Galaxy A37, A57, S25 Ultra and the full Samsung lineup. Available at Connections Punda & Otrobanda. |
| `/a37` | Galaxy A37 5G — Samsung Curaçao | The new Galaxy A37 5G at Connections Curaçao. IP68, 50MP, 6 years of updates. Punda & Otrobanda. |
| `/a57` | Galaxy A57 5G — Samsung Curaçao | The new Galaxy A57 5G at Connections Curaçao. OIS, Galaxy AI, IP68. Punda & Otrobanda. |
| `/compare` | Galaxy A37 vs A57 5G — Samsung Curaçao | Side-by-side comparison. Same DNA — A57 adds OIS, faster chip, slimmer build. |

- Canonical URL set on every page.
- OG image per page (inline SVG or generated PNG — gradient + phone name + "samsungcuracao.com"). 1200×630.
- `sitemap.xml` listing all four pages.
- Standard `robots.txt` (allow all).
- Schema.org `Product` JSON-LD on `/a37` and `/a57` for Google rich results.

### UTM strategy

- Every outbound link from `samsungcuracao.com` → `connectionscuracao.net` carries `?utm_source=samsungcuracao&utm_medium=referral`.
- Short URLs for print/signage: `samsungcuracao.com/a37?utm_source=flyer`, `?utm_source=instagram`, etc.

## Infrastructure

### Deployment

1. New GitHub repo `gvanx/samsung-curacao`.
2. New Netlify site linked to the repo, auto-deploy on push to `main`.
3. Netlify Domain Settings: add `samsungcuracao.com` and `www.samsungcuracao.com`; set apex as primary; Netlify issues SSL via Let's Encrypt.
4. Point registrar DNS to Netlify nameservers (or use `ALIAS`/`A` records if staying with current DNS).
5. Connections-curacao repo gets homepage banner + `products.json` `landingPage` updates + the two missing A37/A57 model images in one commit, auto-deployed by its existing Netlify hook.

### Email (iCloud Custom Domain)

1. iCloud Settings → Custom Email Domain → Add `samsungcuracao.com` (requires iCloud+).
2. Apple issues MX + SPF TXT + 2× DKIM CNAMEs — paste into DNS provider.
3. Create aliases `sales@samsungcuracao.com` and `hello@samsungcuracao.com`, route to primary iCloud inbox.
4. Verify via iCloud dashboard.

### Shared assets

Duplicate the Samsung product images (~14 files) into the Samsung repo's `img/products/`. Accept the two-repo edit cost; avoid runtime coupling.

## Error handling / edge cases

- **Missing product images on main site:** add `galaxy-a37-model.jpg` and `galaxy-a57-model.jpg` to `connections-curacao/img/products/` in the launch commit — must not ship until these exist (or the deals-carousel cards render broken).
- **`/galaxy-a/` traffic:** existing deep links in the wild. Keep the page but add a prominent banner at top linking to `samsungcuracao.com/compare`; do not 301-redirect (risk of losing indexed content before Samsung site builds PageRank).
- **Banner dismissal:** if user clicks "X" on homepage launch banner, localStorage stores flag; if localStorage unavailable (private browsing), banner shows every visit — acceptable degradation.
- **iCloud domain setup lag:** DNS propagation can take hours. Launch does not block on email — aliases can be configured after site is live.
- **Rollback:** if Samsung site breaks, revert the `connections-curacao` commit that updated `landingPage` — cards fall back to `/galaxy-a/` which still exists.

## Testing

1. Open `samsungcuracao.com` on iOS Safari + Android Chrome — verify hero, scrolling, sticky CTA.
2. Lighthouse on `/a37` and `/a57` — target perf ≥ 90, accessibility ≥ 95.
3. Click every WhatsApp CTA — confirm pre-filled message matches page context.
4. Verify `/a37` and `/a37/` both resolve (Netlify `_redirects`).
5. Verify `connectionscuracao.net` homepage mobile + desktop — launch banner looks right, deals-carousel A37/A57 cards link to new pages, nothing else regressed.
6. Send a test email to `sales@samsungcuracao.com` after iCloud setup — confirm inbox delivery.
7. Validate `/sitemap.xml` via Google Search Console.

## Open questions

- Colorway preference for silhouettes (launch with graphite, or use the known retail colorway once stock arrives)?
- Do we want WhatsApp Business catalog integration now, or WhatsApp links only?
- Phase 2 candidates: Papiamentu/Dutch copy, real device photography, Samsung Business / B2B landing, trade-in calculator.

## Out of scope for this launch

- Shopify / actual checkout flow
- Payment processing
- Trade-in tooling
- Multi-language
- A/B testing infra
