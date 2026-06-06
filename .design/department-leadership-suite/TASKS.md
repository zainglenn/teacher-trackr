# Build Tasks: Department Leadership Suite

Generated from: `.design/department-leadership-suite/DESIGN_BRIEF.md`
Date: 2026-06-04

---

## Foundation

- [x] **DB Migration — All leadership tables**: Write a single Supabase migration creating all 12 new tables: `observations`, `coaching_cycles`, `mentoring_pairs`, `pd_entries`, `interventions`, `benchmark_snapshots`, `meeting_notes`, `action_items`, `recognitions`, `initiatives`, `initiative_participants`, `initiative_progress`. Include RLS policies: HOD reads/writes all rows for their school; teachers read/write own rows only; admin reads all. Add TypeScript types to `src/types/index.ts`. _New migration file._

- [x] **AppSidebar + AppView extensions**: Add four new `AppView` keys (`"analytics"`, `"coaching"`, `"department"`, `"initiatives"`) to the union type in `AppSidebar.tsx`. Add a Leadership nav section (visible to HOD) with a `SidebarSeparator` and muted section label above Analytics/Coaching/Department. Add `"initiatives"` to Admin nav. Wire all four to render placeholder views in `page.tsx`. _Modifies: `AppSidebar.tsx`, `src/app/page.tsx`._

---

## Cluster 1 — Strand Analytics

- [x] **`useAttainmentGrid` hook**: Fetches `student_progress` joined to `standards` for all students in the HOD's subject/grade context. Aggregates by `class_id × strand_code` → `{ total, meeting, exceeding, notAssessed }`. Returns a `Map<classId, Map<strand, AttainmentStats>>` and a `loading` flag. Scope: reads `student_progress`, `students`, `classes`, `standards`. _New hook: `src/hooks/useAttainmentGrid.ts`._

- [x] **Strand Attainment Grid**: Table component where rows = classes (class name), columns = RL / RI / W / SL / L. Each cell shows `% meeting + exceeding` as a number + a colored background using `--status-taught/behind/overdue/pending` thresholds (≥80% = taught, 40–79% = behind, <40% = overdue, no data = pending). Column headers use `StrandBadge`. Empty state: "No student progress data recorded yet." _New component: `src/components/analytics/StrandAttainmentGrid.tsx`. Reuses: `StrandBadge`, `--status-*` tokens._

- [x] **Attainment drill-down Sheet**: Clicking any grid cell opens a `Sheet` (600px wide) showing the students in that class with their attainment level for that strand. Each row: student name + `AttainmentBadge` (new component using `--attainment-*` tokens). Five badge variants: Not Assessed / Below / Approaching / Meeting / Exceeding. Sheet header shows class name + strand name. _New components: `src/components/analytics/AttainmentDrillDown.tsx`, `src/components/analytics/AttainmentBadge.tsx`. Reuses: `Sheet`._

- [x] **Benchmark Snapshot — take + compare**: "Take Snapshot" button at top of Analytics view saves current strand averages (from `useAttainmentGrid`) to `benchmark_snapshots` with today's date. If ≥2 snapshots exist, a comparison panel renders below the grid: one row per strand, showing before bar (40% opacity) and after bar (full color) side by side using `StrandProgressBar`, with a `+N pp` / `−N pp` delta label. _New hook: `src/hooks/useBenchmarkSnapshots.ts`. New component: `src/components/analytics/BenchmarkComparisonPanel.tsx`. Reuses: `StrandProgressBar`._

- [x] **DepartmentAnalyticsView shell**: `PageContainer`-wrapped view with a page title "Analytics", grade filter (`GradeFilter`, existing), `StrandAttainmentGrid`, and `BenchmarkComparisonPanel`. Registered in `page.tsx` as the `"analytics"` view. HOD-only. _New view: `src/components/DepartmentAnalyticsView.tsx`._

---

## Cluster 2 — Coaching

- [ ] **`useCoaching` hook**: CRUD for `observations`, `coaching_cycles`, `mentoring_pairs`, `pd_entries` scoped to HOD's school. Returns: list of dept teachers each with their latest cycle stage, observations array, mentoring pairs, PD entries. `createObservation(data)`, `updateCycleStep(cycleId, step)`, `createMentoringPair(data)`, `addPdEntry(data)`. _New hook: `src/hooks/useCoaching.ts`._

- [ ] **CoachingView — two-panel shell + teacher list**: Left panel (240px): list of dept teachers, each showing name, role badge, and active cycle step pill ("Step 2 of 4" or "No active cycle"). Clicking a teacher selects them and shows their detail in the right panel. Right panel: teacher name heading + tabs: Observations / Cycle / Mentoring / PD. Empty state per teacher: "No coaching activity recorded." _New view: `src/components/CoachingView.tsx`. Reuses: `PageContainer`, existing teacher data from `useTeachers`._

- [ ] **ObservationLogCard + inline form**: In the Observations tab, `ObservationLogCard` renders per observation: date, focus area badge (Literacy / Differentiation / Assessment / Classroom Management / Other — each with a muted color), observation notes, next steps. "Log Observation" button expands an inline form (not a modal) below the list: date picker, focus area `Select`, notes `Textarea`, next steps `Textarea`, Save + Cancel. On save, new card prepends to the list with a brief fade-in. _New component: `src/components/coaching/ObservationLogCard.tsx`. Reuses: `Card`, `Select`, `Textarea`, `Badge`._

- [ ] **CoachingCycleTracker**: In the Cycle tab: four-step horizontal track — Observe → Debrief → Model → Reflect. Each step: icon, label, status (pending = muted ring, active = primary filled, complete = green check). "Complete Step" button on the active step advances it. "Open New Cycle" button when cycle is closed or absent. If a cycle is complete, shows completion date + "Open New Cycle". _New component: `src/components/coaching/CoachingCycleTracker.tsx`. Reuses: `--primary`, `--status-taught-*`, `--status-pending-*`._

- [ ] **MentoringPairCard + PD log**: Mentoring tab: each pair card shows mentor name + mentee name with an arrow icon, check-in cadence (Weekly / Fortnightly / Monthly), last check-in date, "Update Check-in" button. HOD-only create pair button. PD tab: table of entries — date, type (Conference / Workshop / Peer Obs / Online / Other), focus area, short notes. "+ Add Entry" opens a compact inline form. _New components: `src/components/coaching/MentoringPairCard.tsx`, `src/components/coaching/PDLogTable.tsx`. Reuses: `Card`, `Badge`._

---

## Cluster 3 — Interventions

- [ ] **`useInterventions` hook**: CRUD for `interventions` scoped by school. Teacher sees own rows; HOD sees all. `createIntervention(data)`, `updateIntervention(id, data)`, `concludeIntervention(id, outcomeNotes)`. Returns: interventions array with joined student names and strand labels. _New hook: `src/hooks/useInterventions.ts`._

- [ ] **InterventionCard + status badge**: Card showing: strand badges (one per strand in `strand_codes`), student count (e.g. "4 students"), strategy name, start date, status badge. Status badge: Active (green, `--status-taught-*`), Monitoring (amber, `--status-behind-*`), Concluded (neutral, `--status-pending-*`). Clicking opens a Sheet (400px) with full detail: student names list, outcome notes textarea (editable if Active/Monitoring), "Mark Concluded" button, "Mark Monitoring" button. _New components: `src/components/interventions/InterventionCard.tsx`, `src/components/interventions/InterventionStatusBadge.tsx`. Reuses: `StrandBadge`, `Sheet`, `Card`._

- [ ] **Interventions tab on StudentProgressView (teacher)**: Add a second tab "Interventions" to `StudentProgressView`. Shows teacher's active interventions as `InterventionCard` components. "New Intervention" button opens an inline form: multi-select students from class list, strand checkboxes (RL/RI/W/SL/L), strategy name text input, start date. Empty state: "No active interventions." Concluded interventions collapsed in a "Concluded" section. _Modifies: `src/components/StudentProgressView.tsx`. Reuses: `InterventionCard`._

- [ ] **HOD interventions rollup**: In the HOD `student-progress` view, add the Interventions tab showing all dept interventions. Filter bar: by teacher (select), by strand (select), by status (All / Active / Monitoring / Concluded). Cards grouped by teacher with a teacher name subheading. _Modifies: `src/components/StudentProgressView.tsx` (HOD branch). Reuses: `InterventionCard`._

---

## Cluster 4 — Department Collaboration

- [ ] **`useDepartmentCollaboration` hook**: CRUD for `meeting_notes`, `action_items`, `recognitions` scoped to school. HOD: full read/write. Teachers: read meeting_notes + recognitions addressed to them; read/update own action_items. `createMeetingNote(data)`, `addActionItem(noteId, data)`, `toggleActionItem(id)`, `createRecognition(data)`. _New hook: `src/hooks/useDepartmentCollaboration.ts`._

- [ ] **MeetingNoteCard + inline create form**: Card showing: meeting date, attendee count + avatar initials row, truncated agenda (expand on click), full notes on expand, action items list (each with assignee name, description, due date, done checkbox). "New Meeting Note" button at top of view expands an inline form: date picker, agenda textarea, notes textarea, attendees multi-select (dept teachers). Action items added inline with "+ Action Item" row: assignee select, description input, due date input. Save creates the note + all action items in one transaction. _New component: `src/components/department/MeetingNoteCard.tsx`. Reuses: `Card`, `Textarea`, `Select`._

- [ ] **DepartmentView — HOD shell**: `PageContainer` view with page title "Department". Top section: "Pending Action Items" summary — cards for all incomplete action items across all meeting notes, sorted by due date, each showing assignee name + description. Below: "New Meeting Note" button + reverse-chronological `MeetingNoteCard` feed (show 10, "Load more" at bottom). Empty state: "No meeting notes yet. Record your first department meeting." _New view: `src/components/DepartmentView.tsx`. Reuses: `PageContainer`, `MeetingNoteCard`._

- [ ] **RecognitionCard + HOD create flow**: `RecognitionCard`: gold background using `--recognition-*` tokens, star icon in `--recognition-accent`, teacher name, optional linked unit title, note text, date. "Recognise a Teacher" button opens a `Sheet` (400px): teacher select, unit search (optional, existing unit data), note textarea, submit. On save, card prepends to a Recognitions section at the bottom of DepartmentView. _New component: `src/components/department/RecognitionCard.tsx`. Reuses: `Sheet`, `--recognition-*` tokens._

- [ ] **Teacher DepartmentView**: Render the `"department"` view for teachers as a read-only version of the HOD DepartmentView. Shows: "My Action Items" section (only items assigned to this teacher), meeting notes feed (read-only, no create button), "My Recognitions" section (recognitions addressed to this teacher). No create controls. Empty states appropriate to teacher role. _Modifies: `src/components/DepartmentView.tsx` (role branch). Reuses: `MeetingNoteCard`, `RecognitionCard`._

---

## Cluster 5 — Initiatives

- [ ] **`useInitiatives` hook**: CRUD for `initiatives`, `initiative_participants`, `initiative_progress` scoped to school. Admin: full CRUD on initiatives; HOD: read all + manage participants for own classes + add progress entries. `createInitiative(data)`, `joinInitiative(id, classIds)`, `addProgressEntry(id, value, notes)`. _New hook: `src/hooks/useInitiatives.ts`._

- [ ] **InitiativeCard + InitiativesView (Admin)**: `InitiativeCard`: title, description (truncated), linked grade/subject badges, status badge (Active / Completed), participation count (e.g. "3 of 8 teachers"), metric label + latest value. "New Initiative" inline form: name, description, grade multi-select, subject multi-select, metric label input, start date. View shell: `PageContainer` with "Initiatives" title, active cards grid, "Past Initiatives" collapsed section. _New components: `src/components/initiatives/InitiativeCard.tsx`, `src/components/InitiativesView.tsx`. Reuses: `Card`, `PageContainer`._

- [ ] **Initiative detail Sheet — participants + progress**: Clicking an `InitiativeCard` opens a `Sheet` (600px). Two sections: Participants (list of teachers + classes tagged, with "Join"/"Leave" toggle for HOD) and Progress (timestamped metric entries as a simple table: date, value, notes, recorded by). "Add Progress Entry" inline form: metric value input, notes textarea. No chart — table only at this stage. _New component: `src/components/initiatives/InitiativeDetailSheet.tsx`. Reuses: `Sheet`._

---

## Polish

- [ ] **Empty states**: All five new views need illustrated or text-only empty states for: no data yet (first use), no results matching current filter, and loading failure. Use the existing empty state pattern from `LongTermPlanView` as reference. Cover: DepartmentAnalyticsView, CoachingView, DepartmentView (HOD + teacher), InitiativesView. _Modifies existing new components._

- [ ] **Loading skeletons**: Add `Skeleton` (shadcn, existing) placeholders for: `StrandAttainmentGrid` (table shape), `CoachingView` teacher list, `MeetingNoteCard` feed, `InitiativeCard` grid. Matches the visual footprint of the loaded state so layout doesn't shift. _Modifies existing new components. Reuses: `Skeleton`._

- [ ] **Notification wiring**: When an HOD creates a recognition for a teacher → trigger the existing notification system (same pattern as LTP approval notifications). When an action item is assigned to a teacher → trigger a notification. Inspect `src/hooks/useNotifications.ts` and the existing notification insert pattern; replicate for the two new event types. _Modifies: notification hooks + new DB triggers or client-side inserts._

---

## Review

- [ ] **Design review**: Run `/design-review` against the brief once all five clusters are built.
