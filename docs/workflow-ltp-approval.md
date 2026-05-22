# LTP Approval & Submission Workflow (v3)

**App:** Curriculum Tracker · Dubai Schools Al Khawaneej  
**Actors:** Teacher, Head of Department (HOD)  
**Date:** May 2026

> **Architecture:** Submission and approval operate at the **unit plan level**. The LTP status is computed from its units. Teachers access LTPs through their **class assignments** — if the HOD assigns a teacher to class 6A, that teacher can create and edit units in the 6A LTP. The HOD reviews units, not the whole plan at once.

---

## Decisions (Locked)

| # | Question | Answer |
|---|----------|--------|
| 1 | Who owns units in an LTP? | Access is class-based. A teacher can work on units in any LTP whose class is assigned to them by the HOD. A teacher assigned to 6A and 6B has units in both LTPs. |
| 2 | Can teachers create units? | Yes. Any teacher assigned to a class can create units in that class's LTP. |
| 3 | Can a teacher withdraw a submitted unit? | Yes, as long as the HOD hasn't reviewed it yet. |
| 4 | What happens when a new unit is added to a fully approved LTP? | The LTP reverts to In Progress. All units must be approved for the LTP to be Fully Approved. |
| 5 | Can the HOD re-open an approved unit? | Yes. HOD can revert any unit from Approved back to Revision with a reason at any time. |

---

## Data Model

### How access works
```
HOD assigns teacher → class
         │
         ▼
class is linked to → LTP
         │
         ▼
teacher can create/edit units in that LTP
```

A single teacher assigned to multiple classes → access to multiple LTPs.  
A single LTP can have units created by different teachers (if both are assigned to that class).

### Unit status field
`ltp_units` needs new columns:

```sql
ALTER TABLE ltp_units
  ADD COLUMN status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'approved', 'revision')),
  ADD COLUMN hod_feedback text,
  ADD COLUMN submitted_at timestamptz,
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN reviewed_by uuid REFERENCES auth.users(id);
```

### LTP aggregate status (never stored — always computed)

| Unit states in the LTP | Computed LTP Status | Colour |
|------------------------|---------------------|--------|
| All `draft` | In Progress | Grey |
| Mix of `draft` and `submitted` | In Progress (units pending) | Grey |
| All `submitted`, none `draft` | Awaiting Review | Amber |
| Any `revision`, none `submitted` | Has Revisions | Rose |
| Mix of `approved` and others | Partially Approved | Blue |
| All `approved` | Fully Approved | Emerald |

> Adding a new unit to a Fully Approved LTP reverts it to In Progress.  
> HOD can re-open any Approved unit → reverts to Revision → LTP drops from Fully Approved.

---

## Actors & Permissions

| Action | Teacher (class assigned) | Teacher (class not assigned) | HOD |
|--------|--------------------------|------------------------------|-----|
| View full LTP (all terms, all units) | ✅ read-only + own units editable | ❌ not visible | ✅ full access |
| Create units in LTP | ✅ | ❌ | ✅ |
| Edit unit content | ✅ own `draft`/`revision` units | ❌ | ✅ any unit |
| Withdraw a submitted unit | ✅ only if HOD hasn't reviewed yet | ❌ | ❌ |
| Submit a unit plan | ✅ own units only | ❌ | ❌ |
| Approve / revise a unit | ❌ | ❌ | ✅ |
| Re-open an approved unit | ❌ | ❌ | ✅ |
| Delete a unit | ✅ own `draft` units only | ❌ | ✅ any unit |

---

## Unit Plan State Machine

```
  [created by teacher or HOD]
            │
            ▼
          DRAFT ◀─────────────────────────────────────────────┐
            │                                                  │
   Teacher submits unit                             HOD re-opens approved unit
            │                                        (with reason)
            ▼                                                  │
       SUBMITTED ──── Teacher withdraws (HOD hasn't acted) ──▶ DRAFT
            │
     HOD reviews
            │
     ┌──────┴──────┐
     ▼             ▼
 APPROVED      REVISION
     │             │
  [locked]  Teacher edits
             + resubmits
                   │
              SUBMITTED
           (back in queue)
```

---

## Step-by-Step Workflow

---

### Phase 0 — HOD: Set Up Classes and Assign Teachers

**Before the year begins**

1. HOD creates classes (6A, 6B, 6C) in **Manage Classes**
2. HOD assigns each class to the responsible teacher
3. HOD creates an LTP per class (or one shared LTP linked to a class grouping)
4. Teachers can now see the LTPs for their assigned classes

**Current build status:**
- [x] Manage Classes page — create, assign, reassign classes
- [ ] **Missing:** LTP needs a `class_id` foreign key — currently no link between an LTP and a class
- [ ] **Missing:** Access control based on class assignment — currently based on `ltp.teacher_id`

---

### Phase 1 — Teacher: View the Full Year Plan

**Actor:** Teacher  
**Starting state:** Assigned to at least one class with an LTP

- Teacher opens **Long Term Plan** and sees all LTPs for their assigned classes
- Each LTP shows the full 3-term grid — all units, including those created by colleagues if the same class has multiple contributors
- Units in `draft` or `revision` that belong to this teacher are editable
- All other units are read-only

**UI requirements:**
- LTP list shows each class's plan with computed aggregate status
- Term grid: unit cards show the creating teacher's name (or "You") and unit status badge
- My unit → full-colour card, edit cursor, click → UnitPlanView (editable)
- Colleague's unit or HOD's unit → muted card, click → UnitPlanView (read-only)
- Unassigned units (no teacher creator yet) → dashed border, "No owner"

**Current build status:**
- [x] Term grid visible
- [x] `canEdit` flag disables editing for non-owners
- [ ] **Missing:** Visual distinction between own / colleague's / unassigned units
- [ ] **Missing:** LTP filtered by class assignment (currently all LTPs for the teacher's `teacher_id`)

---

### Phase 2 — Teacher: Create and Edit a Unit

**Actor:** Teacher assigned to the class

1. Teacher clicks **+ Add Unit** in a term column
2. Fills in title, big idea, duration, assessment type → unit created with status `draft`
3. Auto-navigated to UnitPlanView for that unit
4. Maps standards, sets essential question, fills in details
5. Saves changes (auto-save or explicit Save button)

**Unit is editable when:** `unit.status ∈ [draft, revision]` AND the current user created the unit OR is assigned to the class.

**Current build status:**
- [x] Add unit button and LTPUnitDialog
- [x] Auto-navigate to UnitPlanView after creation
- [x] UnitPlanView with full editing
- [ ] **Missing:** Edit gate needs to move from `plan.status`-based to `unit.status + class assignment`-based

---

### Phase 3 — Teacher: Submit a Unit Plan

**Actor:** Teacher  
**Starting state:** Unit is `draft` or `revision`

**Preconditions to submit:**
- Unit has a title
- Unit has an essential question (big idea)
- At least 1 standard mapped

**Steps:**
1. Teacher clicks **Submit Unit** button in UnitPlanView
2. Pre-submit summary dialog shows:
   - Unit title + essential question
   - Standards mapped (count + strand breakdown)
   - Warning if fewer than 3 standards mapped ("this seems light — are you sure?")
3. Teacher confirms → unit status → `submitted`
4. Unit fields lock (read-only)
5. "Withdraw" button appears (as long as HOD hasn't acted)

**Current build status:**
- [x] Submit action exists — but at the LTP level, not unit level
- [ ] **Missing:** Unit-level submit button in UnitPlanView
- [ ] **Missing:** Pre-submit summary dialog
- [ ] **Missing:** Withdraw button (unit returns to `draft` if HOD hasn't reviewed)

---

### Phase 4 — HOD: See Submitted Units

**Actor:** HOD

- HOD Review page shows all `submitted` units across all LTPs, grouped by LTP / class
- Sorted by submission date — oldest first (FIFO)
- Sidebar badge shows count of pending units

**Each unit entry shows:**
- Unit title + essential question (first 100 chars)
- Teacher name + class + term number
- Standards count + strand breakdown (e.g. RL ✓ RI ✓ W ✓ SL ✗ L ✓)
- Duration + assessment type
- "Submitted X days ago"
- Open Unit / Approve / Request Revision actions

**Current build status:**
- [x] HOD Review page with submitted plan cards
- [x] Expandable unit breakdown
- [ ] **Missing:** Review is per LTP, not per unit — needs restructure
- [ ] **Missing:** Essential question, duration, assessment type in the review card
- [ ] **Missing:** Strand coverage summary per unit on the card
- [ ] **Missing:** Submission date shown
- [ ] **Missing:** Sidebar badge count

---

### Phase 5 — HOD: Open and Read a Unit Plan

**Actor:** HOD

1. HOD clicks **Open Unit** from the review card
2. UnitPlanView opens in **read-only mode** (HOD cannot edit)
3. HOD reads: title, essential question, all mapped standards, duration, assessment type
4. HOD returns to review card and makes a decision

**Current build status:**
- [ ] **Missing:** HOD cannot navigate from HOD Review into UnitPlanView — this link does not exist

---

### Phase 6a — HOD: Approve a Unit

1. HOD clicks **Approve**
2. Confirmation dialog: "Approve [Unit Title]? This cannot be undone without re-opening."
3. Optional approval note (visible to teacher)
4. Unit status → `approved`, locked

**After approval:**
- Unit card on term grid shows green "Approved" badge
- Teacher sees the approval note (if any) in UnitPlanView
- LTP aggregate status recomputes
- If all units are now approved → LTP shows "Fully Approved"

**Current build status:**
- [x] Approve action at LTP level
- [ ] **Missing:** Approve at unit level
- [ ] **Missing:** Confirmation dialog
- [ ] **Missing:** Optional approval note

---

### Phase 6b — HOD: Request Unit Revision

1. HOD clicks **Request Revision**
2. Feedback textarea — **required**, free text
3. Unit status → `revision`

**After revision request:**
- Teacher's unit unlocks for editing
- Feedback displayed as a prominent banner at the top of UnitPlanView
- Teacher revises and re-submits (back to Phase 3)
- On HOD's second review: revision round number shown ("Round 2"), previous feedback visible

**Current build status:**
- [x] Request Revision at LTP level with required feedback
- [ ] **Missing:** Unit-level revision request
- [ ] **Missing:** Feedback banner in UnitPlanView
- [ ] **Missing:** Revision round counter and feedback history

---

### Phase 7 — HOD: Re-open an Approved Unit

1. HOD finds a previously approved unit (in term grid or reviewed list)
2. Clicks **Re-open Unit**
3. Provides a reason (required)
4. Unit status → `revision`
5. Teacher is notified, unit unlocks
6. LTP drops from "Fully Approved" back to "In Progress / Has Revisions"

**Current build status:**
- [ ] **Missing entirely**

---

## Build Priority (Ordered)

These are ordered by the minimum needed to make the workflow functional end-to-end.

| Priority | Change | Type |
|----------|--------|------|
| 1 | Add `status`, `hod_feedback`, `submitted_at`, `reviewed_at`, `reviewed_by` to `ltp_units` | DB migration |
| 2 | Link `long_term_plans` to `classes` via `class_id` | DB migration |
| 3 | Update access control: edit gate based on `unit.status + class assignment` not `plan.status` | Logic |
| 4 | Submit Unit button in UnitPlanView + pre-submit dialog | UI |
| 5 | Withdraw button in UnitPlanView (while unit is submitted + HOD hasn't acted) | UI |
| 6 | HOD Review restructure: units as primary item grouped by LTP | UI |
| 7 | "Open Unit" link from HOD Review → UnitPlanView (read-only) | UI |
| 8 | Unit-level Approve / Request Revision in HOD Review | UI |
| 9 | HOD feedback banner at top of UnitPlanView when unit is in `revision` | UI |
| 10 | LTP aggregate status computed and displayed on LTP list and detail | Logic + UI |
| 11 | Re-open approved unit (HOD) | UI |
| 12 | Revision round counter + feedback history | UI |
| 13 | Sidebar badge counts for pending items | UI |

---

## Acceptance Criteria

### Teacher
- [ ] Sees only LTPs for their assigned classes
- [ ] Sees the full year plan (all terms, all units) — own units editable, others read-only
- [ ] Can create units in their assigned LTPs
- [ ] Submit Unit button available in UnitPlanView when unit is ready
- [ ] Can withdraw a submitted unit (before HOD acts)
- [ ] Sees HOD feedback as a banner at the top of UnitPlanView when unit is in revision
- [ ] Cannot edit a `submitted` or `approved` unit

### HOD
- [ ] HOD Review shows submitted units (not plans), grouped by LTP/class
- [ ] Can open any unit plan in full read-only view from the review screen
- [ ] Approve and Request Revision actions work at the unit level
- [ ] Can re-open any approved unit with a reason
- [ ] Sees revision round number and previous feedback on re-review

### System
- [ ] LTP aggregate status is always computed — never directly set
- [ ] Adding a unit to a Fully Approved LTP reverts status to In Progress
- [ ] HOD re-opening an approved unit reverts LTP from Fully Approved
