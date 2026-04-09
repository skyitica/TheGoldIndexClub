-- Link members to auth profiles and sync membership state into profiles.
alter table public.members
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

create index if not exists members_user_id_idx on public.members(user_id);

create or replace function public.sync_profile_from_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mapped_status text;
  period_end timestamptz;
begin
  if new.user_id is null then
    return new;
  end if;

  period_end := (new.next_due_date::timestamp at time zone 'UTC');

  if new.next_due_date <= current_date then
    mapped_status := 'past_due'; -- suspended-equivalent
  elsif coalesce(new.group_access, false) = true then
    mapped_status := 'active';
  else
    mapped_status := 'none'; -- pending acceptance
  end if;

  update public.profiles
  set subscription_status = mapped_status,
      current_period_end = period_end
  where id = new.user_id;

  return new;
end;
$$;

drop trigger if exists trg_sync_profile_from_member on public.members;
create trigger trg_sync_profile_from_member
after insert or update of user_id, status, group_access, next_due_date
on public.members
for each row
execute function public.sync_profile_from_member();
