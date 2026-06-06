"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Standard } from "@/types";

export function useStandards(standardSetId?: string | null, schoolId?: string | null) {
  const [standards, setStandards] = useState<Standard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      let query = supabase.from("standards").select("*").order("code");

      if (standardSetId) {
        query = query.eq("standard_set_id", standardSetId);
      } else if (schoolId) {
        // Get standard sets this school has subscribed to via school_curricula
        const { data: curricula } = await supabase
          .from("school_curricula")
          .select("standard_set_id")
          .eq("school_id", schoolId);
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
  }, [standardSetId, schoolId]);

  const byStrand = standards.reduce<Record<string, Standard[]>>((acc, s) => {
    if (!acc[s.strand]) acc[s.strand] = [];
    acc[s.strand].push(s);
    return acc;
  }, {});

  return { standards, byStrand, loading };
}
