import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Rate limit: 10 reminder requests per 15 minutes per IP
const RATE_LIMIT = { windowMs: 15 * 60 * 1000, maxRequests: 10 };

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

// POST — Schedule a new reminder
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(req);
    const rl = checkRateLimit(`reminder:${ip}`, RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    const { email, userId, fileId, fileTitle, sessionDate, sessionTime } =
      await req.json();

    if (!email || !sessionDate || !sessionTime) {
      return NextResponse.json(
        { error: "Email, date, and time are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured. Reminder saved locally only." },
        { status: 503 }
      );
    }

    const { error } = await supabase.from("reminders").insert({
      user_id: userId,
      email,
      file_id: fileId || null,
      file_title: fileTitle || null,
      session_date: sessionDate,
      session_time: sessionTime,
      reminder_sent: false,
    });

    if (error) {
      console.error("Error saving reminder:", error);
      return NextResponse.json(
        { error: "Failed to save reminder" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reminder error:", error);
    return NextResponse.json(
      { error: "Failed to schedule reminder" },
      { status: 500 }
    );
  }
}
