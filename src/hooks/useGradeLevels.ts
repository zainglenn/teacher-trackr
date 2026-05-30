"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { GradeLevel } from "@/types";

export function useGradeLevels(schoolId?: string | null) {
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("grade_levels").select("*").order("sort_order", { ascending: true });
    if (schoolId) query = query.eq("school_id", schoolId);
    const { data, error } = await query;
    if (error) setError(error.message);
    else setGradeLevels((data ?? []) as GradeLevel[]);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { gradeLevels, loading, error, refetch: fetch };
}
