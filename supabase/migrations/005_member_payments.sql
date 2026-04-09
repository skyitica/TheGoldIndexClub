-- Payment history for EFT member tracking.
create table if not exists public.member_payments (
  id bigserial primary key,
  member_id bigint not null references public.members(id) on delete cascade,
  paid_on date not null default current_date,
  amount integer not null default 150,
  reference text null,
  created_at timestamptz not null default now()
);

alter table public.member_payments enable row level security;

drop policy if exists "Allow anon read member_payments" on public.member_payments;
create policy "Allow anon read member_payments"
  on public.member_payments
  for select
  using (true);

drop policy if exists "Allow anon insert member_payments" on public.member_payments;
create policy "Allow anon insert member_payments"
  on public.member_payments
  for insert
  with check (true);
