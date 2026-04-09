-- Message shown on member dashboard after admin denies an extension request (payment not reflected, etc.).
alter table public.members
  add column if not exists extension_denial_notice text null;
