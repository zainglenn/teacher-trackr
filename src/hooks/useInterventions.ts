"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Intervention, InterventionStatus } from "@/types";

export function useInterventions(schoolId: string | null, teacherId: string, isHod: boolean) {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!schoolId) { setInterventions([]); setLoading(false); return; }
    let query = supabase.from("interventions").select("*").eq("school_id", schoolId).order("created_at", { ascending: false });
    if (!isHod) query = query.eq("teacher_id", teacherId);

    const { data } = await query;
    const rows = (data ?? []) as Intervention[];

    // Enrich with student names if possible (best-effort)
    const allStudentIds = [...new Set(rows.flatMap((r) => r.student_ids))];
    if (allStudentIds.length > 0) {
      const { data: students } = await supabase.from("students").select("id, full_name").in("id", allStudentIds);
      const nameMap = new Map((students ?? []).map((s) => [s.id as string, s.full_name as string]));
      setInterventions(rows.map((r) => ({ ...r, student_names: r.student_ids.map((id) => nameMap.get(id) ?? id) })));
    } else {
      setInterventions(rows);
    }
    setLoading(false);
  }, [schoolId, teacherId, isHod]);

  useEffect(() => { load(); }, [load]);

  async function createIntervention(data: {
    strand_codes: string[];
    student_ids: string[];
    strategy: string;
    start_date: string;
  }) {
    if (!schoolId) return;
    const { data: row } = await supabase
      .from("interventions")
      .insert({ ...data, teacher_id: teacherId, school_id: schoolId, status: "active" })
      .select("*").single();
    if (row) setInterventions((prev) => [row as Intervention, ...prev]);
  }

  async function updateIntervention(id: string, updates: Partial<Pick<Intervention, "outcome_notes" | "status" | "end_date">>) {
    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
      ...(updates.status === "concluded" && !updates.end_date ? { end_date: new Date().toISOString().split("T")[0] } : {}),
    };
    const { data: row } = await supabase.from("interventions").update(payload).eq("id", id).select("*").single();
    if (row) setInterventions((prev) => prev.map((i) => i.id === id ? { ...i, ...(row as Intervention) } : i));
  }

  async function concludeIntervention(id: string, outcomeNotes: string) {
    await updateIntervention(id, { status: "concluded", outcome_notes: outcomeNotes, end_date: new Date().toISOString().split("T")[0] });
  }

  return { interventions, loading, createIntervention, updateIntervention, concludeIntervention };
}
