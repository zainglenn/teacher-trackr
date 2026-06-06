import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requireAdmin } from "@/lib/adminClient";

const USERNAME_RE = /^[a-zA-Z0-9._]{2,30}$/;

function toAuthEmail(username: string): string {
  return `${username.toLowerCase()}@ct.app`;
}

export async function POST(req: NextRequest) {
  const admin = makeAdminClient();
  const result = await requireAdmin(req, admin);
  if (result instanceof NextResponse) return result;
  const { schoolId } = result;

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
    school_id: schoolId ?? null,
  });

  return NextResponse.json({ success: true, userId: data.user.id });
}
