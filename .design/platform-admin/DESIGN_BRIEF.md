# Design Brief: Platform Admin — Multi-Tenant School Management

## Problem

Zain (the platform operator) needs to onboard new schools onto Curriculum Tracker. Right now there is one hardcoded school (DSK) and no way to provision a second one without writing SQL. Every new school requires manual DB work, creating user accounts by hand, and no way to monitor what's happening across schools. As the platform grows, this doesn't scale and there's no way to disable a school if something goes wrong.

## Solution

A platform admin layer that sits above all schools. Zain logs in as `zain.platform` and sees a clean operational console: a list of every school on the platform, the ability to create a new school + its first admin in one form, basic health stats per school, and a suspend toggle. School admins never see this layer — they only ever see their own school.

## Experience Principles

1. **Operational clarity over decoration** — This is a control panel, not a product page. Dense information tables, no empty states with illustrations, every action has immediate feedback.
2. **One flow for one job** — Creating a school provisions everything (school record + first admin account) in a single modal. No multi-step wizard, no "come back later to add users."
3. **Irreversible actions are explicit** — Suspension is a big-deal action. It requires a confirm step and a visible status chip. Deletion is out of scope entirely — data is never destroyed.

## Aesthetic Direction

- **Philosophy**: Operational console — the clinical end of enterprise-lite, closer to Vercel's team dashboard or Stripe's admin panel than to a teacher-facing tool. Monochrome with status colour as the only accent.
- **Tone**: Authoritative, efficient, zero-warmth. This is infrastructure management.
- **Reference points**: Vercel Teams dashboard, Stripe Atlas school list, Linear's admin org view.
- **Anti-references**: Not a marketing page, not a onboarding wizard with illustrations and progress bars, not the warm teacher-facing views in the same app.

## Existing Patterns

The codebase's existing admin pattern (ManageUsersView) is the closest ancestor — table + inline actions + modal for create/edit. Platform admin extends this pattern rather than inventing a new one.

- **Typography**: Geist sans — same as the rest of the app
- **Colors**: CSS variable token system; `--status-taught/overdue/pending` tokens for school status chips
- **Spacing**: 4px/8px Tailwind scale
- **Components to reuse**: `PageContainer`, `Button`, `Input`, `Label`, `Select`, `Modal/ConfirmModal`, `Badge`, `Skeleton`, shadcn `Table`
- **Pattern to extend**: `ManageUsersView` — table with search/filter, inline action buttons, modal for create

## Component Inventory

| Component | Status | Notes |
|---|---|---|
| `PlatformAdminView` | New | Root view — schools table + create modal |
| `SchoolDetailPanel` | New | Slide-out sheet: school users + stats (read-only) |
| `CreateSchoolModal` | New | One-form: school fields + first admin credentials |
| `SchoolStatusBadge` | New | Active (green) / Suspended (red) chip |
| `PageContainer` | Exists | Reuse as-is |
| `ManageUsersView` | Exists | Reference pattern only — not modified |
| `ConfirmModal` | Exists | Reuse for suspend confirmation |
| AppSidebar | Modify | Add `platform_admin` role with its own nav items |
| `Role` type | Modify | Add `"platform_admin"` to the union |
| `profiles` table | Modify | `platform_admin` as a valid role value |
| `schools` table | Modify | Add `is_active boolean default true` |

## Key Interactions

**Schools list:**
- Loads immediately — table of all schools, no pagination needed initially
- Each row: school name, city, curriculum, user count, date created, status chip, `···` action menu (View / Suspend / Unsuspend)
- Clicking a row OR "View" opens the detail sheet from the right
- Search filters the table in real time (name or city)

**Create school flow:**
- "New School" button in the page header opens a modal
- Section 1 — School details: name, city, country, curriculum (American / British / IB / Other)
- Section 2 — First admin account: full name, username, email (optional for notifications), temporary password
- Save creates both records atomically — school row + profile row + auth user
- On success: modal closes, new school appears at the top of the table, a toast confirms

**Suspend / unsuspend:**
- `ConfirmModal` with the school name written in: "Type the school name to confirm suspension"
- `is_active = false` on the school record
- Suspended school's users get a "Your school account has been suspended" message on login instead of the app
- Platform admin can unsuspend at any time — no confirm required for unsuspend

**School detail sheet:**
- Right-side slide-out (shadcn Sheet)
- Header: school name, status chip, curriculum badge
- Stats row: user count, plan count, last activity
- Users table: avatar initials, name, username, role badge — read-only, no actions
- No edit controls — platform admin does not manage curriculum or users inside a school

## Responsive Behavior

Desktop-first. This is an operator tool — it will never be used on mobile. Minimum supported width: 768px. Below 768px show a "Platform admin is only available on desktop" message.

## Accessibility Requirements

- All table rows keyboard-navigable
- Confirm modal traps focus
- Status chips have sufficient contrast (WCAG AA)
- Action menus reachable by keyboard

## Out of Scope

- School editing after creation (name, city changes) — admin does that via DB for now
- Platform-level analytics / billing dashboard
- Self-serve school signup
- Deleting schools or users
- Per-school feature flags or plan limits
- Email invites for first admin — temporary password is sufficient for v1
