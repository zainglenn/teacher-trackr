import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requireAdmin } from "@/lib/adminClient";

export async function GET(req: NextRequest) {
  const admin = makeAdminClient();
  const auth = await requireAdmin(req, admin);
  if (auth instanceof NextResponse) return auth;
  if (!auth.schoolId) return NextResponse.json({ school_curricula: [] });

  const url = new URL(req.url);
  const subject_id = url.searchParams.get("subject_id");
  const grade_level_id = url.searchParams.get("grade_level_id");

  let query = admin
    .from("school_curricula")
    .select("*, standard_set:standard_sets(*)")
    .eq("school_id", auth.schoolId);

  if (subject_id) query = query.eq("subject_id", subject_id);
  if (grade_level_id) query = query.eq("grade_level_id", grade_level_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ school_curricula: data });
}

export async function POST(req: NextRequest) {
  const admin = makeAdminClient();
  const auth = await requireAdmin(req, admin);
  if (auth instanceof NextResponse) return auth;
  if (!auth.schoolId) return NextResponse.json({ error: "No school" }, { status: 400 });

  const { standard_set_id, subject_id, grade_level_id } = await req.json();
  if (!standard_set_id || !subject_id || !grade_level_id) {
    return NextResponse.json({ error: "standard_set_id, subject_id, grade_level_id required" }, { status: 400 });
  }

  // Upsert — replace existing assignment for this subject+grade
  const { data, error } = await admin
    .from("school_curricula")
    .upsert(
      { school_id: auth.schoolId, standard_set_id, subject_id, grade_level_id },
      { onConflict: "school_id,subject_id,grade_level_id" }
    )
    .select("*, standard_set:standard_sets(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ school_curriculum: data });
}

export async function DELETE(req: NextRequest) {
  const admin = makeAdminClient();
  const auth = await requireAdmin(req, admin);
  if (auth instanceof NextResponse) return auth;
  if (!auth.schoolId) return NextResponse.json({ error: "No school" }, { status: 400 });

  const { subject_id, grade_level_id } = await req.json();
  const { error } = await admin
    .from("school_curricula")
    .delete()
    .eq("school_id", auth.schoolId)
    .eq("subject_id", subject_id)
    .eq("grade_level_id", grade_level_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
