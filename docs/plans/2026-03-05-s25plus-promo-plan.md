# S25+ Promo Landing Page — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a focused promotional landing page for the Galaxy S25+ 256GB price drop (ANG 1,890 → ANG 1,549).

**Architecture:** Single self-contained HTML file at `s25plus/index.html` with inline CSS and minimal JS (scroll reveal only). Reuses the S26 design system structure but with warm gold/amber sale accents and stripped-down sections (no forms, no model switcher). Netlify redirect added for `/s25plus` route.

**Tech Stack:** Static HTML/CSS/JS, Netlify redirects, WhatsApp deep links.

---

### Task 1: Create the S25+ landing page HTML file

**Files:**
- Create: `s25plus/index.html`

**Reference:** Use `s26/index.html` as the structural template. The S26 page uses:
- Fonts: Space Grotesk (body) + Sora (display) from Google Fonts
- CSS variables on `:root` for theming
- `.shell` container at `min(1180px, calc(100% - 2rem))`
- `.topbar` sticky header with brand + nav actions
- `.reveal` class with IntersectionObserver for scroll animations
- `.feature-card` component for spec highlights
- `.sticky-cta` fixed bottom bar

**Step 1: Create the directory**

```bash
mkdir -p s25plus
```

**Step 2: Write the complete `s25plus/index.html`**

The page has these sections in order:

1. `<head>` — Meta tags, OG tags, fonts, inline `<style>`
2. **Topbar** — Brand link + "Back to Shop" + "S25+ Sale" badge
3. **Hero** — Eyebrow "Limited Offer" badge, headline with `<del>` old price and new price, subtitle, WhatsApp CTA button
4. **Specs strip** — 4x `.feature-card` in a grid (Display, Camera, Battery, Processor)
5. **Deal breakdown** — `.panel` with old price, savings callout, new price, "while stocks last"
6. **Sticky CTA** — Fixed bottom bar with price + WhatsApp button
7. `<script>` — IntersectionObserver for `.reveal` elements only (no form logic needed)

**CSS color scheme (warm sale accents):**
```
--brand: #ffb347       (warm amber)
--brand-2: #ff6f3c     (coral/orange)
--brand-3: #ffd700     (gold)
--ok: #ffd700          (gold for metrics)
```
Everything else stays the same as S26 (dark blue backgrounds, light text, same spacing/radius tokens).

**WhatsApp link format:**
```
https://wa.me/59996782619?text=Hi%2C%20I'm%20interested%20in%20the%20Galaxy%20S25%2B%20deal%20at%20ANG%201%2C549.%20Is%20it%20still%20available%3F
```

**OG/meta tags:**
- Title: `Galaxy S25+ Sale | Connections Curacao`
- Description: `Galaxy S25+ 256GB now ANG 1,549 (was ANG 1,890). Visit Connections Curacao or order via WhatsApp.`
- URL: `https://connectionscuracao.net/s25plus/`

**Step 3: Verify in browser**

Open `s25plus/index.html` in the browser and check:
- Hero renders with crossed-out old price and prominent new price
- 4 spec cards display correctly in grid (2x2 on mobile, 4-col on desktop)
- Deal breakdown panel shows savings
- Sticky CTA visible at bottom
- WhatsApp links open correctly
- Mobile responsive (topbar, hero stack, cards stack)

**Step 4: Commit**

```bash
git add s25plus/index.html
git commit -m "feat: add S25+ promo landing page"
```

---

### Task 2: Add Netlify redirect for `/s25plus`

**Files:**
- Modify: `_redirects`

**Step 1: Add the redirect rule**

Add this line to `_redirects` (before the `/iptv` line):
```
/s25plus  /s25plus/index.html  200
```

**Step 2: Commit**

```bash
git add _redirects
git commit -m "feat: add /s25plus redirect route"
```

---

### Task 3: Visual QA and final push

**Step 1: Open the page in browser and verify**

Check these items:
- [ ] Hero: eyebrow badge, headline, price drop (old crossed out, new prominent), WhatsApp button
- [ ] Spec cards: 4 cards with correct specs, hover effect works
- [ ] Deal panel: old price, savings, new price, "while stocks last"
- [ ] Sticky CTA: visible, WhatsApp link works
- [ ] Mobile: all sections stack properly, sticky CTA full-width
- [ ] WhatsApp: clicking CTA opens WhatsApp with pre-filled message

**Step 2: Push to remote**

```bash
git push origin main
```
