-- Reset "spots remaining" display counter to 50 (comprehensive P0 reset).
-- Run in Supabase SQL Editor. Frontend fallback is also 50 (js/spots.js).

insert into public.site_settings (id, spots_remaining)
values (1, 50)
on conflict (id) do update set spots_remaining = 50;
