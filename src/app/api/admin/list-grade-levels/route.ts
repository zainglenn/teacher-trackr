import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requireAdmin } from "@/lib/adminClient";

export async function GET(req: NextRequest) {
  const admin = makeAdminClient();
  const auth = await requireAdmin(req, admin);
  if (auth instanceof NextResponse) return auth;

  let query = admin.from("grade_levels").select("*").order("sort_order", { ascending: true });
  if (auth.schoolId) query = query.eq("school_id", auth.schoolId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ grade_levels: data });
}
