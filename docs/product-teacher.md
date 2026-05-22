# Product Brief — Teacher

**App:** Curriculum Tracker · Dubai Schools Al Khawaneej  
**Role:** Grade 6 English Teacher  
**Date:** May 2026

---

## Who I Am

I teach one or more Grade 6 English classes (e.g. 6A, 6B). My HOD assigns classes to me at the start of the year. I'm responsible for planning my teaching across the year, mapping NYSED Grade 6 ELA standards to my units, logging what I've actually taught, and tracking how each student is progressing against those standards.

I use this app instead of paper unit plan templates and standalone spreadsheets. Everything should feel like a natural extension of how I already plan — not like extra admin.

---

## My Core Jobs

### 1. Plan my year (Long Term Plan)

I create a Long Term Plan (LTP) that maps out my units across 3 terms. Each unit has:
- A title and essential question (the "big idea")
- Duration in weeks and start week
- An assessment type (formative / summative / both)
- A set of ELA standards it covers

**What I need:**
- A clear term grid showing all my units at a glance
- To create a unit quickly (title + duration) and then flesh it out separately
- A document-style unit editor that feels like the unit plan templates I already use
- To map standards to a unit using a checklist, ideally with AI suggestions based on my unit theme
- To see which standards I've already covered in other units so I don't over-map

**Current state:**
- [x] LTP term grid exists
- [x] Unit creation dialog (title, big idea, duration, assessment)
- [x] Unit plan view with inline-editable title, essential question, unit details
- [x] Standards table in unit plan (sorted by strand)
- [x] Map Standards picker (collapsible, grouped by strand)
- [x] AI Suggest button (DeepSeek) — suggests 3–6 standards based on unit theme
- [ ] **Gap:** No visual indicator of which standards are already mapped in *other* units while I'm editing this one (coverage context)
- [ ] **Gap:** No way to reorder units within a term via drag-and-drop

---

### 2. Submit my plan for HOD approval

Once my LTP is ready, I submit it to my HOD for review. I may receive it back with feedback requesting revisions.

**What I need:**
- A clear submit action
- To see my plan's current status (draft / submitted / under review / approved / needs revision)
- To read my HOD's feedback when a revision is requested
- To re-submit after making changes

**Current state:**
- [x] Status badge on LTP (draft / submitted / approved / revision)
- [x] Submit button visible when plan is in draft or revision
- [x] HOD feedback visible when status is "revision"
- [ ] **Gap:** No notification when my plan status changes — I have to keep checking manually

---

### 3. Track what I've actually taught (Standards Coverage)

As I teach, I log which skills (sub-skills of each standard) I've covered in each class. This is separate from the plan — it's the live record of what happened.

**What I need:**
- To see all standards grouped by strand
- To drill into a standard and see its individual skills
- To mark a skill as taught (with date and optional notes)
- To see overall progress per strand and per standard
- To do this per class — 6A and 6B may be at different points

**Current state:**
- [x] Standards grouped by strand with progress bars
- [x] Drill-down to individual skills per standard
- [x] Mark skill as taught with date + notes
- [x] Per-class filtering (class tabs at top)
- [x] "All Classes" tab shows union across all classes
- [ ] **Gap:** No way to bulk-mark multiple skills at once (common after teaching a full lesson)
- [ ] **Gap:** Classes are assigned by HOD — if no classes are assigned yet, the view just shows "All" with no classes to filter by (confusing blank state)

---

### 4. Track student progress

I record each student's attainment against each standard: Not Assessed / Below / Approaching / Meeting / Exceeding.

**What I need:**
- A student roster per class
- To quickly update attainment for a student across all standards
- To see at a glance which students are struggling (below/approaching)

**Current state:**
- [x] Student list with add/remove
- [x] Attainment selector per standard per student
- [x] Summary stats (assessed count, meeting/exceeding count)
- [x] Per-class filtering
- [ ] **Gap:** Adding a student doesn't ask which class — students added from "All" view have no class, making them invisible when filtering by class
- [ ] **Gap:** No at-a-glance "concern" view — I have to click each student individually to see their attainment
- [ ] **Gap:** No way to export or share progress data

---

### 5. View my assigned units (My Units)

If my HOD assigns specific units to me (e.g. I'm responsible for the poetry unit across sections), I can see them in "My Units" without going into the full LTP.

**Current state:**
- [x] My Units view exists and shows units assigned to me
- [ ] **Gap:** No clear explanation of *who* assigned the unit or *why* — context is missing

---

## My Biggest Pain Points (Priority Order)

1. **No class context when adding students** — students added outside a class tab are lost
2. **No notification when HOD responds to my LTP** — I don't know when to act
3. **No standard coverage context while mapping** — I can't see which standards are already over-covered across my LTP
4. **Blank state when no classes are assigned** — confusing before HOD sets me up

---

## What "Done" Looks Like for Me

- I open the app at the start of term, create my LTP, map standards to each unit with AI help, and submit it — all in under 30 minutes
- During the year, after each lesson I mark 2–3 skills as taught in under a minute
- At any point I can see a clear picture of where each student stands
- I never have to chase my HOD — I get notified when my plan is approved or needs revision
