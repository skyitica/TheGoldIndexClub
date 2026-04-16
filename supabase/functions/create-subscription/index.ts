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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.subscription_status === "active") {
      return new Response(JSON.stringify({ error: "Already subscribed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let customerCode = profile.paystack_customer_code;

    // Create Paystack customer if we don't have one yet.
    if (!customerCode) {
      const custRes = await fetch("https://api.paystack.co/customer", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          first_name: profile.full_name?.split(" ")[0] || "",
          last_name: profile.full_name?.split(" ").slice(1).join(" ") || "",
          phone: profile.phone_number || "",
          metadata: { supabase_user_id: user.id },
        }),
      });
      const custData = await custRes.json();
      if (!custData.status) {
        return new Response(JSON.stringify({ error: "Paystack customer creation failed", detail: custData }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      customerCode = custData.data.customer_code;

      await supabaseAdmin
        .from("profiles")
        .update({ paystack_customer_code: customerCode })
        .eq("id", user.id);
    }

    // Initialize a subscription transaction (Paystack hosted checkout).
    const { origin } = new URL(req.url);
    const callbackUrl = req.headers.get("x-callback-url") || `${origin}/account`;

    const subRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: 15000, // R150.00 in kobo (cents)
        plan: PAYSTACK_PLAN_CODE,
        callback_url: callbackUrl,
        metadata: {
          supabase_user_id: user.id,
          custom_fields: [
            { display_name: "Club Member", variable_name: "member_name", value: profile.full_name || user.email },
          ],
        },
      }),
    });

    const subData = await subRes.json();
    if (!subData.status) {
      return new Response(JSON.stringify({ error: "Paystack transaction init failed", detail: subData }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      authorization_url: subData.data.authorization_url,
      access_code: subData.data.access_code,
      reference: subData.data.reference,
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
