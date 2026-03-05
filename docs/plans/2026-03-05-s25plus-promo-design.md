# S25+ Promo Landing Page — Design

## Overview

Single-model promotional page for the Galaxy S25+ 256GB price drop. Focused deal page with WhatsApp CTA — simpler than the S26 multi-model preorder flow.

## Pricing

- **Was:** ANG 1,890
- **Now:** ANG 1,549
- **Savings:** ANG 341
- **Storage:** 256GB only

## Sections

1. **Hero** — Bold headline with price drop (crossed-out old price, new price), eyebrow badge ("Limited Offer"), WhatsApp CTA button, "Back to Shop" link
2. **Key specs strip** — 4 feature cards: display, camera, battery, processor (reuse S26 `feature-card` style)
3. **Deal breakdown** — Panel showing old price, savings, new price, "while stocks last"
4. **Sticky bottom CTA** — "Galaxy S25+ ANG 1,549" with WhatsApp button

## Not included

No model switcher, compare grid, preorder form, trade-in slider, storage selector, color swatches, FAQ, or timeline.

## Technical

- Single self-contained `s25plus/index.html` (same pattern as S26)
- Add `_redirects` rules for `/s25plus` route
- WhatsApp CTA: `https://wa.me/59996782619?text=...` with pre-filled message
- Same fonts (Space Grotesk + Sora), dark blue base theme
- Warmer gold/amber accent colors to differentiate from S26's cool blue/green and signal "sale"

## S25+ Specs (for feature cards)

- Display: 6.7" Dynamic AMOLED 2X, 120Hz
- Camera: 50MP + 12MP + 10MP
- Battery: 4900mAh, 45W fast charging
- Processor: Snapdragon 8 Elite for Galaxy
