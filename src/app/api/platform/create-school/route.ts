import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const USERNAME_RE = /^[a-zA-Z0-9._]{2,30}$/;

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

  const { name, city, country, curriculum, adminFullName, adminUsername, adminEmail, adminPassword } =
    await req.json() as {
      name: string; city: string; country: string; curriculum: string;
      adminFullName: string; adminUsername: string; adminEmail?: string; adminPassword: string;
    };

  if (!name?.trim() || !city?.trim() || !country?.trim() || !curriculum?.trim()) {
    return NextResponse.json({ error: "School name, city, country and curriculum are required" }, { status: 400 });
  }
  if (!adminFullName?.trim() || !adminPassword?.trim()) {
    return NextResponse.json({ error: "Admin full name and password are required" }, { status: 400 });
  }
  if (!USERNAME_RE.test(adminUsername)) {
    return NextResponse.json({ error: "Username must be 2-30 characters: letters, numbers, dots, underscores" }, { status: 400 });
  }

  // Check username is not taken
  const { data: existing } = await admin.from("profiles").select("id").eq("username", adminUsername.toLowerCase()).maybeSingle();
  if (existing) return NextResponse.json({ error: "Username already taken" }, { status: 409 });

  // Create school
  const { data: school, error: schoolErr } = await admin
    .from("schools")
    .insert({ name: name.trim(), city: city.trim(), country: country.trim(), curriculum: curriculum.trim() })
    .select()
    .single();

  if (schoolErr || !school) return NextResponse.json({ error: schoolErr?.message ?? "Failed to create school" }, { status: 500 });

  // Create auth user for school admin
  const authEmail = `${adminUsername.toLowerCase()}@ct.app`;
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: authEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { username: adminUsername.toLowerCase() },
  });

  if (authErr || !authData.user) {
    await admin.from("schools").delete().eq("id", school.id);
    return NextResponse.json({ error: authErr?.message ?? "Failed to create admin user" }, { status: 500 });
  }

  // Create profile for school admin
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .insert({
      id: authData.user.id,
      username: adminUsername.toLowerCase(),
      full_name: adminFullName.trim(),
      role: "admin",
      school_id: school.id,
      notification_email: adminEmail?.trim() || null,
    })
    .select()
    .single();

  if (profileErr) {
    await admin.auth.admin.deleteUser(authData.user.id);
    await admin.from("schools").delete().eq("id", school.id);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  return NextResponse.json({ school, adminProfile: profile });
}
