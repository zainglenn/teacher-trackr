import { NextRequest, NextResponse } from "next/server";
import { AssessmentRow, LessonWeek } from "@/types";

interface DraftUnitContentRequest {
  unitTitle: string;
  bigIdea: string;
  term: number;
  durationWeeks: number;
  assessmentType: "formative" | "summative" | "both";
  standards: { code: string; strand: string; description: string }[];
}

interface DraftUnitContentResponse {
  big_ideas: string[];
  enduring_understandings: string[];
  real_world_connections: string;
  learning_outcomes: string[];
  success_criteria: string[];
  assessment_plan: AssessmentRow[];
  lesson_sequence: LessonWeek[];
  anchor_texts: string[];
  mentor_texts: string[];
  multimedia: string[];
  vocabulary: string[];
  diff_ell: string[];
  diff_intervention: string[];
  diff_enrichment: string[];
  diff_accessibility: string[];
  final_product: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const body = (await req.json()) as DraftUnitContentRequest;
  const { unitTitle, bigIdea, term, durationWeeks, assessmentType, standards } = body;

  const standardsList = standards
    .map((s) => `${s.code} (${s.strand}): ${s.description}`)
    .join("\n");

  const prompt = `You are an expert Grade 6 ELA curriculum designer at Dubai Schools Al Khawaneej. Generate a complete, high-quality unit plan content for the following unit:

Unit Title: "${unitTitle}"
Essential Question: "${bigIdea || "Not set"}"
Term: ${term}
Duration: ${durationWeeks} weeks
Assessment Type: ${assessmentType}

Standards covered in this unit:
${standardsList || "No standards mapped yet — generate general Grade 6 ELA content"}

Generate realistic, classroom-ready content. Use the actual standard codes in the lesson sequence.

Return ONLY valid JSON with this exact structure:
{
  "big_ideas": ["3 big ideas as concise sentences"],
  "enduring_understandings": ["3-4 enduring understandings students will retain"],
  "real_world_connections": "1-2 sentences about real-world relevance",
  "learning_outcomes": ["5-7 specific I-can statements (write WITHOUT the 'I can' prefix — just the action, e.g. 'analyze how characters develop')"],
  "success_criteria": ["4-6 measurable success criteria"],
  "assessment_plan": [
    { "id": "1", "type": "Diagnostic", "when": "Week 1", "assessment": "assessment name", "purpose": "gauge prior knowledge", "tool": "tool name" },
    { "id": "2", "type": "Formative", "when": "Ongoing", "assessment": "exit tickets and drafts", "purpose": "monitor progress", "tool": "checklist" },
    { "id": "3", "type": "Checkpoint", "when": "Week X", "assessment": "specific task", "purpose": "assess understanding", "tool": "rubric" },
    { "id": "4", "type": "Summative", "when": "Week ${durationWeeks}", "assessment": "final task name", "purpose": "evaluate learning", "tool": "analytic rubric" }
  ],
  "lesson_sequence": [
    { "week": 1, "focus": "brief focus", "activities": "2-3 key activities", "standards": ["RL.6.X", "W.6.X"] }
  ],
  "anchor_texts": ["2-3 full book/text titles with authors"],
  "mentor_texts": ["2-3 text types or specific examples"],
  "multimedia": ["2-3 specific resources: video clips, podcasts, etc."],
  "vocabulary": ["8-10 key academic vocabulary words"],
  "diff_ell": ["3-4 specific ELL support strategies"],
  "diff_intervention": ["3-4 intervention strategies for struggling learners"],
  "diff_enrichment": ["3-4 enrichment options for advanced learners"],
  "diff_accessibility": ["3-4 accessibility accommodations"],
  "final_product": "1-2 sentence description of the summative final product with length/format expectations"
}

Important:
- lesson_sequence must have exactly ${durationWeeks} entries (one per week)
- Use the actual standard codes provided above in the lesson_sequence standards arrays
- All content must be appropriate for Grade 6 students in Dubai (international context)
- Be specific and practical, not generic`;

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 3000,
      temperature: 0.5,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `DeepSeek error: ${err}` }, { status: 500 });
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "{}";

  try {
    const raw = JSON.parse(content) as DraftUnitContentResponse;
    // Ensure IDs exist on assessment rows
    if (raw.assessment_plan) {
      raw.assessment_plan = raw.assessment_plan.map((r, i) => ({
        ...r,
        id: r.id ?? String(i + 1),
      }));
    }
    return NextResponse.json(raw);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }
}
