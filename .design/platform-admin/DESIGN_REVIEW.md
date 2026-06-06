# Design Review: Platform Curricula

Reviewed against: architecture change (standard_sets → platform-level) dated 2026-06-04
Date: 2026-06-04

## Screenshots Captured

| Screenshot | Breakpoint | Description |
|---|---|---|
| `screenshots/review-platform-schools-desktop-1280.png` | Desktop 1280×800 | Platform admin Schools tab with new tab switcher |
| `screenshots/review-curricula-empty-desktop-1280.png` | Desktop 1280×800 | Curricula tab — list of all platform standard sets |
| `screenshots/review-curricula-create-form-desktop-1280.png` | Desktop 1280×800 | New Curriculum creation form open |
| `screenshots/review-curricula-expanded-desktop-1280.png` | Desktop 1280×800 | Curriculum row expanded showing standards table + Add Standard |
| `screenshots/review-curricula-add-standard-form-desktop-1280.png` | Desktop 1280×800 | Add Standard inline form open |
| `screenshots/review-school-standard-sets-empty-desktop-1280.png` | Desktop 1280×800 | School Setup → Standard Sets tab, no selection |

> Note: The library state (subject + grade selected) was assessed via accessibility snapshot due to Playwright font-load timeout in this session.

---

## Summary

The migration is technically sound — ran cleanly, platform admin Curricula tab works, the school-side subscription flow works end-to-end. The main problem is functional: when a school admin selects a subject and grade level, the library shows all 111+ platform curricula completely unfiltered. An admin looking for "English Grade 6" has to scroll past Arabic, Computer Technology, Islamic Education, Maths, Music, PE, Science, and Social Studies to find it. This needs fixing before the feature is usable. The delete-without-confirmation issue is a data-integrity risk.

---

## Must Fix

### 1. Library is not filtered — school sees all 111 curricula regardless of subject/grade

**File:** `src/components/SchoolSetupView.tsx` — `StandardSetsTab`

`platformSets` is loaded once on mount with no params (`/api/admin/list-standard-sets`), so selecting "English / Grade 6" shows the entire unfiltered list of 111+ sets. The school admin has to manually scroll to find the relevant entry.

Filtering by `subject_label` server-side won't reliably work either because school subject names ("English") don't necessarily match platform labels ("English Language Arts"). The correct fix is client-side text search.

_Fix:_ Add a `filterQuery` state and filter `platformSets` in the render against `set.name + set.subject_label + set.grade_label`. A small search input above the list is enough — no API change needed.

---

### 2. Delete standard set has no confirmation

**File:** `src/components/PlatformAdminView.tsx` — `CurriculaTab`, `handleDeleteSet`

The trash button calls `handleDeleteSet` immediately. Deleting a set cascades to all its standards and silently breaks any `school_curricula` assignments. With 111 sets already in the DB a misclick causes irreversible data loss.

_Fix:_ Use the existing `ConfirmModal` component (already imported in this file) before executing the delete. The school suspension flow is the right model — show what will be deleted and require an explicit confirmation.

---

## Should Fix

### 3. Duplicate description text on Curricula tab

**File:** `src/components/PlatformAdminView.tsx` — `CurriculaTab`

PageContainer `description`: *"Platform-managed standard sets available to all schools"*
Inline paragraph: *"Platform-managed standard sets. Schools choose from this library in their setup."*

These say the same thing twice.

_Fix:_ Remove the inline `<p>` from `CurriculaTab`. The PageContainer description covers it.

---

### 4. Add Standard form uses a native `<select>` for strand

**File:** `src/components/PlatformAdminView.tsx` — `CurriculaTab` inline form

Every other dropdown in the app uses shadcn `Select`. The inline add-standard form uses a native HTML `<select>` — different height, border style, and font rendering to the rest of the UI (visible in `review-curricula-add-standard-form-desktop-1280.png`).

_Fix:_ Replace with shadcn `Select` / `SelectTrigger` / `SelectContent` / `SelectItem`. Five options: `RL`, `RI`, `W`, `SL`, `L`.

---

### 5. No standard count on collapsed curriculum rows

**File:** `src/components/PlatformAdminView.tsx` — `CurriculaTab`

Collapsed rows show name and subject/grade labels only. There is no way to tell at a glance whether a set has 0 or 41 standards without expanding it.

_Fix:_ Add a `standards_count` to the GET `/api/platform/curricula` response using Supabase's aggregation (`.select('*, standards(count)')`), then render it as a muted badge on each row.

---

### 6. "Platform Admin" nav item label still says "Schools"

**File:** `src/components/AppSidebar.tsx`

The sidebar nav item label is "Schools" but the view now contains both Schools and Curricula as sub-tabs. Clicking to the Curricula tab changes the page title but the nav label stays "Schools".

_Fix:_ Rename the sidebar nav item to "Platform" or "Admin Console" to reflect that it's a container for multiple sections, not just school management.

---

## Could Improve

### 7. Library list has no subject grouping

With 111 items in name-alphabetical order, the list is hard to scan. Grouping rows under subject-label headers ("Arabic Language", "English Language Arts", etc.) would make it navigable without a search input.

### 8. "Use this" button is generic

Every row says "Use this" with no context. "Assign" is a stronger verb, and making the full row clickable (or using a radio-style selection) would feel more deliberate for an action this consequential.

### 9. Empty state on Curricula list lacks an icon

When no curricula exist, the placeholder is plain text. The rest of the app uses icon + text for empty states (e.g. `ClipboardCheck` in HOD Review, `Building2` in Platform Admin schools). A `BookOpen` icon here would be consistent.

---

## What Works Well

- **Tab switcher** is clean — the icon+label button group reads immediately as sub-navigation, and the active state (filled background) is unambiguous.
- **Expand/collapse per row** with an inline standards table avoids a separate page/modal for what is primarily a list-editing pattern. The chevron toggle is intuitive.
- **School Setup three-state flow** (loading → assigned with read-only table → unassigned with library) is logically correct. The "Remove" button placement and styling (rose/destructive outline) is appropriately weighted.
- **Migration** was clean: backfilled labels from existing FK data before dropping the columns, and the `school_curricula` RLS policies are correctly scoped by `school_id`.
- **Architecture** eliminates the core problem entirely — one source of truth for all standard sets, zero per-school duplication, no AI credits wasted on regenerating the same content.
