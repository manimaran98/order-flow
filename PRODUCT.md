# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Primary: owners and staff of Malaysian micro and small product businesses (small distributors, wholesalers, retailers) that take orders over WhatsApp and phone calls. They use OrderFlow all day alongside WhatsApp, usually on a phone between chats, and on a desktop or laptop when doing admin work.

- **Owner (ADMIN):** captures orders, confirms prices, records payments, checks what is unpaid and what is low on stock, manages products, stock adjustments and staff accounts.
- **Staff (STAFF):** captures orders, moves orders through packing and delivery, records payments.
- **Their customers (no login):** browse the public product catalog that the business shares by link, typically in a WhatsApp chat.

Secondary: hiring managers and engineers reviewing the project as a portfolio piece. Confirmed priority: design for the real SME users first; a tool that clearly fits that job is what should impress reviewers.

## Product Purpose
One lightweight place to track orders, stock, payments and fulfilment, replacing the scattered mix of WhatsApp threads, Excel, memory, banking apps and paper. Success means no missed orders, always knowing which orders are unpaid and how much is outstanding, accurate stock, and staff knowing what is ready to pack or deliver.

It is explicitly not a POS and not an accounting system.

## Positioning
Narrow on purpose: order-to-payment tracking for businesses whose orders arrive in chat, not at a till. Order status and payment status are tracked independently (an order can be delivered and still unpaid, or paid and not yet packed), which is how these businesses actually work.

## Operating Context
- Orders arrive in WhatsApp or by phone; staff key them in while still talking to the customer, often one-handed on a phone.
- Order lifecycle: PENDING → CONFIRMED → PACKING → READY → DELIVERED, or CANCELLED from any non-terminal state. Only PENDING orders can be edited or deleted.
- Payment status (UNPAID / PARTIAL / PAID) is derived from amount paid vs total; partial payments are common.
- Confirming an order deducts stock; cancelling restores it. Every stock change is recorded in an inventory ledger.
- Business day and order numbers (ORD-YYYYMMDD-NNNN) use the Asia/Kuala_Lumpur timezone.
- Money is Malaysian Ringgit (RM), always two decimals.
- The public catalog link is shared with customers in chats.

## Capabilities and Constraints
- Screens: login, first-account registration, dashboard, orders (list, detail with status actions, payment entry, timeline, create/edit composer), customers (list, detail with order history, create/edit), products (list, detail, create/edit), inventory adjustments and ledger, user management (ADMIN only), public catalog list and product detail.
- Every app screen has a phone layout and a desktop layout rendering the same data; interactive screens keep one state owner.
- Stack (existing): Next.js 16 App Router, React 19, Tailwind CSS 4, shadcn/ui (radix-nova style), lucide-react icons, next-themes. Mutations are Server Actions; the browser never calls the API directly.
- The public catalog is statically generated with ISR and must not read cookies or headers.
- Roles: ADMIN and STAFF; admin-only actions are hidden or disabled for STAFF.
- Undecided: bilingual (English/Bahasa Melayu) UI text. Current UI is English only.

## Brand Commitments
- Name: OrderFlow. Confirmed binding.
- Standing preference (chosen in the 2026-10-08 direction round): the category standard for operations software, executed at full craft, with no novelty world or smuggled quirk. Quality bar, named by the user: Stripe Dashboard, Shopify Admin, Linear, and Vercel's dashboard (Geist).
- No logo, colour or typography commitments exist beyond that standard.

## Evidence on Hand
- Product brief: OrderFlow_Malaysian_SME_MVP.md.
- No real customers, testimonials, usage metrics, logos or product photography exist. Do not fabricate any. Product images are not part of the data model; the catalog is text and price only.
- Demo data comes from the seed script (backend/src/seed.ts).

## Product Principles
1. The job comes first: capture an order and see what needs attention in as few steps as possible, on a phone, mid-conversation.
2. Status at a glance: order status, payment status, money owed and low stock must be readable instantly, without opening a record.
3. Money is exact: amounts are always shown precisely in RM, never rounded or abbreviated in a way that hides cents owed.
4. Calm and trustworthy over flashy: this is a daily tool for small-business owners handling their customers' money.
5. One system, two screen sizes: phone and desktop are equal citizens, not a desktop app squeezed down.

## Accessibility & Inclusion
- Usable one-handed on a phone: touch targets sized for thumbs, primary actions within reach.
- Readable in bright daylight and on low-end Android phones; status must never rely on colour alone.
- No formal WCAG level has been set; treat WCAG 2.2 AA as the working floor.
