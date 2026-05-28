/**
 * Seed sample school data for Dubai Schools Al Khawaneej — Grade 6 ELA 2025–2026.
 * Run: node scripts/seed-sample-school.mjs
 * Safe to re-run — clears existing LTP data for these teachers first.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local if present
try {
  const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const [k, ...v] = line.split("=");
    if (k && v.length && !process.env[k.trim()]) process.env[k.trim()] = v.join("=").trim();
  }
} catch { /* .env.local not found — rely on process.env */ }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── User IDs ─────────────────────────────────────────────────────────────────
const HOD    = "a12c8c12-979d-443c-a0ff-d7143426b5c4"; // Sarah Mitchell (hod.test)
const JADE   = "75352ce2-56b7-46b0-af6e-fb9209fb899c"; // Jade Glenn   (jade.teacher)
const MARCUS = "9fd1f79e-30a6-4b04-b041-85485d630524"; // Marcus Chen  (marcus.chen)
const PRIYA  = "0146b00d-ad9d-4b8c-9a4b-bbcafeb5dd80"; // Priya Nair   (priya.nair)

// ── Standard IDs ─────────────────────────────────────────────────────────────
const S = {
  RL1:  "eb418950-36a9-4d72-b44d-626e50b8f81c",
  RL2:  "10b3f5ed-0885-442f-8dbc-bba37e1d1b28",
  RL3:  "2adc7121-20f2-4a3a-992d-c83363d4391b",
  RL4:  "9b591804-a233-4770-b1fd-63463299857a",
  RL5:  "c737b0ce-2cf2-4350-b817-dd0f4fda1511",
  RL6:  "ed613bbc-053b-4830-88ef-76b1db0d6214",
  RL7:  "5e1ef42d-8cb3-4713-8d0f-19b7cef3fbab",
  RL9:  "4373f966-a24a-4c78-ae06-ccba52edf4fa",
  RL10: "1d71efad-8eaf-49a7-80ae-110ccbfc0b2e",
  RI1:  "15a39a20-857f-45b6-8cd1-a966bba35c77",
  RI2:  "801e1a83-ed69-4b4a-b7cc-cb18c9341c78",
  RI3:  "dac2b718-eefd-4a6f-aa26-bdba961c6d02",
  RI4:  "975651f4-4b0d-48b2-8ad4-86b1d7263808",
  RI5:  "173786b5-c1ce-4b4f-9a11-4a94ed95c1ff",
  RI6:  "feb2525e-ebc4-4239-8ab1-3053916b0b15",
  RI7:  "6059da02-8d5c-43f8-b7ed-cd0134e16af2",
  RI8:  "55808002-18cd-4e4b-a245-c0e96796b39b",
  RI9:  "f9ec9c94-0e70-48c4-aecc-4ec5482870f5",
  RI10: "4cef29de-4082-44f4-86b8-43864c99e564",
  W1:   "7b2670f8-2c99-444a-a3ff-8867b49e867c",
  W2:   "45eaafc5-61f7-4b59-9fcd-b28f50469d07",
  W3:   "21a21aab-5cf2-40f7-b97c-06797ba55b67",
  W4:   "62bc5d87-34de-4bb9-9828-fa9064a76779",
  W5:   "a33b83af-c025-458a-8463-6ab9d3263306",
  W6:   "c72956a5-924b-41e1-80e4-2e1a5b1addc0",
  W7:   "51d35cae-5932-4b5d-83bc-7d2155371fda",
  W8:   "8ae70417-1aff-4dc1-aace-9cc5531ae59f",
  W9:   "2258e15c-c527-4727-b582-295928cc219a",
  W10:  "1c0a0638-e273-4dc1-ad0a-e3e8a5c0f064",
  SL1:  "760152aa-9b94-45bc-9fd3-7ca601e14dd0",
  SL2:  "85176b2b-2b1e-41d2-a6e8-4d3f446daca4",
  SL3:  "fc8ef9d9-d182-4d21-99d5-f7627bb5dfb0",
  SL4:  "e22eb2d6-a400-4b93-b41e-a7312004e243",
  SL5:  "220a47d9-f978-42c3-ac82-5cf9b62b4dd1",
  SL6:  "aab31199-3297-4ee8-9a78-8dc265a5e50d",
  L1:   "ec15e3e7-0ebe-44dc-b25e-f20933eb9b6d",
  L2:   "c8bb2e6a-c2d9-4a5f-9be3-239e4ed09d09",
  L3:   "03147694-d78d-4358-958c-92aa6140e42e",
  L4:   "88b1341e-f43c-446c-81be-2eff1601b5df",
  L5:   "2b5cb923-1896-4c97-8691-313484c48da6",
  L6:   "3876b19c-3a8c-4df0-9d96-0d799572055e",
};

// ── Unit templates — shared across all three classes ──────────────────────────
// standardIds: full intended mapping. Per-teacher overrides can reduce/adjust.
const UNITS = [
  {
    n: 1, term: 1, sort_order: 1, start_week: 1, duration_weeks: 4,
    title: "Heroes & Journeys: The Universal Story",
    big_idea: "How do the stories a culture tells about heroes reveal what it values most — and what universal human experiences do all hero stories share?",
    assessment_type: "written",
    standardIds: [S.RL1, S.RL2, S.RL3, S.RL10],
  },
  {
    n: 2, term: 1, sort_order: 2, start_week: 5, duration_weeks: 4,
    title: "Crafting Our Stories: Narrative Writing Workshop",
    big_idea: "What choices do writers make to transform a lived experience into a story that resonates with someone who wasn't there?",
    assessment_type: "written",
    standardIds: [S.W3, S.W4, S.W5, S.W10],
  },
  {
    n: 3, term: 1, sort_order: 3, start_week: 9, duration_weeks: 4,
    title: "Reading Between the Lines: Author's Craft & Language",
    big_idea: "How do an author's deliberate word choices and structural decisions shape the way a reader thinks and feels about a text?",
    assessment_type: "both",
    standardIds: [S.RL4, S.RL5, S.RL6, S.L5],
  },
  {
    n: 4, term: 2, sort_order: 4, start_week: 1, duration_weeks: 3,
    title: "Making Sense of the World: Informational Texts",
    big_idea: "How do we read informational texts strategically — distinguishing what is stated, what is implied, and what the author wants us to think?",
    assessment_type: "formative",
    standardIds: [S.RI1, S.RI2, S.RI3, S.RI10],
  },
  {
    n: 5, term: 2, sort_order: 5, start_week: 4, duration_weeks: 3,
    title: "Argue Your Case: Argumentative Writing",
    big_idea: "What separates a strong argument from a merely forceful opinion — and how do writers build credibility with readers who might disagree?",
    assessment_type: "written",
    standardIds: [S.W1, S.W2, S.SL3, S.SL4],
  },
  {
    n: 6, term: 2, sort_order: 6, start_week: 7, duration_weeks: 3,
    title: "Asking Better Questions: Research & Inquiry",
    big_idea: "How do researchers synthesise information from multiple sources — including conflicting ones — to develop an original, well-supported answer to a question that matters?",
    assessment_type: "both",
    standardIds: [S.W7, S.W8, S.W9, S.RI6, S.RI9],
  },
  {
    n: 7, term: 3, sort_order: 7, start_week: 1, duration_weeks: 3,
    title: "The Language of Poetry: Sound, Image & Meaning",
    big_idea: "How do poets use the compressed resources of language — rhythm, image, and word choice — to say things that prose cannot?",
    assessment_type: "both",
    standardIds: [S.RL7, S.RL9, S.L4, S.L6],
  },
  {
    n: 8, term: 3, sort_order: 8, start_week: 4, duration_weeks: 3,
    title: "Word Power: Vocabulary, Grammar & Conventions",
    big_idea: "How does precision in language — in word choice, sentence structure, and grammatical convention — shape the clarity and authority of what we write?",
    assessment_type: "formative",
    standardIds: [S.L1, S.L2, S.L3, S.RI4, S.RI5],
  },
  {
    n: 9, term: 3, sort_order: 9, start_week: 8, duration_weeks: 5,
    title: "Voices That Matter: Final Presentations & Portfolio",
    big_idea: "What does it mean to communicate an important idea compellingly to an audience that doesn't yet share your understanding — and how do we choose the right mode and medium?",
    assessment_type: "both",
    standardIds: [S.W6, S.SL1, S.SL2, S.SL5, S.SL6, S.RI7, S.RI8],
  },
];

// ── Date helpers ──────────────────────────────────────────────────────────────
const d = (s) => new Date(s).toISOString();

// ── Per-teacher plan configurations ──────────────────────────────────────────
const PLANS = [

  // ── CLASS A: Jade Glenn — experienced, on track ───────────────────────────
  {
    teacher: JADE,
    label: "jade.teacher",
    title: "Grade 6 English 2025–2026 — Class A",
    overrides: {
      // Term 1 — all three submitted early, approved promptly
      1: { status: "approved",  submitted_at: d("2025-09-05"), reviewed_at: d("2025-09-09") },
      2: { status: "approved",  submitted_at: d("2025-10-07"), reviewed_at: d("2025-10-13") },
      3: { status: "approved",  submitted_at: d("2025-11-03"), reviewed_at: d("2025-11-07") },
      // Term 2 — submitted beginning of each unit, one reviewed after mid-term
      4: { status: "approved",  submitted_at: d("2026-01-07"), reviewed_at: d("2026-01-12") },
      5: { status: "approved",  submitted_at: d("2026-02-03"), reviewed_at: d("2026-02-16") },
      6: { status: "approved",  submitted_at: d("2026-02-24"), reviewed_at: d("2026-03-02") },
      // Term 3 — unit 7 approved, unit 8 just submitted before break, unit 9 not started
      7: { status: "approved",  submitted_at: d("2026-04-09"), reviewed_at: d("2026-04-14") },
      8: { status: "submitted", submitted_at: d("2026-05-15") },
      9: { status: "draft",     standardIds: [] },
    },
  },

  // ── CLASS B: Marcus Chen — first year at DSK, stumbled on unit 6 ──────────
  {
    teacher: MARCUS,
    label: "marcus.chen",
    title: "Grade 6 English 2025–2026 — Class B",
    overrides: {
      // Term 1 — submitted 1–2 weeks later than Jade
      1: { status: "approved",  submitted_at: d("2025-09-15"), reviewed_at: d("2025-09-19") },
      2: { status: "approved",  submitted_at: d("2025-10-20"), reviewed_at: d("2025-10-27") },
      3: { status: "approved",  submitted_at: d("2025-11-17"), reviewed_at: d("2025-11-21") },
      // Term 2 — units 4 & 5 approved; unit 6 sent for revision end of term
      4: { status: "approved",  submitted_at: d("2026-01-14"), reviewed_at: d("2026-01-19") },
      5: { status: "approved",  submitted_at: d("2026-02-19"), reviewed_at: d("2026-02-24") },
      6: {
        status: "revision",
        submitted_at: d("2026-03-06"),
        reviewed_at:  d("2026-03-11"),
        hod_feedback: "The research plan is solid in scope but the assessment task doesn't adequately address the synthesis component of W.6.9. Students are currently being asked to summarise sources rather than draw evidence across them. Please revise the assessment task to require comparative citation (minimum two sources per claim) and add explicit success criteria for W.6.9. You also need to add RI.6.9 to the standards list — comparing two authors' presentations of the same event or topic is central to what this unit asks students to do. Please resubmit by end of Week 2, Term 3.",
      },
      // Term 3 — unit 7 submitted late (week 4); 8 & 9 not started
      7: { status: "submitted", submitted_at: d("2026-04-22") },
      8: { status: "draft",     standardIds: [] },
      9: { status: "draft",     standardIds: [] },
    },
  },

  // ── CLASS C: Priya Nair — behind, unit 3 rejected, support scheduled ──────
  {
    teacher: PRIYA,
    label: "priya.nair",
    title: "Grade 6 English 2025–2026 — Class C",
    overrides: {
      // Term 1 — unit 1 submitted late (teaching had started); unit 3 rejected
      1: { status: "approved",  submitted_at: d("2025-09-22"), reviewed_at: d("2025-09-29") },
      2: { status: "approved",  submitted_at: d("2025-11-10"), reviewed_at: d("2025-11-17") },
      3: {
        status: "rejected",
        submitted_at: d("2025-12-01"),
        reviewed_at:  d("2025-12-04"),
        rejection_reason: "This plan cannot be approved in its current form. The essential question ('How does an author use words?') is too vague to drive three weeks of inquiry and will not generate the depth of student thinking the standards require. Please revise with a specific tension or insight students will pursue — the question should make students curious, not just describe a task. Additionally, RL.6.5 and RL.6.6 are missing from the standards list: structure and point of view are central to author's craft at Grade 6 and must be addressed. Do not resubmit without a substantially revised essential question.",
      },
      // Term 2 — recovering after rejection; unit 5 submitted very late (Term 3 wk 7)
      4: { status: "approved",  submitted_at: d("2026-01-26"), reviewed_at: d("2026-02-02") },
      5: { status: "submitted", submitted_at: d("2026-05-12") },
      // Units 6–9 not started — HOD check-in scheduled after break
      6: { status: "draft", standardIds: [] },
      7: { status: "draft", standardIds: [] },
      8: { status: "draft", standardIds: [] },
      9: { status: "draft", standardIds: [] },
    },
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // Update HOD display name
  console.log("Updating HOD profile name...");
  await db.from("profiles").update({ full_name: "Sarah Mitchell" }).eq("id", HOD);
  console.log("  ✓ Sarah Mitchell (hod.test)");

  // ── 1. School ──────────────────────────────────────────────────────────────
  console.log("\nSeeding school structure...");
  let { data: school } = await db.from("schools").select("id").eq("name", "Dubai Schools Al Khawaneej").maybeSingle();
  if (!school) {
    const { data: s, error } = await db.from("schools").insert({ name: "Dubai Schools Al Khawaneej" }).select().single();
    if (error) { console.error("  School error:", error.message); process.exit(1); }
    school = s;
  }
  console.log(`  ✓ School: Dubai Schools Al Khawaneej (${school.id})`);

  // ── 2. Subject: English ────────────────────────────────────────────────────
  let { data: subject } = await db.from("subjects").select("id").eq("name", "English").eq("school_id", school.id).maybeSingle();
  if (!subject) {
    const { data: s, error } = await db.from("subjects").insert({ name: "English", slot: 1, school_id: school.id }).select().single();
    if (error) { console.error("  Subject error:", error.message); process.exit(1); }
    subject = s;
  }
  console.log(`  ✓ Subject: English slot 1 (${subject.id})`);

  // ── 3. Grade Levels ────────────────────────────────────────────────────────
  const gradeDefs = [
    { name: "Grade 6", sort_order: 1 },
    { name: "Grade 7", sort_order: 2 },
    { name: "Grade 8", sort_order: 3 },
  ];
  const grades = {};
  for (const gd of gradeDefs) {
    let { data: g } = await db.from("grade_levels").select("id").eq("name", gd.name).eq("school_id", school.id).maybeSingle();
    if (!g) {
      const { data: created, error } = await db.from("grade_levels").insert({ name: gd.name, sort_order: gd.sort_order, school_id: school.id }).select().single();
      if (error) { console.error(`  Grade level error (${gd.name}):`, error.message); process.exit(1); }
      g = created;
    }
    grades[gd.name] = g.id;
    console.log(`  ✓ Grade: ${gd.name} (${g.id})`);
  }
  const grade6Id = grades["Grade 6"];

  // ── 4. Standard Set: NYSED Grade 6 ELA ────────────────────────────────────
  let { data: stdSet } = await db.from("standard_sets").select("id").eq("subject_id", subject.id).eq("grade_level_id", grade6Id).maybeSingle();
  if (!stdSet) {
    const { data: s, error } = await db.from("standard_sets").insert({
      name: "NYSED Grade 6 ELA",
      subject_id: subject.id,
      grade_level_id: grade6Id,
      school_id: school.id,
    }).select().single();
    if (error) { console.error("  Standard set error:", error.message); process.exit(1); }
    stdSet = s;
  }
  console.log(`  ✓ Standard Set: NYSED Grade 6 ELA (${stdSet.id})`);

  // ── 5. Link existing standards to the standard set ────────────────────────
  const allStandardIds = Object.values(S);
  const { error: stdUpdateErr } = await db.from("standards").update({ standard_set_id: stdSet.id }).in("id", allStandardIds);
  if (stdUpdateErr) { console.error("  Standards update error:", stdUpdateErr.message); process.exit(1); }
  console.log(`  ✓ Linked ${allStandardIds.length} standards to standard set`);

  // ── 6. Class Assignments ───────────────────────────────────────────────────
  const assignmentDefs = [
    { teacher_id: JADE,   is_lead: true  },
    { teacher_id: MARCUS, is_lead: false },
    { teacher_id: PRIYA,  is_lead: false },
  ];
  for (const ad of assignmentDefs) {
    const { data: existing } = await db.from("class_assignments")
      .select("id").eq("teacher_id", ad.teacher_id).eq("subject_id", subject.id).eq("grade_level_id", grade6Id).maybeSingle();
    if (!existing) {
      const { error } = await db.from("class_assignments").insert({
        teacher_id: ad.teacher_id,
        subject_id: subject.id,
        grade_level_id: grade6Id,
        is_lead: ad.is_lead,
        school_id: school.id,
      });
      if (error) { console.error("  Class assignment error:", error.message); process.exit(1); }
    } else {
      await db.from("class_assignments").update({ is_lead: ad.is_lead }).eq("id", existing.id);
    }
  }
  console.log(`  ✓ Class assignments: Jade (lead), Marcus, Priya → Grade 6 English`);

  // ── 7. HOD subject assignment ──────────────────────────────────────────────
  await db.from("profiles").update({ subject_id: subject.id }).eq("id", HOD);
  console.log(`  ✓ HOD Sarah Mitchell assigned to English`);

  // ── Clear existing LTP data for these teachers ─────────────────────────────
  console.log("\nClearing existing LTP data...");
  const { data: existingPlans } = await db
    .from("long_term_plans")
    .select("id")
    .eq("teacher_id", HOD);

  const { data: memberPlans } = await db
    .from("ltp_members")
    .select("plan_id")
    .in("teacher_id", [JADE, MARCUS, PRIYA]);

  const planIds = [
    ...new Set([
      ...(existingPlans ?? []).map((p) => p.id),
      ...(memberPlans ?? []).map((m) => m.plan_id),
    ]),
  ];

  if (planIds.length > 0) {
    const { data: units } = await db.from("ltp_units").select("id").in("ltp_id", planIds);
    const unitIds = (units ?? []).map((u) => u.id);
    if (unitIds.length > 0) {
      await db.from("ltp_unit_standards").delete().in("unit_id", unitIds);
      await db.from("ltp_units").delete().in("id", unitIds);
    }
    await db.from("ltp_members").delete().in("plan_id", planIds);
    await db.from("long_term_plans").delete().in("id", planIds);
    console.log(`  Cleared ${planIds.length} existing plan(s).`);
  } else {
    console.log("  Nothing to clear.");
  }

  // Seed each plan
  for (const cfg of PLANS) {
    console.log(`\nSeeding: ${cfg.title}`);

    const { data: plan, error: planErr } = await db
      .from("long_term_plans")
      .insert({
        teacher_id: HOD,
        title: cfg.title,
        school_year: "2025–2026",
        status: "draft",
        school_id: school.id,
        subject_id: subject.id,
        grade_level_id: grade6Id,
      })
      .select()
      .single();

    if (planErr) { console.error("  Plan error:", planErr.message); continue; }

    await db.from("ltp_members").insert({ plan_id: plan.id, teacher_id: cfg.teacher, role: "lead" });
    console.log(`  ✓ Plan created — ${cfg.label} added as lead`);

    const tally = { approved: 0, submitted: 0, revision: 0, rejected: 0, draft: 0 };

    for (const tmpl of UNITS) {
      const ov = cfg.overrides[tmpl.n] ?? {};
      const status     = ov.status ?? "draft";
      const stdIds     = ov.standardIds !== undefined ? ov.standardIds : tmpl.standardIds;

      const { data: unit, error: unitErr } = await db
        .from("ltp_units")
        .insert({
          ltp_id:           plan.id,
          term:             tmpl.term,
          unit_number:      tmpl.n,
          sort_order:       tmpl.sort_order,
          title:            tmpl.title,
          big_idea:         tmpl.big_idea,
          duration_weeks:   tmpl.duration_weeks,
          start_week:       tmpl.start_week,
          assessment_type:  tmpl.assessment_type,
          assigned_to:      cfg.teacher,
          status,
          submitted_at:     ov.submitted_at  ?? null,
          reviewed_at:      ov.reviewed_at   ?? null,
          reviewed_by:      ov.reviewed_at   ? HOD : null,
          hod_feedback:     ov.hod_feedback  ?? null,
          rejection_reason: ov.rejection_reason ?? null,
        })
        .select()
        .single();

      if (unitErr) { console.error(`  Unit ${tmpl.n} error:`, unitErr.message); continue; }

      if (stdIds.length > 0) {
        await db.from("ltp_unit_standards").insert(stdIds.map((sid) => ({ unit_id: unit.id, standard_id: sid })));
      }

      tally[status] = (tally[status] ?? 0) + 1;
    }

    const parts = Object.entries(tally).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`);
    console.log(`  ✓ 9 units — ${parts.join(", ")}`);
  }

  console.log("\n✅ Sample school seeded.\n");
  console.log("Department snapshot (28 May 2026 — Term 3 mid-term break):");
  console.log("  Jade Glenn   Class A  34/41 standards (83%)  7 approved + 1 submitted + 1 draft");
  console.log("  Marcus Chen  Class B  29/41 standards (71%)  5 approved + 1 revision + 1 submitted + 2 draft");
  console.log("  Priya Nair   Class C  20/41 standards (49%)  4 approved + 1 rejected + 1 submitted + 3 draft");
}

main().catch((e) => { console.error(e); process.exit(1); });
