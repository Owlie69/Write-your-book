"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { PLANS } from "@/lib/constants";
import { useTheme } from "@/lib/theme-context";

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

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? "\u263E" : "\u2600"}
    </button>
  );
}

function PricingCard({
  plan,
  type,
  popular,
  billing,
}: {
  plan: (typeof PLANS)[keyof typeof PLANS];
  type: string;
  popular?: boolean;
  billing: "yearly" | "monthly";
}) {
  // Monthly is 30% more expensive than the base (yearly) price
  const displayPrice =
    plan.price === 0
      ? 0
      : billing === "monthly"
      ? Math.round(plan.price * 1.3 * 100) / 100
      : plan.price;

  return (
    <div
      className={`relative rounded-lg border p-8 flex flex-col card-elevated ${
        popular
          ? "border-accent bg-bg-card scale-105"
          : "border-border bg-bg-card/80"
      }`}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full">
          MOST POPULAR
        </div>
      )}
      <h3 className="font-mono text-xl mb-2">{plan.name}</h3>
      <div className="mb-6">
        {plan.price === 0 ? (
          <span className="text-3xl font-bold">Free</span>
        ) : (
          <>
            <span className="text-3xl font-bold">&euro;{displayPrice}</span>
            <span className="text-text-muted">/{billing === "yearly" ? "mo" : "mo"}</span>
            {billing === "yearly" && (
              <div className="text-xs text-text-dim mt-1">billed yearly</div>
            )}
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
            ? "bg-accent text-white hover:bg-accent-hover"
            : "border border-border hover:border-accent hover:text-accent"
        }`}
      >
        {type === "free" ? "Start Free" : "Get Started"}
      </Link>
    </div>
  );
}

function DesktopComingSoonCard({ billing }: { billing: "yearly" | "monthly" }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const displayPrice =
    billing === "monthly"
      ? Math.round(PLANS.desktop.price * 1.3 * 100) / 100
      : PLANS.desktop.price;

  function handleNotify(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    // Store in localStorage for now, will connect to backend later
    const existing = JSON.parse(localStorage.getItem("justwrite_desktop_waitlist") || "[]");
    existing.push({ email: email.trim(), date: new Date().toISOString() });
    localStorage.setItem("justwrite_desktop_waitlist", JSON.stringify(existing));
    setSubmitted(true);
  }

  return (
    <div className="relative rounded-lg border border-border bg-bg-card/80 p-8 flex flex-col card-elevated">
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-text-dim text-white text-xs font-bold px-3 py-1 rounded-full">
        COMING SOON
      </div>
      <h3 className="font-mono text-xl mb-2">{PLANS.desktop.name}</h3>
      <div className="mb-6">
        <span className="text-3xl font-bold">&euro;{displayPrice}</span>
        <span className="text-text-muted">/mo</span>
        {billing === "yearly" && (
          <div className="text-xs text-text-dim mt-1">billed yearly</div>
        )}
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {PLANS.desktop.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-text-dim">
            <span className="text-text-dim mt-0.5">&#10003;</span>
            {feature}
          </li>
        ))}
      </ul>
      {submitted ? (
        <div className="text-center py-3 px-6 rounded bg-bg-input border border-border">
          <p className="text-success font-mono text-sm">You&apos;re on the list!</p>
          <p className="text-text-dim text-xs mt-1">We&apos;ll email you when it&apos;s ready.</p>
        </div>
      ) : (
        <form onSubmit={handleNotify} className="flex flex-col gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full bg-bg-input border border-border rounded px-3 py-2.5 text-text font-mono text-sm focus:border-accent focus:outline-none transition-colors text-center"
          />
          <button
            type="submit"
            className="w-full border border-border py-2.5 rounded font-mono text-sm hover:border-accent hover:text-accent transition-colors"
          >
            Notify Me
          </button>
        </form>
      )}
    </div>
  );
}

function PricingSection() {
  const [billing, setBilling] = useState<"yearly" | "monthly">("yearly");

  return (
    <section id="pricing" className="px-6 py-36 max-w-5xl mx-auto" aria-label="Pricing">
      <h2 className="text-3xl md:text-4xl font-serif text-center mb-6">
        Simple pricing
      </h2>
      <p className="text-text-muted text-center mb-10 max-w-md mx-auto leading-relaxed">
        Start for free. Upgrade when you&apos;re ready to commit.
      </p>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-4 mb-20">
        <span
          className={`text-sm font-mono cursor-pointer transition-colors ${
            billing === "yearly" ? "text-accent" : "text-text-dim"
          }`}
          onClick={() => setBilling("yearly")}
        >
          Yearly
        </span>
        <button
          onClick={() => setBilling(billing === "yearly" ? "monthly" : "yearly")}
          className="relative w-14 h-7 rounded-full border border-border bg-bg-input transition-colors"
          aria-label="Toggle billing period"
        >
          <div
            className={`absolute top-0.5 w-6 h-6 rounded-full bg-accent transition-all duration-200 ${
              billing === "monthly" ? "left-7" : "left-0.5"
            }`}
          />
        </button>
        <span
          className={`text-sm font-mono cursor-pointer transition-colors ${
            billing === "monthly" ? "text-accent" : "text-text-dim"
          }`}
          onClick={() => setBilling("monthly")}
        >
          Monthly
        </span>
        {billing === "yearly" && (
          <span className="text-xs font-mono text-success bg-success/10 px-2 py-1 rounded">
            Save 30%
          </span>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-10 items-start">
        <PricingCard plan={PLANS.free} type="free" billing={billing} />
        <PricingCard plan={PLANS.cloud} type="cloud" popular billing={billing} />
        <DesktopComingSoonCard billing={billing} />
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg paper-texture">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-6 max-w-5xl mx-auto" aria-label="Main navigation">
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
            className="bg-accent text-white px-4 py-2 rounded text-sm font-mono hover:bg-accent-hover transition-colors"
          >
            Start Writing
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="px-6 py-36 md:py-52 max-w-3xl mx-auto text-center fade-in" aria-label="Hero">
          <h1 className="text-4xl md:text-6xl font-serif leading-tight mb-10">
            Take back your{" "}
            <TypingEffect words={["focus", "attention", "flow", "clarity", "time"]} />
            <br />
            and start writing.
          </h1>
          <p className="text-text-muted text-lg md:text-xl mx-auto mb-6 leading-relaxed">
            Every app fights for your attention. JustWrite protects it.
            Go fullscreen, set a timer, and write without distractions.
          </p>
          <p className="text-text-dim text-base mx-auto mb-14 leading-relaxed">
            No AI writing for you. No fancy formatting. No notifications.
            Just a blank page and your uninterrupted thoughts.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="bg-accent text-white px-8 py-4 rounded font-mono text-lg hover:bg-accent-hover transition-colors pulse-glow"
            >
              Start Focusing — It&apos;s Free
            </Link>
            <Link
              href="#how-it-works"
              className="border border-border px-8 py-4 rounded font-mono text-lg hover:border-accent hover:text-accent transition-colors"
            >
              How It Works
            </Link>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-3xl mx-auto px-6"><div className="border-t border-border/50" /></div>

        {/* Use-case showcase */}
        <section className="px-6 py-36 max-w-3xl mx-auto text-center" aria-label="Use cases">
          <h2 className="text-3xl md:text-4xl font-serif mb-6">
            Start{" "}
            <TypingEffect words={["journaling", "your novel", "brainstorming", "your thesis", "morning pages", "your memoir"]} />
          </h2>
          <p className="text-text-muted text-lg leading-relaxed mb-16">
            Whatever you need to write, JustWrite gets you in the zone.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[
              { label: "Daily journal", icon: "01" },
              { label: "Novel / book", icon: "02" },
              { label: "Brainstorming", icon: "03" },
              { label: "Morning pages", icon: "04" },
              { label: "Thesis / essays", icon: "05" },
              { label: "Free writing", icon: "06" },
            ].map((item) => (
              <div key={item.label} className="border border-border rounded-lg p-6 bg-bg-card card-elevated text-center">
                <div className="font-mono text-accent text-2xl mb-3">{item.icon}</div>
                <div className="font-mono text-sm text-text">{item.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-3xl mx-auto px-6"><div className="border-t border-border/50" /></div>

        {/* How it works */}
        <section id="how-it-works" className="px-6 py-36 max-w-4xl mx-auto" aria-label="How it works">
          <h2 className="text-3xl md:text-4xl font-serif text-center mb-24">
            Three steps. That&apos;s it.
          </h2>
          <div className="grid md:grid-cols-3 gap-20">
            {[
              {
                step: "01",
                title: "Set your timer",
                desc: "Choose how long you want to lock in. 20 minutes is the default. Once you start, there's no going back.",
              },
              {
                step: "02",
                title: "Enter the zone",
                desc: "The app goes fullscreen. No tabs. No notifications. No distractions. Just a blank page, a timer, and your thoughts.",
              },
              {
                step: "03",
                title: "Come out with words",
                desc: "When the timer ends, your session is done. Your words are saved. Do it again tomorrow. Consistency beats motivation.",
              },
            ].map((item) => (
              <article key={item.step} className="text-center">
                <div className="font-mono text-accent text-4xl mb-6">{item.step}</div>
                <h3 className="font-mono text-lg mb-4">{item.title}</h3>
                <p className="text-text-muted text-sm leading-loose">{item.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-3xl mx-auto px-6"><div className="border-t border-border/50" /></div>

        {/* Attention holder */}
        <section className="px-6 py-36 max-w-4xl mx-auto" aria-label="Why JustWrite">
          <div className="grid md:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-serif mb-8 leading-snug">
                Your attention is under attack.
                <br />
                <span className="text-accent">This is your shield.</span>
              </h2>
              <p className="text-text-muted leading-loose mb-6">
                Social media, notifications, infinite feeds &mdash; the modern world is
                an attention-draining machine. Every minute you spend distracted is a
                minute your ideas stay trapped in your head.
              </p>
              <p className="text-text leading-loose font-medium">
                JustWrite locks you in with your own thoughts, blocks everything
                else out, and gives your focus the uninterrupted time it deserves.
              </p>
            </div>
            <div className="border border-border rounded-lg p-10 bg-bg-card card-elevated">
              <div className="space-y-8">
                <div className="flex items-start gap-5">
                  <div className="font-mono text-danger text-xl leading-none mt-1">&times;</div>
                  <div>
                    <div className="font-mono text-sm mb-2 text-text-muted">Attention drainers</div>
                    <p className="text-text-dim text-sm leading-relaxed">Social media, notifications, infinite scroll, clickbait, autoplay videos</p>
                  </div>
                </div>
                <div className="border-t border-border" />
                <div className="flex items-start gap-5">
                  <div className="font-mono text-accent text-xl leading-none mt-1">&#10003;</div>
                  <div>
                    <div className="font-mono text-sm mb-2 text-text">JustWrite &mdash; Attention holder</div>
                    <p className="text-text-muted text-sm leading-relaxed">Fullscreen focus, timed sessions, zero distractions, just you and the page</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-3xl mx-auto px-6"><div className="border-t border-border/50" /></div>

        {/* Deep focus section */}
        <section className="px-6 py-36 max-w-2xl mx-auto text-center" aria-label="Deep focus">
          <h2 className="text-2xl md:text-3xl font-serif mb-10 leading-snug">
            Deep focus is a superpower.
            <br />
            <span className="text-text-muted">Most people have lost it.</span>
          </h2>
          <p className="text-text-muted leading-loose mb-6">
            The average person checks their phone 96 times a day.
            Context-switching kills creativity. Shallow attention produces shallow work.
            The ability to sit with your own thoughts for 20 uninterrupted minutes
            is now a rare competitive advantage.
          </p>
          <p className="text-text-muted leading-loose mb-6">
            You don&apos;t need another productivity app. You don&apos;t need AI
            to think for you. You need a locked room with no exit &mdash; until the timer
            runs out.
          </p>
          <p className="text-text leading-loose font-medium">
            JustWrite removes every distraction and forces you into the deep focus
            state where your best ideas come alive.
          </p>
        </section>

        {/* Divider */}
        <div className="max-w-3xl mx-auto px-6"><div className="border-t border-border/50" /></div>

        {/* Pricing */}
        <PricingSection />

        {/* Divider */}
        <div className="max-w-3xl mx-auto px-6"><div className="border-t border-border/50" /></div>

        {/* Final CTA */}
        <section className="px-6 py-36 max-w-2xl mx-auto text-center" aria-label="Call to action">
          <h2 className="text-3xl md:text-4xl font-serif mb-8">
            Stop scrolling. Start focusing.
          </h2>
          <p className="text-text-muted mb-12 leading-loose">
            Every day you wait is another day of fragmented attention and unfinished ideas.
            Open JustWrite, set the timer, and give your thoughts the space they deserve.
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-accent text-white px-8 py-4 rounded font-mono text-lg hover:bg-accent-hover transition-colors pulse-glow"
          >
            Lock In Now
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-12 max-w-5xl mx-auto mt-8" aria-label="Footer">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="font-mono text-sm text-text-dim">
            <span className="text-accent">Just</span>Write &copy; {new Date().getFullYear()}
          </div>
          <div className="flex gap-8 text-sm text-text-dim font-mono">
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
