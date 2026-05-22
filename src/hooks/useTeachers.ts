"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Profile } from "@/types";

export function useTeachers() {
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .eq("role", "teacher")
      .order("full_name", { ascending: true })
      .then(({ data }) => {
        setTeachers((data ?? []) as Profile[]);
        setLoading(false);
      });
  }, []);

  return { teachers, loading };
}
