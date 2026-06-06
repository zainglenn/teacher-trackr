import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requireAdmin } from "@/lib/adminClient";

export async function GET(req: NextRequest) {
  const admin = makeAdminClient();
  const auth = await requireAdmin(req, admin);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const subject_label = url.searchParams.get("subject_label");
  const grade_label = url.searchParams.get("grade_label");

  let query = admin
    .from("standard_sets")
    .select("*")
    .order("subject_label", { ascending: true })
    .order("grade_label", { ascending: true });

  if (subject_label) query = query.eq("subject_label", subject_label);
  if (grade_label) query = query.eq("grade_label", grade_label);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ standard_sets: data });
}
