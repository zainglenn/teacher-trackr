"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Observation, CoachingCycle, MentoringPair, PDEntry,
  ObservationFocusArea, CoachingStep, PDType, CheckInCadence,
} from "@/types";

export interface TeacherCoachingProfile {
  teacherId: string;
  teacherName: string;
  activeCycle: CoachingCycle | null;
  observations: Observation[];
  mentoringPair: MentoringPair | null;
  pdEntries: PDEntry[];
}

export function useCoaching(schoolId: string | null, hodId: string | null) {
  const [profiles, setProfiles] = useState<TeacherCoachingProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!schoolId || !hodId) { setProfiles([]); setLoading(false); return; }
    setLoading(true);

    const [obsRes, cyclesRes, pairsRes, pdRes, teachersRes] = await Promise.all([
      supabase.from("observations").select("*").eq("school_id", schoolId).order("date", { ascending: false }),
      supabase.from("coaching_cycles").select("*").eq("school_id", schoolId).order("started_at", { ascending: false }),
      supabase.from("mentoring_pairs").select("*").eq("school_id", schoolId),
      supabase.from("pd_entries").select("*").eq("school_id", schoolId).order("attended_date", { ascending: false }),
      supabase.from("profiles").select("id, full_name, username").eq("school_id", schoolId).eq("role", "teacher"),
    ]);

    const teachers = (teachersRes.data ?? []) as { id: string; full_name: string | null; username: string }[];
    const observations = (obsRes.data ?? []) as Observation[];
    const cycles = (cyclesRes.data ?? []) as CoachingCycle[];
    const pairs = (pairsRes.data ?? []) as MentoringPair[];
    const pdEntries = (pdRes.data ?? []) as PDEntry[];

    const result: TeacherCoachingProfile[] = teachers.map((t) => {
      const teacherObs = observations.filter((o) => o.teacher_id === t.id);
      const teacherCycles = cycles.filter((c) => c.teacher_id === t.id);
      const activeCycle = teacherCycles.find((c) => !c.completed_at) ?? null;
      const mentoringPair = pairs.find((p) => p.mentor_id === t.id || p.mentee_id === t.id) ?? null;
      const teacherPd = pdEntries.filter((p) => p.teacher_id === t.id);
      return {
        teacherId: t.id,
        teacherName: t.full_name ?? t.username,
        activeCycle,
        observations: teacherObs,
        mentoringPair,
        pdEntries: teacherPd,
      };
    });

    setProfiles(result.sort((a, b) => a.teacherName.localeCompare(b.teacherName)));
    setLoading(false);
  }, [schoolId, hodId]);

  useEffect(() => { load(); }, [load]);

  async function createObservation(data: {
    teacher_id: string; date: string; focus_area: ObservationFocusArea; notes?: string; next_steps?: string;
  }) {
    if (!schoolId || !hodId) return;
    const { data: row } = await supabase
      .from("observations")
      .insert({ ...data, hod_id: hodId, school_id: schoolId })
      .select("*").single();
    if (row) {
      setProfiles((prev) => prev.map((p) =>
        p.teacherId === data.teacher_id
          ? { ...p, observations: [row as Observation, ...p.observations] }
          : p
      ));
    }
  }

  async function openCycle(teacherId: string) {
    if (!schoolId || !hodId) return;
    const { data: row } = await supabase
      .from("coaching_cycles")
      .insert({ hod_id: hodId, teacher_id: teacherId, school_id: schoolId, steps_completed: [] })
      .select("*").single();
    if (row) {
      setProfiles((prev) => prev.map((p) =>
        p.teacherId === teacherId ? { ...p, activeCycle: row as CoachingCycle } : p
      ));
    }
  }

  async function completeStep(cycleId: string, teacherId: string, step: CoachingStep) {
    const profile = profiles.find((p) => p.teacherId === teacherId);
    if (!profile?.activeCycle) return;
    const newSteps = [...new Set([...profile.activeCycle.steps_completed, step])];
    const allSteps: CoachingStep[] = ["observe", "debrief", "model", "reflect"];
    const isComplete = allSteps.every((s) => newSteps.includes(s));
    const update: Partial<CoachingCycle> = {
      steps_completed: newSteps,
      ...(isComplete ? { completed_at: new Date().toISOString() } : {}),
    };
    const { data: row } = await supabase
      .from("coaching_cycles").update(update).eq("id", cycleId).select("*").single();
    if (row) {
      setProfiles((prev) => prev.map((p) =>
        p.teacherId === teacherId
          ? { ...p, activeCycle: isComplete ? null : (row as CoachingCycle) }
          : p
      ));
    }
  }

  async function createMentoringPair(mentorId: string, menteeId: string, cadence: CheckInCadence) {
    if (!schoolId || !hodId) return;
    const { data: row } = await supabase
      .from("mentoring_pairs")
      .insert({ hod_id: hodId, mentor_id: mentorId, mentee_id: menteeId, school_id: schoolId, check_in_cadence: cadence })
      .select("*").single();
    if (row) {
      const pair = row as MentoringPair;
      setProfiles((prev) => prev.map((p) =>
        p.teacherId === mentorId || p.teacherId === menteeId
          ? { ...p, mentoringPair: pair }
          : p
      ));
    }
  }

  async function updateCheckIn(pairId: string, mentorId: string, menteeId: string) {
    const { data: row } = await supabase
      .from("mentoring_pairs")
      .update({ last_checkin_at: new Date().toISOString() })
      .eq("id", pairId).select("*").single();
    if (row) {
      const pair = row as MentoringPair;
      setProfiles((prev) => prev.map((p) =>
        p.teacherId === mentorId || p.teacherId === menteeId
          ? { ...p, mentoringPair: pair }
          : p
      ));
    }
  }

  async function addPdEntry(data: { teacher_id: string; pd_type: PDType; focus_area?: string; attended_date: string; notes?: string }) {
    if (!schoolId) return;
    const { data: row } = await supabase
      .from("pd_entries")
      .insert({ ...data, school_id: schoolId })
      .select("*").single();
    if (row) {
      setProfiles((prev) => prev.map((p) =>
        p.teacherId === data.teacher_id
          ? { ...p, pdEntries: [row as PDEntry, ...p.pdEntries] }
          : p
      ));
    }
  }

  return { profiles, loading, createObservation, openCycle, completeStep, createMentoringPair, updateCheckIn, addPdEntry };
}
