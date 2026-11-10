import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

const planCredits = (plan: string) => plan === "studio" ? 2000 : plan === "pro" ? 500 : 30;

export async function POST(request: Request) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  const db = createAdminClient();
  if (!db) return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.user_id;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
        const plan = session.metadata?.plan === "studio" ? "studio" : "pro";

        if (userId && session.mode === "subscription") {
          const { error } = await db.from("profiles").update({
            plan,
            stripe_customer_id: customerId ?? null,
            stripe_subscription_id: subscriptionId ?? null
          }).eq("id", userId);
          if (error) throw error;
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = subscription.metadata?.user_id;
        const plan = subscription.metadata?.plan === "studio" ? "studio" : "pro";
        if (userId && (subscription.status === "active" || subscription.status === "trialing")) {
          const { error } = await db.from("profiles").update({
            plan,
            stripe_subscription_id: subscription.id,
            credits: planCredits(plan)
          }).eq("id", userId);
          if (error) throw error;
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;
        if (userId) {
          const active = event.type !== "customer.subscription.deleted"
            && (subscription.status === "active" || subscription.status === "trialing");
          const plan = active
            ? (subscription.metadata?.plan === "studio" ? "studio" : "pro")
            : "free";
          const { error } = await db.from("profiles").update({
            plan,
            stripe_subscription_id: active ? subscription.id : null
          }).eq("id", userId);
          if (error) throw error;
        }
        break;
      }

      case "invoice.payment_failed": {
        // Keep access state tied to subscription status; Stripe Billing can retry
        // failed payments using Smart Retries configured in the Dashboard.
        break;
      }

      default:
        break;
    }
  } catch {
    return NextResponse.json({ error: "Unable to process webhook payload." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
