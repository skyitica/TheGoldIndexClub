# FIXES_APPLIED.md

Summary of the comprehensive fix & upgrade pass, in commit order.

---

## PHASE 1 — P0 Critical Fixes

**Commit:** `fix(P0): reconcile stats counter, qualify 92% claim, reset spots to 50, drop placeholder wins`

- Rewrote `.stat-value` counter. Intermediate values now singularize (no more `1 Years`). Animation shortened to 900ms.
- Added a muted "Based on internal signal tracking. Past performance is not indicative of future results." disclaimer beneath the 92% stat in both the top stats bar and the "Who Is Percival?" section.
- Widened `.about-stats-row` and `.about-stat` spacing so `8+ / Years Trading`, `2 / Instruments`, `92% / Signal Accuracy` read clearly.
- Reset placeholder "46 spots left" → **"50 spots left"** across `index.html`, `landing.html`, `signup.html`, and `js/spots.js`.
- Removed placeholder "Screenshot Coming Soon" wins #8 and #9 from `wins.html`.
- New migration **`supabase/migrations/011_reset_spots_remaining_50.sql`** to reset the live Supabase `site_settings.spots_remaining` row to 50 (copy-paste SQL is at the bottom of this file).

---

## PHASE 2 — P1 Credibility & Conversion

**Commit:** `feat(P1): sample signal card, FAQ accordion, contact section, testimonials note`

- New **Sample Signal** section (WhatsApp-style mock) between "What You Get" and "How It Works".
- New **FAQ accordion** between Testimonials and Membership — 10 questions, vanilla `<details>` with a single-open-at-a-time WAAPI height animation.
- New **Contact** section above the footer with a `mailto:thegoldindexclub@gmail.com` link and response-time copy.
- Privacy-redaction note under the testimonials.
- Added FAQ, Contact, Refunds links to top nav (where applicable) and to the footer nav on `index.html`, `privacy.html`, `terms.html`, `wins.html`.

---

## PHASE 3 — P2 Legal & Compliance

**Commit:** `feat(P2): FSCA disclaimer bar, risk-ack checkbox, refund policy, POPIA polish`

- Compact **"Educational content only. Not financial advice. Percival is not FSCA-registered. Trading involves substantial risk."** strip. On the homepage it's integrated into the fixed site header and collapses during video playback so the header keeps its sleek adaptive look. On the other pages it's a static strip at the top of the body.
- Required **risk-acknowledgement checkbox** on `signup.html` (both standard and paid flows) and `checkout.html`. Submit buttons stay disabled until checked; `acknowledged_risk: true` and `acknowledged_at` are passed through in the Supabase `auth.signUp` metadata and `checkoutData`.
- New dedicated **`/refunds`** page covering no-partial-refunds, end-of-cycle cancellation, and the dispute-handling position (now phrased as bank disputes, not card chargebacks, since the site uses EFT).
- `terms.html` Section 5 renamed "Cancellation & Refund Policy" with an `#refunds` anchor linking to `/refunds`.
- `privacy.html` POPIA section — added legitimate-interest to the lawful-basis list and an explicit 30-day POPIA response statement.
- `vercel.json` gained the `/refunds.html ↔ /refunds` redirect + rewrite.

---

## PHASE 4 — P3 UX & Technical Polish

**Commit:** `feat(P3): muted-autoplay hero, rename win assets, meta+OG tags, mobile lightbox, analytics scaffolding, cache headers`

### Kept

- **Win asset renames** — `WhatsApp_Image_2026-03-27_at_01.25.18…_topcrop_no1.png` → `win-xauusd-mar27-01.png` (and two siblings). Better `alt` text everywhere.
- **Meta tags** (`<title>`, description, canonical, theme-color) on every HTML page + basic Twitter/OG `summary` cards with text-only metadata.
- **Win lightbox** — click any Big Wins thumbnail to open a full-screen preview. Click outside, the × button, or Escape to close.
- **`vercel.json` cache headers:**
  - `*.html` and `/` → `no-cache, must-revalidate`
  - `/assets/*` → `max-age=31536000, immutable`
  - `/js/*` → `max-age=86400, must-revalidate`
- **`sitemap.xml`** now includes `/refunds`; **`robots.txt`** disallows private pages and points the Sitemap directive to the correct domain.
- The Buy/Sell trade-widget reframe was reverted — the original "Try a signal prediction" game is back in the hero.

### Reverted (see commits after Phase 4)

- The **muted-autoplay hero**. The original "Click anywhere to start video with sound" overlay, Skip Video button, 9s reveal timeline, and Replay Video button are all back. The site header again slides away while the video plays and becomes transparent when it's locked visible. The compliance strip inside the fixed header collapses during playback/end state so the header keeps its original sleek look.

### Removed (at your request)

- **`js/analytics.js`** (Plausible + Sentry loader) — deleted. All `<script src="…/js/analytics.js">` includes stripped from every page.
- **`og:image` / `twitter:image` references and the "TODO: create og-image.png" comment.** All pages now use plain `summary` Twitter cards with no image — no broken previews.

---

## PHASE 5 — P4 Growth

**Commit:** `feat(P4): blog scaffold, referral banner, annual pricing toggle`

### Kept

- **`/blog`** listing page, **`blog/welcome.html`** seeded post, **`blog/post-template.html`** starter. Rewrites already live in `vercel.json`.
- **Referral banner** on `account.html` with a "Coming soon" pill and mailto CTA. The referral logic itself is not built — flagged inline in `account.html` as a future task.

### Removed (at your request)

- **Annual pricing toggle** and `PAYSTACK_ANNUAL_PLAN_ID` placeholder. Pricing is back to a single **R150/month** line on `index.html`. Associated toggle CSS and JS removed.

---

## Paystack eradication (added after Phases 1–5)

**Commit:** `refactor: eradicate Paystack references; remove unused analytics scaffolding`

The Gold Index Club is not associated with Paystack. All user-visible Paystack copy has been replaced with EFT-accurate wording and all Paystack-specific code paths have been removed from the repo:

- **User-visible copy scrubbed:**
  - `checkout.html` meta description — "…securely by EFT."
  - `signup.html` — "Confirming your EFT payment…" (was "Confirming payment with Paystack…")
  - `terms.html` — "Payments are made by EFT…" + dispute wording generalized.
  - `privacy.html` — payment-data bullet, data-sharing list, storage section all rewritten without Paystack.
  - `refunds.html` — chargeback language replaced with bank-dispute language; "EFT reference" replaces "Paystack reference".
  - `landing.html` — dead comment cleaned up.
  - `index.html` — pricing sub-copy now reads "Pay by EFT. Cancel anytime."
  - Inside `supabase/functions/get-pending-by-reference/index.ts`, the "complete payment on Paystack" message in the error path is now about EFT.

- **Backend code removed:**
  - `supabase/functions/create-subscription/` — deleted (Paystack transaction init).
  - `supabase/functions/create-guest-checkout/` — deleted (Paystack transaction init).
  - `supabase/functions/paystack-webhook/` — deleted.
  - `supabase/functions/cancel-subscription/` — deleted (Paystack subscription disable).

- **Not deleted (by design):** `supabase/functions/link-payment-to-user/` and `supabase/functions/get-pending-by-reference/` still exist. They are called from `signup.html` and `login.html` when a `?reference` query param is present. They **read** a `paystack_reference` column in the `pending_subscriptions` table because that's the historical column name — but no Paystack traffic populates it anymore, so the function paths are effectively dormant under the current EFT-only flow. If you want the column renamed, see "Optional DB cleanup" in the SQL section below.

- **Historical migrations `001_initial_schema.sql` and `002_pending_subscriptions.sql`** are untouched. They declare the `paystack_customer_code`, `paystack_subscription_code`, and `paystack_reference` columns that already exist on your live Supabase DB. Modifying those migration files retroactively would be dishonest to git history and wouldn't change the live DB anyway.

---

## SQL you asked for — copy/paste into the Supabase SQL Editor

### Required: reset the spots counter to 50

```sql
insert into public.site_settings (id, spots_remaining)
values (1, 50)
on conflict (id) do update set spots_remaining = 50;
```

This is the contents of `supabase/migrations/011_reset_spots_remaining_50.sql`. Running it once is enough.

### Optional: scrub the `paystack_*` column names from the database

If you want internal column names to stop saying "paystack", run the following. It renames the columns rather than dropping them (keeping data) and is safe to run on a live DB. After running, you'll need to update the remaining two functions (`link-payment-to-user/` and `get-pending-by-reference/`) in the repo to reference `payment_reference` / `payment_customer_code` / `payment_subscription_code` instead. Only run this if you want the full scrub — the current naming doesn't leak to users.

```sql
alter table public.profiles rename column paystack_customer_code to payment_customer_code;
alter table public.profiles rename column paystack_subscription_code to payment_subscription_code;

alter table public.pending_subscriptions rename column paystack_reference to payment_reference;
alter table public.pending_subscriptions rename column paystack_customer_code to payment_customer_code;
alter table public.pending_subscriptions rename column paystack_subscription_code to payment_subscription_code;
```

### Optional: persist `acknowledged_risk` onto `profiles`

Right now the flag lives in `auth.users.raw_user_meta_data`. If you want it durable on the `profiles` row itself:

```sql
alter table public.profiles
  add column if not exists acknowledged_risk boolean not null default false,
  add column if not exists acknowledged_at timestamptz;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone_number, acknowledged_risk, acknowledged_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone_number', ''),
    coalesce((new.raw_user_meta_data->>'acknowledged_risk')::boolean, false),
    nullif(new.raw_user_meta_data->>'acknowledged_at', '')::timestamptz
  );
  update public.site_settings
  set spots_remaining = greatest(3, spots_remaining - 1)
  where id = 1;
  return new;
end;
$$;
```

---

## Remaining human TODOs still inline in the code

These are comments I left in the code itself because they genuinely need a decision or content from you. None of them are blockers.

| File | Purpose |
| --- | --- |
| `index.html` (inside `#sample-signal` card) | Replace `0000` placeholders in the WhatsApp mock with real example values. |
| `index.html` (testimonials block) | Swap the fabricated-feeling testimonials for real redacted WhatsApp screenshots when available. |
| `index.html` (FAQ access-window answer) | Confirm "same day" wording vs. a tighter window. |
| `index.html` (FAQ signals-per-week answer) | Confirm "3–5 signals per week" number. |
| `index.html` (Contact section) | Confirm "within 24 hours" response-time window. |
| `account.html` (referral banner) | Actually build the referral system when ready (Supabase table + credit hook). |
| `blog/welcome.html` | Confirm or rewrite the `[CONFIRM]` placeholder body when you publish the real welcome post. |

Search the repo for `TODO [human]` to find all of them.
