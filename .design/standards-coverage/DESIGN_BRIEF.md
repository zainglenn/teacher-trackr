# Design Brief: Standards Coverage — Redesign

## Problem

A teacher opens Standards Coverage to answer three legitimate questions: Am I on track? What's not mapped yet? What exactly is this standard? But the page can't answer any of them cleanly. It presents a cluster of strand tiles, a segmented bar, a filterable table, and a sidebar — all at once, with no hierarchy or suggested reading order. There is no obvious starting point, no sense of progression through the page, and no action that feels natural to take. Teachers have said pen and paper feels simpler. That is a design failure.

The underlying data is all there. The pipeline (unmapped → planned → scheduled → taught) is well-modelled. The problem is entirely in how it is presented.

## Solution

A single, coherent page that reads top to bottom like a document. The teacher lands and immediately sees where they stand (a clear, simple coverage summary). Below that, they can browse their standards organised the way they actually think — by unit, not by strand. A persistent search lets them jump straight to any standard by code or keyword. Clicking a standard opens a focused detail view with the full text and its place in the NYSED Grade 5→6→7 progression. The page is quiet when things are going well and draws attention to gaps only when it matters.

## Experience Principles

1. **Unit-first, strand-second** — Teachers plan in units. Standards coverage should reflect that. The default view organises standards by the unit they belong to, with strand grouping available as a secondary lens. Strands are colour-coded identity, not primary navigation.

2. **One clear starting point** — The top of the page always answers "how am I doing overall?" in a single glance. Everything else is detail that the teacher can choose to explore. Nothing competes for primacy.

3. **Gaps are contextual, not nagging** — Unmapped standards appear in their natural place (an "Unmapped" group at the bottom of the unit view, not a red alert banner at the top). The teacher sees them when they're looking at the full picture, not every time they open the page.

## Aesthetic Direction

- **Philosophy**: Notion-inspired editorial calm — consistent with the rest of the app. Document feel, generous whitespace, purposeful use of colour only for strand identity and status.
- **Tone**: Calm and informative. A teacher should feel in control, not pressured. Progress feels encouraging, not clinical.
- **Reference points**: The existing UnitPlanView document style (bordered header card, standards table with strand badges). The Analytics ghost table skeleton. Linear step-by-step document flow.
- **Anti-references**: Dashboard-style widget grids (current implementation), traffic-light status overload, anything that feels like a spreadsheet or a school report.

## Existing Patterns

- **Typography**: Geist Sans, `--font-size-*` scale, `font-semibold` for headings, `text-sm` for body
- **Colors**: Indigo primary, 5 strand colors (`--strand-rl/ri/w/sl/l-*`), 4 status colors (`--status-taught/behind/pending/overdue-*`)
- **Spacing**: `--space-*` scale, `space-y-6` between page sections
- **Components to reuse**: `PageContainer`, `StrandBadge`, `StrandProgressBar`, `Badge`, `Input`, `Sheet`, `Skeleton`, status icon set (CheckCircle2, Clock, Circle, AlertTriangle)
- **Pipeline statuses**: `unmapped` | `planned` | `scheduled` | `taught` — keep these exact four, keep their existing color mappings

## Component Inventory

| Component | Status | Notes |
|---|---|---|
| `CoverageView.tsx` | Replace | Full rewrite — teacher view only. HOD view extracted or preserved separately. |
| `CoverageSummaryBar` | New | Replaces the current segmented bar + tile cluster. Single horizontal bar with 4 status segments + plain-language summary ("23 taught · 12 scheduled · 8 unmapped"). |
| `UnitCoverageGroup` | New | An expandable group showing one unit, its term badge, and all mapped standards as rows. Replaces the strand-grouped table. |
| `UnmappedGroup` | New | A distinct section at the bottom: all unmapped standards as rows, quiet styling (no red alert banner). |
| `StandardRow` | New | A single standard row: strand badge, code, truncated description, status badge. Clickable → opens StandardDetailSheet. |
| `StandardDetailSheet` | New | Right-side sheet (400px): full standard text, standard code, strand badge, status, mapped unit (if any), start week (if scheduled). Grade progression block (Grade 5 → **Grade 6** → Grade 7) showing the standard code pattern for predecessor/successor. |
| `CoverageSearchBar` | New | Full-width search at top of standard list. Filters all groups in real-time by code or keyword. Clears on Escape. |
| `StrandBadge` | Exists | Used on StandardRow and StandardDetailSheet |
| `StrandProgressBar` | Exists | Used in CoverageSummaryBar for per-strand breakdown |
| `PageContainer` | Exists | Page wrapper |
| `Sheet` | Exists (shadcn) | StandardDetailSheet wrapper |
| `Input` | Exists (shadcn) | CoverageSearchBar |
| `Badge` | Exists (shadcn) | Status badges |
| `Skeleton` | Exists (shadcn) | Loading states |

## Key Interactions

**Default view — unit-first:**
The page loads with all units expanded, showing their standards as rows. A "Unmapped" group appears at the bottom. The teacher reads top to bottom and gets a complete picture in one scroll.

**Search:**
Typing in the search bar filters all standard rows in real time across all groups. Matched standards remain visible; groups with no matches collapse automatically. Clearing the search restores the full view.

**Standard detail:**
Clicking any standard row opens a `StandardDetailSheet` from the right. It shows:
- Standard code (large, prominent) + strand badge
- Full description text (no truncation)
- Status badge with plain-language explanation ("In a unit · not yet scheduled")
- Unit name (if mapped), start week (if scheduled)
- Grade progression block: "RL.5.1 — [Grade 5 description if available] → **RL.6.1** → RL.7.1 — [Grade 7 description if available]". If Grade 5/7 standards are not in the database, show the code pattern only with a muted note.
- Close on Escape or clicking outside

**Strand lens (secondary view):**
A toggle at the top right of the standards list switches between "By Unit" (default) and "By Strand". In strand mode, groups become RL / RI / W / SL / L instead of units. All other interactions (search, row click, status) work identically.

**Coverage summary:**
The top bar always shows the current pipeline state: one horizontal bar with four coloured segments (unmapped=red, planned=grey, scheduled=amber, taught=green) and a plain-language line ("23 of 52 standards taught — 8 not yet mapped"). This is read-only; no interaction.

## Responsive Behavior

Desktop-first (1280px+). At tablet (768px) the sheet slides in at full width. The sidebar (current implementation) is removed entirely — the summary bar takes its role. No mobile-specific layout needed.

## Accessibility

- Standard rows are keyboard-navigable (Tab, Enter to open sheet, Escape to close)
- Strand badge colors always paired with text code
- Status badges use color + icon + text label — never color alone
- Search input has `aria-label="Search standards"`
- Sheet traps focus when open

## Out of Scope

- HOD department view (not changed in this redesign — HOD can still access existing DepartmentCoverageGrid or it remains as-is)
- Editing/mapping standards (mapping happens from UnitPlanView — Coverage page is read-only)
- Student attainment data (lives in Student Progress view)
- Priority standard flag (not displayed in this version)
- Term-by-term timeline view
- Delivery week grid
