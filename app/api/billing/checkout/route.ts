import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const plan = String(form?.get("plan") ?? "pro");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return NextResponse.redirect(new URL(`/?plan=${encodeURIComponent(plan)}`, appUrl));
}
