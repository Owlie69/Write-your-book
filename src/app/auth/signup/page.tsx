"use client";

import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-bg paper-texture flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center font-mono text-2xl mb-12">
          <span className="text-accent">Just</span>Write
        </Link>

        <div className="border border-border rounded-lg p-8 bg-bg-card">
          <h1 className="font-mono text-xl mb-6 text-center">Create Account</h1>

          <div className="mb-6 p-5 rounded bg-bg-input border border-accent-dim text-sm text-text-muted text-center leading-relaxed">
            Account creation is temporarily unavailable while we improve the sign-up experience.
            <br />
            You can still use the app locally without an account.
          </div>

          <Link
            href="/dashboard"
            className="block w-full bg-accent text-white text-center py-3 rounded font-mono text-sm hover:bg-accent-hover transition-colors"
          >
            Go to Dashboard
          </Link>

          <p className="text-center text-sm text-text-muted mt-6 font-mono">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-accent hover:underline">
              Sign In
            </Link>
          </p>
        </div>

        <p className="text-center text-sm text-text-dim mt-6">
          <Link href="/" className="hover:text-text-muted transition-colors">
            &larr; Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
}
