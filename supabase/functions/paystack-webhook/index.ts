import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.text();

  // Verify Paystack webhook signature.
  const signature = req.headers.get("x-paystack-signature") || "";
  const encoder = new TextEncoder();
  const key = encoder.encode(PAYSTACK_SECRET_KEY);
  const data = encoder.encode(body);
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key, { name: "HMAC", hash: "SHA-512" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, data);
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");

  if (computed !== signature) {
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(body);
  const event = payload.event as string;
  const eventData = payload.data;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Helper: find profile by Paystack customer code or email metadata.
  async function findProfile() {
    const userId = eventData.metadata?.supabase_user_id;
    if (userId) {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (data) return data;
    }

    const customerCode = eventData.customer?.customer_code;
    if (customerCode) {
      const { data } = await supabase.from("profiles").select("*").eq("paystack_customer_code", customerCode).single();
      if (data) return data;
    }

    const email = eventData.customer?.email;
    if (email) {
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users?.users?.find((u: any) => u.email === email);
      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (data) return data;
      }
    }

    return null;
  }

  try {
    const profile = await findProfile();
    if (!profile) {
      console.error("Profile not found for webhook event:", event, eventData);
      return new Response("OK", { status: 200 });
    }

    switch (event) {
      case "subscription.create": {
        const subCode = eventData.subscription_code;
        const nextPayment = eventData.next_payment_date;
        await supabase.from("profiles").update({
          paystack_subscription_code: subCode,
          subscription_status: "active",
          current_period_end: nextPayment ? new Date(nextPayment).toISOString() : null,
        }).eq("id", profile.id);
        break;
      }

      case "charge.success": {
        const plan = eventData.plan;
        if (plan && plan.plan_code) {
          const nextPayment = eventData.plan?.next_payment_date || eventData.next_payment_date;
          const periodEnd = nextPayment
            ? new Date(nextPayment).toISOString()
            : new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
          await supabase.from("profiles").update({
            subscription_status: "active",
            current_period_end: periodEnd,
          }).eq("id", profile.id);
        }
        break;
      }

      case "subscription.disable":
      case "subscription.not_renew": {
        await supabase.from("profiles").update({
          subscription_status: "cancelled",
        }).eq("id", profile.id);
        break;
      }

      case "invoice.payment_failed": {
        await supabase.from("profiles").update({
          subscription_status: "past_due",
        }).eq("id", profile.id);
        break;
      }

      default:
        console.log("Unhandled Paystack event:", event);
    }

    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("Webhook processing error:", err);
    return new Response("Internal error", { status: 500 });
  }
});
