import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/authz";

export default async function AdminPage() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  if (!isAdminEmail(user.email)) redirect("/");

  const db = createAdminClient();
  const [{ count: users }, { count: generations }, { data: latest }] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("generations").select("id", { count: "exact", head: true }),
    db.from("generations").select("id,prompt,status,model,created_at,user_id").order("created_at", { ascending: false }).limit(12)
  ]);

  return <main className="min-h-screen max-w-6xl mx-auto p-6 sm:p-10">
    <header className="flex flex-wrap justify-between gap-4 items-center border-b border-white/10 pb-6">
      <div><p className="text-violet-300 text-xs tracking-widest uppercase">MotionAI Studio</p><h1 className="text-3xl font-black mt-2">Admin dashboard</h1><p className="text-slate-400 text-sm mt-1">Signed in as {user.email}</p></div>
      <Link href="/" className="rounded-xl border border-white/15 px-4 py-2 text-sm">Back to studio</Link>
    </header>
    <section className="grid sm:grid-cols-3 gap-4 mt-8">
      {[['Registered users', users ?? 0], ['Total generations', generations ?? 0], ['Admin access', 'Unlimited free']].map(([label,value]) => <div key={String(label)} className="rounded-2xl bg-white/[.04] border border-white/10 p-6"><p className="text-slate-400 text-sm">{label}</p><p className="text-3xl font-bold mt-2">{value}</p></div>)}
    </section>
    <section className="mt-10"><h2 className="text-xl font-bold mb-4">Latest generations</h2><div className="overflow-x-auto rounded-2xl border border-white/10"><table className="w-full text-sm"><thead className="bg-white/[.05] text-slate-300"><tr><th className="text-left p-3">Prompt</th><th className="text-left p-3">Model</th><th className="text-left p-3">Status</th><th className="text-left p-3">Created</th></tr></thead><tbody>{(latest ?? []).map((job: any)=><tr key={job.id} className="border-t border-white/10"><td className="p-3 max-w-md truncate">{job.prompt}</td><td className="p-3">{job.model}</td><td className="p-3">{job.status}</td><td className="p-3">{new Date(job.created_at).toLocaleString()}</td></tr>)}{!latest?.length && <tr><td className="p-4 text-slate-400" colSpan={4}>No generations yet.</td></tr>}</tbody></table></div></section>
    <p className="text-xs text-slate-500 mt-8">Admin access is controlled by the server-side ADMIN_EMAIL allow-list. Keep your Supabase service-role key private.</p>
  </main>;
}
