# Design Tokens: Multi-Subject School

## Status

**Extension only.** The existing token system in `src/app/globals.css` is complete for spacing, typography, motion, status, strand colors, term accents, and shadows. This feature adds one new token group.

## New Tokens Added

### Subject Slot Colors

**File**: `src/app/globals.css` — appended to the `CURRICULUM TRACKER — EXTENDED DESIGN TOKENS` block.

Subjects are user-defined (admin creates them at school setup time), so their colors cannot be hardcoded by name. Instead, subjects are assigned a positional slot (1–6) at creation time and inherit that slot's color tokens.

**Usage pattern:**

```tsx
// SubjectBadge.tsx — apply via data attribute or slot-indexed CSS vars
<span style={{
  background: `var(--subject-slot-${slot}-bg)`,
  color:      `var(--subject-slot-${slot}-text)`,
  border:     `1px solid var(--subject-slot-${slot}-border)`,
}}>
  {subject.name}
</span>
```

Or via a `data-subject-slot` attribute on a wrapper:

```css
[data-subject-slot="1"] .subject-badge {
  background: var(--subject-slot-1-bg);
  color:      var(--subject-slot-1-text);
  border-color: var(--subject-slot-1-border);
}
```

**Slot palette — light mode:**

| Slot | Hue | Colour family | Typical use |
|---|---|---|---|
| 1 | 192 | Teal | First subject created (likely English at DSK) |
| 2 | 35 | Orange | Second subject (likely Mathematics) |
| 3 | 290 | Fuchsia | Third subject |
| 4 | 130 | Lime | Fourth subject |
| 5 | 52 | Yellow | Fifth subject |
| 6 | 210 | Sky | Sixth subject |

**Hue selection rationale:** Existing strand colors occupy hues 9 (rose), 75–95 (amber), 152–163 (emerald), 254 (blue), 307 (violet). The primary brand uses hue 264 (indigo). Subject slots use hues 35, 52, 130, 192, 210, 290 — all at least 20° away from the nearest occupied hue to remain visually distinct.

**Each slot has four variants** matching the strand color pattern:
- `-bg` — light tinted background (badge fill, context pill background)
- `-text` — dark text on the bg (badge label, pill label)
- `-border` — border/outline variant
- `-accent` — saturated accent for icons, active indicators (light mode only; dark mode uses `-text` value)

**Dark mode:** All 6 slots have overrides in both `.dark` class and `@media (prefers-color-scheme: dark)` matching the existing pattern in `globals.css`.

## Unchanged Token Groups

The following existing tokens are used as-is by new components in this feature — no changes needed:

| Token group | Used by |
|---|---|
| `--primary`, `--secondary`, `--muted` | School Setup forms, context switcher hover states |
| `--border`, `--input`, `--ring` | School Setup form inputs |
| `--card`, `--card-foreground` | School Setup content panels |
| `--sidebar-*` | Context switcher pill (lives in sidebar) |
| `--radius-*`, `--shadow-*` | All new components |
| `--space-*`, `--font-size-*` | All new components |
| `--duration-*`, `--easing-*` | Context switcher dropdown animation, grade filter tab transition |
