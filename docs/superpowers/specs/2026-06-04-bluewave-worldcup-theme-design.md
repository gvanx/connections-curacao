# Bluewave World Cup Theme — Design Spec

**Date:** 2026-06-04
**Author:** Ganesh + Claude
**Status:** Approved (direction validated via live preview)

## Goal

Celebrate **Curaçao qualifying for the 2026 FIFA World Cup** with a cohesive
"Bluewave" World Cup theme across the Connections web properties. Drive seasonal
attention and tie the retail brand to the national moment.

## Scope

Themed sites:
- `connections-curacao` (main catalog, dark theme)
- `samsung-curacao` (microsite, dark + purple `--brand`)
- `gift-card-curacao` (digital store, **light** theme, teal `#2d7a9f`)

**Out of scope:** the Spin & Win game (`game`) — left as-is (red/gold branding).

## Direction: "Stadium Night"

Chosen over "Flag Pure" and "Ocean Bluewave" after a live preview. Keeps each
site's existing base look and layers a World Cup treatment on top — most
cohesive across three different starting themes, fastest to ship, and cleanly
removable after the tournament.

### Palette (shared tokens)
- Electric Curaçao blue — `#2b6dff` (replaces each site's primary accent)
- Deep flag blue — `#0a3a8c` (ribbon, depth)
- Flag gold/yellow — `#FCD116` (CTAs, stars, logo dot)
- White stars `★★` motif (the two stars of the Curaçao flag)

### Treatment per site
1. **World Cup ribbon** — full-width bar above the nav:
   `🇨🇼 Curaçao at the 2026 World Cup · Ride the Bluewave ⚽`
   (deep-blue bg, gold accents, gold bottom border).
2. **Accent swap** — primary accent → electric blue; logo dot + primary CTA → gold.
3. **Hero** — replace each site's stale "Kingsday" hero with World Cup messaging
   ("Ride the Bluewave"), blue+gold glow background.

Per-site notes:
- **samsung** — override `--brand` only; keep `--accent-a37` / `--accent-a57`
  product identities untouched.
- **gift-card** — light theme: override the hardcoded teal `#2d7a9f` usages
  (tabs, badges, buttons, price, links, search focus) to blue; repurpose the
  existing `.cc-kingsday-strip` element as the World Cup ribbon.

## Removability (key constraint)

Everything is a **self-contained, comment-delimited block** so it strips out
cleanly after the World Cup:

```
<!-- ===== BLUEWAVE WORLD CUP THEME — START (remove after tournament) ===== -->
<style id="wc-theme"> … overrides … </style>
<!-- ===== BLUEWAVE WORLD CUP THEME — END ===== -->
```

Plus the ribbon element (also marked) and the hero copy swap. The override
`<style>` is appended last so it wins without editing existing rules. Removal =
delete the marked blocks + revert hero copy.

## Rollout

- Work on a `bluewave-worldcup` branch per repo, isolated from any pending work
  (connections has 7 unpushed commits + uncommitted S25/S26 work — untouched).
- Serve each themed site locally over Tailscale for Ganesh to review.
- On approval, merge/push to `main` per repo (Netlify auto-deploys).
- **No push to `main` before explicit approval.**

## Success criteria

- All three sites visibly carry the World Cup ribbon + blue/gold accents.
- WhatsApp number stays canonical `59996782619`; store hours unchanged.
- Theme can be removed by deleting marked blocks with no leftover artifacts.
