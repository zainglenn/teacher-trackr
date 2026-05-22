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
