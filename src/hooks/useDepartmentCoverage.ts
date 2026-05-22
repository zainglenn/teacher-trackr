"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useDepartmentCoverage(teacherIdFilter?: string | null) {
  const [coveredSkillIds, setCoveredSkillIds] = useState<Set<string>>(new Set());
  const [coverageByTeacher, setCoverageByTeacher] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      let query = supabase.from("skill_coverage").select("skill_id, teacher_id");
      if (teacherIdFilter) query = query.eq("teacher_id", teacherIdFilter);

      const { data } = await query;
      const rows = (data ?? []) as { skill_id: string; teacher_id: string }[];

      const byTeacher = new Map<string, Set<string>>();
      const allIds = new Set<string>();
      for (const row of rows) {
        allIds.add(row.skill_id);
        if (!byTeacher.has(row.teacher_id)) byTeacher.set(row.teacher_id, new Set());
        byTeacher.get(row.teacher_id)!.add(row.skill_id);
      }

      setCoveredSkillIds(allIds);
      setCoverageByTeacher(byTeacher);
      setLoading(false);
    }
    fetch();
  }, [teacherIdFilter]);

  return { coveredSkillIds, coverageByTeacher, loading };
}
