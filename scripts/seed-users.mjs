import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

try {
  const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const [k, ...v] = line.split("=");
    if (k && v.length && !process.env[k.trim()]) process.env[k.trim()] = v.join("=").trim();
  }
} catch { /* no .env.local */ }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const toAuthEmail = (username) => `${username}@ct.app`;

const TEST_USERS = [
  { username: "zain.admin",   password: "Admin123!@@",   full_name: "Zain Glenn",  role: "admin"   },
  { username: "hod.test",     password: "HODtest123!@@", full_name: "HOD User",    role: "hod"     },
  { username: "jade.teacher", password: "Jade123!@@",    full_name: "Jade Glenn",  role: "teacher" },
];

async function main() {
  // Delete all existing auth users
  console.log("Fetching existing auth users...");
  const { data: listData, error: listErr } = await admin.auth.admin.listUsers({ perPage: 100 });
  if (listErr) { console.error("List error:", listErr.message); process.exit(1); }

  for (const user of listData.users) {
    console.log(`  Deleting ${user.email}...`);
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) console.warn(`  Warning: ${error.message}`);
  }

  // Create fresh test users
  console.log("\nCreating test users...");
  for (const u of TEST_USERS) {
    const authEmail = toAuthEmail(u.username);
    const { data, error } = await admin.auth.admin.createUser({
      email: authEmail,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name },
    });
    if (error) { console.error(`  Error creating ${u.username}:`, error.message); continue; }

    // Upsert profile with username and role
    const { error: profileErr } = await admin.from("profiles").upsert({
      id: data.user.id,
      email: authEmail,
      username: u.username,
      full_name: u.full_name,
      role: u.role,
    });
    if (profileErr) console.warn(`  Profile warning for ${u.username}:`, profileErr.message);

    console.log(`  ✓ ${u.username} (${u.role}) — password: ${u.password}`);
  }

  console.log("\nDone. Test credentials:");
  for (const u of TEST_USERS) {
    console.log(`  ${u.role.padEnd(8)} | username: ${u.username.padEnd(16)} | password: ${u.password}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
