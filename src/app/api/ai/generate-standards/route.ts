import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requireAdmin } from "@/lib/adminClient";

interface GeneratedStandard {
  code: string;
  strand: string;
  description: string;
}

interface GenerateResponse {
  setName: string;
  standards: GeneratedStandard[];
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const admin = makeAdminClient();
  const auth = await requireAdmin(req, admin);
  if (auth instanceof NextResponse) return auth;

  const { subject_name, grade_level_name } = await req.json() as {
    subject_name: string;
    grade_level_name: string;
  };

  if (!subject_name?.trim() || !grade_level_name?.trim()) {
    return NextResponse.json({ error: "subject_name and grade_level_name are required" }, { status: 400 });
  }

  // Get school curriculum
  const { data: profile } = await admin.from("profiles").select("school_id").eq("id", auth.callerId).single();
  const { data: school } = profile?.school_id
    ? await admin.from("schools").select("name, curriculum").eq("id", profile.school_id).single()
    : { data: null };

  const curriculum = school?.curriculum ?? "American";
  const schoolName = school?.name ?? "the school";

  const prompt = `You are a curriculum expert helping ${schoolName} build a standards framework.

School curriculum: ${curriculum}
Subject: ${subject_name}
Grade level: ${grade_level_name}

Task: Generate a comprehensive set of learning standards for ${subject_name} at ${grade_level_name} level, aligned to the ${curriculum} curriculum.

Guidelines:
- Generate between 8 and 20 standards appropriate for this subject and grade level
- Organise standards into logical strands (e.g. for ELA: Reading Literature, Reading Informational Text, Writing, Speaking & Listening, Language; for Maths: Number, Algebra, Geometry, Measurement, Statistics; adapt strands to suit the subject)
- Each standard code should follow a sensible convention (e.g. ELA.6.R.1, MATH.6.NS.1, SCI.6.LS.1)
- Descriptions should be clear, measurable learning outcomes (1–2 sentences)
- Suggest a concise standard set name (e.g. "NYSED Grade 6 ELA", "Common Core Grade 6 Math")

Return ONLY valid JSON in this exact format:
{
  "setName": "...",
  "standards": [
    { "code": "...", "strand": "...", "description": "..." }
  ]
}`;

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 3000,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `AI error: ${err}` }, { status: 500 });
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "{}";

  try {
    const parsed = JSON.parse(content) as { setName: string; standards: GeneratedStandard[] };
    if (!parsed.setName || !Array.isArray(parsed.standards)) {
      return NextResponse.json({ error: "Unexpected AI response format" }, { status: 500 });
    }
    return NextResponse.json({ setName: parsed.setName, standards: parsed.standards } satisfies GenerateResponse);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }
}
