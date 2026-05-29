import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const token = req.headers.get("authorization")?.replace(/^[Bb]earer /, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: caller } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (caller?.role !== "platform_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: schools, error } = await admin
    .from("schools")
    .select("id, name, city, country, curriculum, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get user counts per school
  const { data: userCounts } = await admin
    .from("profiles")
    .select("school_id")
    .not("school_id", "is", null);

  const countMap: Record<string, number> = {};
  for (const row of userCounts ?? []) {
    if (row.school_id) countMap[row.school_id] = (countMap[row.school_id] ?? 0) + 1;
  }

  const result = (schools ?? []).map((s) => ({
    ...s,
    user_count: countMap[s.id] ?? 0,
  }));

  return NextResponse.json({ schools: result });
}
