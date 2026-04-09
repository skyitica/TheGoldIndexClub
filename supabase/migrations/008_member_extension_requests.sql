-- Track extension requests directly on member rows for admin visibility.
alter table public.members
  add column if not exists pending_extension boolean not null default false,
  add column if not exists requested_extension_months integer null,
  add column if not exists requested_extension_discount integer null,
  add column if not exists requested_extension_total integer null;
