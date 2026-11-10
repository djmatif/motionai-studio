import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  if (!stripe) return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const form = await request.formData();
  const plan = form.get("plan") === "studio" ? "studio" : "pro";
  const price = plan === "studio"
    ? process.env.STRIPE_PRICE_STUDIO_MONTHLY
    : process.env.STRIPE_PRICE_PRO_MONTHLY;
  if (!price) return NextResponse.json({ error: "Stripe price ID is missing." }, { status: 503 });

  const { data: profile } = await supabase.from("profiles")
    .select("stripe_customer_id").eq("id", user.id).maybeSingle();
  const customerId = profile?.stripe_customer_id ?? undefined;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    ...(customerId ? { customer: customerId } : { customer_email: user.email ?? undefined }),
    client_reference_id: user.id,
    metadata: { user_id: user.id, plan },
    subscription_data: { metadata: { user_id: user.id, plan } },
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    ...(process.env.STRIPE_TAX_ENABLED === "true" ? { automatic_tax: { enabled: true } } : {}),
    success_url: `${appUrl}/?billing=success`,
    cancel_url: `${appUrl}/?billing=cancelled`
  });

  if (!session.url) return NextResponse.json({ error: "Unable to create checkout session." }, { status: 502 });
  return NextResponse.redirect(session.url, 303);
}
