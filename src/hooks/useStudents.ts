"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Student } from "@/types";

export function useStudents(teacherId: string) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("students")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("full_name")
      .then(({ data }: { data: Student[] | null }) => {
        setStudents(data ?? []);
        setLoading(false);
      });
  }, [teacherId]);

  async function addStudent(fullName: string, studentNumber?: string) {
    const { data } = await supabase
      .from("students")
      .insert({ teacher_id: teacherId, full_name: fullName, student_number: studentNumber ?? null })
      .select()
      .single();
    if (data) setStudents((prev) => [...prev, data].sort((a, b) => a.full_name.localeCompare(b.full_name)));
  }

  async function removeStudent(id: string) {
    await supabase.from("students").delete().eq("id", id);
    setStudents((prev) => prev.filter((s) => s.id !== id));
  }

  return { students, loading, addStudent, removeStudent };
}
