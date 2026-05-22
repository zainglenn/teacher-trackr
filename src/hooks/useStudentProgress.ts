"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { StudentProgress, Attainment } from "@/types";

export function useStudentProgress(studentId: string | null) {
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!studentId) { setLoading(false); return; }
    const { data } = await supabase
      .from("student_progress")
      .select("*")
      .eq("student_id", studentId);
    setProgress(data ?? []);
    setLoading(false);
  }, [studentId]);

  useEffect(() => { fetch(); }, [fetch]);

  async function upsertProgress(standardId: string, attainment: Attainment, notes?: string) {
    if (!studentId) return;
    const { data } = await supabase
      .from("student_progress")
      .upsert(
        { student_id: studentId, standard_id: standardId, attainment, notes: notes ?? null, assessed_date: new Date().toISOString().split("T")[0], updated_at: new Date().toISOString() },
        { onConflict: "student_id,standard_id" }
      )
      .select()
      .single();
    if (data) {
      setProgress((prev) => {
        const existing = prev.findIndex((p) => p.standard_id === standardId);
        if (existing >= 0) { const next = [...prev]; next[existing] = data; return next; }
        return [...prev, data];
      });
    }
  }

  function getAttainment(standardId: string): Attainment {
    return progress.find((p) => p.standard_id === standardId)?.attainment ?? "not_assessed";
  }

  return { progress, loading, upsertProgress, getAttainment };
}
