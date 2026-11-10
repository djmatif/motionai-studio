import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  if (!stripe) return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });

  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const db = createAdminClient();
  if (!db) return NextResponse.json({ error: "Billing database is not configured." }, { status: 503 });

  const { data: profile, error } = await db
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Unable to load billing profile." }, { status: 500 });
  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "No Stripe customer is linked to this account yet." }, { status: 409 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appUrl}/`
  });
  return NextResponse.redirect(session.url, 303);
}
