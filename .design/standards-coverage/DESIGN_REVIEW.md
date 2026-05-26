# Design Review: Standards Coverage — Delivery-Driven Redesign

Reviewed against: `.design/standards-coverage/DESIGN_BRIEF.md`
Philosophy: Calm utility (Notion/Linear)
Date: 2026-05-26

---

## Screenshots Captured

| Screenshot | Breakpoint | Description |
|---|---|---|
| `screenshots/review-coverage-desktop-1280.png` | Desktop (1280×800) | Coverage index, all standards, light mode |
| `screenshots/review-coverage-tablet-768.png` | Tablet (768×1024) | Coverage index, tablet layout |
| `screenshots/review-coverage-mobile-375.png` | Mobile (375×812) | Coverage index, mobile layout |
| `screenshots/review-coverage-dark-desktop-1280.png` | Desktop dark (1280×800) | Coverage index, dark mode |
| `screenshots/review-context-view-desktop-1280.png` | Desktop (1280×800) | StandardContextView — L.6.1, Planned state |
| `screenshots/review-context-view-dark-desktop-1280.png` | Desktop dark (1280×800) | StandardContextView in dark mode |

> All screenshots are in `.design/standards-coverage/screenshots/`.

---

## Summary

The redesign is substantially complete and correct. The core premise — deriving coverage from delivery rather than manual skill tracking — works, and the four-state model (Covered / In Progress / Planned / Gap) is faithfully implemented. Two issues need fixing before this can be considered fully polished: the strand icon backgrounds use hardcoded Tailwind classes that break in dark mode, and the tab bar will overflow on mobile at 375px due to five long labels with no scroll container.

---

## Must Fix

### 1. Strand icon backgrounds break in dark mode

`STRAND_ICON_BG` in `CoverageView.tsx` uses hardcoded Tailwind classes (`bg-blue-50 text-blue-600`, etc.) in two places: the strand summary card icon containers, and the Strand column badge in the table. In dark mode these render as light pastel spots against the dark card surface. The tokens `--strand-*-bg` and `--strand-*-text` already exist for exactly this purpose.

**Affects**: `CoverageView.tsx` — `STRAND_ICON_BG` constant, used at line ~258 (strand card icon) and line ~411 (table Strand cell badge). See `screenshots/review-coverage-dark-desktop-1280.png`.

**Fix**: Replace the `STRAND_ICON_BG` map with inline styles using the CSS token vars:

```tsx
// Remove STRAND_ICON_BG entirely. Replace usages with:
style={{ background: `var(--strand-${code.toLowerCase()}-bg)`, color: `var(--strand-${code.toLowerCase()}-text)` }}
```

This is the same pattern as `STRAND_ACCENT_VAR` already applied to progress bars.

---

### 2. Tab bar overflows on mobile (375px)

The five status filter tabs ("All Standards", "Covered", "In Progress", "Planned", "Gap") are in a `flex items-center gap-1` container with `whitespace-nowrap` on each button. At 375px they overflow the viewport horizontally with no scroll affordance.

**Affects**: `CoverageView.tsx` — `CoverageGrid` tab bar container. See `screenshots/review-coverage-mobile-375.png`.

**Fix**: Add `overflow-x-auto` and `scrollbar-hide` (or `pb-px` to avoid scrollbar chrome) to the tab wrapper:

```tsx
<div className="flex items-center gap-1 overflow-x-auto scrollbar-hide border-b border-transparent">
```

---

## Should Fix

### 3. Page subtitle barely visible in dark mode (context view)

The subtitle "Coverage is computed from your class delivery — no extra steps needed." uses `text-muted-foreground` which renders with very low contrast against the dark header area in the context view. See `screenshots/review-context-view-dark-desktop-1280.png` — the subtitle text nearly disappears.

This is a token contrast issue, not a code bug, but it affects readability in the most-used user scenario (teacher opens a standard at the start of year = dark mode + planned state).

**Fix**: No code change needed — the token contrast should be checked. If `--muted-foreground` in dark mode is below 4.5:1 against `--background`, adjust the dark mode value in `globals.css`. Alternatively use `text-foreground/60` explicitly for this subtitle.

---

### 4. Gap alert banner untestable with this dataset

This teacher's LTP has all 41 standards mapped to units, so `gapCount === 0` and the banner never renders in any screenshot. The logic in `CoverageView.tsx:154–166` is correct per code review, but visual verification of the banner's color, spacing, and "Show gaps" link was not possible.

**Fix**: Test manually by temporarily removing a standard from the teacher's LTP, verifying the banner appears with correct rose styling, and that "Show gaps" sets the filter to `'gap'`. Or: wire up a test fixture with a known gap standard.

---

## Could Improve

### 5. Strand filter dropdown redundant with strand card buttons

At desktop, there are two ways to filter by strand: clicking a strand card (sets `strandFilter`) and using the Select dropdown next to the tabs. Both control the same state. The dropdown adds visual complexity to the filter row without providing additional value — the strand cards already serve as the primary strand filter with visual feedback (`aria-pressed` ring). Consider hiding the dropdown when a strand card is active, or removing it entirely.

### 6. Coverage Breakdown sidebar lists items only when count > 0

At `CoverageGrid:270–290`, each status line in the Coverage Breakdown card is conditionally rendered. When all 41 standards are Planned (new teacher, beginning of year), the card shows just "41 planned" — a single line. This is correct but the card header "Coverage Breakdown" over a single item looks sparse. A simpler label or showing all four states with zero counts would read more consistently.

### 7. Skills list in context view has no heading for non-Writing standards

For non-Writing standards (no genre grouping), the skills section shows an uppercase `"SKILLS & SUCCESS CRITERIA"` label in `StandardDetailView.tsx:112`. For Writing standards (genre-grouped), each genre card has its own heading but no parent section label. These two patterns are inconsistent. The skills section label also appears in a different visual treatment from the "UNIT COVERAGE" label above it — consider aligning the styling between the two section labels.

### 8. HOD Readiness ring uses hardcoded hex stroke colors

`CoverageView.tsx:239–248` — the SVG ring inside the HOD Readiness card uses hardcoded hex colors (`#10b981`, `#f59e0b`, `#ef4444`) for the stroke. These won't adapt to dark mode and use raw color values rather than tokens. The underlying `--status-taught-text`, `--status-behind-text`, `--status-overdue-text` tokens cover these three states already.

---

## What Works Well

**Delivery column replaces skill count with real signal.** The "0/4w" format with a mini progress bar in the Delivery column is the clearest possible answer to "how far along is this standard?" at a glance. It's more useful than the old covered/total skill fraction and takes the same column width.

**`StandardContextView` is clean and informative.** The unit delivery context card — unit title, term badge, delivery bar, weeks taught, status pill — answers the teacher's real question ("when will this standard be covered?") without requiring any extra clicks or navigation. The read-only skills list below it is the right secondary detail.

**Dark mode status badges work correctly.** The CSS-var-based `StatusBadge` component and the inline style pattern throughout correctly switches `--status-*-bg/text/border` tokens in dark mode. No hardcoded hex or Tailwind color classes in the badge paths.

**Four-state model is immediately legible.** Even with no delivery data at all (41 Planned, 0 Gap), the tab counts tell the whole story: "41 planned, 0 gap" means the LTP is complete but teaching hasn't started yet. That's a much clearer signal than the old "41 not covered."

**Keyboard navigation on table rows** is correctly implemented: `tabIndex={0}`, `role="row"`, and `onKeyDown` Enter/Space → open context view. The accessibility pass from the IA doc was applied.

**Gap alert logic is structurally correct.** The `gapCount > 0` guard, `role="alert"` attribute, CSS-var styling, and "Show gaps" link → `setStatusFilter("gap")` are all in place and follow the brief exactly. The implementation is solid even though it wasn't visually exercised in this session.
