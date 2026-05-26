# Design Brief: PPT Generation Flow

## Problem

Every week, a teacher has to build a lesson PowerPoint from scratch — pulling in the learning objective, the standard codes, activities, and vocabulary from their unit plan document, then formatting it manually in PowerPoint or Google Slides. This is repetitive, error-prone, and time-consuming. The data already exists in the unit plan. The teacher is just manually copying it into a different format.

## Solution

A one-tap flow that generates a structured lesson PowerPoint from the current lesson week's data. The teacher selects a lesson week, previews the slide structure, optionally adjusts slide content, and downloads a `.pptx` file ready to open in PowerPoint or Google Slides. Standards are embedded in the slides automatically — teachers never have to re-enter them.

## Experience Principles

1. **One tap to useful** — The teacher should be able to go from "I need this week's PPT" to a downloaded file in under 30 seconds with zero configuration. Customisation is available but never required.
2. **Preview before download** — The teacher sees what they're getting before committing. A slide-by-slide preview with edit capability for each slide's text content.
3. **Standards always visible** — Standard codes and descriptions must appear in the generated slides — that's the core value proposition. The teacher should never have to manually add them.

## Aesthetic Direction

- **Philosophy**: Utility-first with a polished reveal. The generation UI is clean and minimal. The preview feels like a real presentation tool — impressive enough that teachers share it with colleagues.
- **Tone**: Efficient and satisfying. Clicking Generate should feel like a small delight — something useful happening fast.
- **Reference points**: Canva's export flow, Gamma.app's slide preview, Vercel's deployment progress indicator.
- **Anti-references**: A blank form asking teachers to re-enter data they've already entered. Multi-step wizards with 6 screens. Anything that makes generating a PPT feel like more work than doing it manually.

## Existing Patterns

- **Typography**: Geist Sans for UI chrome. Slide preview renders in a neutral presentation font (system default or configurable).
- **Colors**: Status colours and strand colours carry into the slide preview — standard badges remain colour-coded (RL=blue, W=amber, etc.) in the slides.
- **Components**: `dialog.tsx` or `sheet.tsx` for the generation panel. `progress.tsx` for generation progress. `badge.tsx` for standard chips in preview.
- **Trigger point**: "Generate PPT" button on each lesson week card in the Teacher Class View.

## Component Inventory

| Component | Status | Notes |
|-----------|--------|-------|
| Generate PPT button | New | On lesson week card. Icon: `Presentation` (Lucide). Label: "Generate PPT". |
| Generation sheet/modal | New | Full-screen sheet or centered modal. Opens on button click. |
| Slide preview carousel | New | Shows each slide in sequence. Swipeable/clickable navigation. |
| Slide content editor | New | Clicking a slide opens inline text editing for that slide's content. |
| Slide structure selector | New | Optional: teacher can toggle which slide types to include (e.g. skip vocabulary slide). |
| Generation progress indicator | New | Shown while API call processes. Animated. Estimated time: <5 seconds. |
| Download button | New | Prominent after generation. "Download .pptx". Secondary: "Regenerate". |
| Standard slide component | New | Inside preview: strand-coloured badge + standard code + objective text. |
| `dialog.tsx` / `sheet.tsx` | Exists | Container for the generation flow. |
| `progress.tsx` | Exists | Generation progress bar. |
| `badge.tsx` | Exists | Standard badges inside slide previews. |

## Slide Structure (Default Template)

Generated from `LessonWeek` data (`week`, `focus`, `activities`, `standards[]`):

| Slide | Content | Source field |
|-------|---------|--------------|
| 1 | Title slide — lesson title, class, week, date | `unit.title`, `week.week`, class name |
| 2 | Learning objectives — bullet list | `week.focus` |
| 3 | Standards — colour-coded by strand | `week.standards[]` mapped to full standard descriptions |
| 4 | Activities — structured list | `week.activities` |
| 5 | Vocabulary — key terms (if unit has vocabulary) | `unit.vocabulary[]` |
| 6 | Assessment / Exit ticket | `unit.assessment_plan` or placeholder |

## Key Interactions

- **Trigger**: Teacher clicks "Generate PPT" on a lesson week card. Sheet opens immediately with a loading state while slide data is assembled (no API call yet — just reading local data).
- **Preview**: Slide carousel renders. Teacher can swipe/click through all slides. Each slide is a styled preview (not pixel-perfect, but structurally accurate).
- **Edit slide**: Clicking any text element in the preview makes it editable inline. Changes are local to this generation — they don't overwrite the master plan.
- **Toggle slides**: Checkbox list of slide types. Unchecking a type removes it from the preview and the generated file.
- **Generate**: "Download PPT" button triggers the PptxGenJS API call (`POST /api/generate-ppt`). Progress bar animates. On completion, browser download triggers automatically.
- **Regenerate**: If teacher changes slide content and wants a fresh file, "Regenerate" re-runs the API call with updated content.
- **Error state**: If generation fails, inline error with "Try again" button. Never a full page error.

## Responsive Behavior

- **Desktop**: Sheet opens as a wide right panel (60% viewport). Slide preview at comfortable reading size. Edit panel beside preview.
- **Tablet**: Sheet takes 80% width. Preview slightly smaller. Edit below preview.
- **Mobile**: Full-screen sheet. Slides previewed one at a time, full width. Edit as a bottom drawer per slide.

## Accessibility Requirements

- All slide preview text readable by screen reader (not rendered as canvas/image).
- Keyboard navigation through slides (left/right arrows).
- Download button has `aria-label` including lesson week number and class name.
- Progress indicator uses `role="progressbar"` with `aria-valuenow`.
- Error messages use `role="alert"`.

## Out of Scope

- Generating PPTs for an entire unit or term at once (single lesson week scope for v1).
- Uploading the PPT directly to Google Drive or SharePoint (future integration).
- Custom branding / school logo on slides (future).
- Teacher choosing a slide theme/colour scheme (future).
- Saving edited slide content back to the master plan (edits are ephemeral — master plan editing is HOD-only).
