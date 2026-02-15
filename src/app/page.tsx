"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { PLANS } from "@/lib/constants";

function TypingEffect({ words }: { words: string[] }) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[index];
    const timeout = deleting ? 50 : 120;

    if (!deleting && text === word) {
      setTimeout(() => setDeleting(true), 2000);
      return;
    }

    if (deleting && text === "") {
      setDeleting(false);
      setIndex((i) => (i + 1) % words.length);
      return;
    }

    const timer = setTimeout(() => {
      setText(
        deleting ? word.substring(0, text.length - 1) : word.substring(0, text.length + 1)
      );
    }, timeout);

    return () => clearTimeout(timer);
  }, [text, deleting, index, words]);

  return (
    <span className="text-accent">
      {text}
      <span className="cursor-blink">|</span>
    </span>
  );
}

function PricingCard({
  plan,
  type,
  popular,
}: {
  plan: (typeof PLANS)[keyof typeof PLANS];
  type: string;
  popular?: boolean;
}) {
  return (
    <div
      className={`relative rounded-lg border p-8 flex flex-col ${
        popular
          ? "border-accent bg-bg-card scale-105"
          : "border-border bg-bg-card/50"
      }`}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-bg text-xs font-bold px-3 py-1 rounded-full">
          MOST POPULAR
        </div>
      )}
      <h3 className="font-mono text-xl mb-2">{plan.name}</h3>
      <div className="mb-6">
        {plan.price === 0 ? (
          <span className="text-3xl font-bold">Free</span>
        ) : (
          <>
            <span className="text-3xl font-bold">&euro;{plan.price}</span>
            <span className="text-text-muted">/month</span>
          </>
        )}
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-text-muted">
            <span className="text-accent mt-0.5">&#10003;</span>
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href={type === "free" ? "/dashboard" : "/auth/signup"}
        className={`block text-center py-3 px-6 rounded font-mono text-sm transition-colors ${
          popular
            ? "bg-accent text-bg hover:bg-accent-hover"
            : "border border-border hover:border-accent hover:text-accent"
        }`}
      >
        {type === "free" ? "Start Writing" : "Get Started"}
      </Link>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg paper-texture">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-6 max-w-6xl mx-auto">
        <Link href="/" className="font-mono text-xl tracking-tight">
          <span className="text-accent">Just</span>Write
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="#pricing"
            className="text-text-muted hover:text-text text-sm font-mono transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/auth/signin"
            className="text-text-muted hover:text-text text-sm font-mono transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="bg-accent text-bg px-4 py-2 rounded text-sm font-mono hover:bg-accent-hover transition-colors"
          >
            Start Writing
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 md:px-12 py-20 md:py-32 max-w-4xl mx-auto text-center fade-in">
        <h1 className="text-4xl md:text-6xl font-serif leading-tight mb-6">
          Lock in.
          <br />
          Write your{" "}
          <TypingEffect words={["book", "journal", "story", "memoir", "thesis"]} />
          <br />
          Ship it.
        </h1>
        <p className="text-text-muted text-lg md:text-xl max-w-2xl mx-auto mb-4 leading-relaxed">
          A distraction-free writing tool that locks you into focused sessions.
          No AI writing for you. No fancy formatting. No excuses.
        </p>
        <p className="text-text-dim text-base max-w-xl mx-auto mb-10">
          Just you, your thoughts, and a timer counting down.
          Build the habit. Finish what you started.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="bg-accent text-bg px-8 py-4 rounded font-mono text-lg hover:bg-accent-hover transition-colors pulse-glow"
          >
            Start Writing — It&apos;s Free
          </Link>
          <Link
            href="#how-it-works"
            className="border border-border px-8 py-4 rounded font-mono text-lg hover:border-accent hover:text-accent transition-colors"
          >
            How It Works
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 md:px-12 py-20 max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-serif text-center mb-16">
          Three steps. That&apos;s it.
        </h2>
        <div className="grid md:grid-cols-3 gap-12">
          {[
            {
              step: "01",
              title: "Set your timer",
              desc: "Choose how long you want to lock in. 30 minutes is the default. Once you start, there's no going back.",
            },
            {
              step: "02",
              title: "Write",
              desc: "The app goes fullscreen. No tabs. No notifications. No distractions. Just a blank page and your words. Pick small, medium, or large text — that's the only choice you need to make.",
            },
            {
              step: "03",
              title: "Ship",
              desc: "When the timer ends, your session is done. Your words are saved. Do it again tomorrow. Build the habit. Finish the book before it's too late.",
            },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="font-mono text-accent text-4xl mb-4">{item.step}</div>
              <h3 className="font-mono text-lg mb-3">{item.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The pitch */}
      <section className="px-6 md:px-12 py-20 max-w-3xl mx-auto text-center">
        <div className="border border-border rounded-lg p-8 md:p-12 bg-bg-card">
          <h2 className="text-2xl md:text-3xl font-serif mb-6">
            You don&apos;t need AI to write your story.
          </h2>
          <p className="text-text-muted leading-relaxed mb-4">
            Everyone&apos;s got a book in them. A journal they keep meaning to start.
            A story that&apos;s been bouncing around their head for years.
          </p>
          <p className="text-text-muted leading-relaxed mb-4">
            The problem isn&apos;t talent. It&apos;s not ideas. It&apos;s distraction.
            It&apos;s the browser tab calling your name. The notification that
            pulls you away. The urge to &ldquo;research&rdquo; instead of writing.
          </p>
          <p className="text-text leading-relaxed font-medium">
            JustWrite removes all of that. Lock in, write, and build the habit
            that finally gets your words out of your head and onto the page.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 md:px-12 py-20 max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-serif text-center mb-4">
          Simple pricing
        </h2>
        <p className="text-text-muted text-center mb-16 max-w-md mx-auto">
          Start for free. Upgrade when you&apos;re ready to commit.
        </p>
        <div className="grid md:grid-cols-3 gap-8 items-start">
          <PricingCard plan={PLANS.free} type="free" />
          <PricingCard plan={PLANS.cloud} type="cloud" popular />
          <PricingCard plan={PLANS.desktop} type="desktop" />
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 md:px-12 py-20 max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-serif mb-6">
          Your book isn&apos;t going to write itself.
        </h2>
        <p className="text-text-muted mb-8">
          Stop planning. Stop researching. Stop overthinking.
          Open JustWrite, set the timer, and start putting words on the page.
        </p>
        <Link
          href="/dashboard"
          className="inline-block bg-accent text-bg px-8 py-4 rounded font-mono text-lg hover:bg-accent-hover transition-colors"
        >
          Start Writing Now
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 md:px-12 py-8 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="font-mono text-sm text-text-dim">
            <span className="text-accent">Just</span>Write &copy; {new Date().getFullYear()}
          </div>
          <div className="flex gap-6 text-sm text-text-dim font-mono">
            <Link href="#pricing" className="hover:text-text transition-colors">
              Pricing
            </Link>
            <Link href="/auth/signin" className="hover:text-text transition-colors">
              Sign In
            </Link>
            <Link href="/dashboard" className="hover:text-text transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
