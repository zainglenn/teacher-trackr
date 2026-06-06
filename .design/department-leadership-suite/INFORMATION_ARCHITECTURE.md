# Information Architecture: Department Leadership Suite

## View Map

This is a single-page app using a `view` state string (no Next.js routing). New views are registered as `AppView` union members in `AppSidebar.tsx` and rendered in `page.tsx`.

### HOD
- `dashboard` — existing (summary stats, coverage heatmap, plans needing attention)
- `long-term-plan` — existing
- `delivery-grid` — existing
- `hod-review` — existing
- `coverage` — existing
- `analytics` ← **NEW** — strand attainment grid, benchmark snapshots
  - Sheet: class × strand drill-down (student-level attainment)
- `coaching` ← **NEW** — observation log, coaching cycles, mentoring pairs, PD log
  - Sub-panel: per-teacher detail (tab within the view, not a separate view)
- `department` ← **NEW** — meeting notes, action items, recognitions
- `student-progress` — existing (+ Interventions tab added)
- `hod-settings` — existing

### Teacher
- `my-units` — existing
- `long-term-plan` — existing
- `coverage` — existing
- `student-progress` — existing (+ Interventions tab added)
- `department` ← **NEW** — read-only meeting notes, own action items, own recognitions

### Admin
- `manage-users` — existing
- `school-setup` — existing
- `platform-settings` — existing
- `curriculum-audit` — existing
- `initiatives` ← **NEW** — create and manage school-wide initiatives

### Platform Admin
- `schools` — existing (no changes)

---

## Navigation Model

### Primary navigation
Flat sidebar list, filtered by role. 220px fixed width. No nested nav — all navigation is top-level view switches.

**HOD sidebar — updated order:**

```
── Planning ──────────────────
  Dashboard
  Master Plans
  Delivery Grid
  Plan Reviews
  Standards Coverage
── Leadership ────────────────
  Analytics            ← NEW
  Coaching             ← NEW
  Department           ← NEW
── ───────────────────────────
  Student Progress
  HOD Settings
```

A `SidebarSeparator` + muted section label (8px uppercase, `--muted-foreground`) separates the Planning cluster from the Leadership cluster. This avoids restructuring the existing nav while making the new section scannable.

**Teacher sidebar — updated:**
```
  My Units
  Master Plans
  Standards Coverage
  Student Progress
  Department           ← NEW
```

**Admin sidebar — updated:**
```
  Manage Users
  School Setup
  Platform Settings
  Curriculum Audit
  Initiatives          ← NEW
```

### Secondary navigation
Within-view tabs are used only where a view has two meaningfully distinct modes:
- `student-progress`: "Progress" tab (existing) + "Interventions" tab (new)
- `coaching`: Teacher list on the left + teacher detail panel on the right (two-panel, not tabs)
- `analytics`: Single view, no tabs — the benchmark comparison panel is always below the grid

### Utility navigation
- Notification bell (existing, top of sidebar header)
- Subject/grade context switcher (existing, below logo)
- Sign out (existing, footer)

### Mobile navigation
Desktop-first. Sidebar collapses to offcanvas on small screens (existing behavior). New views inherit this. No mobile-specific layout is designed for the new views; data entry is desktop-only.

---

## Content Hierarchy

### Analytics (HOD)
1. **Strand Attainment Grid** — the primary reason for opening this view; shows where the department is right now. Loaded immediately.
2. **Grade/subject filter** — scoped to active context by default; switchable without leaving the view.
3. **Take Snapshot button** — secondary action, top-right of grid. Takes a timestamped reading of current averages.
4. **Benchmark Comparison panel** — below the grid. Only renders if ≥2 snapshots exist. Before/after bars per strand.

### Coaching (HOD)
1. **Teacher list** (left panel) — who is in the department. Active cycle status shown inline (e.g., "Step 2 of 4"). Clicking selects teacher.
2. **Active observations** (right panel, top) — the most recent/pending items for the selected teacher. Most time-sensitive.
3. **Open Cycle tracker** (right panel) — four-step visual: Observe → Debrief → Model → Reflect. Step completion per cycle.
4. **Log Observation button** — primary action for the selected teacher. Opens inline form below the tracker.
5. **PD Log** (right panel, bottom) — lower frequency; teacher logs PD attended. HOD sees read-only.
6. **Mentoring Pairs** (bottom of left panel) — setup once per year; lower frequency.

### Department (HOD)
1. **Pending Action Items** — items assigned from meeting notes that are not yet completed. Most time-sensitive content; top of the view.
2. **New Meeting Note button** — primary action. Prominent, just below the actions summary.
3. **Meeting Notes feed** — chronological, most recent first. Shows date, attendees, truncated agenda. Click to expand.
4. **Recognitions** — below meeting notes. Cards with teacher name, date, note.

### Department (Teacher)
1. **My Action Items** — items assigned to this teacher across all meeting notes. Due date visible.
2. **Recent Meeting Notes** — read-only. Same feed as HOD view, same expand-to-read pattern.
3. **My Recognitions** — recognitions the HOD has given this teacher.

### Student Progress — Interventions tab (Teacher)
1. **Active Interventions** — cards for currently running interventions. Students, strand(s), strategy, start date.
2. **New Intervention button** — primary action.
3. **Concluded Interventions** — collapsed section. Expandable. Shows outcome notes and date range.

### Student Progress — Interventions tab (HOD)
1. **Filter bar** — by teacher, by strand, by status (Active / Concluded / Monitoring).
2. **Intervention cards** — grouped by teacher. Same card component as teacher view.

### Initiatives (Admin)
1. **Active Initiatives** — cards with name, owner, participation %, metric trend.
2. **New Initiative button** — primary action.
3. **Completed Initiatives** — collapsed section.

### Initiative Detail (Admin/HOD — Sheet)
1. Initiative name, description, metric label.
2. Participation list — which teachers/classes are tagged.
3. Progress entries — timestamped metric values with trend.
4. Add Progress Entry (HOD action).
5. Tag/untag participants (HOD action).

---

## User Flows

### Flow 1: HOD checks department strand health
1. HOD opens **Analytics** view (default context: their subject/grade)
2. Strand Attainment Grid loads — rows = classes, cols = RL / RI / W / SL / L, cells = % meeting+exceeding
3. HOD sees Writing column is red across 3 classes
4. HOD clicks a red cell → Sheet opens with student list for that class × strand (name + attainment level)
5. HOD closes sheet → decides to log a coaching observation targeting Writing
6. HOD navigates to **Coaching** → selects the relevant teacher → clicks "Log Observation" → sets focus area to "Writing" → fills notes and next steps → saves

### Flow 2: HOD logs a classroom observation
1. HOD opens **Coaching** view
2. Selects teacher from left panel (sees their active cycle stage)
3. Clicks **Log Observation** → inline form expands below the cycle tracker
4. Fills: date (defaults to today), focus area (dropdown), observation notes (textarea), agreed next steps (textarea)
5. Saves → observation card appears in teacher's history; cycle step advances if this step was pending
6. If all 4 steps in the cycle are complete → cycle closes; HOD prompted to open a new cycle or leave open

### Flow 3: Teacher logs an intervention
1. Teacher opens **Student Progress** view → clicks **Interventions** tab
2. Clicks **New Intervention**
3. Fills: select students (multi-select from class list), select strand(s) (checkbox: RL / RI / W / SL / L), strategy name (text), start date
4. Saves → intervention card appears with status = Active
5. Over following weeks, teacher clicks card → adds outcome notes
6. Teacher clicks **Mark Concluded** → status updates; outcome notes locked; end date recorded

### Flow 4: HOD runs a department meeting
1. HOD opens **Department** view
2. Clicks **New Meeting Note**
3. Inline form expands: date, agenda (textarea), notes (textarea)
4. Clicks **+ Action Item** → row appears: assignee dropdown (dept teachers), description, due date
5. Repeats for each action item
6. Saves → note appears in feed; action items appear in **Pending Action Items** summary for HOD and for each assigned teacher

### Flow 5: HOD takes a benchmark snapshot
1. HOD opens **Analytics** view (strand attainment grid loaded)
2. Clicks **Take Snapshot** (top-right of grid)
3. Confirmation: "Snapshot saved — 3 Jun 2026. Current strand averages recorded."
4. Benchmark Comparison panel appears below the grid (if previously hidden)
5. After ≥6 weeks, HOD takes a second snapshot
6. Before/after bars appear per strand — delta shown as +/− percentage points

### Flow 6: HOD recognises a teacher
1. HOD opens **Department** view
2. Clicks **Recognise a Teacher**
3. Quick form (Sheet): select teacher, optional link to a unit (searchable dropdown), short note
4. Saves → recognition card appears on HOD's Department view and on the teacher's Department view

### Flow 7: Admin creates a school-wide initiative
1. Admin opens **Initiatives** view
2. Clicks **New Initiative**
3. Fills: name, description, linked grades (multi-select), linked subjects (multi-select), metric label (e.g. "% students reading at grade level"), start date
4. Saves → initiative card appears, participation = 0 teachers
5. HOD opens their **Department** view → sees a "School Initiatives" section at bottom showing initiatives they're linked to
6. HOD clicks **Join Initiative** on a card → tags their classes as participants
7. End of term: HOD clicks **Add Progress Entry** → enters metric value + notes
8. Initiative card shows trend line across entries

---

## Naming Conventions

| Concept | Label in UI | Notes |
|---|---|---|
| Classroom visit by HOD | Observation | Not "walkthrough", "visit", or "drop-in" |
| Four-step coaching process | Coaching Cycle | Steps: Observe → Debrief → Model → Reflect |
| One step of the cycle | Step | "Complete Step" not "mark done" |
| Teacher being coached | Teacher | Not "coachee" |
| Student support programme | Intervention | Not "support plan" or "group" |
| Intervention state | Active / Concluded / Monitoring | 3 states only |
| Professional development event | PD Entry | Not "CPD" or "training" |
| Department meeting record | Meeting Note | Emphasises the document, not the event |
| Task assigned from a meeting | Action Item | Not "task" (avoids conflict with Claude Code tasks) |
| Positive peer recognition | Recognition | Not "shoutout", "kudos", or "commendation" |
| Time-locked attainment record | Snapshot | "Take Snapshot" to create, "Compare Snapshots" to view delta |
| School-wide programme | Initiative | Not "project" or "programme" |
| Progress data input | Metric Entry | HOD inputs a value against the initiative's metric label |
| Department health overview | Analytics | Used in nav label only; within the view use plain language |
| Strand performance in a class | Strand Attainment | Matches `student_progress` table language |

---

## Component Reuse Map

| Component | Used on | Behavior differences |
|---|---|---|
| `PageContainer` | All new views | No variation |
| `StatCard` | Analytics (snapshot count), Coaching (active cycles), Department (pending actions) | Icon and label vary |
| `StrandBadge` | Analytics grid headers, Intervention cards | No variation |
| `StrandProgressBar` | Benchmark comparison panel | Paired before/after; existing single-bar behavior extended |
| `Badge` | Intervention status, Coaching cycle step | Color variant added per status |
| `Sheet` | Analytics drill-down, Observation detail, Intervention detail, Initiative detail, Recognition quick form | Width varies: analytics drill-down = wide (600px), quick forms = narrow (400px) |
| `Textarea` | Observation notes, meeting notes, action item descriptions, intervention outcome notes | No variation |
| `Card` | ObservationLogCard, MeetingNoteCard, InterventionCard, RecognitionCard, InitiativeCard | Styling varies; shared Card shell |
| `GradeFilter` | Analytics view | Existing component, no changes |
| `Progress` (shadcn) | BenchmarkComparisonBar, InitiativeProgressBar | Extended with before/after labelling |

---

## Content Growth Plan

| Content type | Growth rate | Accommodation strategy |
|---|---|---|
| Observations | ~2–4 per teacher per term | Show current academic year by default; collapse older entries under "View previous years" |
| Meeting Notes | ~1–2 per month | Reverse-chronological feed; show 10 most recent, load-more button |
| Action Items | Derived from meeting notes | Show only incomplete items in summary; completed items archived per meeting note |
| Interventions | ~3–8 active at a time per teacher | Filter: Active / Concluded. Concluded collapse by default. Auto-archive after year end |
| Benchmark Snapshots | Max 6 per subject/grade per year | Timeline shows up to 6 data points; oldest snapshot is the baseline |
| Recognitions | Low frequency (cultural) | No pagination needed; show all in current year |
| Initiatives | 1–3 active per school | No pagination; completed collapse under "Past Initiatives" |
| PD Entries | Teacher-driven; ~4–8 per year | Reverse-chronological list; HOD sees a summary table (teacher × PD count) |

---

## URL / View Key Strategy

This app does not use URL-based routing. View identity is the `AppView` string. Conventions:

- New view keys use lowercase hyphenated strings: `"analytics"`, `"coaching"`, `"department"`, `"initiatives"`
- Sub-views (per-teacher detail, cell drill-downs, initiative detail) use Sheet/drawer state local to the view component — they do not update the `AppView` key
- Filter state (grade, teacher, strand) is local component state — it does not persist across view switches
- The `activeContext` (subject + grade) from the existing context switcher is passed into Analytics and Coaching views the same way it is passed into the existing Delivery Grid and Coverage views

### New AppView members to add

```typescript
export type AppView =
  // ... existing values ...
  | "analytics"     // HOD: strand attainment grid + benchmarks
  | "coaching"      // HOD: observation log, cycles, mentoring, PD
  | "department"    // HOD + Teacher: meeting notes, actions, recognitions
  | "initiatives"   // Admin + HOD: school-wide initiatives
```
