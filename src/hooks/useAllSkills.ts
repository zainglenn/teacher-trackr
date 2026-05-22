"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { StandardSkill } from "@/hooks/useStandardSkills";

export function useAllSkills() {
  const [skills, setSkills] = useState<StandardSkill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("standard_skills")
      .select("*")
      .order("sort_order")
      .then(({ data }: { data: StandardSkill[] | null }) => {
        setSkills(data ?? []);
        setLoading(false);
      });
  }, []);

  // Map: standard_id → skills[]
  const byStandardId = skills.reduce<Record<string, StandardSkill[]>>((acc, s) => {
    if (!acc[s.standard_id]) acc[s.standard_id] = [];
    acc[s.standard_id].push(s);
    return acc;
  }, {});

  // Map: standard_id → count
  const countByStandardId = Object.fromEntries(
    Object.entries(byStandardId).map(([id, list]) => [id, list.length])
  );

  return { skills, byStandardId, countByStandardId, loading };
}
