# Information Architecture: Multi-Subject School

## Current Architecture (Baseline)

Single-page app. All views are rendered in `src/app/page.tsx` via a `view` state string — no Next.js routing is used for views. The `AppView` union type in `AppSidebar.tsx` enumerates every possible view. Sidebar filters nav items by role.

```
AppView (current)
├── dashboard           — HOD only
├── my-units            — teacher only
├── long-term-plan      — teacher + HOD
├── delivery-grid       — HOD only
├── hod-review          — HOD only
├── coverage            — teacher + HOD
├── student-progress    — teacher + HOD
├── hod-settings        — HOD only
├── manage-users        — admin only
├── platform-settings   — admin only
└── curriculum-audit    — admin only
```

## View Map (After This Feature)

Changes are marked. New views in **bold**.

```
AppView (updated)
│
├── [Teacher + HOD views — scoped to active SubjectGradeContext]
│   ├── dashboard           — HOD only (grade-filtered)
│   ├── my-units            — teacher only
│   ├── long-term-plan      — teacher + HOD
│   ├── delivery-grid       — HOD only (grade-filtered)
│   ├── hod-review          — HOD only (grade-filtered)
│   ├── coverage            — teacher + HOD
│   ├── student-progress    — teacher + HOD
│   └── hod-settings        — HOD only
│
└── [Admin views]
    ├── manage-users        — admin only (+ subject assignment for HODs)
    ├── platform-settings   — admin only
    ├── curriculum-audit    — admin only
    └── school-setup        — admin only (NEW)
        ├── tab: subjects
        ├── tab: grade-levels
        ├── tab: standard-sets
        └── tab: class-assignments
```

No new top-level routes. All views remain `view` state in `page.tsx`. `school-setup` is a new `AppView` key with internal tab state managed locally.

## Navigation Model

### Primary navigation (sidebar)
- Max 8 items visible per role — current max is 7 (HOD), adding `school-setup` brings admin to 4
- Items are ordered: most-used at top, config/admin at bottom
- Active item: left border accent + subtle background tint (existing pattern unchanged)
- New item added: `school-setup` for admin role, positioned below `manage-users`

### Context switcher (new — sidebar header area)
Positioned between the app logo/name and the first nav item. Only rendered when the current user has more than one class assignment.

```
┌─────────────────────────────────┐
│  [⬡] Curriculum Tracker         │  ← existing header
├─────────────────────────────────┤
│  Grade 6 · English          ▾   │  ← SubjectGradeContext (new)
├─────────────────────────────────┤
│  Dashboard                      │
│  My Units                       │  ← nav items (unchanged)
│  ...                            │
```

- Pill label: `[Grade Level] · [Subject]` e.g. `Grade 6 · English`
- Click → dropdown listing all assignments, grouped by subject if multiple subjects
- Selected context stored in `localStorage` key `ct_active_context`
- HOD sees the same switcher but their assignments are subject-level (one per subject they manage)

### HOD grade filter (within views)
Not a sidebar element — appears as a tab row or compact select at the top of each HOD view that is grade-sensitive: Dashboard, Delivery Grid, Plan Reviews, Standards Coverage.

```
Grade 6   Grade 7   Grade 8        ← tab row on desktop
[Grade 6 ▾]                        ← select on mobile
```

Default selection: grade with the most pending actions (overdue plans or unreviewed submissions).

### Utility navigation (sidebar footer)
Unchanged: username + role badge + sign out button.

### Mobile navigation
- Sidebar collapses to offcanvas (existing `collapsible="offcanvas"` pattern)
- Context switcher collapses to icon-only pill with grade+subject abbreviated
- HOD grade filter collapses from tabs to a select dropdown

## Content Hierarchy

### School Setup (new — admin)

1. **Subjects tab** — the root of the hierarchy. Nothing else can be created without a subject.
2. **Grade Levels tab** — second building block. Independent of subjects but needed for assignments.
3. **Standard Sets tab** — requires a subject + grade level to exist. The most complex tab.
4. **Class Assignments tab** — requires teachers, subjects, and grade levels. Final step in setup.

Tab order mirrors setup dependency order — an admin setting up from scratch works left to right.

#### Standard Sets tab content priority
1. Subject + grade level selector (scopes the view)
2. The assigned standard set name + standards count
3. Standards list (code, description, strand) — scannable table
4. Add standard / edit standard / delete standard actions

#### Class Assignments tab content priority
1. Subject + grade level selector
2. Teacher list for that combo — name, is_lead toggle, remove action
3. Add teacher action (select from existing profiles)

### Dashboard (HOD — modified)
1. Grade filter tabs (new — top of page)
2. Stats (plans pending review, overdue units, coverage %) — scoped to selected grade
3. Teacher cards / swim lanes — unchanged structure, scoped to grade

### Plan Reviews (HOD — modified)
1. Grade filter (tabs or select)
2. Submission queue — unchanged structure, scoped to grade

### Master Plans (teacher — modified)
1. Context shown in page header (e.g., "Grade 6 · English — Master Plans")
2. Plan list — scoped to active context
3. Create plan button

## User Flows

### Flow 1: Admin sets up a new subject (e.g., adds Mathematics)
1. Admin navigates to School Setup → Subjects tab
2. Sees existing subjects listed (e.g., English)
3. Clicks "Add Subject" → inline form: name field + save
4. Subject appears in list
5. Admin switches to Grade Levels tab — verifies grade levels exist (or creates them)
6. Admin switches to Standard Sets tab → selects Mathematics + Grade 6
7. Clicks "Add Standard Set" → names it (e.g., "NYSED Grade 6 Math")
8. Adds standards one by one (or via import — deferred)
9. Admin switches to Class Assignments tab → selects Mathematics + Grade 6
10. Clicks "Add Teacher" → selects from user list → optionally marks as lead
11. Done — the assigned teacher now sees Grade 6 · Mathematics in their context switcher

### Flow 2: Teacher with multiple assignments switches context
1. Teacher logs in — sees their last active context (from `localStorage`) or first assignment
2. Sidebar shows context pill: `Grade 6 · English`
3. Teacher clicks pill → dropdown shows all assignments:
   - Grade 6 · English (active)
   - Grade 7 · English
4. Teacher selects "Grade 7 · English"
5. Sidebar pill updates, entire app re-renders scoped to Grade 7 English
6. Teacher is now on whatever view they were on, scoped to new context

### Flow 3: HOD reviews plans across grade levels
1. HOD logs in — sees Dashboard scoped to their subject (English)
2. Grade filter defaults to grade with most pending items (e.g., Grade 7 — 2 submissions)
3. HOD switches to Plan Reviews
4. Grade 7 tab active — sees Grade 7 submissions
5. HOD clicks Grade 6 tab — queue re-filters to Grade 6 submissions
6. HOD approves a plan — queue updates inline

### Flow 4: Admin assigns an HOD to a new subject
1. Admin navigates to Manage Users
2. Finds the user (e.g., Sarah Mitchell, role: HOD)
3. Sees subject assignment column — currently shows "English"
4. Clicks edit → subject select dropdown → assigns "Mathematics" (replaces or adds?)
   - For now: one subject per HOD — admin selects from subject list
5. Saves — Sarah now appears in School Setup → Standard Sets as the Mathematics HOD

## Naming Conventions

| Concept | Label in UI | Notes |
|---|---|---|
| A subject taught at the school | Subject | Not "department" — simpler, matches teacher language |
| A year group / grade | Grade Level | Full label in setup; abbreviated to "Grade 6" in context pill |
| The set of standards for a subject+grade | Standard Set | Not "curriculum" — avoids confusion with the broader product name |
| A teacher's assignment to a subject+grade | Class Assignment | Not "allocation" — clearer to non-admin users |
| The currently active subject+grade | Context | Internal term only — UI shows "Grade 6 · English", never "active context" |
| HOD's scope within the subject | Subject | HOD manages a subject, not a department |
| Teacher with is_lead = true | Lead | "Lead Teacher" as label, "Lead" as badge text |

## Component Reuse Map

| Component | Used in | Behaviour differences |
|---|---|---|
| `SubjectGradeContext` | AppSidebar (all roles with >1 assignment) | Teachers see full switcher; HODs see subject-locked, grade-only switcher — wait, HODs have a grade filter *within* views, not in sidebar. HOD sidebar shows their subject as a static label. |
| Grade filter (tabs/select) | Dashboard, Delivery Grid, Plan Reviews, Standards Coverage (HOD) | Same visual component, different tab labels per view |
| Subject+grade selector (2 selects) | School Setup — Standard Sets tab, Class Assignments tab | Shared pattern: Subject select → Grade Level select → content panel updates |
| Inline add form | School Setup — all tabs | Single text input + Save / Cancel. Same pattern across Subjects, Grade Levels. |
| Teacher list table | Class Assignments tab, Manage Users | Different columns; Class Assignments adds is_lead toggle |

## Content Growth Plan

| Section | Growth pattern | Accommodation |
|---|---|---|
| Subjects | Slow — added by admin, rarely removed | Simple list, no pagination needed at school scale |
| Grade Levels | Fixed once set up — typically 6–12 entries | Static list |
| Standards per set | 30–60 standards per set, multiple sets | Paginated or virtualised list if sets are large; searchable by code/description |
| Class Assignments | Grows with staff — typically 10–30 teachers | Filterable by subject+grade; no pagination needed at school scale |
| Plan review queue (per grade) | Active during term — 3–10 submissions at a time | Existing queue pattern handles this |

## URL / State Strategy

This app uses client-side `view` state, not URL routing. No URL changes for internal navigation.

**New state additions:**
- `AppView` union: add `"school-setup"` key
- `schoolSetupTab: "subjects" | "grade-levels" | "standard-sets" | "class-assignments"` — local state within `SchoolSetupView`
- `activeContext: { subjectId: string; gradeLevelId: string } | null` — stored in `localStorage` as `ct_active_context`, loaded on mount, synced via a new `useActiveContext` hook
- HOD grade filter: `activeGradeId: string` — local state within each HOD view that uses it; defaults to grade with most pending actions

**API routes to add (following existing `/api/admin/` pattern):**
```
POST   /api/admin/create-subject
DELETE /api/admin/delete-subject
POST   /api/admin/create-grade-level
DELETE /api/admin/delete-grade-level
POST   /api/admin/create-standard-set
POST   /api/admin/add-standard
DELETE /api/admin/delete-standard
POST   /api/admin/create-class-assignment
DELETE /api/admin/delete-class-assignment
PATCH  /api/admin/update-class-assignment   (is_lead toggle)
GET    /api/admin/list-subjects
GET    /api/admin/list-grade-levels
GET    /api/admin/list-standard-sets
GET    /api/admin/list-class-assignments
```
