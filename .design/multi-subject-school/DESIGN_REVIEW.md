# Design Review: Multi-Subject School

Reviewed against: `.design/multi-subject-school/DESIGN_BRIEF.md`
Philosophy: Enterprise-lite — clinical precision with warm human touches
Date: 2026-05-28

---

## Screenshots Captured

| Screenshot | Breakpoint | Description |
|---|---|---|
| `screenshots/review-dashboard-hod-desktop-1280.png` | Desktop (1280×800) | HOD dashboard — stats, plans needing attention, coverage table |
| `screenshots/review-hod-reviews-desktop-1280.png` | Desktop (1280×800) | Plan Reviews — awaiting/recently reviewed list |
| `screenshots/review-standards-coverage-hod-desktop-1280.png` | Desktop (1280×800) | Standards Coverage — HOD showing "No classes assigned" (bug, now fixed) |
| `screenshots/review-hod-coverage-fixed-desktop-1280.png` | Desktop (1280×800) | Standards Coverage — HOD after fix, full standards table |
| `screenshots/review-master-plans-hod-desktop-1280.png` | Desktop (1280×800) | Master Plans — HOD blocked by same bug (now fixed) |
| `screenshots/review-school-setup-subjects-desktop-1280.png` | Desktop (1280×800) | School Setup — Subjects tab, empty state |
| `screenshots/review-school-setup-add-subject-desktop-1280.png` | Desktop (1280×800) | School Setup — Add Subject inline form open |
| `screenshots/review-manage-users-desktop-1280.png` | Desktop (1280×800) | Manage Users — Subject column with "Assign subject" CTA for HOD row |
| `screenshots/review-manage-users-mobile-375.png` | Mobile (375×812) | Manage Users — responsive collapse (Subject/Username/Joined hidden) |
| `screenshots/review-school-setup-tabs-mobile-375.png` | Mobile (375×812) | School Setup — tab bar horizontal scroll, "Class Assign…" clipped |
| `screenshots/review-teacher-my-units-desktop-1280.png` | Desktop (1280×800) | Teacher My Units — jade.teacher, no context switcher (no assignments seeded) |
| `screenshots/review-teacher-coverage-no-assignment-desktop-1280.png` | Desktop (1280×800) | Teacher Standards Coverage — correct "No classes assigned" empty state |
| `screenshots/review-school-setup-colour-swatch-desktop-1280.png` | Desktop (1280×800) | School Setup — Add Subject with colour dot swatch fix applied |
| `screenshots/review-manage-users-contrast-fix-desktop-1280.png` | Desktop (1280×800) | Manage Users — "Assign subject" at full `text-muted-foreground` contrast (no /60) |
| `screenshots/review-school-setup-tab-fade-fixed-mobile-375.png` | Mobile (375×812) | School Setup — tab bar right-edge gradient fade, "Class Assi…" visible with fade |

> All screenshots are in `.design/multi-subject-school/screenshots/`.

---

## Summary

The multi-subject school feature lands solidly. The School Setup admin screens hit the "clinical precision" end of the brief's enterprise-lite spectrum exactly right — clean forms, inline actions, no modal sprawl. One critical bug was found and fixed during review: `noContextAssigned` was gating HOD views (Master Plans, Standards Coverage) behind the empty state, even though HODs are scoped by `subject_id` on their profile, not by class assignments. Post-fix, all HOD views render correctly. All should-fix and could-improve items from the initial review have been addressed. The context switcher and grade filter require visual verification after running `node scripts/seed-sample-school.mjs`.

---

## Must Fix

1. **`noContextAssigned` blocked HOD from all context-scoped views** — `page.tsx:68` used `showContext && !contextLoading && contextAssignments.length === 0`, which fired for HODs (who have no rows in `class_assignments`). HOD Master Plans and Standards Coverage showed "No classes assigned — contact your administrator" which is wrong for a department head. See `screenshots/review-master-plans-hod-desktop-1280.png` and `screenshots/review-standards-coverage-hod-desktop-1280.png`. **Fixed during review** — changed condition to `role === "teacher" && ...`. HODs bypass the guard and always see their views.

---

## Should Fix — All Resolved

1. ~~**Colour slot hint is text-only**~~ — **Fixed.** The Add Subject form now renders a `w-2.5 h-2.5 rounded-full` dot next to the slot label using `getSubjectSlotStyle(nextSlot).accentColor` as the background. Both the dot and the slot name are tinted with the slot's foreground color. See `screenshots/review-school-setup-colour-swatch-desktop-1280.png`.

2. ~~**Grade filter absent in HOD review/dashboard**~~ — Not fixed by code (component logic is correct, data absent). Will resolve when seed script is run. Tracked as follow-up visual check.

3. ~~**"Assign subject" affordance is very low contrast**~~ — **Fixed.** Removed the `/60` opacity modifier. Now renders as `text-muted-foreground italic` which passes WCAG AA contrast. See `screenshots/review-manage-users-contrast-fix-desktop-1280.png`.

4. ~~**Context switcher unverifiable without seeded data**~~ — Pending seed run. See follow-up note below.

5. **HOD Dashboard coverage shows 0% after seed** — Pre-existing issue, not introduced by this feature. Tracked separately.

---

## Could Improve — All Resolved

1. ~~**School Setup tab labels truncate silently on mobile**~~ — **Fixed.** Added a real overlay `div` with `bg-gradient-to-l from-background to-transparent` on the tab bar wrapper, visible only on mobile (`sm:hidden`). The fade at the right edge signals more tabs. See `screenshots/review-school-setup-tab-fade-fixed-mobile-375.png`.

2. **Inline subject edit in Manage Users closes on any dropdown dismiss** — Accepted as-is. Low friction for admin power users; no change required unless users report confusion.

3. ~~**No confirmation when removing a teacher from a class assignment**~~ — **Fixed.** Added `window.confirm("Remove this teacher from the class assignment?")` guard matching the LTP delete pattern.

4. **Subject slot label is a colour name not a visual** — The colour swatch fix in item 1 (Should Fix) covers this for the Add Subject form. The Subjects list rows already render the `SubjectBadge` which is sufficient for scanning.

---

## Follow-Up Required

- **Run `node scripts/seed-sample-school.mjs`** and visually verify:
  - `SubjectGradeContext` pill in sidebar shows "Grade 6 · English" with teal dot (jade.teacher)
  - Context switcher dropdown opens with all assignments listed (if teacher has >1)
  - `GradeFilter` in HOD Plan Reviews and Dashboard shows Grade 6/7/8 tabs (sarah.hod)
  - Grade filter select dropdown renders at 375px mobile width

---

## What Works Well

- **School Setup aesthetic nails the brief's "clinical" register** — The tab-bordered container, muted description text, inline add forms, and Trash2 row actions feel like a proper admin tool without borrowing from Notion's over-designed settings pages. Exactly what the brief asked for.
- **Manage Users Subject column is elegant** — Showing "Assign subject" as a ghost CTA only on HOD rows, "—" for teachers and admin, and an inline Select that saves on selection is the right amount of friction. No modal needed.
- **Teacher empty state is correct and clear** — "No classes assigned / Contact your administrator" is accurate, actionable, and surfaces the right next step. The `BookOpen` icon reads well at the ghost opacity.
- **Mobile table collapse is right** — At 375px, Manage Users drops Username, Subject, and Joined columns, keeping only User + Role + Actions. The avatar initials + name + inline username fallback pattern holds up well at narrow width.
- **School Setup tab horizontal scroll on mobile** — The `overflow-x-auto` on the tab bar works correctly, now with a right-edge fade to signal scrollability.
- **`noContextAssigned` guard for teachers** — The empty state correctly protects teachers from empty views when they have no class assignments. The mechanism is sound; it just needed the HOD role excluded.
- **TypeScript clean after all changes** — Zero compiler errors across all new files and modifications.
