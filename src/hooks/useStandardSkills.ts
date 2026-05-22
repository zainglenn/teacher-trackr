"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface StandardSkill {
  id: string;
  standard_id: string;
  code: string;
  description: string;
  genre: string | null;
  sort_order: number;
}

export function useStandardSkills(standardId: string | null) {
  const [skills, setSkills] = useState<StandardSkill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!standardId) { setLoading(false); return; }
    supabase
      .from("standard_skills")
      .select("*")
      .eq("standard_id", standardId)
      .order("sort_order")
      .then(({ data }: { data: StandardSkill[] | null }) => {
        setSkills(data ?? []);
        setLoading(false);
      });
  }, [standardId]);

  // Group by genre (null genre → flat list)
  const byGenre = skills.reduce<Record<string, StandardSkill[]>>((acc, skill) => {
    const key = skill.genre ?? "__none__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(skill);
    return acc;
  }, {});

  const hasGenres = skills.some((s) => s.genre !== null);

  return { skills, byGenre, hasGenres, loading };
}
