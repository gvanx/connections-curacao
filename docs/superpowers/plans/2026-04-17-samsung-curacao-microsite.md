# Samsung Curaçao Microsite + A37/A57 Launch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Samsung-only microsite at `samsungcuracao.com` with dedicated Galaxy A37 and A57 landing pages, plus a launch banner on the existing `connectionscuracao.net` homepage — all previewable on phone by end of work session.

**Architecture:** Two separate static sites on Netlify. New repo `samsung-curacao` for `samsungcuracao.com` (home + /a37 + /a57 + /compare). Existing `connections-curacao` repo gets a launch banner, missing product images, and `landingPage` updates in `products.json`. No framework, no build step, plain HTML + shared CSS file + small vanilla JS. iCloud Custom Domain for email aliases.

**Tech Stack:** Static HTML, CSS (shared + inline), vanilla JS, Netlify (hosting + SSL + redirects), GitHub (git), Playwright (verification), Python `http.server` (local preview), iCloud+ (email).

**Spec:** `docs/superpowers/specs/2026-04-17-samsung-curacao-microsite-design.md`

---

## File Structure

New repo **`/home/ganesh/samsung-curacao/`**:

```
samsung-curacao/
├── index.html                  # microsite home (hero + Samsung catalog + stores)
├── a37/index.html              # dedicated Galaxy A37 5G page
├── a57/index.html              # dedicated Galaxy A57 5G page
├── compare/index.html          # A37 vs A57 chooser (ported from galaxy-a)
├── css/shared.css              # design tokens, topbar, footer, buttons, typography
├── js/catalog.js               # fetches products.json, renders Samsung grid
├── data/products.json          # Samsung-only slice
├── img/products/*.jpg          # duplicated Samsung product images (14 files)
├── img/og/*.svg                # 4 OG preview images (inline SVG served as static files)
├── _redirects                  # Netlify rewrites for /a37, /a57, /compare short paths
├── robots.txt
├── sitemap.xml
├── manifest.json
├── README.md
└── .gitignore
```

Modified in **`/home/ganesh/connections-curacao/`**:

```
index.html                       # add launch banner block (~50 lines CSS + ~20 lines HTML)
data/products.json               # A37/A57 landingPage values updated (2 lines)
galaxy-a/index.html              # add "See on samsungcuracao.com" pointer banner (~20 lines)
img/products/galaxy-a37-model.jpg    # new — copied from stock (or placeholder SVG)
img/products/galaxy-a57-model.jpg    # new — copied from stock (or placeholder SVG)
```

**Why a shared CSS file (`css/shared.css`) for the new repo but inline CSS in the existing `connections-curacao` modifications?**
The new repo is a 4-page site with ~60% CSS overlap per page — a shared stylesheet saves ~1500 lines of duplication. The existing `connections-curacao` pages each use inline CSS; I won't restructure them, only add the minimum banner code inline to match the pattern.

**Page-specific CSS (hero, compare table, phone-card grids) stays inline** in each page file — these are intentionally distinct per phone.

---

## Task Execution Order

Tasks 1–10 build the Samsung microsite locally.
Tasks 11–14 modify `connections-curacao`.
Tasks 15–18 are user-driven deploy steps (GitHub push, Netlify domain, DNS, iCloud email).
Task 19 is post-deploy verification.

User-driven tasks are clearly labeled — you'll pause and hand off to Ganesh with exact instructions.

---

## Task 1: Scaffold the `samsung-curacao` repo

**Files:**
- Create: `/home/ganesh/samsung-curacao/README.md`
- Create: `/home/ganesh/samsung-curacao/.gitignore`
- Create: `/home/ganesh/samsung-curacao/manifest.json`
- Create: `/home/ganesh/samsung-curacao/robots.txt`
- Create: `/home/ganesh/samsung-curacao/_redirects`
- Create: `/home/ganesh/samsung-curacao/sitemap.xml`

- [ ] **Step 1.1: Create repo directory and initialize git**

```bash
mkdir -p /home/ganesh/samsung-curacao/{css,js,data,img/products,img/og,a37,a57,compare}
cd /home/ganesh/samsung-curacao
git init -b main
git config user.name "ganesh"
git config user.email "gvanvani@gmail.com"
```

- [ ] **Step 1.2: Write `.gitignore`**

```
.DS_Store
node_modules/
.playwright-mcp/
.env
.env.*
*.log
.netlify/
```

- [ ] **Step 1.3: Write `README.md`**

```markdown
# Samsung Curaçao

Samsung-only microsite at [samsungcuracao.com](https://samsungcuracao.com), showcasing the Galaxy lineup available at Connections Curaçao.

## Pages
- `/` — Launch hero + full Samsung catalog
- `/a37` — Galaxy A37 5G
- `/a57` — Galaxy A57 5G
- `/compare` — A37 vs A57

## Stack
Static HTML, shared CSS (`css/shared.css`), vanilla JS (`js/catalog.js`). Deployed on Netlify.

## Local preview
```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Related
- Main site: [connectionscuracao.net](https://connectionscuracao.net) (repo: `gvanx/connections-curacao`)
```

- [ ] **Step 1.4: Write `manifest.json`**

```json
{
  "name": "Samsung Curaçao",
  "short_name": "Samsung CW",
  "description": "Samsung Galaxy phones at Connections Curaçao",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#08080c",
  "theme_color": "#4ca4d4"
}
```

- [ ] **Step 1.5: Write `robots.txt`**

```
User-agent: *
Allow: /

Sitemap: https://samsungcuracao.com/sitemap.xml
```

- [ ] **Step 1.6: Write `_redirects`**

```
/a37       /a37/index.html      200
/a57       /a57/index.html      200
/compare   /compare/index.html  200
```

- [ ] **Step 1.7: Write `sitemap.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://samsungcuracao.com/</loc><priority>1.0</priority></url>
  <url><loc>https://samsungcuracao.com/a37</loc><priority>0.9</priority></url>
  <url><loc>https://samsungcuracao.com/a57</loc><priority>0.9</priority></url>
  <url><loc>https://samsungcuracao.com/compare</loc><priority>0.8</priority></url>
</urlset>
```

- [ ] **Step 1.8: Commit scaffold**

```bash
cd /home/ganesh/samsung-curacao
git add .
git commit -m "Initial scaffold: directory structure, manifest, robots, redirects, sitemap"
```

Expected: clean `git status`, one commit in log.

---

## Task 2: Build shared CSS (`css/shared.css`)

**Files:**
- Create: `/home/ganesh/samsung-curacao/css/shared.css`

- [ ] **Step 2.1: Write `css/shared.css`**

```css
/* ---- Design tokens ---- */
:root {
  --bg: #08080c;
  --surface: rgba(12, 12, 18, 0.72);
  --line: rgba(120, 130, 210, 0.2);
  --text: #eceaf5;
  --muted: #9a98b0;
  --brand: #7878d4;
  --brand-2: #9898f0;
  --accent-a37: #4ca4d4;
  --accent-a57: #b484f0;
  --save: #4ade80;
  --shadow: 0 28px 64px rgba(0,0,0,0.5);
  --radius-lg: 24px;
  --radius-md: 16px;
  --radius-sm: 10px;
  --font-display: "Outfit", "Avenir Next", sans-serif;
  --font-body: "Figtree", "Segoe UI", sans-serif;
}

* { box-sizing: border-box; }
html { margin: 0; padding: 0; scroll-behavior: smooth; }

body {
  margin: 0; padding: 0;
  font-family: var(--font-body);
  color: var(--text);
  background:
    radial-gradient(800px 400px at 25% 8%, rgba(76,164,212,0.1), transparent 60%),
    radial-gradient(800px 400px at 75% 8%, rgba(180,132,240,0.1), transparent 60%),
    radial-gradient(600px 350px at 50% 90%, rgba(120,120,212,0.06), transparent 55%),
    linear-gradient(170deg, #08060e 0%, #0a0a10 48%, #08060e 100%);
  min-height: 100%;
  padding-bottom: 7rem;
}

body::before {
  content: "";
  position: fixed; inset: 0;
  pointer-events: none; z-index: 100; opacity: 0.028;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 180px;
}

a { color: inherit; text-decoration: none; }
.shell { width: min(1100px, calc(100% - 2rem)); margin: 0 auto; }

/* ---- Topbar ---- */
.topbar {
  position: sticky; top: 0; z-index: 30;
  backdrop-filter: blur(14px);
  background: rgba(8,8,12,0.8);
  border-bottom: 1px solid var(--line);
}
.topbar-row {
  min-height: 68px;
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
}
.brand {
  display: inline-flex; align-items: center; gap: 0.7rem;
  font-family: var(--font-display); font-weight: 700; letter-spacing: 0.01em;
}
.brand-dot {
  width: 13px; height: 13px; border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-a37), var(--accent-a57));
  box-shadow: 0 0 0 6px rgba(120,130,210,0.15);
}
.topbar-actions { display: inline-flex; align-items: center; gap: 0.55rem; }
.nav-back {
  border-radius: 999px;
  border: 1px solid rgba(120,130,210,0.22);
  background: rgba(12,12,18,0.45);
  padding: 0.5rem 0.85rem; font-size: 0.85rem; color: #b8b8d4; font-weight: 600;
}
.nav-tag {
  display: inline-flex; gap: 0.4rem; align-items: center;
  border-radius: 999px;
  border: 1px solid rgba(120,130,210,0.4);
  background: rgba(120,130,210,0.12);
  padding: 0.5rem 0.9rem; font-weight: 700; font-size: 0.85rem;
  color: var(--brand-2); letter-spacing: 0.03em;
}

/* ---- Buttons ---- */
.btn {
  border: 0; cursor: pointer; border-radius: 999px;
  padding: 0.88rem 1.5rem; font-weight: 700; font-size: 0.95rem;
  font-family: var(--font-body);
  transition: transform 160ms ease, box-shadow 160ms ease;
  display: inline-block; text-align: center;
}
.btn:hover { transform: translateY(-2px); }
.btn-primary {
  color: #08060e;
  background: linear-gradient(135deg, var(--brand-2), var(--brand));
  box-shadow: 0 10px 30px rgba(120,130,210,0.3);
}
.btn-primary:hover { box-shadow: 0 14px 40px rgba(120,130,210,0.4); }
.btn-a37 {
  color: #060a0e;
  background: linear-gradient(135deg, #5ec4f0, #4ca4d4);
  box-shadow: 0 10px 30px rgba(76,164,212,0.3);
}
.btn-a57 {
  color: #0a060e;
  background: linear-gradient(135deg, #b484f0, #9464d4);
  box-shadow: 0 10px 30px rgba(148,100,212,0.3);
}
.btn-ghost {
  color: var(--text);
  border: 1px solid rgba(120,130,210,0.28);
  background: rgba(12,12,18,0.5);
}

/* ---- Shared section styles ---- */
section { padding: 3rem 0; }
.section-title {
  margin: 0; font-family: var(--font-display);
  font-size: clamp(1.4rem, 3.5vw, 2rem); font-weight: 800; letter-spacing: -0.01em;
}
.section-note {
  margin: 0.4rem 0 0; color: var(--muted); line-height: 1.55; max-width: 56ch;
}
.badge {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.38rem 0.85rem; border-radius: 999px;
  border: 1px solid rgba(120,130,210,0.4);
  background: rgba(120,130,210,0.1);
  font-size: 0.78rem; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--brand-2);
}

/* ---- Footer ---- */
footer {
  padding: 4rem 0 6rem; color: var(--muted); text-align: center;
  font-size: 0.88rem; line-height: 1.6;
}
footer a { color: var(--brand); border-bottom: 1px solid rgba(120,130,210,0.3); }

/* ---- Reveal ---- */
.reveal { opacity: 1; transform: none; }
.js .reveal { opacity: 0; transform: translateY(18px); transition: opacity 480ms ease, transform 480ms ease; }
.js .reveal.in { opacity: 1; transform: translateY(0); }

/* ---- Sticky CTA ---- */
.sticky-cta {
  position: fixed; left: 50%; bottom: 1rem; transform: translateX(-50%);
  z-index: 40;
  width: min(620px, calc(100% - 1rem));
  border-radius: 14px;
  border: 1px solid rgba(120,130,210,0.35);
  background: rgba(8,8,12,0.88);
  backdrop-filter: blur(12px);
  display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
  padding: 0.65rem 0.8rem;
  box-shadow: 0 16px 40px rgba(0,0,0,0.5);
}
.sticky-cta strong {
  font-size: 0.88rem; font-family: var(--font-display); font-weight: 700;
}
.sticky-cta p { margin: 0; font-size: 0.78rem; color: #a8a8c0; }
.sticky-cta .btn { padding: 0.55rem 1rem; font-size: 0.82rem; flex-shrink: 0; }

@media (max-width: 600px) {
  .sticky-cta { width: calc(100% - 0.9rem); left: 0.45rem; transform: none; }
  .sticky-cta p { display: none; }
  .topbar-actions { gap: 0.35rem; }
  .nav-back, .nav-tag { font-size: 0.78rem; padding: 0.45rem 0.65rem; }
  section { padding: 2.2rem 0; }
}
```

- [ ] **Step 2.2: Commit**

```bash
cd /home/ganesh/samsung-curacao
git add css/shared.css
git commit -m "Add shared CSS: tokens, topbar, buttons, footer, sticky CTA"
```

---

## Task 3: Build Samsung catalog data and loader

**Files:**
- Create: `/home/ganesh/samsung-curacao/data/products.json`
- Create: `/home/ganesh/samsung-curacao/js/catalog.js`

- [ ] **Step 3.1: Write `data/products.json` (Samsung slice)**

Copy every `category: "samsung"` entry from `connections-curacao/data/products.json`, update A37/A57 `landingPage` to the new paths. File should be exactly this:

```json
[
  { "name": "Galaxy A37 5G", "suffix": "", "price": 0, "category": "samsung", "featured": true, "image": "galaxy-a37-model.jpg", "landingPage": "/a37" },
  { "name": "Galaxy A57 5G", "suffix": "", "price": 0, "category": "samsung", "featured": true, "image": "galaxy-a57-model.jpg", "landingPage": "/a57" },
  { "name": "Galaxy S25 Ultra", "suffix": "", "price": 2090, "category": "samsung", "featured": true, "image": "galaxy-s25-ultra-model.jpg" },
  { "name": "Galaxy S25 Plus", "suffix": "", "price": 1549, "category": "samsung", "featured": true, "image": "galaxy-s25-plus-model.jpg" },
  { "name": "Galaxy S25 FE", "suffix": "", "price": 1290, "category": "samsung", "featured": true, "image": "galaxy-s25-fe-model.jpg" },
  { "name": "Galaxy S24 Ultra", "suffix": "", "price": 1850, "category": "samsung", "featured": true, "image": "galaxy-s24-ultra-model.jpg" },
  { "name": "Galaxy S24 FE", "suffix": "", "price": 849, "category": "samsung", "featured": false, "image": "galaxy-s24-fe-model.jpg" },
  { "name": "Galaxy A56", "suffix": "", "price": 675, "category": "samsung", "featured": true, "image": "galaxy-a56-model.jpg" },
  { "name": "Galaxy A36", "suffix": "", "price": 575, "category": "samsung", "featured": false, "image": "galaxy-a36-model.jpg" },
  { "name": "Galaxy A26", "suffix": "", "price": 399, "category": "samsung", "featured": false, "image": "galaxy-a26-model.jpg" },
  { "name": "Galaxy A17", "suffix": "", "price": 349, "category": "samsung", "featured": false, "image": "galaxy-a17-model.jpg" },
  { "name": "Galaxy A16", "suffix": "", "price": 289, "category": "samsung", "featured": false, "image": "galaxy-a16-model.jpg" },
  { "name": "Galaxy A07", "suffix": "", "price": 199, "category": "samsung", "featured": false, "image": "galaxy-a07-model.jpg" }
]
```

- [ ] **Step 3.2: Write `js/catalog.js`**

```javascript
const WA = '59996782619';
const WA_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.6-.9-2.2-.2-.6-.5-.5-.7-.5-.2 0-.4 0-.6 0-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4 0 1.4 1 2.8 1.2 3 .2.2 2 3 4.7 4.2 2.7 1.1 2.7.8 3.2.7.5 0 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3M12 2a10 10 0 00-8.8 15l-1.2 4.3 4.4-1.2A10 10 0 1012 2"/></svg>';

function waUrl(message) {
  return `https://wa.me/${WA}?text=${encodeURIComponent(message)}`;
}

async function loadCatalog() {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;
  try {
    const res = await fetch('data/products.json', { cache: 'no-store' });
    const products = await res.json();
    const featured = products.filter(p => p.featured);
    const rest = products.filter(p => !p.featured);
    const ordered = [...featured, ...rest];

    grid.innerHTML = ordered.map(p => {
      const name = p.name + (p.suffix ? ' ' + p.suffix : '');
      const price = p.price ? `<span class="tile-price">NAf ${p.price.toLocaleString()}</span>` : `<span class="tile-price muted">Message for pricing</span>`;
      const cta = p.landingPage
        ? `<a class="btn btn-ghost tile-cta" href="${p.landingPage}">View details</a>`
        : `<a class="btn btn-ghost tile-cta" target="_blank" rel="noopener" href="${waUrl("Hi, I'm interested in the " + name + ". Is it available?")}">${WA_ICON} WhatsApp</a>`;
      const badge = p.featured ? '<span class="tile-badge">Featured</span>' : '';
      return `
        <article class="tile ${p.featured ? 'tile-featured' : ''}">
          ${badge}
          <img src="img/products/${p.image}" alt="${name}" loading="lazy" onerror="this.style.visibility='hidden'">
          <h3 class="tile-name">${name}</h3>
          ${price}
          ${cta}
        </article>`;
    }).join('');
  } catch (e) {
    grid.innerHTML = '<p class="section-note">Catalog is loading. Refresh in a moment, or <a href="https://wa.me/' + WA + '">message us on WhatsApp</a>.</p>';
  }
}

function initReveal() {
  document.documentElement.classList.add('js');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.transitionDelay = (i * 80) + 'ms';
    observer.observe(el);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  loadCatalog();
});
```

- [ ] **Step 3.3: Commit**

```bash
cd /home/ganesh/samsung-curacao
git add data/products.json js/catalog.js
git commit -m "Add Samsung catalog data and loader JS"
```

---

## Task 4: Copy Samsung product images from `connections-curacao`

**Files:**
- Create: 13 `.jpg` files in `/home/ganesh/samsung-curacao/img/products/`

- [ ] **Step 4.1: Copy all Samsung product images**

```bash
cd /home/ganesh/samsung-curacao/img/products/
cp /home/ganesh/connections-curacao/img/products/galaxy-a07-model.jpg .
cp /home/ganesh/connections-curacao/img/products/galaxy-a16-model.jpg .
cp /home/ganesh/connections-curacao/img/products/galaxy-a17-model.jpg .
cp /home/ganesh/connections-curacao/img/products/galaxy-a26-model.jpg .
cp /home/ganesh/connections-curacao/img/products/galaxy-a36-model.jpg .
cp /home/ganesh/connections-curacao/img/products/galaxy-a56-model.jpg .
cp /home/ganesh/connections-curacao/img/products/galaxy-s24-fe-model.jpg .
cp /home/ganesh/connections-curacao/img/products/galaxy-s24-ultra-model.jpg .
cp /home/ganesh/connections-curacao/img/products/galaxy-s25-fe-model.jpg .
cp /home/ganesh/connections-curacao/img/products/galaxy-s25-plus-model.jpg .
cp /home/ganesh/connections-curacao/img/products/galaxy-s25-ultra-model.jpg .
ls -1 | wc -l
```

Expected: `11` (no A37/A57 images yet — those are generated next task).

- [ ] **Step 4.2: Generate placeholder A37 and A57 images as SVG-rendered phones**

Write an SVG and convert to JPG using ImageMagick. First create the SVG source files. A37 in blue, A57 in purple.

```bash
cat > /tmp/a37.svg <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a1520"/>
      <stop offset="1" stop-color="#1a3648"/>
    </linearGradient>
    <linearGradient id="phone" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5ec4f0"/>
      <stop offset="1" stop-color="#3a8bb8"/>
    </linearGradient>
    <linearGradient id="screen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1a2040"/>
      <stop offset="1" stop-color="#0f1528"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#bg)"/>
  <g transform="translate(130,60)">
    <rect x="0" y="0" width="140" height="280" rx="22" fill="url(#phone)"/>
    <rect x="6" y="6" width="128" height="268" rx="18" fill="url(#screen)"/>
    <circle cx="70" cy="24" r="4" fill="#08080c"/>
  </g>
  <text x="200" y="370" text-anchor="middle" font-family="Outfit, Avenir, sans-serif" font-weight="900" font-size="28" fill="#5ec4f0">A37 5G</text>
</svg>
SVG

cat > /tmp/a57.svg <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#120a20"/>
      <stop offset="1" stop-color="#2e1a48"/>
    </linearGradient>
    <linearGradient id="phone" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b484f0"/>
      <stop offset="1" stop-color="#7a4ec8"/>
    </linearGradient>
    <linearGradient id="screen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#201a40"/>
      <stop offset="1" stop-color="#140f28"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#bg)"/>
  <g transform="translate(130,60)">
    <rect x="0" y="0" width="140" height="280" rx="22" fill="url(#phone)"/>
    <rect x="6" y="6" width="128" height="268" rx="18" fill="url(#screen)"/>
    <circle cx="70" cy="24" r="4" fill="#08080c"/>
  </g>
  <text x="200" y="370" text-anchor="middle" font-family="Outfit, Avenir, sans-serif" font-weight="900" font-size="28" fill="#b484f0">A57 5G</text>
</svg>
SVG

# Convert SVG → JPG. Check if ImageMagick is available.
which convert || which magick
```

If ImageMagick is available:

```bash
convert /tmp/a37.svg /home/ganesh/samsung-curacao/img/products/galaxy-a37-model.jpg
convert /tmp/a57.svg /home/ganesh/samsung-curacao/img/products/galaxy-a57-model.jpg
```

If not, use `rsvg-convert` or fall back to copying the SVG and renaming — but first verify with `which`:

```bash
which rsvg-convert && \
rsvg-convert /tmp/a37.svg -o /home/ganesh/samsung-curacao/img/products/galaxy-a37-model.jpg --format=jpeg && \
rsvg-convert /tmp/a57.svg -o /home/ganesh/samsung-curacao/img/products/galaxy-a57-model.jpg --format=jpeg
```

If neither is available, install with `sudo apt-get install -y imagemagick` (requires sudo — ask Ganesh).

Verify: `ls -la /home/ganesh/samsung-curacao/img/products/galaxy-a*.jpg` should show 2 new files ~5–20KB each.

- [ ] **Step 4.3: Commit images**

```bash
cd /home/ganesh/samsung-curacao
git add img/products/
git commit -m "Add Samsung product images (including placeholder A37/A57 renders)"
```

---

## Task 5: Build the microsite home page (`/index.html`)

**Files:**
- Create: `/home/ganesh/samsung-curacao/index.html`

- [ ] **Step 5.1: Write `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Samsung Curaçao — Galaxy Phones at Connections</title>
  <meta name="description" content="Galaxy A37, A57, S25 Ultra and the full Samsung lineup. Available at Connections Punda &amp; Otrobanda.">
  <meta property="og:title" content="Samsung Curaçao — Galaxy Phones at Connections">
  <meta property="og:description" content="The new Galaxy A-series is here. A37 &amp; A57 5G now in stock.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://samsungcuracao.com/">
  <meta property="og:image" content="https://samsungcuracao.com/img/og/home.svg">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="https://samsungcuracao.com/">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' x1='0' x2='1'><stop offset='0' stop-color='%234ca4d4'/><stop offset='1' stop-color='%23b484f0'/></linearGradient></defs><circle cx='50' cy='50' r='45' fill='url(%23g)'/></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/shared.css">
  <style>
    .hero { position: relative; isolation: isolate; padding: 5rem 0 3rem; text-align: center; }
    .hero::before {
      content: ""; position: absolute; inset: 0; z-index: -1;
      background: radial-gradient(50% 70% at 50% 30%, rgba(120,130,210,0.1), transparent 70%);
      pointer-events: none;
    }
    .hero h1 {
      margin: 1.2rem 0 0; font-family: var(--font-display);
      font-size: clamp(2.4rem, 8vw, 5rem);
      font-weight: 900; line-height: 0.98; letter-spacing: -0.03em;
    }
    .c-a37 { color: var(--accent-a37); }
    .c-a57 { color: var(--accent-a57); }
    .hero-sub { margin: 0.9rem auto 0; color: var(--muted); font-size: 1.05rem; max-width: 52ch; }
    .hero-phones { display: flex; justify-content: center; gap: 1rem; margin: 2rem 0 1rem; flex-wrap: wrap; }
    .hero-phone {
      width: 120px; height: 220px; border-radius: 22px;
      background: linear-gradient(180deg, rgba(30,30,50,0.8), rgba(12,12,18,0.95));
      border: 1px solid var(--line); position: relative;
      box-shadow: var(--shadow);
    }
    .hero-phone::after {
      content: ""; position: absolute; inset: 8px; border-radius: 16px;
      background: linear-gradient(180deg, var(--accent-c), transparent 70%);
      opacity: 0.5;
    }
    .hero-phone.a37 { --accent-c: rgba(76,164,212,0.6); }
    .hero-phone.a57 { --accent-c: rgba(180,132,240,0.6); }
    .hero-phone-label {
      position: absolute; bottom: -1.6rem; left: 0; right: 0; text-align: center;
      font-family: var(--font-display); font-weight: 800; font-size: 0.9rem;
    }
    .hero-cta { margin-top: 2.5rem; display: flex; justify-content: center; flex-wrap: wrap; gap: 0.7rem; }

    .feature-strip {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.9rem;
      margin-top: 1.6rem;
    }
    .feature-card {
      background: var(--surface); border: 1px solid var(--line);
      border-radius: var(--radius-md); padding: 1.2rem;
      display: grid; gap: 0.4rem;
    }
    .feature-key { font-family: var(--font-display); font-size: 1.2rem; font-weight: 800; color: var(--brand-2); }
    .feature-label { margin: 0; font-weight: 700; }
    .feature-desc { margin: 0; color: var(--muted); font-size: 0.88rem; line-height: 1.5; }

    .catalog-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
      gap: 1rem; margin-top: 1.8rem;
    }
    .tile {
      position: relative;
      background: linear-gradient(165deg, rgba(12,12,18,0.92), rgba(10,10,14,0.88));
      border: 1px solid var(--line); border-radius: var(--radius-md);
      padding: 1.1rem; display: flex; flex-direction: column; gap: 0.5rem;
      transition: border-color 180ms ease, transform 180ms ease;
    }
    .tile:hover { border-color: rgba(120,130,210,0.45); transform: translateY(-3px); }
    .tile-featured { border-color: rgba(120,130,210,0.35); }
    .tile img { width: 100%; height: 140px; object-fit: contain; }
    .tile-name { margin: 0; font-weight: 800; font-family: var(--font-display); font-size: 1rem; letter-spacing: -0.01em; }
    .tile-price { color: var(--text); font-weight: 700; font-size: 0.9rem; }
    .tile-price.muted { color: var(--muted); font-weight: 500; font-size: 0.82rem; }
    .tile-cta { margin-top: auto; font-size: 0.82rem; padding: 0.55rem 0.9rem; }
    .tile-badge {
      position: absolute; top: 0.7rem; right: 0.7rem;
      font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em;
      font-weight: 800; color: var(--brand-2);
      background: rgba(120,130,210,0.12); border: 1px solid rgba(120,130,210,0.3);
      padding: 0.2rem 0.5rem; border-radius: 999px;
    }

    .store-panel {
      margin-top: 1.6rem; border-radius: var(--radius-lg);
      border: 1px solid var(--line);
      background: linear-gradient(165deg, rgba(12,12,18,0.9), rgba(10,10,14,0.88));
      box-shadow: var(--shadow); padding: 1.8rem;
      display: grid; grid-template-columns: 1fr auto; gap: 1.5rem; align-items: start;
    }
    .store-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.65rem; }
    .store-item { display: flex; gap: 0.6rem; align-items: flex-start; font-size: 0.9rem; line-height: 1.5; color: #b0b0c8; }
    .store-item .icon { flex-shrink: 0; }
    .store-item strong { color: var(--text); }
    .store-cta { display: flex; flex-direction: column; gap: 0.5rem; align-self: center; }
    .store-cta .btn { text-align: center; white-space: nowrap; min-width: 200px; }
    .panel-title { margin: 0 0 1rem; font-family: var(--font-display); font-size: 1.15rem; font-weight: 700; }

    @media (max-width: 900px) {
      .feature-strip { grid-template-columns: 1fr; }
    }
    @media (max-width: 840px) {
      .store-panel { grid-template-columns: 1fr; }
      .store-cta { align-self: stretch; }
      .store-cta .btn { min-width: 0; width: 100%; }
    }
  </style>
</head>
<body>

  <header class="topbar">
    <div class="shell topbar-row">
      <a href="/" class="brand" aria-label="Samsung Curaçao home">
        <span class="brand-dot" aria-hidden="true"></span>
        <span>Samsung Curaçao</span>
      </a>
      <div class="topbar-actions">
        <a class="nav-back" href="#stores">Visit</a>
        <a class="nav-tag" href="https://wa.me/59996782619" target="_blank" rel="noopener">WhatsApp</a>
      </div>
    </div>
  </header>

  <main>
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

    <section id="features">
      <div class="shell">
        <h2 class="section-title">Flagship features. A-series pricing.</h2>
        <div class="feature-strip reveal">
          <div class="feature-card">
            <div class="feature-key">IP68</div>
            <p class="feature-label">Water &amp; dust proof</p>
            <p class="feature-desc">Survives 1.5m underwater for 30 minutes. Rain, pool, accidents — covered.</p>
          </div>
          <div class="feature-card">
            <div class="feature-key">120Hz</div>
            <p class="feature-label">Super AMOLED display</p>
            <p class="feature-desc">6.7-inch FHD+ with Gorilla Glass Victus+ on both models.</p>
          </div>
          <div class="feature-card">
            <div class="feature-key">6yr</div>
            <p class="feature-label">Android updates</p>
            <p class="feature-desc">Six generations of OS upgrades plus six years of security patches.</p>
          </div>
        </div>
      </div>
    </section>

    <section id="catalog">
      <div class="shell">
        <h2 class="section-title">The full Samsung lineup</h2>
        <p class="section-note">From the everyday A07 to the flagship S25 Ultra — available at both locations.</p>
        <div id="catalog-grid" class="catalog-grid reveal"></div>
      </div>
    </section>

    <section id="stores">
      <div class="shell">
        <h2 class="section-title">Come see them in person</h2>
        <p class="section-note">Compare side by side. Walk in, try them, walk out with your new Galaxy.</p>
        <div class="store-panel reveal">
          <div>
            <h3 class="panel-title">Our stores</h3>
            <ul class="store-list">
              <li class="store-item"><span class="icon">📍</span><div><strong>Connections Punda</strong><br>Ruyterkade 28, Willemstad</div></li>
              <li class="store-item"><span class="icon">📍</span><div><strong>Connections Otrobanda</strong><br>Bredestraat 12, Willemstad</div></li>
              <li class="store-item"><span class="icon">🕔</span><div>Mon–Sat 9:00–18:00</div></li>
            </ul>
          </div>
          <div class="store-cta">
            <a class="btn btn-primary" href="https://wa.me/59996782619?text=Hi%2C%20I%27m%20interested%20in%20a%20Samsung%20Galaxy.%20Can%20you%20help%3F" target="_blank" rel="noopener">Ask via WhatsApp</a>
            <a class="btn btn-ghost" href="https://connectionscuracao.net?utm_source=samsungcuracao&amp;utm_medium=referral">See full catalog</a>
          </div>
        </div>
      </div>
    </section>
  </main>

  <div class="sticky-cta">
    <div>
      <strong>Galaxy A37 &amp; A57 5G</strong>
      <p>Now at Connections Curaçao</p>
    </div>
    <a class="btn btn-a37" href="/a37">A37</a>
    <a class="btn btn-a57" href="/a57">A57</a>
  </div>

  <footer>
    <div class="shell">
      Samsung Curaçao · Official Samsung retailer at <a href="https://connectionscuracao.net?utm_source=samsungcuracao&amp;utm_medium=referral">Connections Curaçao</a><br>
      Punda · Otrobanda · WhatsApp +599 9678 2619
    </div>
  </footer>

  <script src="js/catalog.js"></script>
</body>
</html>
```

- [ ] **Step 5.2: Start local server and verify with Playwright**

In a new terminal (or background):

```bash
cd /home/ganesh/samsung-curacao
python3 -m http.server 8000
```

Then use Playwright MCP:

```
mcp__plugin_playwright_playwright__browser_navigate → http://localhost:8000/
mcp__plugin_playwright_playwright__browser_snapshot
```

Check:
- Page title is "Samsung Curaçao — Galaxy Phones at Connections"
- Hero `<h1>` contains "A37" and "A57"
- `#catalog-grid` has at least 13 tile elements rendered (verify via JS evaluate if needed)
- No console errors (`browser_console_messages`)

```
mcp__plugin_playwright_playwright__browser_evaluate →
  () => document.querySelectorAll('.tile').length
```

Expected: 13. If 0, catalog.js fetch failed — check that you're serving over HTTP (not `file://`).

```
mcp__plugin_playwright_playwright__browser_take_screenshot → /tmp/sc-home.png
```

- [ ] **Step 5.3: Commit**

```bash
cd /home/ganesh/samsung-curacao
git add index.html
git commit -m "Build microsite home: launch hero, feature strip, Samsung catalog, stores"
```

---

## Task 6: Build the A37 dedicated page (`/a37/index.html`)

**Files:**
- Create: `/home/ganesh/samsung-curacao/a37/index.html`

- [ ] **Step 6.1: Write `a37/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Galaxy A37 5G — Samsung Curaçao</title>
  <meta name="description" content="The new Galaxy A37 5G at Connections Curaçao. IP68, 50MP, 6 years of updates. Punda &amp; Otrobanda.">
  <meta property="og:title" content="Galaxy A37 5G — Samsung Curaçao">
  <meta property="og:description" content="Built to last. Six years of updates, IP68, 120Hz AMOLED.">
  <meta property="og:type" content="product">
  <meta property="og:url" content="https://samsungcuracao.com/a37">
  <meta property="og:image" content="https://samsungcuracao.com/img/og/a37.svg">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="https://samsungcuracao.com/a37">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%234ca4d4'/></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/shared.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": "Samsung Galaxy A37 5G",
    "description": "The new Galaxy A37 5G. IP68, 50MP camera, 5000mAh, 6 years of updates.",
    "brand": { "@type": "Brand", "name": "Samsung" },
    "category": "Smartphones",
    "offers": {
      "@type": "Offer",
      "priceCurrency": "ANG",
      "availability": "https://schema.org/InStock",
      "url": "https://samsungcuracao.com/a37",
      "seller": { "@type": "Organization", "name": "Connections Curaçao" }
    }
  }
  </script>
  <style>
    .hero { position: relative; padding: 5rem 0 3rem; text-align: center; }
    .hero::before {
      content: ""; position: absolute; inset: 0; z-index: -1;
      background: radial-gradient(50% 70% at 50% 30%, rgba(76,164,212,0.12), transparent 70%);
    }
    .hero h1 {
      margin: 1.2rem 0 0; font-family: var(--font-display);
      font-size: clamp(2.8rem, 10vw, 6rem);
      font-weight: 900; line-height: 0.95; letter-spacing: -0.03em;
      color: var(--accent-a37);
    }
    .hero-sub { margin: 0.8rem auto 0; color: var(--muted); font-size: 1.1rem; max-width: 52ch; }
    .hero-phone-wrap { display: flex; justify-content: center; margin: 2.2rem 0 1rem; }
    .hero-phone {
      width: 180px; height: 340px; border-radius: 28px;
      background: linear-gradient(180deg, rgba(30,40,60,0.9), rgba(12,12,18,0.98));
      border: 1px solid rgba(76,164,212,0.3);
      box-shadow: 0 40px 80px rgba(76,164,212,0.2);
      position: relative;
    }
    .hero-phone::after {
      content: ""; position: absolute; inset: 10px; border-radius: 20px;
      background: linear-gradient(180deg, rgba(76,164,212,0.6), transparent 65%);
    }
    .hero-cta { margin-top: 2rem; display: flex; justify-content: center; flex-wrap: wrap; gap: 0.7rem; }

    .quick-specs {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.8rem;
      margin-top: 1.6rem;
    }
    .quick-spec {
      background: var(--surface); border: 1px solid var(--line);
      border-radius: var(--radius-md); padding: 1rem; text-align: center;
    }
    .quick-spec strong { display: block; font-family: var(--font-display); font-size: 1.3rem; font-weight: 800; color: var(--accent-a37); }
    .quick-spec span { color: var(--muted); font-size: 0.85rem; }

    .spec-table {
      margin-top: 1.6rem; border-radius: var(--radius-md);
      border: 1px solid var(--line); overflow: hidden;
    }
    .spec-row {
      display: grid; grid-template-columns: 1fr 1.2fr;
      padding: 0.9rem 1.2rem; border-bottom: 1px dashed rgba(120,130,210,0.12);
      font-size: 0.95rem;
    }
    .spec-row:last-child { border-bottom: 0; }
    .spec-row .label { color: var(--muted); }
    .spec-row .val { font-weight: 700; }

    .reasons { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 1.6rem; }
    .reason {
      background: var(--surface); border: 1px solid var(--line);
      border-radius: var(--radius-md); padding: 1.5rem;
    }
    .reason h3 { margin: 0 0 0.5rem; font-family: var(--font-display); font-weight: 800; color: var(--accent-a37); }
    .reason p { margin: 0; color: var(--muted); line-height: 1.55; font-size: 0.92rem; }

    .crosssell {
      margin-top: 2rem; padding: 2rem; text-align: center;
      background: linear-gradient(135deg, rgba(180,132,240,0.08), rgba(76,164,212,0.05));
      border: 1px solid rgba(180,132,240,0.2); border-radius: var(--radius-md);
    }
    .crosssell p { margin: 0 0 1rem; color: var(--muted); }

    .store-panel {
      margin-top: 1.6rem; border-radius: var(--radius-lg);
      border: 1px solid var(--line);
      background: linear-gradient(165deg, rgba(12,12,18,0.9), rgba(10,10,14,0.88));
      box-shadow: var(--shadow); padding: 1.8rem;
      display: grid; grid-template-columns: 1fr auto; gap: 1.5rem;
    }
    .store-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.65rem; }
    .store-item { display: flex; gap: 0.6rem; align-items: flex-start; font-size: 0.9rem; color: #b0b0c8; }
    .store-item strong { color: var(--text); }
    .store-cta { display: flex; flex-direction: column; gap: 0.5rem; align-self: center; }
    .panel-title { margin: 0 0 1rem; font-family: var(--font-display); font-size: 1.15rem; font-weight: 700; }

    @media (max-width: 800px) {
      .quick-specs { grid-template-columns: repeat(2, 1fr); }
      .reasons { grid-template-columns: 1fr; }
      .store-panel { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

  <header class="topbar">
    <div class="shell topbar-row">
      <a href="/" class="brand" aria-label="Samsung Curaçao home">
        <span class="brand-dot" aria-hidden="true"></span>
        <span>Samsung Curaçao</span>
      </a>
      <div class="topbar-actions">
        <a class="nav-back" href="/">← All Samsung</a>
        <span class="nav-tag">A37 5G</span>
      </div>
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="shell">
        <span class="badge">Now in stock</span>
        <h1>A37 5G</h1>
        <p class="hero-sub">Built to last. Six years of updates, IP68, 120Hz AMOLED — at the price you'd expect from A-series.</p>
        <div class="hero-phone-wrap"><div class="hero-phone"></div></div>
        <div class="hero-cta">
          <a class="btn btn-a37" href="https://wa.me/59996782619?text=Hi%2C%20I%27m%20interested%20in%20the%20Galaxy%20A37%205G.%20Is%20it%20available%3F" target="_blank" rel="noopener">Ask via WhatsApp</a>
          <a class="btn btn-ghost" href="/compare">Compare with A57</a>
        </div>
      </div>
    </section>

    <section>
      <div class="shell">
        <h2 class="section-title">At a glance</h2>
        <div class="quick-specs reveal">
          <div class="quick-spec"><strong>6.7"</strong><span>AMOLED 120Hz</span></div>
          <div class="quick-spec"><strong>50MP</strong><span>Main camera</span></div>
          <div class="quick-spec"><strong>5000</strong><span>mAh · 45W fast</span></div>
          <div class="quick-spec"><strong>IP68</strong><span>Water &amp; dust</span></div>
        </div>
      </div>
    </section>

    <section>
      <div class="shell">
        <h2 class="section-title">Full specifications</h2>
        <div class="spec-table reveal">
          <div class="spec-row"><span class="label">Display</span><span class="val">6.7" FHD+ Super AMOLED · 120Hz</span></div>
          <div class="spec-row"><span class="label">Processor</span><span class="val">Exynos 1480</span></div>
          <div class="spec-row"><span class="label">OS</span><span class="val">Android 16 · 6 years of updates</span></div>
          <div class="spec-row"><span class="label">Main camera</span><span class="val">50MP</span></div>
          <div class="spec-row"><span class="label">Ultra-wide</span><span class="val">8MP</span></div>
          <div class="spec-row"><span class="label">Macro</span><span class="val">5MP</span></div>
          <div class="spec-row"><span class="label">Front camera</span><span class="val">12MP</span></div>
          <div class="spec-row"><span class="label">Battery</span><span class="val">5000mAh · 45W fast charging</span></div>
          <div class="spec-row"><span class="label">RAM · Storage</span><span class="val">12GB · 256GB</span></div>
          <div class="spec-row"><span class="label">Weight · Thickness</span><span class="val">196g · 7.4mm</span></div>
          <div class="spec-row"><span class="label">Protection</span><span class="val">IP68 · Gorilla Glass Victus+</span></div>
          <div class="spec-row"><span class="label">Connectivity</span><span class="val">5G · Wi-Fi 6 · NFC</span></div>
        </div>
      </div>
    </section>

    <section>
      <div class="shell">
        <h2 class="section-title">Why A37</h2>
        <div class="reasons reveal">
          <article class="reason">
            <h3>Value</h3>
            <p>Flagship features — IP68, 120Hz AMOLED, 5000mAh — at A-series pricing. You stop paying for extras you don't need.</p>
          </article>
          <article class="reason">
            <h3>Durability</h3>
            <p>IP68 rated against water and dust. Gorilla Glass Victus+ up front. Built to survive Curaçao weather — and everything else.</p>
          </article>
          <article class="reason">
            <h3>Longevity</h3>
            <p>Six generations of Android upgrades plus six years of security patches. Buy once, use through 2032.</p>
          </article>
        </div>
      </div>
    </section>

    <section>
      <div class="shell">
        <div class="crosssell reveal">
          <p>Prefer flagship feel? Meet the <strong style="color: var(--accent-a57)">A57 5G</strong> — OIS camera, faster chip, slimmer build.</p>
          <a class="btn btn-a57" href="/a57">Explore A57</a>
        </div>
      </div>
    </section>

    <section id="stores">
      <div class="shell">
        <h2 class="section-title">Come try it</h2>
        <div class="store-panel reveal">
          <div>
            <h3 class="panel-title">Our stores</h3>
            <ul class="store-list">
              <li class="store-item"><span>📍</span><div><strong>Connections Punda</strong><br>Ruyterkade 28, Willemstad</div></li>
              <li class="store-item"><span>📍</span><div><strong>Connections Otrobanda</strong><br>Bredestraat 12, Willemstad</div></li>
              <li class="store-item"><span>🕔</span><div>Mon–Sat 9:00–18:00</div></li>
            </ul>
          </div>
          <div class="store-cta">
            <a class="btn btn-a37" href="https://wa.me/59996782619?text=Hi%2C%20I%27m%20interested%20in%20the%20Galaxy%20A37%205G.%20Is%20it%20available%3F" target="_blank" rel="noopener">WhatsApp about A37</a>
          </div>
        </div>
      </div>
    </section>
  </main>

  <div class="sticky-cta">
    <div>
      <strong>Galaxy A37 5G</strong>
      <p>Now at Connections Curaçao</p>
    </div>
    <a class="btn btn-a37" href="https://wa.me/59996782619?text=Hi%2C%20I%27m%20interested%20in%20the%20Galaxy%20A37%205G.%20Is%20it%20available%3F" target="_blank" rel="noopener">WhatsApp</a>
  </div>

  <footer>
    <div class="shell">
      Samsung Curaçao · <a href="/">All Samsung</a> · <a href="https://connectionscuracao.net?utm_source=samsungcuracao&amp;utm_medium=referral">Connections Curaçao</a>
    </div>
  </footer>

  <script>
    document.documentElement.classList.add('js');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('in'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.reveal').forEach((el, i) => {
      el.style.transitionDelay = (i * 80) + 'ms';
      observer.observe(el);
    });
  </script>
</body>
</html>
```

- [ ] **Step 6.2: Verify in Playwright**

```
mcp__plugin_playwright_playwright__browser_navigate → http://localhost:8000/a37/
mcp__plugin_playwright_playwright__browser_snapshot
```

Check:
- Title: "Galaxy A37 5G — Samsung Curaçao"
- h1: "A37 5G"
- Spec table rendered (`.spec-row` count ≥ 12)
- WhatsApp CTA href includes `Galaxy%20A37`
- No console errors

- [ ] **Step 6.3: Commit**

```bash
cd /home/ganesh/samsung-curacao
git add a37/index.html
git commit -m "Build A37 dedicated landing page"
```

---

## Task 7: Build the A57 dedicated page (`/a57/index.html`)

**Files:**
- Create: `/home/ganesh/samsung-curacao/a57/index.html`

- [ ] **Step 7.1: Write `a57/index.html`**

Same skeleton as A37 but with:
- All `--accent-a37` references swapped to `--accent-a57` in the inline `<style>`
- `.btn-a37` → `.btn-a57` everywhere except the cross-sell which points to A37
- Title: "Galaxy A57 5G — Samsung Curaçao"
- h1 "A57 5G" in purple
- Hero sub: "The upgrade. OIS camera, Galaxy AI, slimmer build — flagship feel, A-series value."
- Hero phone accent purple (`rgba(180,132,240, ...)`)
- Full spec table values differ:
  - Display: 6.7" FHD+ AMOLED · 120Hz
  - Processor: **Exynos 1680**
  - OS: Android 16 · Galaxy AI · 6 years of updates
  - Main camera: **50MP with OIS**
  - Ultra-wide: **12MP**
  - Macro: 5MP
  - Front: 12MP
  - Battery: 5000mAh · 45W
  - RAM · Storage: **12GB · up to 512GB**
  - Weight · Thickness: **179g · 6.9mm**
  - Protection: IP68 · Gorilla Glass Victus+
  - Connectivity: 5G · Wi-Fi 6E · NFC
- Quick-specs: 6.7" AMOLED 120Hz · 50MP OIS · 5000mAh · Galaxy AI
- Reasons:
  - "Pro-grade camera" — "OIS for sharp low-light shots. 12MP ultra-wide. The camera that used to be flagship-only."
  - "AI-powered" — "Galaxy AI on-device. Circle to Search, generative edit, live translate."
  - "Slim &amp; light" — "179g and 6.9mm — the thinnest A-series ever, without giving up battery or IP68."
- Cross-sell points to `/a37` with text "Want value-first? The A37 is built to last at A-series pricing."
- WhatsApp message text: "Galaxy A57 5G"
- Schema.org JSON-LD: name = "Samsung Galaxy A57 5G"

Full file: start from the Task 6 file, do global find/replace then edit the spec-table, quick-specs, reasons, and cross-sell blocks. Keep all other structure identical.

- [ ] **Step 7.2: Verify in Playwright**

```
mcp__plugin_playwright_playwright__browser_navigate → http://localhost:8000/a57/
```

Check:
- Title: "Galaxy A57 5G — Samsung Curaçao"
- h1: "A57 5G"
- One of the spec-table rows contains "Exynos 1680"
- One spec row contains "OIS"
- Cross-sell links to `/a37`

- [ ] **Step 7.3: Commit**

```bash
cd /home/ganesh/samsung-curacao
git add a57/index.html
git commit -m "Build A57 dedicated landing page"
```

---

## Task 8: Build the compare page (`/compare/index.html`)

**Files:**
- Create: `/home/ganesh/samsung-curacao/compare/index.html`

- [ ] **Step 8.1: Port the compare section from `connections-curacao/galaxy-a/index.html`**

Base the file on the structure of `/home/ganesh/connections-curacao/galaxy-a/index.html` lines 345–506 (the `<main>` content), but:
- Link `../css/shared.css` instead of inline CSS shared pieces
- Keep only the compare section and shared-features strip; move phone-specific spec comparison to a wider two-column table
- Add a row-by-row side-by-side spec comparison table where A57 "upgrade" cells are highlighted in purple
- Topbar: "← All Samsung"
- CTAs at bottom link to /a37 and /a57 respectively
- Title: "Galaxy A37 vs A57 5G — Samsung Curaçao"
- Meta description: "Side-by-side comparison. Same DNA — A57 adds OIS, faster chip, slimmer build."
- Canonical: `https://samsungcuracao.com/compare`

Inline CSS needs: `.compare-table` (2-column grid), `.compare-row` (3-cell: label | A37 | A57), `.compare-row .upgrade` (purple highlight), `.phone-header.a37`/`.a57` for table column headers.

Structure:

```html
<section>
  <div class="shell">
    <h2 class="section-title">A37 vs A57 5G</h2>
    <p class="section-note">Same DNA — IP68, 5000mAh, 120Hz AMOLED, 6 years of updates. The A57 adds OIS, a faster chip, and a slimmer build.</p>

    <div class="compare-table reveal">
      <div class="compare-head">
        <div></div>
        <div class="phone-header a37">A37 5G</div>
        <div class="phone-header a57">A57 5G</div>
      </div>
      <!-- rows: Display, Processor, Main camera, Ultra-wide, Macro, Front, Battery, RAM/Storage, Weight, Protection, OS -->
      <div class="compare-row">
        <div class="label">Main camera</div>
        <div class="val">50MP</div>
        <div class="val upgrade">50MP + OIS</div>
      </div>
      <!-- …repeat for all rows… -->
    </div>

    <div class="compare-cta">
      <a class="btn btn-a37" href="/a37">Explore A37</a>
      <a class="btn btn-a57" href="/a57">Explore A57</a>
    </div>
  </div>
</section>
```

Include the full shared-features strip (IP68, 120Hz, 45W, 6yr) ported verbatim from `galaxy-a/index.html` lines 429–454, then the store panel and sticky CTA matching the `/a37` file style but with both A37+A57 buttons in the sticky.

- [ ] **Step 8.2: Verify in Playwright**

```
mcp__plugin_playwright_playwright__browser_navigate → http://localhost:8000/compare/
```

Check:
- Title contains "A37 vs A57"
- Compare table has a row with "Main camera" → "50MP" for A37 and "50MP + OIS" for A57
- Both `Explore A37` and `Explore A57` CTAs present

- [ ] **Step 8.3: Commit**

```bash
cd /home/ganesh/samsung-curacao
git add compare/index.html
git commit -m "Build A37 vs A57 compare page"
```

---

## Task 9: Generate OG images

**Files:**
- Create: `/home/ganesh/samsung-curacao/img/og/home.svg`
- Create: `/home/ganesh/samsung-curacao/img/og/a37.svg`
- Create: `/home/ganesh/samsung-curacao/img/og/a57.svg`
- Create: `/home/ganesh/samsung-curacao/img/og/compare.svg`

- [ ] **Step 9.1: Write `img/og/home.svg`**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#08080c"/>
      <stop offset="1" stop-color="#14142a"/>
    </linearGradient>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#4ca4d4"/>
      <stop offset="1" stop-color="#b484f0"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <text x="80" y="180" font-family="Outfit, Avenir, sans-serif" font-weight="800" font-size="42" fill="#9898f0">SAMSUNG CURAÇAO</text>
  <text x="80" y="340" font-family="Outfit, Avenir, sans-serif" font-weight="900" font-size="110" fill="url(#brand)">Galaxy A37 &amp; A57</text>
  <text x="80" y="420" font-family="Outfit, Avenir, sans-serif" font-weight="900" font-size="110" fill="#eceaf5">Now in stock.</text>
  <text x="80" y="530" font-family="Figtree, sans-serif" font-size="32" fill="#9a98b0">At Connections Curaçao · Punda · Otrobanda</text>
</svg>
```

- [ ] **Step 9.2: Write `img/og/a37.svg`**

Same structure as home.svg, but:
- Main headline: "Galaxy A37 5G"
- Subline: "Built to last. IP68 · 50MP · 6 years of updates"
- Primary color: `#4ca4d4`
- Text `x="80" y="320"`: "Galaxy A37 5G" (font-size 130, fill #4ca4d4)

- [ ] **Step 9.3: Write `img/og/a57.svg`**

Same as a37.svg but color `#b484f0`, copy "Galaxy A57 5G / The upgrade. OIS · Galaxy AI · Flagship feel."

- [ ] **Step 9.4: Write `img/og/compare.svg`**

"A37 vs A57 5G" with both colors, subline "Side-by-side comparison at samsungcuracao.com"

- [ ] **Step 9.5: Commit**

```bash
cd /home/ganesh/samsung-curacao
git add img/og/
git commit -m "Add OG images for social previews"
```

---

## Task 10: Final local verification

- [ ] **Step 10.1: Run full site smoke test with Playwright**

With the local server still running on port 8000:

For each URL — `/`, `/a37`, `/a57`, `/compare`, `/a37/`, `/a57/`, `/compare/` — do:

```
mcp__plugin_playwright_playwright__browser_navigate → http://localhost:8000<path>
mcp__plugin_playwright_playwright__browser_console_messages
mcp__plugin_playwright_playwright__browser_take_screenshot
```

Expected:
- All 7 URLs return 200 and render (note: `/a37` without trailing slash returns the `a37/index.html` via Python's `http.server` auto-redirect, though on Netlify the `_redirects` rewrite handles it cleanly)
- Zero console errors across all pages
- All screenshots visually correct (hero visible, CTAs present)

- [ ] **Step 10.2: Mobile viewport check**

```
mcp__plugin_playwright_playwright__browser_resize → width: 390, height: 844
mcp__plugin_playwright_playwright__browser_navigate → http://localhost:8000/
mcp__plugin_playwright_playwright__browser_take_screenshot
```

Then repeat for `/a37`, `/a57`, `/compare`. Verify hero readable, buttons tappable, sticky CTA doesn't overlap content.

- [ ] **Step 10.3: Verify catalog JS fetches**

```
mcp__plugin_playwright_playwright__browser_navigate → http://localhost:8000/
mcp__plugin_playwright_playwright__browser_evaluate →
  () => document.querySelectorAll('.tile').length
```

Expected: 13.

- [ ] **Step 10.4: Verify WhatsApp links**

```
mcp__plugin_playwright_playwright__browser_evaluate →
  () => Array.from(document.querySelectorAll('a[href*="wa.me"]')).map(a => a.href)
```

Expected: every returned URL starts with `https://wa.me/59996782619?text=`.

- [ ] **Step 10.5: Stop local server**

Press Ctrl+C in the server terminal (or `kill %1` if backgrounded).

---

## Task 11: Add missing A37/A57 images to `connections-curacao`

**Files:**
- Copy to: `/home/ganesh/connections-curacao/img/products/galaxy-a37-model.jpg`
- Copy to: `/home/ganesh/connections-curacao/img/products/galaxy-a57-model.jpg`

- [ ] **Step 11.1: Copy the rendered images**

```bash
cp /home/ganesh/samsung-curacao/img/products/galaxy-a37-model.jpg /home/ganesh/connections-curacao/img/products/
cp /home/ganesh/samsung-curacao/img/products/galaxy-a57-model.jpg /home/ganesh/connections-curacao/img/products/
ls -la /home/ganesh/connections-curacao/img/products/galaxy-a{37,57}-model.jpg
```

Expected: both files exist.

---

## Task 12: Update `connections-curacao/data/products.json` landingPage values

**Files:**
- Modify: `/home/ganesh/connections-curacao/data/products.json`

- [ ] **Step 12.1: Edit A37 and A57 entries**

Change:
```json
"landingPage": "/galaxy-a/"
```
to:
```json
"landingPage": "https://samsungcuracao.com/a37"
```
for the Galaxy A37 5G entry, and `/a57` for the A57 entry.

Use the Edit tool with `old_string` = exact line from the file (check lines ~154 and ~171 of the file), `new_string` = same structure with the new URL.

- [ ] **Step 12.2: Verify JSON is still valid**

```bash
python3 -c "import json; json.load(open('/home/ganesh/connections-curacao/data/products.json'))" && echo "OK"
```

Expected: `OK`.

---

## Task 13: Add launch banner to `connections-curacao/index.html`

**Files:**
- Modify: `/home/ganesh/connections-curacao/index.html`

- [ ] **Step 13.1: Find the insertion point**

Use Grep to find `<!-- Deals Carousel -->` or the element with id `deals` in `/home/ganesh/connections-curacao/index.html`. The banner goes immediately *before* this block.

- [ ] **Step 13.2: Add banner HTML + CSS inline**

The banner is a single reusable block. Add CSS in the existing `<style>` tag (find where other section styles end) and HTML immediately before the deals section:

**CSS** (append to existing `<style>`):

```css
.launch-banner {
  position: relative;
  margin: 1.2rem auto 0;
  width: min(1100px, calc(100% - 2rem));
  border-radius: 18px;
  border: 1px solid rgba(120,130,210,0.35);
  background:
    linear-gradient(135deg, rgba(76,164,212,0.12), rgba(180,132,240,0.12)),
    rgba(12,12,18,0.6);
  padding: 1.2rem 3rem 1.2rem 1.4rem;
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  flex-wrap: wrap;
}
.launch-banner[hidden] { display: none; }
.launch-banner-text strong {
  display: block; font-family: "Outfit", sans-serif; font-weight: 800; font-size: 1.05rem;
  background: linear-gradient(90deg, #4ca4d4, #b484f0);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.launch-banner-text p { margin: 0.2rem 0 0; color: #b0b0c8; font-size: 0.92rem; }
.launch-banner-cta {
  display: inline-block; padding: 0.65rem 1.2rem; border-radius: 999px;
  font-weight: 700; font-size: 0.88rem;
  color: #08060e;
  background: linear-gradient(135deg, #b484f0, #4ca4d4);
  box-shadow: 0 10px 25px rgba(120,130,210,0.25);
  transition: transform 160ms ease;
}
.launch-banner-cta:hover { transform: translateY(-2px); }
.launch-banner-close {
  position: absolute; top: 0.6rem; right: 0.8rem;
  background: none; border: 0; color: #8a8aa0; cursor: pointer;
  font-size: 1.1rem; line-height: 1; padding: 0.3rem 0.5rem;
}
.launch-banner-close:hover { color: #eceaf5; }

@media (max-width: 600px) {
  .launch-banner { padding: 1rem 2.6rem 1rem 1.1rem; }
  .launch-banner-text strong { font-size: 0.95rem; }
  .launch-banner-text p { font-size: 0.82rem; }
  .launch-banner-cta { font-size: 0.82rem; padding: 0.55rem 1rem; }
}
```

**HTML** (insert before the deals carousel section):

```html
<aside id="launch-banner" class="launch-banner" role="region" aria-label="Samsung Galaxy A-series launch">
  <div class="launch-banner-text">
    <strong>The new Galaxy A-series is here.</strong>
    <p>A37 &amp; A57 5G, now at Connections. Dedicated site with full specs &amp; comparison.</p>
  </div>
  <a class="launch-banner-cta" href="https://samsungcuracao.com/?utm_source=connectionscuracao&amp;utm_medium=referral&amp;utm_campaign=galaxy-a-launch">Explore at samsungcuracao.com →</a>
  <button class="launch-banner-close" type="button" aria-label="Dismiss banner" onclick="this.parentElement.hidden=true;try{localStorage.setItem('launch-banner-galaxy-a-dismissed','1')}catch(e){}">✕</button>
</aside>
<script>
  try {
    if (localStorage.getItem('launch-banner-galaxy-a-dismissed') === '1') {
      document.getElementById('launch-banner').hidden = true;
    }
  } catch (e) {}
</script>
```

- [ ] **Step 13.3: Verify locally**

```bash
cd /home/ganesh/connections-curacao
python3 -m http.server 8001
```

```
mcp__plugin_playwright_playwright__browser_navigate → http://localhost:8001/
mcp__plugin_playwright_playwright__browser_take_screenshot
mcp__plugin_playwright_playwright__browser_evaluate →
  () => document.getElementById('launch-banner') !== null
```

Expected: banner visible above deals carousel, CTA href points to samsungcuracao.com.

- [ ] **Step 13.4: Test dismiss**

```
mcp__plugin_playwright_playwright__browser_click → selector: "#launch-banner .launch-banner-close"
mcp__plugin_playwright_playwright__browser_navigate → http://localhost:8001/
mcp__plugin_playwright_playwright__browser_evaluate →
  () => document.getElementById('launch-banner').hidden
```

Expected: `true` on the second visit.

Stop the server.

---

## Task 14: Update `/galaxy-a/` page with a pointer banner

**Files:**
- Modify: `/home/ganesh/connections-curacao/galaxy-a/index.html`

- [ ] **Step 14.1: Add a banner at the top of `<main>`**

Insert immediately after `<main>` and before `<section class="hero">`:

```html
<div class="shell" style="padding-top: 1.2rem;">
  <a href="https://samsungcuracao.com/compare?utm_source=connectionscuracao&amp;utm_medium=referral" style="display:block; padding: 1rem 1.3rem; border-radius: 14px; border: 1px solid rgba(120,130,210,0.35); background: linear-gradient(135deg, rgba(76,164,212,0.12), rgba(180,132,240,0.12)); color: var(--text); text-decoration: none;">
    <strong style="display:block; font-family: var(--font-display); font-weight:800;">New: full A37 &amp; A57 details at <span style="background: linear-gradient(90deg,#4ca4d4,#b484f0); -webkit-background-clip:text; background-clip:text; color:transparent;">samsungcuracao.com</span> →</strong>
    <span style="color:var(--muted); font-size:0.88rem;">Dedicated pages, full specs, side-by-side compare.</span>
  </a>
</div>
```

- [ ] **Step 14.2: Verify**

```
mcp__plugin_playwright_playwright__browser_navigate → http://localhost:8001/galaxy-a/
```

Verify banner is visible and links to `samsungcuracao.com/compare`.

---

## Task 15: Commit connections-curacao changes

- [ ] **Step 15.1: Review changes**

```bash
cd /home/ganesh/connections-curacao
git status
git diff index.html galaxy-a/index.html data/products.json
```

Expected: 4 files in the diff (`index.html`, `data/products.json`, `galaxy-a/index.html`, plus two new files `img/products/galaxy-a37-model.jpg`, `img/products/galaxy-a57-model.jpg`).

- [ ] **Step 15.2: Stage only these specific files (do NOT `git add -A`)**

```bash
git add index.html data/products.json galaxy-a/index.html img/products/galaxy-a37-model.jpg img/products/galaxy-a57-model.jpg
git status
```

Expected: only those 5 files staged. Other pre-existing uncommitted changes (iphonefold, macbookneo, etc.) remain unstaged.

- [ ] **Step 15.3: Commit**

```bash
git commit -m "$(cat <<'EOF'
Launch Galaxy A37 & A57: banner, product images, redirect

- Add dismissible launch banner pointing to samsungcuracao.com
- Update A37/A57 landingPage to the new Samsung microsite
- Add A37/A57 product images so deals carousel renders
- Add pointer banner at top of /galaxy-a/ directing to the new compare page

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 15.4: Verify commit**

```bash
git log -1 --stat
```

Expected: 5 files changed in the latest commit.

---

## Task 16: [USER ACTION] Push Samsung repo to GitHub

**Files:** none (user performs this)

- [ ] **Step 16.1: Hand off to Ganesh**

Present the following instructions and wait for confirmation:

> **Ganesh — please do this now:**
>
> 1. Create a new GitHub repo: https://github.com/new → name `samsung-curacao` → private or public (your call) → don't initialize with README.
> 2. Come back here and I'll push. Or do it yourself:
>
> ```bash
> cd /home/ganesh/samsung-curacao
> git remote add origin git@github.com:gvanx/samsung-curacao.git
> git push -u origin main
> ```
>
> If HTTPS auth is needed instead of SSH, use `https://github.com/gvanx/samsung-curacao.git` and enter your PAT.
>
> Confirm once the repo exists on GitHub with all commits.

- [ ] **Step 16.2: After Ganesh confirms the push, verify**

```bash
cd /home/ganesh/samsung-curacao
git remote -v
git log origin/main --oneline -5
```

Expected: remote set, all local commits visible on origin.

---

## Task 17: [USER ACTION] Connect Netlify + configure domain

**Files:** none

- [ ] **Step 17.1: Hand off to Ganesh**

> **Ganesh — do this in your browser:**
>
> 1. Netlify dashboard → **Add new site → Import from Git → GitHub → select `samsung-curacao` → Deploy site**.
>    - Build command: *(leave empty)*
>    - Publish directory: `.`
>    - Deploy.
> 2. Wait for the first deploy (~30 seconds). Netlify gives you a `*.netlify.app` URL. Open it on your phone and confirm the microsite renders (hero, catalog, store panel).
> 3. Still in Netlify → **Site settings → Domain management → Add a domain → `samsungcuracao.com`** → add `www.samsungcuracao.com` as an alias → set `samsungcuracao.com` as primary.
> 4. At your DNS provider (wherever you registered `samsungcuracao.com`), either:
>    - Point the nameservers to Netlify's (easiest, Netlify manages DNS), **or**
>    - Add these records:
>      - `A` `@` → `75.2.60.5`
>      - `CNAME` `www` → `apex-loadbalancer.netlify.com`
> 5. Netlify auto-issues SSL once DNS propagates (5 min – 24h).
>
> Confirm once `https://samsungcuracao.com` loads the microsite.

- [ ] **Step 17.2: Verify deployment**

When Ganesh confirms:

```bash
curl -sI https://samsungcuracao.com/ | head -5
curl -sI https://samsungcuracao.com/a37 | head -5
curl -sI https://samsungcuracao.com/a57 | head -5
curl -sI https://samsungcuracao.com/compare | head -5
```

Expected: each returns `HTTP/2 200`.

---

## Task 18: [USER ACTION] Push connections-curacao changes and set up email

**Files:** none

- [ ] **Step 18.1: Push connections-curacao**

> **Ganesh — push the main-site launch changes:**
>
> ```bash
> cd /home/ganesh/connections-curacao
> git push origin main
> ```
>
> Netlify will auto-deploy. Give it ~30 seconds, then open `https://connectionscuracao.net` on your phone. Verify the launch banner appears above the deals carousel.

- [ ] **Step 18.2: iCloud Custom Domain setup**

> **Ganesh — do this in Apple ID settings:**
>
> 1. [appleid.apple.com](https://appleid.apple.com) → Sign In & Security → iCloud+ → **Custom Email Domain** → **Add Domain** → `samsungcuracao.com`.
> 2. Apple shows you MX + TXT (SPF) + 2× CNAME (DKIM) records. Copy them.
> 3. At your DNS provider, add all 5 records.
> 4. Back in iCloud → wait for verification (can take a few minutes to a few hours).
> 5. Once verified, add email aliases `sales@samsungcuracao.com` and `hello@samsungcuracao.com`.
> 6. Send a test email from your personal Gmail to `sales@samsungcuracao.com`. Confirm it arrives in your iCloud inbox.
>
> Email can be set up after launch — doesn't block anything.

---

## Task 19: Post-deploy smoke test + Search Console

- [ ] **Step 19.1: Full smoke test against live URLs**

```
mcp__plugin_playwright_playwright__browser_navigate → https://samsungcuracao.com/
mcp__plugin_playwright_playwright__browser_console_messages
mcp__plugin_playwright_playwright__browser_take_screenshot
mcp__plugin_playwright_playwright__browser_evaluate →
  () => document.querySelectorAll('.tile').length
```

Repeat for `/a37`, `/a57`, `/compare`. Expected: 200s, zero console errors, 13 tiles on home.

```
mcp__plugin_playwright_playwright__browser_navigate → https://connectionscuracao.net/
mcp__plugin_playwright_playwright__browser_evaluate →
  () => document.getElementById('launch-banner') !== null
```

Expected: `true`.

```
mcp__plugin_playwright_playwright__browser_evaluate →
  () => {
    const tiles = Array.from(document.querySelectorAll('[class*="featured"] a, [class*="deal"] a'));
    return tiles.filter(a => a.href.includes('samsungcuracao.com')).map(a => a.href);
  }
```

Expected: at least 2 hrefs pointing to `samsungcuracao.com/a37` and `/a57`.

- [ ] **Step 19.2: Mobile viewport live check**

```
mcp__plugin_playwright_playwright__browser_resize → width: 390, height: 844
mcp__plugin_playwright_playwright__browser_navigate → https://samsungcuracao.com/
mcp__plugin_playwright_playwright__browser_take_screenshot → /tmp/live-home-mobile.png
```

Repeat for `/a37`, `/a57`, `/compare`, and `https://connectionscuracao.net/`.

- [ ] **Step 19.3: Lighthouse target (optional but recommended)**

Run Lighthouse via Chrome DevTools on `samsungcuracao.com/a37`:
- Performance ≥ 90
- Accessibility ≥ 95
- SEO ≥ 95

Flag any below-target scores for a follow-up task.

- [ ] **Step 19.4: [USER ACTION] Submit sitemap**

> **Ganesh:**
> - [Google Search Console](https://search.google.com/search-console) → Add property → `samsungcuracao.com` → verify via DNS TXT (Google gives you the record — paste it).
> - Once verified → Sitemaps → submit `https://samsungcuracao.com/sitemap.xml`.
> - (Optional) Bing Webmaster Tools — same flow.

---

## Rollback

If any step fails on production:

- **Samsung microsite broken:** Netlify Dashboard → Deploys → Redeploy previous, or run `git revert HEAD && git push` on `samsung-curacao`.
- **Main-site launch broken:** `cd /home/ganesh/connections-curacao && git revert <commit from Task 15> && git push` — `products.json` falls back to `/galaxy-a/`, banner disappears.
- **`samsungcuracao.com` DNS broken:** `wa.me` deep links on the main site keep working because they're absolute URLs to WhatsApp; customers still reach sales.

---

## Done Criteria

- [ ] `https://samsungcuracao.com/` loads on Ganesh's phone, catalog renders 13 tiles
- [ ] `https://samsungcuracao.com/a37` and `/a57` load, specs visible, WhatsApp CTA works
- [ ] `https://samsungcuracao.com/compare` loads, side-by-side table renders
- [ ] `https://connectionscuracao.net/` shows launch banner on mobile + desktop; dismisses and persists
- [ ] Deals carousel A37 & A57 cards on main site link to `samsungcuracao.com/a37` and `/a57`
- [ ] A37/A57 product images no longer broken on main site
- [ ] Zero console errors on any of the 4 new pages
- [ ] Lighthouse perf ≥ 90 on A37/A57 (aspirational)
- [ ] `sales@samsungcuracao.com` receives a test email (can be post-launch)
- [ ] Sitemap submitted to Google Search Console
