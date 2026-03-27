import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.text();

  const signature = req.headers.get("x-paystack-signature") || "";
  const encoder = new TextEncoder();
  const key = encoder.encode(PAYSTACK_SECRET_KEY);
  const data = encoder.encode(body);
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key, { name: "HMAC", hash: "SHA-512" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, data);
  const computed = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");

  if (computed !== signature) {
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(body);
  const event = payload.event as string;
  const eventData = payload.data;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  async function updatePendingFromCharge() {
    const pendingId = eventData.metadata?.pending_checkout_id;
    const reference = eventData.reference as string | undefined;
    const customerCode = eventData.customer?.customer_code as string | undefined;
    const subCode = eventData.subscription?.subscription_code || eventData.subscription_code;

    let query = supabase.from("pending_subscriptions").select("*");
    if (pendingId) {
      query = query.eq("id", pendingId);
    } else if (reference) {
      query = query.eq("paystack_reference", reference);
    } else {
      return;
    }

    const { data: pending } = await query.maybeSingle();
    if (!pending || pending.linked_user_id) return;

    const nextPayment = eventData.next_payment_date || eventData.subscription?.next_payment_date;
    const periodEnd = nextPayment
      ? new Date(nextPayment).toISOString()
      : new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();

    await supabase
      .from("pending_subscriptions")
      .update({
        subscription_status: "active",
        paystack_customer_code: customerCode || pending.paystack_customer_code,
        paystack_subscription_code: subCode || pending.paystack_subscription_code,
        current_period_end: periodEnd,
      })
      .eq("id", pending.id);
  }

  async function findProfileByPaystack() {
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
      const user = users?.users?.find((u: { email?: string }) => u.email?.toLowerCase() === String(email).toLowerCase());
      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (data) return data;
      }
    }

    return null;
  }

  try {
    const pendingCheckoutId = eventData.metadata?.pending_checkout_id;
    const isGuestFlow = eventData.metadata?.flow === "guest" || !!pendingCheckoutId;

    if (isGuestFlow && (event === "charge.success" || event === "subscription.create")) {
      await updatePendingFromCharge();
    }

    const profile = await findProfileByPaystack();

    if (profile) {
      switch (event) {
        case "subscription.create": {
          const subCode = eventData.subscription_code || eventData.subscription?.subscription_code;
          const nextPayment = eventData.next_payment_date || eventData.subscription?.next_payment_date;
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
          await supabase.from("profiles").update({ subscription_status: "cancelled" }).eq("id", profile.id);
          break;
        }

        case "invoice.payment_failed": {
          await supabase.from("profiles").update({ subscription_status: "past_due" }).eq("id", profile.id);
          break;
        }

        default:
          console.log("Unhandled Paystack event (profile path):", event);
      }
    } else if (!isGuestFlow) {
      console.error("Profile not found for webhook event:", event, JSON.stringify(eventData).slice(0, 500));
    }

    // Guest pending: cancellation / failed payment (when metadata still present)
    if (isGuestFlow && (event === "subscription.disable" || event === "subscription.not_renew" || event === "invoice.payment_failed")) {
      const ref = eventData.reference as string | undefined;
      const pendingId = eventData.metadata?.pending_checkout_id;
      const patch = {
        subscription_status: event === "invoice.payment_failed" ? "past_due" as const : "cancelled" as const,
      };
      if (pendingId) {
        await supabase.from("pending_subscriptions").update(patch).eq("id", pendingId);
      } else if (ref) {
        await supabase.from("pending_subscriptions").update(patch).eq("paystack_reference", ref);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return new Response("Internal error", { status: 500 });
  }
});
