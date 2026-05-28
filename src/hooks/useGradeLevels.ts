"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { GradeLevel } from "@/types";

export function useGradeLevels() {
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("grade_levels")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) setError(error.message);
    else setGradeLevels((data ?? []) as GradeLevel[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { gradeLevels, loading, error, refetch: fetch };
}
