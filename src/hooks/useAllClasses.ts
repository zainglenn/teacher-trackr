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
    const { data } = await supabase
      .from("classes")
      .select("*, teacher:profiles!teacher_id(id, full_name, email)")
      .order("name");
    setClasses((data as ClassWithTeacher[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  async function createClass(name: string, teacherId: string, schoolYear?: string) {
    const { data } = await supabase
      .from("classes")
      .insert({ name: name.trim(), teacher_id: teacherId, school_year: schoolYear ?? "2024-25" })
      .select("*, teacher:profiles!teacher_id(id, full_name, email)")
      .single();
    if (data) setClasses((prev) => [...prev, data as ClassWithTeacher].sort((a, b) => a.name.localeCompare(b.name)));
    return data as ClassWithTeacher | null;
  }

  async function deleteClass(id: string) {
    await supabase.from("classes").delete().eq("id", id);
    setClasses((prev) => prev.filter((c) => c.id !== id));
  }

  async function reassignClass(id: string, teacherId: string) {
    const { data } = await supabase
      .from("classes")
      .update({ teacher_id: teacherId })
      .eq("id", id)
      .select("*, teacher:profiles!teacher_id(id, full_name, email)")
      .single();
    if (data) setClasses((prev) => prev.map((c) => c.id === id ? data as ClassWithTeacher : c));
  }

  return { classes, loading, createClass, deleteClass, reassignClass, refresh: fetch };
}
