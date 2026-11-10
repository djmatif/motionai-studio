import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL(next, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent(error.message), process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  }

  return NextResponse.redirect(new URL(next, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}
