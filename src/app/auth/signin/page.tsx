"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const configured = isSupabaseConfigured();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const err = await signIn(email, password);
    if (err) {
      setError(err);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-bg paper-texture flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center font-mono text-2xl mb-12">
          <span className="text-accent">Just</span>Write
        </Link>

        <div className="border border-border rounded-lg p-8 bg-bg-card">
          <h1 className="font-mono text-xl mb-6 text-center">Sign In</h1>

          {!configured && (
            <div className="mb-6 p-4 rounded bg-bg-input border border-accent-dim text-sm text-text-muted">
              Supabase is not configured yet. Auth is disabled.
              You can still use the app locally without signing in.
              <Link href="/dashboard" className="block mt-2 text-accent hover:underline">
                Go to Dashboard &rarr;
              </Link>
            </div>
          )}

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

            <div className="text-right">
              <Link
                href="/auth/forgot-password"
                className="text-xs font-mono text-accent hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {error && (
              <p className="text-danger text-sm font-mono">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !configured}
              className="w-full bg-accent text-bg py-3 rounded font-mono text-sm hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-text-muted mt-6 font-mono">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="text-accent hover:underline">
              Sign Up
            </Link>
          </p>
        </div>

        <p className="text-center text-sm text-text-dim mt-6">
          <Link href="/dashboard" className="hover:text-text-muted transition-colors">
            Skip sign in &mdash; use locally
          </Link>
        </p>
      </div>
    </div>
  );
}
