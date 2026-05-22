import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json({ error: "Service role key not configured" }, { status: 500 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Verify caller is HOD
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user: caller }, error: callerErr } = await admin.auth.getUser(token);
  if (callerErr || !caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .single();

  if (profile?.role !== "hod") {
    return NextResponse.json({ error: "Only HOD can create users" }, { status: 403 });
  }

  const { email, password, full_name, role } = await req.json();

  if (!email || !password || !role) {
    return NextResponse.json({ error: "email, password and role are required" }, { status: 400 });
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Set role on profile (trigger creates it, but update role)
  await admin
    .from("profiles")
    .upsert({ id: data.user.id, email, full_name: full_name ?? null, role })
    .eq("id", data.user.id);

  return NextResponse.json({ success: true, userId: data.user.id });
}
