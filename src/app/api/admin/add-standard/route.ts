import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requirePlatformAdmin } from "@/lib/adminClient";

const VALID_STRANDS = ["RL", "RI", "W", "SL", "L"];

export async function POST(req: NextRequest) {
  const admin = makeAdminClient();
  const auth = await requirePlatformAdmin(req, admin);
  if (auth instanceof NextResponse) return auth;

  const { code, strand, description, standard_set_id } = await req.json();
  if (!code?.trim()) return NextResponse.json({ error: "code is required" }, { status: 400 });
  if (!strand || !VALID_STRANDS.includes(strand)) {
    return NextResponse.json({ error: `strand must be one of: ${VALID_STRANDS.join(", ")}` }, { status: 400 });
  }
  if (!description?.trim()) return NextResponse.json({ error: "description is required" }, { status: 400 });

  const { data, error } = await admin
    .from("standards")
    .insert({
      code: code.trim(),
      strand,
      description: description.trim(),
      standard_set_id: standard_set_id ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ standard: data });
}
