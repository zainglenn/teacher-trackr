"use client";

import { useState } from "react";
import { PageContainer } from "@/components/PageContainer";
import { LTPDetailView } from "@/components/LTPDetailView";
import { UnitPlanView } from "@/components/ltp/UnitPlanView";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ClipboardList, Eye, Pencil, Sparkles, Loader2, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Standard } from "@/types";
import { useLongTermPlans } from "@/hooks/useLongTermPlans";
import { useTeachers } from "@/hooks/useTeachers";
import { supabase } from "@/lib/supabase";
import { ltpAggregateStatus, COMPUTED_LTP_STATUS_CONFIG } from "@/lib/ltpStatus";

interface LongTermPlanViewProps {
  teacherId: string;
  isHod: boolean;
  standards: Standard[];
}

export function LongTermPlanView({ teacherId, isHod, standards }: LongTermPlanViewProps) {
  const { plans, loading, createLTP, updateLTP, setStatus, deleteLTP, addUnit, updateUnit, deleteUnit, setUnitStandards, batchAddUnits, assignUnit, submitUnit, withdrawUnit, approveUnit, requestUnitRevision, reopenUnit } =
    useLongTermPlans(teacherId, isHod);
  const { teachers } = useTeachers();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  // New LTP dialog state
  const [newLTPOpen, setNewLTPOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newYear, setNewYear] = useState("2025-2026");
  const [newUnitCount, setNewUnitCount] = useState("9");
  const [creating, setCreating] = useState(false);
  const [drafting, setDrafting] = useState(false);

  if (loading) return null;

  const myPlans = isHod ? plans : plans.filter((p) => p.teacher_id === teacherId);

  // Drill into a unit plan
  const selectedPlan = myPlans.find((p) => p.id === selectedPlanId);
  const selectedUnit = selectedPlan?.units?.find((u) => u.id === selectedUnitId);

  if (selectedPlan && selectedUnit) {
    return (
      <UnitPlanView
        plan={selectedPlan}
        unit={selectedUnit}
        standards={standards}
        currentUserId={teacherId}
        isHod={isHod}
        onBack={() => setSelectedUnitId(null)}
        updateUnit={updateUnit}
        setUnitStandards={setUnitStandards}
        submitUnit={submitUnit}
        withdrawUnit={withdrawUnit}
        approveUnit={isHod ? approveUnit : undefined}
        requestUnitRevision={isHod ? requestUnitRevision : undefined}
        reopenUnit={isHod ? reopenUnit : undefined}
      />
    );
  }

  // Drill into a plan detail view
  if (selectedPlan) {
    const allLTPStandardIds = myPlans.flatMap((p) =>
      p.units?.flatMap((u) => u.standards?.map((s) => s.id) ?? []) ?? []
    );
    return (
      <LTPDetailView
        plan={selectedPlan}
        isHod={isHod}
        standards={standards}
        teachers={teachers}
        currentUserId={teacherId}
        onBack={() => setSelectedPlanId(null)}
        onOpenUnit={(unitId) => setSelectedUnitId(unitId)}
        addUnit={addUnit}
        updateUnit={updateUnit}
        deleteUnit={deleteUnit}
        setUnitStandards={setUnitStandards}
        setStatus={setStatus}
        assignUnit={assignUnit}
        allLTPStandardIds={allLTPStandardIds}
      />
    );
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    const plan = await createLTP(newTitle.trim(), newYear);
    setCreating(false);
    setNewLTPOpen(false);
    setNewTitle("");
    if (plan) setSelectedPlanId(plan.id);
  }

  async function handleDraftFullYear() {
    if (!newTitle.trim()) return;
    setDrafting(true);
    try {
      const plan = await createLTP(newTitle.trim(), newYear);
      if (!plan) return;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/ai/draft-ltp", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ unitCount: parseInt(newUnitCount) || 9, allStandards: standards }),
      });
      const json = await res.json();
      if (json.units) {
        await batchAddUnits(plan.id, json.units.map((u: { term: number; unit_number: number; title: string; big_idea: string; duration_weeks: number; assessment_type: string; sort_order: number; standardIds: string[] }) => ({
          unit: { term: u.term, unit_number: u.unit_number, title: u.title, big_idea: u.big_idea, duration_weeks: u.duration_weeks, assessment_type: u.assessment_type, sort_order: u.sort_order },
          standardIds: u.standardIds,
        })));
        setSelectedPlanId(plan.id);
      }
    } finally {
      setDrafting(false);
      setNewLTPOpen(false);
      setNewTitle("");
    }
  }

  return (
    <PageContainer
      title="Long Term Plan"
      description="Year-long curriculum overview organised by term and unit"
      action={
        !isHod && (
          <Button size="sm" onClick={() => setNewLTPOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New LTP
          </Button>
        )
      }
    >
      {myPlans.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No long term plans yet</p>
          {!isHod && (
            <Button size="sm" className="mt-4" onClick={() => setNewLTPOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Create your first LTP
            </Button>
          )}
        </div>
      )}

      <div className="space-y-2">
        {myPlans.map((plan) => {
          const totalUnits = plan.units?.length ?? 0;
          const mappedIds = new Set(plan.units?.flatMap((u) => u.standards?.map((s) => s.id) ?? []) ?? []);
          const { computed } = ltpAggregateStatus((plan.units ?? []).map((u) => ({ status: u.status ?? "draft" })));
          const statusCfg = COMPUTED_LTP_STATUS_CONFIG[computed];
          const hasRevisions = (plan.units ?? []).filter((u) => u.status === "revision" && u.hod_feedback);

          return (
            <Card key={plan.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{plan.title}</p>
                    <Badge variant="outline" className={`text-xs ${statusCfg.className}`}>{statusCfg.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {plan.school_year} · {totalUnits} unit{totalUnits !== 1 ? "s" : ""} · {mappedIds.size}/{standards.length} standards mapped
                    {isHod && plan.teacher && ` · ${plan.teacher.full_name ?? plan.teacher.email}`}
                  </p>
                  {hasRevisions.length > 0 && (
                    <p className="text-xs text-rose-600 italic mt-0.5 truncate max-w-md">
                      {hasRevisions.length} unit{hasRevisions.length !== 1 ? "s" : ""} need revision
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
                    onClick={() => setSelectedPlanId(plan.id)}>
                    {isHod ? <><Eye className="h-3 w-3" /> View</> : <><Pencil className="h-3 w-3" /> Open</>}
                  </Button>
                  {!isHod && (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                      onClick={() => { if (confirm("Delete this LTP and all its units?")) deleteLTP(plan.id); }}>
                      ×
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* New LTP dialog */}
      <Dialog open={newLTPOpen} onOpenChange={(o) => !o && setNewLTPOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Long Term Plan</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input placeholder="e.g. Grade 6 English 2025–2026"
                value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                autoFocus onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
            </div>
            <div className="space-y-1.5">
              <Label>Academic Year</Label>
              <Select value={newYear} onValueChange={(v) => v && setNewYear(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024-2025">2024–2025</SelectItem>
                  <SelectItem value="2025-2026">2025–2026</SelectItem>
                  <SelectItem value="2026-2027">2026–2027</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Number of units <span className="text-muted-foreground text-xs">(for AI draft)</span></Label>
              <Input type="number" min={6} max={15} value={newUnitCount} onChange={(e) => setNewUnitCount(e.target.value)} />
            </div>
            <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <Wand2 className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-violet-700">AI Draft Full Year</p>
                  <p className="text-xs text-violet-600">Generate a complete plan with all {standards.length} standards across {newUnitCount} units. ~10 seconds.</p>
                </div>
              </div>
              <Button className="w-full h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white gap-1"
                onClick={handleDraftFullYear} disabled={drafting || !newTitle.trim()}>
                {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {drafting ? `Drafting ${newUnitCount} units...` : "AI Draft Full Year"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewLTPOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !newTitle.trim()}>
              {creating ? "Creating..." : "Create Empty"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
