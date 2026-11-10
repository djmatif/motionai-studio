import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/authz";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[#090b14] px-5 py-10 text-white">
      <div className="mx-auto max-w-4xl rounded-3xl border border-violet-500/30 bg-[#111525] p-8">
        <p className="text-xs uppercase tracking-[.25em] text-violet-300">Admin panel</p>
        <h1 className="mt-4 text-4xl font-black">MotionAI Studio control center</h1>
        <p className="mt-3 text-slate-300">Signed in as {user.email}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
            <div className="text-sm text-slate-400">Access</div>
            <div className="mt-2 text-2xl font-bold">Admin</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
            <div className="text-sm text-slate-400">Environment</div>
            <div className="mt-2 text-2xl font-bold">Configured</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
            <div className="text-sm text-slate-400">Status</div>
            <div className="mt-2 text-2xl font-bold">Ready</div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-[#090e1b] p-5">
          <h2 className="text-xl font-bold">Operational checklist</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-300">
            <li>Verify Supabase Auth is enabled for email/password.</li>
            <li>Review provider model IDs and request schemas in lib/models.ts.</li>
            <li>Add your Stripe prices for Pro and Studio subscriptions.</li>
            <li>Keep API keys in server-only environment variables.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
