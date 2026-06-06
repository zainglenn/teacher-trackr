"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { BenchmarkSnapshot } from "@/types";

export function useBenchmarkSnapshots(
  schoolId: string | null,
  subjectId: string | null,
  gradeLevelId: string | null,
  hodId: string | null
) {
  const [snapshots, setSnapshots] = useState<BenchmarkSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId || !subjectId || !gradeLevelId) {
      setSnapshots([]); setLoading(false); return;
    }
    const { data } = await supabase
      .from("benchmark_snapshots")
      .select("*")
      .eq("school_id", schoolId)
      .eq("subject_id", subjectId)
      .eq("grade_level_id", gradeLevelId)
      .order("snapshot_date", { ascending: true });
    setSnapshots((data as BenchmarkSnapshot[]) ?? []);
    setLoading(false);
  }, [schoolId, subjectId, gradeLevelId]);

  useEffect(() => { load(); }, [load]);

  async function takeSnapshot(strandAverages: Record<string, number>) {
    if (!schoolId || !subjectId || !gradeLevelId || !hodId) return;
    setSaving(true);
    const { data } = await supabase
      .from("benchmark_snapshots")
      .insert({
        hod_id: hodId,
        school_id: schoolId,
        subject_id: subjectId,
        grade_level_id: gradeLevelId,
        strand_averages: strandAverages,
        snapshot_date: new Date().toISOString().split("T")[0],
      })
      .select()
      .single();
    if (data) setSnapshots((prev) => [...prev, data as BenchmarkSnapshot].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date)));
    setSaving(false);
  }

  return { snapshots, loading, saving, takeSnapshot };
}
