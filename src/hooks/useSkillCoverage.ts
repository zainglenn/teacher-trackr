"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface SkillCoverageLog {
  id: string;
  teacher_id: string;
  class_id: string | null;
  skill_id: string;
  taught_date: string;
  notes: string | null;
}

export function useSkillCoverage(teacherId: string, classId?: string | null) {
  const [logs, setLogs] = useState<SkillCoverageLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    let query = supabase
      .from("skill_coverage")
      .select("*")
      .eq("teacher_id", teacherId);

    if (classId) {
      query = query.eq("class_id", classId);
    }
    // when classId is null/undefined, fetch all rows (all classes) for the union view

    const { data } = await query;
    setLogs(data ?? []);
    setLoading(false);
  }, [teacherId, classId]);

  useEffect(() => { fetch(); }, [fetch]);

  async function markSkill(skillId: string, taughtDate: string, notes?: string) {
    const existing = logs.find((l) => l.skill_id === skillId && l.class_id === (classId ?? null));
    let result;
    if (existing) {
      const { data } = await supabase
        .from("skill_coverage")
        .update({ taught_date: taughtDate, notes: notes ?? null })
        .eq("id", existing.id)
        .select()
        .single();
      result = data;
    } else {
      const { data } = await supabase
        .from("skill_coverage")
        .insert({
          teacher_id: teacherId,
          class_id: classId ?? null,
          skill_id: skillId,
          taught_date: taughtDate,
          notes: notes ?? null,
        })
        .select()
        .single();
      result = data;
    }
    if (result) {
      setLogs((prev) => {
        const idx = prev.findIndex((l) => l.skill_id === skillId);
        if (idx >= 0) { const next = [...prev]; next[idx] = result; return next; }
        return [...prev, result];
      });
    }
  }

  async function unmarkSkill(skillId: string) {
    let query = supabase
      .from("skill_coverage")
      .delete()
      .eq("teacher_id", teacherId)
      .eq("skill_id", skillId);

    if (classId) {
      query = query.eq("class_id", classId);
    } else {
      query = query.is("class_id", null);
    }

    await query;
    setLogs((prev) => prev.filter((l) => !(l.skill_id === skillId && l.class_id === (classId ?? null))));
  }

  const coveredSkillIds = new Set(logs.map((l) => l.skill_id));

  function isCovered(skillId: string) {
    return coveredSkillIds.has(skillId);
  }

  return { logs, loading, markSkill, unmarkSkill, coveredSkillIds, isCovered };
}
