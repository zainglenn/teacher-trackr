import { NextRequest, NextResponse } from "next/server";
import { Standard } from "@/types";

interface DraftUnit {
  term: number;
  unit_number: number;
  title: string;
  big_idea: string;
  duration_weeks: number;
  assessment_type: "formative" | "summative" | "both";
  sort_order: number;
  standardCodes: string[];
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const { unitCount = 9, allStandards } = await req.json() as { unitCount: number; allStandards: Standard[] };

  const standardsList = allStandards
    .map((s) => `${s.code} (${s.strand}): ${s.description}`)
    .join("\n");

  const unitsPerTerm = Math.ceil(unitCount / 3);
  const term1Count = unitsPerTerm;
  const term2Count = unitsPerTerm;
  const term3Count = unitCount - term1Count - term2Count;

  const prompt = `You are a Grade 6 ELA curriculum expert helping a teacher at Dubai Schools Al Khawaneej design a year-long Long Term Plan (LTP).

Available NYSED Grade 6 ELA standards (${allStandards.length} total):
${standardsList}

Task: Generate a complete Long Term Plan with exactly ${unitCount} units spread across 3 terms (Term 1: ${term1Count} units, Term 2: ${term2Count} units, Term 3: ${term3Count} units).

Rules:
1. Every standard must appear in at least one unit. No standard may be left out.
2. No standard should appear in more than 2 units (unless it's a core anchor standard like RL.6.1 or W.6.4).
3. Cluster standards thematically:
   - Narrative units → RL + W.6.3 (narrative writing) + relevant L standards
   - Argument units → RI + W.6.1 (argument writing) + SL.6.3-4 + relevant L standards
   - Informational units → RI + W.6.2 (informational writing) + SL.6.4-5 + relevant L standards
   - Research/synthesis units → RI + W.6.7-9 + SL standards
4. Progress across the year: start with foundational reading and writing skills, move toward more complex research and synthesis by Term 3.
5. Each unit should have 4–8 standards (enough to be meaningful, not so many it's unachievable).
6. duration_weeks should total approximately 36 weeks across all units.
7. Vary assessment_type: use "summative" for end-of-unit assessments, "formative" for shorter units or skills work, "both" for longer units.

Return ONLY valid JSON in this exact format:
{
  "units": [
    {
      "term": 1,
      "unit_number": 1,
      "title": "Identity & Narrative",
      "big_idea": "How do stories reveal who we are?",
      "duration_weeks": 4,
      "assessment_type": "summative",
      "sort_order": 0,
      "standardCodes": ["RL.6.1", "RL.6.3", "W.6.3", "W.6.4", "L.6.1", "L.6.2"]
    }
  ]
}`;

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 4000,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `DeepSeek error: ${err}` }, { status: 500 });
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "{}";

  try {
    const raw = JSON.parse(content) as { units: DraftUnit[] };
    // Validate and enrich with standard IDs
    const standardMap = new Map(allStandards.map((s) => [s.code, s.id]));
    const units = raw.units.map((u, i) => ({
      ...u,
      sort_order: i,
      standardIds: u.standardCodes.filter((c) => standardMap.has(c)).map((c) => standardMap.get(c) as string),
    }));
    return NextResponse.json({ units });
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }
}
