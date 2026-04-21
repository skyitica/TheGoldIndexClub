-- Store the checkout EFT reference code per member for admin verification.
alter table public.members
  add column if not exists payment_reference text null;
