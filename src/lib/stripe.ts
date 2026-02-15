// Stripe integration scaffold
// To activate: add your Stripe keys to .env.local

export function isStripeConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY !==
      "your-stripe-publishable-key"
  );
}

// Client-side: redirect to Stripe Checkout
export async function createCheckoutSession(
  plan: "cloud" | "desktop"
): Promise<string | null> {
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    return data.url || null;
  } catch (error) {
    console.error("Checkout error:", error);
    return null;
  }
}

// Client-side: redirect to billing portal
export async function createPortalSession(): Promise<string | null> {
  try {
    const res = await fetch("/api/portal", {
      method: "POST",
    });
    const data = await res.json();
    return data.url || null;
  } catch (error) {
    console.error("Portal error:", error);
    return null;
  }
}
