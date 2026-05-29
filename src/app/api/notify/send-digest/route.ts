import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// POST /api/notify/send-digest
// Body: { recipientId: string }  — sends a notification digest to one user
// Called manually or by a cron job. Requires RESEND_API_KEY env var.

export async function POST(req: NextRequest) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recipientId } = await req.json() as { recipientId: string };

  // Get recipient profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, notification_email, role")
    .eq("id", recipientId)
    .single();

  if (!profile?.notification_email) {
    return NextResponse.json({ error: "No notification email configured for this user" }, { status: 400 });
  }

  // Get their pending notifications from plans
  const { data: plans } = await supabase
    .from("long_term_plans")
    .select(`
      id, title,
      units:ltp_units(id, title, status, submitted_at, reviewed_at, rejection_reason, hod_feedback)
    `)
    .in("id", (await supabase
      .from("ltp_members")
      .select("plan_id")
      .eq("teacher_id", recipientId)
      .then((r) => (r.data ?? []).map((m) => m.plan_id))
    ));

  const items: string[] = [];

  for (const plan of plans ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const unit of (plan.units as any[]) ?? []) {
      if (unit.status === "revision") {
        const days = Math.floor((Date.now() - new Date(unit.reviewed_at).getTime()) / 86400000);
        items.push(`• <strong>${unit.title}</strong> — revision requested ${days} day${days !== 1 ? "s" : ""} ago. <em>${unit.hod_feedback ?? ""}</em>`);
      }
      if (unit.status === "rejected") {
        items.push(`• <strong>${unit.title}</strong> — rejected by HOD. <em>${unit.rejection_reason ?? ""}</em>`);
      }
    }
  }

  if (items.length === 0) {
    return NextResponse.json({ skipped: true, reason: "No actionable notifications" });
  }

  const resend = new Resend(resendKey);
  const name = profile.full_name ?? "there";

  const { data, error } = await resend.emails.send({
    from: "Curriculum Tracker <notifications@curriculumtracker.app>",
    to: profile.notification_email,
    subject: `${items.length} item${items.length !== 1 ? "s" : ""} need${items.length === 1 ? "s" : ""} your attention`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 8px;">Hi ${name},</h2>
        <p style="color: #6b7280; margin: 0 0 20px;">Here's what needs your attention in Curriculum Tracker:</p>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
          ${items.map((i) => `<p style="margin: 0 0 12px; font-size: 14px; line-height: 1.5;">${i}</p>`).join("")}
        </div>
        <p style="margin: 20px 0 0; font-size: 13px; color: #9ca3af;">
          <a href="https://curriculum-tracker-five.vercel.app" style="color: #6366f1;">Open Curriculum Tracker →</a>
        </p>
      </div>
    `,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sent: true, emailId: data?.id });
}
