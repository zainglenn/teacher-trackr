# Design Review: App Redesign — Sidebar & Top-Level Views

Reviewed against: `DESIGN_BRIEF.md`
Philosophy: Purposeful tool — Linear meets Vercel dashboard
Date: 2026-05-28

## Screenshots Captured

| Screenshot | Breakpoint | Description |
| --- | --- | --- |
| `screenshots/review-hod-dashboard-desktop-1280.png` | Desktop (1280×800) | HOD Dashboard — stat cards + coverage heatmap |
| `screenshots/review-hod-dashboard-tablet-768.png` | Tablet (768×1024) | HOD Dashboard — 2×2 stat card layout |
| `screenshots/review-auth-mobile-375.png` | Mobile (375×812) | HOD Dashboard — mobile, offcanvas sidebar closed |
| `screenshots/review-hod-sidebar-open-mobile-375.png` | Mobile (375×812) | Offcanvas sidebar open |
| `screenshots/review-hod-masterplans-desktop-1280.png` | Desktop (1280×800) | Master Plans — empty state |
| `screenshots/review-hod-masterplans-mobile-375.png` | Mobile (375×812) | Master Plans — empty state mobile |

> All screenshots are in `.design/app-redesign/screenshots/`.

## Summary

The redesign achieves its stated goal: the interface now reads as a tool rather than a template. The sidebar is tight, nav hierarchy is clear, and the row-list pattern is consistent across all three top-level list views. The primary outstanding issue is a density mismatch — the desktop layout has a lot of blank canvas when data is sparse (new environment), which is normal for a tool but means the empty states do a lot of visual work.

## Must Fix

_None._ No broken functionality, accessibility failures, or major deviations from the brief.

## Should Fix

1. **Sidebar toggle button visible on desktop**: The `SidebarTrigger` (☰ icon) renders in the top-left of the content area at all breakpoints. On desktop at ≥1280px the sidebar is always visible; the toggle is unnecessary noise and pushes content down by ~20px. Consider hiding it above the `lg` breakpoint: `className="lg:hidden"` on the trigger wrapper, or removing it if the sidebar is never meant to collapse on desktop.
   _Fix: Add `className="lg:hidden"` to the `<SidebarTrigger>` in the layout/page component._

2. **Page title "Long Term Plan" vs nav label "Master Plans"**: The `PageContainer` title inside `LongTermPlanView` says "Long Term Plan" while the sidebar nav says "Master Plans". This inconsistency will confuse users who try to tell colleagues where to find something. See [`screenshots/review-hod-masterplans-desktop-1280.png`].
   _Fix: Change `title="Long Term Plan"` to `title="Master Plans"` in `LongTermPlanView.tsx`._

## Could Improve

1. **Sidebar footer avatar initials**: The "N" avatar in the footer is a shadcn default initials bubble that isn't referenced in the brief. It adds visual weight without adding information (the username is already displayed as text next to it). Could be removed or replaced with a smaller monogram treatment consistent with the monochrome palette.

2. **Coverage heatmap percentage chips**: The `0%` chips in the coverage heatmap use the full strand badge background (e.g. `bg-red-50 text-red-600 border-red-100`). At 0% all strands show red, which reads as an error state rather than a neutral "not started". A muted grey chip for 0% would communicate "no data yet" more accurately, reserving the red warning for values that are behind a target. Requires a threshold-based chip color logic in `DashboardView.tsx`.

3. **Empty state vertical position**: On the Master Plans desktop view, the empty state (icon + 2 lines) floats in the upper quarter of a very tall blank canvas. Centering it vertically in the available viewport height (`min-h-[calc(100vh-200px)] flex items-center justify-center`) would feel more intentional. See [`screenshots/review-hod-masterplans-desktop-1280.png`].

4. **StrandBadge muted variant dot size**: The colored dot in the muted variant is `h-1.5 w-1.5` (6px). At very small text sizes this can feel invisible. Consider `h-2 w-2` (8px) for slightly more presence while still feeling lightweight.

## What Works Well

- **Sidebar**: Exactly matches the brief — 220px width, 32px nav items, 2px left indigo border active state, `bg-sidebar-accent/60` tint. The typography-only hierarchy (font-medium active, font-normal inactive, muted inactive color) is precise and intentional.
- **Stat cards**: The `text-xl font-semibold` value + `text-[11px] uppercase tracking-wider` label combination creates the right weight hierarchy. The absence of card shadows with `border border-border` gives exactly the "flat precision" the brief calls for.
- **Row-list pattern**: Consistent across Dashboard (coverage table), Master Plans (plan rows), My Units (unit rows). The `divide-y divide-border` pattern with `h-11`/`h-12` rows and `hover:bg-muted/50` is clean and scannable.
- **Contrast audit**: All five dimmed strand bg+text combinations pass WCAG AA with excellent ratios — RL: 8.75, RI: 9.20, W: 7.87, SL: 8.95, L: 7.36. No adjustments needed.
- **Focus rings**: All interactive elements have visible `focus-visible:ring-2 focus-visible:ring-ring/50` rings. Sign-out button has `aria-label`. Delete spans have `role="button" tabIndex={0}`.
- **Responsive behavior**: Offcanvas sidebar at 375px works correctly. Stat cards show 2-col on mobile/tablet and switch to 4-col at `lg` (1024px+) — fixed from `sm:` to `lg:` during this review. No horizontal overflow at 375px.
- **Tone**: The combination of off-white background (`oklch(0.985 0.002 264)`), pure white cards, and near-black text on a 220px compact sidebar reads immediately as a professional tool. The indigo accent appears only where it earns its place — active nav item border, primary action buttons. Nothing feels decorative.
