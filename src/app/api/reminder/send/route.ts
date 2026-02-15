import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (
    !url ||
    !key ||
    url === "your-supabase-url" ||
    key === "your-supabase-service-role-key"
  )
    return null;
  return createClient(url, key);
}

// GET — Called by cron job every morning to send today's reminders
// Protect with a secret: /api/reminder/send?secret=YOUR_CRON_SECRET
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Not configured" },
      { status: 503 }
    );
  }

  const today = new Date().toISOString().split("T")[0];

  // Get all unsent reminders for today
  const { data: reminders, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("session_date", today)
    .eq("reminder_sent", false);

  if (error) {
    console.error("Error fetching reminders:", error);
    return NextResponse.json(
      { error: "Failed to fetch reminders" },
      { status: 500 }
    );
  }

  if (!reminders || reminders.length === 0) {
    return NextResponse.json({ sent: 0, message: "No reminders for today" });
  }

  let sentCount = 0;

  for (const reminder of reminders) {
    const sent = await sendReminderEmail(reminder);
    if (sent) {
      // Mark as sent
      await supabase
        .from("reminders")
        .update({ reminder_sent: true })
        .eq("id", reminder.id);
      sentCount++;
    }
  }

  return NextResponse.json({ sent: sentCount, total: reminders.length });
}

interface Reminder {
  id: string;
  email: string;
  file_title: string | null;
  session_date: string;
  session_time: string;
}

async function sendReminderEmail(reminder: Reminder): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;

  // Format the time nicely
  const timeParts = reminder.session_time.split(":");
  const hours = parseInt(timeParts[0]);
  const minutes = timeParts[1];
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const timeStr = `${displayHours}:${minutes} ${ampm}`;

  const fileStr = reminder.file_title
    ? ` on "${reminder.file_title}"`
    : "";

  const subject = `Don't forget: writing session today at ${timeStr}`;
  const htmlBody = `
    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; background: #1e1c1a; color: #e8e0d6;">
      <h1 style="font-family: 'Courier New', monospace; font-size: 20px; margin-bottom: 8px;">
        <span style="color: #c8a87c;">Just</span>Write
      </h1>
      <hr style="border: none; border-top: 1px solid #3a3530; margin: 20px 0;" />
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
        Hey,
      </p>
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
        You&rsquo;ve got a writing session scheduled for <strong style="color: #c8a87c;">${timeStr}</strong> today${fileStr}.
      </p>
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        Don&rsquo;t overthink it. Don&rsquo;t push it to tomorrow. Open JustWrite, set the timer, and put words on the page. That&rsquo;s how books get finished.
      </p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard"
         style="display: inline-block; background: #c8a87c; color: #1a1a1a; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-family: 'Courier New', monospace; font-size: 14px;">
        Open JustWrite
      </a>
      <hr style="border: none; border-top: 1px solid #3a3530; margin: 32px 0 16px;" />
      <p style="font-size: 12px; color: #6b6460; font-family: 'Courier New', monospace;">
        &ldquo;A professional writer is an amateur who didn&rsquo;t quit.&rdquo;
      </p>
    </div>
  `;

  // ---- Send via Resend ----
  if (resendKey && resendKey !== "your-resend-api-key") {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || "JustWrite <noreply@justwrite.app>",
          to: [reminder.email],
          subject,
          html: htmlBody,
        }),
      });

      if (res.ok) return true;

      const err = await res.json();
      console.error("Resend error:", err);
      return false;
    } catch (err) {
      console.error("Email send error:", err);
      return false;
    }
  }

  // No email provider configured — log instead
  console.log(`[REMINDER] Would send to ${reminder.email}: ${subject}`);
  return true; // Mark as "sent" so it doesn't retry forever
}
