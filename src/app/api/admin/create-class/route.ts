import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requireAdmin } from "@/lib/adminClient";

export async function POST(req: NextRequest) {
  const admin = makeAdminClient();
  const result = await requireAdmin(req, admin);
  if (result instanceof NextResponse) return result;
  const { schoolId } = result;

  const { name, grade_level_id, teacher_id } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  // Classes must be linked to a grade (new model) or teacher (legacy)
  if (!grade_level_id && !teacher_id) {
    return NextResponse.json({ error: "grade_level_id required" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("classes")
    .insert({
      name: name.trim(),
      school_id: schoolId,
      grade_level_id: grade_level_id ?? null,
      teacher_id: teacher_id ?? null,
      school_year: new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ class: data });
}
