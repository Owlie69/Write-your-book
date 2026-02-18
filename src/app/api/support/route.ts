import { NextRequest, NextResponse } from "next/server";

// ============================================================
// CONFIGURATION: Change the email address below to receive
// support messages. This is the only place you need to update.
// ============================================================
const SUPPORT_EMAIL = "support@justwrite.app";

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json();

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Option 1: Send via Resend (if configured)
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (resendKey && fromEmail && resendKey !== "your-resend-api-key") {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: SUPPORT_EMAIL,
          subject: `[JustWrite Support] Message from ${name}`,
          reply_to: email,
          html: `
            <div style="font-family: 'Courier New', monospace; max-width: 600px; margin: 0 auto; padding: 32px; background: #f5f3f0; border-radius: 8px;">
              <h2 style="color: #c8a87c; margin-bottom: 24px;">New Support Message</h2>
              <p><strong>From:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <hr style="border: none; border-top: 1px solid #d4ccc1; margin: 16px 0;" />
              <p style="white-space: pre-wrap; line-height: 1.8;">${message}</p>
            </div>
          `,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error("Resend error:", data);
        return NextResponse.json(
          { error: "Failed to send message" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // Option 2: Store in Supabase (if configured, no Resend)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (
      supabaseUrl &&
      supabaseKey &&
      supabaseUrl !== "your-supabase-url" &&
      supabaseKey !== "your-supabase-service-role-key"
    ) {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error } = await supabase.from("support_messages").insert({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });

      if (error) {
        console.error("Supabase error:", error);
        return NextResponse.json(
          { error: "Failed to save message" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // Option 3: No backend configured — log to console
    console.log("=== SUPPORT MESSAGE (no email/DB configured) ===");
    console.log(`From: ${name} <${email}>`);
    console.log(`Message: ${message}`);
    console.log("================================================");

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
