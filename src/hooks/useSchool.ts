"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useSchool(schoolId: string | null | undefined) {
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!schoolId) { setIsActive(null); setLoading(false); return; }
    setLoading(true);
    supabase
      .from("schools")
      .select("is_active")
      .eq("id", schoolId)
      .single()
      .then(({ data }) => {
        setIsActive(data?.is_active ?? null);
        setLoading(false);
      });
  }, [schoolId]);

  return { isActive, loading };
}
