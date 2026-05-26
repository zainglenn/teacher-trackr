# Design Tokens: Standards Coverage — Delivery-Driven Redesign

## Audit Summary

The project already has a comprehensive token system in `src/app/globals.css`. **No new tokens are needed for this feature.** The four coverage states map directly onto the four existing `--status-*` token groups. All strand colors exist as `--strand-*-accent` tokens.

One code-quality fix is identified: `STRAND_PROGRESS_COLOR` in `CoverageView.tsx` hardcodes Tailwind color class strings instead of using the already-defined `--strand-*-accent` tokens. This should be corrected during implementation.

---

## Coverage State → Token Mapping

The four-state coverage model uses existing tokens with no additions:

| Coverage State | Trigger | Background | Border | Text | Progress fill |
|---|---|---|---|---|---|
| **Covered** | Unit fully delivered | `--status-taught-bg` | `--status-taught-border` | `--status-taught-text` | `--status-taught-text` |
| **In Progress** | Unit partially delivered | `--status-behind-bg` | `--status-behind-border` | `--status-behind-text` | `--status-behind-text` |
| **Planned** | Standard in unstarted unit | `--status-pending-bg` | `--status-pending-border` | `--status-pending-text` | `--status-pending-text` |
| **Gap** | Standard not in any unit | `--status-overdue-bg` | `--status-overdue-border` | `--status-overdue-text` | `--status-overdue-text` |

### Gap alert banner
The alert banner ("X standards have no unit plan") reuses `--status-overdue-*` directly:
```
background: var(--status-overdue-bg)
border-color: var(--status-overdue-border)
color: var(--status-overdue-text)
```
No separate `--coverage-gap-alert-*` alias needed — adding one would obscure intent.

---

## Strand Progress Fills — Code Fix Required

`CoverageView.tsx` currently uses a hardcoded map:

```typescript
// Current (hardcoded Tailwind classes — should be replaced)
const STRAND_PROGRESS_COLOR: Record<string, string> = {
  RL: "bg-blue-500",
  RI: "bg-violet-500",
  W:  "bg-amber-500",
  SL: "bg-emerald-500",
  L:  "bg-rose-500",
};
```

During implementation, replace with inline `style` referencing the existing accent tokens:

```typescript
// Correct approach — uses existing tokens, works in dark mode
const STRAND_ACCENT_VAR: Record<string, string> = {
  RL: "--strand-rl-accent",
  RI: "--strand-ri-accent",
  W:  "--strand-w-accent",
  SL: "--strand-sl-accent",
  L:  "--strand-l-accent",
};

// Usage on progress fill div:
// style={{ backgroundColor: `var(${STRAND_ACCENT_VAR[code]})` }}
```

This makes dark mode work correctly without any additional token definitions.

---

## Unit Delivery Progress Bar (StandardContextView)

The unit delivery bar inside `StandardContextView` uses the term accent token keyed by the unit's term number:

```typescript
// Per-unit delivery bar fill
style={{ backgroundColor: `var(--term-${unit.term}-accent)` }}
```

Tokens already exist: `--term-1-accent` (indigo), `--term-2-accent` (violet), `--term-3-accent` (emerald). Dark mode values also already defined.

---

## Existing Tokens Used (complete list)

### Four coverage states
- `--status-taught-bg/text/border`
- `--status-behind-bg/text/border`
- `--status-pending-bg/text/border`
- `--status-overdue-bg/text/border`

### Strand colors
- `--strand-rl/ri/w/sl/l-bg/text/border/accent`

### Unit delivery context
- `--term-1/2/3-accent`

### General surface
- `--border`, `--muted`, `--muted-foreground`, `--card`, `--background`, `--foreground`

### Motion
- `--duration-fast` (150ms) — status badge transitions
- `--duration-normal` (250ms) — filter tab transitions, progress bar fills
- `--easing-out` — sheet slide-in (bottom sheet on mobile)

---

## What Was Deliberately Not Added

- **`--coverage-*` semantic aliases** — The `--status-*` tokens already carry the right meaning for coverage states. Adding a parallel namespace (`--coverage-covered-bg`) would create token duplication with no benefit.
- **`--gap-alert-*` tokens** — The alert banner is a one-off element. Reusing `--status-overdue-*` keeps the system flat.
- **Skill-level status tokens** — Skills within a standard now show covered/not-covered status derived from unit delivery. The `--status-taught-text` (for ✓ icon) and `--muted-foreground` (for ○ icon) tokens already cover this.
- **`--coverage-bar-track`** — The progress bar background track uses `--muted` (via Tailwind `bg-muted`). No new token needed.
