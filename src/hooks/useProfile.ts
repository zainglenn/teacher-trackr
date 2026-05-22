"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Profile } from "@/types";

export function useProfile(userId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()
      .then(({ data }: { data: Profile | null }) => {
        setProfile(data);
        setLoading(false);
      });
  }, [userId]);

  return { profile, loading, role: profile?.role ?? "teacher" };
}
