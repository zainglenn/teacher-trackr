import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export function makeAdminClient(): SupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("Service role key not configured");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function requireAdmin(
  req: NextRequest,
  admin: SupabaseClient
): Promise<{ callerId: string; schoolId: string | null } | NextResponse> {
  const token = req.headers.get("authorization")?.replace(/^[Bb]earer /, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await admin
    .from("profiles")
    .select("role, school_id")
    .eq("id", user.id)
    .single();

  // Platform admins can act as school admin by supplying x-school-id header
  if (profile?.role === "platform_admin") {
    const overrideSchoolId = req.headers.get("x-school-id");
    if (!overrideSchoolId) return NextResponse.json({ error: "Forbidden — missing x-school-id" }, { status: 403 });
    return { callerId: user.id, schoolId: overrideSchoolId };
  }

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { callerId: user.id, schoolId: profile.school_id ?? null };
}

export async function requirePlatformAdmin(
  req: NextRequest,
  admin: SupabaseClient
): Promise<{ callerId: string } | NextResponse> {
  const token = req.headers.get("authorization")?.replace(/^[Bb]earer /, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "platform_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return { callerId: user.id };
}
