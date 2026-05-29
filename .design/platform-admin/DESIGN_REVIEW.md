# Design Review: Platform Admin — Multi-Tenant School Management

Reviewed against: `.design/platform-admin/DESIGN_BRIEF.md`
Philosophy: Operational console — Dieter Rams functional, monochrome with status color as the only accent
Date: 2026-05-29

---

## Screenshots Captured

| Screenshot | Breakpoint | Description |
|---|---|---|
| `screenshots/review-schools-desktop-1280.png` | Desktop (1280×800) | Schools list — DSK row, search bar, New School button |
| `screenshots/review-create-school-modal-desktop-1280.png` | Desktop (1280×800) | Create School modal — two-section form, all fields visible |
| `screenshots/review-school-detail-sheet-desktop-1280.png` | Desktop (1280×800) | School Detail sheet — DSK stats + users table + Suspend footer |
| `screenshots/review-schools-mobile-375.png` | Mobile (375×812) | Detail sheet on mobile — full-screen, readable, Suspend button at footer |
| `screenshots/review-mobile-guard-375.png` | Mobile (375×812) | Desktop-only guard — icon + message at 375px |

> All screenshots are in `.design/platform-admin/screenshots/`.

---

## Summary

The platform admin view lands solidly against the brief's operational console intent. The schools table is clean and clinical, the modal is structured exactly as designed (two sections, single flow), and the detail sheet is the strongest piece — it reads like a proper admin panel with the stats trio, role-badged users table, and Suspend footer. One data bug was found and fixed during review: the `list-schools` API query omitted `city`, `country`, and `curriculum` columns so those table cells appeared blank.

---

## Must Fix

1. **Blank City and Curriculum columns in the schools table** — `list-schools/route.ts` queried only `id, name, is_active, created_at`. City, country, and curriculum columns rendered as empty cells for DSK despite the data being correct in the DB. See `screenshots/review-schools-desktop-1280.png`. **Fixed during review** — query updated to include `city, country, curriculum`.

---

## Should Fix

1. **Sidebar footer missing "Platform" role badge** — The brief specified the footer should show "Platform" as the role badge for `platform_admin`. The AppSidebar role badge logic was updated in code (`role === "platform_admin" ? "Platform"`) but the footer renders initials + username only without the role chip visible in the screenshot. See `screenshots/review-schools-desktop-1280.png` — `zain.platform` shows at the bottom but no coloured role badge. _Fix: Check that the footer role badge conditional renders the chip — may need `platform_admin` added to the badge's role config in `AppSidebar.tsx`._

2. **"Last Activity" stat card shows a full date instead of relative text** — The SchoolDetailSheet stats row shows "28 May 2026" for Last Activity where a relative format ("Today" or "3 days ago") would be more scannable for an operator. See `screenshots/review-school-detail-sheet-desktop-1280.png`. _Fix: Apply the same `formatDate()` helper used in the table to the stats card, or use a short month+day format._

3. **Console errors on sign-in as platform admin** — The browser shows "5 Issues" in the dev tools overlay. Likely caused by hooks that fire for roles that don't apply to platform admin (e.g. `useStandardPipeline`, `useDepartmentPipeline` being called from notifications code). These fire before the `isPlatformAdmin` fast-path short-circuits them. _Fix: In `page.tsx`, gate the notification hooks behind `!isPlatformAdmin` to prevent unnecessary queries._

---

## Could Improve

1. **Schools table feels sparse with only one row** — The brief acknowledged this is intentional for a fresh install, but the empty vertical space below the single row is stark. _Suggestion: Add a subtle muted tip below the table when `schools.length === 1`: "Add more schools using the New School button above." Removes the "did something break?" feeling._

2. **No username shown in the sidebar footer** — At the bottom of the sidebar only the avatar `N` and "Platform" label appear. The username `zain.platform` would reassure the operator they're in the right account. _Suggestion: Show the username in the footer as it does for other roles._

3. **Create School modal "Create School" button is blue when disabled** — The submit button appears enabled (blue) even though no fields are filled. This is because the default shadcn `Button` with `disabled` prop keeps the same blue color at reduced opacity. The brief's aesthetic calls for a cleaner disabled state. _Suggestion: Add `disabled:opacity-40 disabled:cursor-not-allowed` explicitly or ensure the disabled variant renders as muted._

---

## What Works Well

- **Schools table hits the operational console target exactly** — Dense, information-first, no illustration or empty-state warmth. The Active status chip in emerald is the only color on the page; everything else is monochrome. Brief delivered.
- **Create School modal is the right amount of form** — Two sections separated by a divider, asterisked required fields, show/hide password toggle, and helper copy below the password field ("Share this with the school admin…"). Exactly the brief's "single flow" requirement.
- **School Detail sheet is the strongest component** — Stats trio (Users / Plans / Last Activity) as card tiles, avatar-initialled users table with correct role badges, and Suspend School in rose at the footer. The slide-out approach avoids navigation and keeps context.
- **Desktop-only guard is clean** — Building icon + two-line message at 375px. No broken layout, no wasted space. See `screenshots/review-mobile-guard-375.png`.
- **Suspend confirmation input pattern is correct** — Requiring the school name to be typed before enabling the button is the right mechanic for a destructive action that locks out real users.
- **Multi-tenant scoping works end-to-end** — `zain.admin` now only sees DSK users in Manage Users; new users created by school admins inherit `school_id`; `zain.platform` has no `school_id` and bypasses the suspended-school guard.
