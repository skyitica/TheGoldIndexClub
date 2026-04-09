-- Support month-based plans, discounts, and richer payment history.
alter table public.members
  add column if not exists current_plan_months integer not null default 1,
  add column if not exists last_discount_percent integer not null default 0,
  add column if not exists last_payment_total integer not null default 150;

alter table public.member_payments
  add column if not exists months_count integer not null default 1,
  add column if not exists discount_percent integer not null default 0,
  add column if not exists total_amount integer not null default 150;
