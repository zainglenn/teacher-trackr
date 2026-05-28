"use client";

import { useRef, useEffect, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { ClassAssignment, Subject, GradeLevel } from "@/types";
import { getSubjectSlotStyle, type SubjectSlot } from "@/lib/subjectSlot";
import type { ActiveContext } from "@/hooks/useActiveContext";

interface SubjectGradeContextProps {
  activeContext: ActiveContext | null;
  assignments: ClassAssignment[];
  onContextChange: (ctx: ActiveContext) => void;
}

function getLabel(assignment: ClassAssignment): string {
  const grade = (assignment.grade_level as GradeLevel | undefined)?.name ?? "—";
  const subject = (assignment.subject as Subject | undefined)?.name ?? "—";
  return `${grade} · ${subject}`;
}

export function SubjectGradeContext({ activeContext, assignments, onContextChange }: SubjectGradeContextProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!assignments.length || !activeContext) return null;

  const activeAssignment = assignments.find(
    (a) => a.subject_id === activeContext.subjectId && a.grade_level_id === activeContext.gradeLevelId
  );
  const activeSubject = activeAssignment?.subject as Subject | undefined;
  const slot = (activeSubject?.slot ?? 1) as SubjectSlot;
  const slotStyle = getSubjectSlotStyle(slot);

  const isSingleAssignment = assignments.length === 1;

  return (
    <div ref={ref} className="relative px-3 py-2">
      <button
        onClick={() => !isSingleAssignment && setOpen((v) => !v)}
        aria-haspopup={isSingleAssignment ? undefined : "listbox"}
        aria-expanded={isSingleAssignment ? undefined : open}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs font-medium transition-colors
          ${isSingleAssignment
            ? "cursor-default"
            : "hover:bg-sidebar-accent/60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          }`}
        style={{ color: slotStyle.color }}
      >
        <span
          className="inline-block h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: slotStyle.accentColor }}
        />
        <span className="truncate flex-1">
          {activeAssignment ? getLabel(activeAssignment) : "—"}
        </span>
        {!isSingleAssignment && (
          <ChevronDown
            className={`h-3 w-3 shrink-0 transition-transform text-sidebar-foreground/50 ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Switch context"
          className="absolute left-3 right-3 top-full mt-1 z-50 rounded-md border border-sidebar-border bg-sidebar shadow-md overflow-hidden"
        >
          {assignments.map((a) => {
            const isActive =
              a.subject_id === activeContext.subjectId &&
              a.grade_level_id === activeContext.gradeLevelId;
            const aSubject = a.subject as Subject | undefined;
            const aSlot = (aSubject?.slot ?? 1) as SubjectSlot;
            const aStyle = getSubjectSlotStyle(aSlot);

            return (
              <button
                key={a.id}
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  onContextChange({ subjectId: a.subject_id, gradeLevelId: a.grade_level_id });
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-sidebar-accent/60 transition-colors focus-visible:outline-none focus-visible:bg-sidebar-accent/60"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: aStyle.accentColor }}
                />
                <span className="flex-1 font-medium" style={{ color: aStyle.color }}>
                  {getLabel(a)}
                </span>
                {a.is_lead && (
                  <span className="text-[10px] text-muted-foreground font-normal">Lead</span>
                )}
                {isActive && <Check className="h-3 w-3 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
