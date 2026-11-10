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
        <nav className="flex gap-4 text-sm text-slate-300 items-center">
          <Link href="#pricing">Pricing</Link>
          {user ? (
            <>
              <span className="hidden sm:inline">{user.email}</span>
              {profile?.stripe_customer_id && <form action="/api/billing/portal" method="post"><button className="rounded-lg border border-white/15 px-3 py-2">Manage billing</button></form>}
              {isAdminEmail(user.email) && <Link href="/admin" className="text-violet-300">Admin</Link>}
              <form action="/auth/signout" method="post">
                <button className="rounded-lg border border-white/15 px-3 py-2">Sign out</button>
              </form>
            </>
          ) : (
            <Link className="rounded-lg bg-violet-600 px-4 py-2 text-white" href="/login">Sign in</Link>
          )}
        </nav>
      </header>

      <section className="max-w-7xl mx-auto px-5 pt-14 pb-8">
        <div className="max-w-3xl">
          <div className="text-xs tracking-[.25em] text-violet-300 uppercase mb-4">Your AI video production studio</div>
          <h1 className="text-4xl sm:text-6xl font-black leading-tight">Turn your ideas into <span className="text-violet-400">moving pictures.</span></h1>
          <p className="text-slate-400 mt-5 text-lg">Create cinematic clips, animated scenes and social videos with leading AI video models.</p>
        </div>
        <div className="mt-10"><Studio signedIn={!!user} credits={profile?.credits ?? 0} plan={profile?.plan ?? "free"} /></div>
      </section>

      <section id="pricing" className="max-w-7xl mx-auto px-5 py-16">
        <h2 className="text-3xl font-bold">Plans that scale with your creativity</h2>
        <p className="text-slate-400 mt-2">Free credits to get started. Upgrade when you need more.</p>
        <div className="grid md:grid-cols-3 gap-4 mt-7">
          {[
            ["Free", "$0", "30 starter credits", "Try the studio"],
            ["Pro", "$19 / month", "500 credits / month", "For regular creators"],
            ["Studio", "$49 / month", "2,000 credits / month", "For high-volume creators"]
          ].map((p, i) => (
            <div key={p[0]} className={`rounded-2xl border p-6 ${i === 1 ? "border-violet-400 bg-violet-500/10" : "border-white/10 bg-white/[.03]"}`}>
              <div className="text-lg font-bold">{p[0]}</div>
              <div className="text-3xl font-black mt-3">{p[1]}</div>
              <p className="text-slate-400 mt-2">{p[2]}</p>
              {i === 0 ? (
                <Link href="/login" className="block mt-6 text-center rounded-xl border border-white/15 py-3">Get started</Link>
              ) : (
                <form action="/api/billing/checkout" method="post">
                  <input type="hidden" name="plan" value={i === 1 ? "pro" : "studio"} />
                  <button className="w-full mt-6 rounded-xl bg-violet-600 py-3 font-semibold">Choose {p[0]}</button>
                </form>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-4">Illustrative launch pricing. Configure matching Stripe prices before accepting payments.</p>
      </section>

      <footer className="border-t border-white/10 px-5 py-8 text-center text-xs text-slate-500">© {new Date().getFullYear()} MotionAI Studio. AI-generated content should be reviewed before publication.</footer>
    </main>
  );
}
