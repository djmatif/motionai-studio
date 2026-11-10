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
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setConfirmationPending(false);

    try {
      const authAction =
        mode === "signin"
          ? supabase.auth.signInWithPassword({ email: email.trim(), password })
          : supabase.auth.signUp({
              email: email.trim(),
              password,
              options: {
                emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
              },
            });

      const { data, error } = await authAction;

      if (error) throw error;

      if (mode === "signup" && data.user && !data.session) {
        setConfirmationPending(true);
        setMessage("We sent a confirmation link to your email. Open it to verify your address, then return here to sign in.");
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

  async function resendConfirmation() {
    if (!email.trim()) {
      setMessage("Enter your email address first.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
        },
      });
      if (error) throw error;
      setMessage("A new confirmation email has been sent. Check your inbox and spam folder.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to resend the confirmation email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#090b14] px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111525] p-6 shadow-2xl shadow-black/30">
        <div className="mb-6 text-center">
          <div className="text-xs tracking-[.25em] text-violet-300 uppercase">MotionAI Studio</div>
          <h1 className="mt-3 text-3xl font-black">
            {confirmationPending ? "Verify your email" : mode === "signin" ? "Welcome back" : "Create account"}
          </h1>
        </div>

        {!confirmationPending && (
          <>
            <div className="mb-5 flex rounded-xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => { setMode("signin"); setMessage(""); }}
                className={`flex-1 rounded-lg px-3 py-2 text-sm ${mode === "signin" ? "bg-violet-600" : "text-slate-300"}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setMode("signup"); setMessage(""); }}
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
                  autoComplete="email"
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
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
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
          </>
        )}

        {confirmationPending && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-slate-300">Confirmation link sent to <strong className="text-white">{email}</strong>.</p>
            <button
              type="button"
              onClick={resendConfirmation}
              disabled={busy}
              className="w-full rounded-xl border border-violet-400/40 py-3 font-semibold text-violet-200 disabled:opacity-60"
            >
              {busy ? "Sending..." : "Resend confirmation email"}
            </button>
            <button
              type="button"
              onClick={() => { setConfirmationPending(false); setMode("signin"); setMessage(""); }}
              className="w-full py-2 text-sm text-slate-300 hover:text-white"
            >
              Back to sign in
            </button>
          </div>
        )}

        {message && <p role="status" className="mt-4 text-sm text-violet-200">{message}</p>}

        <p className="mt-5 text-center text-xs text-slate-400">
          {confirmationPending ? "Didn't receive it? Check spam or resend the email above." : "Your email must be verified before you can sign in."}
        </p>
      </div>
    </main>
  );
}
