"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, Loader2, Save, UserCircle2 } from "lucide-react";
import { LongTermPlan, LTPUnit, Standard, Profile } from "@/types";
import { supabase } from "@/lib/supabase";
import { StrandBadge, STRAND_COLORS, strandFromCode } from "@/components/ltp/StrandBadge";

interface SuggestedStandard {
  code: string;
  standardId: string;
  reason: string;
}

interface UnitPlanViewProps {
  plan: LongTermPlan;
  unit: LTPUnit;
  standards: Standard[];
  currentUserId: string;
  isHod: boolean;
  onBack: () => void;
  updateUnit: (unitId: string, updates: Partial<Omit<LTPUnit, "id" | "ltp_id" | "created_at" | "standards">>) => Promise<void>;
  setUnitStandards: (unitId: string, standardIds: string[]) => Promise<void>;
}

const ASSESSMENT_OPTIONS = [
  { value: "formative", label: "Formative" },
  { value: "summative", label: "Summative" },
  { value: "both", label: "Both" },
];

export function UnitPlanView({
  plan, unit, standards, currentUserId, isHod,
  onBack, updateUnit, setUnitStandards,
}: UnitPlanViewProps) {
  const canEdit = !isHod && (plan.status === "draft" || plan.status === "revision");
  const isAssigned = unit.assigned_to === currentUserId;

  const [title, setTitle] = useState(unit.title);
  const [bigIdea, setBigIdea] = useState(unit.big_idea ?? "");
  const [startWeek, setStartWeek] = useState(unit.start_week?.toString() ?? "");
  const [durationWeeks, setDurationWeeks] = useState(unit.duration_weeks.toString());
  const [assessmentType, setAssessmentType] = useState(unit.assessment_type);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(unit.standards?.map((s) => s.id) ?? [])
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedStandard[]>([]);
  const [coverageNote, setCoverageNote] = useState("");
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set());

  // Reset when unit changes
  useEffect(() => {
    setTitle(unit.title);
    setBigIdea(unit.big_idea ?? "");
    setStartWeek(unit.start_week?.toString() ?? "");
    setDurationWeeks(unit.duration_weeks.toString());
    setAssessmentType(unit.assessment_type);
    setSelectedIds(new Set(unit.standards?.map((s) => s.id) ?? []));
    setDirty(false);
    setSuggestions([]);
    setAcceptedSuggestions(new Set());
  }, [unit.id]);

  function markDirty() { setDirty(true); }

  function toggleStandard(id: string) {
    if (!canEdit) return;
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    markDirty();
  }

  async function handleSave() {
    setSaving(true);
    await updateUnit(unit.id, {
      title: title.trim(),
      big_idea: bigIdea.trim() || null,
      start_week: startWeek ? parseInt(startWeek) : null,
      duration_weeks: parseInt(durationWeeks) || unit.duration_weeks,
      assessment_type: assessmentType as "formative" | "summative" | "both",
    });
    await setUnitStandards(unit.id, [...selectedIds]);
    setSaving(false);
    setDirty(false);
  }

  async function handleSuggest() {
    setSuggesting(true);
    setSuggestions([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const selectedCodes = standards.filter((s) => selectedIds.has(s.id)).map((s) => s.code);
      const allMappedIds = new Set(
        plan.units?.filter((u) => u.id !== unit.id).flatMap((u) => u.standards?.map((s) => s.id) ?? []) ?? []
      );
      const uncoveredCodes = standards.filter((s) => !allMappedIds.has(s.id) && !selectedIds.has(s.id)).map((s) => s.code);
      const res = await fetch("/api/ai/suggest-standards", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          unitTitle: title,
          bigIdea,
          term: unit.term,
          selectedStandardCodes: selectedCodes,
          allStandards: standards.map((s) => ({ id: s.id, code: s.code, strand: s.strand, description: s.description })),
          uncoveredCodes,
        }),
      });
      const json = await res.json();
      if (json.suggestions) {
        setSuggestions(json.suggestions);
        setCoverageNote(json.coverageNote ?? "");
        setAcceptedSuggestions(new Set(json.suggestions.map((s: SuggestedStandard) => s.standardId)));
      }
    } finally {
      setSuggesting(false);
    }
  }

  function applyAccepted() {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      suggestions.filter((s) => acceptedSuggestions.has(s.standardId)).forEach((s) => n.add(s.standardId));
      return n;
    });
    setSuggestions([]);
    setAcceptedSuggestions(new Set());
    markDirty();
  }

  const strands = [...new Set(standards.map((s) => s.strand))];

  return (
    <div className="space-y-4">
      {/* Breadcrumb / header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground -ml-1 mt-0.5 shrink-0" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">
              {plan.title} · Term {unit.term}
            </p>
            <h1 className="text-lg font-semibold leading-tight">{unit.title}</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge variant="outline" className="text-xs py-0">Unit {unit.unit_number}</Badge>
              <Badge variant="outline" className="text-xs py-0">{unit.duration_weeks}w</Badge>
              <Badge variant="outline" className="text-xs py-0">{ASSESSMENT_OPTIONS.find(o => o.value === unit.assessment_type)?.label}</Badge>
              {isAssigned && (
                <Badge className="text-xs py-0 bg-blue-100 text-blue-700">Your unit</Badge>
              )}
              {unit.assignedTeacher && !isAssigned && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <UserCircle2 className="h-3 w-3" />
                  {unit.assignedTeacher.full_name ?? unit.assignedTeacher.email}
                </span>
              )}
            </div>
          </div>
        </div>
        {canEdit && (
          <Button
            size="sm"
            className="h-8 text-xs shrink-0"
            onClick={handleSave}
            disabled={saving || !dirty || !title.trim()}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        {/* Left: unit details */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unit Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); markDirty(); }}
                  disabled={!canEdit}
                  placeholder="Unit title"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Big Idea / Essential Question</Label>
                <Textarea
                  value={bigIdea}
                  onChange={(e) => { setBigIdea(e.target.value); markDirty(); }}
                  disabled={!canEdit}
                  placeholder="What overarching idea or question drives this unit?"
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Start Week</Label>
                <Input
                  type="number" min={1} max={40}
                  value={startWeek}
                  onChange={(e) => { setStartWeek(e.target.value); markDirty(); }}
                  disabled={!canEdit}
                  placeholder="e.g. 3"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Duration (weeks)</Label>
                <Input
                  type="number" min={1} max={20}
                  value={durationWeeks}
                  onChange={(e) => { setDurationWeeks(e.target.value); markDirty(); }}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Assessment Type</Label>
                <Select
                  value={assessmentType}
                  onValueChange={(v) => { if (v && canEdit) { setAssessmentType(v as "formative" | "summative" | "both"); markDirty(); } }}
                  disabled={!canEdit}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSESSMENT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Standards selection */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Standards <span className="text-foreground ml-1">{selectedIds.size} selected</span>
              </p>
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={handleSuggest}
                  disabled={suggesting}
                >
                  {suggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {suggesting ? "Thinking..." : "AI Suggest"}
                </Button>
              )}
            </div>

            {strands.map((strand) => {
              const strandStandards = standards.filter((s) => s.strand === strand);
              const selectedInStrand = strandStandards.filter((s) => selectedIds.has(s.id)).length;
              return (
                <div key={strand}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-6">{strand}</span>
                    <span className="text-xs text-muted-foreground">{selectedInStrand}/{strandStandards.length}</span>
                  </div>
                  <div className="space-y-1">
                    {strandStandards.map((s) => {
                      const selected = selectedIds.has(s.id);
                      const color = STRAND_COLORS[strand] ?? "bg-muted text-muted-foreground border-muted";
                      return (
                        <label
                          key={s.id}
                          className={`flex items-start gap-2.5 p-2 rounded-md border cursor-pointer transition-colors ${
                            selected
                              ? `${color.replace("border-", "border-").split(" ").filter(c => c.startsWith("bg-") || c.startsWith("border-")).join(" ")} border`
                              : "border-transparent hover:bg-muted/50"
                          } ${!canEdit ? "cursor-default" : ""}`}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 shrink-0"
                            checked={selected}
                            onChange={() => toggleStandard(s.id)}
                            disabled={!canEdit}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`font-mono text-xs font-semibold ${selected ? "" : "text-muted-foreground"}`}>{s.code}</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{s.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: AI panel */}
        <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-4">
          {/* AI Suggestions */}
          {suggestions.length > 0 ? (
            <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-600 shrink-0" />
                <p className="text-xs font-semibold text-violet-700">AI Suggestions</p>
              </div>
              {coverageNote && <p className="text-xs text-violet-600 italic">{coverageNote}</p>}
              <div className="space-y-2">
                {suggestions.map((s) => {
                  const strand = strandFromCode(s.code);
                  const color = STRAND_COLORS[strand] ?? "";
                  return (
                    <label key={s.standardId} className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 shrink-0"
                        checked={acceptedSuggestions.has(s.standardId)}
                        onChange={(e) => setAcceptedSuggestions((prev) => {
                          const n = new Set(prev);
                          e.target.checked ? n.add(s.standardId) : n.delete(s.standardId);
                          return n;
                        })}
                      />
                      <div className="min-w-0">
                        <Badge variant="outline" className={`font-mono text-xs px-1.5 py-0 mr-1 ${color}`}>{s.code}</Badge>
                        <span className="text-xs text-violet-700">{s.reason}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white" onClick={applyAccepted} disabled={acceptedSuggestions.size === 0}>
                  Add {acceptedSuggestions.size > 0 ? acceptedSuggestions.size : ""} Selected
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSuggestions([])}>Dismiss</Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground">AI Standard Suggestions</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Fill in the unit title and big idea, then ask the AI to suggest standards that fit this unit's theme — prioritising any unmapped standards.
              </p>
              {canEdit && (
                <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1" onClick={handleSuggest} disabled={suggesting || !title.trim()}>
                  {suggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {suggesting ? "Thinking..." : "Suggest Standards"}
                </Button>
              )}
            </div>
          )}

          {/* Currently selected standards summary */}
          {selectedIds.size > 0 && (
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mapped Standards</p>
              <div className="flex flex-wrap gap-1">
                {standards.filter((s) => selectedIds.has(s.id)).map((s) => (
                  <StrandBadge key={s.id} code={s.code} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
