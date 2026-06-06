# Design Tokens: Department Leadership Suite

## Status

**Extension only.** The existing token system in `src/app/globals.css` is complete for spacing, typography, motion, delivery status, strand colors, term accents, subject slots, and shadows. This feature adds two new token groups.

## What reuses existing tokens

| Feature | Existing token | Usage |
|---|---|---|
| Attainment grid cells (aggregate %) | `--status-taught/behind/overdue/pending` | ≥80% → taught, 40–79% → behind, <40% → overdue, no data → pending |
| Intervention status: Active | `--status-taught-*` | Green = in progress, positive |
| Intervention status: Monitoring | `--status-behind-*` | Amber = watch closely |
| Intervention status: Concluded | `--status-pending-*` | Neutral = archived/done |
| Coaching cycle step: Complete | `--status-taught-*` | Green checkmark |
| Coaching cycle step: Active | `--primary` / `--secondary` | Primary indigo for current step |
| Coaching cycle step: Pending | `--status-pending-*` | Neutral unfilled circle |
| Benchmark "before" bar | Strand tokens at 40% opacity | Historical, de-emphasised |
| Benchmark "after" bar | Strand tokens at 100% | Current, full color |

## New Token Groups

### 1. Attainment Level Colors

**Purpose:** Individual student attainment levels in the Analytics drill-down sheet. These appear alongside delivery status tokens in the same session (HOD sees a student breakdown right after seeing a delivery grid cell), so they must be semantically and visually distinct — same color families, different roles.

**Hue choices:**
- `not_assessed` → neutral (no hue) — no data yet
- `below` → red (hue 19) — same family as `--status-overdue` but labelled as student performance
- `approaching` → amber (hue 75) — same family as `--status-behind`
- `meeting` → green (hue 155) — same family as `--status-taught`
- `exceeding` → indigo (hue 264) — primary brand color; "above the standard" deserves the primary accent, not just green

**File:** `src/app/globals.css` — appended to the `CURRICULUM TRACKER — EXTENDED DESIGN TOKENS` block.

```css
--attainment-not-assessed-bg:      /* neutral-100 */
--attainment-not-assessed-text:    /* neutral-500 */
--attainment-not-assessed-border:  /* neutral-200 */

--attainment-below-bg:             /* red-100 */
--attainment-below-text:           /* red-800 */
--attainment-below-border:         /* red-200 */

--attainment-approaching-bg:       /* amber-100 */
--attainment-approaching-text:     /* amber-800 */
--attainment-approaching-border:   /* amber-200 */

--attainment-meeting-bg:           /* green-100 */
--attainment-meeting-text:         /* green-800 */
--attainment-meeting-border:       /* green-200 */

--attainment-exceeding-bg:         /* indigo-100 */
--attainment-exceeding-text:       /* indigo-800 */
--attainment-exceeding-border:     /* indigo-200 */
```

**Usage pattern:**
```tsx
// AttainmentBadge.tsx
const ATTAINMENT_TOKENS = {
  not_assessed: {
    bg: 'var(--attainment-not-assessed-bg)',
    text: 'var(--attainment-not-assessed-text)',
    border: 'var(--attainment-not-assessed-border)',
  },
  // ... etc
}
```

---

### 2. Recognition Accent

**Purpose:** Recognition cards on the Department view and teacher dashboard need a visually distinct "celebratory" accent that reads as positive without conflicting with green (already used for taught/meeting/active). Gold at hue 45° sits in the gap between orange (35°) and amber (75°) — both of which are occupied — and reads as warm and special.

**File:** `src/app/globals.css` — appended to the `CURRICULUM TRACKER — EXTENDED DESIGN TOKENS` block.

```css
--recognition-bg:      /* gold-100: oklch(0.971 0.065 45) */
--recognition-text:    /* gold-800: oklch(0.418 0.148 45) */
--recognition-border:  /* gold-200: oklch(0.940 0.118 45) */
--recognition-accent:  /* gold-600: oklch(0.655 0.198 45) */
```

**Usage:** Applied to `RecognitionCard` background, icon, and border. Not used for status or strand identity.

---

## Unchanged Token Groups

The following existing tokens are used as-is by new components in this feature — no changes needed:

| Token group | Used by |
|---|---|
| `--primary`, `--secondary` | Coaching cycle active step, primary buttons, active nav item |
| `--muted`, `--muted-foreground` | Section labels, empty states, secondary metadata |
| `--card`, `--card-foreground` | All new card components |
| `--border`, `--input`, `--ring` | Form inputs in Observation/Intervention/Meeting note forms |
| `--strand-*` | StrandBadge on InterventionCard, column headers in AttainmentGrid |
| `--status-*` | AttainmentGrid cells (aggregate), Intervention status badges |
| `--shadow-*` | ObservationLogCard, MeetingNoteCard, InitiativeCard hover states |
| `--space-*`, `--font-size-*` | All new components |
| `--duration-*`, `--easing-*` | Sheet open/close, cycle step completion animation |
