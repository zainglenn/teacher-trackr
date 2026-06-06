import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requireAdmin } from "@/lib/adminClient";

export async function GET(req: NextRequest) {
  const admin = makeAdminClient();
  const result = await requireAdmin(req, admin);
  if (result instanceof NextResponse) return result;
  const { schoolId } = result;

  const gradeLevelId = req.nextUrl.searchParams.get("grade_level_id");

  // Get all teachers in school for backwards-compat enrichment
  const { data: teachers } = await admin
    .from("profiles")
    .select("id, full_name, username")
    .eq("school_id", schoolId ?? "")
    .in("role", ["teacher", "hod"]);

  let query = admin
    .from("classes")
    .select("*")
    .eq("school_id", schoolId ?? "")
    .order("name");

  if (gradeLevelId) query = query.eq("grade_level_id", gradeLevelId);

  const { data: classes } = await query;

  const teacherMap = new Map((teachers ?? []).map(t => [t.id, t]));
  const enriched = (classes ?? []).map(c => ({
    ...c,
    teacher: c.teacher_id ? (teacherMap.get(c.teacher_id) ?? null) : null,
  }));

  return NextResponse.json({ classes: enriched });
}
