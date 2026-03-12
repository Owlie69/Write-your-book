"use client";

import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-bg paper-texture flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center font-mono text-2xl mb-12">
          <span className="text-accent">Just</span>Write
        </Link>

        <div className="border border-border rounded-lg p-8 bg-bg-card">
          <h1 className="font-mono text-xl mb-2 text-center">Reset Password</h1>

          <div className="mt-4 p-5 rounded bg-bg-input border border-accent-dim text-sm text-text-muted text-center leading-relaxed">
            Password reset is temporarily unavailable.
            <br />
            We&apos;re working on improving our authentication system.
          </div>

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
