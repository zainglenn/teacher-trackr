# Design Brief: HOD Delivery Grid

## Problem

A Head of Department managing 6 classes across one grade has no way to know, at any given moment, whether teachers are delivering lessons on schedule. The only feedback loop is a meeting or a submission — both of which lag reality by days or weeks. By the time a coverage gap surfaces, it's too late to fix it without disrupting the entire term.

## Solution

A real-time delivery grid that shows every class (6A–6F) as a column and every lesson week as a row. Each cell shows delivery status — on track, behind, or not started — so the HOD can see the entire grade's execution health in a single glance. Clicking a cell opens a drawer with the teacher's delivery notes for that lesson week.

## Experience Principles

1. **Clarity over detail** — The grid must be readable in 3 seconds. Status is communicated through colour and icon, not text. Detail lives one click deeper.
2. **Exception-first** — Behind and at-risk cells should demand attention. On-track cells should recede. The HOD's eye goes straight to problems.
3. **Action from context** — Clicking a flagged cell should immediately surface the teacher's notes and offer a direct message or deadline-extension action. No navigating away.

## Aesthetic Direction

- **Philosophy**: Operational dashboard — clinical precision with warm human touches. Feels like a control room, not a spreadsheet.
- **Tone**: Calm authority. Confident. The HOD feels in control.
- **Reference points**: Linear's project board, Notion's database table view, Vercel's deployment status grid.
- **Anti-references**: Nothing that looks like a school admin system from 2010. No busy tables with 12 columns. No Excel-green-and-grey.

## Existing Patterns

- **Typography**: Geist Sans (heading), Geist Mono (data/codes)
- **Colors**: OKLCH-based. Sidebar is deep blue (`oklch(0.185 0.015 264)`). Strand colours already established: RL=blue, RI=violet, W=amber, SL=emerald, L=rose. Delivery status uses: green (on track), amber (behind), red (not started / overdue).
- **Spacing**: `--radius: 0.625rem` base. Tailwind v4 spacing scale.
- **Components**: `card.tsx`, `badge.tsx`, `tooltip.tsx`, `sheet.tsx`, `skeleton.tsx` — all reusable here.
- **Sidebar navigation**: HOD Delivery Grid lives under "HOD Review" in the sidebar, or replaces it as a top-level item.

## Component Inventory

| Component | Status | Notes |
|-----------|--------|-------|
| Delivery grid table | New | Classes as columns, lesson weeks as rows. Sticky header row and first column. |
| Status cell | New | Colour-coded chip: green / amber / red. Icon inside (check, clock, alert). |
| Class column header | New | Class name (6A), teacher name, avatar/initials. |
| Lesson week row header | Modify | Week number + lesson title from master plan. Deadline badge if set. |
| Delivery detail drawer | New | Opens on cell click. Shows teacher notes, delivery date, standards covered. Sheet component. |
| Coverage summary bar | New | Per-class progress bar at column footer: X/Y weeks delivered. |
| Term filter tabs | New | Switch between Term 1 / 2 / 3. |
| At-risk banner | New | Sticky top banner when ≥1 class is overdue. Dismissable. |
| `badge.tsx` | Exists | Used for deadline labels and standard counts. |
| `sheet.tsx` | Exists | Used for delivery detail drawer. |
| `skeleton.tsx` | Exists | Loading state for grid cells. |
| `tooltip.tsx` | Exists | Hover on status cell shows teacher name + delivery date. |

## Key Interactions

- **Page load**: Grid renders with skeleton cells, then populates. At-risk banner appears if any class is overdue.
- **Hover on cell**: Tooltip shows teacher name, delivery date (or "Not delivered"), standards covered count.
- **Click on cell**: Sheet slides in from right with full delivery detail — teacher notes, standards logged as taught, class-specific observations. HOD can send a message or extend the deadline from this drawer.
- **Click column header**: Navigates to that class's full teacher view.
- **Term tab switch**: Grid re-renders for the selected term. Smooth fade transition.
- **Filter by status**: HOD can toggle to show only behind/overdue cells. Non-matching cells grey out.

## Responsive Behavior

- **Desktop (≥1280px)**: Full grid. All 6 classes visible. Sticky first column (week labels) and sticky header row (class names).
- **Tablet (768–1279px)**: Horizontal scroll on the grid. Class columns truncate to initials (6A, teacher initials). Sticky column still fixed.
- **Mobile (<768px)**: Grid collapses to a per-class list view. Each class is a card showing overall delivery progress. Tap to drill into week-by-week detail.

## Accessibility Requirements

- Status cells must not rely on colour alone — include an icon (✓, ⏱, ✕) within each cell.
- Minimum contrast ratio 4.5:1 for all text on coloured backgrounds.
- Grid navigable by keyboard (arrow keys move between cells, Enter opens detail drawer).
- Screen reader: each cell announced as "[Class] [Week] — [Status]".
- Focus visible on all interactive elements.

## Out of Scope

- Editing the master lesson plan from this view (HOD admin panel handles that).
- Student attainment data (covered in Student Progress view).
- Exporting the grid to CSV/PDF (future).
- Real-time live updates / websockets (polling on page focus is sufficient for v1).
