import { NextRequest, NextResponse } from "next/server";

// Stripe webhook scaffold
// This endpoint handles subscription events from Stripe

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: "Stripe webhooks not configured" },
        { status: 503 }
      );
    }

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    // When Stripe is configured:
    /*
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        // Update user plan in Supabase
        // const userId = session.metadata.userId;
        // const plan = session.metadata.plan;
        // await supabase.from('profiles').update({ plan }).eq('id', userId);
        break;
      }
      case 'customer.subscription.deleted': {
        // Downgrade user to free
        // const customerId = event.data.object.customer;
        // Find user by customerId and set plan to 'free'
        break;
      }
    }
    */

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
