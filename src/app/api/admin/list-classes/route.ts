import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requireAdmin } from "@/lib/adminClient";

export async function GET(req: NextRequest) {
  const admin = makeAdminClient();
  const result = await requireAdmin(req, admin);
  if (result instanceof NextResponse) return result;
  const { schoolId } = result;

  // Get all teachers in this school
  const { data: teachers } = await admin
    .from("profiles")
    .select("id, full_name, username")
    .eq("school_id", schoolId ?? "")
    .in("role", ["teacher", "hod"])
    .order("full_name");

  const teacherIds = (teachers ?? []).map((t) => t.id);
  if (teacherIds.length === 0) return NextResponse.json({ classes: [] });

  // Get all classes owned by those teachers
  const { data: classes } = await admin
    .from("classes")
    .select("*")
    .in("teacher_id", teacherIds)
    .order("name");

  // Attach teacher info
  const teacherMap = new Map((teachers ?? []).map((t) => [t.id, t]));
  const enriched = (classes ?? []).map((c) => ({
    ...c,
    teacher: teacherMap.get(c.teacher_id) ?? null,
  }));

  return NextResponse.json({ classes: enriched });
}
