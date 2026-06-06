import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requireAdmin } from "@/lib/adminClient";

export async function GET(req: NextRequest) {
  const admin = makeAdminClient();
  const result = await requireAdmin(req, admin);
  if (result instanceof NextResponse) return result;
  const { schoolId } = result;

  let query = admin
    .from("profiles")
    .select("id, email, username, full_name, role, notification_email, created_at, subject_id, school_id, subjects:subject_id(id, name, slot)")
    .not("role", "eq", "platform_admin")
    .order("created_at", { ascending: true });

  if (schoolId) query = query.eq("school_id", schoolId);

  const { data } = await query;
  return NextResponse.json({ users: data ?? [] });
}
