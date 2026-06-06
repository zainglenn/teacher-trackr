import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requirePlatformAdmin } from "@/lib/adminClient";

export async function GET(req: NextRequest) {
  const admin = makeAdminClient();
  const auth = await requirePlatformAdmin(req, admin);
  if (auth instanceof NextResponse) return auth;

  const { data, error } = await admin
    .from("standard_sets")
    .select("*")
    .order("subject_label", { ascending: true })
    .order("grade_label", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ standard_sets: data });
}

export async function POST(req: NextRequest) {
  const admin = makeAdminClient();
  const auth = await requirePlatformAdmin(req, admin);
  if (auth instanceof NextResponse) return auth;

  const { name, subject_label, grade_label } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const { data, error } = await admin
    .from("standard_sets")
    .insert({ name: name.trim(), subject_label: subject_label?.trim() ?? null, grade_label: grade_label?.trim() ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ standard_set: data });
}

export async function DELETE(req: NextRequest) {
  const admin = makeAdminClient();
  const auth = await requirePlatformAdmin(req, admin);
  if (auth instanceof NextResponse) return auth;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await admin.from("standard_sets").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
