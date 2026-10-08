---
version: 1
slug: "frontend-src-app"
primary_target: "frontend/src/app"
related_targets: []
---

# OrderFlow app (all authenticated screens, auth, public catalog)

Scope: the whole frontend. Mode: Operate (the public catalog is Operate/Read for shop customers). Redesign: flows, screens, fields and navigation stay; the visual world is replaced.

Audience and job: Malaysian SME owners and staff capturing chat-born orders on a phone mid-conversation, and doing admin on desktop. They need to see what needs attention (unpaid money, orders to confirm/pack/deliver, low stock) instantly, and act in few taps.

Constraints: Next.js 16 App Router, Tailwind 4, shadcn/ui (radix-nova), lucide icons. Phone and desktop layouts are siblings rendering the same data. Existing unit and Playwright tests rely on roles, labels and visible text, so accessible names and copy stay unless a change is deliberate and tests are updated.

## Direction contract

THESIS: The category standard for operations software, done at the craft level of Stripe Dashboard, Shopify Admin, Linear and Vercel: a calm, exact tool that disappears into the task. It refuses the current scaffold look (browser-default serif, rows of same-size coloured-border cards, clipped tables) and the opposite rut of a KPI-card wall.

OWN-WORLD: Geist Sans for all UI and Geist Mono for order numbers and SKUs only; every money and count figure in tabular numerals, right-aligned. Restrained colour: cool zinc neutrals, white content surface, a slightly tinted second neutral for the sidebar and page wells, one indigo accent reserved for primary actions, current selection, links and focus. A standardized semantic status vocabulary: order status pills (dot plus label: Pending amber, Confirmed blue, Packing violet, Ready cyan, Delivered green, Cancelled zinc) and payment pills with a distinct glyph per state (Unpaid empty ring rose, Partial half-filled amber, Paid filled check green), so status never relies on colour alone. 1px hairline borders, 8px radius, shadows only on overlays and raised panels with real offset and blur.

STORY: The owner opens the app and immediately knows what needs doing today and how much money is outstanding; they jump to the exact filtered list from there, act (confirm, pack, record a payment) in one or two steps, and trust every RM figure because it is exact and aligned.

FIRST VIEWPORT: Dashboard. Desktop: sidebar (logo mark + wordmark, navigation, user and logout at the foot). Content: page title "Dashboard" with today's date (Asia/Kuala_Lumpur), then a "Needs attention" panel as a list of actionable rows (unpaid orders with outstanding RM, orders to confirm, orders to pack or deliver, low-stock products), each row a link to the filtered list, its count/amount large and tabular at the row's right. Beside or below: a compact "Today" summary (orders and value). Below: Recent orders as a full-width, never-clipped table and a Low stock list. Phone: compact top bar, the same attention rows as one divided list, then recent orders as a divided list; bottom navigation with a prominent accent "New order" action in the centre.

FORM: Canon (the category standard, chosen by the user on the direction page over the rolled JKR road-signage world and the buku-resit pick); not on the grounded list; seed key 3df72280.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Signature interaction and motion

Signature interaction: every summary is a door. Attention rows, status pills on the dashboard and list rows are whole-row links that land on the exact filtered view, with a 150ms background and chevron shift on hover and a visible focus ring. Motion grammar: 150 to 200ms ease-out colour and transform transitions on interactive state only; skeletons for loading; no page-load choreography; respects prefers-reduced-motion.

## Unresolved

- Bilingual UI copy (English/Bahasa Melayu) is undecided; this build keeps English.
- Dark mode is out of scope (use scene is daylight; no theme provider exists).
