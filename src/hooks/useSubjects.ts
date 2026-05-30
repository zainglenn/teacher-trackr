"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Subject } from "@/types";

export function useSubjects(schoolId?: string | null) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("subjects").select("*").order("created_at", { ascending: true });
    if (schoolId) query = query.eq("school_id", schoolId);
    const { data, error } = await query;
    if (error) setError(error.message);
    else setSubjects((data ?? []) as Subject[]);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { subjects, loading, error, refetch: fetch };
}
