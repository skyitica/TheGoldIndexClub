-- Allow member deletion from admin dashboard.
alter table public.members enable row level security;

drop policy if exists "Allow anon delete members" on public.members;
create policy "Allow anon delete members"
  on public.members
  for delete
  using (true);
