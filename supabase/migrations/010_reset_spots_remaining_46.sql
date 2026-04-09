-- Reset "spots remaining" display counter to 46 (e.g. after testing or manual drift).
-- Apply in Supabase SQL Editor if the live value is not 46.

insert into public.site_settings (id, spots_remaining)
values (1, 46)
on conflict (id) do update set spots_remaining = 46;
