# Dia di Bandera (Flag Day) Theme — Design Spec

**Date:** 2026-06-30
**Author:** Ganesh + Claude
**Status:** Approved (replaces the Bluewave World Cup theme on the homepage)

## Goal

Celebrate **Dia di Bandera** — Curaçao's Flag Day, **2 di yüli (July 2)** — across
the `connections-curacao` homepage. Tie the retail brand to the national moment
(flag, anthem, country) for the holiday window.

## Decision

- **Replace** the Bluewave World Cup theme on the homepage with a dedicated
  Dia di Bandera treatment (not layered alongside it).
- Treatment is **auto-gated to a July 1–3, 2026 window** — it activates and
  reverts on its own, no manual edit needed.
- Outside the window the homepage falls back to a **neutral baseline** (the
  site's original `#007AFF` Apple-blue accent, generic hero copy).

## Palette (Curaçao flag)

- Cobalt flag blue — `#002B7F` (`--fd-blue`), deep `#001a52` (`--fd-blue-deep`)
- Flag yellow stripe — `#F9D616` (`--fd-yellow`) — CTAs, logo dot, stripe motif
- Vivid flag blue — `#0a4fc4` (`--accent` during the window)
- White `★★` — the two stars of the flag (Curaçao + Klein Curaçao)

## Treatment

1. **Top ribbon** — deep-blue bar, gold border:
   `★★ Bon Dia di Bandera, Kòrsou! · 2 di yüli · Pabien na nos bandera, himno i pais 🇨🇼`
2. **Hero swap** — flag-day tag + `Bon Dia di Bandera` headline (yellow accent),
   `Shop Flag Day deals` CTA, blue+yellow glow background.
3. **Banner card** — a flag motif (cobalt field, two white stars upper-hoist,
   yellow stripe along the bottom) linking to `#deals`.
4. **Accent swap** — primary accent → flag blue; logo dot + primary CTA → yellow.

## Mechanics (window + removability)

A tiny inline script in `<head>` adds `class="flagday"` to `<html>` when the
local date is **1–3 July 2026** (`?flagday` or `#flagday` forces a preview any
time). **All** flag-day CSS is scoped under `html.flagday`, and the ribbon /
banner / flag-day hero are `display:none` until the class is present — so the
neutral baseline shows automatically outside the window with zero edits.

Everything lives in **self-contained, comment-delimited blocks**:

```
<!-- ===== DIA DI BANDERA / FLAG DAY THEME — START ===== -->
<script> … date gate … </script>
<style id="fd-theme"> … overrides … </style>
<!-- ===== DIA DI BANDERA / FLAG DAY THEME — END ===== -->
```

Plus the ribbon (`#fd-ribbon`), the hero `.hero-flagday` variant, and the
`.fd-banner` element (all marked). Removal = delete the marked blocks and the
`.hero-flagday` variant, leaving the neutral `.hero-default`.

## Success criteria

- During Jul 1–3 the homepage carries the flag ribbon, yellow/blue accents and
  the flag banner; on Jul 4 it reverts to the neutral baseline on its own.
- WhatsApp number stays canonical `59996782619`; store hours unchanged.
- Theme strips out by deleting the marked blocks with no leftover artifacts.
