import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import PptxGenJS from "pptxgenjs";

// ── Colour palette ─────────────────────────────────────────────────────────────
const C = {
  navy:    "1B2A4A",  // header backgrounds
  white:   "FFFFFF",
  offWhite:"F8FAFC",
  slate:   "64748B",
  dark:    "1E293B",
  accent:  "4F6EF7",  // EL Education–style indigo
  green:   "059669",
  amber:   "D97706",
  border:  "E2E8F0",
  lightBg: "EFF6FF",
};

const STRAND_BG: Record<string, string> = {
  RL: "DBEAFE", RI: "EDE9FE", W: "FEF3C7", SL: "D1FAE5", L: "FFE4E6",
};
const STRAND_FG: Record<string, string> = {
  RL: "1E40AF", RI: "5B21B6", W: "92400E", SL: "065F46", L: "9F1239",
};
function strandFrom(code: string) { return code.split(".")[0]; }

// ── Slide helpers ──────────────────────────────────────────────────────────────

function sectionHeader(pptx: PptxGenJS, label: string, accent = C.accent) {
  const slide = pptx.addSlide();
  slide.background = { fill: C.navy };

  // Left accent bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.12, h: 5.63, fill: { color: accent }, line: { color: accent },
  });

  // Label — vertically centred
  slide.addText(label, {
    x: 0.35, y: 1.8, w: 9, h: 2,
    fontSize: 44, bold: true, color: C.white, fontFace: "Calibri Light", valign: "middle",
  });

  // DSK footer
  slide.addText("Dubai Schools Al Khawaneej · Grade 6 ELA", {
    x: 0.3, y: 5.1, w: 9.4, h: 0.3,
    fontSize: 9, color: "94A3B8", fontFace: "Calibri",
  });

  return slide;
}

function contentSlide(pptx: PptxGenJS, title: string, tag?: string, tagColor = C.accent) {
  const slide = pptx.addSlide();
  slide.background = { fill: C.white };

  // Top bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 0.75, fill: { color: C.navy }, line: { color: C.navy },
  });

  // Title in bar
  slide.addText(title, {
    x: 0.35, y: 0, w: 9, h: 0.75,
    fontSize: 18, bold: true, color: C.white, fontFace: "Calibri", valign: "middle",
  });

  // Optional right-aligned tag (e.g. "5 min", "RL.6.2")
  if (tag) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 11.4, y: 0.12, w: 1.7, h: 0.5,
      fill: { color: tagColor }, line: { color: tagColor }, rectRadius: 0.06,
    });
    slide.addText(tag, {
      x: 11.4, y: 0.12, w: 1.7, h: 0.5,
      fontSize: 11, bold: true, color: C.white, fontFace: "Calibri", align: "center", valign: "middle",
    });
  }

  // Footer
  slide.addText("Dubai Schools Al Khawaneej · Grade 6 ELA", {
    x: 0.3, y: 5.35, w: 9.4, h: 0.2,
    fontSize: 8, color: "CBD5E1", fontFace: "Calibri",
  });

  return slide;
}

// ── Route ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { unitId, weekNumber, planTitle, overrides } = await req.json() as {
    unitId: string;
    weekNumber: number;
    planTitle?: string;
    overrides?: Record<number, { title?: string; content?: string }>;
  };

  if (!unitId || weekNumber == null) {
    return NextResponse.json({ error: "unitId and weekNumber are required" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: unit, error } = await supabase
    .from("ltp_units")
    .select("id, title, term, unit_number, lesson_sequence, vocabulary, learning_outcomes, success_criteria, anchor_texts")
    .eq("id", unitId)
    .single();

  if (error || !unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

  const lessonSequence: { week: number; focus: string; activities: string; standards: string[] }[] =
    unit.lesson_sequence ?? [];
  const week = lessonSequence.find((w) => w.week === weekNumber);
  if (!week) return NextResponse.json({ error: "Lesson week not found" }, { status: 404 });

  // Fetch standard descriptions for this week
  const weekCodes = week.standards ?? [];
  let standards: { code: string; description: string; strand: string }[] = [];
  if (weekCodes.length > 0) {
    const { data } = await supabase
      .from("standards")
      .select("code, description, strand")
      .in("code", weekCodes);
    standards = (data ?? []) as typeof standards;
  }

  // ── Build presentation ───────────────────────────────────────────────────────
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 × 7.5 inches
  pptx.author = "Curriculum Tracker";
  pptx.subject = unit.title;

  const override = (idx: number, fallback: string) =>
    overrides?.[idx]?.content ?? fallback;

  // ── Slide 1: Title ────────────────────────────────────────────────────────────
  {
    const slide = pptx.addSlide();
    slide.background = { fill: C.navy };

    // Accent bar top
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: C.accent }, line: { color: C.accent },
    });

    // Unit label
    slide.addText(`Unit ${unit.unit_number} · Week ${weekNumber} · Term ${unit.term}`, {
      x: 0.6, y: 0.9, w: 12, h: 0.5,
      fontSize: 14, color: "94A3B8", fontFace: "Calibri", bold: false,
    });

    // Unit title
    slide.addText(override(1, unit.title), {
      x: 0.6, y: 1.5, w: 11, h: 2.0,
      fontSize: 38, bold: true, color: C.white, fontFace: "Calibri Light",
    });

    // Week focus
    if (week.focus) {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.6, y: 3.6, w: 11, h: 0.08, fill: { color: C.accent }, line: { color: C.accent },
      });
      slide.addText(override(1, week.focus), {
        x: 0.6, y: 3.8, w: 11, h: 0.7,
        fontSize: 18, color: "CBD5E1", fontFace: "Calibri", italic: true,
      });
    }

    // Plan / class
    if (planTitle) {
      slide.addText(planTitle, {
        x: 0.6, y: 4.7, w: 11, h: 0.4,
        fontSize: 12, color: "64748B", fontFace: "Calibri",
      });
    }

    slide.addText("Dubai Schools Al Khawaneej · Grade 6 ELA", {
      x: 0.6, y: 5.2, w: 12, h: 0.3,
      fontSize: 10, color: "475569", fontFace: "Calibri",
    });
  }

  // ── Slide 2: Do Now ───────────────────────────────────────────────────────────
  {
    const slide = contentSlide(pptx, "Do Now", "5 min", C.amber);

    const doNowPrompt = override(2,
      week.focus
        ? `Think about what you know about: "${week.focus}"\n\nIn 2–3 sentences, write what comes to mind. Be ready to share with a partner.`
        : "Write 2–3 sentences about what you remember from last lesson. What was the most important idea?"
    );

    // Instruction box
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.5, y: 0.9, w: 12.3, h: 1.5,
      fill: { color: C.lightBg }, line: { color: C.border }, rectRadius: 0.08,
    });
    slide.addText(doNowPrompt, {
      x: 0.7, y: 0.95, w: 12, h: 1.4,
      fontSize: 16, color: C.dark, fontFace: "Calibri", breakLine: true, valign: "middle",
    });

    // Response lines
    const lineY = [2.6, 3.2, 3.8, 4.4];
    lineY.forEach((y) => {
      slide.addShape(pptx.ShapeType.line, {
        x: 0.5, y, w: 12.3, h: 0, line: { color: C.border, width: 1 },
      });
    });

    slide.addText("Write your response below:", {
      x: 0.5, y: 2.35, w: 6, h: 0.3,
      fontSize: 11, color: C.slate, fontFace: "Calibri", italic: true,
    });
  }

  // ── Slide 3: Learning Targets ──────────────────────────────────────────────────
  {
    const slide = contentSlide(pptx, "Learning Targets", "2 min", C.green);

    const targets: string[] = (() => {
      // Use unit learning outcomes if available, otherwise derive from standards
      const outcomes = (unit.learning_outcomes as string[] | null) ?? [];
      if (outcomes.length > 0) return outcomes.slice(0, 4);
      if (standards.length > 0) {
        return standards.slice(0, 3).map((s) =>
          `I can ${s.description.charAt(0).toLowerCase() + s.description.slice(1)}`
        );
      }
      return [
        "I can identify key ideas and details from the text.",
        "I can cite evidence to support my analysis.",
      ];
    })();

    const overriddenTargets = override(3, targets.join("\n")).split("\n").filter(Boolean);

    slide.addText("By the end of this lesson:", {
      x: 0.5, y: 0.85, w: 12, h: 0.4,
      fontSize: 12, color: C.slate, fontFace: "Calibri", italic: true,
    });

    overriddenTargets.forEach((target, i) => {
      const y = 1.3 + i * 0.85;
      // Checkbox circle
      slide.addShape(pptx.ShapeType.ellipse, {
        x: 0.5, y: y + 0.05, w: 0.35, h: 0.35,
        fill: { color: C.white }, line: { color: C.accent, width: 1.5 },
      });
      // "I can" bold prefix
      slide.addText(target.replace(/^I can /i, ""), {
        x: 1.0, y, w: 11.8, h: 0.75,
        fontSize: 16, color: C.dark, fontFace: "Calibri",
        breakLine: true,
        bullet: false,
      });
      // Bold "I can" inline label
      slide.addText("I can", {
        x: 1.0, y, w: 0.75, h: 0.35,
        fontSize: 16, bold: true, color: C.accent, fontFace: "Calibri",
      });
    });

    if (weekCodes.length > 0) {
      slide.addText(`Standards: ${weekCodes.join(" · ")}`, {
        x: 0.5, y: 5.0, w: 12, h: 0.3,
        fontSize: 10, color: C.slate, fontFace: "Calibri", italic: true,
      });
    }
  }

  // ── Slide 4: Agenda ───────────────────────────────────────────────────────────
  {
    const slide = contentSlide(pptx, "Today's Agenda");

    const agendaItems = override(4, [
      "Do Now (5 min)",
      "Learning Targets (2 min)",
      week.focus ? `Work Time A: ${week.focus} (15 min)` : "Work Time A: Close Reading (15 min)",
      "Work Time B: Analysis & Discussion (10 min)",
      "Closing: Reflect on Targets (3 min)",
      "Exit Ticket (5 min)",
    ].join("\n")).split("\n").filter(Boolean);

    agendaItems.forEach((item, i) => {
      const y = 0.9 + i * 0.65;
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.5, y, w: 0.06, h: 0.45, fill: { color: C.accent }, line: { color: C.accent },
      });
      slide.addText(item, {
        x: 0.75, y, w: 12, h: 0.45,
        fontSize: 15, color: C.dark, fontFace: "Calibri", valign: "middle",
      });
    });
  }

  // ── Slide 5: Key Vocabulary (only if vocab exists) ───────────────────────────
  const vocabulary: string[] = (unit.vocabulary as string[] | null) ?? [];
  if (vocabulary.length > 0) {
    const slide = contentSlide(pptx, "Key Vocabulary", "3 min", C.amber);

    slide.addText("These words will appear in today's lesson. Review them before we begin.", {
      x: 0.5, y: 0.85, w: 12.3, h: 0.4,
      fontSize: 12, color: C.slate, fontFace: "Calibri", italic: true,
    });

    const cols = vocabulary.length <= 4 ? 2 : 3;
    const colW = cols === 2 ? 5.8 : 3.9;
    const colGap = 0.2;

    vocabulary.slice(0, 9).forEach((word, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 0.5 + col * (colW + colGap);
      const y = 1.45 + row * 1.05;

      slide.addShape(pptx.ShapeType.roundRect, {
        x, y, w: colW, h: 0.9,
        fill: { color: C.lightBg }, line: { color: C.border }, rectRadius: 0.07,
      });
      slide.addText(word, {
        x: x + 0.15, y: y + 0.05, w: colW - 0.3, h: 0.45,
        fontSize: 16, bold: true, color: C.accent, fontFace: "Calibri",
      });
      slide.addText("Definition:", {
        x: x + 0.15, y: y + 0.5, w: colW - 0.3, h: 0.3,
        fontSize: 10, color: C.slate, fontFace: "Calibri", italic: true,
      });
    });
  }

  // ── Slide 6: Work Time A ──────────────────────────────────────────────────────
  {
    const activityItems = (week.activities || "")
      .split(/[.;]\s+/).filter((s) => s.trim().length > 3);
    const workAItems = activityItems.slice(0, Math.ceil(activityItems.length / 2));

    const slide = contentSlide(pptx, `Work Time A: ${week.focus || "Close Reading"}`, "15 min");

    // Instructions
    const instructions = override(6,
      workAItems.length > 0
        ? workAItems.join("\n")
        : "Read the assigned passage carefully.\nAnnotate: circle unfamiliar words, underline important phrases.\nRecord the gist in the margin: What is this passage mostly about?"
    );

    instructions.split("\n").filter(Boolean).forEach((step, i) => {
      const y = 0.95 + i * 0.72;
      slide.addShape(pptx.ShapeType.ellipse, {
        x: 0.5, y: y + 0.05, w: 0.38, h: 0.38,
        fill: { color: C.accent }, line: { color: C.accent },
      });
      slide.addText(`${i + 1}`, {
        x: 0.5, y: y + 0.05, w: 0.38, h: 0.38,
        fontSize: 12, bold: true, color: C.white, fontFace: "Calibri", align: "center", valign: "middle",
      });
      slide.addText(step.trim(), {
        x: 1.05, y, w: 11.7, h: 0.65,
        fontSize: 15, color: C.dark, fontFace: "Calibri", valign: "middle",
      });
    });

    if ((unit.anchor_texts as string[] | null)?.length) {
      const texts = (unit.anchor_texts as string[]).slice(0, 2).join(" · ");
      slide.addText(`📖 ${texts}`, {
        x: 0.5, y: 5.0, w: 12.3, h: 0.3,
        fontSize: 11, color: C.slate, fontFace: "Calibri", italic: true,
      });
    }
  }

  // ── Slide 7: Standards ────────────────────────────────────────────────────────
  if (standards.length > 0) {
    const slide = contentSlide(pptx, "Standards We're Working On");

    standards.forEach((std, i) => {
      const strand = std.strand || strandFrom(std.code);
      const bg = STRAND_BG[strand] ?? "F1F5F9";
      const fg = STRAND_FG[strand] ?? C.dark;
      const y = 0.9 + i * 0.9;

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5, y, w: 12.3, h: 0.78,
        fill: { color: bg }, line: { color: bg }, rectRadius: 0.06,
      });
      slide.addText(std.code, {
        x: 0.7, y: y + 0.08, w: 1.2, h: 0.3,
        fontSize: 12, bold: true, color: fg, fontFace: "Courier New",
      });
      slide.addText(std.description, {
        x: 2.0, y: y + 0.04, w: 10.6, h: 0.7,
        fontSize: 13, color: C.dark, fontFace: "Calibri", valign: "middle",
      });
    });
  }

  // ── Slide 8: Work Time B ──────────────────────────────────────────────────────
  {
    const activityItems = (week.activities || "")
      .split(/[.;]\s+/).filter((s) => s.trim().length > 3);
    const workBItems = activityItems.slice(Math.ceil(activityItems.length / 2));

    const slide = contentSlide(pptx, "Work Time B: Analysis & Discussion", "10 min");

    const instructions = override(8,
      workBItems.length > 0
        ? workBItems.join("\n")
        : "With your partner, discuss the guiding questions below.\nBe ready to share one idea with the class.\nUse evidence from the text to support your thinking."
    );

    instructions.split("\n").filter(Boolean).forEach((step, i) => {
      const y = 0.95 + i * 0.72;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5, y: y + 0.07, w: 0.38, h: 0.38,
        fill: { color: C.white }, line: { color: C.accent, width: 1.5 }, rectRadius: 0.04,
      });
      slide.addText(step.trim(), {
        x: 1.05, y, w: 11.7, h: 0.65,
        fontSize: 15, color: C.dark, fontFace: "Calibri", valign: "middle",
      });
    });

    // Sentence starters
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.5, y: 4.4, w: 12.3, h: 0.8,
      fill: { color: C.offWhite }, line: { color: C.border }, rectRadius: 0.06,
    });
    slide.addText("Sentence starters:  \"I noticed...\"   \"The text shows...\"   \"I agree / disagree because...\"", {
      x: 0.7, y: 4.45, w: 12, h: 0.7,
      fontSize: 12, color: C.slate, fontFace: "Calibri", italic: true, valign: "middle",
    });
  }

  // ── Slide 9: Closing — Reflect on Learning Targets ────────────────────────────
  {
    const slide = contentSlide(pptx, "Closing: Reflect on Learning Targets", "3 min", C.green);

    const targets: string[] = (() => {
      const outcomes = (unit.learning_outcomes as string[] | null) ?? [];
      if (outcomes.length > 0) return outcomes.slice(0, 4);
      if (standards.length > 0) {
        return standards.slice(0, 3).map((s) =>
          `I can ${s.description.charAt(0).toLowerCase() + s.description.slice(1)}`
        );
      }
      return ["I can identify key ideas from the text.", "I can cite evidence to support my analysis."];
    })();

    slide.addText("Look back at our targets. How did you do?", {
      x: 0.5, y: 0.85, w: 12, h: 0.4,
      fontSize: 13, color: C.slate, fontFace: "Calibri", italic: true,
    });

    targets.slice(0, 4).forEach((target, i) => {
      const y = 1.35 + i * 0.85;
      // Rating boxes: 1, 2, 3
      [1, 2, 3].forEach((rating, ri) => {
        const rx = 9.8 + ri * 0.7;
        slide.addShape(pptx.ShapeType.roundRect, {
          x: rx, y: y + 0.05, w: 0.55, h: 0.55,
          fill: { color: C.offWhite }, line: { color: C.border }, rectRadius: 0.05,
        });
        slide.addText(`${rating}`, {
          x: rx, y: y + 0.05, w: 0.55, h: 0.55,
          fontSize: 14, bold: true, color: C.slate, fontFace: "Calibri", align: "center", valign: "middle",
        });
      });
      slide.addText(target, {
        x: 0.5, y, w: 9.1, h: 0.7,
        fontSize: 14, color: C.dark, fontFace: "Calibri", valign: "middle",
      });
    });

    slide.addText("1 = Still working on it  ·  2 = Getting there  ·  3 = Got it!", {
      x: 0.5, y: 5.1, w: 12.3, h: 0.3,
      fontSize: 10, color: C.slate, fontFace: "Calibri", italic: true,
    });
  }

  // ── Slide 10: Exit Ticket ─────────────────────────────────────────────────────
  {
    const slide = contentSlide(pptx, "Exit Ticket", "5 min", C.amber);

    const prompt = override(10,
      week.focus
        ? `In 2–3 sentences, explain: ${week.focus}\n\nUse at least one piece of evidence from today's text.`
        : "Write one important idea you learned today.\nWrite one question you still have.\nHow does today's learning connect to the unit's essential question?"
    );

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.5, y: 0.9, w: 12.3, h: 1.4,
      fill: { color: C.lightBg }, line: { color: C.border }, rectRadius: 0.08,
    });
    slide.addText(prompt, {
      x: 0.7, y: 0.95, w: 12, h: 1.3,
      fontSize: 15, color: C.dark, fontFace: "Calibri", breakLine: true, valign: "middle",
    });

    // Response area
    const lines = [2.5, 3.1, 3.7, 4.3];
    lines.forEach((y) => {
      slide.addShape(pptx.ShapeType.line, {
        x: 0.5, y, w: 12.3, h: 0, line: { color: C.border, width: 1 },
      });
    });

    slide.addText("Hand this in before you leave.", {
      x: 0.5, y: 4.85, w: 12.3, h: 0.35,
      fontSize: 12, bold: true, color: C.amber, fontFace: "Calibri", align: "center",
    });
  }

  // ── Slide 11: Homework ────────────────────────────────────────────────────────
  {
    const slide = contentSlide(pptx, "Homework");

    const hw = override(11,
      "Read the next assigned pages and record the gist on a sticky note.\nBring your reading log to next class.\nDue: next lesson."
    );

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.5, y: 0.95, w: 12.3, h: 3.5,
      fill: { color: C.offWhite }, line: { color: C.border }, rectRadius: 0.08,
    });
    slide.addText(hw, {
      x: 0.8, y: 1.1, w: 12, h: 3.2,
      fontSize: 16, color: C.dark, fontFace: "Calibri", breakLine: true,
    });
  }

  // ── Generate and return ────────────────────────────────────────────────────────
  const buffer = await pptx.write({ outputType: "nodebuffer" }) as unknown as ArrayBuffer;
  const filename = `Week-${weekNumber}-${unit.title.replace(/[^a-z0-9]/gi, "-").replace(/-+/g, "-")}.pptx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
