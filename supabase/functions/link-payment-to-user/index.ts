import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
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

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const reference = typeof body.reference === "string" ? body.reference.trim() : "";
    if (!reference) {
      return new Response(JSON.stringify({ error: "reference required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userEmail = normalizeEmail(user.email);

    const { data: pending, error: pErr } = await supabaseAdmin
      .from("pending_subscriptions")
      .select("*")
      .eq("paystack_reference", reference)
      .maybeSingle();

    if (pErr || !pending) {
      return new Response(JSON.stringify({ error: "Payment session not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (pending.linked_user_id) {
      if (pending.linked_user_id === user.id) {
        return new Response(JSON.stringify({ ok: true, message: "Already linked to your account." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "This payment is linked to a different account." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (normalizeEmail(pending.email) !== userEmail) {
      return new Response(JSON.stringify({
        error: "Email mismatch. Sign up or log in with the same email you used at checkout.",
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (pending.subscription_status !== "active") {
      return new Response(JSON.stringify({
        error: "Subscription not active yet. Wait for payment confirmation, then try again.",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullName = pending.full_name?.trim() || "";
    const phone = pending.phone_number?.trim() || "";

    const profileUpdates: Record<string, unknown> = {
      paystack_customer_code: pending.paystack_customer_code,
      paystack_subscription_code: pending.paystack_subscription_code,
      subscription_status: "active",
      current_period_end: pending.current_period_end,
    };
    if (fullName) profileUpdates.full_name = fullName;
    if (phone) profileUpdates.phone_number = phone;

    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update(profileUpdates)
      .eq("id", user.id);

    if (upErr) {
      return new Response(JSON.stringify({ error: "Could not update profile", detail: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabaseAdmin
      .from("pending_subscriptions")
      .update({ linked_user_id: user.id })
      .eq("id", pending.id);

    return new Response(JSON.stringify({ ok: true, message: "Membership linked to your account." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
