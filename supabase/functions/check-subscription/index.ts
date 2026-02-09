import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Tier config
const TIERS: Record<string, { name: string; monthlyCredits: number }> = {
  "prod_Twtvm5lU8EdiOJ": { name: "standard", monthlyCredits: 50 },
  "prod_Twtv0SUsLKMn2D": { name: "pro", monthlyCredits: 150 },
};

const TOPUP_PRODUCT = "prod_Twtv96l62JjiEd";
const TOPUP_CREDITS = 100;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      // No Stripe customer - ensure profile reflects no subscription
      await supabaseAdmin.from("profiles").update({ subscription_tier: "none" }).eq("user_id", user.id);
      return new Response(JSON.stringify({ subscribed: false, tier: "none", credits: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;

    // Save stripe customer id
    await supabaseAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("user_id", user.id);

    // Check active subscriptions
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
    const hasActiveSub = subscriptions.data.length > 0;

    let tier = "none";
    let subscriptionEnd = null;
    let monthlyCredits = 0;

    if (hasActiveSub) {
      const sub = subscriptions.data[0];
      subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
      const productId = sub.items.data[0].price.product as string;
      const tierInfo = TIERS[productId];
      if (tierInfo) {
        tier = tierInfo.name;
        monthlyCredits = tierInfo.monthlyCredits;
      }
    }

    // Check for completed top-up payments (one-time) since last check
    // We track this via metadata on the checkout session
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("ai_credits, subscription_tier")
      .eq("user_id", user.id)
      .maybeSingle();

    const currentCredits = profile?.ai_credits ?? 0;

    // If tier changed, reset credits to monthly allotment
    let newCredits = currentCredits;
    if (tier !== "none" && profile?.subscription_tier !== tier) {
      newCredits = monthlyCredits;
    }

    // Update profile
    await supabaseAdmin.from("profiles").update({
      subscription_tier: tier,
      ai_credits: newCredits,
    }).eq("user_id", user.id);

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      tier,
      credits: newCredits,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("check-subscription error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
