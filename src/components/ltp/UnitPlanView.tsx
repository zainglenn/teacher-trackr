"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, Loader2, Save, UserCircle2, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { LongTermPlan, LTPUnit, Standard } from "@/types";
import { supabase } from "@/lib/supabase";
import { StrandBadge, STRAND_COLORS, strandFromCode } from "@/components/ltp/StrandBadge";

interface SuggestedStandard { code: string; standardId: string; reason: string; }

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

const STRAND_ORDER = ["RL", "RI", "W", "SL", "L"];

const STRAND_THEME: Record<string, { item: string; text: string; count: string }> = {
  RL: { item: "bg-blue-50 border-blue-200",    text: "text-blue-700",    count: "text-blue-600" },
  RI: { item: "bg-violet-50 border-violet-200", text: "text-violet-700", count: "text-violet-600" },
  W:  { item: "bg-amber-50 border-amber-200",   text: "text-amber-700",   count: "text-amber-600" },
  SL: { item: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", count: "text-emerald-600" },
  L:  { item: "bg-rose-50 border-rose-200",     text: "text-rose-700",    count: "text-rose-600" },
};
const STRAND_THEME_DEFAULT = { item: "bg-muted/30 border-muted", text: "text-muted-foreground", count: "text-muted-foreground" };

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(unit.standards?.map(s => s.id) ?? []));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestedStandard[]>([]);
  const [coverageNote, setCoverageNote] = useState("");
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set());

  const [pickerOpen, setPickerOpen] = useState(true);
  const [collapsedStrands, setCollapsedStrands] = useState<Set<string>>(new Set());

  useEffect(() => {
    setTitle(unit.title);
    setBigIdea(unit.big_idea ?? "");
    setStartWeek(unit.start_week?.toString() ?? "");
    setDurationWeeks(unit.duration_weeks.toString());
    setAssessmentType(unit.assessment_type);
    setSelectedIds(new Set(unit.standards?.map(s => s.id) ?? []));
    setDirty(false);
    setSuggestions([]);
    setAcceptedSuggestions(new Set());
    setPickerOpen(true);
    setCollapsedStrands(new Set());
  }, [unit.id]);

  function markDirty() { setDirty(true); }

  function toggleStandard(id: string) {
    if (!canEdit) return;
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    markDirty();
  }

  function toggleStrandCollapse(strand: string) {
    setCollapsedStrands(prev => { const n = new Set(prev); n.has(strand) ? n.delete(strand) : n.add(strand); return n; });
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
    setSuggestError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const selectedCodes = standards.filter(s => selectedIds.has(s.id)).map(s => s.code);
      const allMappedIds = new Set(
        plan.units?.filter(u => u.id !== unit.id).flatMap(u => u.standards?.map(s => s.id) ?? []) ?? []
      );
      const uncoveredCodes = standards.filter(s => !allMappedIds.has(s.id) && !selectedIds.has(s.id)).map(s => s.code);
      const res = await fetch("/api/ai/suggest-standards", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          unitTitle: title, bigIdea, term: unit.term,
          selectedStandardCodes: selectedCodes,
          allStandards: standards.map(s => ({ id: s.id, code: s.code, strand: s.strand, description: s.description })),
          uncoveredCodes,
        }),
      });
      const json = await res.json();
      if (json.error) {
        setSuggestError(json.error);
      } else if (json.suggestions?.length) {
        setSuggestions(json.suggestions);
        setCoverageNote(json.coverageNote ?? "");
        setAcceptedSuggestions(new Set(json.suggestions.map((s: SuggestedStandard) => s.standardId)));
      } else {
        setSuggestError("No suggestions returned — try adding a unit title and essential question first.");
      }
    } catch {
      setSuggestError("Failed to reach AI service.");
    } finally {
      setSuggesting(false);
    }
  }

  function applyAccepted() {
    setSelectedIds(prev => {
      const n = new Set(prev);
      suggestions.filter(s => acceptedSuggestions.has(s.standardId)).forEach(s => n.add(s.standardId));
      return n;
    });
    setSuggestions([]);
    setAcceptedSuggestions(new Set());
    markDirty();
  }

  const strands = [...new Set(standards.map(s => s.strand))];

  const selectedStandards = standards
    .filter(s => selectedIds.has(s.id))
    .sort((a, b) => {
      const ai = STRAND_ORDER.indexOf(strandFromCode(a.code));
      const bi = STRAND_ORDER.indexOf(strandFromCode(b.code));
      return ai !== bi ? ai - bi : a.code.localeCompare(b.code);
    });

  return (
    <div className="space-y-4">

      {/* Nav bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 min-w-0">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground -ml-1 shrink-0" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <span className="text-xs text-muted-foreground hidden sm:block truncate">
            {plan.title} · Term {unit.term}
          </span>
        </div>
        {canEdit && (
          <Button size="sm" className="h-8 text-xs shrink-0" onClick={handleSave} disabled={saving || !dirty || !title.trim()}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        )}
      </div>

      {/* Unit title */}
      <div className="space-y-1">
        {canEdit ? (
          <input
            value={title}
            onChange={e => { setTitle(e.target.value); markDirty(); }}
            className="w-full text-2xl font-bold bg-transparent border-none outline-none focus:bg-muted/20 rounded px-1 -mx-1 py-0.5 placeholder:text-muted-foreground/40"
            placeholder="Unit title"
          />
        ) : (
          <h1 className="text-2xl font-bold px-1">{title}</h1>
        )}
        <div className="flex items-center gap-1.5 px-1 flex-wrap">
          <Badge variant="outline" className="text-xs py-0">Unit {unit.unit_number}</Badge>
          <Badge variant="outline" className="text-xs py-0">Term {unit.term}</Badge>
          {isAssigned && <Badge className="text-xs py-0 bg-blue-100 text-blue-700 border-blue-200">Your unit</Badge>}
          {unit.assignedTeacher && !isAssigned && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <UserCircle2 className="h-3 w-3" />
              {unit.assignedTeacher.full_name ?? unit.assignedTeacher.email}
            </span>
          )}
        </div>
      </div>

      {/* Unit header card — mirrors the reference top section */}
      <div className="rounded-lg border overflow-hidden">
        <div className="grid grid-cols-3 divide-x">
          {/* Essential Question */}
          <div className="col-span-2 p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Essential Question</p>
            {canEdit ? (
              <Textarea
                value={bigIdea}
                onChange={e => { setBigIdea(e.target.value); markDirty(); }}
                placeholder="What overarching question or idea drives this unit?"
                rows={3}
                className="resize-none border-none shadow-none p-0 focus-visible:ring-0 text-sm"
              />
            ) : (
              <p className="text-sm leading-relaxed">
                {bigIdea || <span className="text-muted-foreground italic">No essential question set</span>}
              </p>
            )}
          </div>

          {/* Unit details */}
          <div className="p-4 space-y-3 bg-muted/20">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Unit Details</p>
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Duration</Label>
                  {canEdit ? (
                    <Input type="number" min={1} max={20} value={durationWeeks}
                      onChange={e => { setDurationWeeks(e.target.value); markDirty(); }}
                      className="h-7 text-xs" />
                  ) : (
                    <p className="text-sm font-medium">{durationWeeks}w</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Start Week</Label>
                  {canEdit ? (
                    <Input type="number" min={1} max={40} value={startWeek}
                      onChange={e => { setStartWeek(e.target.value); markDirty(); }}
                      className="h-7 text-xs" placeholder="—" />
                  ) : (
                    <p className="text-sm font-medium">{startWeek || "—"}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Assessment</Label>
                {canEdit ? (
                  <Select value={assessmentType} onValueChange={v => { if (v) { setAssessmentType(v as "formative" | "summative" | "both"); markDirty(); } }}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASSESSMENT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm font-medium capitalize">{assessmentType}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Standards table — mirrors the lesson plan table in the reference */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/40 border-b">
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-16">Strand</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-28">Standard</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Teaching Objective</th>
              {canEdit && <th className="w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y">
            {selectedStandards.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 4 : 3} className="px-3 py-8 text-center text-sm text-muted-foreground italic">
                  No standards mapped yet — use "Map standards" below to add them.
                </td>
              </tr>
            ) : (
              selectedStandards.map(s => {
                const sc = strandFromCode(s.code);
                return (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-3">
                      <Badge variant="outline" className={`font-mono text-xs px-1.5 py-0 ${STRAND_COLORS[sc] ?? ""}`}>{sc}</Badge>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs font-semibold text-foreground">{s.code}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground leading-relaxed">{s.description}</td>
                    {canEdit && (
                      <td className="px-2 py-3 text-right">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground/50 hover:text-rose-500"
                          onClick={() => toggleStandard(s.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Map standards footer */}
        {canEdit && (
          <div className="border-t">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs hover:bg-muted/30 transition-colors"
              onClick={() => setPickerOpen(v => !v)}
            >
              <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <Plus className="h-3.5 w-3.5" /> Map standards
              </span>
              <div className="flex items-center gap-2">
                {pickerOpen && (
                  <Button
                    size="sm" variant="ghost"
                    className="h-5 text-xs px-2 gap-1 text-violet-600 hover:text-violet-700 hover:bg-violet-100"
                    onClick={e => { e.stopPropagation(); handleSuggest(); }}
                    disabled={suggesting}
                  >
                    {suggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    AI Suggest
                  </Button>
                )}
                {pickerOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
            </button>

            {pickerOpen && (
              <div className="border-t">
                {/* AI error */}
                {suggestError && (
                  <div className="border-b border-rose-200 bg-rose-50 px-4 py-2.5 flex items-center justify-between gap-2">
                    <p className="text-xs text-rose-700">{suggestError}</p>
                    <button type="button" className="text-xs text-rose-500 hover:text-rose-700 shrink-0" onClick={() => setSuggestError("")}>✕</button>
                  </div>
                )}

                {/* AI suggestions panel */}
                {suggestions.length > 0 && (
                  <div className="border-b border-violet-200 bg-violet-50 px-4 py-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-violet-700 flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3" /> AI Suggestions
                      </p>
                      <Button size="sm" variant="ghost" className="h-5 text-xs px-2 text-violet-500 hover:bg-violet-100" onClick={() => setSuggestions([])}>
                        Dismiss
                      </Button>
                    </div>
                    {coverageNote && <p className="text-xs text-violet-600 italic">{coverageNote}</p>}
                    <div className="space-y-1.5">
                      {suggestions.map(s => (
                        <label key={s.standardId} className="flex items-start gap-2 cursor-pointer">
                          <input type="checkbox" className="mt-0.5 shrink-0"
                            checked={acceptedSuggestions.has(s.standardId)}
                            onChange={e => setAcceptedSuggestions(prev => {
                              const n = new Set(prev);
                              e.target.checked ? n.add(s.standardId) : n.delete(s.standardId);
                              return n;
                            })}
                          />
                          <div className="min-w-0">
                            <Badge variant="outline" className={`font-mono text-xs px-1.5 py-0 mr-1 ${STRAND_COLORS[strandFromCode(s.code)] ?? ""}`}>{s.code}</Badge>
                            <span className="text-xs text-violet-700">{s.reason}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                    <Button size="sm" className="h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white" onClick={applyAccepted} disabled={acceptedSuggestions.size === 0}>
                      Add {acceptedSuggestions.size > 0 ? `${acceptedSuggestions.size} ` : ""}Selected
                    </Button>
                  </div>
                )}

                {/* Strand-grouped checklist */}
                <div className="divide-y">
                  {strands.map(strand => {
                    const strandStandards = standards.filter(s => s.strand === strand);
                    const strandCode = strandFromCode(strandStandards[0]?.code ?? "");
                    const selectedInStrand = strandStandards.filter(s => selectedIds.has(s.id)).length;
                    const c = STRAND_THEME[strandCode] ?? STRAND_THEME_DEFAULT;
                    const isCollapsed = collapsedStrands.has(strand);
                    return (
                      <div key={strand}>
                        <button
                          type="button"
                          className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-muted/30 transition-colors text-left"
                          onClick={() => toggleStrandCollapse(strand)}
                        >
                          <Badge variant="outline" className={`font-mono text-xs shrink-0 px-1.5 py-0 ${STRAND_COLORS[strandCode] ?? ""}`}>{strandCode}</Badge>
                          <span className="text-xs font-semibold text-foreground flex-1">{strand}</span>
                          <span className={`text-xs tabular-nums font-medium ${selectedInStrand > 0 ? c.count : "text-muted-foreground"}`}>
                            {selectedInStrand}/{strandStandards.length}
                          </span>
                          {isCollapsed
                            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            : <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          }
                        </button>
                        {!isCollapsed && (
                          <div className="px-4 pb-2 space-y-0.5 bg-muted/10">
                            {strandStandards.map(s => {
                              const selected = selectedIds.has(s.id);
                              return (
                                <label
                                  key={s.id}
                                  className={`flex items-start gap-2.5 p-2 rounded-md border cursor-pointer transition-colors ${selected ? `${c.item} border` : "border-transparent hover:bg-muted/40"}`}
                                >
                                  <input type="checkbox" className="mt-0.5 shrink-0" checked={selected} onChange={() => toggleStandard(s.id)} />
                                  <div className="min-w-0">
                                    <span className={`font-mono text-xs font-semibold ${selected ? c.text : "text-muted-foreground"}`}>{s.code}</span>
                                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">{s.description}</p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
