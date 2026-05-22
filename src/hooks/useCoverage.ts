"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { CoverageLog } from "@/types";

export function useCoverage(teacherId: string) {
  const [logs, setLogs] = useState<CoverageLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from("coverage_logs")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("taught_date", { ascending: false });
    setLogs(data ?? []);
    setLoading(false);
  }, [teacherId]);

  useEffect(() => { fetch(); }, [fetch]);

  async function markTaught(standardId: string, taughtDate: string, notes?: string) {
    const { data } = await supabase
      .from("coverage_logs")
      .insert({ teacher_id: teacherId, standard_id: standardId, taught_date: taughtDate, notes: notes ?? null })
      .select()
      .single();
    if (data) setLogs((prev) => [data, ...prev]);
  }

  async function removeCoverage(logId: string) {
    await supabase.from("coverage_logs").delete().eq("id", logId);
    setLogs((prev) => prev.filter((l) => l.id !== logId));
  }

  const coveredStandardIds = new Set(logs.map((l) => l.standard_id));

  function lastTaughtDate(standardId: string) {
    return logs.find((l) => l.standard_id === standardId)?.taught_date ?? null;
  }

  return { logs, loading, markTaught, removeCoverage, coveredStandardIds, lastTaughtDate };
}
