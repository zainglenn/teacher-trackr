# Design Brief: HOD Admin Panel

## Problem

Before a term begins, the HOD has to manually communicate to each teacher: which class they're teaching, which unit plan they're following, and when lesson plans are due. This happens through email, WhatsApp, or verbal briefings — none of which create an audit trail, and all of which leave teachers without a single source of truth.

## Solution

A structured setup flow the HOD completes once per term. They create classes, assign teachers, attach the master unit plan, and set lesson deadlines. Everything the teacher needs to know is waiting for them when they log in. Notifications fire automatically from the deadlines the HOD configured here.

## Experience Principles

1. **Setup once, run automatically** — The HOD should feel like they're configuring a system, not doing admin. Every deadline they set here triggers downstream reminders without further action.
2. **Guided over freeform** — The panel walks the HOD through setup in a logical sequence: create class → assign teacher → attach plan → set deadlines. No blank forms dropped in their lap.
3. **Editable without anxiety** — The HOD should be able to adjust a deadline or reassign a teacher mid-term without fear of breaking something. Changes preview their impact before saving.

## Aesthetic Direction

- **Philosophy**: Enterprise-lite. Clean, structured, trustworthy. Feels like a well-designed internal tool — not a consumer app, not a legacy school system.
- **Tone**: Organised and efficient. The HOD feels like they're running a tight operation.
- **Reference points**: Linear's settings pages, Notion's workspace settings, Vercel's project configuration.
- **Anti-references**: Wizard-heavy onboarding flows with too many steps. Cluttered school admin dashboards (SIMS, iSAMS). Anything with a sidebar that has 40 items.

## Existing Patterns

- **Typography**: Geist Sans throughout. Mono for class codes (6A, 6B).
- **Colors**: Neutral base. Sidebar deep blue. Action buttons use `--primary`. Destructive actions use `oklch(0.577 0.245 27.325)`.
- **Components**: `card.tsx`, `dialog.tsx`, `input.tsx`, `select.tsx`, `label.tsx`, `badge.tsx`, `separator.tsx`.
- **Layout**: Single-page app with sidebar. Admin panel is already a nav item in AppSidebar. This replaces or extends the existing AdminPanel view.

## Component Inventory

| Component | Status | Notes |
|-----------|--------|-------|
| Class list table | New | Rows: class name, teacher assigned, plan attached, deadline status, actions. |
| Create class dialog | New | Fields: class name (6A–6F), grade, subject. Uses existing `dialog.tsx`. |
| Teacher assignment select | New | Dropdown of registered teachers filtered by school. Uses `select.tsx`. |
| Plan attachment picker | New | Link master LTP to class. Search/select from existing HOD-owned plans. |
| Deadline timeline | New | Per class: list of lesson weeks with due date inputs. Inline editable. |
| Bulk deadline setter | New | Set all lesson deadlines at once (e.g. "every Monday before the lesson week"). |
| Class status badge | Modify | Extends existing `badge.tsx`. States: Setup, Active, Complete. |
| Notification rules panel | New | Per class / per grade: configure reminder lead time (e.g. 3 days before deadline). |
| `dialog.tsx` | Exists | Create/edit class dialogs. |
| `select.tsx` | Exists | Teacher assignment dropdown. |
| `input.tsx` | Exists | Class name, deadline date inputs. |
| `card.tsx` | Exists | Class cards in list view. |

## Key Interactions

- **Page load**: Shows list of all classes for the current academic year. Empty state prompts "Create your first class."
- **Create class**: Clicking "+ New Class" opens a dialog. HOD enters class name, grade, subject. On save, class appears in list with Setup badge and next steps inline.
- **Assign teacher**: Inline select in the class row (or expanded card). Saving triggers a welcome notification to the teacher.
- **Attach plan**: Opens a modal listing HOD's existing master LTPs. HOD selects one. If no master plan exists, a shortcut to create one is surfaced.
- **Set deadlines**: Expanding a class shows the lesson week timeline. HOD sets a due date per week. Bulk setter option: "Set weekly cadence" auto-fills all weeks from a start date.
- **Edit mid-term**: Clicking a deadline shows an inline date picker with a warning: "3 teachers have already been notified of the original deadline. Changing this will resend notifications."
- **Notification rules**: Accordion section at the bottom of each class card. HOD sets: reminder lead time, who receives alerts (teacher / HOD / both).

## Responsive Behavior

- **Desktop**: Two-panel layout. Left: class list. Right: expanded class detail with deadline timeline.
- **Tablet**: Single panel. Class list full width. Tap class to open detail in a sheet.
- **Mobile**: Class cards stacked vertically. Tap to expand inline. Deadline timeline becomes a vertical list.

## Accessibility Requirements

- All form inputs have visible labels (not just placeholders).
- Date inputs use native `<input type="date">` with visible format hint.
- Dialog focus trapped when open. Closes on Escape.
- Destructive actions (delete class, remove teacher) require confirmation dialog.
- Contrast 4.5:1 minimum on all text.

## Out of Scope

- Creating or editing the master lesson plan content (that happens in the LTP/Unit Plan editor).
- Managing student rosters (Manage Classes view handles that).
- Cross-year plan copying / templating (future).
- School-level academic calendar configuration (future — term dates are a separate settings concern).
