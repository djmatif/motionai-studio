"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UserRow = { id: string; email: string; plan: string; credits: number; created_at: string };
type GenerationRow = { id: string; user_email: string | null; prompt: string; model: string; status: string; duration_seconds: number | null; video_url: string | null; created_at: string };

export function AdminControls({ users, generations }: { users: UserRow[]; generations: GenerationRow[] }) {
  const [rows, setRows] = useState(users);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function save(row: UserRow) {
    setBusy(row.id);
    setMessage("");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("motionai_admin_update_user", {
        p_user_id: row.id,
        p_plan: row.plan,
        p_credits: Number(row.credits)
      });
      if (error) throw error;
      if (!data) throw new Error("User record was not updated.");
      setMessage("Account settings saved.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not update this account.");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      {message && <p role="status" className="mt-4 text-sm text-violet-200">{message}</p>}
      <section className="mt-10">
        <h2 className="text-xl font-bold mb-4">Database administration · Users</h2>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[.05] text-slate-300"><tr><th className="text-left p-3">Email</th><th className="text-left p-3">Plan</th><th className="text-left p-3">Credits</th><th className="text-left p-3">Action</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-white/10">
                  <td className="p-3 min-w-52">{row.email}</td>
                  <td className="p-3">
                    <select value={row.plan} onChange={(e) => setRows((old) => old.map((x) => x.id === row.id ? { ...x, plan: e.target.value } : x))} className="rounded-lg bg-[#090e1b] border border-white/10 p-2">
                      <option value="free">Free</option><option value="pro">Pro</option><option value="studio">Studio</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <input type="number" min="0" max="1000000" value={row.credits} onChange={(e) => setRows((old) => old.map((x) => x.id === row.id ? { ...x, credits: Number(e.target.value) } : x))} className="w-28 rounded-lg bg-[#090e1b] border border-white/10 p-2" />
                  </td>
                  <td className="p-3"><button disabled={busy === row.id} onClick={() => save(row)} className="rounded-lg bg-violet-600 px-3 py-2 disabled:opacity-50">{busy === row.id ? "Saving…" : "Save"}</button></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={4} className="p-4 text-slate-400">No registered accounts yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="mt-10">
        <h2 className="text-xl font-bold mb-4">Recent video generations</h2>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[.05] text-slate-300"><tr><th className="text-left p-3">User</th><th className="text-left p-3">Prompt</th><th className="text-left p-3">Duration</th><th className="text-left p-3">Status</th><th className="text-left p-3">Video</th></tr></thead>
            <tbody>
              {generations.map((g) => <tr key={g.id} className="border-t border-white/10"><td className="p-3">{g.user_email ?? "—"}</td><td className="p-3 max-w-xs truncate">{g.prompt}</td><td className="p-3">{g.duration_seconds ?? "—"}s</td><td className="p-3">{g.status}</td><td className="p-3">{g.video_url ? <a className="text-violet-300 underline" href={g.video_url} target="_blank" rel="noreferrer">Open</a> : "—"}</td></tr>)}
              {!generations.length && <tr><td colSpan={5} className="p-4 text-slate-400">No generations yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
