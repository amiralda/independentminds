import Stripe from "https://esm.sh/stripe@16.9.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

type ManagedSubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "incomplete";

function normalizeStatus(status: string | null | undefined): ManagedSubscriptionStatus {
  if (status === "trialing") return "trialing";
  if (status === "active") return "active";
  if (status === "past_due") return "past_due";
  if (status === "canceled" || status === "unpaid" || status === "incomplete_expired") return "canceled";
  return "incomplete";
}

function toIso(value: number | null | undefined): string | null {
  if (!value) return null;
  return new Date(value * 1000).toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey || !webhookSecret) {
    return new Response(JSON.stringify({ error: "Stripe env not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
  });

  let event: Stripe.Event;

  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (error: unknown) {
    console.error("stripe-webhook signature error:", error);
    return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { data: alreadyProcessed } = await db
      .from("billing_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .limit(1);

    if ((alreadyProcessed ?? []).length > 0) {
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventType = event.type;

    if (
      eventType === "checkout.session.completed" ||
      eventType === "customer.subscription.created" ||
      eventType === "customer.subscription.updated" ||
      eventType === "customer.subscription.deleted" ||
      eventType === "invoice.payment_failed" ||
      eventType === "invoice.paid"
    ) {
      if (eventType === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id ?? null;
        const planKey = session.metadata?.plan_key ?? null;
        const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;

        if (userId && stripeCustomerId) {
          await db.from("stripe_customers").upsert({
            user_id: userId,
            stripe_customer_id: stripeCustomerId,
          });
        }

        const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : null;

        if (userId && stripeCustomerId && stripeSubscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          await db.from("subscriptions").upsert({
            user_id: userId,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            plan_key: planKey ?? "basic",
            status: normalizeStatus(subscription.status),
            current_period_end: toIso(subscription.current_period_end),
            trial_ends_at: toIso(subscription.trial_end),
            cancel_at_period_end: subscription.cancel_at_period_end,
          }, { onConflict: "user_id" });
        }
      }

      if (
        eventType === "customer.subscription.created" ||
        eventType === "customer.subscription.updated" ||
        eventType === "customer.subscription.deleted"
      ) {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = typeof subscription.customer === "string" ? subscription.customer : null;
        const planKey = subscription.metadata?.plan_key || subscription.items.data[0]?.price?.lookup_key || "basic";

        if (stripeCustomerId) {
          const { data: customerMap } = await db
            .from("stripe_customers")
            .select("user_id")
            .eq("stripe_customer_id", stripeCustomerId)
            .maybeSingle();

          if (customerMap?.user_id) {
            await db.from("subscriptions").upsert({
              user_id: customerMap.user_id,
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: subscription.id,
              plan_key: planKey,
              status: normalizeStatus(subscription.status),
              current_period_end: toIso(subscription.current_period_end),
              trial_ends_at: toIso(subscription.trial_end),
              cancel_at_period_end: subscription.cancel_at_period_end,
            }, { onConflict: "user_id" });
          }
        }
      }

      if (eventType === "invoice.payment_failed" || eventType === "invoice.paid") {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeCustomerId = typeof invoice.customer === "string" ? invoice.customer : null;
        const stripeSubscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;

        if (stripeCustomerId && stripeSubscriptionId) {
          const { data: customerMap } = await db
            .from("stripe_customers")
            .select("user_id")
            .eq("stripe_customer_id", stripeCustomerId)
            .maybeSingle();

          if (customerMap?.user_id) {
            if (eventType === "invoice.payment_failed") {
              await db
                .from("subscriptions")
                .update({
                  status: "past_due",
                  current_period_end: invoice.period_end ? toIso(invoice.period_end) : null,
                })
                .eq("user_id", customerMap.user_id)
                .eq("stripe_subscription_id", stripeSubscriptionId);
            }

            if (eventType === "invoice.paid") {
              const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
              await db.from("subscriptions").upsert({
                user_id: customerMap.user_id,
                stripe_customer_id: stripeCustomerId,
                stripe_subscription_id: stripeSubscriptionId,
                plan_key: subscription.metadata?.plan_key || "basic",
                status: normalizeStatus(subscription.status),
                current_period_end: toIso(subscription.current_period_end),
                trial_ends_at: toIso(subscription.trial_end),
                cancel_at_period_end: subscription.cancel_at_period_end,
              }, { onConflict: "user_id" });
            }
          }
        }
      }
    }

    await db.from("billing_events").insert({
      type: event.type,
      stripe_event_id: event.id,
      stripe_object_id: event.data.object?.id ?? null,
      payload: event,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("stripe-webhook:", error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});