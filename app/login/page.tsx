"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const authAction =
        mode === "signin"
          ? supabase.auth.signInWithPassword({ email, password })
          : supabase.auth.signUp({ email, password });

      const { data, error } = await authAction;

      if (error) {
        throw error;
      }

      if (mode === "signup" && data.user && !data.session) {
        setMessage("Check your email to confirm your account before signing in.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to complete authentication.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#090b14] px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111525] p-6 shadow-2xl shadow-black/30">
        <div className="mb-6 text-center">
          <div className="text-xs tracking-[.25em] text-violet-300 uppercase">MotionAI Studio</div>
          <h1 className="mt-3 text-3xl font-black">{mode === "signin" ? "Welcome back" : "Create account"}</h1>
        </div>

        <div className="mb-5 flex rounded-xl border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm ${mode === "signin" ? "bg-violet-600" : "text-slate-300"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm ${mode === "signup" ? "bg-violet-600" : "text-slate-300"}`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#090e1b] p-3 outline-none focus:border-violet-400"
            />
          </label>

          <label className="block text-sm">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#090e1b] p-3 outline-none focus:border-violet-400"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-violet-600 py-3 font-semibold disabled:opacity-60"
          >
            {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-violet-200">{message}</p>}

        <p className="mt-5 text-center text-xs text-slate-400">
          Need help? Configure your Supabase auth settings and set the app URL in your environment.
        </p>
      </div>
    </main>
  );
}
