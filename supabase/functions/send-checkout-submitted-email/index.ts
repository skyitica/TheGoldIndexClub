import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendResendEmail } from "../_shared/resend.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Sign in required" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser();
  if (authError || !user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const email = user.email.trim().toLowerCase();
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: member, error: mErr } = await sb
    .from("members")
    .select("id, email, full_name, checkout_submitted_email_sent_at")
    .eq("email", email)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (mErr || !member) {
    return new Response(JSON.stringify({ error: "Member row not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (member.checkout_submitted_email_sent_at) {
    return new Response(JSON.stringify({ ok: true, already_sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const name = (member.full_name as string) || "there";
  const html = `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Thanks — we received your <strong>manual EFT checkout</strong> notification.</p>
    <p><strong>This is not a payment receipt.</strong> We still need to see your deposit in the bank with the correct reference (your phone / WhatsApp number). When it reflects, we will confirm your membership by email.</p>
    <p>If the reference is wrong, we may not be able to match your payment.</p>
    <p>— The Gold Index Club</p>
  `;

  const send = await sendResendEmail({
    to: member.email as string,
    subject: "We received your checkout — next: complete EFT — The Gold Index Club",
    html,
  });

  if (!send.ok && !send.skipped) {
    return new Response(JSON.stringify({ error: send.error }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (send.ok) {
    await sb
      .from("members")
      .update({ checkout_submitted_email_sent_at: new Date().toISOString() })
      .eq("id", member.id);
  }

  return new Response(
    JSON.stringify({ ok: true, skipped: send.skipped, id: send.id }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
