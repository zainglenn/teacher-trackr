"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Class, Profile } from "@/types";

export interface ClassWithTeacher extends Class {
  teacher: Pick<Profile, "id" | "full_name" | "email"> | null;
}

export function useAllClasses() {
  const [classes, setClasses] = useState<ClassWithTeacher[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data: rows } = await supabase.from("classes").select("*").order("name");
    if (!rows) { setLoading(false); return; }

    const teacherIds = [...new Set(rows.map((r) => r.teacher_id).filter(Boolean))];
    const { data: profiles } = teacherIds.length
      ? await supabase.from("profiles").select("id, full_name, email").in("id", teacherIds)
      : { data: [] };

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    setClasses(rows.map((r) => ({ ...r, teacher: profileMap.get(r.teacher_id) ?? null })));
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  async function createClass(name: string, teacherId: string, schoolYear?: string) {
    const { data } = await supabase
      .from("classes")
      .insert({ name: name.trim(), teacher_id: teacherId, school_year: schoolYear ?? "2024-25" })
      .select("*")
      .single();
    if (data) await fetch();
    return data as Class | null;
  }

  async function deleteClass(id: string) {
    await supabase.from("classes").delete().eq("id", id);
    setClasses((prev) => prev.filter((c) => c.id !== id));
  }

  async function reassignClass(id: string, teacherId: string) {
    await supabase.from("classes").update({ teacher_id: teacherId }).eq("id", id);
    await fetch();
  }

  return { classes, loading, createClass, deleteClass, reassignClass, refresh: fetch };
}
