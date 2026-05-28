"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Standard } from "@/types";

export function useStandards(standardSetId?: string | null) {
  const [standards, setStandards] = useState<Standard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let query = supabase.from("standards").select("*").order("code");
    if (standardSetId) {
      query = query.eq("standard_set_id", standardSetId);
    }
    query.then(({ data }: { data: Standard[] | null }) => {
      setStandards(data ?? []);
      setLoading(false);
    });
  }, [standardSetId]);

  const byStrand = standards.reduce<Record<string, Standard[]>>((acc, s) => {
    if (!acc[s.strand]) acc[s.strand] = [];
    acc[s.strand].push(s);
    return acc;
  }, {});

  return { standards, byStrand, loading };
}
