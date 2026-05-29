"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface DeliveryEntry {
  id: string;
  week_number: number;
  delivered_at: string;
  notes: string | null;
}

export function useDeliveryLog(teacherId: string | null, unitId: string | null) {
  const [entries, setEntries] = useState<DeliveryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);

  const fetch = useCallback(async () => {
    if (!teacherId || !unitId) { setEntries([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("class_lesson_deliveries")
      .select("id, week_number, delivered_at, notes")
      .eq("unit_id", unitId)
      .eq("teacher_id", teacherId)
      .order("week_number");
    setEntries((data ?? []) as DeliveryEntry[]);
    setLoading(false);
  }, [teacherId, unitId]);

  useEffect(() => { fetch(); }, [fetch]);

  const deliveredWeeks = new Set(entries.map((e) => e.week_number));

  async function toggle(weekNumber: number, notes?: string) {
    if (!teacherId || !unitId) return;
    setToggling(weekNumber);
    try {
      if (deliveredWeeks.has(weekNumber)) {
        // undeliver — optimistic
        setEntries((prev) => prev.filter((e) => e.week_number !== weekNumber));
        await supabase
          .from("class_lesson_deliveries")
          .delete()
          .eq("unit_id", unitId)
          .eq("teacher_id", teacherId)
          .eq("week_number", weekNumber);
      } else {
        // deliver — optimistic
        const optimistic: DeliveryEntry = {
          id: crypto.randomUUID(),
          week_number: weekNumber,
          delivered_at: new Date().toISOString(),
          notes: notes ?? null,
        };
        setEntries((prev) => [...prev, optimistic].sort((a, b) => a.week_number - b.week_number));
        const { data } = await supabase
          .from("class_lesson_deliveries")
          .insert({ unit_id: unitId, week_number: weekNumber, teacher_id: teacherId, notes: notes ?? null })
          .select("id, week_number, delivered_at, notes")
          .single();
        if (data) {
          setEntries((prev) => prev.map((e) => e.week_number === weekNumber ? data as DeliveryEntry : e));
        }
      }
    } finally {
      setToggling(null);
    }
  }

  function getEntry(weekNumber: number): DeliveryEntry | null {
    return entries.find((e) => e.week_number === weekNumber) ?? null;
  }

  return { deliveredWeeks, entries, loading, toggling, toggle, getEntry, refresh: fetch };
}
