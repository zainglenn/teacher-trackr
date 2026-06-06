"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Standard, Attainment } from "@/types";

export interface AttainmentStats {
  total: number;
  meeting: number;
  exceeding: number;
  approaching: number;
  below: number;
  not_assessed: number;
  pct: number; // (meeting + exceeding) / total * 100, 0 if total === 0
}

export interface StudentAttainmentRow {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  teacherId: string;
  attainment: Attainment;
}

export interface AttainmentGridData {
  // classId → strandCode → stats
  grid: Map<string, Map<string, AttainmentStats>>;
  // classId → class name
  classNames: Map<string, string>;
  // raw rows for drill-down (filter by classId + strand client-side)
  studentRows: StudentAttainmentRow[];
  loading: boolean;
}

const STRAND_ORDER = ["RL", "RI", "W", "SL", "L"];

function emptyStats(): AttainmentStats {
  return { total: 0, meeting: 0, exceeding: 0, approaching: 0, below: 0, not_assessed: 0, pct: 0 };
}

export function useAttainmentGrid(
  subjectId: string | null,
  gradeLevelId: string | null,
  standards: Standard[],
  schoolId: string | null
): AttainmentGridData {
  const [grid, setGrid] = useState<Map<string, Map<string, AttainmentStats>>>(new Map());
  const [classNames, setClassNames] = useState<Map<string, string>>(new Map());
  const [studentRows, setStudentRows] = useState<StudentAttainmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const compute = useCallback(async () => {
    if (!schoolId || !subjectId || !gradeLevelId || standards.length === 0) {
      setGrid(new Map());
      setClassNames(new Map());
      setStudentRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const standardIds = standards.map((s) => s.id);
    // Build standard_id → strand lookup
    const strandByStandardId = new Map(standards.map((s) => [s.id, s.strand.toUpperCase()]));

    // 1. Get teachers assigned to this subject/grade in the school
    const { data: assignments } = await supabase
      .from("class_assignments")
      .select("teacher_id")
      .eq("school_id", schoolId)
      .eq("subject_id", subjectId)
      .eq("grade_level_id", gradeLevelId);

    const teacherIds = [...new Set((assignments ?? []).map((a) => a.teacher_id as string))];
    if (teacherIds.length === 0) {
      setGrid(new Map()); setClassNames(new Map()); setStudentRows([]); setLoading(false);
      return;
    }

    // 2. Get students + their classes for those teachers
    const { data: students } = await supabase
      .from("students")
      .select("id, full_name, class_id, teacher_id")
      .in("teacher_id", teacherIds);

    const studentList = students ?? [];
    const studentIds = studentList.map((s) => s.id as string);

    if (studentIds.length === 0) {
      setGrid(new Map()); setClassNames(new Map()); setStudentRows([]); setLoading(false);
      return;
    }

    // 3. Get class names
    const classIdSet = new Set(studentList.map((s) => s.class_id as string).filter(Boolean));
    const { data: classes } = classIdSet.size > 0
      ? await supabase.from("classes").select("id, name").in("id", [...classIdSet])
      : { data: [] };
    const classNameMap = new Map((classes ?? []).map((c) => [c.id as string, c.name as string]));
    setClassNames(classNameMap);

    // 4. Get student_progress for these students × these standards
    const { data: progress } = await supabase
      .from("student_progress")
      .select("student_id, standard_id, attainment")
      .in("student_id", studentIds)
      .in("standard_id", standardIds);

    const progressRows = progress ?? [];

    // 5. Aggregate
    // grid: classId → strandCode → stats
    const newGrid = new Map<string, Map<string, AttainmentStats>>();
    const newStudentRows: StudentAttainmentRow[] = [];

    const studentById = new Map(studentList.map((s) => [s.id as string, s]));

    for (const p of progressRows) {
      const student = studentById.get(p.student_id);
      if (!student || !student.class_id) continue;
      const strand = strandByStandardId.get(p.standard_id);
      if (!strand) continue;

      const classId = student.class_id as string;
      const attainment = p.attainment as Attainment;
      const className = classNameMap.get(classId) ?? "Unknown Class";

      // Build row for drill-down
      newStudentRows.push({
        studentId: student.id,
        studentName: student.full_name,
        classId,
        className,
        teacherId: student.teacher_id,
        attainment,
      });

      // Aggregate into grid
      if (!newGrid.has(classId)) {
        newGrid.set(classId, new Map(STRAND_ORDER.map((s) => [s, emptyStats()])));
      }
      const strandMap = newGrid.get(classId)!;
      if (!strandMap.has(strand)) strandMap.set(strand, emptyStats());
      const stats = strandMap.get(strand)!;
      stats.total++;
      if (attainment === "meeting") stats.meeting++;
      else if (attainment === "exceeding") stats.exceeding++;
      else if (attainment === "approaching") stats.approaching++;
      else if (attainment === "below") stats.below++;
      else stats.not_assessed++;
      stats.pct = stats.total > 0 ? Math.round(((stats.meeting + stats.exceeding) / stats.total) * 100) : 0;
    }

    setGrid(newGrid);
    setStudentRows(newStudentRows);
    setLoading(false);
  }, [schoolId, subjectId, gradeLevelId, standards]);

  useEffect(() => { compute(); }, [compute]);

  return { grid, classNames, studentRows, loading };
}
