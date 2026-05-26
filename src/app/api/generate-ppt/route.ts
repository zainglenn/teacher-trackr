import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import PptxGenJS from "pptxgenjs";

const STRAND_COLORS: Record<string, string> = {
  RL: "DBEAFE", // blue-100
  RI: "EDE9FE", // violet-100
  W:  "FEF3C7", // amber-100
  SL: "D1FAE5", // emerald-100
  L:  "FFE4E6", // rose-100
};

const STRAND_TEXT: Record<string, string> = {
  RL: "1E40AF",
  RI: "5B21B6",
  W:  "92400E",
  SL: "065F46",
  L:  "9F1239",
};

function strandFromCode(code: string) { return code.split(".")[0]; }

export async function POST(req: NextRequest) {
  const { unitId, weekNumber, classId, overrides } = await req.json() as {
    unitId: string;
    weekNumber: number;
    classId?: string;
    overrides?: Record<number, { title?: string; content?: string }>;
  };

  if (!unitId || weekNumber == null) {
    return NextResponse.json({ error: "unitId and weekNumber are required" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch unit data
  const { data: unit, error } = await supabase
    .from("ltp_units")
    .select("id, title, term, lesson_sequence, vocabulary, assessment_plan")
    .eq("id", unitId)
    .single();

  if (error || !unit) {
    return NextResponse.json({ error: "Unit not found" }, { status: 404 });
  }

  // Fetch class name
  let className = "";
  if (classId) {
    const { data: cls } = await supabase.from("classes").select("name").eq("id", classId).single();
    className = cls?.name ?? "";
  }

  const lessonSequence: { week: number; focus: string; activities: string; standards: string[] }[] =
    unit.lesson_sequence ?? [];
  const week = lessonSequence.find((w) => w.week === weekNumber);

  if (!week) {
    return NextResponse.json({ error: "Lesson week not found in unit" }, { status: 404 });
  }

  // Fetch standard descriptions
  const standardCodes = week.standards ?? [];
  let standardDetails: { code: string; description: string; strand: string }[] = [];
  if (standardCodes.length > 0) {
    const { data: standards } = await supabase
      .from("standards")
      .select("code, description, strand")
      .in("code", standardCodes);
    standardDetails = (standards ?? []) as typeof standardDetails;
  }

  // Build presentation
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Curriculum Tracker";
  pptx.subject = unit.title;

  // Theme colours
  const DARK = "1E293B";
  const MID = "64748B";
  const LIGHT = "F1F5F9";
  const ACCENT = "3B82F6";

  function applyOverride(slideIndex: number, content: string): string {
    return overrides?.[slideIndex]?.content ?? content;
  }

  // ── Slide 1: Title ────────────────────────────────────────────────────────
  {
    const slide = pptx.addSlide();
    slide.background = { fill: DARK };
    slide.addText(applyOverride(1, unit.title), {
      x: 0.5, y: 1.2, w: 8.5, h: 1.2,
      fontSize: 36, bold: true, color: "FFFFFF",
      fontFace: "Calibri",
    });
    slide.addText(
      applyOverride(1, `Week ${week.week} • ${className ? `Class ${className} • ` : ""}Term ${unit.term}`),
      { x: 0.5, y: 2.6, w: 8.5, h: 0.4, fontSize: 14, color: "94A3B8", fontFace: "Calibri" }
    );
    if (week.focus) {
      slide.addText(applyOverride(1, week.focus), {
        x: 0.5, y: 3.2, w: 8.5, h: 0.6,
        fontSize: 18, color: "CBD5E1", italic: true, fontFace: "Calibri",
      });
    }
  }

  // ── Slide 2: Learning Objectives ──────────────────────────────────────────
  {
    const slide = pptx.addSlide();
    slide.background = { fill: "FFFFFF" };
    slide.addText(applyOverride(2, "Learning Objectives"), {
      x: 0.5, y: 0.3, w: 8.5, h: 0.55,
      fontSize: 22, bold: true, color: DARK, fontFace: "Calibri",
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 0.5, y: 0.9, w: 8.5, h: 0, line: { color: ACCENT, width: 2 },
    });

    const objectives = applyOverride(2, week.focus || "Students will explore key concepts and skills.").split(/[.;]\s+/).filter(Boolean);
    objectives.forEach((obj, i) => {
      slide.addText(`• ${obj.trim()}`, {
        x: 0.6, y: 1.1 + i * 0.55, w: 8.4, h: 0.5,
        fontSize: 16, color: DARK, fontFace: "Calibri",
      });
    });
  }

  // ── Slide 3: Standards ────────────────────────────────────────────────────
  if (standardDetails.length > 0) {
    const slide = pptx.addSlide();
    slide.background = { fill: "FFFFFF" };
    slide.addText("Standards", {
      x: 0.5, y: 0.3, w: 8.5, h: 0.55,
      fontSize: 22, bold: true, color: DARK, fontFace: "Calibri",
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 0.5, y: 0.9, w: 8.5, h: 0, line: { color: ACCENT, width: 2 },
    });

    standardDetails.forEach((std, i) => {
      const strand = std.strand || strandFromCode(std.code);
      const bg = STRAND_COLORS[strand] ?? "F1F5F9";
      const fg = STRAND_TEXT[strand] ?? "1E293B";
      const y = 1.1 + i * 0.75;

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5, y, w: 8.5, h: 0.65,
        fill: { color: bg },
        line: { color: bg },
        rectRadius: 0.05,
      });
      slide.addText(std.code, {
        x: 0.7, y: y + 0.05, w: 1.0, h: 0.3,
        fontSize: 11, bold: true, color: fg, fontFace: "Courier New",
      });
      slide.addText(std.description, {
        x: 1.8, y: y + 0.05, w: 7.0, h: 0.55,
        fontSize: 12, color: DARK, fontFace: "Calibri",
      });
    });
  }

  // ── Slide 4: Activities ───────────────────────────────────────────────────
  {
    const slide = pptx.addSlide();
    slide.background = { fill: "FFFFFF" };
    slide.addText("Activities", {
      x: 0.5, y: 0.3, w: 8.5, h: 0.55,
      fontSize: 22, bold: true, color: DARK, fontFace: "Calibri",
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 0.5, y: 0.9, w: 8.5, h: 0, line: { color: ACCENT, width: 2 },
    });

    const activities = applyOverride(4, week.activities || "See unit plan for detailed activities.");
    const items = activities.split(/[.;]\s+/).filter(Boolean);
    items.forEach((act, i) => {
      slide.addText(`${i + 1}. ${act.trim()}`, {
        x: 0.6, y: 1.1 + i * 0.6, w: 8.4, h: 0.55,
        fontSize: 15, color: DARK, fontFace: "Calibri",
      });
    });
  }

  // ── Slide 5: Vocabulary ───────────────────────────────────────────────────
  const vocabulary: string[] = unit.vocabulary ?? [];
  if (vocabulary.length > 0) {
    const slide = pptx.addSlide();
    slide.background = { fill: LIGHT };
    slide.addText("Key Vocabulary", {
      x: 0.5, y: 0.3, w: 8.5, h: 0.55,
      fontSize: 22, bold: true, color: DARK, fontFace: "Calibri",
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 0.5, y: 0.9, w: 8.5, h: 0, line: { color: ACCENT, width: 2 },
    });

    const cols = 3;
    const colW = 2.8;
    vocabulary.slice(0, 12).forEach((word, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5 + col * (colW + 0.1), y: 1.1 + row * 0.65, w: colW, h: 0.55,
        fill: { color: "FFFFFF" },
        line: { color: "E2E8F0" },
        rectRadius: 0.06,
      });
      slide.addText(applyOverride(5, word), {
        x: 0.5 + col * (colW + 0.1), y: 1.1 + row * 0.65, w: colW, h: 0.55,
        fontSize: 14, bold: true, color: DARK, align: "center", fontFace: "Calibri",
      });
    });
  }

  // ── Slide 6: Exit Ticket ──────────────────────────────────────────────────
  {
    const slide = pptx.addSlide();
    slide.background = { fill: DARK };
    slide.addText("Exit Ticket", {
      x: 0.5, y: 0.5, w: 8.5, h: 0.6,
      fontSize: 22, bold: true, color: "FFFFFF", fontFace: "Calibri",
    });
    slide.addText(
      applyOverride(6, "What is one thing you learned today?\nWhat is one question you still have?"),
      {
        x: 0.5, y: 1.4, w: 8.5, h: 2.5,
        fontSize: 18, color: "CBD5E1", fontFace: "Calibri",
        breakLine: true,
      }
    );
  }

  // Generate buffer and return
  const buffer = await pptx.write({ outputType: "nodebuffer" }) as unknown as ArrayBuffer;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="Week-${weekNumber}-${unit.title.replace(/\s+/g, "-")}.pptx"`,
    },
  });
}
