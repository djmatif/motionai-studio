import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.user_id;
        const plan = session.metadata?.plan === "studio" ? "studio" : "pro";

        if (userId && session.mode === "subscription") {
          const { error } = await adminClient.from("profiles").update({
            plan,
            stripe_subscription_id: typeof session.subscription === "string"
              ? session.subscription
              : session.subscription?.id ?? null
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
          const isActive = event.type !== "customer.subscription.deleted"
            && (subscription.status === "active" || subscription.status === "trialing");
          const priceIds = subscription.items.data.map(item => item.price.id);
          const plan = isActive
            ? (priceIds.includes(process.env.STRIPE_PRICE_STUDIO_MONTHLY || "") ? "studio" : "pro")
            : "free";
          const { error } = await adminClient.from("profiles").update({
            plan,
            stripe_subscription_id: isActive ? subscription.id : null
          }).eq("id", userId);
          if (error) throw error;
        }
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
