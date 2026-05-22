@AGENTS.md

# Curriculum Tracker

Grade 6 English curriculum tracker for Dubai Schools Al Khawaneej. Teachers build Long Term Plans (LTPs), map NYSED Grade 6 ELA standards to units, and track student progress. HODs review and approve submitted plans.

## Stack

- **Next.js 16.2.6** (Turbopack) — see AGENTS.md for breaking change warning
- **Supabase** — auth + database (env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- **DeepSeek API** — AI standard suggestions and LTP drafting (env: `DEEPSEEK_API_KEY`)
- **shadcn/ui + Tailwind CSS**
- **Deployed on Vercel** → https://curriculum-tracker-five.vercel.app

## Key Architecture

### Navigation
Single-page app with sidebar navigation. All views are rendered in `src/app/page.tsx` via `view` state. No Next.js routing is used for views.

### Roles
- `teacher` — creates/edits LTPs, maps standards, tracks student progress
- `hod` — reviews and approves/rejects submitted LTPs, assigns units to teachers

### Data flow
`useLongTermPlans` hook manages all LTP state. Plan → Units → Standards is the hierarchy.

## Component Structure

```
src/components/
├── LongTermPlanView.tsx     — list of plans, create new plan
├── LTPDetailView.tsx        — plan detail: term grid, coverage map, status actions
├── LTPUnitDialog.tsx        — minimal creation-only dialog (title, big idea, duration, assessment)
├── ltp/
│   ├── UnitPlanView.tsx     — full unit editor: document-style with standards table
│   ├── TermGrid.tsx         — 3-column term grid layout
│   ├── StrandBadge.tsx      — strand color system (RL=blue, RI=violet, W=amber, SL=emerald, L=rose)
│   ├── StrandProgressBar.tsx
│   └── LTPStatusBadge.tsx
├── CoverageView.tsx         — standards coverage by strand
├── StudentProgressView.tsx
├── DashboardView.tsx
└── AppSidebar.tsx
```

## UnitPlanView Design

Modelled after a real teacher unit plan document:

1. **Nav bar** — breadcrumb + Save Changes button
2. **Title** — inline-editable large heading
3. **Header card** — 3-column bordered layout:
   - Left 2/3: Essential Question (big_idea textarea)
   - Right 1/3: Unit Details (duration, start week, assessment type)
4. **Standards table** — selected standards as rows: Strand | Standard code | Teaching Objective
   - X button removes a standard
   - Sorted by strand order: RL → RI → W → SL → L
5. **Map Standards footer** — collapsible (defaults open), contains:
   - AI Suggest button → calls `/api/ai/suggest-standards` via DeepSeek
   - Strand-grouped checklist with collapsible sections

## LTP Edit Flow

- **Edit unit** → navigates to UnitPlanView (no modal)
- **Create unit** → LTPUnitDialog (minimal form) → auto-navigates to UnitPlanView after creation
- Unit card titles are clickable to navigate to UnitPlanView

## AI Features

- **AI Suggest Standards** (`/api/ai/suggest-standards`) — suggests 3–6 standards fitting the unit theme, prioritising uncovered standards
- **AI Fill Gaps** — distributes unmapped standards across existing units
- **AI Draft Full Year** (`/api/ai/draft-ltp`) — generates a complete LTP with all standards distributed

## Strand Colours

Defined in `src/components/ltp/StrandBadge.tsx`:

| Strand | Code | Colour |
|--------|------|--------|
| Reading Literature | RL | blue |
| Reading Informational Text | RI | violet |
| Writing | W | amber |
| Speaking & Listening | SL | emerald |
| Language | L | rose |

## Dev

```bash
npm run dev      # starts on :3000 (or next available port)
```

Env vars needed locally: copy from `.env.local` (Supabase + DeepSeek keys already set).
