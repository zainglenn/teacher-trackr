"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface SkillCoverageLog {
  id: string;
  teacher_id: string;
  skill_id: string;
  taught_date: string;
  notes: string | null;
}

export function useSkillCoverage(teacherId: string) {
  const [logs, setLogs] = useState<SkillCoverageLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from("skill_coverage")
      .select("*")
      .eq("teacher_id", teacherId);
    setLogs(data ?? []);
    setLoading(false);
  }, [teacherId]);

  useEffect(() => { fetch(); }, [fetch]);

  async function markSkill(skillId: string, taughtDate: string, notes?: string) {
    const { data } = await supabase
      .from("skill_coverage")
      .upsert(
        { teacher_id: teacherId, skill_id: skillId, taught_date: taughtDate, notes: notes ?? null },
        { onConflict: "teacher_id,skill_id" }
      )
      .select()
      .single();
    if (data) {
      setLogs((prev) => {
        const idx = prev.findIndex((l) => l.skill_id === skillId);
        if (idx >= 0) { const next = [...prev]; next[idx] = data; return next; }
        return [...prev, data];
      });
    }
  }

  async function unmarkSkill(skillId: string) {
    await supabase
      .from("skill_coverage")
      .delete()
      .eq("teacher_id", teacherId)
      .eq("skill_id", skillId);
    setLogs((prev) => prev.filter((l) => l.skill_id !== skillId));
  }

  const coveredSkillIds = new Set(logs.map((l) => l.skill_id));

  function isCovered(skillId: string) {
    return coveredSkillIds.has(skillId);
  }

  return { logs, loading, markSkill, unmarkSkill, coveredSkillIds, isCovered };
}
