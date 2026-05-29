import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const USERNAME_RE = /^[a-zA-Z0-9._]{2,30}$/;

function toAuthEmail(username: string): string {
  return `${username.toLowerCase()}@ct.app`;
}

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

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^[Bb]earer /, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user: caller }, error: callerErr } = await admin.auth.getUser(token);
  if (callerErr || !caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await admin
    .from("profiles")
    .select("role, school_id")
    .eq("id", caller.id)
    .single();

  if (!["admin"].includes(profile?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { username, password, full_name, role, notification_email } = await req.json();

  if (!username || !password || !role) {
    return NextResponse.json({ error: "username, password and role are required" }, { status: 400 });
  }
  if (!USERNAME_RE.test(username)) {
    return NextResponse.json({ error: "Username must be 2–30 chars: letters, numbers, dots or underscores" }, { status: 400 });
  }

  const authEmail = toAuthEmail(username);

  const { data, error } = await admin.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from("profiles").upsert({
    id: data.user.id,
    email: authEmail,
    username,
    full_name: full_name ?? null,
    role,
    notification_email: notification_email ?? null,
    school_id: profile?.school_id ?? null,
  });

  return NextResponse.json({ success: true, userId: data.user.id });
}
