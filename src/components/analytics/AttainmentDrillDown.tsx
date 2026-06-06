"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AttainmentBadge } from "./AttainmentBadge";
import { StudentAttainmentRow } from "@/hooks/useAttainmentGrid";

const STRAND_FULL: Record<string, string> = {
  RL: "Reading Literature",
  RI: "Reading Informational Text",
  W: "Writing",
  SL: "Speaking & Listening",
  L: "Language",
};

const ATTAINMENT_ORDER = ["exceeding", "meeting", "approaching", "below", "not_assessed"] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  classId: string | null;
  strand: string | null;
  className: string;
  rows: StudentAttainmentRow[];
}

export function AttainmentDrillDown({ open, onClose, classId, strand, className, rows }: Props) {
  const filtered = rows.filter((r) => r.classId === classId && strand && r.attainment !== undefined);
  // For the drill-down we show students for this class. We can't easily filter by strand here
  // since rows are per standard_id, not per student. Instead we receive pre-filtered rows from parent.
  const strandLabel = strand ? (STRAND_FULL[strand] ?? strand) : "";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[520px] sm:w-[600px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="text-base font-semibold">{className}</SheetTitle>
          <p className="text-sm text-muted-foreground">{strandLabel} — student attainment</p>
        </SheetHeader>

        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-muted-foreground">No attainment data for this class and strand.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-1">
            {/* Group by attainment level */}
            {ATTAINMENT_ORDER.map((level) => {
              const group = filtered.filter((r) => r.attainment === level);
              if (group.length === 0) return null;
              return (
                <div key={level} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AttainmentBadge attainment={level} size="md" />
                    <span className="text-xs text-muted-foreground">{group.length} student{group.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="space-y-1 pl-1">
                    {group.sort((a, b) => a.studentName.localeCompare(b.studentName)).map((r) => (
                      <div key={r.studentId} className="text-sm text-foreground py-1 px-3 rounded bg-muted/40">
                        {r.studentName}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
