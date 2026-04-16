import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
/** Paystack Plan Code (Subscriptions). Override via Supabase secret PAYSTACK_PLAN_CODE. */
const PAYSTACK_PLAN_CODE =
  Deno.env.get("PAYSTACK_PLAN_CODE") || "PLN_v8qdbqozhymbhnj";

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
    const body = await req.json();
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const full_name = typeof body.full_name === "string" ? body.full_name.trim() : "";
    const phone_number = typeof body.phone_number === "string" ? body.phone_number.trim() : "";

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: pending, error: insErr } = await supabase
      .from("pending_subscriptions")
      .insert({
        email,
        full_name: full_name || null,
        phone_number: phone_number || null,
        subscription_status: "pending",
      })
      .select("id")
      .single();

    if (insErr || !pending) {
      return new Response(JSON.stringify({ error: "Could not start checkout", detail: insErr?.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pendingId = pending.id;
    let callbackUrl =
      typeof body.callback_url === "string" && body.callback_url.startsWith("http")
        ? body.callback_url
        : "";
    if (!callbackUrl) {
      const origin = req.headers.get("origin") || "";
      let base = origin;
      if (!base) {
        const ref = req.headers.get("referer");
        if (ref) {
          try {
            base = new URL(ref).origin;
          } catch {
            /* ignore */
          }
        }
      }
      callbackUrl = `${base}/signup`;
    }

    const subRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: 15000,
        plan: PAYSTACK_PLAN_CODE,
        callback_url: callbackUrl.split("?")[0],
        metadata: {
          pending_checkout_id: pendingId,
          flow: "guest",
          full_name: full_name || "",
          phone_number: phone_number || "",
        },
      }),
    });

    const subData = await subRes.json();
    if (!subData.status) {
      await supabase.from("pending_subscriptions").delete().eq("id", pendingId);
      return new Response(JSON.stringify({ error: "Paystack init failed", detail: subData }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reference = subData.data.reference as string;

    await supabase
      .from("pending_subscriptions")
      .update({ paystack_reference: reference })
      .eq("id", pendingId);

    return new Response(JSON.stringify({
      authorization_url: subData.data.authorization_url,
      access_code: subData.data.access_code,
      reference,
      pending_checkout_id: pendingId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
