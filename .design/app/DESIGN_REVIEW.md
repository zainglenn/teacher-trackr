# Design Review: New Views — Delivery Grid, Admin Panel, My Class, PPT Generation

Reviewed against: `.design/hod-delivery-grid/DESIGN_BRIEF.md`, `.design/hod-admin-panel/DESIGN_BRIEF.md`, `.design/teacher-class-view/DESIGN_BRIEF.md`, `.design/ppt-generation/DESIGN_BRIEF.md`

Philosophy: Dieter Rams meets Swiss International — clinical precision, warm human touches.

Date: 2026-05-26

---

## Screenshots Captured

| Screenshot | Breakpoint | View |
|---|---|---|
| `.playwright-mcp/page-2026-05-26T07-09-13-436Z.jpeg` | Desktop 1280×800 | Delivery Grid — empty state |
| `.playwright-mcp/page-2026-05-26T07-09-23-105Z.jpeg` | Tablet 768×1024 | Delivery Grid — empty state |
| `.playwright-mcp/page-2026-05-26T07-09-36-079Z.jpeg` | Mobile 375×812 | Delivery Grid — empty state |
| `.playwright-mcp/page-2026-05-26T07-11-24-163Z.jpeg` | Desktop 1280×800 | Admin Panel — Classes tab |
| `.playwright-mcp/page-2026-05-26T07-11-33-263Z.jpeg` | Tablet 768×1024 | Admin Panel — Classes tab |
| `.playwright-mcp/page-2026-05-26T07-11-43-484Z.jpeg` | Mobile 375×812 | Admin Panel — Classes tab |
| `.playwright-mcp/page-2026-05-26T07-12-58-920Z.jpeg` | Desktop 1280×800 | My Class — empty state |
| `.playwright-mcp/page-2026-05-26T07-13-07-205Z.jpeg` | Tablet 768×1024 | My Class — empty state |
| `.playwright-mcp/page-2026-05-26T07-13-18-004Z.jpeg` | Mobile 375×812 | My Class — empty state |

> PPT Generation sheet could not be triggered without a master plan attached to a class. Review is based on code inspection.

---

## Summary

The four new views land in good shape — the design system is coherent, token usage is disciplined, and accessibility coverage is stronger than most first builds (role="alert", aria-labels, role="progressbar" all in place). The primary gap is structural: the Admin Panel deviates from the brief's two-panel desktop layout, the My Class header is underbuilt relative to spec, and `PptGenerationSheet` hardcodes hex colors that bypass the CSS token system. All three are fixable without major rework.

---

## Must Fix

### 1. `PptGenerationSheet` — Hardcoded hex colors bypass token system
**File:** `src/components/PptGenerationSheet.tsx` lines 76–81

```ts
title: { background: "#1E293B", color: "#FFFFFF" },
objectives: { background: "#EFF6FF", color: "#1E40AF", borderColor: "#DBEAFE" },
```

These values are duplicates of CSS token values, hardcoded directly. They will not update if the token palette changes and will break dark mode rendering in any future dark-mode slide preview. Fix by referencing the CSS vars:

```ts
title:      { background: "var(--sidebar)",  color: "var(--sidebar-foreground)" },
objectives: { background: "var(--strand-rl-bg)", color: "var(--strand-rl-text)", borderColor: "var(--strand-rl-border)" },
standards:  { background: "var(--strand-ri-bg)", color: "var(--strand-ri-text)", borderColor: "var(--strand-ri-border)" },
activities: { background: "var(--strand-sl-bg)", color: "var(--strand-sl-text)", borderColor: "var(--strand-sl-border)" },
vocabulary: { background: "var(--muted)",     color: "var(--muted-foreground)", borderColor: "var(--border)" },
exit:       { background: "var(--sidebar)",   color: "var(--sidebar-foreground)" },
```

### 2. Delivery Grid — Empty state has no action
**File:** `src/components/DeliveryGridView.tsx`

The empty state reads "Attach a master plan to classes in the Admin Panel to populate the grid." This is correct guidance but offers no shortcut. The brief calls for an actionable empty state. A user should be able to click through directly. Fix by adding a secondary button:

```tsx
<Button variant="outline" size="sm" onClick={() => onNavigate?.("hod-admin")}>
  Go to Admin Panel
</Button>
```

This requires passing an `onNavigate` prop from `page.tsx` (same pattern as `DashboardView`).

---

## Should Fix

### 3. Admin Panel — Desktop layout is single column, brief specifies two-panel
**File:** `src/components/HODAdminPanel.tsx`

The brief defines: "Desktop: Two-panel layout. Left: class list. Right: expanded class detail with deadline timeline." The current implementation is a single `max-w-3xl` centered column at all breakpoints. At 1280px wide, this wastes half the screen. The class list should live on the left (~60%) with a selected-class detail panel on the right (~40%) that shows the deadline timeline inline.

This is the largest structural deviation from the spec. Priority: high if deadline configuration will be used frequently by HODs.

### 4. My Class — Header bar is incomplete
**File:** `src/components/MyClassView.tsx`

The brief specifies the class header bar should contain: "class name, subject, teacher name, term selector, progress summary." The current implementation only shows `<h1>6B</h1>` and "Your class" as a subtitle. Missing:
- Subject name (Grade 6 English)
- Teacher name (Jade Glenn)
- Term selector tabs
- Progress bar (X/Y weeks delivered)

The component already tracks `deliveryCount` and `totalWeeks` — the progress bar just needs to be surfaced in the header, not only below the cards.

### 5. Notifications tab — Save button is a no-op
**File:** `src/components/HODAdminPanel.tsx` line 378

```tsx
<Button size="sm" className="w-full" onClick={() => {}}>
  Save notification settings
</Button>
```

The `onClick` does nothing. The `reminderDays` state is collected but never persisted. Either wire it to a Supabase update on the `class_lesson_deadlines` table, or replace with a disabled state + "Coming soon" label until the backend is ready. A button that does nothing is worse than no button.

### 6. Delivery Grid — Term tabs lack visible active indicator at mobile
**Screenshot:** `page-2026-05-26T07-09-36-079Z.jpeg`

At 375px the term tabs render correctly (Term 1 has a pill outline, Term 2 and 3 are plain). But the pill outline is thin and low-contrast against the background. On a physical device in bright sunlight this would be easy to miss. Increase the contrast of the selected tab — use `bg-foreground text-background` (filled pill) rather than just an outline.

---

## Could Improve

### 7. Admin Panel — Class badge overflows with its own label
Each class card has a dark avatar badge showing the class code ("6A") and a separate heading text also showing "6A" immediately beside it. This is redundant. The badge is a navigation aid / avatar; the heading is the label. Consider either removing the text heading and enlarging the badge, or removing the badge and using a coloured left border per class instead.

### 8. My Class — "Your class" subtitle is generic
`src/components/MyClassView.tsx` line ~60. The subtitle "Your class" adds no information — the teacher already knows it's their class. Replace with the subject name: "Grade 6 English" (pulled from the class's LTP title or a `subject` field on the class).

### 9. Delivery Grid — Empty state visual weight
The empty state sentence sits inside a faint bordered card with minimal padding. At desktop the card is very small relative to the surrounding whitespace, making the page feel unfinished. Expand the card padding (`py-16`) and add the `Grid3X3` icon above the text to signal what will appear here when configured — consistent with the My Class empty state which does this well with a book icon.

### 10. PptGenerationSheet — Slide preview colours are representational only
The slide preview in `PptGenerationSheet` uses colour-coded backgrounds per slide type (objectives = blue, standards = violet, etc.) which creates a clear visual hierarchy in the preview. This is good. However the colours used in the preview don't exactly match what PptxGenJS will render in the actual PPTX — the PPTX uses the `STRAND_COLORS` hex map in `route.ts`. Consider aligning these two colour maps so the preview is an accurate representation of the download.

---

## What Works Well

**Token discipline in DeliveryGridView:** Every status colour is referenced through `var(--status-*)` tokens — no hardcoded hex values. This is the best token coverage of any component in the project and makes dark mode trivial to add.

**Accessibility baseline:** `role="alert"` on the overdue banner and coverage warning, `aria-label` on all icon buttons, `role="progressbar"` with `aria-label` on PPT generation — this is a genuinely solid accessibility baseline for a v1 build.

**Empty states communicate cause:** Both "No master plan attached" (My Class) and "Attach a master plan to classes in the Admin Panel" (Delivery Grid) explain *why* the content is missing and *where* to fix it. This is the right pattern — not just "No data" but "Here's what to do next."

**Admin Panel responsive cascade:** The two-column `sm:grid-cols-2` within each class card (Teacher | Master Plan) collapses correctly at mobile to stacked single column with clean dividers. No horizontal overflow at any breakpoint.

**Teacher name fix:** The UUID display bug was caught and fixed (Radix Select lazy content issue — resolved by rendering `cls.teacher.full_name` directly in `SelectValue`). The fix is correct and robust.

**Typography consistency:** Geist Sans loads correctly at all breakpoints. The type scale from `text-xs` captions through `text-sm` body to `text-lg font-semibold` headings is used consistently across all four components, matching the existing system.

**Sidebar role clarity:** The teacher sees "My Class" and the HOD sees "Delivery Grid" + "Admin Panel" — the nav correctly reflects the role split. No leakage of HOD items into teacher views or vice versa.
