"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Standard } from "@/types";

export type PipelineStatus = "unmapped" | "planned" | "scheduled" | "taught";

export interface PipelineEntry {
  standard: Standard;
  status: PipelineStatus;
  unitId: string | null;
  unitTitle: string | null;
  unitNumber: number | null;
  startWeek: number | null;
  taughtWeekNumber: number | null;
  isPriority: boolean;
}

export interface PipelineSummary {
  unmapped: number;
  planned: number;
  scheduled: number;
  taught: number;
  total: number;
}

export function useStandardPipeline(
  teacherId: string | null,
  subjectId: string | null,
  gradeLevelId: string | null,
  allStandards: Standard[]
) {
  const [entries, setEntries] = useState<PipelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const compute = useCallback(async () => {
    if (!teacherId || !subjectId || !gradeLevelId || allStandards.length === 0) {
      setEntries(allStandards.map((s) => ({
        standard: s, status: "unmapped", unitId: null, unitTitle: null,
        unitNumber: null, startWeek: null, taughtWeekNumber: null, isPriority: false,
      })));
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Find teacher's LTP for this subject+grade
    const { data: memberRows } = await supabase
      .from("ltp_members")
      .select("plan_id, long_term_plans!inner(id, subject_id, grade_level_id)")
      .eq("teacher_id", teacherId)
      .eq("long_term_plans.subject_id", subjectId)
      .eq("long_term_plans.grade_level_id", gradeLevelId);

    if (!memberRows?.length) {
      setEntries(allStandards.map((s) => ({
        standard: s, status: "unmapped", unitId: null, unitTitle: null,
        unitNumber: null, startWeek: null, taughtWeekNumber: null, isPriority: false,
      })));
      setLoading(false);
      return;
    }

    const planIds = [...new Set(memberRows.map((r) => r.plan_id))];

    // 2. Fetch units with their mapped standards and lesson sequence
    const { data: units } = await supabase
      .from("ltp_units")
      .select("id, title, unit_number, start_week, lesson_sequence, standards:ltp_unit_standards(standard_id, is_priority)")
      .in("ltp_id", planIds)
      .order("unit_number");

    // 3. Fetch deliveries for this teacher across all units
    const unitIds = (units ?? []).map((u) => u.id);
    const { data: deliveries } = unitIds.length
      ? await supabase
          .from("class_lesson_deliveries")
          .select("unit_id, week_number")
          .eq("teacher_id", teacherId)
          .in("unit_id", unitIds)
      : { data: [] };

    // Build lookup: standardId → { unit, isPriority }
    const standardToUnit = new Map<string, { unitId: string; unitTitle: string; unitNumber: number; startWeek: number | null; isPriority: boolean }>();
    // Build lookup: (unitId + weekNumber) → delivered?
    const deliveredSet = new Set((deliveries ?? []).map((d) => `${d.unit_id}:${d.week_number}`));

    for (const unit of units ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of (unit.standards as any[]) ?? []) {
        if (!standardToUnit.has(row.standard_id)) {
          standardToUnit.set(row.standard_id, {
            unitId: unit.id,
            unitTitle: unit.title,
            unitNumber: unit.unit_number,
            startWeek: unit.start_week ?? null,
            isPriority: row.is_priority ?? false,
          });
        }
      }
    }

    // Build lookup: standardCode → delivered week number (first delivered week covering it)
    // lesson_sequence weeks store standard codes (e.g. "RL.6.1")
    const codeToTaughtWeek = new Map<string, number>();
    for (const unit of units ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const week of (unit.lesson_sequence as any[]) ?? []) {
        if (deliveredSet.has(`${unit.id}:${week.week}`)) {
          for (const code of week.standards ?? []) {
            if (!codeToTaughtWeek.has(code)) {
              codeToTaughtWeek.set(code, week.week);
            }
          }
        }
      }
    }

    // Compute status for each standard
    const result: PipelineEntry[] = allStandards.map((s) => {
      const unitInfo = standardToUnit.get(s.id);
      const taughtWeek = codeToTaughtWeek.get(s.code) ?? null;

      if (!unitInfo) {
        return { standard: s, status: "unmapped", unitId: null, unitTitle: null, unitNumber: null, startWeek: null, taughtWeekNumber: null, isPriority: false };
      }

      if (taughtWeek !== null) {
        return { standard: s, status: "taught", unitId: unitInfo.unitId, unitTitle: unitInfo.unitTitle, unitNumber: unitInfo.unitNumber, startWeek: unitInfo.startWeek, taughtWeekNumber: taughtWeek, isPriority: unitInfo.isPriority };
      }

      if (unitInfo.startWeek !== null) {
        return { standard: s, status: "scheduled", unitId: unitInfo.unitId, unitTitle: unitInfo.unitTitle, unitNumber: unitInfo.unitNumber, startWeek: unitInfo.startWeek, taughtWeekNumber: null, isPriority: unitInfo.isPriority };
      }

      return { standard: s, status: "planned", unitId: unitInfo.unitId, unitTitle: unitInfo.unitTitle, unitNumber: unitInfo.unitNumber, startWeek: null, taughtWeekNumber: null, isPriority: unitInfo.isPriority };
    });

    setEntries(result);
    setLoading(false);
  }, [teacherId, subjectId, gradeLevelId, allStandards]);

  useEffect(() => { compute(); }, [compute]);

  const summary: PipelineSummary = {
    unmapped:  entries.filter((e) => e.status === "unmapped").length,
    planned:   entries.filter((e) => e.status === "planned").length,
    scheduled: entries.filter((e) => e.status === "scheduled").length,
    taught:    entries.filter((e) => e.status === "taught").length,
    total:     entries.length,
  };

  return { entries, loading, summary };
}
