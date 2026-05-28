# Design Brief: App Redesign — Sidebar & Top-Level Views

## Problem

The app looks like every other admin dashboard. Teachers open it every day to plan and log their work, but nothing about the interface signals that this is a tool built specifically for curriculum planning. The generic shadcn defaults — neutral cards, loose spacing, standard sidebar — create a feeling of "template" rather than "product." There's no visual identity. It doesn't feel purposeful.

## Solution

Redesign the shell (sidebar) and top-level views (Dashboard, My Units, Master Plans list) with a purposeful, tool-like aesthetic that matches how Linear and Vercel treat professional tools: high information density, extreme restraint in decoration, precise typography, and colour used only where it earns its place. The result should feel like something built for a specific job — not assembled from a UI kit.

## Experience Principles

1. **Density over decoration** — Pack more meaningful information into less space. Remove padding that doesn't separate content. Never use a card where a row will do. Every element on screen should be there because a teacher needs it, not because it fills space.

2. **Restraint with colour** — Strand colours (RL/RI/W/SL/L) are kept but significantly dimmed — used as identifiers (small dot, left border, muted chip) not fills. The primary palette is near-monochrome: near-black text, light grey backgrounds, one precise indigo accent. Colour means something or it isn't used.

3. **Typography does the work** — Hierarchy is expressed through size, weight, and letter-spacing — not colour, borders, or shadows. Geist at tight tracking for headings, regular weight for body. A clear 3-level type scale: page title → section header → body/label.

## Aesthetic Direction

- **Philosophy**: Purposeful tool — Linear meets Vercel dashboard. Professional without being corporate. Dense without being cluttered. Every pixel earns its place.
- **Tone**: Calm, precise, authoritative. Feels like a tool built for experts, not a consumer app or edu-tech SaaS.
- **Reference points**: Linear (sidebar, nav density, monochrome base), Vercel dashboard (stat presentation, table rows, muted palette with precise accent), GitHub (information density, status chips)
- **Anti-references**: Google Classroom (pastel cards, rounded everything, playful), generic shadcn defaults (white cards with shadows, loose padding), edu-tech SaaS (colourful, icon-heavy, everything feels like a feature announcement)

## Existing Patterns

- **Typography**: Geist Sans (already loaded via `--font-geist-sans`), Geist Mono for code/usernames. Full type scale defined in `globals.css`.
- **Colours**: Full token system in `globals.css` — shadcn base (indigo primary `oklch(0.49 0.20 264)`), strand colours (RL=blue, RI=violet, W=amber, SL=emerald, L=rose), delivery status tokens (taught/behind/overdue/pending). All in CSS variables — no hardcoded hex.
- **Spacing**: 4px base unit, `--space-1` through `--space-12` defined. Tailwind classes preferred.
- **Components**: Full shadcn/ui library (Sidebar, Card, Badge, Button, etc.). `PageContainer`, `StatCard`, `StrandBadge`, `LTPStatusBadge` are project-specific reusable components.
- **Motion**: Tokens defined (`--duration-fast: 150ms`, `--easing-default`). Reduced-motion media query already in globals.

## Component Inventory

| Component | Status | Notes |
| --- | --- | --- |
| AppSidebar | Modify | Tighten padding, reduce nav item height, make header more compact, adjust footer layout |
| DashboardView (HOD) | Modify | Tighten stat cards, make coverage heatmap denser, reduce card chrome |
| DashboardView (Teacher) | Modify | Same density treatment — less whitespace, cleaner hierarchy |
| MyUnitsView | Modify | Top-level list view — tighter rows, better status presentation |
| LongTermPlanView | Modify | Plan list — tighter rows, cleaner status badges |
| StatCard | Modify | Reduce padding, tighter label/value presentation |
| PageContainer | Modify | Reduce top padding, tighter page title sizing |
| StrandBadge | Modify | Dimmed colour variant — muted bg, lower-saturation text |

## Key Interactions

- **Sidebar nav items**: Tighter hit targets (32px height vs current ~36px). Active state: indigo left border + subtle background tint, not filled pill. Hover: very subtle grey tint, no transform.
- **Stat cards**: Compact — label (xs, muted), value (lg, semibold), optional delta/trend in xs muted. No card border shadow — use `border border-border` only.
- **Plan/unit rows**: Click to navigate. Hover: `bg-muted/50` row highlight. Status badge inline, right-aligned.
- **Page headers**: Page title (text-lg, font-semibold, tight tracking) + optional subtitle (text-sm, muted). No hero padding.

## Responsive Behavior

- **Sidebar**: Collapses to offcanvas on mobile (existing behaviour kept). On desktop, fixed width — target 220px (down from current ~256px default).
- **Top-level views**: Single column on mobile, multi-column grid on tablet+. Stat cards: 2-col on mobile, 4-col on desktop.
- **Tables/lists**: Horizontal scroll on mobile rather than collapsed rows — these are data-dense tools used on desktop primarily.

## Accessibility Requirements

- All text meets WCAG AA contrast (4.5:1 body, 3:1 large). Dimmed strand colours must be checked — muted backgrounds with muted text need verification.
- Keyboard navigation: all nav items, buttons, and interactive rows reachable via Tab. Active sidebar item must have visible focus ring.
- Reduced-motion: already handled globally in `globals.css` — no new motion to add.
- Icon-only buttons (sign-out) must have `title` or `aria-label`.

## Out of Scope

- UnitPlanView (the deep unit editor) — second pass
- HODAdminPanel, DeliveryGridView, CoverageView, StudentProgressView — second pass
- Dark mode token changes — light mode only for this pass
- New navigation structure or IA changes — nav items and routing are frozen
- AuthGate / login screen
- Admin views (ManageUsersView, AdminView)
