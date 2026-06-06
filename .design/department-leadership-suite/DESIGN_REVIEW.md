# Design Review: Department Leadership Suite

Reviewed against: `DESIGN_BRIEF.md`
Philosophy: Notion-inspired editorial calm
Date: 2026-06-04 (third pass — final)

---

## Screenshots Captured

| Screenshot | Viewport | Description |
|---|---|---|
| `screenshots/review-final-analytics-desktop-1280.png` | Desktop 1280×800 | Analytics — ghost skeleton + `text-sm` instruction text |
| `screenshots/review-final-coaching-desktop-1280.png` | Desktop 1280×800 | Coaching — observation with "Today" relative date, polished divider |
| `screenshots/review-analytics-polished-desktop-1280.png` | Desktop 1280×800 | Analytics — empty state with ghost table |
| `screenshots/review-coaching-cycle-polished-desktop-1280.png` | Desktop 1280×800 | Coaching Cycle — primary "Open Cycle" button |
| `screenshots/review-department-polished-desktop-1280.png` | Desktop 1280×800 | Department — section border separators |
| `screenshots/review-initiatives-polished-desktop-1280.png` | Desktop 1280×800 | Initiatives — HOD contextual guidance |

> All screenshots in `.design/department-leadership-suite/screenshots/`.

---

## Summary

The suite is complete and passes this review with no findings. All issues from the first two passes have been resolved. The implementation is consistent with the Notion-inspired brief, token-disciplined throughout, and ready to ship.

---

## Must Fix

None.

---

## Should Fix

None.

---

## Could Improve

None.

---

## What Works Well

**Analytics ghost skeleton** (`review-final-analytics-desktop-1280.png`) — the faded table with real strand column headers (Rdg Lit, Rdg Info, Writing, Speaking, Language) and placeholder rows is the strongest empty state in the suite. It teaches the feature before any data exists. The `text-sm text-muted-foreground` instruction line now reads with sufficient weight against the white background.

**Relative date on observations** (`review-final-coaching-desktop-1280.png`) — "Today" instead of "4 Jun 2026" is the right call for a coaching tool that is used regularly. Dates within the last 7 days are contextual ("Yesterday", "3 days ago"), older ones show the absolute format. The absolute date remains accessible via the `title` attribute on hover. This small detail signals that the interface was designed by someone who thinks about how it's actually used.

**Coaching two-panel layout** remains the standout view. Teacher list on the left with live observation count, tabbed detail panel on the right, observation card with focus area badge and clear "Agreed next steps" section — this is what the brief meant by "document feel over dashboard feel."

**Coaching Cycle primary CTA** — removing the dashed container and promoting "Open Cycle" to a filled primary button eliminated the single most friction-creating moment in the Coaching flow. A HOD landing on the Cycle tab now has one clear thing to do.

**Initiatives HOD guidance** — the two-line contextual message ("No initiatives have been set up yet. / Ask your school admin to create one...") converts a dead end into an instruction. The HOD knows exactly what to do and who to ask.

**Token discipline** — confirmed on final audit. All 25+ new components use CSS variables exclusively. No hardcoded colours. Dark mode will work without any component changes.

**Navigation architecture** — the Planning / Leadership split with the `LEADERSHIP` section label at `/50` opacity gives the HOD sidebar a clear operational model. The label is present and intentional without competing with nav items.
