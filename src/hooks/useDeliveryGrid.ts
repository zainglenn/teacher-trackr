"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { LessonWeek } from "@/types";

export interface DeliveryRecord {
  id: string;
  class_id: string;
  unit_id: string;
  week_number: number;
  delivered_at: string;
  notes: string | null;
  delivered_by: string | null;
}

export interface DeadlineRecord {
  class_id: string;
  unit_id: string;
  week_number: number;
  deadline_date: string | null;
  reminder_days_before: number;
}

export interface GridClass {
  id: string;
  name: string;
  school_year: string;
  ltp_id: string | null;
  teacher: { id: string; full_name: string | null; email: string } | null;
}

export interface GridWeek {
  unit_id: string;
  unit_title: string;
  term: number;
  week_number: number;
  focus: string;
  activities: string;
  standards: string[];
}

export type DeliveryStatus = "taught" | "overdue" | "behind" | "pending";

export function deliveryStatus(
  delivered: boolean,
  deadline: string | null
): DeliveryStatus {
  if (delivered) return "taught";
  if (!deadline) return "pending";
  const now = new Date();
  const due = new Date(deadline);
  const daysUntil = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntil < 0) return "overdue";
  if (daysUntil <= 3) return "behind";
  return "pending";
}

export function useDeliveryGrid() {
  const [classes, setClasses] = useState<GridClass[]>([]);
  const [weeks, setWeeks] = useState<GridWeek[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);

    // Load all classes with teacher info
    const { data: classRows } = await supabase
      .from("classes")
      .select("id, name, school_year, ltp_id, teacher_id")
      .order("name");

    if (!classRows?.length) {
      setLoading(false);
      return;
    }

    const teacherIds = [...new Set(classRows.map((c) => c.teacher_id).filter(Boolean))];
    const { data: profiles } = teacherIds.length
      ? await supabase.from("profiles").select("id, full_name, email").in("id", teacherIds)
      : { data: [] };

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const gridClasses: GridClass[] = classRows.map((c) => ({
      id: c.id,
      name: c.name,
      school_year: c.school_year,
      ltp_id: c.ltp_id ?? null,
      teacher: profileMap.get(c.teacher_id) ?? null,
    }));
    setClasses(gridClasses);

    // Load lesson weeks from master plan(s) attached to any class
    const ltpIds = [...new Set(gridClasses.map((c) => c.ltp_id).filter(Boolean))] as string[];
    if (ltpIds.length) {
      const { data: units } = await supabase
        .from("ltp_units")
        .select("id, title, term, lesson_sequence")
        .in("ltp_id", ltpIds)
        .order("term")
        .order("unit_number");

      const gridWeeks: GridWeek[] = [];
      for (const unit of units ?? []) {
        const seq: LessonWeek[] = unit.lesson_sequence ?? [];
        for (const w of seq) {
          gridWeeks.push({
            unit_id: unit.id,
            unit_title: unit.title,
            term: unit.term,
            week_number: w.week,
            focus: w.focus,
            activities: w.activities,
            standards: w.standards ?? [],
          });
        }
      }
      setWeeks(gridWeeks);
    }

    // Load all deliveries and deadlines
    const classIds = gridClasses.map((c) => c.id);
    const [{ data: deliveryRows }, { data: deadlineRows }] = await Promise.all([
      supabase.from("class_lesson_deliveries").select("*").in("class_id", classIds),
      supabase.from("class_lesson_deadlines").select("*").in("class_id", classIds),
    ]);

    setDeliveries((deliveryRows ?? []) as DeliveryRecord[]);
    setDeadlines((deadlineRows ?? []) as DeadlineRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  function isDelivered(classId: string, unitId: string, weekNumber: number) {
    return deliveries.some(
      (d) => d.class_id === classId && d.unit_id === unitId && d.week_number === weekNumber
    );
  }

  function getDelivery(classId: string, unitId: string, weekNumber: number) {
    return deliveries.find(
      (d) => d.class_id === classId && d.unit_id === unitId && d.week_number === weekNumber
    ) ?? null;
  }

  function getDeadline(classId: string, unitId: string, weekNumber: number) {
    return deadlines.find(
      (d) => d.class_id === classId && d.unit_id === unitId && d.week_number === weekNumber
    ) ?? null;
  }

  function getCellStatus(classId: string, unitId: string, weekNumber: number): DeliveryStatus {
    const delivered = isDelivered(classId, unitId, weekNumber);
    const deadline = getDeadline(classId, unitId, weekNumber);
    return deliveryStatus(delivered, deadline?.deadline_date ?? null);
  }

  const overdueCount = classes.reduce((total, cls) => {
    return total + weeks.filter((w) =>
      getCellStatus(cls.id, w.unit_id, w.week_number) === "overdue"
    ).length;
  }, 0);

  return {
    classes,
    weeks,
    deliveries,
    deadlines,
    loading,
    isDelivered,
    getDelivery,
    getDeadline,
    getCellStatus,
    overdueCount,
    refresh: fetch,
  };
}
