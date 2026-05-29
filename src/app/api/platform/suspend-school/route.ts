import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
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

  const { schoolId } = await req.json() as { schoolId: string };
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  const { error } = await admin.from("schools").update({ is_active: false }).eq("id", schoolId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
