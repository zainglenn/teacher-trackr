"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { AppNotification } from "@/hooks/useNotifications";

export function useLeadershipNotifications(
  userId: string | null,
  schoolId: string | null,
  isHod: boolean
): AppNotification[] {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!userId || !schoolId) return;

    async function load() {
      const results: AppNotification[] = [];

      // Teacher: new recognitions in the last 14 days
      if (!isHod) {
        const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const { data: recog } = await supabase
          .from("recognitions")
          .select("id, note, created_at")
          .eq("teacher_id", userId)
          .gte("created_at", cutoff)
          .order("created_at", { ascending: false });

        for (const r of recog ?? []) {
          results.push({
            id: `recognition-${r.id}`,
            severity: "info",
            category: "review",
            title: "Recognition from your HOD",
            body: (r.note as string).slice(0, 100),
            actionView: "department",
          });
        }
      }

      // Teacher + HOD: overdue action items assigned to them
      const today = new Date().toISOString().split("T")[0];
      const { data: actions } = await supabase
        .from("action_items")
        .select("id, description, due_date")
        .eq("assignee_id", userId)
        .is("completed_at", null)
        .lt("due_date", today);

      for (const a of actions ?? []) {
        results.push({
          id: `action-overdue-${a.id}`,
          severity: "warning",
          category: "review",
          title: "Overdue action item",
          body: a.description as string,
          actionView: "department",
        });
      }

      setNotifications(results);
    }

    load();
  }, [userId, schoolId, isHod]);

  return notifications;
}
