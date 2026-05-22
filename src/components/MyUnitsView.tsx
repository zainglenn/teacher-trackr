"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookMarked, ChevronRight } from "lucide-react";
import { Standard } from "@/types";
import { useAssignedUnits } from "@/hooks/useAssignedUnits";
import { UnitPlanView } from "@/components/ltp/UnitPlanView";
import { LTPStatusBadge } from "@/components/ltp/LTPStatusBadge";
import { StrandBadge } from "@/components/ltp/StrandBadge";

const TERM_LABEL = ["", "Term 1", "Term 2", "Term 3"];

interface MyUnitsViewProps {
  teacherId: string;
  standards: Standard[];
}

export function MyUnitsView({ teacherId, standards }: MyUnitsViewProps) {
  const { plans, assignedUnitIds, loading, updateUnit, setUnitStandards } = useAssignedUnits(teacherId);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Find selected unit + its parent plan
  if (selectedUnitId) {
    let selectedPlan = null;
    let selectedUnit = null;
    for (const plan of plans) {
      const unit = plan.units?.find((u) => u.id === selectedUnitId);
      if (unit) { selectedPlan = plan; selectedUnit = unit; break; }
    }
    if (selectedPlan && selectedUnit) {
      return (
        <UnitPlanView
          plan={selectedPlan}
          unit={selectedUnit}
          standards={standards}
          currentUserId={teacherId}
          isHod={false}
          onBack={() => setSelectedUnitId(null)}
          updateUnit={updateUnit}
          setUnitStandards={setUnitStandards}
        />
      );
    }
  }

  const allAssignedUnits = plans.flatMap((plan) =>
    (plan.units ?? [])
      .filter((u) => assignedUnitIds.has(u.id))
      .map((u) => ({ unit: u, plan }))
  ).sort((a, b) => a.unit.term - b.unit.term || a.unit.sort_order - b.unit.sort_order);

  if (allAssignedUnits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <BookMarked className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No units assigned to you yet</p>
        <p className="text-xs text-muted-foreground/70 max-w-xs">
          Your HOD will assign units from the Long Term Plan. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">My Assigned Units</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {allAssignedUnits.length} unit{allAssignedUnits.length !== 1 ? "s" : ""} assigned to you
        </p>
      </div>

      <div className="space-y-2">
        {allAssignedUnits.map(({ unit, plan }) => {
          const mappedCount = unit.standards?.length ?? 0;
          return (
            <button
              key={unit.id}
              onClick={() => setSelectedUnitId(unit.id)}
              className="w-full text-left rounded-lg border bg-card p-4 hover:bg-muted/30 transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">{plan.title}</span>
                    <LTPStatusBadge status={plan.status} />
                    <Badge variant="outline" className="text-xs py-0">{TERM_LABEL[unit.term]}</Badge>
                  </div>
                  <p className="font-medium text-sm leading-snug">{unit.title}</p>
                  {unit.big_idea && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{unit.big_idea}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">{unit.duration_weeks}w</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground capitalize">{unit.assessment_type}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{mappedCount} standard{mappedCount !== 1 ? "s" : ""}</span>
                  </div>
                  {unit.standards && unit.standards.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {unit.standards.slice(0, 8).map((s) => (
                        <StrandBadge key={s.id} code={s.code} />
                      ))}
                      {unit.standards.length > 8 && (
                        <span className="text-xs text-muted-foreground self-center">+{unit.standards.length - 8}</span>
                      )}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-1 group-hover:text-muted-foreground transition-colors" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
