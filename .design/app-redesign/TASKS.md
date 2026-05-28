# Build Tasks: App Redesign — Sidebar & Top-Level Views

Generated from: `.design/app-redesign/DESIGN_BRIEF.md`
Date: 2026-05-28

## Foundation

- [x] **Token refinements**: In `globals.css`, dim the strand colour backgrounds and borders (reduce saturation ~40%), tighten `--radius` from `0.625rem` to `0.5rem` for a sharper feel, shift `--background` from pure white to a very subtle off-white (`oklch(0.985 0.002 264)`), and reduce `--border` opacity slightly for a lighter grid. This sets the monochrome-with-precise-accent tone before any components are touched. _Modifies: `src/app/globals.css`._

- [x] **AppSidebar redesign**: Narrow the sidebar to 220px, reduce nav item height to 32px, tighten the header (smaller logo block, tighter padding), make the footer more compact (username + role badge on one line, sign-out icon right-aligned). Active nav state: 2px left indigo border + `bg-sidebar-accent/60` tint — no filled pill. Nav item font: `text-sm`, `font-medium` when active, `font-normal` otherwise. Remove the `SidebarGroupContent` label group. _Modifies: `src/components/AppSidebar.tsx`._

## Core UI

- [x] **PageContainer tightening**: Reduce page title from `text-2xl` to `text-lg font-semibold tracking-tight`. Replace the `border-b` divider with bottom margin only (`mb-6`). Description text stays `text-sm text-muted-foreground`. The goal: page headers feel like Linear section headers, not hero banners. _Modifies: `src/components/PageContainer.tsx`._

- [x] **StatCard redesign**: Remove the Card wrapper's implicit shadow — use `border border-border bg-card` directly. Reduce padding from `p-4` to `p-3`. Shrink value from `text-2xl font-bold` to `text-xl font-semibold`. Label: `text-[11px] font-medium uppercase tracking-wider text-muted-foreground`. Icon: `h-4 w-4` at top-right. Add optional `trend` prop (e.g. "+3 this week") in `text-xs text-muted-foreground`. _Modifies: `src/components/StatCard.tsx`._

- [x] **StrandBadge dimmed variant**: Add a `variant="muted"` prop that uses low-saturation strand colours — smaller dot + strand code only, no filled background pill. The current default (filled bg) stays for the UnitPlanView standards table; the muted variant is for list views and dashboard. _Modifies: `src/components/ltp/StrandBadge.tsx`._

## Views

- [x] **DashboardView (HOD)**: Replace the stat card grid with the updated StatCard. Convert the "Plans Needing Attention" section from cards to a tight table-style row list: plan title (truncated), teacher name, oldest submitted unit age, status chip — all in one `48px` row with hover highlight. Coverage heatmap: tighter cells, smaller text, less outer padding. Remove `PageContainer` wrapper border-b — just use spacing. _Modifies: `src/components/DashboardView.tsx`._

- [x] **DashboardView (Teacher)**: Same stat card treatment. If a teacher dashboard exists (it currently falls through to the HOD version with `isHod=false`), verify the empty/loading states also match the tighter aesthetic. _Modifies: `src/components/DashboardView.tsx`._

- [x] **MyUnitsView list redesign**: Replace unit cards with a dense row list grouped by term. Each row: term label (left, `text-xs text-muted-foreground`), unit title (`text-sm font-medium`), strand dots (muted variant, inline), status badge (right-aligned, `text-xs`). Row height: `~44px`. Hover: `bg-muted/50`. Click navigates to UnitPlanView. Term group headers: `text-xs font-semibold uppercase tracking-wider text-muted-foreground` with a thin divider. _Modifies: `src/components/MyUnitsView.tsx`._

- [x] **LongTermPlanView list redesign**: Replace plan cards with a dense row list. Each row: plan title (`text-sm font-medium`), school year (`text-xs text-muted-foreground`), member count (icon + number), aggregate status badge — all in one `~48px` row. New Plan button: small, top-right, `variant="outline" size="sm"`. Empty state: centered, minimal — icon + two lines of text, no card wrapper. _Modifies: `src/components/LongTermPlanView.tsx`._

## Polish & Accessibility

- [x] **Contrast audit on dimmed strand colours**: All five strand bg+text combinations pass WCAG AA — ratios 7.36–9.20. No token adjustments needed. _Verified via canvas-based programmatic check in browser._

- [x] **Focus ring + keyboard nav pass**: All interactive elements have `focus-visible:ring-2 focus-visible:ring-ring/50`. Sign-out button has `aria-label`. LongTermPlanView rows changed from `<div>` to `<button>`. Delete span uses `role="button" tabIndex={0}`. _Touches: AppSidebar, MyUnitsView, LongTermPlanView, DashboardView._

- [x] **Mobile sidebar + responsive stat grid**: Offcanvas sidebar confirmed at 375px. Stat grid fixed to `grid-cols-2 lg:grid-cols-4` (was `sm:grid-cols-4` which was too wide at tablet with sidebar). No horizontal overflow at 375px. _Modifies: DashboardView.tsx._

## Review

- [x] **Design review**: Completed. See `.design/app-redesign/DESIGN_REVIEW.md`. Screenshots at desktop/tablet/mobile captured. Two "should fix" items addressed: sidebar trigger hidden on md+, page title "Long Term Plan" → "Master Plans".
