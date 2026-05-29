"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { LongTermPlan, LTPUnit } from "@/types";
import { ltpAggregateStatus } from "@/lib/ltpStatus";

export function useAssignedUnits(teacherId: string) {
  const [plans, setPlans] = useState<LongTermPlan[]>([]);
  const [assignedUnitIds, setAssignedUnitIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data: assignedRows } = await supabase
      .from("ltp_units")
      .select("id, ltp_id")
      .eq("assigned_to", teacherId);

    if (!assignedRows || assignedRows.length === 0) {
      setPlans([]);
      setAssignedUnitIds(new Set());
      setLoading(false);
      return;
    }

    const planIds = [...new Set(assignedRows.map((r) => r.ltp_id))];
    setAssignedUnitIds(new Set(assignedRows.map((r) => r.id)));

    const { data } = await supabase
      .from("long_term_plans")
      .select(`*, teacher:profiles(id,email,full_name,role), units:ltp_units(*, assignedTeacher:profiles!ltp_units_assigned_to_fkey(id,email,full_name,role), standards:ltp_unit_standards(is_priority, standard:standards(*)))`)
      .in("id", planIds)
      .order("created_at", { ascending: false });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalized = (data ?? []).map((p: any) => ({
      ...p,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      units: (p.units ?? []).map((u: any) => ({
        ...u,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        standards: u.standards?.map((s: any) => ({ ...s.standard, is_priority: s.is_priority ?? false })) ?? [],
        assignedTeacher: u.assignedTeacher ?? null,
      })),
    }));

    setPlans(normalized as LongTermPlan[]);
    setLoading(false);
  }, [teacherId]);

  useEffect(() => { fetch(); }, [fetch]);

  async function updateUnit(unitId: string, updates: Partial<Omit<LTPUnit, "id" | "ltp_id" | "created_at" | "standards">>) {
    await supabase.from("ltp_units").update(updates).eq("id", unitId);
    await fetch();
  }

  async function setUnitStandards(unitId: string, standardIds: string[]) {
    await supabase.from("ltp_unit_standards").delete().eq("unit_id", unitId);
    if (standardIds.length > 0) {
      await supabase.from("ltp_unit_standards").insert(standardIds.map((sid) => ({ unit_id: unitId, standard_id: sid })));
    }
    await fetch();
  }

  async function syncPlanStatus(planId: string) {
    const { data } = await supabase.from("ltp_units").select("status").eq("ltp_id", planId);
    if (!data) return;
    const { stored } = ltpAggregateStatus(data as { status: "draft" | "submitted" | "approved" | "revision" }[]);
    await supabase.from("long_term_plans").update({ status: stored, updated_at: new Date().toISOString() }).eq("id", planId);
  }

  function findPlanId(unitId: string): string | undefined {
    return plans.find((p) => p.units?.some((u) => u.id === unitId))?.id;
  }

  async function submitUnit(unitId: string, planId: string) {
    await supabase.from("ltp_units").update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      hod_feedback: null,
      reviewed_at: null,
    }).eq("id", unitId);
    await fetch();
    const pid = planId || findPlanId(unitId);
    if (pid) { await syncPlanStatus(pid); await fetch(); }
  }

  async function withdrawUnit(unitId: string, planId: string) {
    await supabase.from("ltp_units").update({
      status: "draft",
      submitted_at: null,
    }).eq("id", unitId);
    await fetch();
    const pid = planId || findPlanId(unitId);
    if (pid) { await syncPlanStatus(pid); await fetch(); }
  }

  return { plans, assignedUnitIds, loading, updateUnit, setUnitStandards, submitUnit, withdrawUnit };
}
