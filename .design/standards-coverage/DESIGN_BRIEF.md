# Design Brief: Standards Coverage — Delivery-Driven Redesign

## Problem

The current Standards Coverage page is disconnected from everything a teacher has already done in My Class. A teacher who has diligently marked every week as taught sees 0% coverage here, because coverage is tracked in a completely separate manual table. To register progress they would need to click into each of 41 standards, then click each of ~135 individual sub-skills and enter a date — entirely separate work they never knew was required.

The result: the page is useless as a progress view, confusing as a planning tool, and misleading as a compliance check.

## Solution

Recompute coverage automatically from what teachers have already done in My Class. When a teacher marks all weeks of a unit as taught, every standard mapped to that unit is considered covered — no second step, no separate log.

The page becomes a read-oriented view: teachers glance at it to understand their curriculum compliance picture, not to do more administrative work. A new four-state status model (Covered / In Progress / Planned / Gap) tells the real story. "Gap" — standards not mapped to any unit at all — becomes the key alert because those are the ones that might not get taught.

The drill-in view for a standard no longer asks teachers to manually record dates. Instead it shows which unit contains the standard, how much of that unit has been taught, and what the sub-skills are.

## Experience Principles

1. **Derived from work already done, not extra work** — Coverage is computed from My Class delivery + LTP mapping. No double-entry. If the teacher hasn't done anything extra, that's fine — the page still shows their real status.

2. **Gaps over counts** — A coverage percentage is less useful than knowing which specific standards have no unit plan at all. The page surfaces these prominently rather than burying them in a table.

3. **Four honest states over two misleading ones** — Covered / In Progress / Planned / Gap is more truthful than the binary Covered / Not Covered. A standard that is planned but not yet taught is categorically different from one that isn't in the plan at all.

## Aesthetic Direction

- **Philosophy**: Calm utility — Notion/Linear. Same as My Class. This is a reference view, not an action-heavy page.
- **Tone**: Clear, informative, low-anxiety. Coverage gaps should be visible but not alarming — they're a planning signal, not a failure state.
- **Reference points**: Linear's issue lists (status filters, clean table rows). Notion's database views (muted headers, readable rows). The My Class swim lane view already in this app.
- **Anti-references**: Red dashboards that feel like a compliance audit. Dense Excel-style tables. Analytics tools that bury the signal in charts.

## Existing Patterns

- **Typography**: System font stack via shadcn defaults. `text-xs uppercase tracking-wide` for metadata labels. `text-sm` for table content. `text-base font-semibold` for headings.
- **Colors**: Full set of `--status-*` and `--strand-*` tokens already defined. Status tokens map cleanly to the four states: `--status-taught-*` (Covered, green), `--status-behind-*` (In Progress, amber), `--status-pending-*` (Planned, neutral), `--status-overdue-*` (Gap, red).
- **Spacing**: Tailwind 4px-base scale throughout. Cards use `p-4` or `p-5`. Table rows use `px-4 py-3`.
- **Components**: `Card`, `Badge`, `Progress`, `Select`, `Skeleton`, `StrandBadge` — all in use in the current CoverageView and reusable as-is.

## Component Inventory

| Component | Status | Notes |
|---|---|---|
| `CoverageView.tsx` | Modify | Replace `useSkillCoverage` with new delivery-computed hook. New four-state status model. New header section with gap alerts. |
| `useCoverageFromDelivery` | New | Core hook: queries `class_lesson_deliveries` + `ltp_unit_standards` + `standard_skills`. Returns per-standard status and covered skill IDs. |
| `StandardContextView` | Modify (`StandardDetailView.tsx`) | Remove manual skill-marking workflow. Add unit delivery progress context. Show skills as read-only list with covered/not status derived from delivery. |
| Strand summary cards | Exists | Already in CoverageView. Keep visual pattern, wire to new hook data. |
| Gap alert banner | New | Inline alert shown when unmapped standards exist. "X standards have no unit plan." with filter link. Dismisses if user filters to gap view. |
| Status badge | Exists | Current `inline-flex` pill. Add `Planned` state using `--status-pending-*`. Rename `Not Covered` → `Gap` with `--status-overdue-*` when standard is unmapped. |
| `DepartmentCoverageGrid` | Modify | HOD view: wire to new department-level delivery hook. Keep teacher cards. |
| `StrandBadge` | Exists | No change. |
| `Progress`, `Card`, `Badge`, `Skeleton` | Exists | No change. |

## Key Interactions

**Page load (teacher)**
- Teacher opens Standards Coverage.
- If any standards are unmapped (gap), a non-dismissable alert banner appears below the page header: _"X standards have no unit plan. These may not be taught this year."_ with a "Show gaps" filter button.
- Strand summary cards display each strand's real coverage percentage (derived from delivery).
- The full standards table loads below, defaulting to showing all 41 standards.

**Status filter tabs**
- Tabs: All / Covered / In Progress / Planned / Gap.
- Tab counts update in real time as delivery data loads.
- Selecting "Gap" filters the table to unmapped standards only. This is the most actionable view for a teacher who needs to update their LTP.

**Strand card click**
- Clicking a strand card applies a strand filter to the table. The card shows a ring/border to indicate it's active. Clicking again deselects.

**Standard row click → context view**
- Clicking any row slides in (or navigates to) `StandardContextView`.
- Shows: standard code + full description at the top.
- Below that: the unit(s) this standard belongs to, with a mini delivery progress bar per unit (e.g., "Unit 2 — Personal Narrative: 3/6 weeks taught").
- Below that: a read-only list of the standard's skills, each marked covered ✓ or not, derived from unit delivery status.
- A "Go to unit plan" link navigates to that unit in LTPDetailView.
- If standard is a Gap (no unit), the context view shows only the skills list and a prompt: "Add this standard to a unit to start tracking coverage."

**HOD view**
- Teacher selector → shows that teacher's delivery-computed coverage.
- "All Teachers" → `DepartmentCoverageGrid` showing per-teacher summary cards and a unified table.

## Responsive Behavior

**Desktop (1280px+)**
- Full layout: strand summary cards in a 5-column grid, full table with all columns, sidebar (Overall %, gap list, HOD Readiness ring).

**Tablet (768px)**
- Strand cards collapse to 2–3 columns. Skills and Coverage columns hidden in table. Sidebar hidden; summary cards carry the load.

**Mobile (375px)**
- Strand cards hidden (or collapsed to a horizontal scroll strip).
- Table shows: Standard code | Description | Status only.
- Gap alert banner is the primary above-fold content.
- StandardContextView: full-width sheet from bottom (same pattern as WeekDetailSheet in My Class).

## Accessibility Requirements

- Status badges must meet WCAG AA contrast (4.5:1) in both light and dark mode. All four states already use tokens validated in the My Class review.
- Table rows must be keyboard-navigable (`tabIndex={0}`, `role="row"`, `onKeyDown` Enter/Space opens context view).
- Strand card filter buttons: `aria-pressed` to indicate active state.
- Gap alert banner: `role="alert"` so screen readers announce it on page load.
- `prefers-reduced-motion`: all transitions already guarded by the global rule added in the My Class review.
- Focus management: when context view opens, focus moves to its heading; when closed, focus returns to the triggering row.

## Out of Scope

- The `skill_coverage` table and manual skill-marking workflow. This data is not deleted — the table stays — but it is no longer queried or written by this view. Deprecate silently.
- Student-level coverage (which students have been assessed on which standard). That belongs in Student Progress.
- Editing standards or skills. This is a read-only view derived from external data.
- The `useSkillCoverage`, `markSkill`, `unmarkSkill` functions. They remain in the codebase but are no longer called from CoverageView or StandardContextView.
- Notifications or email alerts when coverage drops below a threshold. Future scope.
