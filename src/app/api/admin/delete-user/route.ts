import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requireAdmin } from "@/lib/adminClient";

export async function DELETE(req: NextRequest) {
  const admin = makeAdminClient();
  const result = await requireAdmin(req, admin);
  if (result instanceof NextResponse) return result;
  const { callerId, schoolId } = result;

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  if (userId === callerId) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

  // Verify target belongs to this school
  if (schoolId) {
    const { data: target } = await admin.from("profiles").select("school_id").eq("id", userId).single();
    if (target?.school_id !== schoolId) {
      return NextResponse.json({ error: "User not found in this school" }, { status: 404 });
    }
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
