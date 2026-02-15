import { NextResponse } from "next/server";

// Stripe customer portal scaffold

export async function POST() {
  try {
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === "your-stripe-secret-key") {
      return NextResponse.json(
        { error: "Stripe is not configured yet" },
        { status: 503 }
      );
    }

    // When Stripe is configured:
    /*
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId, // get from your database
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
    */

    return NextResponse.json(
      { error: "Billing portal — Stripe not yet configured" },
      { status: 503 }
    );
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
