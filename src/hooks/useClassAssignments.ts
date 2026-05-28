"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ClassAssignment } from "@/types";

interface Options {
  teacherId?: string;
  subjectId?: string;
  gradeLevelId?: string;
}

export function useClassAssignments(options: Options = {}) {
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { teacherId, subjectId, gradeLevelId } = options;

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("class_assignments")
      .select("*, teacher:profiles(id, full_name, username, role), subject:subjects(*), grade_level:grade_levels(*)")
      .order("created_at", { ascending: true });

    if (teacherId) query = query.eq("teacher_id", teacherId);
    if (subjectId) query = query.eq("subject_id", subjectId);
    if (gradeLevelId) query = query.eq("grade_level_id", gradeLevelId);

    const { data, error } = await query;
    if (error) setError(error.message);
    else setAssignments((data ?? []) as ClassAssignment[]);
    setLoading(false);
  }, [teacherId, subjectId, gradeLevelId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { assignments, loading, error, refetch: fetch };
}
