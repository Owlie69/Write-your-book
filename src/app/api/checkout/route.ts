import { NextRequest, NextResponse } from "next/server";

// Stripe checkout scaffold
// To activate: npm install stripe, then add your keys to .env.local

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json();

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === "your-stripe-secret-key") {
      return NextResponse.json(
        { error: "Stripe is not configured yet. Add your keys to .env.local" },
        { status: 503 }
      );
    }

    // When Stripe is configured, uncomment and use:
    /*
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    const priceId = plan === 'cloud'
      ? process.env.NEXT_PUBLIC_STRIPE_CLOUD_PRICE_ID
      : process.env.NEXT_PUBLIC_STRIPE_DESKTOP_PRICE_ID;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    });

    return NextResponse.json({ url: session.url });
    */

    return NextResponse.json(
      { error: `Checkout for ${plan} plan — Stripe not yet configured` },
      { status: 503 }
    );
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
