"use client";

import { useState, useMemo } from "react";
import { PageContainer } from "@/components/PageContainer";
import { GradeFilter } from "@/components/GradeFilter";
import { useGradeLevels } from "@/hooks/useGradeLevels";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalFooter, ModalCancel } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, RotateCcw, ClipboardCheck, ChevronDown, ChevronRight, XCircle } from "lucide-react";
import { LongTermPlan, LTPUnit, Standard } from "@/types";
import { UnitPlanView } from "@/components/ltp/UnitPlanView";
import { useLongTermPlans } from "@/hooks/useLongTermPlans";
import { UNIT_STATUS_CONFIG, ltpAggregateStatus, COMPUTED_LTP_STATUS_CONFIG } from "@/lib/ltpStatus";
import { strandFromCode, StrandBadge, STRAND_COLORS } from "@/components/ltp/StrandBadge";

interface HODReviewViewProps {
  teacherId: string;
  standards: Standard[];
  schoolId?: string | null;
}

type UnitWithPlan = { unit: LTPUnit; plan: LongTermPlan };

const STRAND_ORDER = ["RL", "RI", "W", "SL", "L"];

function computeGapReport(plan: LongTermPlan, allStandards: Standard[]) {
  const mappedIds = new Set(
    (plan.units ?? []).flatMap((u) => (u.standards ?? []).map((s) => s.id))
  );
  const missing = allStandards.filter((s) => !mappedIds.has(s.id));
  const byStrand: Record<string, Standard[]> = {};
  for (const s of missing) {
    const sc = strandFromCode(s.code);
    if (!byStrand[sc]) byStrand[sc] = [];
    byStrand[sc].push(s);
  }
  return { mappedCount: mappedIds.size, total: allStandards.length, missing, byStrand };
}

function StandardsGapReport({ plan, standards }: { plan: LongTermPlan; standards: Standard[] }) {
  const [open, setOpen] = useState(false);
  const { mappedCount, total, missing, byStrand } = computeGapReport(plan, standards);
  if (total === 0) return null;
  const missingCount = missing.length;
  const allMapped = missingCount === 0;

  return (
    <div className="rounded-lg border overflow-hidden text-xs">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
        <span className="font-medium text-muted-foreground">Standards Coverage</span>
        <span className={`ml-auto font-mono ${allMapped ? "text-emerald-600" : "text-amber-600"}`}>
          {mappedCount}/{total} mapped{missingCount > 0 ? ` · ${missingCount} missing` : ""}
        </span>
      </button>
      {open && (
        <div className="border-t px-3 py-2.5">
          {allMapped ? (
            <p className="text-emerald-600">All {total} standards are mapped across this plan.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-muted-foreground mb-1">Standards not mapped to any unit:</p>
              {STRAND_ORDER.filter((sc) => byStrand[sc]?.length).map((sc) => (
                <div key={sc} className="flex flex-wrap gap-1 items-center">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded font-mono font-semibold shrink-0 ${STRAND_COLORS[sc] ?? ""}`}>{sc}</span>
                  {byStrand[sc].map((s) => (
                    <StrandBadge key={s.id} code={s.code} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function daysAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "1 day ago";
  return `${diff} days ago`;
}

function strandCounts(unit: LTPUnit): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of unit.standards ?? []) {
    const sc = strandFromCode(s.code);
    counts[sc] = (counts[sc] ?? 0) + 1;
  }
  return counts;
}

export function HODReviewView({ teacherId, standards, schoolId }: HODReviewViewProps) {
  const { plans, loading, approveUnit, requestUnitRevision, reopenUnit, rejectUnit } = useLongTermPlans(teacherId, true, { schoolId });
  const { gradeLevels } = useGradeLevels(schoolId);
  const [activeGradeId, setActiveGradeId] = useState<string>("");

  // Default to first grade level once loaded
  useMemo(() => {
    if (gradeLevels.length > 0 && !activeGradeId) setActiveGradeId(gradeLevels[0].id);
  }, [gradeLevels, activeGradeId]);

  const filteredPlans = useMemo(() => {
    if (!activeGradeId || gradeLevels.length === 0) return plans;
    return plans.filter(p => !p.grade_level_id || p.grade_level_id === activeGradeId);
  }, [plans, activeGradeId, gradeLevels]);

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [revisionUnit, setRevisionUnit] = useState<UnitWithPlan | null>(null);
  const [rejectingUnit, setRejectingUnit] = useState<UnitWithPlan | null>(null);
  const [feedback, setFeedback] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionTouched, setRejectionTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  if (loading) return null;

  // Navigate into UnitPlanView (HOD read-only + approve/revise/reopen)
  if (selectedUnitId && selectedPlanId) {
    const plan = plans.find((p) => p.id === selectedPlanId);
    const unit = plan?.units?.find((u) => u.id === selectedUnitId);
    if (plan && unit) {
      return (
        <UnitPlanView
          plan={plan}
          unit={unit}
          standards={standards}
          currentUserId={teacherId}
          isHod={true}
          onBack={() => { setSelectedUnitId(null); setSelectedPlanId(null); }}
          updateUnit={async () => {}}
          setUnitStandards={async () => {}}
          approveUnit={approveUnit}
          requestUnitRevision={requestUnitRevision}
          reopenUnit={reopenUnit}
        />
      );
    }
  }

  // Collect submitted units sorted FIFO
  const pending: UnitWithPlan[] = filteredPlans
    .flatMap((p) => (p.units ?? []).filter((u) => u.status === "submitted").map((u) => ({ unit: u, plan: p })))
    .sort((a, b) => (a.unit.submitted_at ?? "").localeCompare(b.unit.submitted_at ?? ""));

  // Group by plan for display
  const pendingByPlan: { plan: LongTermPlan; units: LTPUnit[] }[] = [];
  for (const { unit, plan } of pending) {
    const existing = pendingByPlan.find((g) => g.plan.id === plan.id);
    if (existing) existing.units.push(unit);
    else pendingByPlan.push({ plan, units: [unit] });
  }

  // Recently reviewed (approved, revision, or rejected)
  const reviewed: UnitWithPlan[] = filteredPlans
    .flatMap((p) => (p.units ?? []).filter((u) => u.status === "approved" || u.status === "revision" || u.status === "rejected").map((u) => ({ unit: u, plan: p })))
    .sort((a, b) => (b.unit.reviewed_at ?? "").localeCompare(a.unit.reviewed_at ?? ""))
    .slice(0, 20);

  async function handleRevision() {
    if (!revisionUnit || !feedback.trim()) return;
    setSaving(true);
    await requestUnitRevision(revisionUnit.unit.id, revisionUnit.plan.id, feedback.trim());
    setSaving(false);
    setRevisionUnit(null);
    setFeedback("");
  }

  async function handleReject() {
    setRejectionTouched(true);
    if (!rejectingUnit || !rejectionReason.trim()) return;
    setSaving(true);
    await rejectUnit(rejectingUnit.unit.id, rejectingUnit.plan.id, rejectionReason.trim());
    setSaving(false);
    setRejectingUnit(null);
    setRejectionReason("");
    setRejectionTouched(false);
  }

  return (
    <PageContainer
      title="Plan Reviews"
      description={`${pending.length} unit${pending.length !== 1 ? "s" : ""} awaiting review`}
      action={
        gradeLevels.length > 0 ? (
          <GradeFilter grades={gradeLevels} activeGradeId={activeGradeId} onChange={setActiveGradeId} />
        ) : undefined
      }
    >
      {pending.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ClipboardCheck className="h-10 w-10 text-emerald-500/40 mb-3" />
          <p className="text-muted-foreground text-sm">All caught up — no units pending review.</p>
        </div>
      )}

      {pendingByPlan.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Awaiting Review</h2>
          {pendingByPlan.map(({ plan, units }) => {
            const { computed } = ltpAggregateStatus((plan.units ?? []).map((u) => ({ status: u.status ?? "draft" })));
            const cfg = COMPUTED_LTP_STATUS_CONFIG[computed];
            return (
              <Card key={plan.id} className="border-amber-200">
                <CardContent className="p-4 space-y-3">
                  {/* Plan header */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{plan.title}</p>
                    <Badge variant="outline" className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {plan.teacher?.full_name ?? plan.teacher?.email} · {plan.school_year}
                    </span>
                  </div>

                  {/* Standards gap report */}
                  <StandardsGapReport plan={plan} standards={standards} />

                  {/* Unit rows */}
                  <div className="space-y-2">
                    {units.map((unit) => {
                      const counts = strandCounts(unit);
                      return (
                        <div key={unit.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-muted-foreground">T{unit.term} · U{unit.unit_number}</span>
                              <span className="text-sm font-medium">{unit.title}</span>
                            </div>
                            {unit.big_idea && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{unit.big_idea}</p>
                            )}
                            <div className="flex items-center gap-2 flex-wrap">
                              {Object.entries(counts).map(([sc, n]) => (
                                <Badge key={sc} variant="outline" className="text-xs py-0 font-mono">{sc} ×{n}</Badge>
                              ))}
                              {unit.duration_weeks > 0 && (
                                <span className="text-xs text-muted-foreground">{unit.duration_weeks}w</span>
                              )}
                              <span className="text-xs text-muted-foreground capitalize">{unit.assessment_type}</span>
                              {unit.submitted_at && (
                                <span className="text-xs text-muted-foreground">Submitted {daysAgo(unit.submitted_at)}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <Button size="sm" variant="outline" className="h-7 text-xs"
                              onClick={() => { setSelectedUnitId(unit.id); setSelectedPlanId(plan.id); }}>
                              Open Unit
                            </Button>
                            <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => approveUnit(unit.id, plan.id)}>
                              <Check className="h-3 w-3 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs border-rose-200 text-rose-600 hover:bg-rose-50"
                              onClick={() => { setRevisionUnit({ unit, plan }); setFeedback(""); }}>
                              <RotateCcw className="h-3 w-3 mr-1" /> Revise
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50"
                              onClick={() => { setRejectingUnit({ unit, plan }); setRejectionReason(""); setRejectionTouched(false); }}>
                              <XCircle className="h-3 w-3 mr-1" /> Reject
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {reviewed.length > 0 && (
        <div className="space-y-2 mt-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recently Reviewed</h2>
          {reviewed.map(({ unit, plan }) => {
            const statusCfg = UNIT_STATUS_CONFIG[unit.status];
            return (
              <Card key={unit.id} className="opacity-80">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{unit.title}</span>
                      <Badge variant="outline" className={`text-xs ${statusCfg.className}`}>{statusCfg.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {plan.title} · {plan.teacher?.full_name ?? plan.teacher?.email}
                      {unit.reviewed_at && ` · ${daysAgo(unit.reviewed_at)}`}
                    </p>
                    {unit.hod_feedback && (
                      <p className="text-xs text-muted-foreground italic mt-0.5 truncate">"{unit.hod_feedback}"</p>
                    )}
                    {unit.rejection_reason && (
                      <p className="text-xs text-red-600 italic mt-0.5 truncate">Rejected: "{unit.rejection_reason}"</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 text-xs"
                      onClick={() => { setSelectedUnitId(unit.id); setSelectedPlanId(plan.id); }}>
                      Open
                    </Button>
                    {unit.status === "approved" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => reopenUnit(unit.id, plan.id)}>
                        Re-open
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={!!rejectingUnit} onClose={() => { setRejectingUnit(null); setRejectionReason(""); setRejectionTouched(false); }} title="Reject Unit">
        <div className="space-y-3 py-2">
          {rejectingUnit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs">
              <p className="font-medium text-red-800">{rejectingUnit.unit.title}</p>
              <p className="text-red-600 mt-0.5">
                {rejectingUnit.plan.title} · Term {rejectingUnit.unit.term} · {rejectingUnit.plan.teacher?.full_name ?? rejectingUnit.plan.teacher?.email}
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Rejection is permanent. The teacher cannot edit this unit and must contact you to reopen it.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="rejection-reason">
              Reason for rejection <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="rejection-reason"
              placeholder="Explain why this unit is being rejected..."
              value={rejectionReason}
              onChange={(e) => { setRejectionReason(e.target.value); setRejectionTouched(true); }}
              rows={4}
              autoFocus
              aria-required="true"
              aria-invalid={rejectionTouched && rejectionReason.trim() === "" ? "true" : undefined}
              aria-describedby={rejectionTouched && rejectionReason.trim() === "" ? "rejection-reason-error" : undefined}
            />
            {rejectionTouched && rejectionReason.trim() === "" && (
              <p id="rejection-reason-error" className="text-xs text-red-600" role="alert">A reason is required before rejecting.</p>
            )}
          </div>
        </div>
        <ModalFooter>
          <ModalCancel onClick={() => { setRejectingUnit(null); setRejectionReason(""); setRejectionTouched(false); }} />
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={saving || !rejectionReason.trim()}
            aria-label="Confirm unit rejection"
          >
            {saving ? "Rejecting..." : "Reject Unit"}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal open={!!revisionUnit} onClose={() => setRevisionUnit(null)} title="Request Revision">
        <div className="space-y-3 py-2">
          {revisionUnit && (
            <div className="bg-muted rounded-lg p-2.5 text-xs">
              <p className="font-medium">{revisionUnit.unit.title}</p>
              <p className="text-muted-foreground mt-0.5">
                {revisionUnit.plan.title} · Term {revisionUnit.unit.term} · {revisionUnit.plan.teacher?.full_name ?? revisionUnit.plan.teacher?.email}
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Feedback for teacher</Label>
            <Textarea
              placeholder="Explain what needs to be revised..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              autoFocus
            />
          </div>
        </div>
        <ModalFooter>
          <ModalCancel onClick={() => setRevisionUnit(null)} />
          <Button variant="destructive" onClick={handleRevision} disabled={saving || !feedback.trim()}>
            {saving ? "Sending..." : "Request Revision"}
          </Button>
        </ModalFooter>
      </Modal>
    </PageContainer>
  );
}
