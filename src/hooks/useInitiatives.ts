"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Initiative, InitiativeParticipant, InitiativeProgress } from "@/types";

export function useInitiatives(schoolId: string | null, userId: string) {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!schoolId) { setInitiatives([]); setLoading(false); return; }
    const { data } = await supabase
      .from("initiatives")
      .select("*, participants:initiative_participants(*), progress:initiative_progress(*)")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });
    setInitiatives((data ?? []) as Initiative[]);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { load(); }, [load]);

  async function createInitiative(data: {
    name: string;
    description?: string;
    subject_ids: string[];
    grade_level_ids: string[];
    metric_label?: string;
    start_date?: string;
  }) {
    if (!schoolId) return;
    const { data: row } = await supabase
      .from("initiatives")
      .insert({ ...data, owner_id: userId, school_id: schoolId, status: "active" })
      .select("*, participants:initiative_participants(*), progress:initiative_progress(*)")
      .single();
    if (row) setInitiatives((prev) => [row as Initiative, ...prev]);
  }

  async function joinInitiative(initiativeId: string, classId?: string) {
    const { data: row } = await supabase
      .from("initiative_participants")
      .insert({ initiative_id: initiativeId, teacher_id: userId, class_id: classId ?? null })
      .select("*").single();
    if (row) {
      setInitiatives((prev) => prev.map((i) =>
        i.id === initiativeId
          ? { ...i, participants: [...(i.participants ?? []), row as InitiativeParticipant] }
          : i
      ));
    }
  }

  async function leaveInitiative(initiativeId: string) {
    await supabase.from("initiative_participants").delete().eq("initiative_id", initiativeId).eq("teacher_id", userId);
    setInitiatives((prev) => prev.map((i) =>
      i.id === initiativeId
        ? { ...i, participants: (i.participants ?? []).filter((p) => p.teacher_id !== userId) }
        : i
    ));
  }

  async function addProgressEntry(initiativeId: string, metricValue: number, notes?: string) {
    const { data: row } = await supabase
      .from("initiative_progress")
      .insert({ initiative_id: initiativeId, recorded_by: userId, metric_value: metricValue, notes: notes ?? null })
      .select("*").single();
    if (row) {
      setInitiatives((prev) => prev.map((i) =>
        i.id === initiativeId
          ? { ...i, progress: [...(i.progress ?? []), row as InitiativeProgress] }
          : i
      ));
    }
  }

  async function completeInitiative(id: string) {
    await supabase.from("initiatives").update({ status: "completed" }).eq("id", id);
    setInitiatives((prev) => prev.map((i) => i.id === id ? { ...i, status: "completed" } : i));
  }

  return { initiatives, loading, createInitiative, joinInitiative, leaveInitiative, addProgressEntry, completeInitiative };
}
