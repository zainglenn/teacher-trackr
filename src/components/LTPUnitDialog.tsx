"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface LTPUnitDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    term: number; unit_number: number; title: string; big_idea?: string;
    start_week?: number; duration_weeks: number; assessment_type: string;
    sort_order: number;
  }) => Promise<void>;
  term: number;
  nextUnitNumber: number;
  nextSortOrder: number;
}

export function LTPUnitDialog({ open, onClose, onSave, term, nextUnitNumber, nextSortOrder }: LTPUnitDialogProps) {
  const [title, setTitle] = useState("");
  const [bigIdea, setBigIdea] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("6");
  const [assessmentType, setAssessmentType] = useState("summative");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(""); setBigIdea(""); setDurationWeeks("6"); setAssessmentType("summative");
    }
  }, [open]);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    await onSave({
      term,
      unit_number: nextUnitNumber,
      title: title.trim(),
      big_idea: bigIdea.trim() || undefined,
      duration_weeks: parseInt(durationWeeks) || 6,
      assessment_type: assessmentType,
      sort_order: nextSortOrder,
    });
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Unit — Term {term}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              placeholder="e.g. Identity & Narrative"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) handleSave(); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Big Idea <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
            <Textarea
              placeholder="What overarching question drives this unit?"
              value={bigIdea}
              onChange={(e) => setBigIdea(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Duration (weeks)</Label>
              <Input type="number" min={1} max={20} value={durationWeeks} onChange={(e) => setDurationWeeks(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Assessment</Label>
              <Select value={assessmentType} onValueChange={(v) => v && setAssessmentType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="formative">Formative</SelectItem>
                  <SelectItem value="summative">Summative</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Standards are added in the unit plan view after creation.</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Creating...</> : "Create Unit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
