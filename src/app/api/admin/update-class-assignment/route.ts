import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requireAdmin } from "@/lib/adminClient";

export async function PATCH(req: NextRequest) {
  const admin = makeAdminClient();
  const auth = await requireAdmin(req, admin);
  if (auth instanceof NextResponse) return auth;

  const { id, is_lead } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  if (typeof is_lead !== "boolean") return NextResponse.json({ error: "is_lead (boolean) is required" }, { status: 400 });

  const { data, error } = await admin
    .from("class_assignments")
    .update({ is_lead })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ assignment: data });
}
