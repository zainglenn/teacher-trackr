"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { LongTermPlan, LTPStatus, LTPUnit, Standard } from "@/types";

export function useLongTermPlans(teacherId: string, isHod: boolean) {
  const [plans, setPlans] = useState<LongTermPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    let query = supabase
      .from("long_term_plans")
      .select(`*, teacher:profiles(id,email,full_name,role), units:ltp_units(*, assignedTeacher:profiles!ltp_units_assigned_to_fkey(id,email,full_name,role), standards:ltp_unit_standards(standard:standards(*)))`)
      .order("created_at", { ascending: false });
    if (!isHod) query = query.eq("teacher_id", teacherId);

    const { data } = await query;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalized = (data ?? []).map((p: any) => ({
      ...p,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      units: (p.units ?? []).map((u: any) => ({
        ...u,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        standards: u.standards?.map((s: any) => s.standard) ?? [],
        assignedTeacher: u.assignedTeacher ?? null,
      })),
    }));
    setPlans(normalized as LongTermPlan[]);
    setLoading(false);
  }, [teacherId, isHod]);

  useEffect(() => { fetch(); }, [fetch]);

  async function createLTP(title: string, schoolYear: string) {
    const { data } = await supabase
      .from("long_term_plans")
      .insert({ teacher_id: teacherId, title, school_year: schoolYear })
      .select()
      .single();
    if (data) await fetch();
    return data;
  }

  async function updateLTP(id: string, updates: { title?: string; school_year?: string }) {
    await supabase.from("long_term_plans").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
    await fetch();
  }

  async function setStatus(id: string, status: LTPStatus, hodFeedback?: string) {
    await supabase.from("long_term_plans").update({
      status,
      hod_feedback: hodFeedback ?? null,
      reviewed_by: isHod ? teacherId : null,
      reviewed_at: isHod ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    await fetch();
  }

  async function deleteLTP(id: string) {
    await supabase.from("long_term_plans").delete().eq("id", id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
  }

  async function addUnit(ltpId: string, unit: {
    term: number; unit_number: number; title: string; big_idea?: string;
    start_week?: number; duration_weeks: number; assessment_type: string; sort_order: number;
  }) {
    const { data } = await supabase.from("ltp_units").insert({ ltp_id: ltpId, ...unit }).select().single();
    if (data) await fetch();
    return data;
  }

  async function updateUnit(unitId: string, updates: Partial<Omit<LTPUnit, "id" | "ltp_id" | "created_at" | "standards">>) {
    await supabase.from("ltp_units").update(updates).eq("id", unitId);
    await fetch();
  }

  async function deleteUnit(unitId: string) {
    await supabase.from("ltp_units").delete().eq("id", unitId);
    await fetch();
  }

  async function setUnitStandards(unitId: string, standardIds: string[]) {
    await supabase.from("ltp_unit_standards").delete().eq("unit_id", unitId);
    if (standardIds.length > 0) {
      await supabase.from("ltp_unit_standards").insert(standardIds.map((sid) => ({ unit_id: unitId, standard_id: sid })));
    }
    await fetch();
  }

  async function batchAddUnits(ltpId: string, units: {
    unit: { term: number; unit_number: number; title: string; big_idea?: string; start_week?: number; duration_weeks: number; assessment_type: string; sort_order: number };
    standardIds: string[];
  }[]) {
    for (const { unit, standardIds } of units) {
      const { data } = await supabase.from("ltp_units").insert({ ltp_id: ltpId, ...unit }).select().single();
      if (data && standardIds.length > 0) {
        await supabase.from("ltp_unit_standards").insert(standardIds.map((sid) => ({ unit_id: data.id, standard_id: sid })));
      }
    }
    await fetch();
  }

  async function assignUnit(unitId: string, teacherId: string | null) {
    await supabase.from("ltp_units").update({ assigned_to: teacherId }).eq("id", unitId);
    await fetch();
  }

  return { plans, loading, createLTP, updateLTP, setStatus, deleteLTP, addUnit, updateUnit, deleteUnit, setUnitStandards, batchAddUnits, assignUnit };
}
