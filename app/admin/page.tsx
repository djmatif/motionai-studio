import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/authz";
import { AdminControls } from "@/components/admin-controls";

export default async function AdminPage() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  if (!isAdminEmail(user.email)) redirect("/");

  const [summaryResult, usersResult, generationsResult] = await Promise.all([
    auth.rpc("motionai_admin_summary"),
    auth.rpc("motionai_admin_list_users"),
    auth.rpc("motionai_admin_recent_generations")
  ]);

  const summary = summaryResult.data ?? {};
  const users = usersResult.data ?? [];
  const generations = generationsResult.data ?? [];
  const error = summaryResult.error || usersResult.error || generationsResult.error;

  return <main className="min-h-screen max-w-7xl mx-auto p-6 sm:p-10">
    <header className="flex flex-wrap justify-between gap-4 items-center border-b border-white/10 pb-6">
      <div><p className="text-violet-300 text-xs tracking-widest uppercase">MotionAI Studio</p><h1 className="text-3xl font-black mt-2">Admin & database</h1><p className="text-slate-400 text-sm mt-1">Administrator: {user.email}</p></div>
      <Link href="/" className="rounded-xl border border-white/15 px-4 py-2 text-sm">Back to studio</Link>
    </header>
    {error ? <p className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">Could not load database administration: {error.message}. Check that the MotionAI admin database migration has been applied.</p> : <>
      <section className="grid sm:grid-cols-4 gap-4 mt-8">
        {[
          ["Registered users", summary.users ?? 0],
          ["Video generations", summary.generations ?? 0],
          ["Queued / processing", summary.queued ?? 0],
          ["Completed videos", summary.completed ?? 0]
        ].map(([label,value]) => <div key={String(label)} className="rounded-2xl bg-white/[.04] border border-white/10 p-6"><p className="text-slate-400 text-sm">{label}</p><p className="text-3xl font-bold mt-2">{value}</p></div>)}
      </section>
      <AdminControls users={users} generations={generations} />
    </>}
    <p className="text-xs text-slate-500 mt-8">Admin actions are verified in PostgreSQL against the signed-in email. Never share your admin password or Supabase secret keys.</p>
  </main>;
}
