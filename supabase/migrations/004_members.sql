-- Members table for manual EFT subscription tracking.
create table if not exists public.members (
  id bigserial primary key,
  full_name text not null,
  email text not null,
  whatsapp text not null,
  join_date date not null,
  next_due_date date not null,
  date_paid date null,
  invoice_sent date null,
  status text not null default 'Pending',
  group_access boolean not null default false,
  notes text null,
  amount integer not null default 150,
  month_number integer not null default 1
);

alter table public.members enable row level security;

drop policy if exists "Allow anon insert members" on public.members;
create policy "Allow anon insert members"
  on public.members
  for insert
  with check (true);

drop policy if exists "Allow anon read members" on public.members;
create policy "Allow anon read members"
  on public.members
  for select
  using (true);

drop policy if exists "Allow anon update members" on public.members;
create policy "Allow anon update members"
  on public.members
  for update
  using (true)
  with check (true);
