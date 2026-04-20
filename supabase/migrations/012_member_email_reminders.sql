-- Dedupe fields for payment reminder emails (columns kept; admin UI clears them on Mark Paid / Extend).
alter table public.members
  add column if not exists due_reminder_sent_on date null,
  add column if not exists overdue_reminder_sent_on date null,
  add column if not exists checkout_submitted_email_sent_at timestamptz null;
