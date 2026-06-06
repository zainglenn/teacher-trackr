import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requireAdmin } from "@/lib/adminClient";

export async function POST(req: NextRequest) {
  const admin = makeAdminClient();
  const result = await requireAdmin(req, admin);
  if (result instanceof NextResponse) return result;
  const { schoolId } = result;

  const { userId, newPassword } = await req.json();
  if (!userId || !newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: "userId and newPassword (min 6 chars) required" }, { status: 400 });
  }

  // Verify target user belongs to the caller's school
  const { data: target } = await admin
    .from("profiles")
    .select("school_id, role")
    .eq("id", userId)
    .single();

  if (!target || target.school_id !== schoolId) {
    return NextResponse.json({ error: "User not found in this school" }, { status: 404 });
  }

  // Platform admin cannot reset another platform admin's password
  if (target.role === "platform_admin") {
    return NextResponse.json({ error: "Cannot reset platform admin password" }, { status: 403 });
  }

  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
