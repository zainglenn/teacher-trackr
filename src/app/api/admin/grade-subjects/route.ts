import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requireAdmin } from "@/lib/adminClient";

// GET /api/admin/grade-subjects?grade_level_id=X  — subjects for a grade
export async function GET(req: NextRequest) {
  const admin = makeAdminClient();
  const result = await requireAdmin(req, admin);
  if (result instanceof NextResponse) return result;
  const { schoolId } = result;

  const gradeId = req.nextUrl.searchParams.get("grade_level_id");

  let query = admin
    .from("grade_subjects")
    .select("id, grade_level_id, subject_id, subjects:subject_id(id, name, slot)")
    .eq("school_id", schoolId ?? "")
    .order("created_at");

  if (gradeId) query = query.eq("grade_level_id", gradeId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ grade_subjects: data ?? [] });
}

// POST /api/admin/grade-subjects — add subject to grade
export async function POST(req: NextRequest) {
  const admin = makeAdminClient();
  const result = await requireAdmin(req, admin);
  if (result instanceof NextResponse) return result;
  const { schoolId } = result;

  const { grade_level_id, subject_id } = await req.json();
  if (!grade_level_id || !subject_id) {
    return NextResponse.json({ error: "grade_level_id and subject_id required" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("grade_subjects")
    .insert({ school_id: schoolId, grade_level_id, subject_id })
    .select("id, grade_level_id, subject_id, subjects:subject_id(id, name, slot)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ grade_subject: data });
}

// DELETE /api/admin/grade-subjects — remove subject from grade
export async function DELETE(req: NextRequest) {
  const admin = makeAdminClient();
  const result = await requireAdmin(req, admin);
  if (result instanceof NextResponse) return result;
  const { schoolId } = result;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await admin
    .from("grade_subjects")
    .delete()
    .eq("id", id)
    .eq("school_id", schoolId ?? "");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
