"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { LongTermPlan, LTPStatus, LTPUnit, LTPMemberRole, Standard } from "@/types";
import { ltpAggregateStatus } from "@/lib/ltpStatus";

interface UseLongTermPlansOptions {
  subjectId?: string | null;
  gradeLevelId?: string | null;
}

export function useLongTermPlans(teacherId: string, isHod: boolean, options: UseLongTermPlansOptions = {}) {
  const [plans, setPlans] = useState<LongTermPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const { subjectId, gradeLevelId } = options;

  const fetch = useCallback(async () => {
    // RLS handles visibility: HOD sees all, teachers see plans they're members of.
    // No teacher_id filter needed here.
    let query = supabase
      .from("long_term_plans")
      .select(`
        *,
        teacher:profiles(id,email,full_name,role),
        units:ltp_units(*, assignedTeacher:profiles!ltp_units_assigned_to_fkey(id,email,full_name,role), standards:ltp_unit_standards(is_priority, standard:standards(*))),
        members:ltp_members(id,teacher_id,role,teacher:profiles(id,email,full_name))
      `)
      .order("created_at", { ascending: false });

    if (subjectId) query = query.eq("subject_id", subjectId);
    if (gradeLevelId) query = query.eq("grade_level_id", gradeLevelId);

    const { data } = await query;

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
      members: p.members ?? [],
    }));
    setPlans(normalized as LongTermPlan[]);
    setLoading(false);
  }, [subjectId, gradeLevelId]);

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

  function getMyRole(planId: string): LTPMemberRole | "hod" | null {
    if (isHod) return "hod";
    const plan = plans.find((p) => p.id === planId);
    const member = plan?.members?.find((m) => m.teacher_id === teacherId);
    return member?.role ?? null;
  }

  async function setMemberRole(planId: string, memberId: string, role: LTPMemberRole) {
    await supabase.from("ltp_members").update({ role }).eq("id", memberId);
    await fetch();
  }

  async function syncPlanStatus(planId: string) {
    const { data } = await supabase.from("ltp_units").select("status").eq("ltp_id", planId);
    if (!data) return;
    const { stored } = ltpAggregateStatus(data as { status: "draft" | "submitted" | "approved" | "revision" }[]);
    await supabase.from("long_term_plans").update({ status: stored, updated_at: new Date().toISOString() }).eq("id", planId);
  }

  async function submitUnit(unitId: string, planId: string) {
    await supabase.from("ltp_units").update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      hod_feedback: null,
      reviewed_at: null,
    }).eq("id", unitId);
    await fetch();
    await syncPlanStatus(planId);
    await fetch();
  }

  async function withdrawUnit(unitId: string, planId: string) {
    await supabase.from("ltp_units").update({
      status: "draft",
      submitted_at: null,
    }).eq("id", unitId);
    await fetch();
    await syncPlanStatus(planId);
    await fetch();
  }

  async function approveUnit(unitId: string, planId: string) {
    await supabase.from("ltp_units").update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: teacherId,
    }).eq("id", unitId);
    await fetch();
    await syncPlanStatus(planId);
    await fetch();
  }

  async function requestUnitRevision(unitId: string, planId: string, hodFeedback: string) {
    await supabase.from("ltp_units").update({
      status: "revision",
      hod_feedback: hodFeedback,
      reviewed_at: new Date().toISOString(),
      reviewed_by: teacherId,
    }).eq("id", unitId);
    await fetch();
    await syncPlanStatus(planId);
    await fetch();
  }

  async function reopenUnit(unitId: string, planId: string) {
    await supabase.from("ltp_units").update({
      status: "draft",
      reviewed_at: null,
      reviewed_by: null,
      hod_feedback: null,
      rejection_reason: null,
    }).eq("id", unitId);
    await fetch();
    await syncPlanStatus(planId);
    await fetch();
  }

  async function rejectUnit(unitId: string, planId: string, reason: string) {
    if (!reason.trim()) throw new Error("Rejection reason is required");
    await supabase.from("ltp_units").update({
      status: "rejected",
      rejection_reason: reason,
      reviewed_at: new Date().toISOString(),
      reviewed_by: teacherId,
    }).eq("id", unitId);
    await fetch();
    await syncPlanStatus(planId);
    await fetch();
  }

  async function publishPlan(planId: string) {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    const allApproved = (plan.units ?? []).every((u) => u.status === "approved");
    if (!allApproved) throw new Error("All units must be approved before publishing");
    const unitIds = (plan.units ?? []).map((u) => u.id);
    if (unitIds.length > 0) {
      await supabase.from("ltp_units").update({ status: "published" }).in("id", unitIds);
    }
    await supabase.from("long_term_plans").update({
      status: "published",
      updated_at: new Date().toISOString(),
    }).eq("id", planId);
    await fetch();
  }

  return { plans, loading, createLTP, updateLTP, setStatus, deleteLTP, addUnit, updateUnit, deleteUnit, setUnitStandards, batchAddUnits, assignUnit, submitUnit, withdrawUnit, approveUnit, requestUnitRevision, reopenUnit, rejectUnit, publishPlan, getMyRole, setMemberRole };
}
