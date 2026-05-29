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

  const schoolId = req.nextUrl.searchParams.get("schoolId");
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  const [{ data: school }, { data: profiles }, { data: plans }] = await Promise.all([
    admin.from("schools").select("id, name, is_active, created_at, city, country, curriculum").eq("id", schoolId).single(),
    admin.from("profiles").select("id, full_name, username, role, created_at").eq("school_id", schoolId).order("created_at"),
    admin.from("long_term_plans").select("id, updated_at").eq("school_id", schoolId),
  ]);

  const lastActivity = plans?.length
    ? plans.reduce((latest, p) => p.updated_at > latest ? p.updated_at : latest, plans[0].updated_at)
    : null;

  return NextResponse.json({
    school,
    profiles: profiles ?? [],
    stats: {
      userCount: profiles?.length ?? 0,
      planCount: plans?.length ?? 0,
      lastActivity,
    },
  });
}
