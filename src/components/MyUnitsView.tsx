"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookMarked, ChevronRight, Lock, XCircle } from "lucide-react";
import { Standard } from "@/types";
import { useAssignedUnits } from "@/hooks/useAssignedUnits";
import { UnitPlanView } from "@/components/ltp/UnitPlanView";
import { StrandBadge } from "@/components/ltp/StrandBadge";
import { UNIT_STATUS_CONFIG } from "@/lib/ltpStatus";

const TERM_LABEL = ["", "Term 1", "Term 2", "Term 3"];

interface MyUnitsViewProps {
  teacherId: string;
  standards: Standard[];
}

export function MyUnitsView({ teacherId, standards }: MyUnitsViewProps) {
  const { plans, assignedUnitIds, loading, updateUnit, setUnitStandards, submitUnit, withdrawUnit } = useAssignedUnits(teacherId);
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
          submitUnit={submitUnit}
          withdrawUnit={withdrawUnit}
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

  // Group by term
  const byTerm = [1, 2, 3].map((term) => ({
    term,
    label: TERM_LABEL[term],
    units: allAssignedUnits.filter(({ unit }) => unit.term === term),
  })).filter(({ units }) => units.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">My Units</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {allAssignedUnits.length} unit{allAssignedUnits.length !== 1 ? "s" : ""} assigned to you
        </p>
      </div>

      {byTerm.map(({ term, label, units }) => (
        <div key={term}>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
          <div className="border border-border rounded-[var(--radius)] divide-y divide-border bg-card">
            {units.map(({ unit, plan }) => {
              const statusCfg = UNIT_STATUS_CONFIG[unit.status ?? "draft"];
              const strands = [...new Set((unit.standards ?? []).map((s) => s.code.split(".")[0]))];
              const isRejected = unit.status === "rejected";
              return (
                <div key={unit.id}>
                  {isRejected && (
                    <div className="flex items-start gap-2 px-3 py-1.5 bg-red-50 border-b border-red-100">
                      <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-600">
                        <span className="font-semibold text-red-700">Rejected</span>
                        {unit.rejection_reason && ` — ${unit.rejection_reason}`}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedUnitId(unit.id)}
                    className="w-full text-left flex items-center gap-3 px-3 h-11 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
                  >
                    <span className="text-xs text-muted-foreground shrink-0 w-16 truncate hidden sm:block">{plan.title}</span>
                    <span className="text-sm font-medium flex-1 min-w-0 truncate">{unit.title}</span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {strands.map((strand) => (
                        <StrandBadge key={strand} code={strand} variant="muted" />
                      ))}
                    </span>
                    <Badge variant="outline" className={`text-xs shrink-0 ${statusCfg.className}`}>
                      {statusCfg.label}
                    </Badge>
                    {unit.status === "published"
                      ? <Lock className="h-3.5 w-3.5 text-indigo-400 shrink-0" aria-label="Plan is published and locked" />
                      : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" aria-hidden="true" />
                    }
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
