---
name: OrderFlow
description: Order-to-payment tracker for Malaysian SMEs, built to the category standard of operations software.
colors:
  primary: "oklch(0.5 0.2 277)"
  primary-hover: "oklch(0.44 0.176 277)"
  primary-foreground: "oklch(0.99 0 0)"
  canvas: "oklch(1 0 0)"
  ink: "oklch(0.21 0.006 286)"
  well: "oklch(0.982 0.002 286)"
  muted-ink: "oklch(0.48 0.014 286)"
  quiet-fill: "oklch(0.967 0.003 286)"
  hover-fill: "oklch(0.955 0.004 286)"
  sidebar-hover: "oklch(0.94 0.004 286)"
  hairline: "oklch(0.915 0.004 286)"
  control-stroke: "oklch(0.87 0.006 286)"
  destructive: "oklch(0.55 0.21 27)"
  amber-tint: "oklch(98.7% 0.022 95.277)"
  amber-dot: "oklch(76.9% 0.188 70.08)"
  amber-ink: "oklch(47.3% 0.137 46.201)"
  sky-tint: "oklch(97.7% 0.013 236.62)"
  sky-dot: "oklch(68.5% 0.169 237.323)"
  sky-ink: "oklch(44.3% 0.11 240.79)"
  violet-tint: "oklch(96.9% 0.016 293.756)"
  violet-dot: "oklch(60.6% 0.25 292.717)"
  violet-ink: "oklch(43.2% 0.232 292.759)"
  cyan-tint: "oklch(98.4% 0.019 200.873)"
  cyan-dot: "oklch(60.9% 0.126 221.723)"
  cyan-ink: "oklch(45% 0.085 224.283)"
  emerald-tint: "oklch(97.9% 0.021 166.113)"
  emerald-dot: "oklch(69.6% 0.17 162.48)"
  emerald-ink: "oklch(43.2% 0.095 166.913)"
  rose-tint: "oklch(96.9% 0.015 12.422)"
  rose-dot: "oklch(64.5% 0.246 16.439)"
  rose-ink: "oklch(45.5% 0.188 13.697)"
  zinc-tint: "oklch(96.7% 0.001 286.375)"
  zinc-dot: "oklch(70.5% 0.015 286.067)"
  zinc-ink: "oklch(44.2% 0.017 285.786)"
typography:
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.333
    letterSpacing: "-0.02em"
  figure:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.333
    letterSpacing: "-0.02em"
    fontFeature: "'tnum', 'ss01'"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    fontFeature: "'ss01', 'cv11'"
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1
  caption:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.333
  identifier:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.43
rounded:
  sm: "4.8px"
  md: "6.4px"
  lg: "8px"
  xl: "11.2px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-outline:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
  button-outline-hover:
    backgroundColor: "{colors.hover-fill}"
  button-ghost-hover:
    backgroundColor: "{colors.quiet-fill}"
    textColor: "{colors.ink}"
  button-destructive:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.destructive}"
    rounded: "{rounded.md}"
    height: "36px"
  input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  panel:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
  panel-header:
    typography: "{typography.title}"
    padding: "12px 20px"
  panel-footer:
    backgroundColor: "{colors.well}"
    padding: "16px 20px"
  nav-item:
    textColor: "{colors.muted-ink}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "32px"
  nav-item-hover:
    backgroundColor: "{colors.sidebar-hover}"
    textColor: "{colors.ink}"
  nav-item-current:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
  pill-pending:
    backgroundColor: "{colors.amber-tint}"
    textColor: "{colors.amber-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "0 8px"
    height: "22px"
  pill-confirmed:
    backgroundColor: "{colors.sky-tint}"
    textColor: "{colors.sky-ink}"
  pill-packing:
    backgroundColor: "{colors.violet-tint}"
    textColor: "{colors.violet-ink}"
  pill-ready:
    backgroundColor: "{colors.cyan-tint}"
    textColor: "{colors.cyan-ink}"
  pill-delivered:
    backgroundColor: "{colors.emerald-tint}"
    textColor: "{colors.emerald-ink}"
  pill-cancelled:
    backgroundColor: "{colors.zinc-tint}"
    textColor: "{colors.zinc-ink}"
  pill-unpaid:
    backgroundColor: "{colors.rose-tint}"
    textColor: "{colors.rose-ink}"
  pill-partial:
    backgroundColor: "{colors.amber-tint}"
    textColor: "{colors.amber-ink}"
  pill-paid:
    backgroundColor: "{colors.emerald-tint}"
    textColor: "{colors.emerald-ink}"
  table-head:
    textColor: "{colors.muted-ink}"
    typography: "{typography.caption}"
    height: "36px"
  table-row:
    height: "44px"
  table-row-hover:
    backgroundColor: "{colors.well}"
  bottom-nav-new:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.full}"
    size: "36px"
---

# Design System: OrderFlow

## Overview

**Creative North Star: "The Quiet Ledger"**

OrderFlow is operations software held to the category standard: Stripe Dashboard, Shopify Admin, Linear, Vercel. It is a calm, exact tool that disappears into the task. Owners and staff key orders in on a phone between WhatsApp chats and do admin on a laptop, so the system spends its attention on the things they must read instantly (what needs doing, what is unpaid, what is low) and spends nothing on decoration. White content panels sit on a faintly cool zinc well; one indigo accent marks the action you can take, where you are, and what has focus. Everything else is ink, hairline and space.

Density is moderate and list-shaped. Information arrives as divided rows inside bordered panels, with the figure that matters set large, tabular and right-aligned. Every summary is a door: attention rows, recent orders and list rows are whole-row links that land on the exact filtered view. State is a small, strict vocabulary of pills, shared by order status, payment status, stock and account state, and never carried by colour alone.

The system is light mode only. The `.dark` block in `frontend/src/app/globals.css` is the untouched shadcn default, not part of this designed system; no theme provider exists and dark mode is out of scope.

**Key Characteristics:**
- Geist Sans for all UI, Geist Mono only for order numbers and SKUs.
- Every money and count figure in tabular numerals, right-aligned; RM always to two decimals.
- Cool zinc neutrals, white content, one tinted second neutral for sidebar and page wells, one indigo accent.
- Flat bordered panels; shadows reserved for controls (whisper) and overlays (real lift).
- 1px hairlines and an 8px panel radius; pills fully round.
- 150ms ease-out colour transitions on interactive state only; no page-load choreography.

## Colors

A restrained palette: cool zinc neutrals at hue 286, white content, and a single saturated indigo that only ever means "act here, you are here, or focus is here". Status hues exist only inside the pill vocabulary.

### Primary
- **Ledger Indigo** (`primary`): primary buttons, links ("All orders", phone numbers, auth links), the current nav item's icon and the active bottom-nav tab, the logo mark tile, the centre "New" action on phone, caret colour, the focus ring (`--ring` is the same value) and text selection (at 18% alpha). Hover darkens it by mixing 12% black in OKLCH (`primary-hover`).
- **Indigo Wash** (primary at 10% alpha): the avatar disc behind initials. The only tinted use of the accent.

### Neutral
- **Canvas White** (`canvas`): the main content background, panels, inputs, outline buttons, popovers and sheets.
- **Ink** (`ink`): all primary text and headings; also the base for shadow colour.
- **Well** (`well`, shared by `--surface` and `--sidebar`): the desktop sidebar, auth and public-catalog page grounds, panel footers and totals blocks (often at 60%), empty states, and the hover fill of rows and table rows.
- **Muted Ink** (`muted-ink`): secondary text, hints, table headers, inactive nav items and icons.
- **Quiet Fill** (`quiet-fill`): ghost-button hover, skeletons, cleared attention icon tiles.
- **Hover Fill** (`hover-fill`): outline-button hover and "More" sheet link hover.
- **Sidebar Hover** (`sidebar-hover`): nav item hover inside the sidebar well, one step darker than the well.
- **Hairline** (`hairline`): every border and divider: panels, row dividers, header and sidebar edges.
- **Control Stroke** (`control-stroke`): the slightly stronger border of inputs, selects and outline buttons, so controls read as controls against panel hairlines.
- **Destructive Red** (`destructive`): cancel and delete actions (outlined, never filled) and inline form errors on a 5% tint.

### Status vocabulary (semantic, pills only)
Each tone has a tint (pill fill, the Tailwind `-50` step; zinc uses `-100`), a dot (`-500`; cyan and zinc differ, see below) and an ink (`-800`; zinc uses `-600`), plus an inset ring at the `-600` step at 20% alpha.
- **Amber**: Pending order, Partial payment, Low stock.
- **Sky**: Confirmed order.
- **Violet**: Packing order.
- **Cyan** (dot at `-600`, ring at 25% for legibility): Ready order.
- **Emerald**: Delivered order, Paid payment, Active account.
- **Rose**: Unpaid payment, Out of stock.
- **Zinc** (dot at `-400`): Cancelled order, Inactive account.

Stock figures take a matching ink (rose-700 out, amber-700 low) but are always paired with a stock pill. Dashboard attention rows use the same hues at the `-50`/`-700` steps as icon tiles.

### Named Rules
**The One Indigo Rule.** Indigo means action, location, link or focus, and nothing else. It never fills a panel, a heading or a status.

**The Hue Belongs to State Rule.** Amber, sky, violet, cyan, emerald and rose appear only inside the status vocabulary (pills, their paired figures, attention icon tiles). No decorative use.

## Typography

**Display Font:** none; there is no display face.
**Body Font:** Geist (with ui-sans-serif, system-ui, sans-serif), loaded by `next/font`.
**Label/Mono Font:** Geist Mono (with ui-monospace, monospace), for identifiers only.

**Character:** One neutral, engineered grotesque at every size, tightened slightly as it grows (-0.01em at titles, -0.02em at headlines and figures). Body text enables Geist's `ss01` and `cv11` alternates; figures switch to tabular numerals.

### Hierarchy
- **Headline** (600, 1.25rem on phone, 1.5rem from md, -0.02em, balanced): the page title (`h1`) in the page header and auth panel. Order numbers in a title switch to Geist Mono at -0.03em.
- **Figure** (600, 1.5rem, -0.02em, tabular): the large count or RM amount at the right of an attention row and in the "Today" summary. The public catalog price rises to 1.875rem; order totals use 1.125rem.
- **Title** (600, 0.9375rem, -0.01em): panel headings, disclosure summaries, empty-state titles, the wordmark.
- **Body** (400, 0.875rem; 1rem in inputs on phones to avoid zoom): table cells, row primaries (500), facts, descriptions.
- **Label** (500, 0.8125rem): form labels, back links, row secondaries and panel asides (400, muted), field hints.
- **Caption** (500, 0.75rem): table column headers (muted), pills, filter labels. The phone tab label is a single 0.6875rem step.
- **Identifier** (Geist Mono 500, 0.8125rem; 0.75rem muted under row titles): order numbers (ORD-YYYYMMDD-NNNN) and SKUs.

### Named Rules
**The Tabular Money Rule.** Every RM amount, count, quantity and page number uses the `tabular` utility (`tnum` plus `ss01`) and sits right-aligned in its column or row. Tables apply it to the whole table.

**The Mono Is for Identifiers Rule.** Geist Mono sets order numbers and SKUs, nothing else: not money, not dates, not labels.

## Layout

Desktop (md, 768px, and up) is a fixed 240px sidebar in the well colour, sticky at full viewport height, with the logo row (56px), the navigation, and the user block plus logout at its foot. Content sits in `main` with 32px side padding and 32px top padding, capped at 1152px (`max-w-6xl`) and centred. Phone replaces the sidebar with a 56px sticky top bar (logo left, avatar and name right) at 95% white with a backdrop blur, and a fixed 64px five-tab bottom nav (Dashboard, Orders, New, Stock, More) that respects the safe-area inset; main content gets 16px sides and 112px bottom padding to clear it.

Phone and desktop are sibling layouts rendering the same data: desktop shows full tables, phone shows the same records as divided lists inside a panel. The dashboard and detail pages use a two-column grid from lg (1024px) of `2fr / 1fr` with 24px gaps; below lg, panels stack with 16px gaps.

Rhythm runs on a 4px base. Panel headers pad 12px by 16px (20px from md); rows pad 12 to 14px by 16px (20px from md); page header to content is 20px (24px from md). Facts lists use a 120px label column. Auth screens centre one 400px column on the well.

## Elevation & Depth

Depth is mostly tonal and structural: white panels on a faintly tinted well, separated by 1px hairlines. Shadows are tinted with the ink hue (286), never pure black, and come in three strengths with strictly assigned roles.

### Shadow Vocabulary
- **Whisper** (`box-shadow: 0 1px 2px 0 oklch(0.21 0.006 286 / 0.05)`): controls only: primary, outline and destructive buttons, inputs, selects, textareas, and the current sidebar nav item (paired with a hairline ring).
- **Raised** (`box-shadow: 0 1px 3px 0 oklch(0.21 0.006 286 / 0.07), 0 1px 2px -1px oklch(0.21 0.006 286 / 0.06)`): the auth panel and the error-page panel, the single raised card on a well ground.
- **Overlay** (`box-shadow: 0 12px 24px -6px oklch(0.21 0.006 286 / 0.12), 0 4px 8px -4px oklch(0.21 0.006 286 / 0.08)`): sheets (the phone payment sheet, the More sheet) and dialogs (adjust stock, reset password, confirmations). Overlays sit on a 10% black scrim with a light backdrop blur.

### Named Rules
**The Flat Panel Rule.** In-flow panels, tables, lists and empty states are flat: border only, no shadow. Lift is reserved for controls (whisper), the lone auth or error panel (raised) and overlays.

## Shapes

Gently rounded and quiet. Panels, empty states and the auth panel use an 8px radius (`lg`); buttons, inputs, selects, nav items and attention icon tiles use 6.4px (`md`); dialogs and the top edge of bottom sheets use 11.2px (`xl`). Pills, avatars, the empty-state icon disc and the phone "New" action are fully round. All radii derive from one `--radius` of 0.5rem. Borders are 1px hairlines throughout; pills and icon tiles use an inset 1px ring instead of a border so they keep their size. Panels clip their content (`overflow: hidden`) so row hover fills meet the rounded corners.

## Components

### Buttons
Compact, confident, and quiet unless primary.
- **Shape:** gently rounded (6.4px); 36px tall on desktop, 40px on phones (44px/40px for large); 14px horizontal padding; 14px medium text; 16px icons with a 6px gap.
- **Primary:** Ledger Indigo with white text and the whisper shadow. One per view region: "New order", "Save payment", the next status step.
- **Outline:** white with the control-stroke border and whisper shadow; hover to hover-fill. The default secondary action (Previous/Next, Log out, Keep it).
- **Ghost:** transparent; hover to quiet-fill. Inline tertiary actions (remove line, clear).
- **Destructive:** outlined, never filled: white with a 25% red border, red text, 8% red hover. "Cancel order", delete.
- **Hover / Focus:** 150ms ease-out colour transitions; focus draws a 3px ring of indigo at 35%; press nudges down 1px. Disabled at 50% opacity.

### Status pills
The signature vocabulary. One anatomy for every state in the app: 22px tall, fully round, 8px horizontal padding, 12px medium text, tint fill, inset ring, and a leading mark.
- **Order status:** a 6px dot in the status hue, then the label (Pending, Confirmed, Packing, Ready, Delivered, Cancelled).
- **Payment status:** a 12px glyph instead of a dot: an empty ring (Unpaid, rose), a half-filled ring (Partial, amber), a filled disc with a check (Paid, emerald). Shape carries the meaning before colour does.
- **Stock and account:** the same pill with a dot: Out of stock (rose), Low stock (amber), Active (emerald), Inactive (zinc). No pill is shown for healthy stock.
- Order and payment pills always appear as a pair, order first.

### Panels / Containers
- **Corner Style:** 8px.
- **Background:** Canvas White; footers and totals blocks on the well (solid or 60%).
- **Shadow Strategy:** none (The Flat Panel Rule).
- **Border:** 1px hairline; the header row has a hairline bottom edge.
- **Internal Padding:** header min 48px tall, 12px by 16px (20px from md), title left, quiet aside or a link action right. Content is divided rows or a facts list, edge to edge.
- **Edit disclosure:** forms on detail pages fold into a panel-shaped `details` whose summary row hovers to the well and whose chevron rotates 180 degrees over 200ms.

### Attention rows (signature)
The dashboard's "Needs attention" panel: each row is a whole-row link with a 36px tinted icon tile, a label and a muted hint, the figure large and tabular at the right, and a trailing chevron. Hover fills the row with the well and shifts the chevron 2px right over 150ms. A cleared row (count 0) mutes its tile to quiet-fill and its figure to 70% muted ink and reads "Nothing to do".

### Inputs / Fields
- **Style:** white, 1px control-stroke border, 6.4px radius, whisper shadow, 36px tall (40px on phones), 12px horizontal padding, 16px text on phones and 14px from md. Native selects match, with a drawn muted chevron. Number inputs hide spinners; date and search affordances are redrawn in muted ink.
- **Labels:** 13px medium above the control with a 6px gap; hints 13px muted below.
- **Focus:** border turns indigo with a 3px indigo ring at 20%.
- **Error / Disabled:** invalid fields get a red border and 3px red ring at 20%; form errors are a red-tinted box with a 20% red border. Disabled at 50% opacity.

### Tables
Desktop only. Column headers 36px tall in 12px medium muted ink; rows 44px with hairline dividers, hover to the well; first and last cells pad 16px. Whole-row links stretch an invisible anchor over the row, with the focus ring drawn inset. Numeric columns right-align; tables never clip, scrolling horizontally inside their container when needed.

### Navigation
- **Sidebar (desktop):** 32px items, 14px text, 16px icons, 10px padding, 6.4px radius. Default muted; hover to sidebar-hover and ink. Current item becomes a white chip with a hairline ring, whisper shadow, medium weight, and an indigo icon.
- **Bottom nav (phone):** five equal tabs, 20px icons over 11px medium labels; current tab turns indigo with a heavier stroke. The centre "New" tab is a 36px indigo disc with a plus. "More" opens a bottom sheet of 48px links.
- **Page header:** optional muted back link with a chevron, the headline with inline pills, a muted description, and actions at the right that wrap below on phones.

### Empty states
A well-coloured panel (8px radius, hairline) centring a 40px round white icon disc, a 15px semibold title, a muted description capped at 24rem, and an optional action.

## Do's and Don'ts

### Do:
- **Do** set every RM amount and count with the `tabular` utility, right-aligned, always to two decimals for money.
- **Do** use the shared pill anatomy (22px, fully round, tint, inset ring, dot or glyph) for any new state, and pair a coloured figure with a pill.
- **Do** make summaries whole-row links to the exact filtered view, with a well-coloured hover and a visible focus ring.
- **Do** keep in-flow panels flat (hairline border, 8px radius) and put lift only on controls, the lone auth panel, and overlays.
- **Do** build each screen as phone and desktop siblings over the same data: tables on desktop, divided lists in a panel on phone.
- **Do** limit motion to 150 to 200ms ease-out colour and transform transitions on interactive state, and honour reduced motion.

### Don't:
- **Don't** use indigo for anything but primary actions, links, current selection and focus.
- **Don't** let status rely on colour alone: every state has a label, and payment states have distinct glyphs.
- **Don't** use Geist Mono for money, dates or labels; it is for order numbers and SKUs.
- **Don't** add shadows to panels, tables or lists, and don't use pure-black shadows.
- **Don't** fill destructive buttons; they stay outlined in red.
- **Don't** build the dashboard as a wall of same-size coloured-border KPI cards, or let tables clip.
- **Don't** treat the `.dark` variables in globals.css as a designed theme; the system is light only.
