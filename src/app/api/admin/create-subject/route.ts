import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requireAdmin } from "@/lib/adminClient";

export async function POST(req: NextRequest) {
  const admin = makeAdminClient();
  const auth = await requireAdmin(req, admin);
  if (auth instanceof NextResponse) return auth;

  const { name, slot } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!slot || slot < 1 || slot > 11) return NextResponse.json({ error: "slot must be 1–11" }, { status: 400 });

  const { data, error } = await admin
    .from("subjects")
    .insert({ name: name.trim(), slot, school_id: auth.schoolId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ subject: data });
}
