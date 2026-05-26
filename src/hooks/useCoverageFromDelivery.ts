"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type CoverageStatus = "covered" | "in_progress" | "planned" | "gap";

export interface StandardDeliveryStatus {
  status: CoverageStatus;
  unitId: string;
  unitTitle: string;
  term: number;
  unitNumber: number;
  deliveredWeeks: number;
  totalWeeks: number;
}

const STATUS_PRIORITY: Record<CoverageStatus, number> = {
  covered: 3,
  in_progress: 2,
  planned: 1,
  gap: 0,
};

export function useCoverageFromDelivery(teacherId: string, classId: string | null) {
  const [statusMap, setStatusMap] = useState<Map<string, StandardDeliveryStatus>>(new Map());
  const [loading, setLoading] = useState(true);

  const compute = useCallback(async () => {
    if (!classId) {
      setStatusMap(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);

    // Get the class's ltp_id
    const { data: classRow } = await supabase
      .from("classes")
      .select("ltp_id")
      .eq("id", classId)
      .single();

    if (!classRow?.ltp_id) {
      setStatusMap(new Map());
      setLoading(false);
      return;
    }

    const ltpId = classRow.ltp_id as string;

    // Get units with their mapped standards and lesson sequence
    const { data: units } = await supabase
      .from("ltp_units")
      .select("id, title, term, unit_number, duration_weeks, lesson_sequence, standards:ltp_unit_standards(standard_id)")
      .eq("ltp_id", ltpId)
      .order("unit_number");

    // Get deliveries for this class
    const { data: deliveries } = await supabase
      .from("class_lesson_deliveries")
      .select("unit_id, week_number")
      .eq("class_id", classId);

    // Build delivery count map: unit_id → delivered week numbers
    const deliveryByUnit = new Map<string, Set<number>>();
    for (const d of deliveries ?? []) {
      if (!deliveryByUnit.has(d.unit_id)) deliveryByUnit.set(d.unit_id, new Set());
      deliveryByUnit.get(d.unit_id)!.add(d.week_number);
    }

    // Build standard status map — keep best status when a standard appears in multiple units
    const map = new Map<string, StandardDeliveryStatus>();

    for (const unit of units ?? []) {
      const seqLength = Array.isArray(unit.lesson_sequence) ? unit.lesson_sequence.length : null;
      const totalWeeks = seqLength ?? (unit.duration_weeks as number) ?? 0;
      const deliveredWeeks = deliveryByUnit.get(unit.id)?.size ?? 0;

      let status: CoverageStatus;
      if (deliveredWeeks === 0) status = "planned";
      else if (totalWeeks > 0 && deliveredWeeks >= totalWeeks) status = "covered";
      else status = "in_progress";

      const standardIds: string[] = ((unit.standards as { standard_id: string }[]) ?? []).map((s) => s.standard_id);

      for (const standardId of standardIds) {
        const existing = map.get(standardId);
        if (!existing || STATUS_PRIORITY[status] > STATUS_PRIORITY[existing.status]) {
          map.set(standardId, {
            status,
            unitId: unit.id as string,
            unitTitle: unit.title as string,
            term: unit.term as number,
            unitNumber: unit.unit_number as number,
            deliveredWeeks,
            totalWeeks,
          });
        }
      }
    }

    setStatusMap(map);
    setLoading(false);
  }, [teacherId, classId]);

  useEffect(() => { compute(); }, [compute]);

  return { statusMap, loading };
}
