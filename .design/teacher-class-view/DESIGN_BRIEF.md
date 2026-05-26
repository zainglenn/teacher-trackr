# Design Brief: Teacher Class View

## Problem

A teacher opens the app and sees a plan someone else built. They need to know: what am I supposed to teach this week, have I logged last week's delivery, and am I going to miss any standards before the end of term? Right now none of that is visible. The teacher has to mentally translate a unit plan document into a week-by-week delivery schedule, track their own progress in their head, and hope they haven't missed anything.

## Solution

A focused, week-oriented view of the master plan as it applies to one class. The teacher sees their class's lesson weeks in order, with clear delivery status per week, a one-tap "Mark as taught" action, a text area for class-specific notes, and an AI warning banner when standards are at risk of not being covered before the term ends. Generating the lesson PPT for the week is available from the same screen.

## Experience Principles

1. **This week first** — The current lesson week is always the entry point. Past weeks are accessible but visually receded. Future weeks are visible but don't compete for attention.
2. **Minimum viable input** — Logging delivery is one checkbox. Adding notes is optional. The teacher should never feel like the app is adding to their workload.
3. **Proactive, not reactive** — AI coverage warnings appear before a standard is missed, not after. The teacher feels supported, not audited.

## Aesthetic Direction

- **Philosophy**: Focused task view. Clean and purposeful. Feels like a well-designed checklist tool with curriculum intelligence layered on top.
- **Tone**: Calm, supportive, slightly warm. The teacher feels helped, not monitored.
- **Reference points**: Todoist's Today view, Linear's My Issues, a well-designed teaching planner.
- **Anti-references**: A read-only document dump. Anything that feels like surveillance or bureaucratic compliance. Busy tabbed interfaces requiring 4 clicks to log a lesson.

## Existing Patterns

- **Typography**: Geist Sans. Standard codes in Geist Mono (RL.6.1, W.6.3).
- **Colors**: Strand colours baked in — RL=blue, RI=violet, W=amber, SL=emerald, L=rose. Status colours: green (delivered), amber (in progress / current week), neutral (future).
- **Components**: `card.tsx`, `badge.tsx`, `progress.tsx`, `textarea.tsx`, `tooltip.tsx`, `separator.tsx`.
- **Existing patterns**: UnitPlanView already has a standards table and lesson week structure. This view reads from the same data without the edit capability.

## Component Inventory

| Component | Status | Notes |
|-----------|--------|-------|
| Class header bar | New | Class name (6A), subject, teacher name, term selector, progress summary. |
| Lesson week card | New | Week number, lesson title, focus, delivery status, standards list, actions. |
| Delivery checkbox | New | Single tap marks week as taught. Triggers confirmation nudge if standards are unmapped. |
| Class notes textarea | Modify | Extends `textarea.tsx`. Per-class, per-week. Autosaves. Placeholder: "Add notes for this class..." |
| Standards chip list | Modify | Compact read-only version of strand-coloured standard badges. Tap to see full description in tooltip. |
| Coverage warning banner | New | AI-generated. "You're in Week 6. These 4 standards have no lesson planned this term." Dismissable but resurfaces next session. |
| Generate PPT button | New | Per lesson week. Opens PPT generation flow (see separate brief). |
| Term progress bar | Modify | Extends `progress.tsx`. Shows X/Y weeks delivered for this class. |
| Past weeks accordion | New | Weeks before current collapsed by default. Expandable to review delivery history. |
| `badge.tsx` | Exists | Standard strand badges, deadline labels. |
| `tooltip.tsx` | Exists | Full standard description on hover/tap. |
| `skeleton.tsx` | Exists | Loading state for lesson week cards. |

## Key Interactions

- **Page load**: Scrolls to current week automatically. Past weeks collapsed above. Future weeks visible below in muted state.
- **Mark as taught**: Teacher taps checkbox on current week card. Card background shifts to green. Delivery timestamp recorded. If any standards in that week have no student attainment logged, a soft prompt appears: "Don't forget to log attainment for these standards."
- **Add class note**: Textarea below the lesson detail. Autosaves on blur. Character count visible. HOD can read these notes in the delivery grid detail drawer.
- **Coverage warning**: Banner appears at top of page when AI detects at-risk standards. Shows standard codes with strand colour. Link: "See all uncovered standards." Dismissing hides it for 24 hours.
- **Generate PPT**: Button on each week card. Opens generation flow (separate brief). On completion, download link appears inline on the card.
- **View past week**: Expanding a past week card shows the delivery note, standards taught, and a read-only view of the lesson content.
- **Switch term**: Tab selector at top. Switching re-renders the week list for that term.

## Responsive Behavior

- **Desktop**: Two-column layout. Left: lesson week list (scrollable). Right: selected week detail panel (sticky). Standards, notes, and actions in the right panel.
- **Tablet**: Single column. Tapping a lesson week card expands it inline to show full detail.
- **Mobile**: Full-width cards stacked vertically. Delivery checkbox prominent at top of each card. Notes collapse behind a "Add note" tap target.

## Accessibility Requirements

- Delivery checkbox has visible focus ring and keyboard toggle (Space).
- Status communicated via icon + colour (not colour alone): ✓ green, ⏱ amber, ○ neutral.
- Coverage warning banner uses `role="alert"` so screen readers announce it.
- Standard codes readable by screen reader with full description in `aria-label`.
- All interactive elements meet 44×44px touch target size on mobile.

## Out of Scope

- Editing the master lesson plan content (read-only in this view — editing happens in UnitPlanView by the HOD).
- Student attainment logging (separate Student Progress view).
- Viewing other classes' delivery (teacher sees only their assigned class).
- PPT generation details (covered in PPT Generation brief).
