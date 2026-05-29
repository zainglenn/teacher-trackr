# Information Architecture: Platform Admin

## Site Map

The app uses a single-page view model — no URL routing. Views are toggled via `AppView` state. Platform admin adds one new view key.

```
App (page.tsx)
├── [role: teacher]
│   ├── my-units
│   ├── long-term-plan
│   ├── coverage
│   └── student-progress
├── [role: hod]
│   ├── dashboard
│   ├── delivery-grid
│   ├── hod-review
│   ├── coverage
│   └── ...
├── [role: admin]
│   ├── manage-users
│   ├── school-setup
│   ├── platform-settings
│   └── curriculum-audit
└── [role: platform_admin]          ← NEW
    └── schools                     ← NEW view key
        ├── Schools list table      ← primary content
        ├── Create School modal     ← triggered by "New School" button
        └── School Detail sheet     ← triggered by row click
```

## Navigation Model

- **Primary navigation**: Sidebar (same component, `platform_admin` role added to filter). Platform admin sees one nav item: "Schools".
- **Secondary navigation**: None — single view, no sub-tabs.
- **Utility navigation**: Same footer as other roles — username, role badge, sign out button.
- **Mobile**: Platform admin is desktop-only (per brief). Below 768px, show a "Use a desktop browser" message instead of the view.

**Platform admin sidebar nav items:**

| Key | Label | Icon |
|---|---|---|
| `schools` | Schools | `Building2` |

No dashboard, no curriculum tools. Just the one view.

## Content Hierarchy

### Schools View (primary view)

1. **Page header** — "Schools" heading + "New School" button — the only action available at top level
2. **Search bar** — real-time filter by school name or city; appears immediately under header
3. **Schools table** — the primary content; every registered school as a row
4. **Empty state** — only on first login before any schools are created

**Table columns (priority order):**

| Column | Width | Notes |
|---|---|---|
| School name | flex | Primary identifier — left-aligned, semibold |
| City | fixed 140px | Secondary identifier |
| Curriculum | fixed 120px | Badge: American / British / IB / Other |
| Users | fixed 80px | Count from profiles.school_id |
| Created | fixed 120px | Relative date (e.g. "3 days ago") |
| Status | fixed 100px | Active (green) / Suspended (red) chip |
| Actions | fixed 80px | `···` dropdown: View, Suspend/Unsuspend |

### Create School Modal

Single modal, two visual sections separated by a divider:

1. **School details** — Name (required), City (required), Country (required), Curriculum type (select, required)
2. **First admin account** — Full name (required), Username (required), Notification email (optional), Temporary password (required, show/hide toggle)

Footer: Cancel + "Create School" (primary, disabled until all required fields filled)

### School Detail Sheet

Right-side slide-out (shadcn `Sheet`, `max-w-xl`):

1. **Sheet header** — School name, status chip, curriculum badge, city + country
2. **Stats row** — 3 stat cards: Total Users, Plans Created, Last Activity
3. **Users table** — Avatar initials, full name, username, role badge — read-only, no actions
4. **Suspend/Unsuspend button** — in the sheet footer; opens ConfirmModal for suspend

## User Flows

### Create a new school

1. Platform admin lands on "Schools" view (default view on login)
2. Clicks "New School" button (top-right of page header)
3. Modal opens — fills school name, city, country, curriculum
4. Fills first admin: full name, username, email, temporary password
5. Clicks "Create School"
   - On success → modal closes, new school row appears at top of table, toast: "School created"
   - On error (duplicate username) → inline error on username field, modal stays open
6. Platform admin shares username + temporary password with school admin out of band (email, Slack)

### Suspend a school

1. Platform admin finds school in table
2. Opens `···` menu on the row → clicks "Suspend"
3. ConfirmModal: "Type the school name to confirm" — text input must match exactly
4. Clicks "Confirm Suspension"
   - `schools.is_active = false`
   - Status chip changes to red "Suspended"
   - School's users see a suspended message on login (auth check in `page.tsx`)
5. To unsuspend: `···` menu → "Unsuspend" — no confirm required, immediate

### View school detail

1. Platform admin clicks any row in the schools table
2. Detail sheet slides in from the right
3. Platform admin reviews users and stats — no edits possible
4. Closes sheet by clicking X or clicking outside

### First login as new school admin

1. School admin navigates to the app URL
2. Logs in with username + temporary password set by platform admin
3. Lands on Manage Users view (admin default)
4. Sets up subjects, grade levels, and creates teacher accounts via existing School Setup

## Naming Conventions

| Concept | Label in UI | Notes |
|---|---|---|
| The SaaS operator account | Platform Admin | Shown as role badge: "Platform" |
| A school record | School | Not "Organisation", not "Tenant" |
| Creating a school | Create School | Not "Add School", not "Onboard" |
| Disabling a school | Suspend | Not "Deactivate", not "Disable", not "Archive" |
| Re-enabling a school | Unsuspend | Paired with Suspend |
| The first admin per school | School Admin | Same as existing "Admin" role in that school |
| Temporary password | Temporary password | Not "initial password", not "invite code" |

## Component Reuse Map

| Component | Used on | Notes |
|---|---|---|
| `AppSidebar` | All roles | Modified — add `platform_admin` to Role type and nav items |
| `PageContainer` | Schools view | Reused as-is |
| `Modal` / `ConfirmModal` | Create School, Suspend confirm | Reused as-is |
| `Sheet` (shadcn) | School Detail | Already in the codebase (used in DeliveryGridView) |
| `Badge` | Status chips, curriculum badges | Reused as-is |
| `Skeleton` | Table loading state | Reused as-is |
| `Button` | All actions | Reused as-is |

## Content Growth Plan

The schools table will grow as more schools are onboarded. At 10–20 schools (realistic near-term ceiling), a simple table with real-time search is sufficient — no pagination needed. If the platform reaches 100+ schools, add server-side search and pagination at that point.

## URL Strategy

No URL changes — the app uses view state, not routing. The `schools` view is accessed the same way as all other views: role-based sidebar navigation with `view` state in `page.tsx`.

One addition: the platform admin auth check in `page.tsx` must guard the suspended-school state. When `profile.role === "platform_admin"`, always show the Schools view regardless of `school_id`.
