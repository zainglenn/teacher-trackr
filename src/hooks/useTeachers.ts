"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Profile } from "@/types";

export function useTeachers(schoolId?: string | null) {
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let query = supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .eq("role", "teacher")
      .order("full_name", { ascending: true });
    if (schoolId) query = query.eq("school_id", schoolId);
    query.then(({ data }) => {
      setTeachers((data ?? []) as Profile[]);
      setLoading(false);
    });
  }, [schoolId]);

  return { teachers, loading };
}
