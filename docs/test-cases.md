# Test Cases — Unit-Level LTP Submission & Approval Workflow

**App:** Curriculum Tracker · Dubai Schools Al Khawaneej  
**Version:** v3 (unit-level workflow)  
**Date:** May 2026

---

## Prerequisites

Before running these tests:
1. HOD account exists (role: `hod`)
2. At least two teacher accounts exist (role: `teacher`)
3. HOD has created classes and assigned them to teachers via **Manage Classes**
4. Each teacher has at least one LTP with units

---

## TC-01 — Teacher: Submit a Unit Plan

**Actor:** Teacher  
**Precondition:** Teacher is assigned to a class with an LTP that has at least one draft unit assigned to them

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as teacher | Redirected to teacher dashboard |
| 2 | Open **Long Term Plan** | Plan list visible with computed status badges |
| 3 | Open an LTP → click a unit assigned to you | UnitPlanView opens; unit badge shows **Draft** |
| 4 | Verify nav bar | **Submit Unit** button visible; Save Changes visible if dirty |
| 5 | Click **Submit Unit** | Confirmation dialog appears: "Submit [title] for HOD review?" |
| 6 | Click Cancel | Dialog closes, unit unchanged |
| 7 | Click **Submit Unit** again → click **Submit** | Dialog closes; unit badge changes to **Submitted**; fields become read-only |
| 8 | Check LTP list | LTP status reflects change (e.g. Awaiting Review if all units submitted) |

**Pass criteria:** Unit locked after submit, badge = Submitted, submit button gone.

---

## TC-02 — Teacher: Withdraw a Submitted Unit

**Actor:** Teacher  
**Precondition:** A unit has been submitted (TC-01 complete); HOD has not yet acted on it

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open the same submitted unit in UnitPlanView | Badge shows **Submitted**; **Withdraw** button visible |
| 2 | Click **Withdraw** | Confirmation dialog appears |
| 3 | Confirm withdrawal | Unit badge reverts to **Draft**; fields become editable again |
| 4 | Verify nav bar | **Submit Unit** button visible again; Withdraw button gone |

**Pass criteria:** Unit back to Draft, editable, submit available.

---

## TC-03 — Teacher: Cannot Edit a Submitted Unit

**Actor:** Teacher  
**Precondition:** Unit is in Submitted status

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open a submitted unit | All fields are read-only |
| 2 | Attempt to edit title | Field not editable |
| 3 | Check Map Standards section | Not visible / no edit controls |
| 4 | Verify save button | Save Changes button not visible |

**Pass criteria:** Zero editable fields when unit is submitted.

---

## TC-04 — Teacher: Cannot Edit Another Teacher's Unit

**Actor:** Teacher A  
**Precondition:** LTP has units assigned to Teacher B

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as Teacher A | — |
| 2 | Open an LTP that contains Teacher B's units | Unit cards for Teacher B visible but muted |
| 3 | Click a unit assigned to Teacher B | UnitPlanView opens in read-only mode |
| 4 | Verify controls | No Save, Submit, Withdraw buttons visible |
| 5 | Verify fields | Title, Essential Question, Unit Details all read-only |

**Pass criteria:** Teacher cannot modify another teacher's unit.

---

## TC-05 — HOD: Review Queue Shows Submitted Units

**Actor:** HOD  
**Precondition:** At least one unit has been submitted (TC-01 complete)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as HOD | — |
| 2 | Open **HOD Review** | "X units awaiting review" shown in page subtitle |
| 3 | Verify unit card | Shows: unit title, term, essential question, strand badge counts, duration, assessment type, "submitted X days ago" |
| 4 | Verify order | Oldest submitted unit listed first (FIFO) |
| 5 | Verify grouping | Units grouped under their LTP plan name with LTP status badge |

**Pass criteria:** Submitted units visible, grouped by plan, sorted oldest-first.

---

## TC-06 — HOD: Open Unit from Review Queue

**Actor:** HOD  
**Precondition:** Submitted unit exists in review queue

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click **Open Unit** on a review card | UnitPlanView opens in read-only mode |
| 2 | Verify mode | All fields read-only; "HOD" perspective |
| 3 | Verify buttons | **Approve** and **Request Revision** buttons visible in nav bar |
| 4 | Verify back button | Returns to HOD Review page |

**Pass criteria:** HOD can navigate into unit detail; unit is read-only; action buttons present.

---

## TC-07 — HOD: Approve a Unit

**Actor:** HOD  
**Precondition:** A unit is in Submitted status

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In review queue, click **Approve** on a unit card (or from UnitPlanView) | Unit status → **Approved**; moves out of "Awaiting Review" section |
| 2 | Check "Recently Reviewed" section | Unit appears with Approved badge |
| 3 | Log in as teacher and open that unit | Badge shows **Approved**; fields locked |
| 4 | If all units in plan are now approved | LTP status badge → **Fully Approved** |

**Pass criteria:** Unit approved, moves to reviewed list, teacher sees Approved badge, LTP status updates.

---

## TC-08 — HOD: Request Unit Revision

**Actor:** HOD  
**Precondition:** A unit is in Submitted status

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click **Revise** on a unit card (or from UnitPlanView) | Revision dialog opens |
| 2 | Leave feedback field empty → click Request Revision | Button remains disabled |
| 3 | Enter feedback text → click **Request Revision** | Dialog closes; unit status → **Needs Revision** |
| 4 | Log in as teacher and open that unit | Amber banner at top: "Revision requested by HOD" with the feedback text |
| 5 | Verify unit is editable | Fields unlocked; **Resubmit** button visible |
| 6 | Verify LTP status | LTP shows **Has Revisions** (if no other submitted units) |

**Pass criteria:** Feedback shown as banner, unit editable, Resubmit available.

---

## TC-09 — Teacher: Resubmit After Revision

**Actor:** Teacher  
**Precondition:** Unit is in Revision status (TC-08 complete)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open the unit in revision | Amber feedback banner visible; fields editable |
| 2 | Edit the unit content | Dirty flag set; Save Changes button enabled |
| 3 | Save changes | Unit saved, still in Revision status |
| 4 | Click **Resubmit** | Confirmation dialog: "Resubmit…" |
| 5 | Confirm resubmit | Unit status → **Submitted**; feedback banner disappears; fields locked |
| 6 | HOD Review queue | Unit reappears in queue |

**Pass criteria:** Revised unit can be resubmitted; feedback banner gone after resubmit.

---

## TC-10 — HOD: Re-open an Approved Unit

**Actor:** HOD  
**Precondition:** A unit is in Approved status

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In "Recently Reviewed", click **Re-open** on an approved unit | Unit status reverts to **Draft** |
| 2 | Check teacher view | Unit now editable; badge shows **Draft** |
| 3 | Check LTP status | If LTP was Fully Approved → now drops to In Progress or Has Revisions |

**Pass criteria:** Approved unit can be re-opened; LTP status degrades correctly.

---

## TC-11 — Computed LTP Status Transitions

**Actor:** Teacher + HOD  
**Precondition:** LTP with multiple units exists

| Scenario | Unit States | Expected LTP Status |
|----------|-------------|---------------------|
| All units draft | All `draft` | **In Progress** |
| Some submitted | Mix of `draft` + `submitted` | **In Progress** |
| All submitted | All `submitted` | **Awaiting Review** |
| Any revision, no submitted | Mix of `draft` + `revision` | **Has Revisions** |
| Some approved, some not | `approved` + `draft`/`submitted` | **Partially Approved** |
| All approved | All `approved` | **Fully Approved** |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submit all units | LTP status → **Awaiting Review** |
| 2 | HOD approves half | LTP status → **Partially Approved** |
| 3 | HOD approves remaining | LTP status → **Fully Approved** |
| 4 | HOD re-opens one | LTP status → **In Progress** |
| 5 | Teacher adds a new unit to Fully Approved LTP | LTP status → **In Progress** |

**Pass criteria:** Status badge updates correctly at every transition.

---

## TC-12 — LTP Status Badge on Plan List

**Actor:** Teacher  
**Precondition:** LTP has units in various states

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open **Long Term Plan** list | Each plan card shows computed status badge |
| 2 | Verify colours | In Progress = grey; Awaiting Review = amber; Has Revisions = rose; Partially Approved = blue; Fully Approved = emerald |
| 3 | Open an LTP detail | Header also shows computed status badge |

**Pass criteria:** Correct label and colour for each status on both list and detail views.

---

## TC-13 — Unit Status Badges on Term Grid

**Actor:** Teacher and HOD  
**Precondition:** LTP has units in different statuses

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open an LTP detail view (term grid) | Each unit card shows a status badge alongside assessment type |
| 2 | Verify Draft unit | Grey **Draft** badge |
| 3 | Verify Submitted unit | Amber **Submitted** badge |
| 4 | Verify Approved unit | Emerald **Approved** badge |
| 5 | Verify Revision unit | Rose **Needs Revision** badge |

**Pass criteria:** All 4 statuses display correct badge colour and label on unit cards.

---

## TC-14 — Unit Deletion Restrictions

**Actor:** Teacher  
**Precondition:** LTP has units in various states

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Locate a **Draft** unit you own | Delete button (trash icon) visible on unit card |
| 2 | Attempt delete | Confirmation prompt → unit deleted |
| 3 | Locate a **Submitted** unit | Delete button not visible |
| 4 | Locate an **Approved** unit | Delete button not visible |
| 5 | HOD: locate any draft unit | Delete button visible (HOD can delete any draft) |

**Pass criteria:** Only draft units can be deleted; only by owner or HOD.

---

## TC-15 — HOD Cannot Edit Unit Content

**Actor:** HOD  
**Precondition:** Any unit in any status

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as HOD → open any unit via LTP detail | UnitPlanView in read-only mode |
| 2 | Check title | Not editable |
| 3 | Check Essential Question | Not editable |
| 4 | Check Unit Details fields | Not editable |
| 5 | Check standards section | No Map Standards section; standards read-only |
| 6 | Check nav bar | No Save Changes button |

**Pass criteria:** HOD sees zero editable fields in UnitPlanView.

---

## TC-16 — Revision Banner Appears and Clears Correctly

**Actor:** Teacher  
**Precondition:** HOD has requested revision with feedback

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open unit in Revision status | Amber banner at top: "Revision requested by HOD" + feedback text |
| 2 | Resubmit unit | Banner disappears immediately after resubmit |
| 3 | Withdraw and re-check | Banner still absent (draft units don't show banner) |

**Pass criteria:** Banner shown only on units in `revision` status with feedback.

---

## TC-17 — My Units View Shows Correct Status

**Actor:** Teacher  
**Precondition:** Teacher has assigned units in various states

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open **My Units** | List of assigned units |
| 2 | Check badges | Each unit shows unit-level status (Draft / Submitted / Approved / Needs Revision) |
| 3 | Click a unit | Opens UnitPlanView with correct action buttons for that status |

**Pass criteria:** My Units shows unit-level status, not plan-level status.

---

## TC-18 — HOD Dashboard: Department Stats Cards

**Actor:** HOD  
**Precondition:** At least two teachers exist, each with at least one LTP containing units in various statuses

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as HOD | — |
| 2 | Open **Dashboard** | HOD-specific dashboard renders (not teacher mastery view) |
| 3 | Check stat cards | Four cards visible: **Total Teachers**, **Total Plans**, **Pending Units**, **Approved This Week** |
| 4 | Verify Total Teachers | Count matches number of teacher accounts in Manage Users |
| 5 | Verify Pending Units | Count matches submitted units awaiting review in HOD Review queue |
| 6 | Approve a unit → return to Dashboard | **Approved This Week** count increments; **Pending Units** decrements |
| 7 | Log in as a teacher | Teacher-specific dashboard shows (mastery alerts, not department stats) |

**Pass criteria:** HOD sees department stats; teachers never see department stats.

---

## TC-19 — HOD Dashboard: Plans Needing Attention

**Actor:** HOD  
**Precondition:** Some units are in Submitted or Needs Revision status

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open HOD Dashboard | "Plans Needing Attention" section visible |
| 2 | Verify submitted plans | Listed oldest-first (earliest submitted_at timestamp first) |
| 3 | Verify revision plans | Listed below submitted plans, most-recent-first |
| 4 | Click a plan row | Navigates to HOD Review view |
| 5 | When no units need attention | Section shows empty state or is hidden |
| 6 | Verify max rows | At most 6 plans listed; overflow not shown |

**Pass criteria:** Attention list drives HOD to the right plans; click navigates correctly.

---

## TC-20 — HOD Dashboard: Strand × Teacher Heatmap

**Actor:** HOD  
**Precondition:** Teachers have logged coverage for at least some standards

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open HOD Dashboard | Strand × Teacher heatmap table visible |
| 2 | Verify rows | One row per teacher |
| 3 | Verify columns | Five columns: RL, RI, W, SL, L |
| 4 | Verify colour thresholds | ≥80% coverage → green cell; 40–79% → amber; <40% → rose |
| 5 | Verify percentage label | Each cell shows a percentage (e.g. "73%") |
| 6 | Teacher with zero coverage | All cells rose with "0%" |

**Pass criteria:** Heatmap accurately reflects each teacher's strand coverage; colours match thresholds.

---

## TC-21 — Department Coverage View: Teacher Selector

**Actor:** HOD  
**Precondition:** At least two teachers have logged different skill coverage records

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as HOD → open **Standards Coverage** | Teacher selector dropdown appears above the content |
| 2 | Default selection | "All Teachers" selected; department-wide coverage grid shown |
| 3 | Select a specific teacher | Grid filters to that teacher's coverage only; class pills appear |
| 4 | Verify strand cards | Coverage % and covered/total count reflect selected teacher |
| 5 | Select a class pill | Grid narrows to that class |
| 6 | Switch back to "All Teachers" | Class pills disappear; aggregate coverage shown |
| 7 | Log in as teacher | No teacher selector dropdown; only their own coverage shown |

**Pass criteria:** HOD can switch between aggregate and per-teacher coverage; teachers never see the selector.

---

## TC-22 — Department Coverage View: All Teachers Aggregate

**Actor:** HOD  
**Precondition:** Teacher A covers standard X; Teacher B covers standard Y (different standards)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Standards Coverage as HOD with "All Teachers" selected | Both standard X and standard Y show as covered |
| 2 | Verify coverage count | Total covered = union of all teachers' covered standards |
| 3 | Select Teacher A | Standard Y no longer shows as covered; standard X still does |
| 4 | Select Teacher B | Standard X no longer shows as covered; standard Y does |

**Pass criteria:** "All Teachers" shows the union of all coverage; per-teacher view shows only that teacher's records.

---

## TC-23 — Standards Gap Report in HOD Review

**Actor:** HOD  
**Precondition:** A plan exists with units that do not cover all 56 standards

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open **HOD Review** | Each plan group has a "Standards Gap" collapsible card |
| 2 | Check collapsed state | Header shows: "X / 56 standards mapped — Y missing" |
| 3 | Click to expand | Missing standards appear, grouped by strand |
| 4 | Verify strand grouping | Each strand (RL, RI, W, SL, L) has a colour-coded section |
| 5 | Verify strand badges | Each missing standard shown as a `StrandBadge` chip with code (e.g. "RL.6.1") |
| 6 | Plan with all standards mapped | Header shows "56 / 56 standards mapped — 0 missing"; no chips shown when expanded |
| 7 | Click to collapse | Returns to closed state |

**Pass criteria:** Gap report accurately identifies missing standards; grouped by strand; collapses cleanly.

---

## TC-24 — Standards Gap Report: Count Accuracy

**Actor:** HOD  
**Precondition:** Known set of standards are mapped to units in a plan

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Manually count standards mapped across all units in a specific plan | Note the count (e.g. 43 mapped, 13 missing) |
| 2 | Open HOD Review → expand gap report for that plan | Header shows "43 / 56 standards mapped — 13 missing" |
| 3 | Expand and count chips | Exactly 13 standard chips shown |
| 4 | Cross-reference | Each missing chip corresponds to a standard not in any unit of that plan |

**Pass criteria:** Gap count and chip list exactly match manual verification.

---

## TC-25 — HOD Student Progress: Teacher Picker

**Actor:** HOD  
**Precondition:** At least two teachers each have students and progress records

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as HOD → open **Student Progress** | Teacher selector dropdown visible at top; empty state prompt shown |
| 2 | Select a teacher | Class picker appears; student list and progress grid load for that teacher |
| 3 | Verify student list | Shows that teacher's students only |
| 4 | Verify class filter | Shows that teacher's classes |
| 5 | Switch to a different teacher | Student list and classes update to the new teacher |
| 6 | Verify no add/remove buttons | "Add Student" and "Remove" buttons not visible when HOD |
| 7 | Verify attainment dropdowns | All attainment selects disabled (read-only) for HOD |
| 8 | Log in as teacher | No teacher selector; own students shown; Add/Remove buttons visible |

**Pass criteria:** HOD can browse any teacher's student progress; cannot modify records.

---

## TC-26 — School Year Filter in Manage Classes

**Actor:** HOD  
**Precondition:** Classes exist for multiple school years (e.g. 2025-26 and 2026-27)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open **Manage Classes** | Year filter pill row visible at top |
| 2 | Verify pills | Shows distinct years from existing classes + upcoming years |
| 3 | Default pill | Most relevant year selected (earliest available) |
| 4 | Click a different year pill | Class list filters to only that year's classes |
| 5 | Click "New Class" | School Year field in dialog defaults to currently viewed year |
| 6 | Change year in dialog | Can select any available year |

**Pass criteria:** Year filter correctly scopes the class list; new class dialog inherits the viewed year.

---

## TC-27 — Start New Year Wizard

**Actor:** HOD  
**Precondition:** At least two classes exist for the current year (e.g. 2025-26)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select a year pill that has existing classes | "Start New Year" button enabled |
| 2 | Click "Start New Year" | Step 1 wizard modal opens: title shows target year (e.g. "Start 2026-27") |
| 3 | Verify checklist | All current-year classes shown, all pre-checked |
| 4 | Uncheck one class | That class deselected |
| 5 | Click "Next — Review (N classes)" | Step 2 shows list of classes to be created for the new year |
| 6 | Verify review list | Only checked classes from Step 1 shown; teacher names displayed |
| 7 | Click "Back" | Returns to Step 1 with previous selections intact |
| 8 | Confirm in Step 2 | Classes created for new year; year filter switches to new year; new classes visible |
| 9 | Verify original year | Original year's classes unchanged |

**Pass criteria:** Wizard creates correct classes for new year; source classes untouched.

---

## TC-28 — Start New Year Wizard: Empty Year

**Actor:** HOD  
**Precondition:** A year is selected that has no classes

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select a year pill with no classes | "Start New Year" button is disabled |

**Pass criteria:** Wizard cannot be opened for an empty year.

---

## TC-29 — Dynamic School Year in New LTP Dialog

**Actor:** HOD  
**Precondition:** Current date is in 2026

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open **Long Term Plan** → click "New LTP" | Dialog opens |
| 2 | Check Academic Year dropdown | Shows years like "2025-26", "2026-27", "2027-28", "2028-29" |
| 3 | Verify default | First option selected (e.g. "2025-26") |
| 4 | Verify no hardcoded "2024-25" or "2024-2026" format | No such options visible |

**Pass criteria:** Year options are dynamic, correctly formatted as YYYY-YY, and relevant to the current date.

---

## TC-30 — Unit Assignments View: Full List

**Actor:** HOD  
**Precondition:** Multiple plans exist with units in various assignment and status states

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as HOD → click **Unit Assignments** in sidebar | View loads; unit count shown in subtitle |
| 2 | Verify columns per row | Term·Unit number, title, status badge, plan name, plan owner, school year, "Assigned To" select |
| 3 | Verify all plans included | Units from all teachers' plans appear |
| 4 | Verify assigned unit | "Assigned To" select shows assigned teacher's name |
| 5 | Verify unassigned unit | "Assigned To" select shows "— Unassigned —" |
| 6 | Log in as teacher | "Unit Assignments" nav item not visible |

**Pass criteria:** HOD sees all units across all plans; teachers cannot access this view.

---

## TC-31 — Unit Assignments View: Inline Reassignment

**Actor:** HOD  
**Precondition:** A unit exists that is assigned to Teacher A

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Unit Assignments | Unit shows Teacher A in "Assigned To" select |
| 2 | Change select to Teacher B | Select updates immediately; assignment saved |
| 3 | Refresh the page | Unit still shows Teacher B |
| 4 | Change select to "— Unassigned —" | Assignment cleared; select shows "— Unassigned —" |
| 5 | Refresh | Unit still shows as unassigned |

**Pass criteria:** Inline reassignment persists to database; unassignment works.

---

## TC-32 — Unit Assignments View: Filters

**Actor:** HOD  
**Precondition:** Units exist with different teachers, assignment states, and statuses

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Filter by a specific teacher (plan owner) | Only units belonging to that teacher's plans shown |
| 2 | Filter to "Assigned" | Only units with a non-null assigned_to shown |
| 3 | Filter to "Unassigned" | Only units with null assigned_to shown |
| 4 | Filter by status "Submitted" | Only submitted units shown |
| 5 | Combine teacher + status filters | Both filters applied simultaneously |
| 6 | No units match combined filter | "No units match the current filters." empty state shown |
| 7 | Reset all filters to "All" | Full unit list restored |

**Pass criteria:** All three filter dimensions work independently and in combination.

---

## TC-33 — Re-submission Badge on HOD Review Nav

**Actor:** HOD  
**Precondition:** A teacher has resubmitted a unit after HOD requested revision (TC-09 complete)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as HOD (or stay logged in while teacher resubmits) | Red badge appears on "HOD Review" nav item |
| 2 | Verify badge count | Matches number of units that were resubmitted after revision |
| 3 | Click "HOD Review" | Badge disappears (or updates if new resubmissions arrive) |
| 4 | No resubmitted units | No badge on HOD Review nav item |
| 5 | Badge count > 9 | Badge shows "9+" |

**Pass criteria:** Badge appears only for resubmitted-after-revision units; accurate count.

---

## TC-34 — Re-submission Badge: Count Logic

**Actor:** HOD  
**Precondition:** Various units in different states

| Scenario | submitted_at vs reviewed_at | Expected Badge |
|----------|-----------------------------|----------------|
| First submission (never reviewed) | reviewed_at is null | Not counted |
| Approved unit | submitted_at < reviewed_at | Not counted |
| Resubmitted after revision | submitted_at > reviewed_at | Counted |
| Revision requested, not yet resubmitted | status = revision | Not counted |

**Pass criteria:** Only units where `submitted_at > reviewed_at` AND `reviewed_at IS NOT NULL` increment the badge.

---

## Regression Checks

After running the above, verify these existing features still work:

- [ ] Teacher can create a new LTP and add units
- [ ] AI Suggest Standards works in UnitPlanView
- [ ] AI Fill Gaps works in LTPDetailView
- [ ] AI Draft Full Year still generates a complete LTP
- [ ] Standards Coverage view still shows skills by class
- [ ] Student Progress view still works with class filters
- [ ] HOD Manage Classes: create, reassign, delete still works
- [ ] Manage Users: create teacher/HOD accounts still works
- [ ] Coverage map (all standards) in LTP detail still renders
- [ ] Unit assignment (HOD assigns unit to teacher) still works
- [ ] HOD Review: approve, request revision, re-open still work (TC-07, TC-08, TC-10)
- [ ] Teacher submit / withdraw / resubmit workflow still works (TC-01, TC-02, TC-09)
- [ ] My Units view shows correct per-unit status for teachers (TC-17)
