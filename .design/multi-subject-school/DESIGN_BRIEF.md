# Design Brief: Multi-Subject School

## Problem

A teacher at a real school teaches more than one class. An HOD oversees more than one year group. Right now the app locks everyone into Grade 6 English — a teacher with two classes has no way to separate their work, and an HOD promoting to a second grade has nowhere to go. The app feels like a prototype of a real tool rather than the real tool.

## Solution

Introduce a subject+grade context layer that sits above the existing planning and review surfaces. A teacher switches context to see their Grade 7 English plan, their Grade 6 English plan, or any other assignment — without the underlying views changing. An HOD does the same within their subject. An admin configures the school's structure (subjects, grades, standard sets) in a dedicated setup area. The planning, review, and delivery surfaces remain unchanged — only the scope of what they show adapts to context.

## Experience Principles

1. **Context clarity over navigation depth** — A user should always know exactly which subject+grade they are looking at. The context switcher is persistent and prominent. Never bury the current context in a breadcrumb that disappears on scroll.

2. **Structure for admins, warmth for teachers** — Admin and school setup screens earn a clinical, form-driven aesthetic: this is configuration work that rewards precision. Teacher and HOD screens stay warm and human. The same token system, different emotional register.

3. **Additive, not disruptive** — Teachers who currently have one assignment see no change to their workflow. The context switcher only appears when a user has more than one assignment. New surfaces (school setup, standards management) are isolated from existing flows.

## Aesthetic Direction

- **Philosophy**: Enterprise-lite — clinical precision with warm human touches. Existing philosophy unchanged; admin surfaces lean toward the clinical end.
- **Tone**: Calm and organised for teachers. Confident and structured for HODs. Precise and form-driven for admin setup screens.
- **Reference points**: Linear's workspace switcher for the context switcher pattern. Notion's settings sidebar for the School Setup section layout. The existing app for all planning/review surfaces.
- **Anti-references**: Onboarding wizards with too many steps. Nested navigation that requires multiple clicks to change context.

## Existing Patterns

- **Typography**: Geist Sans, OKLCH tokens — `--font-size-*`, `--font-weight-*`, `--line-height-*`
- **Colors**: Full OKLCH token system in `globals.css` — primary hue 264 (indigo-blue), strand colors (RL=blue, RI=violet, W=amber, SL=emerald, L=rose), status tokens (taught/behind/overdue/pending), term accent tokens
- **Spacing**: 4px base unit via `--space-*` tokens; use Tailwind v4 classes (`p-4`, `gap-3`, etc.)
- **Radius**: `--radius` = 0.5rem, extended via `--radius-sm/md/lg/xl`
- **Shadows**: `--shadow-sm/md/lg`
- **Components**: shadcn/ui base (Button, Input, Select, Dialog, Badge, Card, Separator, Sheet), AppSidebar, StatCard, PageContainer, HODReviewView, LTPDetailView, UnitPlanView, DeliveryGridView, ManageUsersView

## Data Model Changes

These changes underpin every UI surface in this feature:

```
schools           — id, name, school_id (multi-tenancy anchor)
subjects          — id, school_id, name (e.g. "English", "Mathematics")
grade_levels      — id, school_id, name (e.g. "Grade 6", "Grade 7")
standard_sets     — id, school_id, subject_id, grade_level_id, name
standards         — id, standard_set_id, code, description, strand
profiles          — + subject_id (for HOD role scoping)
class_assignments — id, teacher_id, subject_id, grade_level_id, school_id, is_lead
long_term_plans   — + subject_id, grade_level_id, school_id
```

`school_id` is present on all root tables from day one. Multi-school UI is deferred.

## Component Inventory

| Component | Status | Notes |
|---|---|---|
| `SubjectGradeContext` | New | Context switcher in sidebar — shows current subject+grade, dropdown to switch. Hidden when user has only one assignment. |
| `AppSidebar` | Modify | Add `SubjectGradeContext` below the user identity area. All nav items filter to active context. |
| `SchoolSetupView` | New | Sidebar section for admin. Tabbed: Subjects, Grade Levels, Standard Sets, Assignments. |
| `SubjectList` | New | Admin table — list of subjects with edit/delete. |
| `GradeLevelList` | New | Admin table — list of grade levels with edit/delete. |
| `StandardSetManager` | New | Admin view — assign a standard set to a subject+grade combo, import/manage standards within it. |
| `ClassAssignmentManager` | New | Admin view — assign teachers to subject+grade combos, set is_lead flag. |
| `HODSubjectGradeFilter` | New | Grade switcher in HOD review/admin views. Same visual pattern as `SubjectGradeContext` but scoped to subject, switches grade level only. |
| `ManageUsersView` | Modify | Add subject assignment column for HOD role. |
| `LongTermPlanView` | Modify | Scope plan list to active subject+grade context. |
| `HODReviewView` | Modify | Add grade switcher; filter review queue by grade. |
| `DeliveryGridView` | Modify | Scope delivery grid to active context. |
| `DashboardView` | Modify | Show context-aware stats (plans, coverage, status for active subject+grade). |

## Key Interactions

**Context switching (teacher/HOD)**
- Sidebar shows current context as a pill: `[subject icon] Grade 6 · English ▾`
- Click opens a dropdown listing all the user's assignments
- Selecting a new context immediately re-renders the main view with the new scope
- Selected context persists in `localStorage` across sessions
- If user has only one assignment, the pill is static (no dropdown, no chevron)

**Admin school setup flow**
1. Admin navigates to School Setup in sidebar (separate from existing Admin section)
2. Creates subjects (e.g., English, Mathematics, Science)
3. Creates grade levels (e.g., Grade 6, Grade 7, Grade 8)
4. Creates a standard set per subject+grade combo — either imports standards via CSV or adds them manually
5. Assigns HODs to subjects (from Manage Users or from School Setup)
6. Assigns teachers to subject+grade combos, optionally marking one as lead

**HOD grade switching**
- HOD sees a grade filter tabs or dropdown at the top of their review/admin views
- Default: most urgent grade (has pending submissions or overdue plans)
- Switching grade re-filters the review queue and coverage view inline — no full page reload feel

**Lead teacher indicator**
- In any list of teachers within a subject+grade, the lead teacher has a small `Lead` badge next to their name
- No functional difference — purely organisational/display

## Responsive Behavior

- **Context switcher**: Full pill label on desktop (`Grade 6 · English`), icon-only on mobile with label in dropdown
- **School Setup**: Two-panel layout on desktop (sidebar nav + content); single panel with back navigation on mobile
- **HOD grade filter**: Tab row on desktop; select dropdown on mobile (same pattern as existing strand filter in CoverageView)
- **Class assignment table**: Horizontal scroll on mobile; full columns on desktop

## Accessibility Requirements

- Context switcher dropdown: keyboard navigable, `aria-expanded`, `aria-haspopup="listbox"`, focus trap when open
- School Setup tabs: `role="tablist"` / `role="tab"` / `role="tabpanel"` with `aria-selected`
- All new form inputs: associated `<label>`, error messages via `aria-describedby`
- Grade filter: same keyboard pattern as existing strand filter
- Contrast: all new surfaces must meet WCAG AA (4.5:1 body text, 3:1 large text) — use existing OKLCH tokens, do not introduce hardcoded values

## Out of Scope

- Multi-school UI (school switcher, school onboarding flow) — `school_id` is in the data model but the UI assumes a single school
- Standards import via CSV — manual entry only for now
- HOD managing their own subject assignment — admin-only action
- Teacher requesting a new class assignment — admin-only action
- PPT generation scoped to subject+grade — deferred
- Student progress scoped to subject+grade — deferred
