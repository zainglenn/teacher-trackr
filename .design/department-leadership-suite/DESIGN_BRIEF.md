# Design Brief: Department Leadership Suite

## Problem

A HOD running a department has no single place to see whether their team is actually healthy. They know who submitted their LTP. They don't know whether the curriculum is working for students — which strands are weak, which classes are falling behind, which teachers need a coaching conversation. That knowledge lives in meetings, emails, and gut instinct. When a senior leader asks "how is your department performing?", the HOD has to reconstruct the answer from memory.

Teachers have the inverse problem: they work in isolation. They can't see whether the intervention they're running is out of step with what the rest of the department is doing, or whether a colleague has already solved the problem they're stuck on.

The result is a department that is administratively compliant (LTPs submitted, units approved) but operationally invisible.

## Solution

A department intelligence layer that sits alongside the existing curriculum planning tools. It gives HODs a living operational view of their team — student outcomes by strand and class, coaching activity, active interventions, and meeting records — and gives teachers a window into the department they're part of.

The experience is not a dashboard. It is a set of linked documents: a coaching log, a strand health snapshot, a meeting note, an intervention record. Each one is simple to fill in, easy to read back, and builds into a body of evidence over time. When the HOD is asked "how is your department performing?", the answer is already written.

## Experience Principles

1. **Evidence accumulates, not just data** — Every action a HOD takes (logging an observation, closing an intervention, taking a meeting note) creates a record that can be read back weeks or months later. The system rewards consistency by making history visible.

2. **Role-appropriate visibility** — Teachers see the department context that makes them feel part of something, not surveilled. HODs see the operational view they need without noise. Admins see school-wide patterns without needing to drill into individual classrooms.

3. **Document feel over dashboard feel** — Interactions should feel like writing in Notion, not configuring a report. Forms are spacious, text is legible, structure is clear. No modal stacks. No wizard flows. Write → save → done.

## Aesthetic Direction

- **Philosophy**: Notion-inspired editorial calm. Clean hierarchy, generous whitespace, muted backgrounds, purposeful color only for status and strand identity. Feels like a well-organised notebook, not a metrics tool.
- **Tone**: Authoritative but warm. A HOD should feel in control, not surveilled. A teacher should feel informed, not measured.
- **Reference points**: Notion (document feel, calm typography, collapsible sections), Linear (tight data density when needed, status-driven color), the existing LTP unit plan view (the document-style card layout is already the right direction).
- **Anti-references**: Google Classroom (too consumerized, toy-like), PowerSchool / Infinite Campus (clinical, enterprise grey, form-heavy), generic BI dashboards (chart overload, no narrative context).

## Existing Patterns

- **Typography**: Geist Sans (display + body), Geist Mono (code). Font scale via `--font-size-*` tokens.
- **Colors**: OKLCH palette — indigo primary (`oklch(0.49 0.20 264)`), 5 strand colors (RL=blue, RI=violet, W=amber, SL=emerald, L=rose), subject slot colors (slots 1–6), neutral card/background/border.
- **Spacing**: `--space-1` (4px) through `--space-12` (256px).
- **Radius**: `--radius-sm` through `--radius-4xl`.
- **Shadows**: existing shadow scale from globals.css.
- **Components**: shadcn/ui (Badge, Button, Card, Dialog, Sheet, Select, Textarea, Progress, Tooltip), plus project-specific: StrandBadge, StrandProgressBar, LTPStatusBadge, SubjectBadge, StatCard, PageContainer, GradeFilter.
- **Layout**: Single-page app, sidebar navigation, `PageContainer` wraps all views. No Next.js routing for views — `view` state in `page.tsx`.

## Component Inventory

### Cluster 1: Strand × Class Analytics

| Component | Status | Notes |
|---|---|---|
| StrandAttainmentGrid | New | Table: rows = classes, cols = strands. Cell = % meeting/exceeding. Color-coded to strand palette. |
| BenchmarkSnapshotButton | New | HOD takes a point-in-time snapshot. Stores snapshot_date + strand averages. Enables before/after comparison. |
| BenchmarkComparisonBar | New | Before vs. after comparison for a strand. Uses existing Progress component as base. |
| TeacherPerformanceCard | New | Teacher-facing summary: my strand profile vs. department average. |
| DepartmentAnalyticsView | New | New view registered in page.tsx and AppSidebar for HOD. |

### Cluster 2: Coaching Cycles

| Component | Status | Notes |
|---|---|---|
| ObservationLogCard | New | Single observation record: teacher, date, focus area (dropdown), notes (textarea), agreed next steps (textarea). |
| CoachingCycleTracker | New | Visual cycle steps: Observe → Debrief → Model → Reflect. Step completion tracked per teacher per cycle. |
| MentoringPairCard | New | Pairs a new hire with a veteran. Shows check-in cadence and last check-in date. |
| PDEntryCard | New | Teacher logs PD attended: type, focus area, date. HOD sees all entries for dept. |
| CoachingView | New | New view for HOD sidebar: "Coaching". Contains ObservationLog, CoachingCycles, MentoringPairs, PDLog. |

### Cluster 3: Intervention Tracking

| Component | Status | Notes |
|---|---|---|
| InterventionCard | New | Records: students targeted, strategy used, start date, end date, outcome notes. Linked to specific strand(s). |
| InterventionStatusBadge | New | Active / Concluded / Monitoring. Follows existing badge pattern. |
| InterventionListView | New | Teacher view: their own interventions. HOD view: all dept interventions, filterable by teacher/strand. |

### Cluster 4: Department Collaboration

| Component | Status | Notes |
|---|---|---|
| MeetingNoteCard | New | Meeting date, attendees (multi-select from dept teachers), agenda, notes, action items. |
| ActionItemRow | New | Assignee, description, due date, done checkbox. Lives inside MeetingNoteCard. |
| RecognitionCard | New | HOD flags standout practice: teacher, linked unit (optional), note. Visible on teacher's dashboard. |
| DepartmentView | New | New view for HOD + Teacher sidebar: "Department". HOD can write; teachers read. |

### Cluster 5: School-Wide Initiatives

| Component | Status | Notes |
|---|---|---|
| InitiativeCard | New | Initiative name, owner (HOD/Admin), description, linked subjects/grades, status, start/end date. |
| InitiativeParticipantList | New | Which teachers/classes are tagged to this initiative. Participation % shown. |
| InitiativeProgressBar | New | Custom metric fields: HOD/admin defines what success looks like, inputs progress values over time. |
| InitiativesView | New | Tab added to existing Admin view OR new sidebar item for HOD+Admin. |

### Shared / Utility

| Component | Status | Notes |
|---|---|---|
| StatCard | Exists | Reused across all new views for summary numbers. |
| StrandBadge | Exists | Used on InterventionCard, StrandAttainmentGrid. |
| PageContainer | Exists | Wraps all new views. |
| Badge | Exists (shadcn) | Extended for intervention status, coaching cycle step. |
| Sheet | Exists (shadcn) | Used for observation detail drawer, intervention detail drawer. |
| Textarea | Exists (shadcn) | All note/log entry fields. |

## Key Interactions

**Strand Attainment Grid (HOD)**
- HOD opens Department Analytics view.
- Grid loads with current term data: classes as rows, strands as columns, cells show % meeting+exceeding.
- Clicking a cell opens a Sheet showing the individual students in that class × strand, with their attainment levels.
- "Take Snapshot" button at top of view creates a timestamped record of current strand averages. Snapshots appear in a comparison panel below the grid: before/after bars per strand.

**Observation Log (HOD)**
- HOD opens Coaching view, selects a teacher from the sidebar list.
- Clicks "Log Observation" → inline form expands (not a modal): date, focus area (Literacy / Differentiation / Assessment / Classroom Management / Other), notes, next steps.
- Save → card appears in the teacher's observation history. Cycle step advances if all steps in current cycle are complete.

**Intervention Record (Teacher)**
- Teacher opens Student Progress view, clicks "New Intervention".
- Form: select students (multi-select from their class), select strand(s), strategy name, start date.
- Intervention appears as a card under the relevant students. Teacher updates it with outcome notes and marks it Concluded when done.
- HOD sees all active interventions in their Department view, filterable by teacher and strand.

**Meeting Note (HOD)**
- HOD opens Department view, clicks "New Meeting Note".
- Inline document-style form: date, freetext agenda, freetext notes, add action items (inline row per item with assignee dropdown + due date).
- Save → note appears in chronological list. Action items surface in a "Department Actions" summary at the top of the view for all dept teachers.

**Recognition (HOD)**
- HOD opens Department view, clicks "Recognise a teacher".
- Quick form: select teacher, optional link to a unit, short note.
- Recognition appears on the HOD's Department view and on the relevant teacher's dashboard as a highlighted card.

**Initiative (Admin/HOD)**
- Admin creates an initiative: name, description, linked grades/subjects, custom success metric label (e.g. "% reading at grade level").
- HOD tags their classes to the initiative.
- Each term, HOD inputs a metric value. Progress view shows trend over time as a simple line or bar.

## Responsive Behavior

Desktop-first. All views are designed for 1280px+ width.

- **Strand Attainment Grid**: table layout at all desktop sizes. On tablet (768px), strands collapse to strand code abbreviations (RL, RI, W, SL, L).
- **Coaching View**: two-panel layout (teacher list left, detail right) at ≥1024px. Stacks vertically below.
- **Meeting Notes**: single-column document layout. Comfortable at any desktop width.
- **Mobile (375px)**: Department view and coaching log are read-only. Data entry is desktop-only. No mobile-specific layouts needed.

## Accessibility Requirements

- All interactive elements keyboard-navigable (Tab / Enter / Escape).
- Strand color coding always paired with a text label or strand code — never color alone.
- Attainment levels (below / approaching / meeting / exceeding) use color + text label — never color alone.
- Minimum contrast: 4.5:1 for body text, 3:1 for large headings and UI controls (WCAG AA).
- Sheet/drawer components trap focus when open.
- Action item checkboxes have visible focus ring.

## Database Changes Required

New tables (to be added via Supabase migration):

| Table | Key columns |
|---|---|
| `observations` | id, hod_id, teacher_id, school_id, date, focus_area, notes, next_steps, created_at |
| `coaching_cycles` | id, hod_id, teacher_id, school_id, steps_completed (jsonb), started_at, completed_at |
| `mentoring_pairs` | id, mentor_id, mentee_id, school_id, check_in_cadence, last_checkin_at |
| `pd_entries` | id, teacher_id, school_id, pd_type, focus_area, attended_date, notes |
| `interventions` | id, teacher_id, school_id, strand_codes (text[]), student_ids (uuid[]), strategy, start_date, end_date, outcome_notes, status |
| `benchmark_snapshots` | id, hod_id, school_id, subject_id, grade_level_id, snapshot_date, strand_averages (jsonb) |
| `meeting_notes` | id, hod_id, school_id, meeting_date, agenda, notes, attendee_ids (uuid[]), created_at |
| `action_items` | id, meeting_note_id, assignee_id, description, due_date, completed_at |
| `recognitions` | id, hod_id, teacher_id, school_id, unit_id (nullable), note, created_at |
| `initiatives` | id, owner_id, school_id, name, description, subject_ids (uuid[]), grade_level_ids (uuid[]), metric_label, status, start_date, end_date |
| `initiative_participants` | id, initiative_id, teacher_id, class_id |
| `initiative_progress` | id, initiative_id, recorded_by, recorded_at, metric_value, notes |

All tables require RLS policies scoped to `school_id`. HOD role reads all rows for their school; teachers read own rows only.

## Out of Scope

- Real-time collaboration (concurrent editing of meeting notes).
- Push notifications for coaching cycle steps or overdue action items (notification system exists for LTP workflow only — extending it is a separate brief).
- Cross-school benchmarking (platform admin can see school-level data; comparing schools is not included).
- Calendar integration (observations and meetings have dates but do not sync to Google Calendar / Outlook).
- Student-facing views (nothing in this suite is visible to students).
- Automated PD recommendations from student data (the framework exists to inform PD; the AI-driven recommendation engine is out of scope).
- Any changes to the existing LTP review pipeline.
