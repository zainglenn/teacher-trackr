import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requirePlatformAdmin } from "@/lib/adminClient";

const VALID_STRANDS = ["RL", "RI", "W", "SL", "L"];

export async function GET(req: NextRequest) {
  const admin = makeAdminClient();
  const auth = await requirePlatformAdmin(req, admin);
  if (auth instanceof NextResponse) return auth;

  const standard_set_id = new URL(req.url).searchParams.get("standard_set_id");
  if (!standard_set_id) return NextResponse.json({ error: "standard_set_id required" }, { status: 400 });

  const { data, error } = await admin
    .from("standards")
    .select("*")
    .eq("standard_set_id", standard_set_id)
    .order("code");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ standards: data });
}

export async function POST(req: NextRequest) {
  const admin = makeAdminClient();
  const auth = await requirePlatformAdmin(req, admin);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();

  // Bulk insert
  if (Array.isArray(body.standards)) {
    const { standard_set_id, standards } = body;
    if (!standard_set_id) return NextResponse.json({ error: "standard_set_id required" }, { status: 400 });
    const rows = standards.map((s: { code: string; strand: string; description: string }) => ({
      code: s.code.trim(),
      strand: s.strand,
      description: s.description.trim(),
      standard_set_id,
    }));
    const { data, error } = await admin.from("standards").insert(rows).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ standards: data });
  }

  // Single insert
  const { code, strand, description, standard_set_id } = body;
  if (!code?.trim()) return NextResponse.json({ error: "code is required" }, { status: 400 });
  if (!strand || !VALID_STRANDS.includes(strand)) return NextResponse.json({ error: "invalid strand" }, { status: 400 });
  if (!description?.trim()) return NextResponse.json({ error: "description is required" }, { status: 400 });

  const { data, error } = await admin
    .from("standards")
    .insert({ code: code.trim(), strand, description: description.trim(), standard_set_id: standard_set_id ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ standard: data });
}

export async function DELETE(req: NextRequest) {
  const admin = makeAdminClient();
  const auth = await requirePlatformAdmin(req, admin);
  if (auth instanceof NextResponse) return auth;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await admin.from("standards").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
