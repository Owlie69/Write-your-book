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

// POST — Schedule a new reminder
export async function POST(req: NextRequest) {
  try {
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
