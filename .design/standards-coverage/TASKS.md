# Build Tasks: Standards Coverage Redesign

Generated from: `.design/standards-coverage/DESIGN_BRIEF.md`
Date: 2026-06-06

---

## Foundation

- [ ] **`useStandardPipeline` audit + unit grouping**: Confirm the hook returns `unitId`, `unitTitle`, `unitNumber`, `startWeek`, `taughtWeekNumber`, and `isPriority` per entry. Add a `byUnit` derived map (`Map<unitId, PipelineEntry[]>`) and a `byStrand` map (`Map<strandCode, PipelineEntry[]>`) computed from `entries`. These maps drive both view modes without extra fetches. _Modifies: `src/hooks/useStandardPipeline.ts`._

- [ ] **`StatusBadge` shared component**: Extract the inline status badge (currently defined in `CoverageView.tsx` lines 73–95) into a standalone `src/components/coverage/StatusBadge.tsx`. Props: `status: PipelineStatus`. Renders icon + label using the IA naming convention ("Taught" / "Scheduled" / "In a unit" / "Not mapped") and the four `--status-*` token sets. _New component. Reuses: `--status-*` tokens, lucide icons._

---

## Core UI

- [ ] **`CoverageSummaryBar`**: Full-width horizontal bar with four proportional coloured segments (not-mapped=red, in-a-unit=neutral, scheduled=amber, taught=green) driven by `summary` counts. Below the bar: a plain-language line ("23 of 52 taught · 8 not mapped"). Below that: five per-strand mini progress bars using `StrandProgressBar` (one per strand, shows taught/total). Loading state: three `Skeleton` rows. _New component: `src/components/coverage/CoverageSummaryBar.tsx`. Reuses: `--status-*` tokens, `StrandProgressBar`, `Skeleton`._

- [ ] **`CoverageSearchBar`**: Full-width `Input` with a `Search` icon prefix. Accepts a `query` string and `onChange` callback. On Escape, clears the query. Renders at the top of the standards list, below `CoverageSummaryBar`. No debounce needed — filter happens in parent from the `byUnit` / `byStrand` maps. _New component: `src/components/coverage/CoverageSearchBar.tsx`. Reuses: `Input`, `Search` icon._

- [ ] **`ViewToggle`**: Two-button toggle — "By Unit" | "By Strand". Small, right-aligned above the standard groups. Active button uses `bg-primary text-primary-foreground`; inactive uses `variant="ghost"`. Controls a `viewMode: "unit" | "strand"` state in the parent. _New component: `src/components/coverage/ViewToggle.tsx`. Reuses: `Button`._

- [ ] **`StandardRow`**: A single table row for one standard. Columns: `StrandBadge` (code), truncated description (expands in detail sheet), `StatusBadge`. Full row is clickable → calls `onSelect(entry)`. Hover: `bg-muted/30`. Keyboard: `Enter` triggers `onSelect`. _New component: `src/components/coverage/StandardRow.tsx`. Reuses: `StrandBadge`, `StatusBadge`._

- [ ] **`UnitCoverageGroup`**: Expandable group for one unit. Header row: unit number + title, term badge (`Term 1/2/3` using `--term-N-accent` left border), standard count chip, chevron toggle. Body: `StandardRow` list, sorted strand-first (RL→RI→W→SL→L) then by standard code. Expanded by default. Empty state: "No standards mapped to this unit yet." (muted, no link needed in this view). _New component: `src/components/coverage/UnitCoverageGroup.tsx`. Reuses: `StandardRow`, `--term-*-accent` tokens._

- [ ] **`UnmappedGroup`**: Same expand/collapse pattern as `UnitCoverageGroup` but always rendered last. Header: "Not mapped" label + count badge using `--status-overdue-text/bg`. Body: `StandardRow` list (all unmapped entries), status always "Not mapped". Empty state: "All standards are mapped." (green check icon, positive tone). _New component: `src/components/coverage/UnmappedGroup.tsx`. Reuses: `StandardRow`, `--status-overdue-*` tokens._

- [ ] **`StandardDetailSheet`**: Right-side `Sheet` (440px). Opens when any `StandardRow` is clicked. Sections:
  1. Standard code (large, `text-2xl font-semibold`) + `StrandBadge` inline
  2. Full description (no truncation, `text-sm leading-relaxed`)
  3. `StatusBadge` + plain-language explanation ("In Unit 3 · Scheduled for Week 8" or "Not mapped to any unit")
  4. Mapped unit name (if any) — plain text, no link in this version
  5. Grade progression block: three rows (Grade 5 code · **Grade 6 code** · Grade 7 code). Parse predecessor/successor by replacing "6" with "5"/"7" in the standard code and looking up in `allStandards` prop. If not found: show code in `--muted-foreground`, no description text. Current grade row has `border-l-2 border-primary` accent.
  Closes on Escape or backdrop click. _New component: `src/components/coverage/StandardDetailSheet.tsx`. Reuses: `Sheet`, `StrandBadge`, `StatusBadge`._

---

## Assembly

- [ ] **`CoverageView` rewrite**: Replace the 937-line `CoverageView.tsx` with a clean implementation using all new components. Teacher view only — HOD `DepartmentCoverageGrid` is preserved unchanged and rendered when `isHod && !selectedTeacherId`. New teacher view structure:
  1. `CoverageSummaryBar` (always visible)
  2. `CoverageSearchBar` + `ViewToggle` (side by side)
  3. Standard groups: if `viewMode === "unit"` → `UnitCoverageGroup` per unit (sorted by `unitNumber`), then `UnmappedGroup`. If `viewMode === "strand"` → one group per strand (RL/RI/W/SL/L headers), then `UnmappedGroup`.
  4. Search filtering: query filters both `byUnit` and `byStrand` maps — a standard matches if its `code` or `description` contains the query (case-insensitive). Empty groups collapse automatically when filtered.
  5. `StandardDetailSheet` controlled by `selectedEntry` state.
  _Modifies: `src/components/CoverageView.tsx`. Reuses all new components above._

---

## Interactions & States

- [ ] **Search filtering behaviour**: When `query` is non-empty — all `UnitCoverageGroup` and `UnmappedGroup` headers show a match count (e.g., "3 matches"). Groups with zero matches render collapsed with a muted "No matches" message instead of their rows. Clearing the query restores all groups to their default expanded state. _Modifies: `CoverageView`, `UnitCoverageGroup`, `UnmappedGroup`._

- [ ] **Loading states**: `CoverageSummaryBar` shows three `Skeleton` rows while `useStandardPipeline` loads. Standard groups show a list of `Skeleton` rows (height matching `StandardRow`) in place of real rows. Once loaded, skeleton fades out. _Modifies: `CoverageSummaryBar`, `CoverageView`._

- [ ] **Empty states**: Three cases to handle: (1) No curriculum assigned → full-page empty state "No standards loaded. Ask your admin to assign a curriculum." (2) No units created yet → `UnitCoverageGroup` list is empty, only `UnmappedGroup` renders with all standards. (3) All mapped → `UnmappedGroup` shows green empty state. _Modifies: `CoverageView`, `UnmappedGroup`._

---

## Polish

- [ ] **Accessibility pass**: Verify `StandardRow` has `role="row"` (or `button` if not in a table), `aria-label` on the strand badge, focus ring on keyboard nav. Confirm `StandardDetailSheet` traps focus, Escape closes it, and focus returns to the triggering row on close. `CoverageSearchBar` has `aria-label="Search standards"`. Status badges use icon + text (never color alone). _Touches: all new components._

- [ ] **Animation**: Group expand/collapse uses `max-height` CSS transition (`duration-fast: 150ms`, `easing-out`). `StandardDetailSheet` uses the existing shadcn Sheet animation (already in place). No other motion. _Modifies: `UnitCoverageGroup`, `UnmappedGroup`._

---

## Review

- [ ] **Design review**: Run `/design-review` against the brief once all tasks above are complete.
