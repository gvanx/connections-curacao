# Connections Curacao Main Site — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a premium dark tech store website (single HTML file) to replace the Squarespace site at connectionscuracao.net.

**Architecture:** Single `index.html` with embedded CSS/JS. Product data loaded from `data/products.json`. Hub-and-spoke model — main site showcases categories, links to subdomains for JBL/Gift Cards/Trade-In. Hosted on Netlify.

**Tech Stack:** HTML5, CSS3 (glass-morphism, grid, flexbox), vanilla JavaScript, Google Fonts (Outfit + DM Sans), no build step.

**Dev server:** `python3 -m http.server 8080 --directory /home/ganesh/connections-curacao` — preview at `http://65.108.199.32:8080`

**Reference sites for style/pattern:**
- JBL subdomain: `/home/ganesh/jbl/index.html` — dark premium aesthetic, glass cards, product grid
- Gift card subdomain: `/home/ganesh/gift-card-curacao/index.html` — clean card layout, DM Sans
- Spin game: `/home/ganesh/game/index.html` — gradient mesh, Outfit font

---

### Task 1: Create products.json with all product data

**Files:**
- Create: `data/products.json`

**Step 1: Create the data directory and products.json**

```json
[
  {"name":"iPhone 12","suffix":"HSO","price":599,"category":"apple","featured":false},
  {"name":"iPhone 13","suffix":"HSO","price":749,"category":"apple","featured":false},
  {"name":"iPhone 14","suffix":"HSO","price":950,"category":"apple","featured":false},
  {"name":"iPhone 15","suffix":"HSO","price":1199,"category":"apple","featured":true},
  {"name":"iPhone 15 Pro Max","suffix":"HSO","price":1590,"category":"apple","featured":false},
  {"name":"iPhone 16","suffix":"","price":1699,"category":"apple","featured":true},
  {"name":"iPhone 16 Plus","suffix":"","price":1750,"category":"apple","featured":false},
  {"name":"iPhone 16 Pro Max","suffix":"HSO","price":1850,"category":"apple","featured":true},
  {"name":"iPhone 17","suffix":"","price":2290,"category":"apple","featured":true},
  {"name":"iPhone 17 Air","suffix":"","price":2190,"category":"apple","featured":true},
  {"name":"iPhone 17 Pro","suffix":"","price":2790,"category":"apple","featured":true},
  {"name":"iPhone 17 Pro Max","suffix":"","price":3030,"category":"apple","featured":true},
  {"name":"iPad 11th 128GB","suffix":"","price":790,"category":"apple","featured":false},
  {"name":"iPad Air M3 128GB","suffix":"","price":1590,"category":"apple","featured":false},
  {"name":"Galaxy A06","suffix":"","price":175,"category":"samsung","featured":false},
  {"name":"Galaxy A07","suffix":"","price":185,"category":"samsung","featured":false},
  {"name":"Galaxy A16","suffix":"","price":269,"category":"samsung","featured":false},
  {"name":"Galaxy A17","suffix":"","price":325,"category":"samsung","featured":false},
  {"name":"Galaxy A26","suffix":"","price":444,"category":"samsung","featured":false},
  {"name":"Galaxy A36","suffix":"","price":575,"category":"samsung","featured":false},
  {"name":"Galaxy A56","suffix":"","price":675,"category":"samsung","featured":true},
  {"name":"Galaxy S24 FE","suffix":"","price":849,"category":"samsung","featured":false},
  {"name":"Galaxy S24 Ultra","suffix":"","price":1750,"category":"samsung","featured":true},
  {"name":"Galaxy S25 Plus","suffix":"","price":1749,"category":"samsung","featured":true},
  {"name":"Galaxy S25 FE","suffix":"","price":1375,"category":"samsung","featured":true},
  {"name":"Galaxy S25 Ultra","suffix":"","price":1975,"category":"samsung","featured":true},
  {"name":"32\" HD Smart TV (Android 14)","suffix":"","price":245,"category":"tvs","featured":false},
  {"name":"32\" HD Smart TV (Google 5.0)","suffix":"","price":267,"category":"tvs","featured":false},
  {"name":"43\" FHD Smart TV","suffix":"","price":429,"category":"tvs","featured":true},
  {"name":"50\" UHD Smart TV (Android 14)","suffix":"","price":625,"category":"tvs","featured":true},
  {"name":"55\" UHD Smart TV (Whale OS)","suffix":"","price":767,"category":"tvs","featured":false},
  {"name":"60\" UHD Smart TV","suffix":"","price":835,"category":"tvs","featured":false},
  {"name":"65\" UHD Smart TV","suffix":"","price":1044,"category":"tvs","featured":true},
  {"name":"Lenovo Laptop","suffix":"","price":399,"category":"laptops","featured":true},
  {"name":"HP Laptop","suffix":"","price":475,"category":"laptops","featured":true},
  {"name":"Digital Air Cooler 5.5L","suffix":"","price":149,"category":"acs","featured":false},
  {"name":"Portable AC 12000BTU","suffix":"","price":847,"category":"acs","featured":true},
  {"name":"Split 9000BTU (1+1)","suffix":"","price":476,"category":"acs","featured":false},
  {"name":"Split 12000BTU Non-Inverter","suffix":"","price":509,"category":"acs","featured":false},
  {"name":"Split 12000BTU Inverter","suffix":"","price":675,"category":"acs","featured":true},
  {"name":"Split 24000BTU Non-Inverter","suffix":"","price":1121,"category":"acs","featured":false},
  {"name":"Split 24000BTU Inverter","suffix":"","price":1335,"category":"acs","featured":false},
  {"name":"150cc Motorcycle (Blue)","suffix":"","price":5555,"category":"motor","featured":true},
  {"name":"150cc Motorcycle (Black)","suffix":"","price":5555,"category":"motor","featured":true}
]
```

**Step 2: Commit**

```bash
git add data/products.json
git commit -m "feat: add product catalog data"
```

---

### Task 2: Create index.html — HTML skeleton + CSS variables + base styles

**Files:**
- Create: `index.html`

Build the full HTML structure with all sections (empty content for now) and the complete CSS design system:

**Step 1: Write index.html with:**
- Full `<head>` with meta tags, OG tags, fonts (Outfit + DM Sans), theme-color
- CSS reset, CSS custom properties (all colors, spacing, typography from design doc)
- Glass-morphism utility classes
- Responsive breakpoints
- All section containers in HTML (nav, hero, categories, deals, product sections, ecosystem, locations, footer)
- WhatsApp FAB markup

**CSS variables to define:**
```css
:root {
  --bg: #0a0a0a;
  --bg-elevated: #111111;
  --surface: rgba(255,255,255,0.05);
  --surface-hover: rgba(255,255,255,0.08);
  --surface-border: rgba(255,255,255,0.1);
  --surface-border-hover: rgba(255,255,255,0.2);
  --accent: #007AFF;
  --accent-glow: rgba(0,122,255,0.3);
  --accent-orange: #FF6600;
  --accent-orange-glow: rgba(255,102,0,0.3);
  --text: #FFFFFF;
  --text-muted: rgba(255,255,255,0.6);
  --text-dim: rgba(255,255,255,0.4);
  --whatsapp: #25D366;
  --radius: 20px;
  --radius-sm: 12px;
  --radius-lg: 28px;
  --font-display: 'Outfit', system-ui, sans-serif;
  --font-body: 'DM Sans', system-ui, sans-serif;
}
```

**Step 2: Verify** — open `http://65.108.199.32:8080` and confirm dark background renders, fonts load.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: HTML skeleton with CSS design system"
```

---

### Task 3: Navigation bar (sticky, glass blur)

**Files:**
- Modify: `index.html`

**Step 1: Build the nav inside the `<nav>` element:**
- Logo text "CONNECTIONS" on the left (Outfit font, letter-spaced)
- Desktop links: Deals, Apple, Samsung, TVs, Locations, Contact
- Subdomain quick-links: JBL, Gift Cards, Trade-In (styled differently, e.g. pill badges)
- Hamburger button (hidden on desktop, visible on mobile)
- Mobile slide-out menu

**CSS:**
- `position: sticky; top: 0; z-index: 100`
- `background: rgba(10,10,10,0.8); backdrop-filter: blur(20px)`
- Border-bottom: `1px solid rgba(255,255,255,0.06)`
- On scroll: add class via JS to reduce padding (compact mode)
- Mobile menu: full-screen overlay with glass background

**JS:**
- Scroll listener to toggle compact class on nav
- Hamburger toggle for mobile menu
- Smooth scroll to sections on link click

**Step 2: Test** — verify sticky behavior, glass blur, mobile menu toggle, smooth scroll.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: sticky glass navigation with mobile menu"
```

---

### Task 4: Hero section (cinematic, full viewport)

**Files:**
- Modify: `index.html`

**Step 1: Build the hero section:**
- Full viewport height (`min-height: 100vh; min-height: 100svh`)
- Animated gradient mesh background (CSS `@keyframes` moving radial gradients — one blue, one orange, slow-moving)
- Main tagline: "Curaçao's Premium Electronics" (Outfit, large, bold)
- Subtitle: "Apple · Samsung · TVs · Laptops · and more" (DM Sans, muted)
- Two CTA buttons: "Shop Deals" (accent blue, filled) + "Visit Us" (glass outline)
- Subtle down-arrow indicator at bottom (animated bounce)

**CSS for gradient mesh:**
```css
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 20% 40%, rgba(0,122,255,0.15), transparent),
    radial-gradient(ellipse 60% 60% at 80% 60%, rgba(255,102,0,0.1), transparent);
  animation: meshMove 20s ease-in-out infinite alternate;
}
```

**Step 2: Test** — verify full-viewport, gradient animation, CTAs visible, looks good on mobile.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: cinematic hero section with gradient mesh"
```

---

### Task 5: Category grid section

**Files:**
- Modify: `index.html`

**Step 1: Build category grid below hero:**
- Section heading: "Browse Categories"
- 6 glass cards in a responsive grid (3 columns desktop, 2 tablet, 1 mobile)
- Categories: Apple, Samsung, TVs, Laptops, Air Conditioning, Motorcycles
- Each card: SVG icon or emoji + category name + product count (loaded from JSON via JS)
- Hover effect: glow border, translateY(-4px)
- Click: smooth scroll to the corresponding product section

**Card CSS:**
```css
.category-card {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius);
  backdrop-filter: blur(12px);
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}
.category-card:hover {
  background: var(--surface-hover);
  border-color: var(--surface-border-hover);
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(0,122,255,0.15);
}
```

**Step 2: Test** — grid layout on desktop/mobile, hover effects, scroll-to-section links.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: category grid with glass cards"
```

---

### Task 6: Featured deals carousel

**Files:**
- Modify: `index.html`

**Step 1: Build horizontal scrollable carousel:**
- Section heading: "Featured Deals" with accent underline
- Load products from JSON where `featured: true`
- Horizontal scroll container (CSS `overflow-x: auto; scroll-snap-type: x mandatory`)
- Each card: product image placeholder (gradient placeholder until real images), product name, price in NAf (formatted with comma separator), "Order" WhatsApp button
- Left/right arrow buttons for desktop navigation
- Scroll-snap on each card

**Price formatting JS:**
```js
const fmtPrice = (n) => `NAf ${n.toLocaleString()}`
```

**WhatsApp link:**
```js
const waLink = (product) =>
  `https://wa.me/59996782619?text=${encodeURIComponent(
    `Hi, I'm interested in the ${product.name} (NAf ${product.price.toLocaleString()})`
  )}`
```

**Step 2: Test** — carousel scrolls, snap works, WhatsApp links open correctly, mobile touch scroll.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: featured deals carousel with WhatsApp ordering"
```

---

### Task 7: Product sections (all categories)

**Files:**
- Modify: `index.html`

**Step 1: Build product section template rendered per category:**
- JS loops through categories: `['apple','samsung','tvs','laptops','acs','motor']`
- Each section has: heading (category name), responsive grid of product cards
- Product card: gradient placeholder for image, product name, suffix badge (e.g. "HSO") if present, price, WhatsApp order button
- Grid: `repeat(auto-fill, minmax(280px, 1fr))`

**Category display names map:**
```js
const categoryNames = {
  apple: 'Apple',
  samsung: 'Samsung',
  tvs: 'Televisions',
  laptops: 'Laptops',
  acs: 'Air Conditioning',
  motor: 'Motorcycles'
}
```

**Step 2: Add scroll-triggered fade-in animation:**
```js
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
```

**Step 3: Test** — all categories render, correct product count, WhatsApp links work, fade-in triggers on scroll.

**Step 4: Commit**

```bash
git add index.html
git commit -m "feat: product sections for all categories with scroll animations"
```

---

### Task 8: Ecosystem section (subdomain links)

**Files:**
- Modify: `index.html`

**Step 1: Build ecosystem section:**
- Section heading: "More from Connections"
- Glass cards for each subdomain:
  - **JBL Audio** — "Original JBL speakers, headsets & earbuds" → `https://jbl.connectionscuracao.net`
  - **Gift Cards** — "PSN, Apple, Xbox, Nintendo & more. Instant delivery" → `https://giftcard.connectionscuracao.net`
  - **Trade-In** — "Trade in your old device for store credit" → `https://trade.connectionscuracao.net`
  - **Spin & Win** — "Got a code? Spin the wheel for prizes" → `https://spin.connectionscuracao.net`
- Each card: icon/emoji, title, description, "Visit →" link
- Hover: accent glow, scale-up

**Step 2: Test** — links open correct subdomains, cards look good on mobile.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: ecosystem section linking to subdomains"
```

---

### Task 9: Locations section

**Files:**
- Modify: `index.html`

**Step 1: Build locations section:**
- Section heading: "Visit Our Stores"
- Two glass cards side-by-side (stacked on mobile):
  - **Punda** — 13 Breedestraat, Willemstad
  - **Otrobanda** — (address TBD, use placeholder)
- Each card: store name, address, hours (Mon-Sat 9:30am-6pm), phone (+599-96782619)
- Google Maps link button: `https://maps.google.com/?q=Connections+Curacao+Punda`
- "Get Directions" CTA

**Step 2: Test** — maps links work, responsive layout.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: locations section with store info"
```

---

### Task 10: Footer + WhatsApp FAB

**Files:**
- Modify: `index.html`

**Step 1: Build footer:**
- Three columns (stacked on mobile): About, Quick Links, Contact
- About: short blurb + social links (Instagram, Facebook)
- Quick Links: Shop Deals, Locations, JBL, Gift Cards, Trade-In
- Contact: phone, email, WhatsApp group link, address
- Copyright: "© 2026 Connections Curacao. All rights reserved."
- Subtle top border

**Step 2: Build WhatsApp FAB:**
- Fixed bottom-right, always visible
- Green circle with WhatsApp SVG icon
- Pulse animation on first load
- Links to `https://wa.me/59996782619`

**Step 3: Test** — footer layout, social links, FAB visible on scroll.

**Step 4: Commit**

```bash
git add index.html
git commit -m "feat: footer and WhatsApp floating button"
```

---

### Task 11: Supporting files (manifest, robots, sitemap, _redirects)

**Files:**
- Create: `manifest.json`
- Create: `robots.txt`
- Create: `sitemap.xml`
- Create: `_redirects`

**Step 1: Create manifest.json:**
```json
{
  "name": "Connections Curacao",
  "short_name": "Connections",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#007AFF"
}
```

**Step 2: Create robots.txt:**
```
User-agent: *
Allow: /
Sitemap: https://connectionscuracao.net/sitemap.xml
```

**Step 3: Create sitemap.xml** with single URL entry for the homepage.

**Step 4: Create `_redirects`** (empty for now, placeholder for Netlify).

**Step 5: Commit**

```bash
git add manifest.json robots.txt sitemap.xml _redirects
git commit -m "feat: add PWA manifest, robots, sitemap, redirects"
```

---

### Task 12: Deploy to Netlify + GitHub repo

**Step 1: Create GitHub repo**

```bash
cd /home/ganesh/connections-curacao
gh repo create gvanx/connections-curacao --public --source=. --push
```

**Step 2: Create Netlify site and link**

```bash
NETLIFY_AUTH_TOKEN=nfp_xJ2vcepkgDr6TJup3hkPxHmExZKdd7wmf01a netlify sites:create --name connections-curacao
NETLIFY_AUTH_TOKEN=nfp_xJ2vcepkgDr6TJup3hkPxHmExZKdd7wmf01a netlify link
```

**Step 3: Deploy**

```bash
NETLIFY_AUTH_TOKEN=nfp_xJ2vcepkgDr6TJup3hkPxHmExZKdd7wmf01a netlify deploy --prod --dir=.
```

**Step 4: Configure build settings** to auto-deploy from GitHub main branch.

**Step 5: Verify** — site loads at Netlify URL.

---

### Task 13: Polish pass — visual review and fixes

**Step 1:** Open site in browser, review each section top-to-bottom on desktop and mobile viewport.

**Step 2:** Fix any spacing, alignment, color, or animation issues.

**Step 3:** Test all WhatsApp links, navigation links, subdomain links.

**Step 4:** Final commit.

```bash
git add -A
git commit -m "fix: polish pass — spacing, alignment, visual tweaks"
git push
```
