# Information Architecture: Curriculum Tracker

## Site Map

The app is a single-page application with sidebar navigation. Views are rendered by `view` state in `page.tsx`. Deep views (unit editor, class detail) use sub-state rather than URL routing.

### Teacher

- **Dashboard** `view=dashboard`
- **My Class** `view=my-class` ← replaces "My Units"
  - Lesson Week Detail `view=my-class, selectedWeek=N`
    - PPT Generation flow (sheet overlay)
- **Standards Coverage** `view=coverage`
- **Student Progress** `view=student-progress`
  - Student Detail `view=student-progress, selectedStudent=ID`

### HOD

- **Dashboard** `view=dashboard`
- **Delivery Grid** `view=delivery-grid` ← replaces "HOD Review"
  - Class × Week Detail `view=delivery-grid, selectedClass=ID, selectedWeek=N` (sheet overlay)
- **Admin Panel** `view=admin-panel` ← replaces "Unit Assignments" + expands "Manage Classes"
  - Class Setup `view=admin-panel, tab=classes`
  - Deadline Management `view=admin-panel, tab=deadlines`
  - Notification Rules `view=admin-panel, tab=notifications`
- **Master Plans** `view=long-term-plan` (HOD is author of master plans)
  - Unit Plan Editor `view=unit-plan, unitId=ID`
- **Standards Coverage** `view=coverage`
- **Manage Users** `view=manage-users`
- **Student Progress** `view=student-progress`

### Admin

- **Admin Panel** `view=admin` (school provisioning, user management)
- All HOD views

---

## Navigation Model

**Primary navigation**: Left sidebar, always visible on desktop.

### Teacher sidebar (6 items max)
1. Dashboard
2. My Class ← primary daily destination
3. Standards Coverage
4. Student Progress
5. _(empty slots reserved)_

### HOD sidebar (7 items max)
1. Dashboard
2. Delivery Grid ← primary daily destination, badge showing overdue count
3. Master Plans (Long Term Plan)
4. Admin Panel
5. Standards Coverage
6. Student Progress
7. Manage Users

### Admin sidebar
1. Admin Panel
2. Manage Users
3. _(other HOD items as needed)_

**Secondary navigation**: Tabs within views (e.g., Admin Panel tabs: Classes / Deadlines / Notifications). Term selector tabs within Delivery Grid and My Class.

**Utility navigation**: User avatar / school name at sidebar bottom. Account settings, logout.

**Mobile navigation**: Hamburger → full-screen overlay sidebar. Bottom tab bar for the 3 most frequent actions per role (Teacher: My Class, Student Progress, Coverage; HOD: Delivery Grid, Admin Panel, Master Plans).

---

## Content Hierarchy

### My Class (Teacher — primary view)
1. **Current lesson week card** — What the teacher needs to do right now. Delivery checkbox, generate PPT.
2. **Coverage warning banner** — AI alert about at-risk standards. Appears only when relevant.
3. **Upcoming lesson weeks** — Next 2–3 weeks visible below current.
4. **Past lesson weeks** — Collapsed accordion above current week.
5. **Term progress bar** — X/Y weeks delivered. Secondary indicator.

### Delivery Grid (HOD — primary view)
1. **At-risk banner** — Overdue classes flagged immediately. Sticky top.
2. **Grid: classes × lesson weeks** — The full picture. Current week column highlighted.
3. **Term selector tabs** — Switch between Term 1/2/3.
4. **Coverage summary footer** — Per-class standard coverage totals.

### Admin Panel (HOD)
1. **Classes tab** — List of classes. Primary setup task.
2. **Deadlines tab** — Per-class lesson week deadlines. Most-edited after term starts.
3. **Notifications tab** — Alert rules. Set once, rarely changed.

### Unit Plan Editor (HOD — content creation)
1. **Standards table** — Which standards this unit covers.
2. **Lesson week sequence** — Week-by-week focus, activities, standards per week.
3. **Unit header** — Essential question, duration, assessment type.
4. **Supplementary fields** — Vocabulary, anchor texts, differentiation. Below the fold.

---

## User Flows

### HOD: Start of term setup
1. HOD opens Admin Panel → Classes tab
2. Sees existing classes or empty state ("Create your first class")
3. Clicks "+ New Class" → dialog: class name, grade, subject → Save
4. Class appears in list with "Setup" badge
5. HOD clicks class → assigns teacher from dropdown
6. HOD attaches master LTP → selects from existing plans or creates new
7. HOD opens Deadlines tab → sets lesson week due dates (individually or via bulk cadence)
8. HOD opens Notifications tab → sets reminder lead time → Save
9. Teachers receive welcome notification with class and plan details

### HOD: Monitor delivery during term
1. HOD opens Delivery Grid (default landing after dashboard)
2. Scans grid — red/amber cells visible immediately
3. Clicks flagged cell → detail sheet opens: teacher notes, standards covered, delivery date
4. HOD can send message to teacher or extend deadline from the sheet
5. Dismisses sheet → continues scanning

### Teacher: Weekly lesson delivery
1. Teacher opens app → lands on My Class
2. Current week card is highlighted and centred
3. Teacher clicks "Generate PPT" → generation sheet opens → previews slides → downloads
4. Teacher delivers lesson
5. Teacher returns to app → ticks "Mark as taught" checkbox
6. Optional: adds class-specific note in textarea
7. Card turns green, HOD delivery grid updates

### Teacher: Responding to coverage warning
1. Coverage warning banner appears: "4 standards uncovered in Term 1"
2. Teacher clicks "See all uncovered standards" → Standards Coverage view
3. Coverage view highlights unmapped standards with "At risk" badge
4. Teacher navigates back to My Class → views upcoming weeks → considers whether to raise with HOD

### Teacher: Student attainment logging
1. Teacher ticks "Mark as taught" on a week card
2. Soft prompt: "Log attainment for the standards taught this week?"
3. Teacher clicks prompt → Student Progress view filtered to those standards
4. Teacher updates attainment dropdowns per student → saves

---

## Naming Conventions

| Concept | Label in UI | Notes |
|---------|-------------|-------|
| Long Term Plan | Master Plan | "LTP" is internal jargon — "Master Plan" is clearer to new schools |
| ltp_units | Unit | Keep as "Unit" throughout |
| lesson_sequence week | Lesson Week | Not "lesson" (too granular) or "week" (too vague) |
| view=my-class | My Class | Not "My Units" — teacher is assigned a class, not units |
| view=delivery-grid | Delivery Grid | Not "HOD Review" — it's monitoring, not just approval |
| view=admin-panel | Admin Panel | Consolidates class setup + deadlines + notifications |
| status: delivered | Taught | Matches teacher language — "I taught this" |
| status: not_delivered | Not yet taught | Avoids "untaught" which sounds like failure |
| school_id tenant | School | Never expose "tenant" in the UI |
| ltp_unit_standards | Standards | Just "Standards" — no internal table naming |
| attainment | Attainment | Keep — matches UK/UAE school vocabulary |

---

## Component Reuse Map

| Component | Used on | Behavior differences |
|-----------|---------|---------------------|
| `AppSidebar` | All views | Items filtered by role. Badge on Delivery Grid for HOD. |
| `PageContainer` | All main views | Consistent padding and max-width. |
| `StrandBadge` | Unit Plan Editor, My Class, Delivery Grid detail, Coverage | Read-only everywhere except Unit Plan Editor. |
| `LTPStatusBadge` | Master Plans list, Admin Panel classes tab | Same component, different context label. |
| `TermGrid` | Master Plans (HOD), My Class (teacher) | HOD sees edit controls; teacher sees read-only + delivery status overlay. |
| `sheet.tsx` | Delivery Grid cell detail, PPT Generation, Standard detail | Different content, same container pattern. |
| `progress.tsx` | My Class term progress, Delivery Grid column footer, Coverage view | Same component, different colour semantics per context. |

---

## Content Growth Plan

| Section | Growth pattern | Accommodation |
|---------|---------------|---------------|
| Classes (per school) | Fixed per year (6A–6F typical) | No pagination needed. List view sufficient. |
| Schools (multi-tenant) | Grows as platform scales | Admin-only view. Paginated table. |
| Standards | Fixed per curriculum | No growth. Hardcoded per `curriculum_id`. |
| Lesson weeks per unit | Fixed per unit (duration_weeks) | No pagination. Max ~12 weeks per unit. |
| Students per class | ~25–35 per class, stable | No pagination for v1. Search/filter on Student Progress. |
| Master Plans | 1 per grade/subject/year | Archive by year. Dropdown year filter on Master Plans view. |
| Delivery notes | Accumulate per class per week | No pagination needed. Sheet view per cell. |
| Notifications / audit log | Grows indefinitely | Future: paginated log view. V1: not surfaced in UI. |

---

## URL Strategy

The app is currently a SPA with no URL routing for views. The recommended evolution:

**Current pattern** (keep for v1):
- All views managed by `view` state in `page.tsx`
- Deep state (selected unit, selected week) managed by additional state variables

**Recommended v2 migration** (after v1 ships):
- Move to Next.js App Router with route segments
- `/` → Dashboard
- `/my-class` → Teacher Class View
- `/my-class/week/[weekId]` → Lesson Week Detail
- `/delivery` → HOD Delivery Grid
- `/plans` → Master Plans list
- `/plans/[ltpId]/units/[unitId]` → Unit Plan Editor
- `/admin` → HOD Admin Panel
- `/coverage` → Standards Coverage
- `/students` → Student Progress

**Query parameters** (for v1 state management):
- `?term=1|2|3` — selected term in grid/class views
- `?week=N` — selected lesson week
- `?class=ID` — selected class in delivery grid

**Dynamic segments** (v2):
- `[ltpId]` — UUID of master plan
- `[unitId]` — UUID of unit
- `[weekId]` — week number within unit
- `[classId]` — UUID of class
