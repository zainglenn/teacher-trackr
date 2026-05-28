"use client";

import { useState, useEffect, useCallback } from "react";
import { useClassAssignments } from "./useClassAssignments";
import { ClassAssignment } from "@/types";

const STORAGE_KEY = "ct_active_context";

export interface ActiveContext {
  subjectId: string;
  gradeLevelId: string;
}

function loadFromStorage(): ActiveContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveContext;
  } catch {
    return null;
  }
}

function saveToStorage(ctx: ActiveContext) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
}

function isValidContext(ctx: ActiveContext, assignments: ClassAssignment[]): boolean {
  return assignments.some(
    (a) => a.subject_id === ctx.subjectId && a.grade_level_id === ctx.gradeLevelId
  );
}

export function useActiveContext(currentUserId: string | null) {
  const { assignments, loading } = useClassAssignments(
    currentUserId ? { teacherId: currentUserId } : {}
  );
  const [activeContext, setActiveContextState] = useState<ActiveContext | null>(null);

  useEffect(() => {
    if (loading || !assignments.length) return;

    const stored = loadFromStorage();
    if (stored && isValidContext(stored, assignments)) {
      setActiveContextState(stored);
    } else {
      const first: ActiveContext = {
        subjectId: assignments[0].subject_id,
        gradeLevelId: assignments[0].grade_level_id,
      };
      setActiveContextState(first);
      saveToStorage(first);
    }
  }, [loading, assignments]);

  const setActiveContext = useCallback((ctx: ActiveContext) => {
    setActiveContextState(ctx);
    saveToStorage(ctx);
  }, []);

  return { activeContext, setActiveContext, assignments, loading };
}
