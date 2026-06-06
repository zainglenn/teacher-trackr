import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requirePlatformAdmin } from "@/lib/adminClient";

interface StandardInput {
  code: string;
  strand: string;
  description: string;
}

export async function POST(req: NextRequest) {
  const admin = makeAdminClient();
  const auth = await requirePlatformAdmin(req, admin);
  if (auth instanceof NextResponse) return auth;

  const { standard_set_id, standards } = await req.json() as {
    standard_set_id: string;
    standards: StandardInput[];
  };

  if (!standard_set_id) return NextResponse.json({ error: "standard_set_id is required" }, { status: 400 });
  if (!Array.isArray(standards) || standards.length === 0) {
    return NextResponse.json({ error: "standards array is required" }, { status: 400 });
  }

  const rows = standards
    .filter(s => s.code?.trim() && s.strand?.trim() && s.description?.trim())
    .map(s => ({
      code: s.code.trim(),
      strand: s.strand.trim(),
      description: s.description.trim(),
      standard_set_id,
    }));

  if (rows.length === 0) return NextResponse.json({ error: "No valid standards to insert" }, { status: 400 });

  const { error } = await admin.from("standards").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inserted: rows.length });
}
