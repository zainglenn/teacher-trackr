import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requireAdmin } from "@/lib/adminClient";

export async function PATCH(req: NextRequest) {
  const admin = makeAdminClient();
  const auth = await requireAdmin(req, admin);
  if (auth instanceof NextResponse) return auth;

  const { id, is_lead, class_ids } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { data: existing } = await admin.from("class_assignments").select("school_id").eq("id", id).single();
  if (existing?.school_id !== auth.schoolId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Build update payload — only include defined fields
  const updates: Record<string, unknown> = {};
  if (typeof is_lead === "boolean") updates.is_lead = is_lead;
  if (Array.isArray(class_ids)) updates.class_ids = class_ids;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("class_assignments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ assignment: data });
}

// POST — create a new class assignment (teacher → subject + grade + classes)
export async function POST(req: NextRequest) {
  const admin = makeAdminClient();
  const auth = await requireAdmin(req, admin);
  if (auth instanceof NextResponse) return auth;

  const { teacher_id, subject_id, grade_level_id, class_ids = [] } = await req.json();
  if (!teacher_id || !subject_id || !grade_level_id) {
    return NextResponse.json({ error: "teacher_id, subject_id, grade_level_id required" }, { status: 400 });
  }

  // Upsert — if assignment already exists update it, else create
  const { data, error } = await admin
    .from("class_assignments")
    .upsert(
      { teacher_id, subject_id, grade_level_id, school_id: auth.schoolId, class_ids, is_lead: false },
      { onConflict: "teacher_id,subject_id,grade_level_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ assignment: data });
}
