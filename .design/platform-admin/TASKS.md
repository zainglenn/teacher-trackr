# Build Tasks: Platform Admin — Multi-Tenant School Management

Generated from: `.design/platform-admin/DESIGN_BRIEF.md`
IA: `.design/platform-admin/INFORMATION_ARCHITECTURE.md`
Date: 2026-05-29

---

## Foundation — Database & Types

- [x] **1. DB migration — schools.is_active + platform_admin role**: Add `is_active boolean NOT NULL DEFAULT true` to the `schools` table. Add `platform_admin` as a valid value in the `profiles.role` check constraint (or enum). Apply via Supabase CLI. Update `supabase-schema.sql`. _Modifies: `schools` table, `profiles.role` constraint._

- [x] **2. TypeScript types**: Add `"platform_admin"` to the `Role` union in `src/types/index.ts`. Add `is_active: boolean` to the `School` interface. _Modifies: `src/types/index.ts`._

- [x] **3. API routes — platform admin CRUD**: Create route handlers under `src/app/api/platform/`:
  - `list-schools/route.ts` — SELECT all schools with user counts (JOIN profiles on school_id); service role, requires `platform_admin` role check
  - `create-school/route.ts` — INSERT school row + create Supabase auth user + INSERT profile for first admin in one transaction; returns `{ school, adminProfile }`
  - `suspend-school/route.ts` — UPDATE `schools.is_active = false` by school ID
  - `unsuspend-school/route.ts` — UPDATE `schools.is_active = true` by school ID
  - `get-school-detail/route.ts` — SELECT school + its profiles + basic stats (plan count, last activity)
  Follow existing pattern in `src/app/api/admin/create-user/route.ts`. _New files. Reuses: service role client pattern, auth check pattern._

---

## Core UI

- [x] **4. AppSidebar — platform_admin role**: Add `"platform_admin"` to the `Role` type import. Add `"schools"` to the `AppView` union. Add nav item `{ key: "schools", label: "Schools", icon: Building2, roles: ["platform_admin"] }`. The role badge in the sidebar footer should show "Platform" for `platform_admin`. _Modifies: `src/components/AppSidebar.tsx`._

- [x] **5. page.tsx — platform_admin wiring**: Add `isPlatformAdmin` flag. Default view for `platform_admin` = `"schools"`. Add suspended-school guard: if `profile.school_id` exists AND `school.is_active === false`, render a `SuspendedSchoolMessage` component instead of the app. Platform admin bypasses this guard (they have no `school_id`). Import and render `<PlatformAdminView />` when `view === "schools" && isPlatformAdmin`. _Modifies: `src/app/page.tsx`._

- [x] **6. PlatformAdminView — schools table**: Create `src/components/PlatformAdminView.tsx`. Uses `PageContainer` with title "Schools" and a "New School" button in the action slot. Renders a table with columns: School Name | City | Curriculum | Users | Created | Status | Actions. Each row shows a `SchoolStatusBadge`, a curriculum `Badge`, relative created date, user count, and a `···` dropdown (`DropdownMenu` from shadcn) with "View" and "Suspend / Unsuspend" actions. Fetches from `/api/platform/list-schools`. Loading state uses `Skeleton` rows. Empty state: "No schools yet — create one to get started." _New component. Reuses: `PageContainer`, `Badge`, `Skeleton`, `DropdownMenu`, `Button`._

- [x] **7. SchoolStatusBadge**: Create `src/components/SchoolStatusBadge.tsx`. A small `<span>` with two states: Active (emerald, `CheckCircle2` icon) and Suspended (rose, `Ban` icon). _New component. Simple — inline in PlatformAdminView if preferred._

- [x] **8. CreateSchoolModal**: Create `src/components/CreateSchoolModal.tsx`. Two-section form inside the existing `Modal` component. Section 1 — School: Name (text), City (text), Country (text), Curriculum (Select: American / British / IB / Other). Section 2 — First Admin: Full Name (text), Username (text), Notification Email (text, optional), Temporary Password (text, show/hide toggle). Footer: Cancel + "Create School" button (disabled until all required fields filled). On submit: POST to `/api/platform/create-school`, show inline error if username is taken, close and refresh table on success. _New component. Reuses: `Modal`, `ModalFooter`, `ModalCancel`, `Input`, `Label`, `Select`, `Button`._

- [x] **9. SchoolDetailSheet**: Create `src/components/SchoolDetailSheet.tsx`. shadcn `Sheet` sliding in from the right (`side="right"`, `className="sm:max-w-xl"`). Header: school name, `SchoolStatusBadge`, curriculum badge, city + country in muted text. Stats row: 3 `StatCard`-style boxes — Total Users, Plans Created, Last Activity. Users table: avatar initials, full name, username, role badge — read-only. Sheet footer: "Suspend School" / "Unsuspend School" button. Fetches from `/api/platform/get-school-detail` when `open === true`. _New component. Reuses: `Sheet`, `SheetContent`, `SheetHeader`, `Badge`, `Skeleton`, existing avatar initials pattern from ManageUsersView._

- [x] **10. Suspend/Unsuspend flow**: Wire the suspend action (from both the table `···` menu and the sheet footer) to open `ConfirmModal` with the message "Type **{schoolName}** to confirm suspension." The input must match the school name exactly (case-insensitive) before the Confirm button enables. On confirm: POST to `/api/platform/suspend-school`, update local state optimistically, show toast. Unsuspend: no confirm — direct POST to `/api/platform/unsuspend-school`, update local state. _Modifies: `PlatformAdminView`, `SchoolDetailSheet`. Reuses: `ConfirmModal`._

---

## Auth & Security

- [x] **11. Suspended school guard**: Create `src/components/SuspendedSchoolMessage.tsx`. Shown when `school.is_active === false` for a non-platform-admin user. Full-screen centred layout: lock icon, "Your school account has been suspended" heading, "Please contact your administrator." sub-text, sign out button. _New component. Wired in `page.tsx` task 5._

- [x] **12. Fetch school is_active on login**: In `page.tsx` (or a new `useSchool` hook), after the profile loads, fetch the school record for `profile.school_id` and check `is_active`. If false, show `SuspendedSchoolMessage`. This query only fires if `role !== "platform_admin"` and `school_id` is set. _New hook or inline in `page.tsx`._

- [x] **13. Seed zain.platform account**: Add to `scripts/seed-sample-school.mjs` (or a new script): upsert a profile with `username: "zain.platform"`, `role: "platform_admin"`, `school_id: null`. Create the corresponding Supabase auth user with a secure initial password. Log the credentials. _Modifies: seed script or new `scripts/create-platform-admin.mjs`._

---

## Polish

- [x] **14. Desktop-only guard**: In `PlatformAdminView`, wrap the content in a responsive check. Below `md` breakpoint (`768px`), render a centred message: "Platform admin is only available on desktop." with a monitor icon. Above `md`, render the full table. _Modifies: `PlatformAdminView`._

- [x] **15. Real-time search**: Add a search input above the schools table in `PlatformAdminView`. Filters by school name or city using `useMemo` on the fetched schools array. Debounce not required — client-side filter on the full list. _Modifies: `PlatformAdminView`._

- [x] **16. Accessibility pass**: All table rows keyboard-navigable (`tabIndex`, `onKeyDown` for Enter/Space to open detail). `ConfirmModal` traps focus. `SchoolStatusBadge` has `aria-label`. `DropdownMenu` items have descriptive labels. _Checks against brief requirements._

---

## Review

- [x] **17. Design review**: Run `/design-review` against `.design/platform-admin/DESIGN_BRIEF.md`. Check: operational console aesthetic (no warmth leaking in), table density, status chips, modal form layout, sheet detail view.
