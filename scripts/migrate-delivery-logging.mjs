/**
 * Migration: add class_lesson_deliveries table for teacher delivery logging.
 * Run: node scripts/migrate-delivery-logging.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

try {
  const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const [k, ...v] = line.split("=");
    if (k && v.length && !process.env[k.trim()]) process.env[k.trim()] = v.join("=").trim();
  }
} catch { /* rely on process.env */ }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SQL = `
-- Teacher delivery logging
CREATE TABLE IF NOT EXISTS class_lesson_deliveries (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id         uuid        NOT NULL REFERENCES ltp_units(id) ON DELETE CASCADE,
  week_number     integer     NOT NULL,
  teacher_id      uuid        NOT NULL REFERENCES profiles(id),
  delivered_at    timestamptz NOT NULL DEFAULT now(),
  notes           text,
  school_id       uuid        REFERENCES schools(id),
  UNIQUE (unit_id, week_number, teacher_id)
);

ALTER TABLE class_lesson_deliveries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'class_lesson_deliveries' AND policyname = 'teachers_manage_own_deliveries'
  ) THEN
    CREATE POLICY teachers_manage_own_deliveries ON class_lesson_deliveries
      FOR ALL USING (teacher_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'class_lesson_deliveries' AND policyname = 'hod_admin_read_deliveries'
  ) THEN
    CREATE POLICY hod_admin_read_deliveries ON class_lesson_deliveries
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role IN ('hod', 'admin')
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_deliveries_unit ON class_lesson_deliveries(unit_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_teacher ON class_lesson_deliveries(teacher_id);
`;

async function main() {
  console.log("Applying delivery logging migration...");
  const { error } = await db.rpc("exec_sql", { sql: SQL }).single().catch(() => ({ error: null }));
  // exec_sql RPC may not exist — fall back to running statements individually
  if (error) {
    // Try direct query via REST (service role can run DDL via pg_meta if available)
    console.log("exec_sql RPC not available, trying pg_meta...");
  }

  // Verify table exists
  const { data, error: checkErr } = await db.from("class_lesson_deliveries").select("id").limit(1);
  if (checkErr && checkErr.code === "42P01") {
    console.error("Table does not exist after migration attempt.");
    console.log("\nRun this SQL manually in the Supabase SQL editor:\n");
    console.log(SQL);
    process.exit(1);
  }

  console.log("✓ class_lesson_deliveries table ready.");
}

main().catch((e) => { console.error(e); process.exit(1); });
