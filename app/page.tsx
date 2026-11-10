import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Studio } from "@/components/studio";
import { isAdminEmail } from "@/lib/authz";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let profile: any = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("plan, credits, stripe_customer_id").eq("id", user.id).single();
    profile = data;
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-white/10 px-5 py-4 flex justify-between items-center max-w-7xl mx-auto">
        <Link href="/" className="font-black tracking-tight text-xl">✦ MOTIONAI <span className="text-violet-400">STUDIO</span></Link>
        <nav className="flex gap-3 text-sm text-slate-300 items-center">
          <Link href="#pricing" className="rounded-lg border border-white/15 px-3 py-2 hover:bg-white/10">Pricing</Link>
          {user ? (
            <>
              <span className="hidden sm:inline">{user.email}</span>
              {profile?.stripe_customer_id ? (
                <form action="/api/billing/portal" method="post">
                  <button type="submit" className="rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-2 font-semibold text-white">Billing</button>
                </form>
              ) : (
                <Link href="#pricing" className="rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-2 font-semibold text-white">Billing</Link>
              )}
              {isAdminEmail(user.email) && <Link href="/admin" className="rounded-lg border border-violet-400/40 px-3 py-2 text-violet-300">Admin</Link>}
              <form action="/auth/signout" method="post">
                <button className="rounded-lg border border-white/15 px-3 py-2">Sign out</button>
              </form>
            </>
          ) : (
            <Link className="rounded-lg bg-violet-600 px-4 py-2 text-white" href="/login">Sign in</Link>
          )}
        </nav>
      </header>>