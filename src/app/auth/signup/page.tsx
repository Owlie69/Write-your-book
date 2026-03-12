"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const configured = isSupabaseConfigured();

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
    const err = await signUp(email, password);
    if (err) {
      setError(err);
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
          <h1 className="font-mono text-xl mb-6 text-center">Create Account</h1>

          {!configured && (
            <div className="mb-6 p-4 rounded bg-bg-input border border-accent-dim text-sm text-text-muted">
              Supabase is not configured yet. Auth is disabled.
              You can still use the app locally without signing in.
              <Link href="/dashboard" className="block mt-2 text-accent hover:underline">
                Go to Dashboard &rarr;
              </Link>
            </div>
          )}

          {success ? (
            <div className="text-center p-6">
              <div className="text-accent text-4xl mb-4">&#10003;</div>
              <p className="text-text mb-2">Account created!</p>
              <p className="text-text-muted text-sm">
                Check your email to confirm, then start writing.
              </p>
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
              <div>
                <label className="block text-sm font-mono text-text-muted mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-bg-input border border-border rounded px-4 py-3 text-text font-mono text-sm focus:border-accent focus:outline-none transition-colors"
                  placeholder="••••••••"
                  required
                  disabled={!configured}
                />
              </div>
              <div>
                <label className="block text-sm font-mono text-text-muted mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full bg-bg-input border border-border rounded px-4 py-3 text-text font-mono text-sm focus:border-accent focus:outline-none transition-colors"
                  placeholder="••••••••"
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
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-text-muted mt-6 font-mono">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-accent hover:underline">
              Sign In
            </Link>
          </p>
        </div>

        <p className="text-center text-sm text-text-dim mt-6">
          <Link href="/dashboard" className="hover:text-text-muted transition-colors">
            Skip sign up &mdash; use locally
          </Link>
        </p>
      </div>
    </div>
  );
}
