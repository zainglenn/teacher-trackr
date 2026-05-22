# Product Brief — Head of Department (HOD)

**App:** Curriculum Tracker · Dubai Schools Al Khawaneej  
**Role:** Head of Department, Grade 6 English  
**Date:** May 2026

---

## Who I Am

I oversee the Grade 6 English department. I have 3–6 teachers, each teaching one or more classes. My job is to ensure every class is getting full curriculum coverage, that teachers' plans meet our department's expectations, and that no standard slips through the cracks across the year.

I'm the gatekeeper: teachers submit their Long Term Plans to me for approval before the term starts. I also set up the system at the start of the year — creating classes and assigning them to teachers.

I am not a spreadsheet person. I need oversight at a glance, with the ability to drill down when something looks off.

---

## My Core Jobs

### 1. Set up the department at the start of year

Before teachers can do anything useful, I need to create accounts and configure classes.

**What I need:**
- Create teacher accounts (email + password)
- Create classes (e.g. 6A, 6B, 6C) and assign each to a teacher
- Reassign a class if a teacher leaves or changes
- See at a glance which teachers have which classes

**Current state:**
- [x] Manage Users — create teacher accounts, set role (teacher/HOD), delete accounts
- [x] Manage Classes — create classes, assign to teacher, reassign, delete
- [x] Classes grouped by teacher in Manage Classes view
- [ ] **Gap:** No school year management — all classes default to "2024-25", no easy way to roll over to a new year
- [ ] **Gap:** No bulk setup — I have to create classes one at a time
- [ ] **Gap:** No way to see a summary of the full department structure on a single screen (teacher → classes → students count)

---

### 2. Review and approve teacher Long Term Plans

Teachers submit their LTPs for my review before the term begins. I need to check that:
- All required standards are mapped across the year
- The workload is distributed sensibly across terms
- The essential questions are appropriate
- Assessment types are balanced

**What I need:**
- See all submitted LTPs across all teachers in one place
- View the full unit plan detail for any unit
- Approve a plan or return it with specific written feedback
- See the history of a plan (how many revisions, what feedback was given)
- Know when a teacher has re-submitted after revision

**Current state:**
- [x] HOD Review view — lists all submitted LTPs with teacher name and submission date
- [x] Drill into any LTP to see the full term grid and unit list
- [x] Approve or request revision with a feedback text field
- [x] Status badge on each plan (submitted / approved / revision)
- [ ] **Gap:** No standards coverage summary *per plan* — I have to open each unit individually to check coverage
- [ ] **Gap:** No indication of which standards are missing from a plan before I approve it
- [ ] **Gap:** No revision history — I can't see what feedback I gave in previous rounds
- [ ] **Gap:** No notification when a teacher re-submits — I have to keep checking the review queue

---

### 3. Assign units to specific teachers (cross-class coordination)

Sometimes a single teacher is the "owner" of a particular unit type across all sections (e.g. one teacher leads the argument writing unit for all 6th graders). I need to assign individual units to specific teachers.

**What I need:**
- Assign a unit to a teacher who isn't the LTP owner
- That teacher sees the unit in "My Units"

**Current state:**
- [x] Unit assignment exists — HOD can assign individual units to specific teachers
- [x] Assigned teachers see units in "My Units" view
- [ ] **Gap:** No clear UI for doing this — assignment is buried inside the unit edit view
- [ ] **Gap:** No overview of cross-teacher assignments across all LTPs

---

### 4. Monitor department-wide curriculum coverage

I need to know whether the department as a whole is on track. Are all standards being taught? Are any strands being neglected?

**What I need:**
- An overview of standards coverage across all teachers/classes
- Ability to filter by teacher or class
- See which standards no teacher has covered yet

**Current state:**
- [x] Standards Coverage view exists (teacher's own coverage)
- [x] Per-class filtering on coverage view
- [ ] **Gap: No department-wide coverage view** — I can only see *my own* coverage, not my teachers'
- [ ] **Gap:** No "gaps report" — standards that are mapped in no LTP and taught by no teacher
- [ ] **Gap:** Coverage page has no HOD-specific filtering by teacher

---

### 5. Monitor student progress across the department

I need to know if students across the department are meeting expectations, not just within one teacher's class.

**Current state:**
- [ ] **Gap: No HOD view of student progress** — I can only see my own student data
- [ ] **Gap:** No aggregated attainment view (e.g. "across all 6A students, 40% are below on RL.6.1")

---

## My Biggest Pain Points (Priority Order)

1. **No department-wide coverage view** — I can't see whether my teachers are actually teaching what they planned
2. **No standards gap report per LTP** — I have to manually check every unit when reviewing a plan
3. **No notifications** — both for re-submitted plans and for coverage milestones
4. **No school year rollover** — setup is manual and tedious at the start of each year
5. **Unit assignment is buried** — I need a clearer way to manage cross-teacher unit ownership

---

## What "Done" Looks Like for Me

- In September, I set up all teachers and classes in under 10 minutes
- By October, all LTPs are submitted; I review each one, see immediately which standards are missing, and approve or return with a single note
- During the year, I open the app once a week and see a department-wide heatmap: which standards have been taught, which are behind, and which teachers are on track
- At the end of year, I can generate a coverage report showing full curriculum delivery across all classes

---

## Open Questions for Product

1. Should the HOD be able to *edit* a teacher's LTP directly, or only give feedback?
2. Should coverage tracking be mandatory (teachers must log what they teach) or optional?
3. Do we need parent/admin-facing reports, or is this purely internal for the department?
4. Should "school year" be a first-class concept that resets LTPs and coverage each year?
5. Is the NYSED standard set fixed, or does the HOD need to customise which standards are active for a given year?
