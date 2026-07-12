import Stripe from "https://esm.sh/stripe@16.9.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_PLAN_KEYS = ["basic", "plus", "pro"] as const;
type PlanKey = (typeof ALLOWED_PLAN_KEYS)[number];

const PRICE_ENV_BY_PLAN: Record<PlanKey, string> = {
  basic: "STRIPE_PRICE_BASIC",
  plus: "STRIPE_PRICE_PLUS",
  pro: "STRIPE_PRICE_PRO",
};

function parsePlanKey(value: unknown): PlanKey | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return ALLOWED_PLAN_KEYS.includes(normalized as PlanKey) ? (normalized as PlanKey) : null;
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

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("missing_stripe_secret_key");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const planKey = parsePlanKey(body.plan_key);

    if (!planKey) {
      return new Response(JSON.stringify({ error: "Invalid plan_key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const priceId = Deno.env.get(PRICE_ENV_BY_PLAN[planKey]);
    if (!priceId) {
      throw new Error(`missing_price_env_${planKey}`);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-06-20",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: customerMap } = await db
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let stripeCustomerId = customerMap?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          user_id: user.id,
        },
      });
      stripeCustomerId = customer.id;

      await db.from("stripe_customers").upsert({
        user_id: user.id,
        stripe_customer_id: stripeCustomerId,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: "https://www.independentmindsedu.org/billing?state=success",
      cancel_url: "https://www.independentmindsedu.org/billing?state=cancel",
      allow_promotion_codes: true,
      metadata: {
        plan_key: planKey,
        user_id: user.id,
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          plan_key: planKey,
          user_id: user.id,
        },
      },
    });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("create-checkout-session:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});