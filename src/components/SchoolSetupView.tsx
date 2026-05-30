"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, CheckSquare, Square, Sparkles, RefreshCw } from "lucide-react";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SubjectBadge } from "@/components/ltp/SubjectBadge";
import { adminFetch } from "@/lib/authToken";
import { nextAvailableSlot, SUBJECT_SLOTS, getSlotLabel, getSubjectSlotStyle, type SubjectSlot } from "@/lib/subjectSlot";
import { Subject, GradeLevel, StandardSet, Standard, ClassAssignment, Profile } from "@/types";
import { useTeachers } from "@/hooks/useTeachers";

type Tab = "subjects" | "grade-levels" | "standard-sets" | "class-assignments";

const TABS: { key: Tab; label: string }[] = [
  { key: "subjects",          label: "Subjects" },
  { key: "grade-levels",      label: "Grade Levels" },
  { key: "standard-sets",     label: "Standard Sets" },
  { key: "class-assignments", label: "Class Assignments" },
];

const STRANDS = ["RL", "RI", "W", "SL", "L"];

// ── Subjects Tab ─────────────────────────────────────────────────────────────

function SubjectsTab() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminFetch("/api/admin/list-subjects");
    const json = await res.json();
    setSubjects(json.subjects ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    if (!newName.trim()) return;
    setSaving(true);
    setError("");
    const usedSlots = subjects.map((s) => s.slot);
    const slot = nextAvailableSlot(usedSlots as SubjectSlot[]);
    try {
      const res = await adminFetch("/api/admin/create-subject", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim(), slot }),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setNewName("");
      setAdding(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await adminFetch("/api/admin/delete-subject", { method: "DELETE", body: JSON.stringify({ id }) });
    await load();
  }

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground">
        Subjects define the top-level groupings for plans and teacher assignments. Each subject gets a colour slot for quick identification.
      </div>

      {subjects.length > 0 && (
        <div className="border border-border rounded-md overflow-hidden">
          {subjects.map((s, i) => (
            <div key={s.id}>
              {i > 0 && <Separator />}
              <div className="flex items-center justify-between px-4 py-2.5">
                <SubjectBadge name={s.name} slot={s.slot as SubjectSlot} />
                <button
                  onClick={() => handleDelete(s.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  aria-label={`Delete ${s.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {subjects.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">No subjects yet.</p>
      )}

      {adding ? (
        <div className="border border-border rounded-md p-4 space-y-3 bg-muted/30">
          <Label htmlFor="new-subject-name" className="text-xs">Subject name</Label>
          <Input
            id="new-subject-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. English"
            className="h-8 text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
            autoFocus
          />
          {subjects.length < SUBJECT_SLOTS.length && (() => {
            const nextSlot = nextAvailableSlot(subjects.map(s => s.slot) as SubjectSlot[]);
            const style = getSubjectSlotStyle(nextSlot);
            return (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                Colour slot auto-assigned:
                <span className="inline-flex items-center gap-1 font-medium" style={{ color: style.color }}>
                  <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: style.accentColor }} />
                  {getSlotLabel(nextSlot)}
                </span>
              </p>
            );
          })()}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={saving || !newName.trim()} className="h-7 text-xs">
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewName(""); setError(""); }} className="h-7 text-xs">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAdding(true)}
          disabled={subjects.length >= SUBJECT_SLOTS.length}
          className="h-7 text-xs gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Subject
        </Button>
      )}
    </div>
  );
}

// ── Grade Levels Tab ──────────────────────────────────────────────────────────

function GradeLevelsTab() {
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminFetch("/api/admin/list-grade-levels");
    const json = await res.json();
    setGradeLevels(json.grade_levels ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    if (!newName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await adminFetch("/api/admin/create-grade-level", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim(), sort_order: gradeLevels.length }),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setNewName("");
      setAdding(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await adminFetch("/api/admin/delete-grade-level", { method: "DELETE", body: JSON.stringify({ id }) });
    await load();
  }

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground">
        Grade levels define the year groups in your school. Standard sets and class assignments are scoped to a subject + grade level combination.
      </div>

      {gradeLevels.length > 0 && (
        <div className="border border-border rounded-md overflow-hidden">
          {gradeLevels.map((g, i) => (
            <div key={g.id}>
              {i > 0 && <Separator />}
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm font-medium">{g.name}</span>
                <button
                  onClick={() => handleDelete(g.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  aria-label={`Delete ${g.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {gradeLevels.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">No grade levels yet.</p>
      )}

      {adding ? (
        <div className="border border-border rounded-md p-4 space-y-3 bg-muted/30">
          <Label htmlFor="new-grade-name" className="text-xs">Grade level name</Label>
          <Input
            id="new-grade-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Grade 6"
            className="h-8 text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={saving || !newName.trim()} className="h-7 text-xs">
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewName(""); setError(""); }} className="h-7 text-xs">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)} className="h-7 text-xs gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Grade Level
        </Button>
      )}
    </div>
  );
}

// ── Standard Sets Tab ─────────────────────────────────────────────────────────

interface GeneratedStandard { code: string; strand: string; description: string; }

function StandardSetsTab() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedGradeId, setSelectedGradeId] = useState<string>("");
  const [standardSet, setStandardSet] = useState<StandardSet | null>(null);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [loadingSet, setLoadingSet] = useState(false);
  const [creatingSet, setCreatingSet] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [addingStd, setAddingStd] = useState(false);
  const [stdCode, setStdCode] = useState("");
  const [stdStrand, setStdStrand] = useState("");
  const [stdDesc, setStdDesc] = useState("");
  const [stdSaving, setStdSaving] = useState(false);
  const [error, setError] = useState("");
  // AI generation state
  const [generating, setGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState<{ setName: string; standards: GeneratedStandard[] } | null>(null);
  const [aiSetName, setAiSetName] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [savingGenerated, setSavingGenerated] = useState(false);

  useEffect(() => {
    Promise.all([
      adminFetch("/api/admin/list-subjects").then(r => r.json()),
      adminFetch("/api/admin/list-grade-levels").then(r => r.json()),
    ]).then(([sj, gl]) => {
      setSubjects(sj.subjects ?? []);
      setGradeLevels(gl.grade_levels ?? []);
    });
  }, []);

  const loadSet = useCallback(async (subjectId: string, gradeId: string) => {
    if (!subjectId || !gradeId) return;
    setLoadingSet(true);
    setStandardSet(null);
    setStandards([]);
    const res = await adminFetch(`/api/admin/list-standard-sets?subject_id=${subjectId}&grade_level_id=${gradeId}`);
    const json = await res.json();
    const set: StandardSet | undefined = (json.standard_sets ?? [])[0];
    setStandardSet(set ?? null);
    if (set) {
      const sRes = await adminFetch(`/api/admin/list-subjects`); // reuse supabase for standards
      // Fetch standards for this set via supabase directly
      const { supabase } = await import("@/lib/supabase");
      const { data } = await supabase
        .from("standards")
        .select("*")
        .eq("standard_set_id", set.id)
        .order("code");
      setStandards((data ?? []) as Standard[]);
      void sRes; // suppress unused warning
    }
    setLoadingSet(false);
  }, []);

  useEffect(() => {
    if (selectedSubjectId && selectedGradeId) {
      loadSet(selectedSubjectId, selectedGradeId);
    }
  }, [selectedSubjectId, selectedGradeId, loadSet]);

  async function handleCreateSet() {
    if (!newSetName.trim()) return;
    setCreatingSet(true);
    const res = await adminFetch("/api/admin/create-standard-set", {
      method: "POST",
      body: JSON.stringify({ name: newSetName.trim(), subject_id: selectedSubjectId, grade_level_id: selectedGradeId }),
    });
    const json = await res.json();
    if (json.error) { setError(json.error); setCreatingSet(false); return; }
    setNewSetName("");
    await loadSet(selectedSubjectId, selectedGradeId);
    setCreatingSet(false);
  }

  async function handleAddStandard() {
    if (!stdCode.trim() || !stdStrand || !stdDesc.trim() || !standardSet) return;
    setStdSaving(true);
    setError("");
    const res = await adminFetch("/api/admin/add-standard", {
      method: "POST",
      body: JSON.stringify({ code: stdCode.trim(), strand: stdStrand, description: stdDesc.trim(), standard_set_id: standardSet.id }),
    });
    const json = await res.json();
    if (json.error) { setError(json.error); setStdSaving(false); return; }
    setStdCode(""); setStdStrand(""); setStdDesc(""); setAddingStd(false);
    await loadSet(selectedSubjectId, selectedGradeId);
    setStdSaving(false);
  }

  async function handleDeleteStandard(id: string) {
    await adminFetch("/api/admin/delete-standard", { method: "DELETE", body: JSON.stringify({ id }) });
    await loadSet(selectedSubjectId, selectedGradeId);
  }

  function clearAiPreview() {
    setAiPreview(null);
    setAiSetName("");
    setSelectedCodes(new Set());
    setError("");
  }

  async function handleGenerate() {
    const subject = subjects.find(s => s.id === selectedSubjectId);
    const grade = gradeLevels.find(g => g.id === selectedGradeId);
    if (!subject || !grade) return;
    setGenerating(true);
    setError("");
    clearAiPreview();
    const res = await adminFetch("/api/ai/generate-standards", {
      method: "POST",
      body: JSON.stringify({ subject_name: subject.name, grade_level_name: grade.name }),
    });
    const json = await res.json();
    setGenerating(false);
    if (json.error) { setError(json.error); return; }
    setAiPreview(json);
    setAiSetName(json.setName);
    setSelectedCodes(new Set((json.standards as GeneratedStandard[]).map(s => s.code)));
  }

  async function handleSaveGenerated() {
    if (!aiPreview || !aiSetName.trim()) return;
    setSavingGenerated(true);
    setError("");
    // 1. Create the standard set
    const setRes = await adminFetch("/api/admin/create-standard-set", {
      method: "POST",
      body: JSON.stringify({ name: aiSetName.trim(), subject_id: selectedSubjectId, grade_level_id: selectedGradeId }),
    });
    const setJson = await setRes.json();
    if (setJson.error) { setError(setJson.error); setSavingGenerated(false); return; }
    const setId = setJson.standard_set.id as string;
    // 2. Bulk insert selected standards
    const toInsert = aiPreview.standards.filter(s => selectedCodes.has(s.code));
    const bulkRes = await adminFetch("/api/admin/bulk-add-standards", {
      method: "POST",
      body: JSON.stringify({ standard_set_id: setId, standards: toInsert }),
    });
    const bulkJson = await bulkRes.json();
    if (bulkJson.error) { setError(bulkJson.error); setSavingGenerated(false); return; }
    clearAiPreview();
    setSavingGenerated(false);
    await loadSet(selectedSubjectId, selectedGradeId);
  }

  const showContent = selectedSubjectId && selectedGradeId;

  return (
    <div className="space-y-5">
      <div className="text-xs text-muted-foreground">
        Select a subject and grade level to view or create the standard set for that combination.
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <Label className="text-xs mb-1.5 block">Subject</Label>
          <Select value={selectedSubjectId} onValueChange={(v) => v && setSelectedSubjectId(v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select subject…" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label className="text-xs mb-1.5 block">Grade Level</Label>
          <Select value={selectedGradeId} onValueChange={(v) => v && setSelectedGradeId(v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select grade…" />
            </SelectTrigger>
            <SelectContent>
              {gradeLevels.map(g => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showContent && (
        <>
          <Separator />
          {loadingSet ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Loading…</div>
          ) : !standardSet ? (
            <div className="space-y-4">
              {/* AI generation preview */}
              {aiPreview ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                    <span className="text-xs font-medium">AI-generated standard set — review and confirm</span>
                    <span className="ml-auto text-xs text-muted-foreground">{selectedCodes.size} of {aiPreview.standards.length} selected</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={aiSetName}
                      onChange={e => setAiSetName(e.target.value)}
                      placeholder="Standard set name"
                      className="h-8 text-sm flex-1"
                    />
                  </div>
                  <div className="border border-border rounded-md overflow-hidden">
                    <div className="grid grid-cols-[20px_80px_100px_1fr] gap-0 px-3 py-1.5 bg-muted/40 text-xs font-medium text-muted-foreground border-b border-border">
                      <span />
                      <span>Code</span>
                      <span>Strand</span>
                      <span>Description</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {aiPreview.standards.map((s, i) => (
                        <div key={s.code}>
                          {i > 0 && <Separator />}
                          <div
                            className="grid grid-cols-[20px_80px_100px_1fr] gap-0 px-3 py-2 items-start cursor-pointer hover:bg-muted/30"
                            onClick={() => setSelectedCodes(prev => {
                              const next = new Set(prev);
                              next.has(s.code) ? next.delete(s.code) : next.add(s.code);
                              return next;
                            })}
                          >
                            <div className="pt-0.5">
                              {selectedCodes.has(s.code)
                                ? <CheckSquare className="h-3.5 w-3.5 text-primary" />
                                : <Square className="h-3.5 w-3.5 text-muted-foreground" />}
                            </div>
                            <span className="text-xs font-mono text-foreground pt-0.5">{s.code}</span>
                            <span className="text-xs text-muted-foreground pt-0.5 pr-2">{s.strand}</span>
                            <span className="text-xs text-foreground leading-relaxed">{s.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveGenerated} disabled={savingGenerated || selectedCodes.size === 0 || !aiSetName.trim()} className="h-8 text-xs">
                      {savingGenerated ? "Saving…" : `Save ${selectedCodes.size} Standard${selectedCodes.size !== 1 ? "s" : ""}`}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generating} className="h-8 text-xs gap-1.5">
                      <RefreshCw className="h-3 w-3" />
                      Regenerate
                    </Button>
                    <Button size="sm" variant="ghost" onClick={clearAiPreview} className="h-8 text-xs ml-auto">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">No standard set for this combination yet.</p>
                  <Button
                    size="sm"
                    onClick={handleGenerate}
                    disabled={generating}
                    className="h-8 text-xs gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {generating ? "Generating…" : "Generate with AI"}
                  </Button>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">or create manually</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label htmlFor="new-set-name" className="text-xs mb-1.5 block">Standard set name</Label>
                      <Input
                        id="new-set-name"
                        value={newSetName}
                        onChange={e => setNewSetName(e.target.value)}
                        placeholder="e.g. NYSED Grade 6 ELA"
                        className="h-8 text-sm"
                        onKeyDown={e => { if (e.key === "Enter") handleCreateSet(); }}
                      />
                    </div>
                    <Button size="sm" onClick={handleCreateSet} disabled={creatingSet || !newSetName.trim()} className="h-8 text-xs">
                      {creatingSet ? "Creating…" : "Create Set"}
                    </Button>
                  </div>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{standardSet.name}</p>
                  <p className="text-xs text-muted-foreground">{standards.length} standards</p>
                </div>
              </div>

              {standards.length > 0 && (
                <div className="border border-border rounded-md overflow-x-auto">
                  <div className="min-w-[480px]">
                  <div className="grid grid-cols-[80px_48px_1fr_32px] gap-0 px-3 py-1.5 bg-muted/40 text-xs font-medium text-muted-foreground border-b border-border">
                    <span>Code</span>
                    <span>Strand</span>
                    <span>Description</span>
                    <span />
                  </div>
                  {standards.map((s, i) => (
                    <div key={s.id}>
                      {i > 0 && <Separator />}
                      <div className="grid grid-cols-[80px_48px_1fr_32px] gap-0 px-3 py-2 items-start">
                        <span className="text-xs font-mono text-foreground pt-0.5">{s.code}</span>
                        <span className="text-xs text-muted-foreground pt-0.5">{s.strand}</span>
                        <span className="text-xs text-foreground leading-relaxed">{s.description}</span>
                        <button
                          onClick={() => handleDeleteStandard(s.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                          aria-label={`Delete ${s.code}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              )}

              {addingStd ? (
                <div className="border border-border rounded-md p-4 space-y-3 bg-muted/30">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="std-code" className="text-xs mb-1 block">Code</Label>
                      <Input id="std-code" value={stdCode} onChange={e => setStdCode(e.target.value)} placeholder="e.g. RL.6.1" className="h-7 text-xs" />
                    </div>
                    <div>
                      <Label htmlFor="std-strand" className="text-xs mb-1 block">Strand</Label>
                      <Select value={stdStrand} onValueChange={(v) => v && setStdStrand(v)}>
                        <SelectTrigger id="std-strand" className="h-7 text-xs">
                          <SelectValue placeholder="Strand…" />
                        </SelectTrigger>
                        <SelectContent>
                          {STRANDS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="std-desc" className="text-xs mb-1 block">Description</Label>
                    <Input id="std-desc" value={stdDesc} onChange={e => setStdDesc(e.target.value)} placeholder="Standard description…" className="h-7 text-xs" />
                  </div>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddStandard} disabled={stdSaving || !stdCode.trim() || !stdStrand || !stdDesc.trim()} className="h-7 text-xs">
                      {stdSaving ? "Saving…" : "Add Standard"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setAddingStd(false); setStdCode(""); setStdStrand(""); setStdDesc(""); setError(""); }} className="h-7 text-xs">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setAddingStd(true)} className="h-7 text-xs gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add Standard
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Class Assignments Tab ─────────────────────────────────────────────────────

function ClassAssignmentsTab() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedGradeId, setSelectedGradeId] = useState<string>("");
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [addingTeacher, setAddingTeacher] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { teachers } = useTeachers();

  useEffect(() => {
    Promise.all([
      adminFetch("/api/admin/list-subjects").then(r => r.json()),
      adminFetch("/api/admin/list-grade-levels").then(r => r.json()),
    ]).then(([sj, gl]) => {
      setSubjects(sj.subjects ?? []);
      setGradeLevels(gl.grade_levels ?? []);
    });
  }, []);

  const loadAssignments = useCallback(async (subjectId: string, gradeId: string) => {
    if (!subjectId || !gradeId) return;
    setLoadingAssignments(true);
    const res = await adminFetch(`/api/admin/list-class-assignments?subject_id=${subjectId}&grade_level_id=${gradeId}`);
    const json = await res.json();
    setAssignments(json.assignments ?? []);
    setLoadingAssignments(false);
  }, []);

  useEffect(() => {
    if (selectedSubjectId && selectedGradeId) {
      loadAssignments(selectedSubjectId, selectedGradeId);
    }
  }, [selectedSubjectId, selectedGradeId, loadAssignments]);

  async function handleAdd() {
    if (!selectedTeacherId) return;
    setSaving(true);
    setError("");
    const res = await adminFetch("/api/admin/create-class-assignment", {
      method: "POST",
      body: JSON.stringify({ teacher_id: selectedTeacherId, subject_id: selectedSubjectId, grade_level_id: selectedGradeId }),
    });
    const json = await res.json();
    if (json.error) { setError(json.error); setSaving(false); return; }
    setSelectedTeacherId("");
    setAddingTeacher(false);
    await loadAssignments(selectedSubjectId, selectedGradeId);
    setSaving(false);
  }

  async function handleToggleLead(assignment: ClassAssignment) {
    await adminFetch("/api/admin/update-class-assignment", {
      method: "PATCH",
      body: JSON.stringify({ id: assignment.id, is_lead: !assignment.is_lead }),
    });
    await loadAssignments(selectedSubjectId, selectedGradeId);
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this teacher from the class assignment?")) return;
    await adminFetch("/api/admin/delete-class-assignment", { method: "DELETE", body: JSON.stringify({ id }) });
    await loadAssignments(selectedSubjectId, selectedGradeId);
  }

  const assignedTeacherIds = assignments.map(a => a.teacher_id);
  const availableTeachers = (teachers as Profile[]).filter(t => !assignedTeacherIds.includes(t.id));
  const showContent = selectedSubjectId && selectedGradeId;

  return (
    <div className="space-y-5">
      <div className="text-xs text-muted-foreground">
        Assign teachers to subject and grade level combinations. Mark one teacher as Lead for each group.
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <Label className="text-xs mb-1.5 block">Subject</Label>
          <Select value={selectedSubjectId} onValueChange={(v) => v && setSelectedSubjectId(v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select subject…" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label className="text-xs mb-1.5 block">Grade Level</Label>
          <Select value={selectedGradeId} onValueChange={(v) => v && setSelectedGradeId(v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select grade…" />
            </SelectTrigger>
            <SelectContent>
              {gradeLevels.map(g => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showContent && (
        <>
          <Separator />
          {loadingAssignments ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Loading…</div>
          ) : (
            <div className="space-y-3">
              {assignments.length > 0 && (
                <div className="border border-border rounded-md overflow-hidden">
                  {assignments.map((a, i) => {
                    const teacher = a.teacher as Profile | undefined;
                    return (
                      <div key={a.id}>
                        {i > 0 && <Separator />}
                        <div className="flex items-center gap-3 px-4 py-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{teacher?.full_name ?? teacher?.username ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">{teacher?.username}</p>
                          </div>
                          {a.is_lead && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-amber-100 text-amber-700 border-amber-200 shrink-0">
                              Lead
                            </span>
                          )}
                          <button
                            onClick={() => handleToggleLead(a)}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 shrink-0"
                            aria-label={a.is_lead ? "Remove lead" : "Set as lead"}
                            title={a.is_lead ? "Remove lead" : "Set as lead"}
                          >
                            {a.is_lead ? <CheckSquare className="h-3.5 w-3.5 text-amber-600" /> : <Square className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => handleRemove(a.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 shrink-0"
                            aria-label="Remove assignment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {assignments.length === 0 && !addingTeacher && (
                <p className="text-sm text-muted-foreground">No teachers assigned to this combination yet.</p>
              )}

              {addingTeacher ? (
                <div className="border border-border rounded-md p-4 space-y-3 bg-muted/30">
                  <Label className="text-xs">Select teacher</Label>
                  <Select value={selectedTeacherId} onValueChange={(v) => v && setSelectedTeacherId(v)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Choose a teacher…" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTeachers.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.full_name ?? t.username}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAdd} disabled={saving || !selectedTeacherId} className="h-7 text-xs">
                      {saving ? "Saving…" : "Assign"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setAddingTeacher(false); setSelectedTeacherId(""); setError(""); }} className="h-7 text-xs">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAddingTeacher(true)}
                  disabled={availableTeachers.length === 0}
                  className="h-7 text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Teacher
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────

export function SchoolSetupView() {
  const [tab, setTab] = useState<Tab>("subjects");
  const active = TABS.find(t => t.key === tab)!;

  return (
    <PageContainer
      title="School Setup"
      description="Configure subjects, grade levels, standard sets, and teacher assignments."
    >
      <div className="border border-border rounded-md overflow-hidden">
        {/* Tab bar — overflow-x-auto with right-edge fade hint for narrow screens */}
        <div className="relative border-b border-border bg-muted/30">
          {/* Right-edge scroll hint — hidden on sm+ where all tabs fit */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent sm:hidden" aria-hidden="true" />
        <div
          role="tablist"
          className="flex overflow-x-auto scrollbar-none"
        >
          {TABS.map(t => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              aria-controls={`tabpanel-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`shrink-0 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-ring/50
                ${tab === t.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        </div>

        {/* Tab panel */}
        <div
          id={`tabpanel-${active.key}`}
          role="tabpanel"
          aria-label={active.label}
          className="p-5"
        >
          {tab === "subjects"          && <SubjectsTab />}
          {tab === "grade-levels"      && <GradeLevelsTab />}
          {tab === "standard-sets"     && <StandardSetsTab />}
          {tab === "class-assignments" && <ClassAssignmentsTab />}
        </div>
      </div>
    </PageContainer>
  );
}
