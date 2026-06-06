# Information Architecture: Standards Coverage — Redesign

## View Map

This is a single-page SPA view registered as `"coverage"` in the `AppView` union. No new routes are added. Sub-views (standard detail) are handled via Sheet, not navigation.

```
coverage (view key in AppSidebar)
  └── CoverageView                          — full-page teacher view
        ├── CoverageSummaryBar              — always visible at top
        ├── CoverageSearchBar               — sticky below summary
        ├── ViewToggle                      — By Unit | By Strand
        ├── Standard groups (scrollable)
        │     ├── UnitCoverageGroup ×N      — one per unit, default expanded
        │     └── UnmappedGroup             — always at the bottom
        └── StandardDetailSheet             — slide-in on row click
```

---

## Navigation Model

**Primary navigation**: unchanged — `"coverage"` remains a sidebar item for both teacher and HOD roles.

**Within-page navigation**:
- `ViewToggle` (top right of standards list): toggles between **By Unit** and **By Strand** without losing scroll position or search state.
- `CoverageSearchBar`: filters all groups simultaneously. Not a separate page or tab.
- Group headers (unit name or strand name): clickable to expand/collapse. Collapsed by default only when search is active and no match.

**Sheet navigation**:
- `StandardDetailSheet` opens from the right on any standard row click.
- Closes on Escape, clicking the backdrop, or the close button.
- Does not change the main view or lose scroll position.

**No tabs.** The current status-filter tab bar (All / Taught / Scheduled / Planned / Unmapped) is removed. Status is visible inline on every row and filterable via the search bar.

---

## Content Hierarchy

### CoverageView (full page)

1. **CoverageSummaryBar** — answers "how am I doing?" immediately on load. Fixed at top, always visible. Never hidden.
2. **CoverageSearchBar** — second eye-stop. Persistent, full-width. Searching is the fastest way to find any standard.
3. **ViewToggle** — small, right-aligned. "By Unit" is the default and most common; "By Strand" is secondary.
4. **Standard groups** — the main content. Units listed in chronological order (by unit_number). Unmapped group always last.
5. **StandardDetailSheet** — secondary layer. Opens on demand; doesn't interrupt the main list.

### CoverageSummaryBar

1. **Horizontal pipeline bar** — four colored segments (unmapped/planned/scheduled/taught) at a glance
2. **Plain-language count line** — "23 of 52 taught · 8 unmapped" below the bar
3. **Per-strand mini bars** — five small strand progress bars (RL / RI / W / SL / L) showing individual strand coverage. Replaces the strand tile grid.

### UnitCoverageGroup

1. **Group header** — unit number + title + term badge + standard count + expand/collapse chevron
2. **Standard rows** — sorted by strand order (RL → RI → W → SL → L), then by standard code
3. **Empty state** — "No standards mapped to this unit yet. Add them from the unit plan." (links to long-term-plan view)

### UnmappedGroup

1. **Group header** — "Unmapped" label + count badge (uses `--status-overdue-*` tokens for the count only, not the whole header)
2. **Standard rows** — same row component as mapped standards, status badge shows "Not mapped"
3. **Empty state** — "All standards are mapped." (positive confirmation, not hidden — teacher should see this)

### StandardDetailSheet

1. **Standard code** — large, prominent (e.g., `RL.6.1`), strand badge inline
2. **Full description** — complete text, no truncation, comfortable line length
3. **Status** — badge + plain-language explanation ("In Unit 3 · Scheduled for Week 8")
4. **Mapped unit** — unit name as a link → navigates to that unit in long-term-plan view
5. **Grade progression block** — "RL.5.X → **RL.6.1** → RL.7.X". If Grade 5/7 standard text is not in the database, show the code pattern in muted text. Never omit the block entirely — the teacher needs to see where this standard sits in the sequence.
6. **Close button** — top right, keyboard accessible

---

## User Flows

### Flow 1: Checking overall progress (most frequent, ~daily)
1. Teacher clicks "Standards Coverage" in sidebar
2. Lands on `CoverageView` — `CoverageSummaryBar` loads immediately with pipeline bar and count line
3. Teacher reads: "23 of 52 taught · 8 unmapped" — understands at a glance
4. If satisfied → done. If concerned about unmapped → scrolls to bottom to see `UnmappedGroup`

### Flow 2: Looking up a specific standard (frequent, search-driven)
1. Teacher types a code ("RL.6") or keyword ("evidence") in `CoverageSearchBar`
2. All groups filter in real time — non-matching rows hidden, empty groups collapse
3. Teacher sees matching standards highlighted across units/strands
4. Teacher clicks a row → `StandardDetailSheet` opens
5. Teacher reads full description + where it's mapped + grade progression
6. Closes sheet → returns to filtered list
7. Clears search → full list restores

### Flow 3: Reviewing a unit's standards (before teaching a unit)
1. Teacher opens coverage page, view is "By Unit" (default)
2. Sees unit groups in order (Unit 1, Unit 2, Unit 3…)
3. Clicks the header of the relevant unit to focus (already expanded by default)
4. Scans standard rows for that unit — sees status of each (taught / scheduled / planned)
5. Clicks any row for full detail if needed

### Flow 4: Identifying strand gaps (periodic, strand-lens)
1. Teacher clicks "By Strand" toggle
2. Groups reorganise into RL / RI / W / SL / L
3. Teacher sees which strands have unmapped or unscheduled standards
4. Can cross-reference with `CoverageSummaryBar` per-strand mini bars at top
5. Clicks a standard row in the weak strand → standard detail opens

### Flow 5: Acting on an unmapped standard (triggered by seeing the gap)
1. Teacher scrolls to `UnmappedGroup` at the bottom (or filters by searching)
2. Sees a list of unmapped standards
3. Clicks one → `StandardDetailSheet` opens — shows "Not mapped to any unit"
4. Sheet includes a "Add to a unit" link → navigates to long-term-plan view
5. Teacher maps the standard from the unit plan side
6. Returns to Coverage — standard moves out of Unmapped group

---

## Naming Conventions

| Concept | Label in UI | Notes |
|---|---|---|
| Coverage page | "Standards Coverage" | Unchanged from current sidebar label |
| Pipeline status: unmapped | "Not mapped" | Plain language — avoids jargon |
| Pipeline status: planned | "In a unit" | "Planned" is ambiguous; "In a unit" is concrete |
| Pipeline status: scheduled | "Scheduled" | Keep — it's clear ("week is set") |
| Pipeline status: taught | "Taught" | Keep — universally understood |
| Standard group (by unit) | "[Unit Number]: [Title]" | e.g., "Unit 1: Identity & Narrative" |
| Standard group (by strand) | "[Strand full name]" | e.g., "Reading Literature" not "RL" |
| Unmapped group | "Not mapped" | Section heading; not "Unmapped" or "Gaps" |
| Standard row | No label | Rows are self-labelling via code + description |
| Detail view | (no label — it's a sheet) | No modal title needed; standard code is the heading |
| View toggle options | "By Unit" / "By Strand" | Short, parallel, clear |
| Per-strand mini bars | "[Strand code] · X of Y" | e.g., "RL · 8 of 12" |
| Grade progression | "Grade progression" | Section label in detail sheet |

---

## Component Reuse Map

| Component | Used on | Behavior differences |
|---|---|---|
| `PageContainer` | CoverageView | Standard wrapper — title = "Standards Coverage" |
| `StrandBadge` | StandardRow, StandardDetailSheet | No variation |
| `StrandProgressBar` | CoverageSummaryBar (per-strand mini bars) | Smaller variant — label only shows code + count |
| `Badge` (shadcn) | Status badges on StandardRow, group count badges | Color varies by status token |
| `Sheet` (shadcn) | StandardDetailSheet | Width 440px on desktop |
| `Input` (shadcn) | CoverageSearchBar | Full width, with search icon prefix |
| `Skeleton` (shadcn) | CoverageSummaryBar loading, group loading | Table-row shape skeletons |
| `ChevronDown/Right` | UnitCoverageGroup, UnmappedGroup headers | Expand/collapse toggle |

---

## Content Growth Plan

| Content | Growth pattern | Accommodation |
|---|---|---|
| Standards | Fixed (NYSED Grade 6 ELA set — ~52 standards) | No pagination needed; all fit in one scrollable list |
| Units | Grows during year (teachers add units) | New `UnitCoverageGroup` appears automatically; "By Unit" view adapts |
| Taught standards | Grows each week as delivery is logged | Status badges update; `CoverageSummaryBar` percentages shift |
| Search results | Ephemeral | No persistence — clears on navigation away from view |

---

## URL / View Key Strategy

No URL changes. `"coverage"` remains the `AppView` key.

The view toggle state ("by-unit" vs "by-strand") and search query are **local component state** — they do not persist across navigation. When the teacher returns to Standards Coverage, they always land on the default state: By Unit, no search active, all groups expanded.

This matches the brief's intent: the teacher should always land at the top-level summary view, not a half-filtered state from a previous session.
