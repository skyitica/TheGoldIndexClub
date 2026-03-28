-- ============================================================
-- Public "spots left" counter — read by anon; decrements on each new signup.
-- Floor at 3 (never goes below). Does not block signups.
-- Run in Supabase SQL Editor after prior migrations.
-- ============================================================

create table if not exists public.site_settings (
  id smallint primary key check (id = 1),
  spots_remaining int not null default 46
);

insert into public.site_settings (id, spots_remaining)
values (1, 46)
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists "Anyone can read site_settings" on public.site_settings;
create policy "Anyone can read site_settings"
  on public.site_settings for select
  using (true);

-- Extend signup trigger: decrement spots (minimum 3).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone_number', '')
  );
  update public.site_settings
  set spots_remaining = greatest(3, spots_remaining - 1)
  where id = 1;
  return new;
end;
$$;
