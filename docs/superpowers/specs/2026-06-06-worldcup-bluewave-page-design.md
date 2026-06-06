# /worldcup — Bluewave Hype Page — Design Spec

**Date:** 2026-06-06
**Author:** Ganesh + Claude
**Status:** Approved (design validated in chat)

## Goal

A celebration/brand "hype" landing page for **Curaçao's first-ever FIFA World Cup
appearance (2026)**, tying the Connections retail brand to the national moment and
gently funnelling visitors into the main store. Rides the existing "Bluewave" World
Cup theme. Light on commerce, heavy on pride + timeliness.

## Path & placement

- Lives at `connectionscuracao.net/worldcup/` (self-contained `worldcup/index.html`).
- Chosen over `/bluewave` for SEO — catches "curaçao world cup" searches. If
  `bluewavecuracao.com` is later purchased, 301-redirect it here.
- Added to `sitemap.xml`; linked from the homepage (nav + the existing World Cup
  ribbon points here).

## Look & feel

- Same Bluewave palette: electric blue `#2b6dff`, deep flag blue `#0a3a8c`, flag
  gold `#FCD116`, white `★★` stars. Matches the theme already on the sites.
- Follows existing landing-page conventions (hero → content sections → CTA → footer,
  WhatsApp `59996782619`). Mobile-first, no build step, vanilla JS.

## Sections (top to bottom)

1. **Hero — "the moment"**
   - Full-bleed blue/gold, 🇨🇼 + `★★`, headline *"Curaçao is going to the World Cup."*
   - Short proud paragraph (first-ever appearance, Dick Advocaat, #RideTheBluewave).
   - **Live countdown** to the next upcoming fixture (auto-advances; shows
     `LIVE` during a match window and `Full time` after the last match).

2. **Match schedule** — the three Group E fixtures as cards
   (date · opponent · kickoff · venue), next match highlighted. Brief group context
   (Germany, Ivory Coast, Ecuador). All times shown in **Curaçao local (AST)** which
   equals US Eastern in June.

3. **Shop-the-store CTA — "Celebrate with us"**
   - A row of featured products + a primary **"Shop the store"** button to
     `connectionscuracao.net`, plus a WhatsApp CTA.

4. **Social / share** — `#RideTheBluewave`, share-to-WhatsApp button, social links.

5. **Footer** — consistent with other landing pages (hours, location, WhatsApp).

## Data model (editable fixtures block)

Fixtures live in a single JS array at the top of `worldcup/index.html` so any detail
can be corrected without touching layout. Each entry:

```js
{ date: "2026-06-14T13:00:00-04:00",  // Curaçao/AST = ET in June
  home: "Curaçao", away: "Germany",
  venue: "Houston", city: "Houston, USA" }
```

Confirmed fixtures (verified vs Sky Sports + FOX Sports, 2026-06-06):

| Date (AST) | Match | Kickoff | Venue |
|------------|-------|---------|-------|
| Sun Jun 14 | Curaçao vs Germany | 1:00 PM | Houston |
| Sat Jun 20 | Ecuador vs Curaçao | 8:00 PM | Kansas City |
| Thu Jun 25 | Curaçao vs Ivory Coast | 4:00 PM | Philadelphia |

The countdown computes the next fixture whose kickoff is in the future; falls back to
a "Full time — thanks for riding the Bluewave" state after the last match.

## Removability

Page is seasonal. It is a self-contained directory (`worldcup/`) plus one sitemap
entry and one homepage nav link — removal = delete the dir, drop the sitemap `<url>`,
remove the nav link. No entanglement with core catalog code.

## Rollout

- Build locally, serve for review (screenshot/preview) — **no push to `main` until
  Ganesh approves the preview** (new public page).
- On approval: add sitemap entry + homepage link, commit, push (Netlify deploys).

## Success criteria

- Page celebrates the moment, shows correct fixtures + a working live countdown.
- Funnels to the store via clear CTAs; WhatsApp number canonical `59996782619`.
- Mobile-first, on-theme, and cleanly removable after the tournament.
- Fixtures verified by Ganesh before going live.
