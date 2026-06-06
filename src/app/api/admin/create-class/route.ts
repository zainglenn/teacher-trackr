import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requireAdmin } from "@/lib/adminClient";

export async function POST(req: NextRequest) {
  const admin = makeAdminClient();
  const result = await requireAdmin(req, admin);
  if (result instanceof NextResponse) return result;
  const { schoolId } = result;

  const { teacher_id, name, school_year } = await req.json();
  if (!teacher_id || !name?.trim()) {
    return NextResponse.json({ error: "teacher_id and name required" }, { status: 400 });
  }

  // Verify teacher belongs to this school
  const { data: teacher } = await admin
    .from("profiles")
    .select("school_id, role")
    .eq("id", teacher_id)
    .single();

  if (!teacher || teacher.school_id !== schoolId) {
    return NextResponse.json({ error: "Teacher not found in this school" }, { status: 404 });
  }

  const { data, error } = await admin
    .from("classes")
    .insert({ teacher_id, name: name.trim(), school_year: school_year ?? "2025-2026" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ class: data });
}
