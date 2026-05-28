import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requireAdmin } from "@/lib/adminClient";

export async function POST(req: NextRequest) {
  const admin = makeAdminClient();
  const auth = await requireAdmin(req, admin);
  if (auth instanceof NextResponse) return auth;

  const { teacher_id, subject_id, grade_level_id, is_lead, school_id } = await req.json();
  if (!teacher_id) return NextResponse.json({ error: "teacher_id is required" }, { status: 400 });
  if (!subject_id) return NextResponse.json({ error: "subject_id is required" }, { status: 400 });
  if (!grade_level_id) return NextResponse.json({ error: "grade_level_id is required" }, { status: 400 });

  const { data, error } = await admin
    .from("class_assignments")
    .insert({
      teacher_id,
      subject_id,
      grade_level_id,
      is_lead: is_lead ?? false,
      school_id: school_id ?? null,
    })
    .select("*, teacher:profiles(id, full_name, username), subject:subjects(*), grade_level:grade_levels(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ assignment: data });
}
