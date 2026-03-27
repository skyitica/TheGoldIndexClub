-- ============================================================
-- Pay-first flow: store subscription details before Supabase user exists
-- Run in Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================

create table if not exists public.pending_subscriptions (
  id                         uuid primary key default gen_random_uuid(),
  email                      text not null,
  full_name                  text,
  phone_number               text,
  paystack_reference         text unique,
  paystack_customer_code     text,
  paystack_subscription_code text,
  subscription_status        text not null default 'pending'
                             check (subscription_status in ('pending','active','cancelled','past_due')),
  current_period_end         timestamptz,
  linked_user_id             uuid references public.profiles(id) on delete set null,
  created_at                 timestamptz not null default now()
);

create index if not exists pending_subscriptions_email_idx
  on public.pending_subscriptions (lower(trim(email)));

create index if not exists pending_subscriptions_pending_checkout_idx
  on public.pending_subscriptions (id)
  where linked_user_id is null;

alter table public.pending_subscriptions enable row level security;

-- No policies: only service role (Edge Functions) accesses this table.
