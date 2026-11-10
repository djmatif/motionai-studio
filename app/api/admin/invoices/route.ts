import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { isAdminEmail } from "@/lib/authz";

export async function POST(request: Request) {
  if (!stripe) return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });

  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.customerEmail === "string" ? body.customerEmail.trim() : "";
  const name = typeof body?.customerName === "string" ? body.customerName.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const currency = typeof body?.currency === "string" ? body.currency.toLowerCase() : "usd";
  const amountMinor = Number(body?.amountMinor);

  if (!email || !email.includes("@") || !description || !/^[a-z]{3}$/.test(currency)
      || !Number.isSafeInteger(amountMinor) || amountMinor < 50) {
    return NextResponse.json({
      error: "Provide a valid customerEmail, description, three-letter currency, and amountMinor of at least 50."
    }, { status: 400 });
  }

  try {
    const customer = await stripe.customers.create({ email, ...(name ? { name } : {}) });
    await stripe.invoiceItems.create({
      customer: customer.id,
      currency,
      amount: amountMinor,
      description
    });
    const invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: "send_invoice",
      days_until_due: 14,
      auto_advance: true,
      ...(process.env.STRIPE_TAX_ENABLED === "true" ? { automatic_tax: { enabled: true } } : {})
    });
    if (!invoice.id) throw new Error("Stripe did not return an invoice ID.");
    const sent = await stripe.invoices.sendInvoice(invoice.id);
    return NextResponse.json({
      invoiceId: sent.id,
      hostedInvoiceUrl: sent.hosted_invoice_url,
      status: sent.status
    });
  } catch {
    return NextResponse.json({ error: "Stripe could not create or send this invoice." }, { status: 502 });
  }
}
