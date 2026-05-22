"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Class } from "@/types";

export function useClasses(teacherId: string) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from("classes")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("name");
    setClasses(data ?? []);
    setLoading(false);
  }, [teacherId]);

  useEffect(() => { fetch(); }, [fetch]);

  async function addClass(name: string, schoolYear?: string) {
    const { data } = await supabase
      .from("classes")
      .insert({ teacher_id: teacherId, name: name.trim(), school_year: schoolYear ?? "2024-25" })
      .select()
      .single();
    if (data) setClasses((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data as Class | null;
  }

  async function removeClass(id: string) {
    await supabase.from("classes").delete().eq("id", id);
    setClasses((prev) => prev.filter((c) => c.id !== id));
  }

  return { classes, loading, addClass, removeClass };
}
