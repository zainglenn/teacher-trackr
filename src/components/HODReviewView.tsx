"use client";

import { useState } from "react";
import { PageContainer } from "@/components/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, RotateCcw, ClipboardCheck, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { LongTermPlan, Standard } from "@/types";
import { useLongTermPlans } from "@/hooks/useLongTermPlans";

interface HODReviewViewProps {
  teacherId: string;
  standards: Standard[];
}

export function HODReviewView({ teacherId, standards: _standards }: HODReviewViewProps) {
  const { plans, loading, setStatus } = useLongTermPlans(teacherId, true);
  const [revisionPlan, setRevisionPlan] = useState<LongTermPlan | null>(null);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());

  if (loading) return null;

  const submitted = plans.filter((p) => p.status === "submitted");
  const reviewed = plans.filter((p) => p.status === "approved" || p.status === "revision");

  function toggleExpand(id: string) {
    setExpandedPlans((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function handleRevision() {
    if (!revisionPlan) return;
    setSaving(true);
    await setStatus(revisionPlan.id, "revision", feedback);
    setSaving(false);
    setRevisionPlan(null);
    setFeedback("");
  }

  return (
    <PageContainer
      title="HOD Review"
      description={`${submitted.length} long term plan${submitted.length !== 1 ? "s" : ""} awaiting review`}
    >
      {submitted.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Awaiting Review</h2>
          {submitted.map((plan) => (
            <LTPReviewCard
              key={plan.id}
              plan={plan}
              expanded={expandedPlans.has(plan.id)}
              onToggleExpand={() => toggleExpand(plan.id)}
              onApprove={async () => { await setStatus(plan.id, "approved"); }}
              onRequestRevision={() => { setRevisionPlan(plan); setFeedback(""); }}
            />
          ))}
        </div>
      )}

      {submitted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ClipboardCheck className="h-10 w-10 text-emerald-500/40 mb-3" />
          <p className="text-muted-foreground text-sm">All caught up — no plans pending review.</p>
        </div>
      )}

      {reviewed.length > 0 && (
        <div className="space-y-3 mt-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recently Reviewed</h2>
          {reviewed.slice(0, 10).map((plan) => (
            <Card key={plan.id} className="opacity-75">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{plan.title}</p>
                      <Badge
                        className={`text-xs ${plan.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                      >
                        {plan.status === "approved" ? "Approved" : "Needs Revision"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {plan.teacher?.full_name ?? plan.teacher?.email} · {plan.school_year}
                    </p>
                    {plan.hod_feedback && (
                      <p className="text-xs text-muted-foreground mt-1 italic">"{plan.hod_feedback}"</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!revisionPlan} onOpenChange={(o) => !o && setRevisionPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Revision</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {revisionPlan && (
              <div className="bg-muted rounded-lg p-3 text-sm">
                <p className="font-medium">{revisionPlan.title}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{revisionPlan.school_year} · {revisionPlan.teacher?.full_name ?? revisionPlan.teacher?.email}</p>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisionPlan(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleRevision}
              disabled={saving || !feedback.trim()}
            >
              {saving ? "Sending..." : "Request Revision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function LTPReviewCard({
  plan,
  expanded,
  onToggleExpand,
  onApprove,
  onRequestRevision,
}: {
  plan: LongTermPlan;
  expanded: boolean;
  onToggleExpand: () => void;
  onApprove: () => void;
  onRequestRevision: () => void;
}) {
  const totalUnits = plan.units?.length ?? 0;
  const totalStandards = new Set(plan.units?.flatMap((u) => u.standards?.map((s) => s.id) ?? []) ?? []).size;

  return (
    <Card className="border-amber-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{plan.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {plan.teacher?.full_name ?? plan.teacher?.email} · {plan.school_year} · {totalUnits} unit{totalUnits !== 1 ? "s" : ""} · {totalStandards} standard{totalStandards !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
              onClick={onApprove}
            >
              <Check className="h-3 w-3 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-rose-200 text-rose-600 hover:bg-rose-50"
              onClick={onRequestRevision}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Revise
            </Button>
          </div>
        </div>

        {totalUnits > 0 && (
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={onToggleExpand}
          >
            <BookOpen className="h-3 w-3" />
            {expanded ? "Hide" : "Show"} unit breakdown
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}

        {expanded && plan.units && (
          <div className="space-y-2 pl-1">
            {[1, 2, 3].map((term) => {
              const units = plan.units!.filter((u) => u.term === term).sort((a, b) => a.sort_order - b.sort_order);
              if (units.length === 0) return null;
              return (
                <div key={term}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Term {term}</p>
                  {units.map((unit) => (
                    <div key={unit.id} className="pl-2 border-l-2 border-muted mb-1.5">
                      <p className="text-xs font-medium">Unit {unit.unit_number}: {unit.title}</p>
                      {unit.big_idea && <p className="text-xs text-muted-foreground italic">{unit.big_idea}</p>}
                      {unit.standards && unit.standards.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {unit.standards.map((s) => (
                            <Badge key={s.id} variant="outline" className="font-mono text-xs px-1.5 py-0">{s.code}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
