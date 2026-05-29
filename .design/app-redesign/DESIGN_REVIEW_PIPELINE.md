# Design Review: Delivery Logging, Standard Pipeline & Alignment Fields

Reviewed against: enterprise-lite aesthetic established in multi-subject-school brief
Philosophy: Enterprise-lite — clinical precision with warm human touches
Date: 2026-05-29

---

## Screenshots Captured

| Screenshot | Breakpoint | Description |
|---|---|---|
| `screenshots/review-coverage-pipeline-teacher-desktop-1280.png` | Desktop (1280×800) | Teacher Standards Coverage — pipeline summary bar, filter chips, standards table |
| `screenshots/review-coverage-pipeline-teacher-mobile-375.png` | Mobile (375×812) | Teacher Standards Coverage — mobile layout |
| `screenshots/review-unit-plan-view-desktop-1280.png` | Desktop (1280×800) | UnitPlanView — draft unit showing all empty sections |
| `screenshots/review-unit-heroes-top-desktop-1280.png` | Desktop (1280×800) | UnitPlanView — approved unit with Section 9 standards table + Section 10 alignment |
| `screenshots/review-delivery-grid-hod-desktop-1280.png` | Desktop (1280×800) | HOD Delivery Grid — "No context selected" empty state (bug) |
| `screenshots/review-coverage-hod-desktop-1280.png` | Desktop (1280×800) | HOD Standards Coverage — DepartmentCoverageGrid using deprecated skill_coverage table |
| `screenshots/review-hod-dashboard-desktop-1280.png` | Desktop (1280×800) | HOD Dashboard — stats, plans needing attention, coverage by strand (0%) |

> All screenshots are in `.design/app-redesign/screenshots/`.

---

## Summary

The delivery logging and standard pipeline features are structurally sound — the teacher Standards Coverage view renders the 4-state pipeline with a summary bar and filter chips, and the UnitPlanView Section 9 standards table with priority column is clean. Two critical functional bugs surface on inspection: the HOD Delivery Grid is completely inaccessible (shows "No context selected" because HODs have no class_assignments rows), and the HOD Standards Coverage still reads from the deprecated skill_coverage table so all standards show "Unmapped" regardless of actual plan state.

---

## Must Fix

1. **HOD Delivery Grid inaccessible** — `DeliveryGridView` needs `subjectId` + `gradeLevelId` from `activeContext`, but HODs have no `class_assignments` rows so `useActiveContext` returns null permanently. See `screenshots/review-delivery-grid-hod-desktop-1280.png`. _Fix: In `page.tsx`, for the HOD role derive `subjectId` from `profiles.subject_id` (already on the profile object) and pass a default grade from the active grade filter. Alternatively, add an inline subject+grade picker inside `DeliveryGridView` when no context is available._

2. **HOD Standards Coverage uses deprecated skill_coverage table** — `DepartmentCoverageGrid` calls `useDepartmentCoverage` which queries `skill_coverage`, pre-dating the pipeline. All teachers show 0 standards covered and all statuses "Unmapped". See `screenshots/review-coverage-hod-desktop-1280.png`. _Fix: Build `useDepartmentPipeline(subjectId, gradeLevelId, allStandards)` that runs `useStandardPipeline` logic for each teacher and aggregates results._

---

## Should Fix

1. **Pipeline "Taught" count suspicious** — Teacher Coverage shows 34 "Taught" and 0 "Scheduled" with no lesson sequence data in the seed (lesson_sequence is null for all units). Standards in units with `start_week` set should be "Scheduled". Possible: status labels in the rewritten CoverageView map "scheduled" to the "Taught" display label incorrectly. See `screenshots/review-coverage-pipeline-teacher-desktop-1280.png`. _Fix: Trace `useStandardPipeline` output — verify `status` field values directly and check `CoverageView` status→label mapping._

2. **HOD Dashboard Coverage by Strand shows 0%** — `DashboardView` uses `useCoverage` (coverage_logs table) which is now bypassed by the delivery logging system. This 0% reads as broken to HODs. See `screenshots/review-hod-dashboard-desktop-1280.png`. _Fix: Replace with a lightweight aggregate query on `class_lesson_deliveries` or pipe in pipeline summary data._

3. **Section 9 priority stars are invisible in view tab** — All priority stars show as empty circles (no standards marked priority yet). Column header "Priority" has no hint that it's actionable in edit mode. See `screenshots/review-unit-heroes-top-desktop-1280.png`. _Fix: Add a small "(edit to mark)" caption below the table or a tooltip on the column header._

---

## Could Improve

1. **Pipeline summary bar needs more weight** — The proportional segment bar is thin (~4px) and easy to miss. It's the key new affordance. Increase to ~8px height and make the count labels slightly bolder to give it the visual anchoring it deserves.

2. **Section 10 Standards Alignment empty state is generic** — "No standards alignment added yet." doesn't tell the teacher what it's for. A directive empty state would help adoption: "Map each standard to the task that assesses it — your HOD uses this to verify backwards design."

3. **Delivery checkboxes require lesson sequence data to appear** — The per-week delivery toggle only renders when `unit.lesson_sequence` is non-null. None of the seeded units have lesson sequences, so this feature is invisible to anyone exploring the app. _Suggestion: Seed one unit with 2–3 lesson weeks, or show a prompt in the lesson sequence section linking to the AI Draft feature._

4. **Mobile filter chips wrap to two lines** — At 375px the status filter chips overflow onto a second row. See `screenshots/review-coverage-pipeline-teacher-mobile-375.png`. _Fix: Apply `overflow-x-auto flex-nowrap scrollbar-none` to the filter chip row, matching the School Setup tab scroll pattern._

---

## What Works Well

- **Teacher Standards Coverage is the strongest new screen** — The 4-state pipeline bar immediately communicates curriculum health. Seeing 7 unmapped standards flagged in red is exactly the signal teachers need before the year ends.
- **Section 9 standards table is a clear HOD-review upgrade** — Code badges, strand, full description, and priority column in a proper table beats the old chip list by a wide margin.
- **HOD Dashboard layout holds up** — Grade 6/7/8 filter tabs, 4 stat cards, "Plans Needing Attention" list — all well-composed and consistent with the established clinical register.
- **Empty states are consistent throughout** — Every unfilled section in UnitPlanView uses the same italic muted pattern. Disciplined and unobtrusive.
- **TypeScript clean across all new code** — Zero compiler errors through delivery logging, pipeline hook, alignment fields, and the CoverageView rewrite.
