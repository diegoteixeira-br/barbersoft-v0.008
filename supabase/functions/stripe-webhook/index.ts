import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // Require webhook secret and signature for security
    if (!webhookSecret) {
      logStep("ERROR: STRIPE_WEBHOOK_SECRET is not configured");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!signature) {
      logStep("ERROR: Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook signature verified");
    } catch (err) {
      logStep("Webhook signature verification failed", { error: String(err) });
      return new Response(JSON.stringify({ error: "Webhook signature verification failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Processing event", { type: event.type });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const companyId = session.metadata?.company_id;
        const plan = session.metadata?.plan;
        const subscriptionId = session.subscription as string;

        logStep("Checkout completed", { companyId, plan, subscriptionId });

        if (companyId && subscriptionId) {
          // Get subscription details to check for trial
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const isTrialing = subscription.status === "trialing";
          const trialEnd = subscription.trial_end 
            ? new Date(subscription.trial_end * 1000).toISOString() 
            : null;

          logStep("Subscription details", { 
            status: subscription.status, 
            isTrialing, 
            trialEnd 
          });

          const { error } = await supabaseClient
            .from("companies")
            .update({
              plan_status: isTrialing ? "trial" : "active",
              plan_type: plan || "profissional",
              stripe_subscription_id: subscriptionId,
              trial_ends_at: trialEnd,
              updated_at: new Date().toISOString()
            })
            .eq("id", companyId);

          if (error) {
            logStep("Error updating company", { error: error.message });
          } else {
            logStep("Company updated", { status: isTrialing ? "trial" : "active" });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;
        const status = subscription.status;
        const trialEnd = subscription.trial_end 
          ? new Date(subscription.trial_end * 1000).toISOString() 
          : null;

        logStep("Subscription updated", { subscriptionId, status, trialEnd });

        let planStatus = "active";
        if (status === "trialing") planStatus = "trial";
        if (status === "past_due") planStatus = "overdue";
        if (status === "canceled" || status === "unpaid") planStatus = "cancelled";

        const updateData: Record<string, any> = {
          plan_status: planStatus,
          updated_at: new Date().toISOString()
        };

        // Update trial_ends_at if subscription is trialing
        if (status === "trialing" && trialEnd) {
          updateData.trial_ends_at = trialEnd;
        }

        const { error } = await supabaseClient
          .from("companies")
          .update(updateData)
          .eq("stripe_subscription_id", subscriptionId);

        if (error) {
          logStep("Error updating company", { error: error.message });
        } else {
          logStep("Company status updated", { planStatus });
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        logStep("Invoice paid", { subscriptionId, billing_reason: (invoice as any).billing_reason });

        if (subscriptionId) {
          // When invoice is paid, subscription is active (trial ended successfully)
          const { error } = await supabaseClient
            .from("companies")
            .update({
              plan_status: "active",
              updated_at: new Date().toISOString()
            })
            .eq("stripe_subscription_id", subscriptionId);

          if (error) {
            logStep("Error updating company", { error: error.message });
          } else {
            logStep("Company status confirmed active after payment");
          }

          // === REFERRAL LOGIC ===
          // Check if this is the first payment (subscription_create)
          const billingReason = (invoice as any).billing_reason;
          if (billingReason === "subscription_create") {
            logStep("First payment detected, checking referral");

            // Find the company that just paid
            const { data: referredCompany } = await supabaseClient
              .from("companies")
              .select("id, signup_source")
              .eq("stripe_subscription_id", subscriptionId)
              .maybeSingle();

            if (referredCompany?.signup_source?.startsWith("ref:")) {
              const refCode = referredCompany.signup_source.replace("ref:", "");
              logStep("Referral code found", { refCode });

              // Find the referrer company
              const { data: referrerCompany } = await supabaseClient
                .from("companies")
                .select("id, stripe_subscription_id")
                .eq("referral_code", refCode)
                .maybeSingle();

              if (referrerCompany && referrerCompany.id !== referredCompany.id) {
                logStep("Referrer found", { referrerId: referrerCompany.id });

                try {
                  // Create referral record
                  await supabaseClient.from("referrals").insert({
                    referrer_company_id: referrerCompany.id,
                    referred_company_id: referredCompany.id,
                    status: "pending",
                  });

                  // Create a 100% off coupon (duration: once)
                  const coupon = await stripe.coupons.create({
                    percent_off: 100,
                    duration: "once",
                    name: "Referral - 1 Mês Grátis",
                  });
                  logStep("Coupon created", { couponId: coupon.id });

                  // Apply coupon to referred (new user) subscription
                  await stripe.subscriptions.update(subscriptionId, {
                    coupon: coupon.id,
                  });
                  logStep("Coupon applied to referred user");

                  // Apply coupon to referrer subscription (if active)
                  if (referrerCompany.stripe_subscription_id) {
                    const referrerCoupon = await stripe.coupons.create({
                      percent_off: 100,
                      duration: "once",
                      name: "Referral - 1 Mês Grátis (Indicador)",
                    });
                    await stripe.subscriptions.update(referrerCompany.stripe_subscription_id, {
                      coupon: referrerCoupon.id,
                    });
                    logStep("Coupon applied to referrer");
                  }

                  // Update referral status to completed
                  await supabaseClient
                    .from("referrals")
                    .update({
                      status: "completed",
                      completed_at: new Date().toISOString(),
                    })
                    .eq("referred_company_id", referredCompany.id);

                  logStep("Referral completed successfully");
                } catch (refError) {
                  logStep("Error processing referral", { error: String(refError) });
                }
              }
            }
          }
          // === END REFERRAL LOGIC ===
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        logStep("Invoice payment failed", { subscriptionId });

        if (subscriptionId) {
          const { error } = await supabaseClient
            .from("companies")
            .update({
              plan_status: "overdue",
              updated_at: new Date().toISOString()
            })
            .eq("stripe_subscription_id", subscriptionId);

          if (error) {
            logStep("Error updating company", { error: error.message });
          } else {
            logStep("Company marked as overdue");
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        logStep("Subscription deleted", { subscriptionId });

        const { error } = await supabaseClient
          .from("companies")
          .update({
            plan_status: "cancelled",
            stripe_subscription_id: null,
            updated_at: new Date().toISOString()
          })
          .eq("stripe_subscription_id", subscriptionId);

        if (error) {
          logStep("Error updating company", { error: error.message });
        } else {
          logStep("Company marked as cancelled");
        }
        break;
      }

      case "customer.subscription.trial_will_end": {
        // Trial is ending in 3 days - could trigger notification here
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Trial ending soon", { 
          subscriptionId: subscription.id,
          trialEnd: subscription.trial_end 
            ? new Date(subscription.trial_end * 1000).toISOString() 
            : null
        });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: "Erro ao processar webhook." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});