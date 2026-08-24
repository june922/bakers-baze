# Kenyan Bakers SaaS Platform — Architecture & Implementation Plan

## Context

Greenfield, multi-tenant SaaS: one Next.js/TypeScript/Tailwind codebase, one PostgreSQL database (via Knex), serving many independently-branded bakery storefronts under path-based slugs (`platform.com/sweetcrumbs`). No code exists yet. This document is the architecture to be reviewed and approved before any implementation begins, per the product brief and the following locked decisions:

1. **Order-tracking recovery (1A):** the secure tracking link is shown at checkout (with copy button + QR code) and optionally emailed if the customer supplies an email. No customer accounts, no SMS, no phone-based order lookup.
2. **Hosting (2A):** Vercel is the initial deployment target. Background/scheduled work must be designed to run correctly in a serverless environment (protected cron-triggered endpoints), not an in-process daemon.
3. **No Redis (3A):** PostgreSQL only for background jobs, locking, and rate limiting in the MVP.
4. **Infra-agnostic requirement:** despite starting on Vercel + a managed/free Postgres, core business logic must not be coupled to Vercel-specific services (no Vercel KV/Blob/Edge Config in business logic). DB access stays environment-variable-driven (`DATABASE_URL`), and the app must remain deployable to a self-hosted Docker/Node setup with minimal changes — this constraint is applied throughout the plan below (see §18 for the concrete guardrails).
5. **Subscription expiry:** the public storefront never goes fully offline on expiry — see §12.
6. **Order request changes:** no chat/negotiation system — confirm/decline with an optional note only, see §10.
7. **Mixed carts:** any request-confirm item in the cart makes the whole checkout request-confirm — one cart, one order, one lifecycle, see §9 and §10.
8. **Cancellation:** kept simple and always baker-actioned; no automatic fees, no automatic refunds — see §10 and §11.
9. **Deposits/preparation:** the baker decides when a `partially_paid` order may enter `preparing`; the system never assumes a deposit equals full payment — see §10.
10. **Templates:** architect for many templates, build one production-quality template first — see §8 and §19.

These six were clarified after the initial architecture review and are incorporated throughout the sections below (superseding the earlier assumptions that were flagged in §20 of the first draft).

---

## 1. High-Level Architecture

Single Next.js (App Router) application containing three surfaces sharing one codebase and one database:

- **Public storefront** — `/[bakerySlug]/...` — unauthenticated, customer-facing.
- **Baker dashboard** — `/dashboard/...` — authenticated, scoped to exactly one tenant.
- **Admin console** — `/admin/...` — authenticated, platform-scoped.

Layered backend, framework logic kept thin:

```
Browser
  → Next.js Route Handlers (parse/validate input, map responses)
      → Service layer (business logic, framework-agnostic, receives an explicit TenantContext)
          → Repository layer (Knex query builders, tenant_id mandatory on every tenant table)
              → PostgreSQL
      → External providers behind interfaces:
          PaymentProvider  (M-Pesa Daraja)
          StorageProvider  (S3-compatible object storage)
          EmailProvider    (transactional email, optional per order)
          JobRunner        (Postgres-backed queue, cron-triggered)

```

Shared database, shared schema, `tenant_id` discriminator column (not one DB per bakery, not schema-per-tenant) — matches the requirement to keep one platform with isolated data rather than separate deployments.

---

## 2. Next.js Application Structure

```
/app
  /(storefront)/[bakerySlug]/...        # public, ISR/SSR
  /(dashboard)/dashboard/...            # baker, authenticated
  /(admin)/admin/...                    # platform admin, authenticated
  /(auth)/login, /(auth)/admin-login    # separate login surfaces
  /api
    /storefront/[bakerySlug]/...        # cart, checkout, tracking (public, rate-limited)
    /dashboard/...                      # baker-authenticated endpoints
    /admin/...                          # admin-authenticated endpoints
    /webhooks/mpesa/order-payment
    /webhooks/mpesa/subscription-payment
    /cron/subscriptions                 # protected, cron-triggered
    /cron/jobs                          # protected, drains the Postgres job queue
  middleware.ts                         # tenant slug resolution + coarse auth gate (Edge-safe, no DB)

/src
  /modules/{tenants,auth,products,orders,payments,subscriptions,
            costing,storefront,discounts,reviews,customers,
            fulfillment,storage,notifications,audit}/
    {module}.repository.ts   # Knex, tenant_id required for tenant-owned tables
    {module}.service.ts      # business logic, pure of framework concerns
    {module}.validation.ts   # zod schemas (shared client/server)
    {module}.types.ts
  /lib
    db.ts            # Knex instance, DATABASE_URL-driven
    session.ts        # DB-backed session helpers
    tenant-context.ts  # TenantContext type + resolution helpers
    rate-limit.ts      # Postgres-backed limiter
    logger.ts
  /templates/{elegant,minimal,luxury,playful,modern}/  # storefront template registry
  /components/{storefront,dashboard,admin}/            # shared UI per surface

```

`middleware.ts` runs on the Edge runtime, so it only resolves the slug and checks cookie *presence* (cheap, no Knex/pg there — Postgres needs the Node runtime). Full tenant/session/role verification happens in route handlers and server components.

---

## 3. Backend/Service Architecture

- **Route handlers**: parse + validate (zod), call one service method, translate the result/errors into a consistent envelope `{ success, data }` / `{ success: false, error: { code, message } }`.
- **Service layer**: pure business logic. Every service method that touches tenant-owned data takes an explicit `TenantContext { tenantId, userId, role }` parameter — never reads it from a global/singleton. This makes tenant scoping visible at every call site and unit-testable without HTTP.
- **Repository layer**: Knex query builders. For tenant-owned tables, `tenantId` is a required, typed first argument on every repository function — there is no code path that can query e.g. `orders` without it.
- **Transactions**: a `withTransaction(knex, fn)` helper wraps multi-table writes (order + order items + payment record; ingredient price update cascading into cached product costs, etc.).
- **Errors**: small typed error classes (`NotFoundError`, `ValidationError`, `ForbiddenError`, `ConflictError`) caught once at the route-handler boundary and mapped to HTTP status/response shape — no ad hoc error handling per route.

---

## 4. PostgreSQL Database Architecture

Design principles: normalized schema, tenant discriminator column on every tenant-owned table, money stored as integer minor units (avoid floats), historical order data is a **snapshot**, not a live join to mutable catalog data.

**Core tables by domain** (columns summarized, not full DDL):

| Domain | Tables |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform/tenant   | `bakeries` (id, slug unique, status: trial/active/suspended/expired, template_key, branding jsonb), `users` (id, role: platform_admin/baker, tenant_id nullable — null only for platform_admin, password_hash, email, phone), `sessions` (id, user_id, tenant_id, expires_at, user_agent, ip) |
| Platform config   | `platform_settings` (key/value, e.g. trial_length_days), `plans` (key, name, price_amount, billing_interval, is_active), `templates` (key, name, thumbnail_url, is_active) |
| Subscriptions     | `subscriptions` (tenant_id, plan_id nullable, status: trialing/active/past_due/expired/cancelled, trial_ends_at, current_period_end), `subscription_payments` (tenant_id, subscription_id, amount, method, status, mpesa_receipt_number, period_covered) |
| Storefront        | `storefront_settings` (tenant_id, template_key, branding, hero content, about, contact, social, nav config), `storefront_pages`/`sections` if needed for flexible homepage sections |
| Catalog           | `categories` (tenant_id, name, slug unique per tenant), `products` (tenant_id, category_id, name, description, base_price, prep_time, ordering_mode, status, recipe_id nullable), `product_images`, `product_option_groups` (product_id, name, selection_type, required), `product_option_values` (option_group_id, label, price_delta, available) |
| Orders            | `orders` (tenant_id, order_number, tracking_token unique, status, fulfilment_method, requested_date/time, customer_id, amount_due, amount_paid), `order_items` (order_id, product_id, quantity, unit_price_snapshot), `order_item_customizations` (order_item_id, option_group_name, option_value_label, price_delta — **denormalized snapshot**, not FK-only), `order_status_history` (order_id, from_status, to_status, actor, created_at) |
| Payments          | `payments` (tenant_id, order_id, method, amount, status, mpesa_receipt_number unique nullable, verified_by nullable, raw_gateway_payload jsonb), `refunds` (tenant_id, payment_id, amount, reason, recorded_by, created_at) — a manual, auditable record of a refund the baker gave *outside* the platform (cash/M-Pesa/etc.); the platform never initiates or automates a refund transaction itself |
| Fulfilment        | `pickup_settings`, `delivery_settings`, `delivery_areas`, `calendar_blocks`, `time_slots` (all tenant_id-scoped) |
| Customers         | `customers` (tenant_id, name, phone, email nullable) — upserted from order checkout data, unique per (tenant_id, phone) |
| Discounts         | `discount_codes` (tenant_id, code, type, value, min_order, expiry, usage_limit), `discount_redemptions` |
| Reviews           | `reviews` (tenant_id, order_id, rating, comment, status: pending/approved/hidden, baker_response) |
| Costing (private) | `ingredients` (tenant_id, name, purchase_unit, purchase_price, cost_per_base_unit), `recipes` (tenant_id, name), `recipe_ingredients` (recipe_id, ingredient_id, quantity), `product_extra_costs` (recipe_id, label, amount) |
| Platform ops      | `audit_logs` (actor_id, actor_role, action, target_type, target_id, tenant_id nullable, metadata jsonb), `background_jobs` (type, payload, status, run_at, locked_at), `rate_limit_hits`, `notification_log` |

**Key constraints:**

- Every tenant-owned table: `tenant_id uuid not null references bakeries(id)`, indexed; tenant-scoped uniqueness (e.g. `unique(tenant_id, slug)` on categories, `unique(tenant_id, phone)` on customers).
- `orders.tracking_token`: unique, high-entropy, indexed — the sole authorization mechanism for the public tracking page (never the order id).
- `payments.mpesa_receipt_number`: unique — makes webhook replay idempotent at the DB level, not just app logic.
- Money columns: `integer` (minor units, e.g. cents-equivalent for KES).
- Costing tables are never joined into any storefront/public query path — architectural separation, not just a permission check, so a coding mistake can't leak margins to a customer-facing endpoint.
- **Optional hardening (Phase 2+, not MVP-blocking):** Postgres Row-Level Security using a per-transaction `SET app.tenant_id` as defense-in-depth on top of the repository-layer enforcement described in §5. Not required for MVP since the spec asks for enforcement "at the backend/data-access layer," which the repository pattern already satisfies.

---

## 5. Multi-Tenancy Strategy

- Shared DB, shared schema, `tenant_id` column — the standard, cost-effective model for this scale, and explicitly what the brief asks for.
- **Enforcement point:** the repository layer. Every repository function for a tenant-owned table has `tenantId` as a mandatory, typed argument — it is not possible to call, say, `ordersRepository.findById(orderId)` without also passing a `tenantId`, so a missing scope is a compile-time error, not a runtime bug.
- **Tenant resolution, two distinct paths:**
  - Storefront (public): from the URL slug → `bakeries` lookup → `tenant_id`. Cheap, cacheable (ISR), never trusts a client-supplied tenant id.
  - Dashboard/API (authenticated): from the logged-in baker's session (`users.tenant_id`) — **never** from a request body/query param, even if one is present (any client-supplied tenant identifier is ignored).
- Admin routes operate platform-wide by design and are explicitly excluded from the tenant-scoping requirement (matches "admin should not manage a bakery's data as if they were the baker" — admin actions on a specific bakery are logged, separate, and clearly distinguished from baker self-service).
- **Verification:** a dedicated tenant-isolation test suite exercises every tenant-owned repository method with two seeded tenants and asserts tenant A can never read or mutate tenant B's rows, including via guessed/adjacent IDs (see §17).

---

## 6. Authentication & Authorization

- Two identity pools in one `users` table, discriminated by `role` (`platform_admin` | `baker`); `tenant_id` is `null` for admins, required for bakers (enforced by a CHECK constraint). No customer accounts, per spec.
- **Passwords:** bcrypt (or argon2id), salted, never logged or returned in any API response.
- **Sessions:** server-side rows in `sessions` (Postgres, no Redis), referenced by an httpOnly, Secure, SameSite=Lax cookie holding only an opaque session id. This means a session is instantly revocable (delete the row) — important for "suspend bakery" (all that baker's sessions can be invalidated immediately) and for admin-forced logout.
- **CSRF:** double-submit token (or strict origin/referer check) on all state-changing dashboard/admin routes.
- **Authorization:** coarse role guard at the route-handler boundary (`requireBaker`, `requireAdmin`) plus a resource-level check in the service layer (e.g. "does this order's `tenant_id` match the caller's `tenant_id`") — two layers so a guard bug alone can't cause a cross-tenant leak.
- **Order tracking is not session-based.** `orders.tracking_token` is a cryptographically random, high-entropy, unique, indexed value. The tracking page authorizes purely on token possession (`/track/[token]`), never on order id, matching the "no sequential ID as authorization" requirement and the locked 1A decision (link shown at checkout + optional email, no lookup flow, no accounts).
- Admin 2FA (TOTP) is a reasonable Phase 2+ hardening item given "admin access must be secure and auditable," proposed but not MVP-blocking — flagged, not assumed as required.

---

## 7. Storefront Routing Strategy

- Path-based tenancy: `platform.com/[bakerySlug]/...`.
- `middleware.ts` resolves the slug's existence/status cheaply (Edge-safe check); an unknown or suspended slug renders a friendly "storefront unavailable" page rather than a generic 404 or a raw error (better for brand/SEO than a bare error page — flagged as an assumption, see §20c).
- **Rendering:** ISR, with `revalidateTag('storefront:{tenantId}')` fired whenever a baker saves storefront settings/products, so edits go live quickly without paying full SSR cost on every anonymous visit.
- **Future custom domains** (explicitly not built now): the same middleware resolution step can add a second lookup path — `custom_domain → tenant_id` — so enabling custom domains later is a routing/DNS addition, not a new codebase or a rearchitecture.

---

## 8. Template Architecture

- Templates are **code**, not a runtime page-builder: `/src/templates/{key}/` exports a fixed set of section components (Header, Hero, About, ProductGrid, Footer, …) implementing one shared `TemplateSectionProps` contract, all fed from a single `StorefrontData` object assembled by the storefront service (bakery info, branding, products, categories, approved reviews, settings).
- `templates` table is admin-managed (`is_active` flag) — satisfies "admin controls which templates are available."
- `storefront_settings.template_key` selects the template; branding (colors, fonts, logo, hero images) is passed in as theme tokens/CSS variables, so one template's code serves every tenant that picks it.
- Adding a new template later = a new folder + a registry entry; no tenant-data-model changes.
- **MVP scope:** the registry, the `TemplateSectionProps` contract, and the `templates`/`storefront_settings.template_key` data model are all built for *many* templates from day one, but only **one** template is fully implemented to production quality initially (Phase 1). This is a deliberate scope cut, not an architecture limitation — the second template is pure addition (new folder + registry row), never a refactor of catalog/order/tenant code, which is the actual test of whether the pluggability goal was met.

---

## 9. Product & Customization Architecture

- `products` carry `ordering_mode` (instant | request_confirm) — configurable per product, per the requirement that "the baker should be able to configure which products use which ordering mode."
- `product_option_groups` (e.g. Size, Flavour, Filling, Extras) each have a `selection_type` (single/multiple) and `required` flag; `product_option_values` hold the label and `price_delta` (can be zero, e.g. "None" filling).
- **Order-time snapshot:** `order_item_customizations` stores the chosen option group/value **names and price_deltas as they were at checkout**, not just foreign keys — because a baker may later rename/reprice/delete an option, but a historical order (and its payment) must retain exactly what was agreed and paid for. This is a deliberate denormalization, not an oversight.

---

## 10. Order State Machine

**Cart → order granularity:** one cart produces exactly one order with one lifecycle. If a cart contains *any* request-confirm product, the entire checkout follows the request-confirm flow — there is no partial charge/confirm of individual items within one cart. This is enforced at cart-checkout time (a service-level `resolveCheckoutMode(cartItems)` that returns `instant` only when every item is instant-mode), not per-item inside the order.

```
requested ──confirm──▶ confirmed ──declined──▶ declined            (request_confirm mode only)
requested ──decline──▶ declined
confirmed ────────────▶ awaiting_payment
awaiting_payment ──▶ partially_paid | paid | payment_failed
payment_failed ──retry──▶ awaiting_payment
partially_paid ──balance settled──▶ paid
partially_paid ──baker authorizes──▶ preparing        (baker's call — see below)
paid ──▶ preparing ──▶ ready ──▶ completed
[requested|confirmed|awaiting_payment|partially_paid|paid|preparing|ready] ──cancel (baker action)──▶ cancelled

```

- Instant-order mode enters directly at `confirmed` (system-confirmed, no baker review step) and follows the same payment→fulfilment path.
- `declined`, `cancelled`, `completed` are terminal — no further transitions accepted.
- **Deposits/preparation:** the platform never hard-codes a deposit percentage or assumes a deposit equals full payment. `partially_paid → preparing` is a transition the *baker* explicitly triggers when their own operational rules are satisfied (e.g. "50% deposit is enough for me to start"); the system's only job is to always display the outstanding balance (`amount_due − amount_paid`) on both the dashboard and the customer's tracking page, whatever the order's payment state.
- **Order request changes (no chat):** for request-confirm orders the baker can confirm or decline, optionally attaching a short note on decline. The note and the decision are shown on the customer's secure tracking page. There is no messaging/negotiation thread — if the customer wants something different, they submit a new request (a new cart/order), which is a deliberate scope decision, not an oversight.
- **Cancellation is always a baker-initiated action** (customers have no accounts/session and no cancel action of their own). Allowed from any pre-`completed`, non-terminal state, including `preparing`/`ready`. No automatic cancellation fees and no automatic refunds are introduced by the system — if a baker wants to refund a customer after cancelling a paid order, they do so outside the platform (cash/M-Pesa/etc.) and record it via the `refunds` table (§4, §11) for auditability; the platform itself never processes a refund transaction.
- **Enforcement:** an explicit `ALLOWED_TRANSITIONS` map checked inside a DB transaction with `SELECT ... FOR UPDATE` on the order row, preventing a race between (e.g.) a baker action and a concurrent M-Pesa webhook from producing an invalid state.
- Every transition writes an `order_status_history` row (actor, from/to, timestamp, note where applicable) — this is both the audit trail and what the tracking page reads.
- **Payment-driven transitions** (`paid`, `partially_paid`, `payment_failed`) are only ever written by the payment-verification service (webhook handler or baker's manual-verification action) — never accepted as an arbitrary client-supplied status change. This is the concrete mechanism behind "do not allow arbitrary status changes that could corrupt payment/order records."

---

## 11. Payment Architecture

Two flows, kept structurally separate (different tables, different webhook routes), matching "bakery sales are not platform revenue":

**Flow 1 — bakery sales (customer → bakery):** `payments` (tenant_id, order_id, method [mpesa|bank_transfer|till|paybill|cash|other], amount, status, mpesa_receipt_number unique, verified_by, raw_gateway_payload). Manual methods (bank/till/paybill/cash) go through `pending → verified` with the verifying baker user id recorded — an auditable action, not silent.

**Flow 2 — platform subscription (baker → platform):** `subscription_payments`, structurally identical pattern but a separate table and a separate webhook route (`/api/webhooks/mpesa/subscription-payment` vs `/order-payment`) so the two money flows can never be confused in code or in reporting.

- `PaymentProvider` interface wraps Safaricom Daraja (STK Push initiate + status query) — this API is the same regardless of hosting, no lock-in concern.
- **Webhook security:** secret path segment, payload/signature validation per Daraja's contract, and idempotent processing via the unique constraint on `mpesa_receipt_number`/checkout-request-id — a duplicated callback cannot double-apply a payment. Where Daraja's status-query API is available, the handler re-verifies rather than trusting the callback body alone.
- Deposit vs full payment is a per-bakery (optionally per-product) configurable policy; `orders.amount_due`/`amount_paid` are derived from the `payments` sum, driving the state transitions in §10.
- **Refunds:** explicit and auditable, never automatic. A baker who wants to refund a cancelled/paid order records it via `refunds` (payment_id, amount, reason, recorded_by) — this is a bookkeeping entry, not a payment-gateway reversal initiated by the platform, consistent with "the platform does not hold bakery customer money."

---

## 12. Subscription Architecture

- `plans` is admin-managed data (price, interval, active flag) — **prices are configuration, not hardcoded**, per the explicit requirement; seeded with Monthly 1,000 KES / Annual 10,000 KES but changeable from platform settings.
- On bakery signup: a `subscriptions` row is created with `status = trialing`, `trial_ends_at = now() + platform_settings.trial_length_days` (also admin-configurable — "manage trial settings"), no card required.
- **Trial/expiry enforcement (serverless-safe, per 2A):** a protected `/api/cron/subscriptions` route, triggered by Vercel Cron on a daily schedule, scans subscriptions whose `trial_ends_at`/`current_period_end` has passed without a valid payment, and flips status to `expired`. The route itself is just an HTTP endpoint guarded by a shared secret — moving off Vercel later only means swapping the trigger (system cron / `node-cron`) for the same endpoint, with zero business-logic change.
- Renewal: baker-initiated M-Pesa STK push for their plan price → `subscription_payments` row → on verified webhook, `current_period_end` extends and status returns to `active`.
- **Expiry behavior (clarified):** an expired subscription never takes the public storefront offline.
  - **Storefront:** remains publicly visible (browsing, product pages, past-order tracking all keep working). The checkout/cart-creation entry points are disabled, and the storefront clearly indicates ordering is temporarily unavailable (e.g. a banner on the product/cart UI) rather than silently failing at the last step.
  - **Dashboard:** becomes read-only/restricted for the baker, with two carve-outs: (1) the subscription/renewal screen stays fully functional so they can pay to reactivate, and (2) existing/in-progress orders remain accessible — including orders still in `requested`/`awaiting_confirmation` at the moment of expiry, since "necessary access to existing orders" means the baker can still confirm/decline/fulfil work already in the pipeline, not just view it read-only.
  - Enforced the same way as tenant scoping: the `subscriptions.status` check happens in the service layer (a `requireActiveSubscription` guard) wrapping only the *mutating, new-order-creation* and *catalog-editing* code paths — read paths and the existing-order-management paths are exempt by design, not by an ad hoc exception list.

---

## 13. Costing/Pricing Architecture

- `ingredients` hold a purchase price and a derived `cost_per_base_unit` (e.g. cost per gram), recomputed whenever the baker updates a price after a new purchase.
- `recipes` + `recipe_ingredients` define a per-product ingredient breakdown; `product_extra_costs` cover packaging/labour/gas-electricity/decorations/other.
- **Computation (service-layer, not a stored source of truth beyond caching):**
  - `total_ingredient_cost = Σ (recipe_ingredient.quantity × ingredient.cost_per_base_unit)`
  - `total_production_cost = total_ingredient_cost + Σ extra_costs`
  - `profit = selling_price − total_production_cost`; `margin% = profit / selling_price`
- "Compare different selling prices" is a pure calculator in the service (no persistence needed beyond letting the baker save a chosen price back onto the product).
- "Pricing recommendation/range" is a plain formula (e.g. `cost ÷ (1 − target_margin%)`) — explicitly **not** AI/forecasting, matching the exclusion.
- **Privacy is structural:** costing tables are never referenced by any storefront/public code path, not merely permission-gated — a mistake in a public endpoint physically cannot join to `ingredients`/`recipes` because those repositories are only imported by the costing and dashboard modules.

---

## 14. File/Image Storage Strategy

- `StorageProvider` interface (`putObject`, `getSignedUploadUrl`, `deleteObject`) abstracts an **S3-compatible** object store — works identically against Cloudflare R2, AWS S3, or a self-hosted MinIO later, so switching provider (or hosting) is a config/credentials change, not a code change (this satisfies the infra-agnostic requirement directly). Start on a free/low-cost S3-compatible tier (e.g. R2's free tier).
- Key namespacing: `tenants/{tenant_id}/{category}/{uuid}-{filename}` — prevents cross-tenant key guessing; uploads always go through server-issued, tenant-scoped presigned URLs, never a client-chosen key.
- **Validation:** content-type allowlist (jpeg/png/webp), max size, magic-byte sniffing (not trusting client-declared MIME), EXIF stripped and resized via `sharp` server-side before storage.
- Delivery via Next.js `<Image>`, which optimizes correctly both on Vercel and on a self-hosted Node server (sharp-based) — no code change needed when migrating hosts.

---

## 15. Security Architecture

Checklist mapped to the spec's requirements and the mechanisms above:

- **AuthN/AuthZ:** bcrypt/argon2 passwords, DB-backed revocable sessions, role guards + service-layer resource checks (§6).
- **Tenant isolation:** mandatory `tenantId` in every tenant-table repository signature + isolation test suite (§5, §17); optional RLS as later hardening.
- **CSRF:** double-submit token / origin checks on dashboard & admin mutations.
- **XSS:** React's default escaping; strict CSP headers; any rich baker-authored content (about/homepage text) passed through an allowlist HTML sanitizer before storage and render — never raw `dangerouslySetInnerHTML` of user input.
- **SQL injection:** Knex parameterized queries exclusively; no raw string concatenation into SQL.
- **Input validation:** zod schemas at every route-handler boundary.
- **File upload validation:** as in §14.
- **Rate limiting (Postgres-backed, per 3A):** a `rate_limit_hits` table (or fixed-window counters) protects login, checkout/order-creation, tracking-token access, and cron/webhook endpoints from abuse.
- **Order tracking tokens:** crypto-random, high-entropy, unique, never order-id-derived (§6).
- **Payment verification:** server-side re-verification against Daraja where possible, idempotent webhook handling, unique-constraint-backed replay protection.
- **Webhook security:** secret URL segment + payload validation + raw-payload audit logging.
- **Secrets management:** environment variables only, documented `.env.example`, nothing sensitive in `NEXT_PUBLIC_*`/client bundles.
- **Audit logging:** `audit_logs` for admin actions (suspend/reactivate, template/plan changes) and sensitive baker actions (manual payment verification, cancellations) — queryable from Admin → Audit Logs.
- **Secure error handling:** generic client-facing errors, detailed structured logs server-side only.
- **DB constraints:** FKs, NOT NULL, tenant-scoped uniqueness, non-negative price checks, idempotency-supporting unique constraints (`mpesa_receipt_number`, `tracking_token`).

---

## 16. SEO & Performance Strategy

- `generateMetadata` per bakery/product page (title, description, OG tags) sourced from `storefront_settings`/product data; per-tenant sitemap and a `robots.txt` that allows storefront paths and disallows `/dashboard`, `/admin`.
- ISR + tag-based revalidation (`revalidateTag('storefront:{tenantId}')`) on content changes, CDN caching for static assets.
- Image optimization via `<Image>` + `sharp`; lazy-loading below the fold.
- Mobile-first Tailwind layouts across all templates; accessibility basics (semantic HTML, required alt text on product images, a minimum-contrast check/adjustment against a baker's chosen brand color so custom branding can't produce unreadable text).
- JSON-LD structured data (LocalBusiness/Product) — nice-to-have, Phase 7 polish, not MVP-blocking.
- Dashboard/admin: usability over SEO, `noindex`, standard client-rendered patterns.

---

## 17. Testing Strategy

- **Unit (Vitest):** service-layer logic — costing calculations, the full order-state transition matrix (every legal transition passes, every illegal one is rejected), discount math, pricing formulas.
- **Integration:** repository layer against a real ephemeral Postgres (Docker Compose in CI). Centerpiece: the **tenant-isolation suite** — for every tenant-owned repository method, seed two tenants and assert tenant A can never read/write tenant B's rows, including via guessed adjacent IDs.
- **API/contract tests:** auth flows, role guards, and webhook idempotency (send the same M-Pesa callback twice, assert exactly one state transition and one payment row).
- **E2E (Playwright):** instant-order checkout end-to-end, request-and-confirm flow (submit → baker confirms/declines → pay → fulfil), order tracking page with valid vs. invalid/foreign token, storefront rendering across templates.
- **CI:** lint/typecheck/unit/integration on every PR against an ephemeral DB; E2E on a scheduled or pre-deploy gate.
- **Portability acceptance test (ties to §18):** the app must `next build && next start` cleanly as a plain Node process against a Dockerized Postgres, with no Vercel-only API in the request path — run this locally before each major milestone to catch accidental coupling early rather than discovering it at a future migration.

---

## 18. Deployment Architecture

- **Environments:** local (Docker Compose Postgres), preview (Vercel preview deployments + a preview/staging Postgres), production (Vercel + a managed/free-tier Postgres to start, e.g. Neon/Supabase).
- **Infra-agnostic guardrails** (concrete, enforced, not just aspirational):
  - Database access only via `pg`/Knex and a `DATABASE_URL` env var — no Vercel Postgres-specific driver/SDK in business logic.
  - Object storage only via the `StorageProvider` interface over the S3 API (§14) — no Vercel Blob in business logic.
  - Background/scheduled work: business logic lives in a plain protected HTTP endpoint + a Postgres `background_jobs` table (`SELECT ... FOR UPDATE SKIP LOCKED` for safe concurrent draining); **only the trigger differs** between Vercel Cron (`vercel.json`) today and system cron/`node-cron` on self-hosted infra later.
  - Sessions and rate limiting are Postgres-backed (§6, §15) — no Vercel KV/Edge Config dependency.
  - A `Dockerfile` is part of Phase 0 deliverables (even while deploying to Vercel day-to-day) so the self-hosting path is exercised continuously, not discovered at migration time.
- **Migrations:** Knex migrations run via one deploy-step command (`knex migrate:latest`) — identical regardless of host.
- **Secrets:** Vercel env vars today, same variable names/values portable to `.env`/Docker secrets on self-hosted infra later.

---

## 19. Recommended Development Phases

- **Phase 0 — Foundations:** repo scaffold, DB schema + Knex migrations, auth (baker + admin), tenant resolution middleware, base layouts for all three surfaces, CI pipeline, Dockerfile.
- **Phase 1 — Core storefront & catalog:** categories/products/options CRUD, **one** fully-built, production-quality template (registry architected for many, only one implemented now — additional templates are explicitly deferred so implementation time isn't split before core flows are proven), public storefront rendering, product customization UI.
- **Phase 2 — Ordering & checkout:** both order modes, cart, order state machine, order tracking page/token.
- **Phase 3 — Payments:** M-Pesa integration for order payments, manual payment methods + verification, subscription payments, trial/expiry enforcement.
- **Phase 4 — Baker operations:** calendar, delivery/pickup settings, discounts, customers, reviews.
- **Phase 5 — Costing & pricing module.**
- **Phase 6 — Admin console & analytics:** bakery management, templates, subscriptions, audit logs, support, analytics.
- **Phase 7 — Polish & hardening:** remaining templates, SEO/perf pass, optional RLS hardening, admin 2FA, load/security testing, a full self-host (Docker) deployment rehearsal.

---

## 20. Ambiguities & Risks (flagged, not silently resolved)

**Resolved:**

- Tracking-link recovery, hosting target + infra-agnostic requirement, Postgres-only/no Redis (first review round).
- Subscription expiry behavior, order-request-decline scope (no chat), mixed-cart checkout mode, cancellation boundaries, deposit/preparation authority, and template MVP scope (this review round) — all incorporated into §8–§12, §19 above.

**Remaining — not blocking, low-risk defaults stated for completeness:**

- **(a) Suspended-bakery storefront behavior:** assumed a friendly "temporarily unavailable" page rather than a bare 404, for brand/SEO reasons, when the *platform admin* suspends a bakery (a distinct case from subscription expiry, which per §12 keeps the storefront live). This is a small, reversible UI choice — flagged for awareness, doesn't block Phase 0–1.
- **(b) Currency:** assumed KES-only, integer minor-unit storage — no multi-currency requirement anywhere in the brief; a design assumption, not an open risk.
- **(c) Concrete vendor picks** (S3-compatible storage provider, transactional email provider) are deliberately left swappable behind interfaces per the infra-agnostic requirement — recommend picking free-tier options at Phase 0 build time (e.g. Cloudflare R2, Resend) rather than deciding now; no architectural risk either way.
- **(d) Admin 2FA and Postgres RLS** remain proposed as Phase 7 hardening, not MVP requirements.

**Genuinely blocking implementation: none.** Every decision that would have changed the data model, the state machine, or a core flow has been resolved across the two review rounds above. Phase 0 (schema, migrations, auth, tenant middleware, CI, Dockerfile) can begin as scoped.

---

## Validation Approach for This Plan

Once implementation starts, the plan is considered on-track when: the tenant-isolation suite (§17) passes for every tenant-owned repository from Phase 0 onward; the order state-machine transition matrix has a passing/failing test for every legal and illegal transition before Phase 2 ships; the M-Pesa webhook idempotency test (duplicate callback → single state change) passes before Phase 3 ships; and the `next build && next start` portability check (§17) is run at the end of each phase, not deferred to a future migration.

---

## Revised sections that changed

- **§1 High-Level Architecture** — added the two framework-boundary rules (middleware never touches Postgres; services never call `revalidateTag`) plus a new `CacheInvalidator` provider in the architecture diagram.
- **§2 App Structure** — `middleware.ts` now documented as pathname/cookie-only; added `tenant-context.ts` (holds `resolveTenantBySlug`) and `cache-invalidator.ts` (the only file allowed to import `next/cache`).
- **§4 Database** — `orders.tracking_token` → `tracking_token_hash`; `order_number` vs `tracking_token_hash` vs internal `id` explicitly distinguished; `payments`/`subscription_payments` gained `checkout_request_id`/`merchant_request_id` and a `pending/settled/failed` status enum; `background_jobs` fleshed out with `attempts`, `max_attempts`, `locked_by`, `last_error`; added `refunds` table; `order_status_history` gained a `note` column.
- **§5 Multi-Tenancy** — tenant resolution reframed as an application-layer (`resolveTenantBySlug`, React `cache()`-wrapped) concern, explicitly not middleware.
- **§6 Auth** — tracking-token section rewritten around hash-at-rest.
- **§7 Storefront Routing** — middleware role narrowed; cache invalidation moved to route handlers via `CacheInvalidator`.
- **§11 Payments** — idempotency redesigned around `checkout_request_id` (exists from initiation) rather than `mpesa_receipt_number` (only exists on success); added the transactional lock-check-update-derive sequence; added the `amount_paid` counts-only-`settled` rule.
- **§12 Subscriptions** — `requireActiveSubscription()` replaced with a centralized `getSubscriptionCapabilities()` policy attached to `TenantContext`.
- **§16, §18** — revalidation wording updated to route through `CacheInvalidator`; added DB connection-pooling and cron-batch-size notes.
- **§19/§20** — Phase 0 split into 0A/0B; ambiguity list updated with three new low-risk flagged items.

## Additional issues worth resolving (none blocking)

1. **Serverless DB connection pooling** — needs a pooled `DATABASE_URL` (e.g. Supabase/Neon's pgbouncer endpoint) chosen deliberately in Phase 0A, or connection exhaustion becomes a production incident later.
2. **Cron job batch size** — `/api/cron/jobs` must process a bounded batch per invocation, not drain the whole queue, to stay inside serverless execution limits.
3. **Self-hosted `CacheInvalidator` implementation** — the interface is portable now; the actual self-hosted implementation (e.g. reverse-proxy purge) is correctly deferred to the Phase 7 migration rehearsal, not needed today.

## Final Phase 0A / 0B plan

**Phase 0A — Technical foundations:** repo scaffold (Next.js/TS-strict/Tailwind), Knex+`pg` wired to `DATABASE_URL` with one smoke-test migration, Docker Compose + Dockerfile (`next build && next start` proven from day one), CI (typecheck/lint/build/migrate), placeholder route groups for all three surfaces, and `middleware.ts` doing pathname-parsing only. No tables beyond the smoke test, no auth, no tenant concept.

**Phase 0B — Tenancy + auth:** migrations for `bakeries`/`users`/`sessions` (with the role/tenant_id CHECK constraint), `resolveTenantBySlug` in the application layer, password hashing + DB-backed sessions + login/logout for baker and admin, route guards, CSRF wiring, and the tenant-isolation test suite scaffolded against these three tables. Subscriptions/catalog/orders/payments stay out of scope.
