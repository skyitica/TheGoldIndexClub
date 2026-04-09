-- Dedupe fields for scheduled payment reminder emails (see Edge Function run-scheduled-member-emails).
alter table public.members
  add column if not exists due_reminder_sent_on date null,
  add column if not exists overdue_reminder_sent_on date null,
  add column if not exists checkout_submitted_email_sent_at timestamptz null;
