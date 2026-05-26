# Design Tokens: Curriculum Tracker

**Philosophy:** Enterprise-lite — clinical precision with warm human touches.
Extends the shadcn/ui base token system in `src/app/globals.css`. Never edit the shadcn block above the `EXTENDED DESIGN TOKENS` comment.

---

## What was added

The shadcn base provides: background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, radius, sidebar.

The extended tokens add everything the app needs that shadcn doesn't cover:

### Delivery Status
Three delivery states + a pending/neutral state. Used in HOD Delivery Grid cells and Teacher Class View week cards.

| Token group | States |
|-------------|--------|
| `--status-taught-*` | bg / text / border — green |
| `--status-behind-*` | bg / text / border — amber |
| `--status-overdue-*` | bg / text / border — red |
| `--status-pending-*` | bg / text / border — neutral |

Usage pattern:
```css
background-color: var(--status-taught-bg);
color: var(--status-taught-text);
border-color: var(--status-taught-border);
```

### Strand Colors
Five strands, each with bg / text / border / accent. Used in StrandBadge, standards tables, coverage view, PPT slides.

| Strand | Prefix | Hue |
|--------|--------|-----|
| Reading Literature (RL) | `--strand-rl-*` | Blue 254° |
| Reading Informational (RI) | `--strand-ri-*` | Violet 307° |
| Writing (W) | `--strand-w-*` | Amber 80-95° |
| Speaking & Listening (SL) | `--strand-sl-*` | Emerald 163° |
| Language (L) | `--strand-l-*` | Rose 9-11° |

Usage pattern:
```css
background-color: var(--strand-rl-bg);
color: var(--strand-rl-text);
border-color: var(--strand-rl-border);
/* --strand-*-accent for icons, underlines, active indicators */
```

### Spacing Scale
4px base unit. 13 steps (space-0 through space-12). Use Tailwind classes first; fall back to these vars for precise component-level layout.

### Typography Scale
Font families map to Geist vars already loaded in layout.tsx. Size scale from 12px (xs) to 48px (4xl). Use `--letter-spacing-wider` for badge text and strand labels.

### Motion
5 durations × 4 easings. Default: `var(--duration-normal)` + `var(--easing-default)` for most transitions. Use `--easing-bounce` sparingly — delivery checkbox check animation only.

### Shadows
3 levels + focus ring. Light mode uses low-opacity black. Dark mode uses higher-opacity to compensate for reduced contrast.

---

## Dark mode approach

- Status and strand tokens desaturate slightly in dark mode (avoid harsh vibrancy on dark backgrounds)
- Text tokens lighten (not pure white — stays at ~0.82 lightness)
- Background tokens darken (not pure black — ~0.22-0.24 lightness)
- Shadows increase opacity since dark surfaces reduce natural depth cues
- Both `.dark` class and `prefers-color-scheme: dark` media query are handled
- `[data-theme="light"]` attribute on `:root` allows manual override of system preference

---

## Migration note: StrandBadge.tsx

`StrandBadge.tsx` currently uses hardcoded Tailwind colour classes (e.g. `bg-blue-100 text-blue-800`). These should be migrated to use the CSS custom properties above so dark mode works correctly and the strand colour system has a single source of truth.

Before:
```tsx
className="bg-blue-100 text-blue-800 border-blue-200"
```

After:
```tsx
style={{
  backgroundColor: 'var(--strand-rl-bg)',
  color: 'var(--strand-rl-text)',
  borderColor: 'var(--strand-rl-border)',
}}
```
Or via a Tailwind v4 `@theme` extension mapping these vars to utility classes.
