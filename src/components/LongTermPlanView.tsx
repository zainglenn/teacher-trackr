"use client";

import { useState, useEffect } from "react";
import { PageContainer } from "@/components/PageContainer";
import { LTPDetailView } from "@/components/LTPDetailView";
import { UnitPlanView } from "@/components/ltp/UnitPlanView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal, ModalFooter, ModalCancel } from "@/components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ClipboardList, Eye, Sparkles, Loader2, Wand2, Users, AlertCircle, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Standard } from "@/types";
import { useLongTermPlans } from "@/hooks/useLongTermPlans";
import { useTeachers } from "@/hooks/useTeachers";
import { supabase } from "@/lib/supabase";
import { ltpAggregateStatus, COMPUTED_LTP_STATUS_CONFIG } from "@/lib/ltpStatus";
import { schoolYears } from "@/lib/utils";

interface LongTermPlanViewProps {
  teacherId: string;
  isHod: boolean;
  standards: Standard[];
  initialPlanId?: string | null;
  initialUnitId?: string | null;
  onInitialConsumed?: () => void;
  contextLabel?: string | null;
  subjectId?: string | null;
  gradeLevelId?: string | null;
}

export function LongTermPlanView({ teacherId, isHod, standards, initialPlanId, initialUnitId, onInitialConsumed, contextLabel, subjectId, gradeLevelId }: LongTermPlanViewProps) {
  const { plans, loading, createLTP, updateLTP, setStatus, deleteLTP, addUnit, updateUnit, deleteUnit, setUnitStandards, batchAddUnits, assignUnit, submitUnit, withdrawUnit, approveUnit, requestUnitRevision, reopenUnit, rejectUnit, publishPlan, getMyRole, setMemberRole } =
    useLongTermPlans(teacherId, isHod, { subjectId, gradeLevelId });
  const { teachers } = useTeachers();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(initialPlanId ?? null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(initialUnitId ?? null);
  const [readOnlyPlanId, setReadOnlyPlanId] = useState<string | null>(null);

  // New LTP dialog state
  const [newLTPOpen, setNewLTPOpen] = useState(false);
  const [newYear, setNewYear] = useState(() => schoolYears()[0]);
  const [newUnitCount, setNewUnitCount] = useState("9");
  const [creating, setCreating] = useState(false);
  const [drafting, setDrafting] = useState(false);
  // Grade+subject selection
  interface GradeSubjectOption { gsId: string; subjectId: string; gradeId: string; subjectName: string; gradeName: string }
  const [gradeSubjectOptions, setGradeSubjectOptions] = useState<GradeSubjectOption[]>([]);
  const [selectedGS, setSelectedGS] = useState<GradeSubjectOption | null>(null);
  const [existingPlanForSelection, setExistingPlanForSelection] = useState<string | null>(null);

  // Load grade_subjects when modal opens
  useEffect(() => {
    if (!newLTPOpen || !isHod) return;
    supabase
      .from("grade_subjects")
      .select("id, subject_id, grade_level_id, subjects:subject_id(id, name), grade_levels:grade_level_id(id, name)")
      .then(({ data }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const opts: GradeSubjectOption[] = (data ?? []).map((row: any) => ({
          gsId: row.id,
          subjectId: row.subject_id,
          gradeId: row.grade_level_id,
          subjectName: row.subjects?.name ?? "Unknown",
          gradeName: row.grade_levels?.name ?? "Unknown",
        }));
        setGradeSubjectOptions(opts);
        if (opts.length === 1) setSelectedGS(opts[0]);
      });
  }, [newLTPOpen, isHod]);

  // Check for duplicate plan when selection or year changes
  useEffect(() => {
    if (!selectedGS || !newYear) { setExistingPlanForSelection(null); return; }
    const dup = plans.find(p =>
      p.subject_id === selectedGS.subjectId &&
      p.grade_level_id === selectedGS.gradeId &&
      p.school_year === newYear
    );
    setExistingPlanForSelection(dup?.id ?? null);
  }, [selectedGS, newYear, plans]);

  const autoTitle = selectedGS ? `${selectedGS.gradeName} ${selectedGS.subjectName} ${newYear}` : "";

  // Consume initial selection once plans have loaded
  useState(() => {
    if (initialPlanId && onInitialConsumed) onInitialConsumed();
  });

  if (loading) return null;

  // RLS already filters to plans the user can see; no client-side filter needed
  const myPlans = plans;

  // Drill into a unit plan
  const selectedPlan = myPlans.find((p) => p.id === selectedPlanId);
  const selectedUnit = selectedPlan?.units?.find((u) => u.id === selectedUnitId);

  if (selectedPlan && selectedUnit) {
    const myRole = getMyRole(selectedPlan.id);
    const canEdit = myRole === "hod" || myRole === "lead";
    return (
      <UnitPlanView
        plan={selectedPlan}
        unit={selectedUnit}
        standards={standards}
        currentUserId={teacherId}
        isHod={isHod}
        canEdit={canEdit}
        onBack={() => setSelectedUnitId(null)}
        updateUnit={updateUnit}
        setUnitStandards={setUnitStandards}
        submitUnit={myRole === "lead" ? submitUnit : undefined}
        withdrawUnit={myRole === "lead" ? withdrawUnit : undefined}
        approveUnit={isHod ? approveUnit : undefined}
        requestUnitRevision={isHod ? requestUnitRevision : undefined}
        reopenUnit={isHod ? reopenUnit : undefined}
      />
    );
  }

  // Read-only view for teachers browsing published plans
  const readOnlyPlan = readOnlyPlanId ? plans.find((p) => p.id === readOnlyPlanId) : null;
  if (readOnlyPlan) {
    return (
      <LTPDetailView
        plan={readOnlyPlan}
        isHod={false}
        myRole={null}
        standards={standards}
        teachers={[]}
        currentUserId={teacherId}
        onBack={() => setReadOnlyPlanId(null)}
        onOpenUnit={() => {}}
        addUnit={async () => null}
        updateUnit={async () => {}}
        deleteUnit={async () => {}}
        setUnitStandards={async () => {}}
        setStatus={async () => {}}
        assignUnit={async () => {}}
        setMemberRole={async () => {}}
        allLTPStandardIds={[]}
      />
    );
  }

  // Drill into a plan detail view
  if (selectedPlan) {
    const myRole = getMyRole(selectedPlan.id);
    const allLTPStandardIds = myPlans.flatMap((p) =>
      p.units?.flatMap((u) => u.standards?.map((s) => s.id) ?? []) ?? []
    );
    return (
      <LTPDetailView
        plan={selectedPlan}
        isHod={isHod}
        myRole={myRole}
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
        setMemberRole={setMemberRole}
        publishPlan={isHod ? publishPlan : undefined}
        allLTPStandardIds={allLTPStandardIds}
      />
    );
  }

  async function handleCreate() {
    if (!autoTitle || !selectedGS) return;
    setCreating(true);
    const plan = await createLTP(autoTitle, newYear, selectedGS.subjectId, selectedGS.gradeId);
    setCreating(false);
    setNewLTPOpen(false);
    setSelectedGS(null);
    if (plan) setSelectedPlanId(plan.id);
  }

  async function handleDraftFullYear() {
    if (!autoTitle || !selectedGS) return;
    setDrafting(true);
    try {
      const plan = await createLTP(autoTitle, newYear, selectedGS.subjectId, selectedGS.gradeId);
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
      setSelectedGS(null);
    }
  }

  return (
    <PageContainer
      title="Master Plans"
      description={contextLabel ?? "Year-long curriculum overview organised by term and unit"}
      action={
        isHod && (
          <Button size="sm" variant="outline" onClick={() => setNewLTPOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New Plan
          </Button>
        )
      }
    >
      {myPlans.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground/25 mb-3" />
          <p className="text-sm font-medium text-foreground">No long term plans yet</p>
          {isHod ? (
            <p className="text-xs text-muted-foreground mt-1">Create a plan to get started.</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Your HOD will create and assign a plan to your class.
            </p>
          )}
        </div>
      )}

      {/* Published plans from other teachers — teacher read-only browsing */}
      {!isHod && (() => {
        const publishedByOthers = plans.filter((p) => p.status === "published" && !getMyRole(p.id));
        if (publishedByOthers.length === 0) return null;
        return (
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
              <Lock className="h-3 w-3" aria-hidden="true" /> Published Plans
            </p>
            <div className="border border-border rounded-[var(--radius)] divide-y divide-border bg-card">
              {publishedByOthers.map((plan) => {
                const totalUnits = plan.units?.length ?? 0;
                const mappedIds = new Set(plan.units?.flatMap((u) => u.standards?.map((s) => s.id) ?? []) ?? []);
                return (
                  <button
                    key={plan.id}
                    className="w-full text-left flex items-center gap-3 px-3 h-12 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
                    onClick={() => setReadOnlyPlanId(plan.id)}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">{plan.title}</span>
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                      {plan.school_year}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                      {totalUnits} unit{totalUnits !== 1 ? "s" : ""}
                    </span>
                    <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200 shrink-0">
                      Published
                    </Badge>
                    <Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {myPlans.length > 0 && (
        <div className="border border-border rounded-[var(--radius)] divide-y divide-border bg-card">
          {myPlans.map((plan) => {
            const totalUnits = plan.units?.length ?? 0;
            const { computed } = ltpAggregateStatus((plan.units ?? []).map((u) => ({ status: u.status ?? "draft" })));
            const statusCfg = COMPUTED_LTP_STATUS_CONFIG[computed];
            const hasRevisions = (plan.units ?? []).filter((u) => u.status === "revision" && u.hod_feedback);
            const myRole = getMyRole(plan.id);
            const memberCount = plan.members?.length ?? 0;

            return (
              <button
                key={plan.id}
                className="w-full text-left flex items-center gap-3 px-3 h-12 hover:bg-muted/50 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
                onClick={() => setSelectedPlanId(plan.id)}
              >
                <span className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{plan.title}</span>
                  {hasRevisions.length > 0 && (
                    <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" aria-label={`${hasRevisions.length} unit${hasRevisions.length !== 1 ? "s" : ""} need revision`} />
                  )}
                </span>
                <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{plan.school_year}</span>
                {isHod && memberCount > 0 && (
                  <span className="text-xs text-muted-foreground shrink-0 hidden sm:flex items-center gap-1">
                    <Users className="h-3 w-3" aria-hidden="true" /> {memberCount}
                  </span>
                )}
                {!isHod && myRole && (
                  <Badge variant="outline" className={`text-xs shrink-0 ${myRole === "lead" ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-muted text-muted-foreground"}`}>
                    {myRole === "lead" ? "Lead" : "Contributor"}
                  </Badge>
                )}
                <Badge variant="outline" className={`text-xs shrink-0 ${statusCfg.className}`}>{statusCfg.label}</Badge>
                {isHod && (
                  <span
                    role="button"
                    tabIndex={0}
                    className="h-5 w-5 flex items-center justify-center text-muted-foreground/40 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100 shrink-0 focus-visible:opacity-100 focus-visible:text-rose-600"
                    aria-label="Delete plan"
                    onClick={(e) => { e.stopPropagation(); if (confirm("Delete this LTP and all its units?")) deleteLTP(plan.id); }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); if (confirm("Delete this LTP and all its units?")) deleteLTP(plan.id); } }}
                  >
                    ×
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <Modal open={newLTPOpen} onClose={() => { setNewLTPOpen(false); setSelectedGS(null); }} title="New Long Term Plan">
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Grade & Subject</Label>
            {gradeSubjectOptions.length === 0 ? (
              <p className="text-sm text-amber-600">No grade+subject combinations configured yet. Set them up in School Setup first.</p>
            ) : (
              <Select
                value={selectedGS ? `${selectedGS.gradeId}:${selectedGS.subjectId}` : ""}
                onValueChange={(v) => {
                  const [gradeId, subjectId] = (v ?? "").split(":");
                  setSelectedGS(gradeSubjectOptions.find(o => o.gradeId === gradeId && o.subjectId === subjectId) ?? null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select grade and subject…" />
                </SelectTrigger>
                <SelectContent>
                  {gradeSubjectOptions.map(o => (
                    <SelectItem key={o.gsId} value={`${o.gradeId}:${o.subjectId}`}>
                      {o.gradeName} · {o.subjectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {autoTitle && <p className="text-xs text-muted-foreground">Plan title: <strong>{autoTitle}</strong></p>}
          </div>
          {existingPlanForSelection && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-700">Plan already exists for this selection</p>
                <p className="text-xs text-amber-600 mt-0.5">A plan for {autoTitle} already exists.</p>
                <button onClick={() => { setSelectedPlanId(existingPlanForSelection); setNewLTPOpen(false); setSelectedGS(null); }} className="text-xs font-medium text-amber-700 underline mt-1">
                  Open existing plan →
                </button>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Academic Year</Label>
            <Select value={newYear} onValueChange={(v) => v && setNewYear(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {schoolYears().map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
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
              onClick={handleDraftFullYear} disabled={drafting || !selectedGS || !!existingPlanForSelection}>
              {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {drafting ? `Drafting ${newUnitCount} units...` : "AI Draft Full Year"}
            </Button>
          </div>
        </div>
        <ModalFooter>
          <ModalCancel onClick={() => setNewLTPOpen(false)} />
          <Button onClick={handleCreate} disabled={creating || !selectedGS || !!existingPlanForSelection}>
            {creating ? "Creating..." : "Create Empty"}
          </Button>
        </ModalFooter>
      </Modal>
    </PageContainer>
  );
}
