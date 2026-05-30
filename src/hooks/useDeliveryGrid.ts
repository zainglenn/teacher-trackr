"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { LessonWeek } from "@/types";

export interface DeliveryRecord {
  id: string;
  unit_id: string;
  week_number: number;
  teacher_id: string;
  delivered_at: string;
  notes: string | null;
}

// One "column" in the grid — a teacher's plan for this subject+grade
export interface GridClass {
  planId: string;
  planTitle: string;
  teacher: { id: string; full_name: string | null } | null;
  // map from unit_number → unit id for delivery lookup
  unitMap: Record<number, string>;
}

// One row in the grid — a canonical lesson week
export interface GridWeek {
  unitNumber: number;
  unitTitle: string;
  term: number;
  weekNumber: number;
  focus: string;
  activities: string;
  standards: string[];
}

export type DeliveryStatus = "taught" | "overdue" | "behind" | "pending";

export function deliveryStatus(delivered: boolean): DeliveryStatus {
  if (delivered) return "taught";
  return "pending";
}

export function useDeliveryGrid(subjectId: string | null, gradeLevelId: string | null, schoolId?: string | null) {
  const [classes, setClasses] = useState<GridClass[]>([]);
  const [weeks, setWeeks] = useState<GridWeek[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!subjectId || !gradeLevelId) {
      setClasses([]);
      setWeeks([]);
      setDeliveries([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Fetch all LTPs for this subject+grade with their lead members
    let plansQuery = supabase
      .from("long_term_plans")
      .select(`
        id, title,
        members:ltp_members(teacher_id, role, teacher:profiles(id, full_name))
      `)
      .eq("subject_id", subjectId)
      .eq("grade_level_id", gradeLevelId)
      .order("created_at");
    if (schoolId) plansQuery = plansQuery.eq("school_id", schoolId);
    const { data: plans } = await plansQuery;

    if (!plans?.length) {
      setClasses([]);
      setWeeks([]);
      setDeliveries([]);
      setLoading(false);
      return;
    }

    const planIds = plans.map((p) => p.id);

    // 2. Fetch all units for these plans
    const { data: units } = await supabase
      .from("ltp_units")
      .select("id, ltp_id, title, term, unit_number, lesson_sequence")
      .in("ltp_id", planIds)
      .order("unit_number");

    // 3. Build GridClass list (one per plan, teacher = lead member)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gridClasses: GridClass[] = plans.map((p: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const leadMember = (p.members ?? []).find((m: any) => m.role === "lead");
      const planUnits = (units ?? []).filter((u) => u.ltp_id === p.id);
      const unitMap: Record<number, string> = {};
      for (const u of planUnits) unitMap[u.unit_number] = u.id;
      return {
        planId: p.id,
        planTitle: p.title,
        teacher: leadMember?.teacher ?? null,
        unitMap,
      };
    });
    setClasses(gridClasses);

    // 4. Build canonical week list from the plan with the most units
    const planWithMostUnits = planIds.reduce((best, planId) => {
      const count = (units ?? []).filter((u) => u.ltp_id === planId).length;
      const bestCount = (units ?? []).filter((u) => u.ltp_id === best).length;
      return count > bestCount ? planId : best;
    }, planIds[0]);

    const canonicalUnits = (units ?? [])
      .filter((u) => u.ltp_id === planWithMostUnits)
      .sort((a, b) => a.unit_number - b.unit_number);

    const gridWeeks: GridWeek[] = [];
    for (const unit of canonicalUnits) {
      const seq: LessonWeek[] = unit.lesson_sequence ?? [];
      for (const w of seq) {
        gridWeeks.push({
          unitNumber: unit.unit_number,
          unitTitle: unit.title,
          term: unit.term,
          weekNumber: w.week,
          focus: w.focus,
          activities: w.activities,
          standards: w.standards ?? [],
        });
      }
    }
    setWeeks(gridWeeks);

    // 5. Fetch all deliveries for all units in these plans
    const allUnitIds = (units ?? []).map((u) => u.id);
    if (allUnitIds.length > 0) {
      const { data: deliveryRows } = await supabase
        .from("class_lesson_deliveries")
        .select("id, unit_id, week_number, teacher_id, delivered_at, notes")
        .in("unit_id", allUnitIds);
      setDeliveries((deliveryRows ?? []) as DeliveryRecord[]);
    } else {
      setDeliveries([]);
    }

    setLoading(false);
  }, [subjectId, gradeLevelId, schoolId]);

  useEffect(() => { fetch(); }, [fetch]);

  // Check if a teacher delivered a specific canonical week
  function isDelivered(cls: GridClass, unitNumber: number, weekNumber: number): boolean {
    const unitId = cls.unitMap[unitNumber];
    if (!unitId || !cls.teacher) return false;
    return deliveries.some(
      (d) => d.unit_id === unitId && d.week_number === weekNumber && d.teacher_id === cls.teacher!.id
    );
  }

  function getDelivery(cls: GridClass, unitNumber: number, weekNumber: number): DeliveryRecord | null {
    const unitId = cls.unitMap[unitNumber];
    if (!unitId || !cls.teacher) return null;
    return deliveries.find(
      (d) => d.unit_id === unitId && d.week_number === weekNumber && d.teacher_id === cls.teacher!.id
    ) ?? null;
  }

  function getCellStatus(cls: GridClass, unitNumber: number, weekNumber: number): DeliveryStatus {
    return deliveryStatus(isDelivered(cls, unitNumber, weekNumber));
  }

  const overdueCount = 0; // deadline tracking deferred

  return {
    classes,
    weeks,
    deliveries,
    loading,
    isDelivered,
    getDelivery,
    getCellStatus,
    overdueCount,
    refresh: fetch,
  };
}
