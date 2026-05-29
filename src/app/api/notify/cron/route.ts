import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// GET /api/notify/cron
// Triggered by Vercel cron (see vercel.json). Protected by CRON_SECRET.
// Sends a digest to every user who has notification_email set and has pending items.

const DAY_MS = 1000 * 60 * 60 * 24;

export async function GET(req: NextRequest) {
  // Vercel passes the cron secret as Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // All users with a notification email
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, notification_email, role")
    .not("notification_email", "is", null);

  const resend = new Resend(resendKey);
  const results: { userId: string; sent: boolean; skipped?: boolean }[] = [];

  for (const profile of profiles ?? []) {
    if (!profile.notification_email) continue;

    // Fetch their plan memberships
    const { data: memberRows } = await supabase
      .from("ltp_members")
      .select("plan_id")
      .eq("teacher_id", profile.id);

    const planIds = (memberRows ?? []).map((m) => m.plan_id);
    if (!planIds.length) { results.push({ userId: profile.id, skipped: true, sent: false }); continue; }

    const { data: plans } = await supabase
      .from("long_term_plans")
      .select("id, title, units:ltp_units(id, title, status, submitted_at, reviewed_at, rejection_reason, hod_feedback)")
      .in("id", planIds);

    const items: string[] = [];
    const now = Date.now();

    for (const plan of plans ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const unit of (plan.units as any[]) ?? []) {
        if (unit.status === "revision" && unit.reviewed_at) {
          const days = Math.floor((now - new Date(unit.reviewed_at).getTime()) / DAY_MS);
          if (days >= 3) {
            items.push(`<li style="margin-bottom:10px"><strong>${unit.title}</strong> — revision requested ${days} day${days !== 1 ? "s" : ""} ago.<br><span style="color:#6b7280">${unit.hod_feedback ?? ""}</span></li>`);
          }
        }
        if (unit.status === "rejected") {
          items.push(`<li style="margin-bottom:10px"><strong>${unit.title}</strong> — rejected by HOD.<br><span style="color:#6b7280">${unit.rejection_reason ?? ""}</span></li>`);
        }
        // HOD: submitted and waiting 5+ days
        if (profile.role === "hod" && unit.status === "submitted" && unit.submitted_at) {
          const days = Math.floor((now - new Date(unit.submitted_at).getTime()) / DAY_MS);
          if (days >= 5) {
            items.push(`<li style="margin-bottom:10px"><strong>${unit.title}</strong> — submitted ${days} day${days !== 1 ? "s" : ""} ago, awaiting your review.</li>`);
          }
        }
      }
    }

    if (items.length === 0) { results.push({ userId: profile.id, skipped: true, sent: false }); continue; }

    const name = profile.full_name ?? "there";
    const { error } = await resend.emails.send({
      from: "Curriculum Tracker <onboarding@resend.dev>",
      to: profile.notification_email,
      subject: `${items.length} item${items.length !== 1 ? "s" : ""} need${items.length === 1 ? "s" : ""} your attention`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111827">
          <h2 style="font-size:18px;font-weight:600;margin:0 0 8px">Hi ${name},</h2>
          <p style="color:#6b7280;margin:0 0 20px;font-size:14px">Here's what needs your attention in Curriculum Tracker:</p>
          <ul style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 16px 6px 32px;font-size:14px;line-height:1.6">
            ${items.join("")}
          </ul>
          <p style="margin:20px 0 0;font-size:12px;color:#9ca3af">
            <a href="https://curriculum-tracker-five.vercel.app" style="color:#6366f1;text-decoration:none">Open Curriculum Tracker →</a>
          </p>
        </div>
      `,
    });

    results.push({ userId: profile.id, sent: !error, ...(error ? { error: error.message } : {}) });
  }

  const sent = results.filter((r) => r.sent).length;
  const skipped = results.filter((r) => r.skipped).length;
  return NextResponse.json({ sent, skipped, total: results.length });
}
