import { NextRequest, NextResponse } from "next/server";

interface SuggestedStandard {
  code: string;
  standardId: string;
  reason: string;
}

interface SuggestResponse {
  suggestions: SuggestedStandard[];
  coverageNote: string;
}

interface Allocation {
  unitId: string;
  unitTitle: string;
  suggestions: SuggestedStandard[];
}

interface FillGapsResponse {
  allocations: Allocation[];
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const body = await req.json();
  const { unitTitle, bigIdea, term, selectedStandardCodes, allStandards, uncoveredCodes, mode, existingUnits } = body;

  const standardsList = allStandards
    .map((s: { code: string; strand: string; description: string }) => `${s.code} (${s.strand}): ${s.description}`)
    .join("\n");

  // Fill-gaps mode: distribute unmapped standards across existing units
  if (mode === "fill-gaps" && existingUnits?.length > 0) {
    const unitsList = existingUnits
      .map((u: { id: string; title: string; term: number; currentCodes: string[] }) =>
        `- id: "${u.id}" | title: "${u.title}" (Term ${u.term}): currently covers [${u.currentCodes.join(", ")}]`)
      .join("\n");

    const prompt = `You are a Grade 6 ELA curriculum expert. A teacher has unmapped standards that need to be distributed across their existing Long Term Plan units.

Unmapped standards to distribute: ${uncoveredCodes.join(", ")}

Existing units (use the exact id value in your response):
${unitsList}

All available standards for reference:
${standardsList}

Task: Distribute the unmapped standards across the existing units in the most thematically sensible way. Each unmapped standard should go to exactly one unit. Prioritise thematic fit — for example, narrative writing standards go to narrative units, language standards can be spread across units where they fit naturally.

Return ONLY valid JSON. The unitId field MUST be the exact id value from the unit list above (a UUID), not the title:
{
  "allocations": [
    {
      "unitId": "<exact id UUID from the unit list>",
      "suggestions": [
        { "code": "RL.6.2", "reason": "Theme and central idea fits the narrative analysis focus of this unit." }
      ]
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
        max_tokens: 2000,
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
      const raw = JSON.parse(content) as { allocations: { unitId: string; suggestions: { code: string; reason: string }[] }[] };
      const standardMap = new Map(allStandards.map((s: { code: string; id: string }) => [s.code, s.id]));
      const unitMap = new Map(existingUnits.map((u: { id: string; title: string }) => [u.id, u.title]));

      const allocations: Allocation[] = raw.allocations
        .map((a) => ({
          unitId: a.unitId,
          unitTitle: (unitMap.get(a.unitId) as string) ?? "Unknown Unit",
          suggestions: a.suggestions
            .filter((s) => standardMap.has(s.code))
            .map((s) => ({ code: s.code, standardId: standardMap.get(s.code) as string, reason: s.reason })),
        }))
        .filter((a) => a.suggestions.length > 0);

      return NextResponse.json({ allocations } satisfies FillGapsResponse);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }
  }

  // Default mode: suggest additional standards for a unit
  const prompt = `You are a Grade 6 ELA curriculum expert helping a teacher at Dubai Schools Al Khawaneej build a Long Term Plan (LTP) for the academic year.

The teacher is planning Unit ${unitTitle ? `"${unitTitle}"` : "(untitled)"} in Term ${term}.
${bigIdea ? `Big idea / theme: "${bigIdea}"` : ""}
${selectedStandardCodes?.length ? `Already selected standards: ${selectedStandardCodes.join(", ")}` : "No standards selected yet."}
${uncoveredCodes?.length ? `Standards not yet covered in any unit this year: ${uncoveredCodes.join(", ")}` : ""}

Here are all available NYSED Grade 6 ELA standards:
${standardsList}

Task:
1. Suggest 3–6 additional standards that would pair well with this unit's theme and already-selected standards. Focus on natural thematic clusters (e.g. a narrative unit should pair RL reading standards with W.6.3 narrative writing). Prioritise uncovered standards where possible.
2. For each suggestion, give a clear 1-sentence reason a teacher would find useful.
3. Provide a brief coverage note (1–2 sentences) about which strands are well-represented vs underrepresented in this unit.

Respond ONLY with valid JSON in this exact format:
{
  "suggestions": [
    { "code": "RL.6.3", "reason": "Analysing character development pairs naturally with narrative writing." }
  ],
  "coverageNote": "This unit is strong on Reading Literature and Writing. Consider adding a Speaking & Listening standard for discussion activities."
}`;

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 1000,
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `DeepSeek error: ${err}` }, { status: 500 });
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "{}";

  let parsed: SuggestResponse;
  try {
    const raw = JSON.parse(content) as { suggestions: { code: string; reason: string }[]; coverageNote: string };
    const standardMap = new Map(allStandards.map((s: { code: string; id: string }) => [s.code, s.id]));
    parsed = {
      suggestions: raw.suggestions
        .filter((s) => standardMap.has(s.code))
        .map((s) => ({ code: s.code, standardId: standardMap.get(s.code) as string, reason: s.reason })),
      coverageNote: raw.coverageNote ?? "",
    };
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  return NextResponse.json(parsed);
}
