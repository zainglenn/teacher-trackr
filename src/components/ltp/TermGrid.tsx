"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { LTPUnit } from "@/types";

const TERMS = [1, 2, 3] as const;

interface TermGridProps {
  units: LTPUnit[];
  canEdit: boolean;
  isHod: boolean;
  currentUserId: string;
  onAddUnit: (term: number) => void;
  renderUnitCard: (unit: LTPUnit, term: number) => React.ReactNode;
}

export function TermGrid({ units, canEdit, isHod, currentUserId, onAddUnit, renderUnitCard }: TermGridProps) {
  const termSlots = TERMS.map((term) =>
    units.filter((u) => u.term === term).sort((a, b) => a.sort_order - b.sort_order)
  );

  const rowCount = termSlots.reduce((max, slot) => Math.max(max, slot.length), 0);

  const rows: number[] = [];
  for (let i = 0; i < rowCount; i++) rows.push(i);

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Term header row */}
      <div className="grid grid-cols-3 border-b bg-muted/40">
        {TERMS.map((term, i) => {
          const termUnits = termSlots[i];
          const totalWeeks = termUnits.reduce((s, u) => s + u.duration_weeks, 0);
          return (
            <div key={term} className={`flex items-center justify-between px-3 py-2.5 gap-2 ${i < 2 ? "border-r" : ""}`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold uppercase tracking-wide">Term {term}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {termUnits.length} unit{termUnits.length !== 1 ? "s" : ""}
                  {totalWeeks > 0 ? ` · ${totalWeeks}w` : ""}
                </span>
              </div>
              {canEdit && (
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0" onClick={() => onAddUnit(term)}>
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {rowCount === 0 && (
        <div className="py-10 text-center">
          <p className="text-xs text-muted-foreground italic">
            {canEdit ? "No units yet — use + to add units to each term" : "No units"}
          </p>
        </div>
      )}

      {/* One row per unit slot */}
      {rows.map((rowIdx) => (
        <div key={rowIdx} className={`grid grid-cols-3 ${rowIdx < rowCount - 1 ? "border-b" : ""}`}>
          {TERMS.map((term, termIdx) => {
            const unit = termSlots[termIdx][rowIdx] ?? null;
            return (
              <div key={term} className={`p-2 ${termIdx < 2 ? "border-r" : ""} ${!unit ? "bg-muted/20" : ""}`}>
                {unit ? (
                  renderUnitCard(unit, term)
                ) : canEdit ? (
                  <button
                    className="w-full h-full min-h-[60px] flex items-center justify-center text-xs text-muted-foreground/50 border border-dashed rounded-md hover:bg-muted/40 hover:text-muted-foreground transition-colors"
                    onClick={() => onAddUnit(term)}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add unit
                  </button>
                ) : (
                  <div className="min-h-[60px]" />
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Add-another row at the bottom */}
      {canEdit && rowCount > 0 && (
        <div className="grid grid-cols-3 border-t">
          {TERMS.map((term, i) => (
            <div key={term} className={`p-2 ${i < 2 ? "border-r" : ""}`}>
              <button
                className="w-full text-xs text-muted-foreground/50 border border-dashed rounded-md py-1.5 hover:bg-muted/40 hover:text-muted-foreground transition-colors"
                onClick={() => onAddUnit(term)}
              >
                + Add unit
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
