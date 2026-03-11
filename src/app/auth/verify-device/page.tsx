"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  getDeviceFingerprint,
  addKnownDevice,
} from "@/lib/device-fingerprint";

export default function VerifyDevicePage() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  const configured = isSupabaseConfigured();

  useEffect(() => {
    // Get the pending verification data
    const pending = sessionStorage.getItem("justwrite_pending_verify");
    if (pending) {
      const data = JSON.parse(pending);
      setEmail(data.email || "");
      setUserId(data.userId || "");
    } else {
      // No pending verification, redirect to signin
      router.push("/auth/signin");
    }
  }, [router]);

  function handleInput(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    const fullCode = newCode.join("");
    if (fullCode.length === 6 && newCode.every((d) => d !== "")) {
      verifyCode(fullCode);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newCode = [...code];
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);
    if (pasted.length === 6) {
      verifyCode(pasted);
    } else {
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  }

  async function verifyCode(codeStr: string) {
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: codeStr,
        type: "email",
      });

      if (error) {
        setError("Invalid or expired code. Please try again.");
        setLoading(false);
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }

      // Verification successful — mark device as known
      if (userId) {
        addKnownDevice(userId, getDeviceFingerprint());
      }

      // Clear pending data
      sessionStorage.removeItem("justwrite_pending_verify");

      router.push("/dashboard");
    } catch {
      setError("Verification failed. Please try again.");
      setLoading(false);
    }
  }

  async function resendCode() {
    setResending(true);
    setResent(false);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setResent(true);
      }
    } catch {
      setError("Failed to resend code.");
    }

    setResending(false);
  }

  return (
    <div className="min-h-screen bg-bg paper-texture flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center font-mono text-2xl mb-12">
          <span className="text-accent">Just</span>Write
        </Link>

        <div className="border border-border rounded-lg p-8 bg-bg-card">
          <div className="text-center mb-6">
            <div className="text-accent text-4xl mb-3">&#128274;</div>
            <h1 className="font-mono text-xl mb-2">Verify Your Device</h1>
            <p className="text-text-muted text-sm">
              We noticed a sign-in from a new device. For your security, we sent
              a 6-digit code to:
            </p>
            <p className="text-accent text-sm font-mono mt-1">{email}</p>
          </div>

          {!configured && (
            <div className="mb-6 p-4 rounded bg-bg-input border border-accent-dim text-sm text-text-muted">
              Supabase is not configured yet. Auth is disabled.
            </div>
          )}

          <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInput(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={loading}
                className="w-12 h-14 text-center text-xl font-mono bg-bg-input border border-border rounded focus:border-accent focus:outline-none transition-colors disabled:opacity-50"
              />
            ))}
          </div>

          {error && (
            <p className="text-danger text-sm font-mono text-center mb-4">{error}</p>
          )}

          {loading && (
            <p className="text-text-muted text-sm font-mono text-center mb-4 animate-pulse">
              Verifying...
            </p>
          )}

          {resent && (
            <p className="text-accent text-sm font-mono text-center mb-4">
              New code sent!
            </p>
          )}

          <div className="text-center space-y-3">
            <button
              onClick={resendCode}
              disabled={resending}
              className="text-accent text-sm font-mono hover:underline disabled:opacity-50"
            >
              {resending ? "Sending..." : "Resend code"}
            </button>

            <p className="text-text-dim text-xs">
              The code expires in 10 minutes.
            </p>
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
