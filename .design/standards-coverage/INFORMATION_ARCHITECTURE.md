# Information Architecture: Standards Coverage — Delivery-Driven Redesign

Reviewed against: `.design/standards-coverage/DESIGN_BRIEF.md`
Date: 2026-05-26

---

## Site Map

The app is a SPA. There are no URLs beyond `/`. Navigation is managed via a `view` state string in `src/app/page.tsx`. The Standards Coverage feature occupies `view === "coverage"`.

```
App (view state)
└── Standards Coverage  (view = "coverage")
    ├── Coverage index             — strand cards + gap alert + standards table
    │   ├── Filter: All Standards
    │   ├── Filter: Covered
    │   ├── Filter: In Progress
    │   ├── Filter: Planned
    │   └── Filter: Gap
    └── Standard context view      — replaces table; shows unit delivery + skills
        └── [back] → Coverage index

HOD variant
└── Standards Coverage  (view = "coverage", isHod = true)
    ├── Teacher selector           — Select dropdown to switch between teachers
    ├── "All Teachers" aggregate   — DepartmentCoverageGrid
    └── Per-teacher view           — same as teacher Coverage index
```

---

## Navigation Model

- **Primary navigation**: App sidebar (`AppSidebar.tsx`) — 4 items for teachers: My Class, Standards Coverage, Master Plans, Student Progress. HODs have additional entries. No change to this layer.
- **Secondary navigation (within Coverage)**: Status filter tabs — All Standards / Covered / In Progress / Planned / Gap. Tabs are the primary content filter and should be the first interactive element below the gap alert. They replace the current All / Covered / Partial / Not Covered set.
- **Strand filter**: Clicking a strand summary card applies a secondary filter to the table. Card shows `aria-pressed` state. Clicking an active card deselects. This is a complement to the status tabs, not a replacement.
- **Utility navigation**: The "Go to unit plan" link inside `StandardContextView` exits the coverage view and opens the LTP detail. Implemented by calling `onNavigateToUnit` or `setView("long-term-plan")` — same pattern as My Class.
- **Mobile navigation**: Sidebar collapses to hamburger (existing behaviour). `StandardContextView` opens as a bottom sheet on mobile (side="bottom", max-h-[88vh]) rather than replacing the full page — matches the WeekDetailSheet pattern in My Class.

---

## Content Hierarchy

### Coverage Index (teacher view)

1. **Gap alert banner** — First thing the teacher should see if any standards have no unit plan. These are the only true gaps in curriculum planning. Appears above everything else; visually distinct (rose-tinted, `role="alert"`). Hidden when gap count is 0.
2. **Overall coverage stat + strand summary cards** — The "how am I doing overall?" answer. Five cards, one per strand, each with a progress bar. These give orientation before the detail.
3. **Status filter tabs** — The primary navigation within the table. The teacher uses these to drill into a specific coverage state: what's covered, what's planned, what's a gap.
4. **Standards table** — The full 41-row detail. Every standard, its status, its unit delivery progress. The teacher reads this to find specific standards or scan for patterns.
5. **Right sidebar** — Overall percentage + gap list + HOD Readiness ring. Secondary context for the teacher; hidden on mobile. This is reference information, not primary.

### Coverage Index (HOD view)

1. **Teacher selector** — The HOD must pick a teacher (or "All Teachers") before any data is meaningful. Shows first.
2. **Department summary / per-teacher summary cards** — Whether showing all teachers or one, these cards give the top-level answer.
3. **Status filter tabs + table** — Same as teacher view, but data is filtered by selected teacher.
4. **Right sidebar** — Teacher readiness breakdown + top gaps. Most useful in the "All Teachers" aggregate view.

### Standard Context View (desktop, full-page replace)

1. **Back button + standard identity** — Code badge + full description. Teacher needs to know immediately which standard they opened.
2. **Unit delivery context** — Which unit(s) contain this standard, how far along that unit is (delivered / total weeks). This is the core new content — it answers "when will this be covered?"
3. **Gap prompt** — Only shown for Gap standards. Clear CTA: "Add to a unit plan."
4. **Skills list** — Read-only. Shows all sub-skills with a ✓ or ○ icon based on unit delivery status. Lower priority than the unit context.

### Standard Context View (mobile, bottom sheet)

Same hierarchy, but the sheet's scroll area means items 2–4 are below the fold on first open. The unit delivery context is the most important item and should not be truncated.

---

## User Flows

### Flow 1: Teacher checks overall coverage (most frequent)
1. Teacher clicks "Standards Coverage" in sidebar.
2. Page loads. If gaps exist, alert banner appears at top immediately.
3. Teacher reads the overall % and strand cards to get orientation.
4. Teacher optionally clicks "Gap" tab or "Show gaps" link in banner to see unmapped standards.
5. Teacher decides: update LTP (navigate to Master Plans) or continue reviewing.

### Flow 2: Teacher investigates a specific standard
1. Teacher is on the Coverage index, any filter active.
2. Teacher clicks a standard row (or presses Enter/Space on keyboard).
3. On desktop: table is replaced by `StandardContextView` for that standard.
   On mobile: `StandardContextView` opens as a bottom sheet.
4. Teacher reads which unit covers the standard and how much has been delivered.
5. Teacher optionally clicks "Go to unit plan" → navigates to `view = "long-term-plan"` with that unit pre-selected.
6. Teacher clicks back (or closes sheet on mobile) → returns to Coverage index with previous filter intact.

### Flow 3: HOD checks teacher readiness
1. HOD opens Standards Coverage. Teacher selector appears at top.
2. HOD selects a teacher → page shows that teacher's delivery-computed coverage.
3. HOD reviews coverage state: checks if any standards are in "Gap" or "In Progress" late in the year.
4. HOD may click individual standard rows to see which unit is behind.
5. HOD switches back to "All Teachers" to see department aggregate.

### Flow 4: Teacher resolves a gap
1. Teacher sees gap alert banner: "3 standards have no unit plan."
2. Teacher clicks "Show gaps" → table filters to Gap status.
3. Teacher clicks a gap standard → `StandardContextView` opens showing "not mapped to any unit" + prompt.
4. Teacher clicks "Go to unit plan" → arrives at LTP detail view.
5. Teacher adds the standard to a unit → saves.
6. Teacher navigates back to Standards Coverage → gap count decrements.

---

## Naming Conventions

| Concept | Label in UI | Notes |
|---|---|---|
| A standard fully delivered | Covered | Unit is fully taught (all weeks). Green. |
| A standard in a started-but-unfinished unit | In Progress | Unit has some weeks taught. Amber. |
| A standard in an unstarted unit | Planned | Unit is in the LTP but not yet taught. Neutral grey. |
| A standard in no unit at all | Gap | Needs planning attention. Rose/red. Not "Not Covered" — that implies it was supposed to be covered and wasn't. |
| Sub-components of a standard | Skills | Used only in `StandardContextView`. Not surfaced in the main table. |
| The unit delivery fraction | `N/M weeks taught` | Not "progress" (too vague) or "completion" (implies finality). |
| The overall percentage | Coverage | "X% covered" in the header. "Coverage" on the sidebar nav item. |

---

## Component Reuse Map

| Component | Used on | Behaviour differences |
|---|---|---|
| `PageContainer` | Coverage index | No changes — same header pattern as all views. |
| `StrandBadge` | Standards table rows, `StandardContextView` | No changes. |
| `Badge variant="outline"` | Status badges, strand labels | Four states vs. current three. |
| `Sheet` / `SheetContent` | `StandardContextView` on mobile | `side="bottom"`, `max-h-[88vh]`, `rounded-t-2xl` — same pattern as `WeekDetailSheet` in My Class. |
| `Progress` | Strand cards, coverage bar in table rows, unit delivery bar in `StandardContextView` | No component changes, just different data. |
| `Skeleton` | Loading state | Lane-shaped instead of card-shaped. |
| `Select` (teacher picker) | HOD header | No changes. |
| `useIsMobile` | `StandardContextView` | Already in project. Determines sheet vs. full-page mode. |

---

## Content Growth Plan

The standards list is fixed (41 NYSED Grade 6 ELA standards). It does not grow.

The only content that grows is `class_lesson_deliveries` — one row per taught week, per class. This is already low-cardinality (max ~9 units × ~6 weeks × number of classes). No pagination needed.

For HOD view: teacher count could grow. If the department expands beyond ~10 teachers, the teacher summary card grid would need a scroll or a list pattern. Current 4-column grid handles up to ~12 cards cleanly.

---

## URL Strategy

No URLs are used. All navigation is via the `view` state variable in `src/app/page.tsx`.

The `StandardContextView` is not addressable — it is a drill-in state within the coverage view, not a separate page. If deep-linking to a specific standard is needed in the future, it would require adding `initialStandardId` as a prop to `CoverageView` (same pattern as `initialPlanId`/`initialUnitId` in `LongTermPlanView`). This is out of scope for this feature.

Filter state (active status tab, active strand) is not persisted in the URL. It resets on every page load. Future enhancement: `sessionStorage` persistence so the filter survives navigation to `StandardContextView` and back.
