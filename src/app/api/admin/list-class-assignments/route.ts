import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requireAdmin } from "@/lib/adminClient";

export async function GET(req: NextRequest) {
  const admin = makeAdminClient();
  const auth = await requireAdmin(req, admin);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const subject_id = url.searchParams.get("subject_id");
  const grade_level_id = url.searchParams.get("grade_level_id");

  let query = admin
    .from("class_assignments")
    .select("*, teacher:profiles(id, full_name, username, role), subject:subjects(*), grade_level:grade_levels(*)")
    .order("created_at", { ascending: true });

  if (subject_id) query = query.eq("subject_id", subject_id);
  if (grade_level_id) query = query.eq("grade_level_id", grade_level_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignments: data });
}
