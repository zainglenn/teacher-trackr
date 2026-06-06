"use client";

import { useState } from "react";
import { Intervention, InterventionStatus } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { InterventionStatusBadge } from "./InterventionStatusBadge";
import { StrandBadge } from "@/components/ltp/StrandBadge";
import { Users } from "lucide-react";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

interface Props {
  intervention: Intervention;
  onUpdate: (id: string, updates: { outcome_notes?: string; status?: InterventionStatus }) => Promise<void>;
  onConclude: (id: string, outcomeNotes: string) => Promise<void>;
}

export function InterventionCard({ intervention, onUpdate, onConclude }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [outcomeNotes, setOutcomeNotes] = useState(intervention.outcome_notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleConclude() {
    setSaving(true);
    await onConclude(intervention.id, outcomeNotes);
    setSaving(false);
    setSheetOpen(false);
  }

  async function handleSetMonitoring() {
    setSaving(true);
    await onUpdate(intervention.id, { status: "monitoring" });
    setSaving(false);
    setSheetOpen(false);
  }

  const studentCount = intervention.student_ids.length;

  return (
    <>
      <Card
        className="shadow-none border-border/60 cursor-pointer hover:border-border transition-colors"
        onClick={() => setSheetOpen(true)}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {intervention.strand_codes.map((s) => (
                  <StrandBadge key={s} code={s} />
                ))}
              </div>
              <p className="text-sm font-medium text-foreground truncate">{intervention.strategy}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {studentCount} student{studentCount !== 1 ? "s" : ""}
                </span>
                <span>Started {formatDate(intervention.start_date)}</span>
              </div>
            </div>
            <InterventionStatusBadge status={intervention.status} />
          </div>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={(o) => !o && setSheetOpen(false)}>
        <SheetContent side="right" className="w-[400px] overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border">
            <SheetTitle className="text-base">{intervention.strategy}</SheetTitle>
            <div className="flex items-center gap-2 mt-1">
              <InterventionStatusBadge status={intervention.status} />
              {intervention.strand_codes.map((s) => <StrandBadge key={s} code={s} />)}
            </div>
          </SheetHeader>

          <div className="mt-4 space-y-5">
            {/* Students */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Students ({studentCount})</p>
              <div className="space-y-1">
                {(intervention.student_names ?? intervention.student_ids).map((name, i) => (
                  <div key={i} className="text-sm text-foreground py-1 px-3 rounded bg-muted/40">{name}</div>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>Started: {formatDate(intervention.start_date)}</p>
              {intervention.end_date && <p>Ended: {formatDate(intervention.end_date)}</p>}
            </div>

            {/* Outcome notes */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Outcome notes</p>
              <Textarea
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                placeholder="What worked? What was the impact?"
                className="min-h-[100px] text-sm resize-none"
                disabled={intervention.status === "concluded"}
              />
            </div>

            {/* Actions */}
            {intervention.status !== "concluded" && (
              <div className="flex flex-col gap-2 pt-1">
                {intervention.status === "active" && (
                  <Button variant="outline" size="sm" onClick={handleSetMonitoring} disabled={saving}>
                    Move to Monitoring
                  </Button>
                )}
                <Button size="sm" onClick={handleConclude} disabled={saving}>
                  {saving ? "Saving…" : "Mark Concluded"}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
