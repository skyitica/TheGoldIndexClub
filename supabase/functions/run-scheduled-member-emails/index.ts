import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { johannesburgTodayYmd, sendResendEmail } from "../_shared/resend.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SERVER_SECRET = Deno.env.get("TGIC_EMAIL_SERVER_SECRET") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function verifyServer(req: Request): boolean {
  if (!SERVER_SECRET) return false;
  const auth = req.headers.get("Authorization") || "";
  return auth === `Bearer ${SERVER_SECRET}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!verifyServer(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const today = johannesburgTodayYmd();
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const results = {
    today,
    due_reminders: 0,
    overdue_reminders: 0,
    skipped_resend: false,
    errors: [] as string[],
  };

  const { data: dueToday, error: dueErr } = await sb
    .from("members")
    .select(
      "id, email, full_name, next_due_date, due_reminder_sent_on, whatsapp",
    )
    .eq("next_due_date", today);

  if (dueErr) {
    results.errors.push("due query: " + dueErr.message);
  } else {
    for (const row of dueToday || []) {
      if (row.due_reminder_sent_on === today) continue;
      const to = row.email as string;
      if (!to) continue;

      const name = (row.full_name as string) || "there";
      const html = `
        <p>Hi ${escapeHtml(name)},</p>
        <p>This is a reminder that your <strong>The Gold Index Club</strong> membership payment is <strong>due today</strong> (${today}).</p>
        <p>Please pay by EFT using the details from your account / checkout, and use your <strong>phone number (WhatsApp number on file)</strong> as the payment reference so we can match your payment.</p>
        <p>If you have already paid, allow a short time for it to reflect — thank you.</p>
        <p>— The Gold Index Club</p>
      `;

      const send = await sendResendEmail({
        to,
        subject: "Payment due today — The Gold Index Club",
        html,
      });

      if (!send.ok && !send.skipped) {
        results.errors.push(`due id ${row.id}: ${send.error}`);
        continue;
      }
      if (send.skipped) results.skipped_resend = true;

      const { error: upErr } = await sb
        .from("members")
        .update({ due_reminder_sent_on: today })
        .eq("id", row.id);
      if (upErr) {
        results.errors.push(`due update ${row.id}: ${upErr.message}`);
      } else {
        results.due_reminders += 1;
      }
    }
  }

  const { data: overdue, error: odErr } = await sb
    .from("members")
    .select(
      "id, email, full_name, next_due_date, overdue_reminder_sent_on, group_access",
    )
    .lt("next_due_date", today);

  if (odErr) {
    results.errors.push("overdue query: " + odErr.message);
  } else {
    for (const row of overdue || []) {
      if (row.overdue_reminder_sent_on === today) continue;
      const to = row.email as string;
      if (!to) continue;

      const name = (row.full_name as string) || "there";
      const html = `
        <p>Hi ${escapeHtml(name)},</p>
        <p>Our records show your <strong>The Gold Index Club</strong> membership payment is <strong>overdue</strong> (due date was <strong>${row.next_due_date}</strong>).</p>
        <p>Please pay by EFT as soon as you can, using your <strong>phone number as the EFT reference</strong>. If you have already paid, it may still be clearing — thank you for your patience.</p>
        <p>— The Gold Index Club</p>
      `;

      const send = await sendResendEmail({
        to,
        subject: "Payment overdue — The Gold Index Club",
        html,
      });

      if (!send.ok && !send.skipped) {
        results.errors.push(`overdue id ${row.id}: ${send.error}`);
        continue;
      }
      if (send.skipped) results.skipped_resend = true;

      const { error: upErr } = await sb
        .from("members")
        .update({ overdue_reminder_sent_on: today })
        .eq("id", row.id);
      if (upErr) {
        results.errors.push(`overdue update ${row.id}: ${upErr.message}`);
      } else {
        results.overdue_reminders += 1;
      }
    }
  }

  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
