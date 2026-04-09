import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendResendEmail } from "../_shared/resend.ts";
import { verifyTgicEmailServerSecret } from "../_shared/tgic-email-auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SERVER_SECRET = Deno.env.get("TGIC_EMAIL_SERVER_SECRET") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  type?: string;
  member_id?: number;
};

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

  if (!verifyTgicEmailServerSecret(req, SERVER_SECRET)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const memberId = Number(body.member_id);
  const type = typeof body.type === "string" ? body.type : "";
  if (!memberId || !type) {
    return new Response(JSON.stringify({ error: "member_id and type required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: row, error } = await sb
    .from("members")
    .select(
      "email, full_name, extension_denial_notice, pending_extension, requested_extension_months, requested_extension_total",
    )
    .eq("id", memberId)
    .maybeSingle();

  if (error || !row?.email) {
    return new Response(JSON.stringify({ error: "Member not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const to = row.email as string;
  const name = (row.full_name as string) || "there";

  let subject = "";
  let html = "";

  if (type === "extension_denied") {
    subject = "Extension request — payment not matched — The Gold Index Club";
    const notice =
      (row.extension_denial_notice as string) ||
      "We could not match an extension payment to your account yet.";
    html = `
      <p>Hi ${escapeHtml(name)},</p>
      <p>We were not able to process your <strong>membership extension</strong> because we have not received a matching payment (or the EFT reference did not match).</p>
      <p><strong>Message from our team:</strong></p>
      <p style="white-space:pre-wrap;border-left:3px solid #c9a84c;padding-left:12px;">${escapeHtml(
        notice,
      )}</p>
      <p>Please pay using the bank details on the extension page, use your <strong>phone number</strong> as the reference, then submit a new extension request once the payment reflects.</p>
      <p>— The Gold Index Club</p>
    `;
  } else if (type === "payment_confirmed") {
    subject = "Payment received — The Gold Index Club";
    html = `
      <p>Hi ${escapeHtml(name)},</p>
      <p>Thank you — we have <strong>recorded your payment</strong> and updated your membership.</p>
      <p>— The Gold Index Club</p>
    `;
  } else if (type === "payment_not_found") {
    subject = "We could not find your payment — The Gold Index Club";
    html = `
      <p>Hi ${escapeHtml(name)},</p>
      <p>We have reviewed our bank records and <strong>could not match a payment</strong> to your membership yet (for example, the amount may not have reflected, or the EFT reference may not match the phone number we have on file).</p>
      <p>Please complete payment using the <strong>checkout / bank details</strong> on our site, and use <strong>your phone number (WhatsApp number)</strong> exactly as the payment reference. Without the correct reference, we may not be able to allocate your deposit.</p>
      <p>If you believe you already paid correctly, reply to this email or contact us with your proof of payment.</p>
      <p>— The Gold Index Club</p>
    `;
  } else {
    return new Response(JSON.stringify({ error: "Unknown type" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const send = await sendResendEmail({ to, subject, html });
  if (!send.ok) {
    // 503 = Resend not configured; 502 = Resend API error — so clients don't treat as success.
    const status = send.skipped ? 503 : 502;
    return new Response(
      JSON.stringify({
        error: send.error || "Send failed",
        skipped: !!send.skipped,
        hint: send.skipped
          ? "Add RESEND_API_KEY and EMAIL_FROM in Supabase → Edge Functions → Secrets, then redeploy notify-member."
          : undefined,
      }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  return new Response(JSON.stringify({ ok: true, id: send.id }), {
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
