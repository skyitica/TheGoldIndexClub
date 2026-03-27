import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

  try {
    const body = await req.json();
    const reference = typeof body.reference === "string" ? body.reference.trim() : "";
    if (!reference) {
      return new Response(JSON.stringify({ error: "reference required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: row, error } = await supabase
      .from("pending_subscriptions")
      .select("email, full_name, phone_number, subscription_status, linked_user_id, paystack_reference")
      .eq("paystack_reference", reference)
      .maybeSingle();

    if (error || !row) {
      return new Response(JSON.stringify({ ready: false, message: "Payment session not found." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (row.linked_user_id) {
      return new Response(JSON.stringify({ ready: false, message: "This payment is already linked to an account. Log in." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (row.subscription_status !== "active") {
      return new Response(JSON.stringify({
        ready: false,
        message: "Payment not confirmed yet. Wait a moment and refresh, or complete payment on Paystack.",
        status: row.subscription_status,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      ready: true,
      email: row.email,
      full_name: row.full_name || "",
      phone_number: row.phone_number || "",
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
