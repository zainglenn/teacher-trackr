# Build Tasks: Curriculum Tracker — Full Product Backlog

Generated from:
- `.design/hod-delivery-grid/DESIGN_BRIEF.md`
- `.design/hod-admin-panel/DESIGN_BRIEF.md`
- `.design/teacher-class-view/DESIGN_BRIEF.md`
- `.design/ppt-generation/DESIGN_BRIEF.md`
- `.design/app/INFORMATION_ARCHITECTURE.md`

Date: 2026-05-24

---

## Foundation
These tasks are prerequisites. Nothing else can be built correctly without them.

- [ ] **Database migration — multi-tenancy**: Add `school_id uuid` (FK to a new `schools` table) to `long_term_plans`, `ltp_units`, `ltp_unit_standards`, `profiles`. Add a `schools` table (`id`, `name`, `created_at`). Update all Supabase RLS policies to filter by `school_id`. _New tables. No UI change._

- [ ] **Database migration — classes**: Create `classes` table (`id`, `school_id`, `name` e.g. "6A", `grade`, `subject`, `teacher_id` FK to profiles, `ltp_id` FK to long_term_plans, `academic_year`, `created_at`). Create `class_lesson_deliveries` table (`id`, `class_id`, `unit_id`, `week_number`, `delivered_at`, `notes`, `delivered_by`). _New tables. No UI change._

- [ ] **Database migration — deadlines**: Add `deadline_date timestamptz` and `reminder_days_before int default 3` columns to a new `class_lesson_deadlines` table (`id`, `class_id`, `unit_id`, `week_number`, `deadline_date`, `reminder_days_before`). _New table. No UI change._

- [ ] **StrandBadge token migration**: Update `StrandBadge.tsx` to use `var(--strand-*-bg)`, `var(--strand-*-text)`, `var(--strand-*-border)` CSS custom properties instead of hardcoded Tailwind color classes. Verify all 5 strands render correctly in light and dark mode. _Modifies: `StrandBadge.tsx`._

- [ ] **Navigation restructure**: Update `AppSidebar.tsx` — rename "My Units" → "My Class", rename "HOD Review" → "Delivery Grid", remove "Unit Assignments" nav item (merged into Admin Panel), rename "Manage Classes" → "Admin Panel". Update HOD badge to show overdue delivery count instead of resubmit count. Update teacher sidebar to show only 4 items: Dashboard, My Class, Standards Coverage, Student Progress. _Modifies: `AppSidebar.tsx`, `page.tsx` view state enum._

---

## HOD Admin Panel
The setup infrastructure everything else depends on. Build this before Delivery Grid or Teacher Class View.

- [ ] **Admin Panel shell + class list**: Replace the current `AdminView` / `ManageClassesView` with a new `HODAdminPanel` component. Three tabs: Classes / Deadlines / Notifications. Classes tab shows a table of existing classes with columns: Class, Teacher, Plan attached, Status badge (Setup / Active / Complete), Actions. Empty state: "No classes yet — create your first class." _New component. Reuses: `card.tsx`, `badge.tsx`, `separator.tsx`._

- [ ] **Create / edit class dialog**: "+ New Class" button opens a `dialog.tsx`. Fields: Class name (text input, e.g. "6A"), Grade (select), Subject (select). Save creates the class row. Edit opens the same dialog pre-filled. Delete triggers a confirmation dialog with destructive action styling. _New component. Reuses: `dialog.tsx`, `input.tsx`, `select.tsx`, `label.tsx`._

- [ ] **Teacher assignment**: Inline select in each class row — dropdown of teachers filtered to the same school. On save, the selected teacher receives a welcome in-app notification. Unassigned state shows "Assign teacher" as a placeholder action. _New interaction. Reuses: `select.tsx`._

- [ ] **Master plan attachment**: Each class row has an "Attach plan" action. Opens a sheet listing the HOD's existing master LTPs (title, year, status). HOD selects one. If no plan exists, a shortcut link to Long Term Plan view is shown. Attached plan name appears inline on the class row with a link to open it. _New component. Reuses: `sheet.tsx`, `card.tsx`._

- [ ] **Deadline timeline (Deadlines tab)**: Deadlines tab shows a per-class accordion. Expanding a class shows a vertical list of lesson weeks with an inline date picker per week. "Set weekly cadence" button auto-fills all week deadlines from a start date + weekly interval. Saving a deadline that changes a previously-set value shows a warning: "Teachers have already been notified. Changing this will resend." _New component. Reuses: `input.tsx` (type=date), `separator.tsx`._

- [ ] **Notification rules (Notifications tab)**: Notifications tab shows per-class reminder settings: reminder lead time (days before deadline), who receives alerts (teacher / HOD / both). Saved to `class_lesson_deadlines.reminder_days_before`. Simple form, saves on blur. _New component. Reuses: `select.tsx`, `input.tsx`, `label.tsx`._

---

## HOD Delivery Grid
The highest-priority and highest design-risk view. Build early to validate the aesthetic before details accumulate.

- [ ] **Delivery grid layout shell**: New `DeliveryGridView` component. Replaces `HODReviewView`. Renders a grid: class columns (6A–6F) as headers, lesson weeks as rows, fixed first column for week labels. Uses CSS Grid with sticky header row and sticky first column. Term selector tabs at top (Term 1 / 2 / 3). Loads with skeleton cells while data fetches. _New component. Reuses: `skeleton.tsx`._

- [ ] **Status cells**: Each grid cell renders a `DeliveryCell` component. States: taught (green, ✓), behind (amber, ⏱), overdue (red, ✕), pending (neutral, ○). Status derived from: `class_lesson_deliveries` record exists → taught; deadline passed with no record → overdue; deadline within 3 days → behind; otherwise → pending. Color uses `var(--status-*-*)` tokens. Icon + colour (never colour alone). _New component. Reuses: design tokens._

- [ ] **Delivery detail sheet**: Clicking any cell opens a `sheet.tsx` from the right. Content: class name + teacher, lesson week title + focus, delivery date (or "Not yet delivered"), teacher class notes, standards taught (strand-coloured badges). HOD actions: "Message teacher" (placeholder for v1), "Extend deadline" (opens inline date picker). _New component. Reuses: `sheet.tsx`, `StrandBadge.tsx`._

- [ ] **Column header + coverage summary**: Each class column header shows class name, teacher name, and initials avatar. Column footer shows a `progress.tsx` bar: X/Y lesson weeks delivered. Hovering a cell shows a `tooltip.tsx`: teacher name, delivery date, standards count. _Modifies: existing column layout. Reuses: `progress.tsx`, `tooltip.tsx`._

- [ ] **At-risk banner**: Sticky banner at top of page when ≥1 class is overdue. Lists overdue classes by name. "Dismiss" hides for the session. Uses `var(--status-overdue-bg/text/border)` tokens. Uses `role="alert"` for accessibility. _New component._

- [ ] **Delivery grid — mobile fallback**: On screens <768px, grid collapses to a per-class card list. Each card: class name, teacher, overall delivery progress bar, "View weeks" expands to week-by-week list. No horizontal scroll on mobile. _Modifies: `DeliveryGridView`. Responsive breakpoint: md._

---

## Teacher Class View
The teacher's primary daily destination. Should feel supportive, not bureaucratic.

- [ ] **My Class view shell**: New `MyClassView` component. Replaces `MyUnitsView`. Header bar: class name (e.g. "6A"), subject, term selector tabs. Fetches the teacher's assigned class from `classes` table. If no class assigned yet, shows an empty state: "Your class hasn't been set up yet — contact your HOD." _New component. Reuses: `card.tsx`._

- [ ] **Lesson week cards**: Renders lesson weeks from the master plan's `lesson_sequence` as a vertical list of cards. Current week card is highlighted (amber border, slightly elevated shadow using `var(--shadow-md)`). Past weeks collapsed in an accordion above. Future weeks shown in muted state below. Each card: week number, lesson title/focus, standards chips (strand-coloured, read-only), activities summary, delivery status icon. _New component. Reuses: `StrandBadge.tsx`, `card.tsx`._

- [ ] **Mark as taught action**: Delivery checkbox on each current/past week card. Checking it writes a record to `class_lesson_deliveries` with `delivered_at = now()`. Card background transitions to `var(--status-taught-bg)` using `var(--duration-normal)` + `var(--easing-default)`. Unchecking prompts a confirmation ("Remove delivery record?"). After checking, a soft prompt appears: "Don't forget to log attainment for these standards." with a link to Student Progress. _New interaction. Modifies: lesson week card._

- [ ] **Class notes textarea**: Below the lesson detail in each week card, a `textarea.tsx` for class-specific notes. Placeholder: "Add notes for this class…". Autosaves on blur (debounced 500ms). Character count shown at 200+. Notes are stored on the `class_lesson_deliveries` record. _New interaction. Reuses: `textarea.tsx`._

- [ ] **Term progress bar**: Sticky footer or header stat in My Class view. Shows "X / Y weeks taught this term." Uses `progress.tsx`. Updates reactively when a week is marked taught. _New component. Reuses: `progress.tsx`._

- [ ] **AI coverage warning banner**: Appears at top of My Class when ≥1 standard in the current term has no lesson week mapping. Message: "You're in Week N. These X standards have no lesson planned yet this term: [RL.6.1, W.6.3…]." Links to Standards Coverage view. Dismisses for 24 hours (stored in localStorage). Standard codes are strand-colour-coded inline. Uses `role="alert"`. _New component. Calls existing `/api/ai/suggest-standards` or derives from data without AI for v1._

- [ ] **Teacher Class View — responsive**: On mobile, delivery checkbox is full-width at the top of each card. Notes collapse behind a "Add note" tap target. Past weeks accordion is full-width. Standards chips wrap to multiple lines. All tap targets ≥44×44px. _Modifies: `MyClassView`. Breakpoints: sm, md._

---

## PPT Generation
The teacher adoption driver. Build after Teacher Class View so the trigger button has a home.

- [ ] **PptxGenJS API route**: Create `src/app/api/generate-ppt/route.ts`. Accepts POST with `{ unitId, weekNumber, classId }`. Fetches unit data + lesson week + standards from Supabase. Builds a 6-slide .pptx using PptxGenJS: (1) Title, (2) Learning Objectives, (3) Standards (strand-colour-coded), (4) Activities, (5) Vocabulary, (6) Assessment/Exit ticket. Returns binary response with `Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation`. Install `pptxgenjs` package. _New API route. New package._

- [ ] **Generate PPT button + generation sheet shell**: "Generate PPT" button (Lucide `Presentation` icon) on each lesson week card in My Class view. Clicking opens a full-height `sheet.tsx` from the right. While generating, shows a `progress.tsx` bar with message "Building your slides…" Estimated time: 3-5 seconds. On completion, download triggers automatically and a "Download again" link appears. _New component. Reuses: `sheet.tsx`, `progress.tsx`._

- [ ] **Slide preview carousel**: Inside the generation sheet, before the user clicks generate, show a preview of the 6 slide structures. Each slide is a styled card showing the slide type, content preview from the lesson week data, and any standard badges. Navigation: previous/next buttons + dot indicators. Keyboard: left/right arrow keys. _New component. Reuses: `StrandBadge.tsx`, `badge.tsx`._

- [ ] **Inline slide content editor**: Clicking any text element in the preview carousel makes it editable inline (contenteditable or controlled textarea overlay). Changes are local — they do not write back to the master plan. Edited content is passed to the API route on generate. Each edited slide shows a "✎ Modified" indicator. "Reset" restores original content. _New interaction. Modifies: slide preview carousel._

- [ ] **Slide toggle (optional slides)**: A compact checklist below the carousel: checkboxes for each slide type (Title, Objectives, Standards, Activities, Vocabulary, Assessment). Unchecking removes that slide from the preview and the generated file. At least 2 slides must remain (Title + one content slide). _New component._

- [ ] **PPT generation — error + retry**: If the API call fails, inline error replaces the progress bar: "Something went wrong — your slides couldn't be generated." with a "Try again" button. Never a full page error. Network error vs. server error distinguished by message. _Modifies: generation sheet. Covers: error state, retry._

---

## Notifications
Infrastructure for deadline reminders and coverage alerts.

- [ ] **In-app notification centre**: Bell icon in sidebar footer (all roles). Clicking opens a `sheet.tsx` listing recent notifications: deadline reminders, coverage warnings, HOD messages. Each notification: icon, message, timestamp, read/unread state. Mark all as read button. Unread count badge on bell icon. Create `notifications` table (`id`, `user_id`, `school_id`, `type`, `message`, `read`, `created_at`, `metadata jsonb`). _New component + new table. Reuses: `sheet.tsx`, `badge.tsx`._

- [ ] **Notification triggers — deadline reminders**: Supabase scheduled function (or cron via pg_cron) that runs daily. For each `class_lesson_deadlines` row where `deadline_date - now() <= reminder_days_before days` and no delivery record exists, insert a notification row for the teacher and (if HOD opted in) the HOD. _New backend function. No UI._

- [ ] **Email notification**: Integrate Supabase Auth email or a transactional provider (Resend recommended). Send email for deadline reminders using the same trigger logic. Email template: school name, class, lesson week title, deadline date, link to app. _New integration._

---

## Responsive & Polish

- [ ] **Accessibility pass — Delivery Grid**: Verify: status cells announced as "[Class] [Week] — [Status]" by screen reader. Grid keyboard navigable (arrow keys, Enter to open detail). At-risk banner uses `role="alert"`. All interactive elements have visible focus ring. Contrast ≥4.5:1 on all status colour combinations. _Modifies: `DeliveryGridView`, `DeliveryCell`._

- [ ] **Accessibility pass — Teacher Class View + PPT**: Verify: delivery checkbox keyboard-toggleable (Space). Coverage warning banner uses `role="alert"`. PPT download button has descriptive `aria-label`. Slide carousel keyboard-navigable. All mobile tap targets ≥44×44px. _Modifies: `MyClassView`, PPT generation sheet._

- [ ] **Dark mode audit**: Test all new components in dark mode. Verify strand badge colours, status cell colours, and delivery grid cells all use `var(--strand-*-*)` and `var(--status-*-*)` tokens (not hardcoded Tailwind classes). Fix any components that missed the token migration. _Touches: all new components._

---

## Review

- [ ] **Design review**: Run `/design-review` against all four briefs. Check: HOD Delivery Grid grid readability, Teacher Class View current-week prominence, Admin Panel setup flow clarity, PPT generation sheet slide preview fidelity.
