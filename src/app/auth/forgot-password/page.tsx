"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const configured = isSupabaseConfigured();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg paper-texture flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center font-mono text-2xl mb-12">
          <span className="text-accent">Just</span>Write
        </Link>

        <div className="border border-border rounded-lg p-8 bg-bg-card">
          <h1 className="font-mono text-xl mb-2 text-center">Reset Password</h1>
          <p className="text-text-muted text-sm text-center mb-6 font-mono">
            Enter your email and we&apos;ll send you a reset link.
          </p>

          {!configured && (
            <div className="mb-6 p-4 rounded bg-bg-input border border-accent-dim text-sm text-text-muted">
              Supabase is not configured yet. Auth is disabled.
              <Link href="/dashboard" className="block mt-2 text-accent hover:underline">
                Go to Dashboard &rarr;
              </Link>
            </div>
          )}

          {sent ? (
            <div className="text-center p-6">
              <div className="text-accent text-4xl mb-4">&#9993;</div>
              <p className="text-text mb-2 font-mono">Check your email</p>
              <p className="text-text-muted text-sm">
                We sent a password reset link to <strong>{email}</strong>.
                Click the link in the email to set a new password.
              </p>
              <Link
                href="/auth/signin"
                className="inline-block mt-6 text-accent hover:underline text-sm font-mono"
              >
                &larr; Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-mono text-text-muted mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-bg-input border border-border rounded px-4 py-3 text-text font-mono text-sm focus:border-accent focus:outline-none transition-colors"
                  placeholder="you@example.com"
                  required
                  disabled={!configured}
                />
              </div>

              {error && (
                <p className="text-danger text-sm font-mono">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !configured}
                className="w-full bg-accent text-bg py-3 rounded font-mono text-sm hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-text-muted mt-6 font-mono">
            Remember your password?{" "}
            <Link href="/auth/signin" className="text-accent hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
