"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Standard } from "@/types";

export function useStandards(
  standardSetId?: string | null,
  schoolId?: string | null,
  subjectId?: string | null,
  gradeLevelId?: string | null,
) {
  const [standards, setStandards] = useState<Standard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Don't load anything until we know which school we're in — prevents loading all standards on first render
      if (!standardSetId && !schoolId) {
        setStandards([]);
        setLoading(false);
        return;
      }

      let query = supabase.from("standards").select("*").order("code");

      if (standardSetId) {
        // Explicit standard set — use directly
        query = query.eq("standard_set_id", standardSetId);
      } else if (schoolId) {
        // Find the standard set assigned to this school for the active subject+grade context
        let curricQuery = supabase
          .from("school_curricula")
          .select("standard_set_id")
          .eq("school_id", schoolId);

        if (subjectId) curricQuery = curricQuery.eq("subject_id", subjectId);
        if (gradeLevelId) curricQuery = curricQuery.eq("grade_level_id", gradeLevelId);

        const { data: curricula } = await curricQuery;
        const setIds = (curricula ?? []).map((c) => c.standard_set_id);
        if (!setIds.length) {
          setStandards([]);
          setLoading(false);
          return;
        }
        query = query.in("standard_set_id", setIds);
      }

      const { data } = await query;
      setStandards((data ?? []) as Standard[]);
      setLoading(false);
    }
    load();
  }, [standardSetId, schoolId, subjectId, gradeLevelId]);

  const byStrand = standards.reduce<Record<string, Standard[]>>((acc, s) => {
    if (!acc[s.strand]) acc[s.strand] = [];
    acc[s.strand].push(s);
    return acc;
  }, {});

  return { standards, byStrand, loading };
}
