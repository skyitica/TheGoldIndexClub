-- Audit log of admin actions (mark paid, extend, reduce, toggle access, deny extension, delete, debug edits)
-- shown in the admin History tab alongside member_payments.
create table if not exists public.admin_action_log (
  id bigserial primary key,
  occurred_at timestamptz not null default now(),
  actor_email text null,
  action text not null,
  member_id bigint null references public.members(id) on delete set null,
  member_name text null,
  reference text null,
  amount integer null,
  months integer null,
  details jsonb null
);

alter table public.admin_action_log enable row level security;

drop policy if exists "Allow anon read admin_action_log" on public.admin_action_log;
create policy "Allow anon read admin_action_log"
  on public.admin_action_log
  for select
  using (true);

drop policy if exists "Allow anon insert admin_action_log" on public.admin_action_log;
create policy "Allow anon insert admin_action_log"
  on public.admin_action_log
  for insert
  with check (true);

create index if not exists admin_action_log_occurred_at_idx
  on public.admin_action_log (occurred_at desc);
