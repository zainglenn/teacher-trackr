# Build Tasks: Multi-Subject School

Generated from: .design/multi-subject-school/DESIGN_BRIEF.md
IA: .design/multi-subject-school/INFORMATION_ARCHITECTURE.md
Date: 2026-05-28

---

## Foundation — Database & Types

- [x] **1. Supabase migration — school structure tables**: Write and apply a migration that adds `schools`, `subjects`, `grade_levels`, `standard_sets`, and `class_assignments` tables. Add `school_id` FK to `long_term_plans` and `standards`. Add `subject_id` FK to `profiles` (nullable — HOD scoping). Add `is_lead` boolean to `class_assignments`. Verify with `list_tables`. _New SQL migration. Existing tables: `profiles`, `long_term_plans`, `standards`._

- [x] **2. TypeScript types — new interfaces**: Add to `src/types/index.ts`: `School`, `Subject`, `GradeLevel`, `StandardSet`, `ClassAssignment`. Add optional `subject_id`, `grade_level_id`, `school_id` fields to `LongTermPlan`. Add optional `subject_id` to `Profile`. Keep all existing fields — additive only. _Modifies: `src/types/index.ts`._

- [x] **3. Subject slot color utility**: Create `src/lib/subjectSlot.ts` — exports `getSubjectSlotStyle(slot: 1 | 2 | 3 | 4 | 5 | 6)` returning `{ background, color, borderColor }` CSS-var strings, and `SUBJECT_SLOTS` constant. Also export a `SubjectBadge` component (`src/components/ltp/SubjectBadge.tsx`) that renders a pill using slot tokens — same structure as `StrandBadge`. _New files. References: `StrandBadge.tsx`, `globals.css` slot tokens._

---

## Data Layer — Hooks & API Routes

- [x] **4. Admin API routes — school setup CRUD**: Create route handlers under `src/app/api/admin/` for: `create-subject`, `delete-subject`, `create-grade-level`, `delete-grade-level`, `create-standard-set`, `add-standard`, `delete-standard`, `create-class-assignment`, `delete-class-assignment`, `update-class-assignment` (is_lead), `list-subjects`, `list-grade-levels`, `list-standard-sets`, `list-class-assignments`. Follow the existing pattern in `src/app/api/admin/create-user/route.ts` — service role client, auth check, typed request/response. _New files. Reuses: existing route pattern._

- [x] **5. `useSubjects` and `useGradeLevels` hooks**: Create `src/hooks/useSubjects.ts` and `src/hooks/useGradeLevels.ts`. Each fetches from Supabase, returns `{ data, loading, error, refetch }`. Used by School Setup admin view and the context switcher dropdown. _New files. Reuses: pattern from `useTeachers.ts`._

- [x] **6. `useClassAssignments` hook**: Create `src/hooks/useClassAssignments.ts` — fetches all class assignments for the current user (if teacher: their subject+grade combos; if HOD: their assigned subject with all grade levels). Returns `assignments: ClassAssignment[]`. Used by context switcher and HOD grade filter. _New file. Reuses: pattern from `useTeachers.ts`._

- [x] **7. `useActiveContext` hook**: Create `src/hooks/useActiveContext.ts` — manages `{ subjectId, gradeLevelId }` in `localStorage` under key `ct_active_context`. Returns `{ activeContext, setActiveContext, assignments }` (assignments from `useClassAssignments`). On mount: loads from storage, validates against current assignments, falls back to first assignment if stored value is stale. _New file._

- [x] **8. Update `useStandards` and `useLongTermPlans` for context scoping**: Modify `src/hooks/useStandards.ts` to accept an optional `standardSetId` param — when provided, filters to that set; when omitted, falls back to current behaviour. Modify `src/hooks/useLongTermPlans.ts` to accept optional `subjectId` and `gradeLevelId` params — scopes the fetched plans when provided. _Modifies: 2 existing hooks. Additive — no breaking changes._

---

## Core UI — Context Switcher (Risk First)

- [x] **9. `SubjectGradeContext` component**: Create `src/components/SubjectGradeContext.tsx`. Renders the context pill in the sidebar: `[Grade Level] · [Subject]` with a slot-colored left accent dot. When user has >1 assignment, adds a chevron and opens a dropdown (shadcn Popover) listing all assignments grouped by subject. Selecting an assignment calls `setActiveContext`. When user has exactly 1 assignment, renders as a static non-interactive label. Uses `useActiveContext` hook. _New component. Uses: Popover, SubjectBadge, useActiveContext._

- [x] **10. `AppSidebar` — add context switcher slot**: Modify `src/components/AppSidebar.tsx` — import `SubjectGradeContext`, render it in `SidebarHeader` below the app logo row, separated by a `SidebarSeparator`. Pass `role` so HODs get subject-only label (no grade-level switching in sidebar — grade switching is within views). Add `"school-setup"` to the `AppView` union type. Add nav item: `{ key: "school-setup", label: "School Setup", icon: Settings2, roles: ["admin"] }` positioned after `manage-users`. _Modifies: `AppSidebar.tsx`._

---

## Core UI — School Setup (Admin)

- [x] **11. `SchoolSetupView` shell + tab navigation**: Create `src/components/SchoolSetupView.tsx`. Uses `PageContainer` for layout. Renders a `Tabs` component (shadcn) with four tabs: Subjects, Grade Levels, Standard Sets, Class Assignments. Tab panels are empty placeholders initially — filled by subsequent tasks. Wire up `"school-setup"` AppView in `src/app/page.tsx`. _New component. Reuses: PageContainer, Tabs, shadcn._

- [x] **12. School Setup — Subjects tab**: Within `SchoolSetupView`, build the Subjects tab panel. Shows a table of existing subjects (name, slot colour swatch, created date, delete action). Below the table: an inline "Add Subject" form (text input + color slot auto-assigned + Save/Cancel). Delete shows a confirmation before removing. Uses `useSubjects` + admin API routes. _Modifies: SchoolSetupView. New inline form pattern._

- [x] **13. School Setup — Grade Levels tab**: Build the Grade Levels tab panel. Same structure as Subjects tab — list of grade levels with inline add form (name field, e.g. "Grade 6") and delete. No colour slots — grade levels are text only. Uses `useGradeLevels`. _Modifies: SchoolSetupView._

- [x] **14. School Setup — Standard Sets tab**: Build the Standard Sets tab panel. Two-part layout: (1) top: subject select + grade level select — selecting both reveals the assigned standard set for that combo. (2) bottom: standards table for the selected set — columns: Code, Strand, Description, Delete. "Add Standard" button opens an inline form: code, strand (select from fixed strand list), description. "Create Standard Set" appears when no set exists for the selected combo — prompts for a set name before adding standards. Uses `useSubjects`, `useGradeLevels`, admin API routes. _Modifies: SchoolSetupView. Most complex tab._

- [x] **15. School Setup — Class Assignments tab**: Build the Class Assignments tab panel. Two-part layout: (1) subject + grade level selector; (2) list of teachers assigned to that combo — name, Lead badge (if is_lead), Remove button, toggle Lead button. "Add Teacher" button opens a select of existing teacher profiles not yet assigned to this combo. Uses `useTeachers`, `useClassAssignments`, admin API routes. _Modifies: SchoolSetupView._

---

## HOD Grade Filter

- [x] **16. `GradeFilter` component**: Create `src/components/GradeFilter.tsx`. On desktop (≥768px): renders as a tab row (`Tabs` variant, compact). On mobile: renders as a `Select` dropdown. Accepts `grades: GradeLevel[]`, `activeGradeId: string`, `onChange: (id: string) => void`. Default selection logic: first grade with pending submissions; fallback to first grade alphabetically. _New component. Reuses: Tabs, Select, shadcn._

- [x] **17. Apply `GradeFilter` to HOD views**: Add the `GradeFilter` component to the top of: `HODReviewView.tsx`, `DashboardView.tsx` (HOD branch), `DeliveryGridView.tsx`, `CoverageView.tsx` (HOD branch). Each view holds local `activeGradeId` state and passes it down to filter the data it renders. Uses `useGradeLevels` to get available grades for the HOD's subject. _Modifies: 4 existing views._

---

## Context Scoping — Teacher & HOD Views

- [ ] **18. Scope teacher views to active context**: Pass `activeContext` from `useActiveContext` into `LongTermPlanView`, `CoverageView` (teacher branch), and `StudentProgressView`. Each view shows a context label in its page header (`Grade 6 · English`). Plan lists and coverage data filter to the active `subjectId` + `gradeLevelId`. If no context is set (new user with no assignments), show an empty state: "No classes assigned — contact your administrator." _Modifies: 3 existing views._

- [ ] **19. Update `ManageUsersView` — HOD subject assignment**: Add a Subject column to the users table for HOD-role rows. Inline edit: clicking the subject cell opens a select of available subjects; saving calls `update-user` API route with the new `subject_id`. _Modifies: `ManageUsersView.tsx` and `src/app/api/admin/update-user/route.ts`._

---

## Responsive & Polish

- [ ] **20. Mobile responsive pass**: Verify at 375px: context switcher pill truncates gracefully (grade+subject abbreviated or icon-only), grade filter tabs collapse to select dropdown (already handled in `GradeFilter` component), School Setup tabs scroll horizontally, standard sets table scrolls horizontally. Fix any overflow. _Breakpoints: 375px, 768px._

- [ ] **21. Accessibility pass**: Context switcher dropdown: `aria-expanded`, `aria-haspopup="listbox"`, keyboard navigation (arrow keys to move, Enter to select, Escape to close). School Setup Tabs: `role="tablist"`, `role="tab"`, `aria-selected`, `role="tabpanel"`. All new form inputs: `<label>` association, `aria-describedby` for errors. Grade filter tabs: same keyboard pattern. _Checks: keyboard nav, focus ring visibility, screen reader labels._

- [ ] **22. Update seed script for multi-subject DSK data**: Update `scripts/seed-sample-school.mjs` to seed: 1 school record (Dubai Schools Al Khawaneej), 1 subject (English, slot 1), 3 grade levels (Grade 6, Grade 7, Grade 8), 1 standard set (NYSED Grade 6 ELA — 41 standards already in DB), class assignments (Jade → G6 English lead, Marcus → G6 English, Priya → G6 English), HOD subject assignment (Sarah Mitchell → English). All existing LTP data remains — just linked to new subject/grade FK values. _Modifies: `scripts/seed-sample-school.mjs`._

---

## Review

- [ ] **23. Design review**: Run `/design-review` against `.design/multi-subject-school/DESIGN_BRIEF.md`. Check: context switcher aesthetic matches sidebar style, subject slot colors render correctly in light + dark, School Setup clinical tone vs teacher view warmth, grade filter tab/select responsive swap, empty states for unassigned users.
