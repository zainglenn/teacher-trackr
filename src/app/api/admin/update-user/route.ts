import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requireAdmin } from "@/lib/adminClient";

const USERNAME_RE = /^[a-zA-Z0-9._]{2,30}$/;

function toAuthEmail(username: string): string {
  return `${username.toLowerCase()}@ct.app`;
}

export async function PATCH(req: NextRequest) {
  const admin = makeAdminClient();
  const result = await requireAdmin(req, admin);
  if (result instanceof NextResponse) return result;
  const { schoolId } = result;

  const { userId, username, full_name, role, notification_email, subject_id } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  // Verify target belongs to this school
  if (schoolId) {
    const { data: target } = await admin.from("profiles").select("school_id").eq("id", userId).single();
    if (target?.school_id !== schoolId) {
      return NextResponse.json({ error: "User not found in this school" }, { status: 404 });
    }
  }

  if (username !== undefined && !USERNAME_RE.test(username)) {
    return NextResponse.json({ error: "Invalid username format" }, { status: 400 });
  }

  const profileUpdates: Record<string, string | null> = {};
  if (full_name !== undefined) profileUpdates.full_name = full_name;
  if (role !== undefined) profileUpdates.role = role;
  if (notification_email !== undefined) profileUpdates.notification_email = notification_email || null;
  if (subject_id !== undefined) profileUpdates.subject_id = subject_id || null;

  if (username !== undefined) {
    profileUpdates.username = username;
    profileUpdates.email = toAuthEmail(username);
    const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
      email: toAuthEmail(username),
    });
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 });
  }

  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await admin.from("profiles").update(profileUpdates).eq("id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
