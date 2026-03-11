"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  const configured = isSupabaseConfigured();

  // Supabase handles the token exchange automatically when the user clicks
  // the reset link — we just need to wait for the session to be available
  useEffect(() => {
    if (!configured) return;

    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Also check if we already have a session (user may have already been authenticated)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
  }, [configured]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-bg paper-texture flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center font-mono text-2xl mb-12">
          <span className="text-accent">Just</span>Write
        </Link>

        <div className="border border-border rounded-lg p-8 bg-bg-card">
          <h1 className="font-mono text-xl mb-2 text-center">Set New Password</h1>
          <p className="text-text-muted text-sm text-center mb-6 font-mono">
            Choose a strong new password for your account.
          </p>

          {!configured && (
            <div className="mb-6 p-4 rounded bg-bg-input border border-accent-dim text-sm text-text-muted">
              Supabase is not configured yet. Auth is disabled.
            </div>
          )}

          {success ? (
            <div className="text-center p-6">
              <div className="text-accent text-4xl mb-4">&#10003;</div>
              <p className="text-text mb-2 font-mono">Password updated!</p>
              <p className="text-text-muted text-sm">
                Redirecting you to your dashboard...
              </p>
            </div>
          ) : !ready ? (
            <div className="text-center p-6">
              <div className="text-text-muted text-4xl mb-4 animate-pulse">&#8987;</div>
              <p className="text-text-muted text-sm font-mono">
                Verifying your reset link...
              </p>
              <p className="text-text-dim text-xs mt-2">
                If this takes too long, try clicking the link in your email again.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-mono text-text-muted mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-bg-input border border-border rounded px-4 py-3 text-text font-mono text-sm focus:border-accent focus:outline-none transition-colors"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-mono text-text-muted mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full bg-bg-input border border-border rounded px-4 py-3 text-text font-mono text-sm focus:border-accent focus:outline-none transition-colors"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <p className="text-danger text-sm font-mono">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent text-bg py-3 rounded font-mono text-sm hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-text-muted mt-6 font-mono">
            <Link href="/auth/signin" className="text-accent hover:underline">
              &larr; Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
