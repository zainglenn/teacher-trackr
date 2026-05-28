import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const USERNAME_RE = /^[a-zA-Z0-9._]{2,30}$/;

function toAuthEmail(username: string): string {
  return `${username.toLowerCase()}@ct.app`;
}

export async function PATCH(req: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return NextResponse.json({ error: "Service role key not configured" }, { status: 500 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^[Bb]earer /, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user: caller }, error: callerErr } = await admin.auth.getUser(token);
  if (callerErr || !caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: callerProfile } = await admin.from("profiles").select("role").eq("id", caller.id).single();
  if (!["admin"].includes(callerProfile?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, username, full_name, role, notification_email } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  if (username !== undefined && !USERNAME_RE.test(username)) {
    return NextResponse.json({ error: "Invalid username format" }, { status: 400 });
  }

  const profileUpdates: Record<string, string | null> = {};
  if (full_name !== undefined) profileUpdates.full_name = full_name;
  if (role !== undefined) profileUpdates.role = role;
  if (notification_email !== undefined) profileUpdates.notification_email = notification_email || null;

  // If username is changing, update the Supabase auth email too
  if (username !== undefined) {
    profileUpdates.username = username;
    profileUpdates.email = toAuthEmail(username);
    const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
      email: toAuthEmail(username),
    });
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 });
  }

  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await admin.from("profiles").update(profileUpdates).eq("id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
