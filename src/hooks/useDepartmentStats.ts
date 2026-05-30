"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Profile } from "@/types";

export interface DepartmentStats {
  teachers: Profile[];
  coverageByTeacher: Map<string, Set<string>>; // teacherId → Set<standardId>
  loading: boolean;
}

export function useDepartmentStats(schoolId?: string | null): DepartmentStats {
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [coverageByTeacher, setCoverageByTeacher] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      let teachersQuery = supabase
        .from("profiles")
        .select("id, email, full_name, role, created_at")
        .eq("role", "teacher")
        .order("full_name", { ascending: true });
      if (schoolId) teachersQuery = teachersQuery.eq("school_id", schoolId);

      const [teachersRes, coverageRes] = await Promise.all([
        teachersQuery,
        supabase.from("coverage_logs").select("teacher_id, standard_id"),
      ]);

      setTeachers((teachersRes.data ?? []) as Profile[]);

      const map = new Map<string, Set<string>>();
      for (const row of (coverageRes.data ?? []) as { teacher_id: string; standard_id: string }[]) {
        if (!map.has(row.teacher_id)) map.set(row.teacher_id, new Set());
        map.get(row.teacher_id)!.add(row.standard_id);
      }
      setCoverageByTeacher(map);
      setLoading(false);
    }
    fetch();
  }, [schoolId]);

  return { teachers, coverageByTeacher, loading };
}
