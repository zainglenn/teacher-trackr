# Design Tokens: Standards Coverage Redesign

## Status

**Extension: none required.** The existing token system covers everything the redesign needs. No new tokens are added to `globals.css`.

---

## Token Mapping for New Components

### CoverageSummaryBar — pipeline segments

| Segment | Token | Value |
|---|---|---|
| Taught (green) | `--status-taught-bg`, `--status-taught-text` | oklch green |
| Scheduled (amber) | `--status-behind-bg`, `--status-behind-text` | oklch amber |
| Planned (neutral) | `--status-pending-bg`, `--status-pending-text` | oklch neutral |
| Not mapped (red) | `--status-overdue-bg`, `--status-overdue-text` | oklch red |

The pipeline bar renders four contiguous segments using `flex` with `width` proportional to count. Each segment uses its status `*-bg` token as background and `*-text` as label color.

### StandardRow — status badge

Same four status tokens. Badge renders as `inline-flex` with bg, text, and border tokens — identical pattern to existing badges in `ObservationLogCard`, `InterventionStatusBadge`, etc.

Renamed labels in UI (from IA naming conventions):

| Status value | Token group | UI label |
|---|---|---|
| `taught` | `--status-taught-*` | Taught |
| `scheduled` | `--status-behind-*` | Scheduled |
| `planned` | `--status-pending-*` | In a unit |
| `unmapped` | `--status-overdue-*` | Not mapped |

### StrandBadge — unchanged

All five strand token groups (`--strand-rl/ri/w/sl/l-*`) used as-is. No new strands.

### UnmappedGroup — header count badge

Uses `--status-overdue-bg` and `--status-overdue-text` for the count badge only (e.g., "8"). The group header text itself uses standard `--muted-foreground`. This keeps the alert signal present without making the entire header feel alarming.

### Grade progression block (in StandardDetailSheet)

| Element | Token |
|---|---|
| Current grade highlight | `--primary` (indigo) border-left accent |
| Predecessor/successor code | `--muted-foreground` |
| Predecessor/successor text | `--muted-foreground/70` (70% opacity if text available, 50% if code-only fallback) |
| Block background | `--muted/30` |

---

## Unchanged Token Groups

All existing token groups are used as-is by the redesigned components:

| Token group | Used by |
|---|---|
| `--primary`, `--secondary` | Search bar focus ring, ViewToggle active state, grade progression highlight |
| `--muted`, `--muted-foreground` | Group headers, secondary labels, empty state text |
| `--card`, `--border` | UnitCoverageGroup border, StandardDetailSheet background |
| `--strand-*` | StrandBadge on every StandardRow and in the detail sheet |
| `--status-*` | Pipeline bar, status badges, UnmappedGroup count |
| `--shadow-*` | StandardDetailSheet shadow |
| `--space-*`, `--font-size-*` | All new components |
| `--duration-*`, `--easing-*` | Sheet open/close, group expand/collapse |
| `--attainment-*` | Not used in this feature |
| `--recognition-*` | Not used in this feature |
