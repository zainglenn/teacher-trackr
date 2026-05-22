"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Standard } from "@/types";

export function useStandards() {
  const [standards, setStandards] = useState<Standard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("standards")
      .select("*")
      .order("code")
      .then(({ data }: { data: Standard[] | null }) => {
        setStandards(data ?? []);
        setLoading(false);
      });
  }, []);

  const byStrand = standards.reduce<Record<string, Standard[]>>((acc, s) => {
    if (!acc[s.strand]) acc[s.strand] = [];
    acc[s.strand].push(s);
    return acc;
  }, {});

  return { standards, byStrand, loading };
}
