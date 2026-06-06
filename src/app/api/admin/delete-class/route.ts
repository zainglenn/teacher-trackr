import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requireAdmin } from "@/lib/adminClient";

export async function DELETE(req: NextRequest) {
  const admin = makeAdminClient();
  const result = await requireAdmin(req, admin);
  if (result instanceof NextResponse) return result;
  const { schoolId } = result;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Verify the class belongs to a teacher in this school
  const { data: cls } = await admin
    .from("classes")
    .select("teacher_id, profiles!inner(school_id)")
    .eq("id", id)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!cls || (cls as any).profiles?.school_id !== schoolId) {
    return NextResponse.json({ error: "Class not found in this school" }, { status: 404 });
  }

  const { error } = await admin.from("classes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
