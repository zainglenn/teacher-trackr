"use client";

import { useState } from "react";
import { LTPUnitDialog } from "@/components/LTPUnitDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowLeft, Trash2, Send, RotateCcw, Check,
  ChevronDown, ChevronUp, Sparkles, Loader2, AlertCircle, CheckCircle2, AlertTriangle,
  UserPlus, UserCircle2,
} from "lucide-react";
import { LongTermPlan, LTPUnit, LTPStatus, Standard, Profile } from "@/types";
import { supabase } from "@/lib/supabase";
import { StrandBadge, STRAND_COLORS, strandFromCode } from "@/components/ltp/StrandBadge";
import { StrandProgressBar } from "@/components/ltp/StrandProgressBar";
import { LTPStatusBadge } from "@/components/ltp/LTPStatusBadge";
import { TermGrid } from "@/components/ltp/TermGrid";

interface Allocation {
  unitId: string;
  unitTitle: string;
  suggestions: { code: string; standardId: string; reason: string }[];
}

interface LTPDetailViewProps {
  plan: LongTermPlan;
  isHod: boolean;
  standards: Standard[];
  teachers: Profile[];
  currentUserId: string;
  onBack: () => void;
  onOpenUnit: (unitId: string) => void;
  addUnit: (ltpId: string, unit: { term: number; unit_number: number; title: string; big_idea?: string; start_week?: number; duration_weeks: number; assessment_type: string; sort_order: number }) => Promise<LTPUnit | null>;
  updateUnit: (unitId: string, updates: Partial<Omit<LTPUnit, "id" | "ltp_id" | "created_at" | "standards">>) => Promise<void>;
  deleteUnit: (unitId: string) => Promise<void>;
  setUnitStandards: (unitId: string, standardIds: string[]) => Promise<void>;
  setStatus: (id: string, status: LTPStatus, hodFeedback?: string) => Promise<void>;
  assignUnit: (unitId: string, teacherId: string | null) => Promise<void>;
  allLTPStandardIds: string[];
}

export function LTPDetailView({
  plan, isHod, standards, teachers, currentUserId, onBack, onOpenUnit,
  addUnit, updateUnit, deleteUnit, setUnitStandards, setStatus, assignUnit, allLTPStandardIds,
}: LTPDetailViewProps) {
  const canEdit = !isHod && (plan.status === "draft" || plan.status === "revision");

  const [unitDialogState, setUnitDialogState] = useState<{ term: number } | null>(null);

  const [submitOpen, setSubmitOpen] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [actionSaving, setActionSaving] = useState(false);

  const [coverageMapOpen, setCoverageMapOpen] = useState(false);
  const [fillGapsLoading, setFillGapsLoading] = useState(false);
  const [fillGapsAllocations, setFillGapsAllocations] = useState<Allocation[]>([]);
  const [fillGapsAccepted, setFillGapsAccepted] = useState<Record<string, Set<string>>>({});

  const [assignChip, setAssignChip] = useState<{ standardId: string; code: string } | null>(null);
  const [assignTargetUnitId, setAssignTargetUnitId] = useState("");

  // Unit assignment dialog
  const [assignUnitTarget, setAssignUnitTarget] = useState<LTPUnit | null>(null);
  const [assignUnitTeacherId, setAssignUnitTeacherId] = useState("");
  const [assignUnitSaving, setAssignUnitSaving] = useState(false);

  // Coverage calculations
  const planMappedIds = new Set(plan.units?.flatMap((u) => u.standards?.map((s) => s.id) ?? []) ?? []);
  const unmapped = standards.filter((s) => !planMappedIds.has(s.id));
  const allMapped = unmapped.length === 0;
  const canSubmit = canEdit && (plan.units?.length ?? 0) > 0 && allMapped;
  const strands = [...new Set(standards.map((s) => strandFromCode(s.code)))];

  const strandCoverage = strands.map((strand) => {
    const all = standards.filter((s) => strandFromCode(s.code) === strand);
    const mapped = all.filter((s) => planMappedIds.has(s.id));
    return { strand, total: all.length, mapped: mapped.length };
  });

  async function handleSaveUnit(data: {
    term: number; unit_number: number; title: string; big_idea?: string;
    start_week?: number; duration_weeks: number; assessment_type: string;
    sort_order: number;
  }) {
    const typed = { ...data, assessment_type: data.assessment_type as "formative" | "summative" | "both" };
    const unit = await addUnit(plan.id, typed);
    setUnitDialogState(null);
    if (unit) onOpenUnit(unit.id);
  }

  async function handleDeleteUnit(unitId: string) {
    if (!confirm("Delete this unit?")) return;
    await deleteUnit(unitId);
  }

  async function handleSubmit() {
    setActionSaving(true);
    await setStatus(plan.id, "submitted");
    setActionSaving(false);
    setSubmitOpen(false);
  }

  async function handleApprove() {
    setActionSaving(true);
    await setStatus(plan.id, "approved");
    setActionSaving(false);
  }

  async function handleRevision() {
    if (!revisionFeedback.trim()) return;
    setActionSaving(true);
    await setStatus(plan.id, "revision", revisionFeedback.trim());
    setActionSaving(false);
    setRevisionOpen(false);
    setRevisionFeedback("");
  }

  async function handleFillGaps() {
    setFillGapsLoading(true);
    setFillGapsAllocations([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const existingUnits = (plan.units ?? []).map((u) => ({
        id: u.id, title: u.title, term: u.term,
        currentCodes: u.standards?.map((s) => s.code) ?? [],
      }));
      const res = await fetch("/api/ai/suggest-standards", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          mode: "fill-gaps",
          uncoveredCodes: unmapped.map((s) => s.code),
          existingUnits,
          allStandards: standards.map((s) => ({ id: s.id, code: s.code, strand: s.strand, description: s.description })),
        }),
      });
      const json = await res.json();
      if (json.allocations) {
        setFillGapsAllocations(json.allocations);
        const accepted: Record<string, Set<string>> = {};
        json.allocations.forEach((a: Allocation) => {
          accepted[a.unitId] = new Set(a.suggestions.map((s) => s.standardId));
        });
        setFillGapsAccepted(accepted);
      }
    } finally {
      setFillGapsLoading(false);
    }
  }

  async function applyFillGaps() {
    for (const alloc of fillGapsAllocations) {
      const accepted = fillGapsAccepted[alloc.unitId];
      if (!accepted || accepted.size === 0) continue;
      const unit = plan.units?.find((u) => u.id === alloc.unitId);
      const existingIds = unit?.standards?.map((s) => s.id) ?? [];
      const newIds = [...accepted].filter((id) => !existingIds.includes(id));
      if (newIds.length > 0) {
        await setUnitStandards(alloc.unitId, [...existingIds, ...newIds]);
      }
    }
    setFillGapsAllocations([]);
    setFillGapsAccepted({});
  }

  async function handleAssignChip() {
    if (!assignChip || !assignTargetUnitId) return;
    const unit = plan.units?.find((u) => u.id === assignTargetUnitId);
    if (!unit) return;
    const existingIds = unit.standards?.map((s) => s.id) ?? [];
    if (!existingIds.includes(assignChip.standardId)) {
      await setUnitStandards(unit.id, [...existingIds, assignChip.standardId]);
    }
    setAssignChip(null);
    setAssignTargetUnitId("");
  }

  async function handleAssignUnit() {
    if (!assignUnitTarget) return;
    setAssignUnitSaving(true);
    await assignUnit(assignUnitTarget.id, assignUnitTeacherId || null);
    setAssignUnitSaving(false);
    setAssignUnitTarget(null);
    setAssignUnitTeacherId("");
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground -ml-1 mt-0.5 shrink-0" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold truncate">{plan.title}</h1>
              <LTPStatusBadge status={plan.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {plan.school_year} · {plan.units?.length ?? 0} units · {planMappedIds.size}/{standards.length} standards mapped
              {isHod && plan.teacher && ` · ${plan.teacher.full_name ?? plan.teacher.email}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canSubmit && (
            <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setSubmitOpen(true)}>
              <Send className="h-3 w-3 mr-1" /> Submit for Review
            </Button>
          )}
          {isHod && plan.status === "submitted" && (
            <>
              <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleApprove} disabled={actionSaving}>
                <Check className="h-3 w-3 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => { setRevisionOpen(true); setRevisionFeedback(""); }}>
                <RotateCcw className="h-3 w-3 mr-1" /> Request Revision
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Revision feedback banner */}
      {plan.status === "revision" && plan.hod_feedback && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-700">Revision requested</p>
            <p className="text-xs text-amber-700 mt-0.5">"{plan.hod_feedback}"</p>
          </div>
        </div>
      )}

      {/* Coverage summary bar */}
      <div className="rounded-lg border bg-card px-4 py-3">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Standards Coverage</p>
          <span className={`text-xs font-semibold ${allMapped ? "text-emerald-600" : "text-rose-600"}`}>
            {planMappedIds.size}/{standards.length} mapped
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {strandCoverage.map(({ strand, total, mapped }) => (
            <StrandProgressBar key={strand} strand={strand} mapped={mapped} total={total} />
          ))}
        </div>

        {/* Coverage gate */}
        {canEdit && (
          <div className={`mt-3 pt-3 border-t flex items-center justify-between gap-3 ${allMapped ? "border-emerald-100" : "border-rose-100"}`}>
            <div className="flex items-center gap-1.5 min-w-0">
              {allMapped
                ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /><span className="text-xs text-emerald-700">All {standards.length} standards mapped — ready to submit</span></>
                : <><AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" /><span className="text-xs text-rose-700 truncate">{unmapped.length} standard{unmapped.length !== 1 ? "s" : ""} not yet mapped — required before submitting</span></>
              }
            </div>
            {!allMapped && (plan.units?.length ?? 0) > 0 && (
              <Button size="sm" variant="outline" className="h-6 text-xs gap-1 shrink-0 border-rose-200 text-rose-700 hover:bg-rose-50"
                onClick={handleFillGaps} disabled={fillGapsLoading}>
                {fillGapsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {fillGapsLoading ? "Thinking..." : "AI Fill Gaps"}
              </Button>
            )}
          </div>
        )}

        {/* Fill gaps panel */}
        {fillGapsAllocations.length > 0 && (
          <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50 p-3 space-y-2">
            <p className="text-xs font-semibold text-violet-700">AI suggests distributing unmapped standards:</p>
            <div className="space-y-2">
              {fillGapsAllocations.map((alloc) => (
                <div key={alloc.unitId}>
                  <p className="text-xs font-medium text-violet-800 mb-0.5">{alloc.unitTitle}</p>
                  {alloc.suggestions.map((s) => (
                    <label key={s.standardId} className="flex items-start gap-2 cursor-pointer py-0.5">
                      <input type="checkbox" className="mt-0.5 shrink-0"
                        checked={fillGapsAccepted[alloc.unitId]?.has(s.standardId) ?? true}
                        onChange={(e) => setFillGapsAccepted((prev) => {
                          const n = { ...prev };
                          const set = new Set(n[alloc.unitId] ?? []);
                          e.target.checked ? set.add(s.standardId) : set.delete(s.standardId);
                          n[alloc.unitId] = set;
                          return n;
                        })}
                      />
                      <div className="min-w-0">
                        <Badge variant="outline" className="font-mono text-xs mr-1">{s.code}</Badge>
                        <span className="text-xs text-muted-foreground">{s.reason}</span>
                      </div>
                    </label>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white" onClick={applyFillGaps}>Apply Suggestions</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setFillGapsAllocations([])}>Dismiss</Button>
            </div>
          </div>
        )}
      </div>

      {/* Term grid — one row per unit slot across all three terms */}
      <TermGrid
        units={plan.units ?? []}
        canEdit={canEdit}
        isHod={isHod}
        currentUserId={currentUserId}
        onAddUnit={(term) => { setUnitDialogState({ term }); }}
        renderUnitCard={(unit) => (
          <UnitCard
            unit={unit}
            canEdit={canEdit}
            isHod={isHod}
            currentUserId={currentUserId}
            onOpen={() => onOpenUnit(unit.id)}
            onDelete={() => handleDeleteUnit(unit.id)}
            onAssign={() => { setAssignUnitTarget(unit); setAssignUnitTeacherId(unit.assigned_to ?? ""); }}
          />
        )}
      />

      {/* Collapsible coverage map */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
          onClick={() => setCoverageMapOpen((v) => !v)}
        >
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Coverage Map — all {standards.length} standards</span>
          {coverageMapOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>

        {coverageMapOpen && (
          <div className="px-4 pb-4 border-t pt-3">
            <TooltipProvider>
              <div className="space-y-2">
                {strands.map((strand) => (
                  <div key={strand} className="flex items-start gap-2">
                    <Badge variant="outline" className={`font-mono text-xs shrink-0 px-1.5 py-0 mt-0.5 ${STRAND_COLORS[strand] ?? "bg-muted text-muted-foreground border-muted"}`}>{strand}</Badge>
                    <div className="flex flex-wrap gap-1">
                      {standards.filter((s) => strandFromCode(s.code) === strand).map((s) => {
                        const unitsThatCover = plan.units?.filter((u) => u.standards?.some((us) => us.id === s.id)) ?? [];
                        const isMapped = unitsThatCover.length > 0;
                        const isRisky = unitsThatCover.length === 1;
                        const badgeColor = isMapped
                          ? isRisky ? "bg-amber-100 border-amber-300 text-amber-700" : "bg-emerald-100 border-emerald-300 text-emerald-700"
                          : `${STRAND_COLORS[strand] ?? ""} opacity-40 ${canEdit ? "hover:opacity-70" : ""}`;
                        return (
                          <Tooltip key={s.id}>
                            <TooltipTrigger>
                              <span
                                onClick={() => { if (!isMapped && canEdit) { setAssignChip({ standardId: s.id, code: s.code }); setAssignTargetUnitId(""); } }}
                                className={`inline-flex ${!isMapped && canEdit ? "cursor-pointer" : "cursor-default"}`}
                              >
                                <Badge variant="outline" className={`font-mono text-xs px-1.5 py-0 transition-opacity ${badgeColor}`}>
                                  {s.code}
                                </Badge>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">{s.code}</p>
                              <p className="text-xs opacity-80 max-w-48">{s.description}</p>
                              {isMapped
                                ? <p className="text-xs mt-0.5 opacity-70">In: {unitsThatCover.map((u) => u.title).join(", ")}</p>
                                : <p className="text-xs mt-0.5 opacity-70">{canEdit ? "Click to assign to a unit" : "Not yet mapped"}</p>
                              }
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </TooltipProvider>
            <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-300" /> Mapped</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-300" /> Only in 1 unit</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-muted border" /> Not mapped</span>
            </div>
          </div>
        )}
      </div>

      {/* Submit dialog */}
      <Dialog open={submitOpen} onOpenChange={(o) => !o && setSubmitOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Submit for HOD Review</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Submit <strong>{plan.title}</strong> for review? You won't be able to edit it until the HOD responds.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={actionSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {actionSaving ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revision dialog */}
      <Dialog open={revisionOpen} onOpenChange={(o) => !o && setRevisionOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Request Revision</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-muted rounded-lg p-2.5 text-xs">
              <p className="font-medium">{plan.title}</p>
              <p className="text-muted-foreground">{plan.school_year} · {plan.teacher?.full_name ?? plan.teacher?.email}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Feedback for teacher</Label>
              <Textarea placeholder="Explain what needs to be revised..."
                value={revisionFeedback} onChange={(e) => setRevisionFeedback(e.target.value)} rows={4} autoFocus />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisionOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRevision} disabled={actionSaving || !revisionFeedback.trim()}>
              {actionSaving ? "Sending..." : "Request Revision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign chip dialog */}
      <Dialog open={!!assignChip} onOpenChange={(o) => !o && setAssignChip(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign {assignChip?.code} to a unit</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              {standards.find((s) => s.id === assignChip?.standardId)?.description}
            </p>
            <div className="space-y-1.5">
              <Label>Add to unit</Label>
              <Select value={assignTargetUnitId} onValueChange={(v) => v && setAssignTargetUnitId(v)}>
                <SelectTrigger><SelectValue placeholder="Select a unit..." /></SelectTrigger>
                <SelectContent>
                  {plan.units?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>T{u.term} · Unit {u.unit_number}: {u.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignChip(null)}>Cancel</Button>
            <Button onClick={handleAssignChip} disabled={!assignTargetUnitId}>Add to Unit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign unit to teacher dialog */}
      <Dialog open={!!assignUnitTarget} onOpenChange={(o) => !o && setAssignUnitTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign Unit to Teacher</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-muted rounded-lg p-2.5 text-xs">
              <p className="font-medium">Unit {assignUnitTarget?.unit_number}: {assignUnitTarget?.title}</p>
              <p className="text-muted-foreground">Term {assignUnitTarget?.term}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Assign to</Label>
              <Select value={assignUnitTeacherId} onValueChange={(v) => setAssignUnitTeacherId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Select a teacher..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.full_name ?? t.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignUnitTarget(null)}>Cancel</Button>
            <Button onClick={handleAssignUnit} disabled={assignUnitSaving}>
              {assignUnitSaving ? "Saving..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unit dialog */}
      {unitDialogState && (
        <LTPUnitDialog
          open
          onClose={() => setUnitDialogState(null)}
          onSave={handleSaveUnit}
          term={unitDialogState.term}
          nextUnitNumber={(plan.units?.filter((u) => u.term === unitDialogState.term).length ?? 0) + 1}
          nextSortOrder={plan.units?.filter((u) => u.term === unitDialogState.term).length ?? 0}
        />
      )}
    </div>
  );
}

function UnitCard({ unit, canEdit, isHod, currentUserId, onDelete, onOpen, onAssign }: {
  unit: LTPUnit;
  canEdit: boolean;
  isHod: boolean;
  currentUserId: string;
  onDelete: () => void;
  onOpen: () => void;
  onAssign: () => void;
}) {
  const ASSESSMENT_LABELS: Record<string, string> = { formative: "Formative", summative: "Summative", both: "Both" };
  const isAssignedToMe = unit.assigned_to === currentUserId;

  return (
    <div className={`rounded-md border bg-background p-3 space-y-2 ${isAssignedToMe ? "ring-2 ring-blue-300 ring-offset-1" : ""}`}>
      {/* Unit header */}
      <div className="flex items-start justify-between gap-2">
        <button type="button" className="min-w-0 text-left flex-1 group" onClick={onOpen}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground">U{unit.unit_number}</span>
            <span className="text-sm font-semibold leading-tight group-hover:text-blue-600 transition-colors">{unit.title}</span>
            {isAssignedToMe && (
              <Badge className="text-xs py-0 h-4 bg-blue-100 text-blue-700">Your unit</Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <Badge variant="outline" className="text-xs py-0">{ASSESSMENT_LABELS[unit.assessment_type]}</Badge>
            {unit.duration_weeks > 0 && (
              <span className="text-xs text-muted-foreground">{unit.duration_weeks}w</span>
            )}
          </div>
        </button>
        <div className="flex items-center gap-0.5 shrink-0">
          {isHod && (
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" title="Assign to teacher" onClick={onAssign}>
              <UserPlus className="h-3 w-3" />
            </Button>
          )}
          {canEdit && (
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-600" onClick={onDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Assigned teacher */}
      {unit.assignedTeacher && !isAssignedToMe && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <UserCircle2 className="h-3 w-3 shrink-0" />
          <span className="truncate">{unit.assignedTeacher.full_name ?? unit.assignedTeacher.email}</span>
        </div>
      )}

      {/* Big idea */}
      {unit.big_idea && (
        <p className="text-xs text-muted-foreground italic leading-relaxed">"{unit.big_idea}"</p>
      )}

      {/* Standards — coloured by strand */}
      {unit.standards && unit.standards.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {unit.standards.map((s) => (
            <StrandBadge key={s.id} code={s.code} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/50 italic">No standards mapped</p>
      )}
    </div>
  );
}
