"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Attainment } from "@/types";

export type AttainmentCounts = Record<Attainment, number>;

export function useClassProgress(teacherId: string) {
  const [progress, setProgress] = useState<Map<string, AttainmentCounts>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("student_progress")
      .select("standard_id, attainment, student:students!inner(teacher_id)")
      .eq("student.teacher_id", teacherId);

    const map = new Map<string, AttainmentCounts>();
    (data ?? []).forEach((row: { standard_id: string; attainment: Attainment }) => {
      if (!map.has(row.standard_id)) {
        map.set(row.standard_id, { not_assessed: 0, below: 0, approaching: 0, meeting: 0, exceeding: 0 });
      }
      map.get(row.standard_id)![row.attainment]++;
    });

    setProgress(map);
    setLoading(false);
  }, [teacherId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { progress, loading };
}
