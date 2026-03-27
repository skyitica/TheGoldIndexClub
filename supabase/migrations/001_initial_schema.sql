-- ============================================================
-- The Gold Index Club — initial schema
-- Paste the entire file into Supabase → SQL Editor → Run
-- Safe to re-run: policies are dropped before recreate.
-- ============================================================

-- 1. Profiles (extends auth.users) ------------------------------------

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  phone_number  text,
  paystack_customer_code    text,
  paystack_subscription_code text,
  subscription_status       text not null default 'none'
                            check (subscription_status in ('none','active','cancelled','past_due')),
  current_period_end        timestamptz,
  created_at                timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile (limited)" on public.profiles;
create policy "Users can update own profile (limited)"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Trigger: auto-create a profile row when a new user signs up.

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
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. WhatsApp invite links (admin-managed) ----------------------------

create table if not exists public.whatsapp_links (
  id          uuid primary key default gen_random_uuid(),
  invite_link text not null,
  valid_from  timestamptz not null default now(),
  valid_until timestamptz,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.whatsapp_links enable row level security;

-- No anon policies: only service role (Edge Functions) can read/write.
-- Manage rows in Supabase Table Editor while logged in as project owner.


-- 3. Phone change requests -------------------------------------------

create table if not exists public.phone_change_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  old_phone   text,
  new_phone   text not null,
  status      text not null default 'pending'
              check (status in ('pending','approved','rejected')),
  created_at  timestamptz not null default now()
);

alter table public.phone_change_requests enable row level security;

drop policy if exists "Users can insert own phone change request" on public.phone_change_requests;
create policy "Users can insert own phone change request"
  on public.phone_change_requests for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own phone change requests" on public.phone_change_requests;
create policy "Users can read own phone change requests"
  on public.phone_change_requests for select
  using (auth.uid() = user_id);
