import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requireAdmin } from "@/lib/adminClient";

export async function DELETE(req: NextRequest) {
  const admin = makeAdminClient();
  const auth = await requireAdmin(req, admin);
  if (auth instanceof NextResponse) return auth;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { data: gradeLevel } = await admin.from("grade_levels").select("school_id").eq("id", id).single();
  if (gradeLevel?.school_id !== auth.schoolId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await admin.from("grade_levels").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
