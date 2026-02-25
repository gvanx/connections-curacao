# Connections Curacao — Main Site Design

## Overview
Premium dark tech store website replacing the current Squarespace site. Hub-and-spoke model: main site showcases categories and featured deals, subdomains handle specialized experiences (JBL, Gift Cards, Trade-In, Spin & Win).

## Decisions
- **Vibe:** Premium tech store — dark, glass-morphism, subtle glows, Apple Store-like
- **Architecture:** Hub-and-spoke — showcase + links to subdomains
- **Data:** JSON file (`data/products.json`) for product catalog
- **Tech:** Single HTML file, vanilla JS, zero build step — consistent with all other subdomain projects
- **Hosting:** Netlify (domain stays at Squarespace, DNS pointed to Netlify)

## Site Structure

### 1. Navigation (sticky, glass blur on scroll)
- Logo left, links right
- Links: Deals, Categories, Locations, Contact
- Quick-links to subdomains (JBL, Gift Cards, Trade-In)
- Mobile: hamburger menu

### 2. Hero (full viewport, cinematic)
- Large tagline: "Curacao's Premium Electronics Store" or similar
- Rotating featured product spotlight
- Two CTAs: "Shop Deals" (scrolls to deals) + "Visit Store" (scrolls to locations)
- Subtle animated gradient mesh background

### 3. Category Grid
- 6 glass-morphism cards: Apple, Samsung, TVs, Laptops, ACs, Motorcycles
- Each card has icon/image + label
- Click scrolls to corresponding product section

### 4. Featured Deals Carousel
- Horizontal scrollable carousel
- Products from `products.json` where `featured: true`
- Shows product image, name, price, "Order" CTA

### 5. Product Sections (per category)
- Apple, Samsung, TVs, Laptops, ACs, Motorcycles
- Dark glass product cards: image, name, price in NAf
- "Order via WhatsApp" button per product (pre-filled message)
- Optional: Sentoo payment link

### 6. Ecosystem Section (subdomain links)
- Glass cards linking to: JBL, Gift Cards, Trade-In, Spin & Win, HSO
- Each with preview image/icon + short description + link

### 7. Locations
- Two stores: Punda (13 Breedestraat) + Otrobanda
- Store hours: Mon-Sat 9:30am-6pm
- Embedded map or static map image
- Phone + directions link

### 8. Footer
- Contact info: phone, email, address
- Social links: Instagram, Facebook, WhatsApp group
- Business hours
- Copyright

### 9. Floating Elements
- WhatsApp FAB (bottom-right, always visible)

## Visual Design

### Colors
- Background: #0a0a0a (near black)
- Surface: rgba(255,255,255,0.05) with backdrop-blur (glass)
- Borders: rgba(255,255,255,0.1)
- Primary accent: #007AFF (electric blue)
- Secondary accent: #FF6600 (orange — deals/CTAs)
- Text: #FFFFFF (primary), rgba(255,255,255,0.6) (muted)
- Price: #FF6600 or #007AFF
- WhatsApp green: #25D366

### Typography
- Display: 'Outfit' or 'Bebas Neue' — bold headings
- Body: 'DM Sans' — clean, readable
- Consistent with existing subdomain sites

### Effects
- Glass-morphism: semi-transparent cards with backdrop-blur
- Scroll-triggered fade-in animations (IntersectionObserver)
- Card hover: translateY(-8px) + glow shadow
- Subtle parallax on hero background
- Smooth scroll between sections

### Mobile
- Fully responsive, mobile-first
- Hamburger nav with slide-out menu
- Stacked cards, full-width on mobile
- Touch-friendly tap targets (min 44px)
- WhatsApp FAB always visible

## File Structure
```
connections-curacao/
├── index.html          (entire site)
├── data/products.json  (product catalog)
├── img/                (product images, logo, icons)
├── manifest.json       (PWA manifest)
├── robots.txt
├── sitemap.xml
├── _redirects          (Netlify redirects if needed)
└── docs/plans/         (this design doc)
```

## Data Schema (products.json)
```json
[
  {
    "name": "iPhone 16 Pro Max",
    "price": 1899,
    "category": "apple",
    "image": "img/products/iphone-16-pro-max.webp",
    "featured": true,
    "whatsapp_text": "Hi, I'm interested in the iPhone 16 Pro Max (NAf 1,899)"
  }
]
```

## Ordering Flow
- Each product card has "Order via WhatsApp" button
- Opens `https://wa.me/59996782619?text=<pre-filled message>`
- Same proven pattern as current Squarespace site

## Business Info
- Store: Connections Curacao
- Address: 13 Breedestraat, Willemstad, Curacao
- Phone: +599-96782619
- Email: info@connectionscuracao.net
- Hours: Mon-Sat 9:30am-6pm (closed Sunday)
- Instagram, Facebook, WhatsApp group
