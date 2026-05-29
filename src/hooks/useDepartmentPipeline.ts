"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Standard } from "@/types";
import { PipelineStatus } from "@/hooks/useStandardPipeline";

export interface TeacherPipelineResult {
  teacherId: string;
  teacherName: string | null;
  planId: string;
  statusByStandardId: Map<string, PipelineStatus>;
  summary: { unmapped: number; planned: number; scheduled: number; taught: number };
}

export function useDepartmentPipeline(
  subjectId: string | null,
  gradeLevelId: string | null,
  allStandards: Standard[]
) {
  const [results, setResults] = useState<TeacherPipelineResult[]>([]);
  const [loading, setLoading] = useState(true);

  const compute = useCallback(async () => {
    if (!subjectId || !gradeLevelId || allStandards.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    // 1. All plans for this subject+grade with lead member profiles
    const { data: plans } = await supabase
      .from("long_term_plans")
      .select(`id, members:ltp_members(teacher_id, role, teacher:profiles(id, full_name))`)
      .eq("subject_id", subjectId)
      .eq("grade_level_id", gradeLevelId);

    if (!plans?.length) { setResults([]); setLoading(false); return; }

    const planIds = plans.map((p) => p.id);

    // 2. All units for these plans with standards and lesson_sequence
    const { data: units } = await supabase
      .from("ltp_units")
      .select("id, ltp_id, title, unit_number, start_week, lesson_sequence, standards:ltp_unit_standards(standard_id)")
      .in("ltp_id", planIds)
      .order("unit_number");

    // 3. All deliveries for all unit IDs
    const allUnitIds = (units ?? []).map((u) => u.id);
    const { data: deliveries } = allUnitIds.length
      ? await supabase
          .from("class_lesson_deliveries")
          .select("unit_id, week_number, teacher_id")
          .in("unit_id", allUnitIds)
      : { data: [] };

    const deliverySet = new Set((deliveries ?? []).map((d) => `${d.unit_id}:${d.week_number}:${d.teacher_id}`));

    // Build code → standard id map for reverse lookup
    const codeToId = new Map(allStandards.map((s) => [s.code, s.id]));

    // 4. Compute per-plan results
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const planResults: TeacherPipelineResult[] = (plans as any[]).map((plan) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lead = (plan.members ?? []).find((m: any) => m.role === "lead");
      const teacherId: string = lead?.teacher_id ?? lead?.teacher?.id ?? "";
      const teacherName: string | null = lead?.teacher?.full_name ?? null;
      const planUnits = (units ?? []).filter((u) => u.ltp_id === plan.id);

      // Build standard_id → unit info
      const stdToUnit = new Map<string, { unitId: string; startWeek: number | null }>();
      for (const unit of planUnits) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const row of (unit.standards as any[]) ?? []) {
          if (!stdToUnit.has(row.standard_id)) {
            stdToUnit.set(row.standard_id, { unitId: unit.id, startWeek: unit.start_week ?? null });
          }
        }
      }

      // Build code → taught week (via lesson_sequence delivery)
      const codeTaught = new Set<string>();
      for (const unit of planUnits) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const week of (unit.lesson_sequence as any[]) ?? []) {
          if (deliverySet.has(`${unit.id}:${week.week}:${teacherId}`)) {
            for (const code of week.standards ?? []) codeTaught.add(code);
          }
        }
      }

      const statusByStandardId = new Map<string, PipelineStatus>();
      let unmapped = 0, planned = 0, scheduled = 0, taught = 0;

      for (const s of allStandards) {
        const unitInfo = stdToUnit.get(s.id);
        let status: PipelineStatus;
        if (!unitInfo) {
          status = "unmapped"; unmapped++;
        } else if (codeTaught.has(s.code)) {
          status = "taught"; taught++;
        } else if (unitInfo.startWeek !== null) {
          status = "scheduled"; scheduled++;
        } else {
          status = "planned"; planned++;
        }
        statusByStandardId.set(s.id, status);
      }

      return { teacherId, teacherName, planId: plan.id, statusByStandardId, summary: { unmapped, planned, scheduled, taught } };
    });

    setResults(planResults);
    setLoading(false);
  }, [subjectId, gradeLevelId, allStandards]);

  useEffect(() => { compute(); }, [compute]);

  return { results, loading };
}
