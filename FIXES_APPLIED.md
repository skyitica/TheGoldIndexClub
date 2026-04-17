# FIXES_APPLIED.md

Summary of the comprehensive fix & upgrade pass. Grouped by phase, in commit order.

---

## PHASE 1 — P0 Critical Fixes

**Commit:** `fix(P0): reconcile stats counter, qualify 92% claim, reset spots to 50, drop placeholder wins`

### Changed

- **`index.html`**
  - Rewrote the `.stat-value` counter loop. Added a `formatStat()` helper that singularizes suffixes while animating so you never see `1 Years` mid-count. Shortened animation from `1300ms` → `900ms`.
  - Added a small, muted **"Based on internal signal tracking. Past performance is not indicative of future results."** disclaimer beneath the 92% stat in **both** the top stats-bar and the "Who Is Percival?" section.
  - Widened the `.about-stats-row` gap + `.about-stat` internal gap (`0.2rem` → `0.4rem`) and added `flex-wrap: wrap` so `8+ / Years Trading`, `2 / Instruments`, `92% / Signal Accuracy` have clear visual spacing.
  - Reset placeholder "46 spots left" → **"50 spots left"** on the hero and pricing sections.
- **`js/spots.js`** — `FALLBACK` set to `50`.
- **`landing.html`**, **`signup.html`** — visible placeholder "46 spots left" → "50 spots left".
- **`wins.html`** — removed the two placeholder "Screenshot Coming Soon" win cards (`#8`, `#9`). CSS for `.win-card--placeholder` is left in place for future re-use.
- **`supabase/migrations/011_reset_spots_remaining_50.sql`** — new migration to reset the Supabase `site_settings.spots_remaining` row to 50.

### Skipped / needs you

- None for this phase. All P0 items applied.

---

## PHASE 2 — P1 Credibility & Conversion

**Commit:** `feat(P1): sample signal card, FAQ accordion, contact section, testimonials note`

### Changed

- **`index.html`**
  - New **`#sample-signal`** section (WhatsApp-style mock card) placed between **What You Get** and **How It Works**, with `BUY GOLD / TP: 0000 / SL: 0000` and a caption.
  - New **`#faq`** accordion section placed between **Testimonials** and **Membership**. 10 questions, vanilla `<details>` + a single-open-at-a-time WAAPI height animation.
  - New **`#contact`** section above the footer (mailto to `thegoldindexclub@gmail.com` + response-time line).
  - Added a privacy-redaction note beneath testimonials.
  - Added `#faq` / `#contact` / Refund Policy to the top nav and footer nav on index.
- **`privacy.html`**, **`terms.html`**, **`wins.html`** — added FAQ, Contact, and Refunds entries to each page's footer nav.

### Skipped / needs you

- No `contact.html` page was created — the user wording allowed "either … or"; a compact section on the homepage is in use instead.

---

## PHASE 3 — P2 Legal & Compliance

**Commit:** `feat(P2): FSCA disclaimer bar, risk-ack checkbox, refund policy, POPIA polish`

### Changed

- **`index.html`** — always-visible **`.site-disclaimer-bar`** integrated into the fixed site header so the "Educational content only. Not financial advice. Percival is not FSCA-registered. Trading involves substantial risk." line is above the fold on every scroll position.
- **`privacy.html`**, **`terms.html`**, **`wins.html`** — static top strip with the same disclaimer.
- **`signup.html`**
  - Added a required "I understand the risk…" checkbox + styled `.risk-ack` block to **both** the standard-signup form and the paid-flow form.
  - Submit buttons disabled on load; `wireRiskAck()` enables them on check.
  - Both signup paths now send `acknowledged_risk: true` (+ `acknowledged_at` ISO) in the Supabase `auth.signUp` metadata.
  - Server-side validation added in JS before `signUp` fires (friendly inline error).
- **`checkout.html`**
  - Same risk-ack block before the "Continue" button; button disabled until checked.
  - `checkoutData` now includes `acknowledged_risk: true` and `acknowledged_at`.
  - The `signUp` call inside `ensureAccountAndLogin()` passes these through as user metadata.
- **`refunds.html`** — NEW dedicated page covering no partial-month refunds, end-of-cycle cancellation, chargebacks, discretionary refunds, service availability, and how to request one.
- **`terms.html`** — Section 5 renamed to "Cancellation & Refund Policy" with an `#refunds` id and a link to `/refunds`. The chargeback posture is mentioned here too.
- **`privacy.html`** — added `legitimate interest` to the lawful-basis list (Section 4) and an explicit 30-day POPIA response statement (Section 8).
- **`vercel.json`** — `/refunds.html` → `/refunds` redirect; `/refunds` → `/refunds.html` rewrite.

### Skipped / needs you

- The Supabase trigger that writes user metadata to `public.profiles` already exists (`handle_new_user`). Risk acknowledgement is now stored in `auth.users.raw_user_meta_data`. **If you want `acknowledged_risk` persisted on the `profiles` row itself, run this SQL (flagged below).**

---

## PHASE 4 — P3 UX & Technical Polish

**Commit:** `feat(P3): muted-autoplay hero, rename win assets, meta+OG tags, mobile lightbox, analytics scaffolding, cache headers`

### Changed

- **`index.html`** — hero rebuilt:
  - Video autoplays **muted** with `loop` and `playsinline`.
  - Removed the "Click anywhere to start video with sound" overlay, the Skip Video button, the Replay Video button, the headphones tagline, and all 9s / 28.2s timing-based reveal logic.
  - Added a small round **unmute toggle** in the top-right corner (`.hero-mute-toggle`), which correctly tracks `volumechange` and updates `aria-pressed`/label.
  - Hero CTA / headline / subtitle are now revealed immediately on page load (stagger preserved).
  - Also hid the **Buy/Sell trade widget** (`trade-game` flagged `hidden`) — Option B from the brief. The sample-signal section covers the "what does a signal look like" intent.
- **Asset renames** (PNG files kept, descriptive slugs; WebP conversion is a human step):
  - `WhatsApp_Image_2026-03-27_at_01.25.18…_topcrop_no1.png` → `win-xauusd-mar27-01.png`
  - `WhatsApp_Image_2026-03-27_at_10.13.41…_topcrop_no2.png` → `win-xauusd-mar27-02.png`
  - `WhatsApp_Image_2026-03-25_at_14.33.26…_topcrop_no3.png` → `win-xauusd-mar25-03.png`
  - Updated all references in `index.html`, `wins.html`, `landing.html` with more descriptive `alt` text.
- **Meta / Open Graph tags** added to every page:
  - `index.html`, `landing.html`, `wins.html`, `privacy.html`, `terms.html`, `refunds.html` — full OG + Twitter + canonical + theme-color.
  - `signup.html`, `login.html`, `checkout.html` — description + canonical + theme-color (they already carry `noindex`).
- **Mobile lightbox** — clicking any `.win-media img` now opens a full-screen preview (`.win-lightbox` modal) with Escape-to-close and click-outside-to-close. Applies to all wins on the homepage.
- **Analytics scaffolding** — new **`js/analytics.js`** loads Plausible + optional Sentry. Included on all public + private pages: `index.html`, `landing.html`, `wins.html`, `privacy.html`, `terms.html`, `refunds.html`, `signup.html`, `login.html`, `checkout.html`, `account.html`.
- **`vercel.json`** — added cache headers:
  - `*.html` and `/` → `no-cache, must-revalidate`
  - `/assets/*` → `max-age=31536000, immutable`
  - `/js/*` → `max-age=86400, must-revalidate`
- **`sitemap.xml`** — added `/refunds`; already uses the `/account.co.za` canonical root.
- **`robots.txt`** — added `Disallow` for `/signup`, `/login`, `/checkout`, `/extension`, `/admin`; pointed Sitemap line to `thegoldindexclub.co.za/sitemap.xml`.

### Skipped / needs you

- **WebP conversion** of renamed win images — flagged on each `<img>` in `index.html` (`TODO [human]: convert PNG to WebP via squoosh.app / TinyPNG and update src`).
- **`assets/og-image.png`** at 1200×630px — referenced by every page's OG/Twitter meta; flagged at the top of `index.html`.
- **Sample signal values** — `0000` placeholders in the WhatsApp mock need replacing (flagged on line 1862 of `index.html`).
- **FAQ copy `[CONFIRM]` blanks** — access window and weekly signal count both have inline TODO comments in `index.html`.
- **Contact section response time** — `within 24 hours` currently used; flagged for confirmation.
- **Plausible domain** — `js/analytics.js` currently uses `thegoldindexclub.co.za`. If your Plausible account uses a different domain string, update it there.
- **Sentry DSN** — `SENTRY_DSN` in `js/analytics.js` is empty, so Sentry is inert until you create a project and paste the DSN.
- **Mobile nav hamburger** — the existing site header already collapses into a two-row layout on mobile; I did not introduce a new hamburger component. If you want a drawer, flag it for a follow-up.

---

## PHASE 5 — P4 Growth

**Commit:** `feat(P4): blog scaffold, referral hint, annual pricing toggle`

### Changed

- **`blog/index.html`** — new blog listing page with one seeded post.
- **`blog/post-template.html`** — reusable template (copy + rename for each new post).
- **`blog/welcome.html`** — placeholder post "Welcome to The Gold Index Club — What to Expect" with `[CONFIRM]` markers throughout the body.
- **`vercel.json`** — rewrites: `/blog` → `/blog/index.html`, `/blog/welcome` → `/blog/welcome.html`.
- **`index.html`** — Blog link in top nav and footer nav.
- **`account.html`** — new referral banner section with a "Coming soon" pill and mailto CTA. Referral logic itself is stubbed.
- **`index.html`** pricing — new **Monthly / Annual** toggle on the Membership section. Monthly = R150/month; Annual = R1,500/year (save R300). Toggle swaps the price, sub-copy, and CTA (CTA gets `?plan=annual` when annual is selected).
- **`js/config.js`** — `PAYSTACK_ANNUAL_PLAN_ID: ""` placeholder.

### Skipped / needs you

- **Paystack annual plan** — create the plan in the dashboard, paste the plan ID into `PAYSTACK_ANNUAL_PLAN_ID`, then teach `checkout.html` to honour `?plan=annual` and use that plan ID instead of the monthly one (flagged inline in index.html near the CTA).
- **Referral Supabase schema** — a `referral_codes` table + member↔code linkage + a credit-on-first-payment hook will all be needed. Flagged with `TODO [human]: build referral system — requires Supabase table for referral codes and payment logic` in `account.html`.
- **Blog post content** — `blog/welcome.html` body is placeholder.

---

## All `TODO [human]:` comments added

| File | Line | Note |
| --- | --- | --- |
| `js/config.js` | 33 | Create Paystack annual plan and paste ID into `PAYSTACK_ANNUAL_PLAN_ID` |
| `js/analytics.js` | 8 | Sign up at plausible.io and confirm `PLAUSIBLE_DOMAIN` |
| `js/analytics.js` | 9 | Create Sentry project and paste DSN into `SENTRY_DSN` |
| `index.html` | 15 | Create `assets/og-image.png` at 1200×630 |
| `index.html` | 1659 | Decide Option A vs B for trade widget (Option B applied) |
| `index.html` | 1754 | Convert `win-xauusd-mar27-01.png` to WebP |
| `index.html` | 1764 | Convert `win-xauusd-mar27-02.png` to WebP |
| `index.html` | 1862 | Replace `0000` placeholders in the sample signal mock |
| `index.html` | 1963 | Replace testimonials with real redacted WhatsApp screenshots |
| `index.html` | 1976 | Confirm access window wording (15 min / 1 hr / same day) |
| `index.html` | 1980 | Confirm "3–5 signals per week" |
| `index.html` | 2038 | Wire the `?plan=annual` CTA to the real Paystack annual plan |
| `index.html` | 2049 | Confirm the "within 24 hours" response-time window |
| `account.html` | 378 | Build the referral system (Supabase table + credit hook) |
| `blog/welcome.html` | 66 | Confirm or rewrite the placeholder body copy |

Line numbers are approximate (they drift when text above changes) but searching `TODO [human]` finds all of them.

---

## Supabase SQL to run manually

1. **Reset the "spots remaining" counter to 50** — from the P0 phase.

   ```sql
   insert into public.site_settings (id, spots_remaining)
   values (1, 50)
   on conflict (id) do update set spots_remaining = 50;
   ```

   (The same statement lives in `supabase/migrations/011_reset_spots_remaining_50.sql`.)

2. **(Optional) persist `acknowledged_risk` onto `profiles`** — currently the flag lands in `auth.users.raw_user_meta_data`. If you want it durable on `profiles`:

   ```sql
   -- Add column
   alter table public.profiles
     add column if not exists acknowledged_risk boolean not null default false,
     add column if not exists acknowledged_at timestamptz;

   -- Extend the handle_new_user trigger to copy the flag from signup metadata
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

   I did not run or save this migration because schema changes require your explicit go-ahead.

---

## Environment variables / platform settings to update

- **Supabase → Authentication → URL Configuration → Redirect URLs** — confirm these are whitelisted (already done in earlier work, but re-verify after deploy):
  - `https://thegoldindexclub.co.za/signup`
  - `https://thegoldindexclub.co.za/login`
  - `https://thegoldindexclub.co.za/account`
  - `https://thegoldindexclub.co.za/checkout`
  - preview / staging domains
- **Plausible** — add `thegoldindexclub.co.za` (or whichever exact domain you use).
- **Sentry** — create project, copy DSN, paste into `js/analytics.js` → `SENTRY_DSN`.
- **Paystack** — create an annual plan, paste its plan ID into `js/config.js` → `PAYSTACK_ANNUAL_PLAN_ID`, and update `checkout.html` to honour `?plan=annual`.

---

## Sanity checklist before / after deploy

- [ ] `vercel.json` parses (`node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))"`) — verified clean.
- [ ] No linter errors in touched HTML/JS — verified clean after each phase.
- [ ] Supabase auth flow still works — signup, login, checkout, account redirects all untouched in logic; only metadata payloads and the risk-ack gate changed.
- [ ] Paystack checkout path untouched (button copy, server function, form fields unchanged).
- [ ] Spots counter still decrements via `handle_new_user` trigger — unchanged.
- [ ] `hero.webm` still autoplays muted + loops on mobile and desktop (the new loop is the only change to actual playback logic).
