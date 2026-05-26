# Build Tasks: Standards Coverage — Delivery-Driven Redesign

Generated from: `.design/standards-coverage/DESIGN_BRIEF.md`
Date: 2026-05-26

---

## Foundation

- [ ] **`useCoverageFromDelivery` hook** — Build the new data engine that replaces `useSkillCoverage`. The hook takes `(teacherId: string, classId: string | null)` and: (1) loads the class's `ltp_id` from `ext_classes`; (2) queries `ltp_units` with `ltp_unit_standards(standard_id)` for that LTP; (3) queries `class_lesson_deliveries` for the class; (4) computes per-standard status: `covered` (unit `duration_weeks` === delivered count), `in_progress` (1 ≤ delivered < `duration_weeks`), `planned` (standard mapped to a unit, 0 weeks delivered), `gap` (standard not in any unit); (5) returns `statusByStandardId: Map<string, StandardDeliveryStatus>`, `coveredSkillIds: Set<string>` (skills of fully-covered standards), and `loading: boolean`. Done when the hook returns correct status for all four states given real delivery data. _New hook in `src/hooks/useCoverageFromDelivery.ts`. No render changes yet._

  ```typescript
  // Target return shape
  export type StandardDeliveryStatus = {
    status: 'covered' | 'in_progress' | 'planned' | 'gap';
    unitId?: string;
    unitTitle?: string;
    term?: number;
    deliveredWeeks: number;
    totalWeeks: number;
  };
  ```

---

## Core UI

- [ ] **Coverage page header: overall stat + gap alert banner** — Add a new header section inside `CoverageView`'s `CoverageGrid` above the strand cards. Contains: (a) a large `text-4xl font-bold` overall coverage percentage (covered standards ÷ total mapped standards); (b) a gap alert `div` — only visible when `gapCount > 0` — styled with `bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-center gap-3` showing `AlertTriangle` icon + _"X standards have no unit plan — they may not be taught this year."_ + a `text-sm font-medium text-rose-700 underline cursor-pointer` link that sets `statusFilter` to `'gap'`. Done when the header renders with correct count and clicking the link scrolls to / filters the table. _Modifies: `CoverageView.tsx` → `CoverageGrid`. Reuses: `AlertTriangle` from lucide-react, `--status-overdue-*` tokens._

- [ ] **Strand summary cards rewire** — Replace the `useSkillCoverage`-based stats in the five strand cards with stats from `useCoverageFromDelivery`. Each card should show: covered standards count (status = `covered`) out of total for that strand, and a progress bar reflecting that ratio. No visual change to the card component itself — only the data source changes. Done when cards show correct per-strand covered/total counts matching delivery data. _Modifies: `CoverageView.tsx` → `strandStats` memo. Reuses: existing strand card buttons unchanged._

- [ ] **Standards table: 4-state status badges** — Replace `useSkillCoverage` in `CoverageGrid` with `useCoverageFromDelivery`. Add the `planned` status badge (neutral, using `--status-pending-*` tokens). Rename `not_covered` → `gap` and restyle using `--status-overdue-*` tokens. Update tab labels: _All Standards / Covered / In Progress / Planned / Gap_ (was: All / Covered / Partial / Not Covered). Remove the "Skills" column (`covered/total` fraction) since that was based on manual skill tracking — replace with a mini unit delivery bar in the Coverage column: `deliveredWeeks/totalWeeks` fraction + progress bar. Done when table shows all four states with correct styling and tab counts are accurate. _Modifies: `CoverageView.tsx` → `CoverageGrid` table. Reuses: `StrandBadge`, `STRAND_PROGRESS_COLOR`, `Progress`._

- [ ] **`StandardContextView` — replaces `StandardDetailView` drill-in** — Rewrite the detail view shown when a teacher clicks a standard row. New content (in a full-page view replacing the table, same `onBack` pattern): (a) `ArrowLeft` back button + standard code badge + full description heading; (b) a "Unit context" card — shows the unit(s) this standard belongs to, each with `unitTitle`, `term`, and a mini delivery progress bar (`deliveredWeeks / totalWeeks weeks taught`), styled with the term accent token (`--term-N-accent`); (c) if status is `gap`, show a prompt: _"This standard is not mapped to any unit"_ + `Button` that links to the LTP unit editor; (d) a read-only skills list — each skill as a `flex items-center gap-2` row: a `Check` icon (emerald, visible when unit is `covered`) or `Circle` icon (muted, for `in_progress` / `planned`) + skill description text. Done when clicking any standard row shows this view with correct unit + delivery data, and skills show the right covered/not icon. _Modifies: `StandardDetailView.tsx` — rename component to `StandardContextView`, keep file. Remove `useSkillCoverage`, `markSkill`, `unmarkSkill`, `Modal` for date entry. Add `StandardDeliveryStatus` prop._

---

## Interactions & States

- [ ] **Status filter tabs — 4-state wiring** — Update the tab filter array to use `'in_progress'` and `'planned'` and `'gap'` keys (was `'partial'` and `'not_covered'`). Ensure the `statusFilter` state type is updated to `'all' | 'covered' | 'in_progress' | 'planned' | 'gap'`. The gap alert banner's "Show gaps" link should `setStatusFilter('gap')` and scroll to the table. Done when all five tabs filter correctly and counts match the status distribution from the hook. _Modifies: `CoverageView.tsx` — `StatusFilter` type, tabs array, filter predicate in table rendering._

- [ ] **Loading and empty states** — Replace the current card-shaped loading state with lane-height skeletons matching the new layout: 3 `Skeleton` blocks for the header section (overall stat + gap banner), 5 short `Skeleton` blocks for strand cards, then `Skeleton` rows for the table. Empty state: if `!classId && !isHod`, show the existing `BookOpen` empty state unchanged. Done when loading renders the right skeleton shapes and no errors occur when a teacher has no LTP assigned. _Modifies: `CoverageView.tsx` loading branches. Reuses: `Skeleton`._

---

## HOD View

- [ ] **`useDepartmentDelivery` hook** — Build a department-level version of `useCoverageFromDelivery` that aggregates delivery across all teachers and their classes. Takes no arguments; queries all classes with `ltp_id`, all `ltp_unit_standards`, all `class_lesson_deliveries`, and groups by teacher. Returns `coverageByTeacher: Map<teacherId, Map<standardId, StandardDeliveryStatus>>`. Done when the hook returns correct per-teacher coverage maps from real data. _New hook in `src/hooks/useDepartmentDelivery.ts`. Replaces `useDepartmentCoverage.ts` in the HOD view only._

- [ ] **`DepartmentCoverageGrid` rewire** — Replace `useDepartmentCoverage` with `useDepartmentDelivery` inside the HOD's `DepartmentCoverageGrid`. The teacher summary cards already compute per-teacher `pct` — just update the coverage source. The standards table already filters by `focusTeacherId` — update the `activeSkillIds` logic to use the new delivery-based covered skill IDs. Done when the HOD view shows the same visual layout with delivery-computed coverage replacing the manual skill_coverage data. _Modifies: `CoverageView.tsx` → `DepartmentCoverageGrid`. Reuses: existing teacher cards, table rows, sidebar._

---

## Responsive & Polish

- [ ] **Mobile: `StandardContextView` as bottom sheet** — On mobile (375px), clicking a standard row should open `StandardContextView` as a bottom sheet (`side="bottom"`) rather than navigating to a full-page view. Use `useIsMobile()` hook (already in the project) to switch between modes: on desktop, keep the full-page replace pattern; on mobile, open a `SheetContent` with `max-h-[88vh] overflow-y-auto rounded-t-2xl`. The sheet's content is identical to the full-page view minus the `ArrowLeft` button (replaced by the sheet's built-in close). Done when mobile shows the bottom sheet and desktop shows the full-page view. _Modifies: `StandardContextView`. Reuses: `Sheet`, `SheetContent` from shadcn, `useIsMobile`._

- [ ] **Accessibility pass** — (a) Standards table rows: add `tabIndex={0}` and `onKeyDown` (Enter/Space → open context view) since `<tr>` isn't natively interactive. (b) Strand filter cards: add `aria-pressed={isActive}` and `type="button"`. (c) Gap alert banner: add `role="alert"` so screen readers announce it on load. (d) `StandardContextView`: move focus to the heading (`ref` + `focus()`) on open; return focus to the triggering row on close. (e) Status badge colour contrast: verify all four states meet WCAG AA against `--card` background (spot-check `planned` neutral which is the most likely to be too low contrast). _Modifies: `CoverageView.tsx` table rows + strand cards; `StandardContextView`._

---

## Review

- [ ] **Design review** — Run `/design-review` against the brief at `.design/standards-coverage/DESIGN_BRIEF.md`. Capture screenshots at 1280px, 768px, 375px. Verify: gap alerts are visible and correctly count unmapped standards; all four status states render in the table; clicking a standard shows the context view with correct unit + delivery data; the page reads as calm and informative rather than alarming.
