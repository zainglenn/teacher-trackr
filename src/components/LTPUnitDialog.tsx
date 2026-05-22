"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";
import { Standard, LTPUnit } from "@/types";
import { supabase } from "@/lib/supabase";

interface SuggestedStandard { code: string; standardId: string; reason: string; }

interface LTPUnitDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    term: number; unit_number: number; title: string; big_idea?: string;
    start_week?: number; duration_weeks: number; assessment_type: string;
    sort_order: number; standardIds: string[];
  }) => Promise<void>;
  standards: Standard[];
  term: number;
  nextUnitNumber: number;
  nextSortOrder: number;
  editing?: LTPUnit | null;
  allLTPStandardIds?: string[];
}

export function LTPUnitDialog({
  open, onClose, onSave, standards, term, nextUnitNumber, nextSortOrder, editing, allLTPStandardIds = [],
}: LTPUnitDialogProps) {
  const [title, setTitle] = useState("");
  const [bigIdea, setBigIdea] = useState("");
  const [startWeek, setStartWeek] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("2");
  const [assessmentType, setAssessmentType] = useState("both");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedStandard[]>([]);
  const [coverageNote, setCoverageNote] = useState("");
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (editing) {
      setTitle(editing.title);
      setBigIdea(editing.big_idea ?? "");
      setStartWeek(editing.start_week?.toString() ?? "");
      setDurationWeeks(editing.duration_weeks.toString());
      setAssessmentType(editing.assessment_type);
      setSelectedIds(new Set(editing.standards?.map((s) => s.id) ?? []));
    } else {
      setTitle(""); setBigIdea(""); setStartWeek(""); setDurationWeeks("2"); setAssessmentType("both");
      setSelectedIds(new Set());
    }
    setSuggestions([]); setCoverageNote(""); setAcceptedSuggestions(new Set());
  }, [editing, open]);

  function toggleStandard(id: string) {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function handleSuggest() {
    setSuggesting(true);
    setSuggestions([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const selectedCodes = standards.filter((s) => selectedIds.has(s.id)).map((s) => s.code);
      const uncoveredCodes = standards.filter((s) => !allLTPStandardIds.includes(s.id)).map((s) => s.code);
      const res = await fetch("/api/ai/suggest-standards", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          unitTitle: title, bigIdea, term,
          selectedStandardCodes: selectedCodes,
          allStandards: standards.map((s) => ({ id: s.id, code: s.code, strand: s.strand, description: s.description })),
          uncoveredCodes,
        }),
      });
      const json = await res.json();
      if (json.suggestions) { setSuggestions(json.suggestions); setCoverageNote(json.coverageNote ?? ""); }
    } finally { setSuggesting(false); }
  }

  function applyAccepted() {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      suggestions.filter((s) => acceptedSuggestions.has(s.standardId)).forEach((s) => n.add(s.standardId));
      return n;
    });
    setSuggestions([]); setAcceptedSuggestions(new Set());
  }

  async function handleSave() {
    if (!title) return;
    setSaving(true);
    await onSave({
      term, unit_number: editing?.unit_number ?? nextUnitNumber,
      title, big_idea: bigIdea || undefined,
      start_week: startWeek ? parseInt(startWeek) : undefined,
      duration_weeks: parseInt(durationWeeks) || 2,
      assessment_type: assessmentType,
      sort_order: editing?.sort_order ?? nextSortOrder,
      standardIds: [...selectedIds],
    });
    setSaving(false);
    onClose();
  }

  const strands = [...new Set(standards.map((s) => s.strand))];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Unit" : `Add Unit — Term ${term}`}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Unit Title</Label>
              <Input placeholder="e.g. Identity & Narrative" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Big Idea / Theme <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea placeholder="What is the overarching idea or essential question for this unit?" value={bigIdea} onChange={(e) => setBigIdea(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Start Week <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input type="number" min={1} max={40} placeholder="e.g. 3" value={startWeek} onChange={(e) => setStartWeek(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (weeks)</Label>
              <Input type="number" min={1} max={20} value={durationWeeks} onChange={(e) => setDurationWeeks(e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Assessment Type</Label>
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

          {/* Standards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Standards ({selectedIds.size} selected)</Label>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleSuggest} disabled={suggesting}>
                {suggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {suggesting ? "Thinking..." : "AI Suggest"}
              </Button>
            </div>

            {/* AI Suggestions Panel */}
            {suggestions.length > 0 && (
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 space-y-2">
                <p className="text-xs font-semibold text-violet-700">AI Suggestions</p>
                {coverageNote && <p className="text-xs text-violet-600 italic">{coverageNote}</p>}
                <div className="space-y-1.5">
                  {suggestions.filter((s) => !selectedIds.has(s.standardId)).map((s) => (
                    <label key={s.standardId} className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 shrink-0"
                        checked={acceptedSuggestions.has(s.standardId)}
                        onChange={(e) => setAcceptedSuggestions((prev) => {
                          const n = new Set(prev); e.target.checked ? n.add(s.standardId) : n.delete(s.standardId); return n;
                        })}
                      />
                      <div className="min-w-0">
                        <Badge variant="outline" className="font-mono text-xs mr-1">{s.code}</Badge>
                        <span className="text-xs text-muted-foreground">{s.reason}</span>
                      </div>
                    </label>
                  ))}
                </div>
                <Button size="sm" className="h-7 text-xs" onClick={applyAccepted} disabled={acceptedSuggestions.size === 0}>
                  Apply {acceptedSuggestions.size > 0 ? `${acceptedSuggestions.size} ` : ""}Selected
                </Button>
              </div>
            )}

            <div className="space-y-3 max-h-56 overflow-y-auto rounded-lg border p-3">
              {strands.map((strand) => (
                <div key={strand}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{strand}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {standards.filter((s) => s.strand === strand).map((s) => (
                      <button key={s.id} type="button" onClick={() => toggleStandard(s.id)} title={s.description} className="focus:outline-none">
                        <Badge
                          variant={selectedIds.has(s.id) ? "default" : "outline"}
                          className={`font-mono text-xs cursor-pointer hover:opacity-80 transition-opacity ${selectedIds.has(s.id) ? "" : "text-muted-foreground"}`}
                        >
                          {s.code}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !title}>
            {saving ? "Saving..." : editing ? "Save Changes" : "Add Unit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
