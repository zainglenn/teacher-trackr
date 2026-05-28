import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requireAdmin } from "@/lib/adminClient";

export async function POST(req: NextRequest) {
  const admin = makeAdminClient();
  const auth = await requireAdmin(req, admin);
  if (auth instanceof NextResponse) return auth;

  const { name, subject_id, grade_level_id, school_id } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!subject_id) return NextResponse.json({ error: "subject_id is required" }, { status: 400 });
  if (!grade_level_id) return NextResponse.json({ error: "grade_level_id is required" }, { status: 400 });

  const { data, error } = await admin
    .from("standard_sets")
    .insert({ name: name.trim(), subject_id, grade_level_id, school_id: school_id ?? null })
    .select("*, subject:subjects(*), grade_level:grade_levels(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ standard_set: data });
}
