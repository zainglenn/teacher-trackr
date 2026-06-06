"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { Plus, Trash2, CheckSquare, Square, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SubjectBadge } from "@/components/ltp/SubjectBadge";
import { adminFetch } from "@/lib/authToken";
import { nextAvailableSlot, SUBJECT_SLOTS, getSlotLabel, getSubjectSlotStyle, type SubjectSlot } from "@/lib/subjectSlot";
import { Subject, GradeLevel, StandardSet, Standard, SchoolCurriculum, ClassAssignment, Profile } from "@/types";
import { useTeachers } from "@/hooks/useTeachers";

// Context that provides an optional school ID override (used by platform admin)
const SchoolOverrideCtx = createContext<string | null>(null);

function useSchoolFetch() {
  const overrideId = useContext(SchoolOverrideCtx);
  return (path: string, options?: RequestInit) =>
    adminFetch(path, options, overrideId ? { "x-school-id": overrideId } : undefined);
}

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
  const doFetch = useSchoolFetch();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await doFetch("/api/admin/list-subjects");
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
      const res = await doFetch("/api/admin/create-subject", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim(), slot }),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setNewName("");
      setAdding(false);
      await load();
      toast.success("Subject added");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await doFetch("/api/admin/delete-subject", { method: "DELETE", body: JSON.stringify({ id }) });
    await load();
    toast.success("Subject removed");
  }

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>;

  return (
    <div className="space-y-4">
      {subjects.length > 0 && (
        <div className="border border-border rounded-md overflow-hidden">
          {subjects.map((s, i) => {
            const style = getSubjectSlotStyle(s.slot as SubjectSlot);
            return (
              <div key={s.id}>
                {i > 0 && <Separator />}
                <div className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: style.accentColor }} />
                    <span className="text-sm font-medium text-foreground">{s.name}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    aria-label={`Delete ${s.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
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
  const doFetch = useSchoolFetch();
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await doFetch("/api/admin/list-grade-levels");
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
      const res = await doFetch("/api/admin/create-grade-level", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim(), sort_order: gradeLevels.length }),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setNewName("");
      setAdding(false);
      await load();
      toast.success("Grade level added");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await doFetch("/api/admin/delete-grade-level", { method: "DELETE", body: JSON.stringify({ id }) });
    await load();
    toast.success("Grade level removed");
  }

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>;

  return (
    <div className="space-y-4">
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

function StandardSetsTab() {
  const doFetch = useSchoolFetch();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedGradeId, setSelectedGradeId] = useState<string>("");
  const [platformSets, setPlatformSets] = useState<StandardSet[]>([]);
  const [librarySearch, setLibrarySearch] = useState("");
  const [assigned, setAssigned] = useState<SchoolCurriculum | null>(null);
  const [assignedStandards, setAssignedStandards] = useState<Standard[]>([]);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      doFetch("/api/admin/list-subjects").then(r => r.json()),
      doFetch("/api/admin/list-grade-levels").then(r => r.json()),
      doFetch("/api/admin/list-standard-sets").then(r => r.json()),
    ]).then(([sj, gl, ss]) => {
      setSubjects(sj.subjects ?? []);
      setGradeLevels(gl.grade_levels ?? []);
      setPlatformSets(ss.standard_sets ?? []);
    });
  }, []);

  const loadAssigned = useCallback(async (subjectId: string, gradeId: string) => {
    if (!subjectId || !gradeId) return;
    setLoadingAssigned(true);
    setAssigned(null);
    setAssignedStandards([]);
    const res = await doFetch(`/api/admin/school-curricula?subject_id=${subjectId}&grade_level_id=${gradeId}`);
    const json = await res.json();
    const curr: SchoolCurriculum | undefined = (json.school_curricula ?? [])[0];
    setAssigned(curr ?? null);
    if (curr?.standard_set_id) {
      const { supabase } = await import("@/lib/supabase");
      const { data } = await supabase
        .from("standards")
        .select("*")
        .eq("standard_set_id", curr.standard_set_id)
        .order("code");
      setAssignedStandards((data ?? []) as Standard[]);
    }
    setLoadingAssigned(false);
  }, []);

  useEffect(() => {
    if (selectedSubjectId && selectedGradeId) loadAssigned(selectedSubjectId, selectedGradeId);
  }, [selectedSubjectId, selectedGradeId, loadAssigned]);

  async function handleAssign(standardSetId: string) {
    setSaving(true);
    setError("");
    const res = await doFetch("/api/admin/school-curricula", {
      method: "POST",
      body: JSON.stringify({ standard_set_id: standardSetId, subject_id: selectedSubjectId, grade_level_id: selectedGradeId }),
    });
    const json = await res.json();
    if (json.error) { setError(json.error); setSaving(false); return; }
    await loadAssigned(selectedSubjectId, selectedGradeId);
    setSaving(false);
    toast.success("Curriculum assigned");
  }

  async function handleUnassign() {
    setSaving(true);
    await doFetch("/api/admin/school-curricula", {
      method: "DELETE",
      body: JSON.stringify({ subject_id: selectedSubjectId, grade_level_id: selectedGradeId }),
    });
    setAssigned(null);
    setAssignedStandards([]);
    setSaving(false);
    toast.success("Curriculum removed");
  }

  const showContent = selectedSubjectId && selectedGradeId;

  return (
    <div className="space-y-5">
      <div className="text-xs text-muted-foreground">
        Select a subject and grade level, then choose the platform curriculum that applies.
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <Label className="text-xs mb-1.5 block">Subject</Label>
          <Select value={selectedSubjectId} onValueChange={(v) => v && setSelectedSubjectId(v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select subject…">
                {subjects.find(s => s.id === selectedSubjectId)?.name}
              </SelectValue>
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
              <SelectValue placeholder="Select grade…">
                {gradeLevels.find(g => g.id === selectedGradeId)?.name}
              </SelectValue>
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
          {loadingAssigned ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Loading…</div>
          ) : assigned ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{assigned.standard_set?.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {assignedStandards.length} standard{assignedStandards.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <Button
                  variant="outline" size="sm"
                  className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                  onClick={handleUnassign} disabled={saving}
                >
                  Remove
                </Button>
              </div>
              {assignedStandards.length > 0 && (
                <div className="border border-border rounded-md overflow-x-auto">
                  <div className="min-w-[480px]">
                    <div className="grid grid-cols-[80px_80px_1fr] gap-0 px-3 py-1.5 bg-muted/40 text-xs font-medium text-muted-foreground border-b border-border">
                      <span>Code</span><span>Strand</span><span>Description</span>
                    </div>
                    {assignedStandards.map((s, i) => (
                      <div key={s.id}>
                        {i > 0 && <Separator />}
                        <div className="grid grid-cols-[80px_80px_1fr] gap-0 px-3 py-2 items-start">
                          <span className="text-xs font-mono pt-0.5">{s.code}</span>
                          <span className="text-xs text-muted-foreground pt-0.5">{s.strand}</span>
                          <span className="text-xs text-foreground leading-relaxed">{s.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">No curriculum assigned. Choose from the platform library below.</p>
              {error && <p className="text-xs text-destructive">{error}</p>}
              {platformSets.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No platform curricula available yet. Contact your platform administrator.
                </p>
              ) : (
                <>
                  <Input
                    value={librarySearch}
                    onChange={e => setLibrarySearch(e.target.value)}
                    placeholder="Search curricula…"
                    className="h-8 text-sm"
                  />
                  {(() => {
                    const q = librarySearch.toLowerCase();
                    const visible = q
                      ? platformSets.filter(s =>
                          [s.name, s.subject_label, s.grade_label].some(v => v?.toLowerCase().includes(q))
                        )
                      : platformSets;
                    return visible.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3 text-center">No curricula match "{librarySearch}".</p>
                    ) : (
                      <div className="border border-border rounded-md overflow-hidden divide-y divide-border">
                        {visible.map(set => (
                          <div key={set.id} className="flex items-center justify-between px-3 py-2.5">
                            <div>
                              <p className="text-sm font-medium">{set.name}</p>
                              {(set.subject_label || set.grade_label) && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {[set.subject_label, set.grade_label].filter(Boolean).join(" · ")}
                                </p>
                              )}
                            </div>
                            <Button size="sm" variant="outline" className="h-7 text-xs"
                              onClick={() => handleAssign(set.id)} disabled={saving}>
                              Assign
                            </Button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Class Assignments Tab (grouped by subject, all data upfront) ──────────────

function ClassAssignmentsTab() {
  const doFetch = useSchoolFetch();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  // key: `${subjectId}-${gradeId}` → assignments
  const [assignMap, setAssignMap] = useState<Record<string, ClassAssignment[]>>({});
  const [loading, setLoading] = useState(true);
  const { teachers } = useTeachers();
  // which subject×grade is showing the inline add form
  const [addingFor, setAddingFor] = useState<{ subjectId: string; gradeId: string } | null>(null);
  const [addTeacherId, setAddTeacherId] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [sjRes, glRes] = await Promise.all([
      doFetch("/api/admin/list-subjects").then(r => r.json()),
      doFetch("/api/admin/list-grade-levels").then(r => r.json()),
    ]);
    const subs: Subject[] = sjRes.subjects ?? [];
    const grds: GradeLevel[] = glRes.grade_levels ?? [];
    setSubjects(subs);
    setGradeLevels(grds);

    // Load all combinations concurrently
    const entries = await Promise.all(
      subs.flatMap(s =>
        grds.map(async g => {
          const res = await doFetch(`/api/admin/list-class-assignments?subject_id=${s.id}&grade_level_id=${g.id}`);
          const json = await res.json();
          return { key: `${s.id}-${g.id}`, assignments: (json.assignments ?? []) as ClassAssignment[] };
        })
      )
    );
    const map: Record<string, ClassAssignment[]> = {};
    for (const { key, assignments } of entries) map[key] = assignments;
    setAssignMap(map);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadAll(); }, [loadAll]);

  async function refreshCombo(subjectId: string, gradeId: string) {
    const res = await doFetch(`/api/admin/list-class-assignments?subject_id=${subjectId}&grade_level_id=${gradeId}`);
    const json = await res.json();
    setAssignMap(prev => ({ ...prev, [`${subjectId}-${gradeId}`]: json.assignments ?? [] }));
  }

  async function handleAdd(subjectId: string, gradeId: string) {
    if (!addTeacherId) return;
    setAddSaving(true); setAddError("");
    const res = await doFetch("/api/admin/create-class-assignment", {
      method: "POST",
      body: JSON.stringify({ teacher_id: addTeacherId, subject_id: subjectId, grade_level_id: gradeId }),
    });
    const json = await res.json();
    if (json.error) { setAddError(json.error); setAddSaving(false); return; }
    await refreshCombo(subjectId, gradeId);
    setAddingFor(null); setAddTeacherId(""); setAddSaving(false);
    toast.success("Teacher assigned");
  }

  async function handleToggleLead(a: ClassAssignment, subjectId: string, gradeId: string) {
    await doFetch("/api/admin/update-class-assignment", {
      method: "PATCH",
      body: JSON.stringify({ id: a.id, is_lead: !a.is_lead }),
    });
    await refreshCombo(subjectId, gradeId);
    toast.success(a.is_lead ? "Lead removed" : "Marked as lead");
  }

  async function handleRemove(id: string, subjectId: string, gradeId: string) {
    if (!confirm("Remove this teacher from the class?")) return;
    await doFetch("/api/admin/delete-class-assignment", { method: "DELETE", body: JSON.stringify({ id }) });
    await refreshCombo(subjectId, gradeId);
    toast.success("Teacher removed");
  }

  if (loading) return <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>;
  if (subjects.length === 0) return <p className="text-sm text-muted-foreground">Add subjects first.</p>;
  if (gradeLevels.length === 0) return <p className="text-sm text-muted-foreground">Add grade levels first.</p>;

  return (
    <div className="space-y-5">
      {subjects.map(subject => (
        <div key={subject.id}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            {subject.name}
          </p>
          <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
            {gradeLevels.map(grade => {
              const key = `${subject.id}-${grade.id}`;
              const rowAssignments = assignMap[key] ?? [];
              const assignedIds = rowAssignments.map(a => a.teacher_id);
              const available = (teachers as Profile[]).filter(t =>
                (t.role === "teacher" || t.role === "hod") && !assignedIds.includes(t.id)
              );
              const isAddingHere = addingFor?.subjectId === subject.id && addingFor?.gradeId === grade.id;

              return (
                <div key={grade.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-start gap-3 flex-wrap">
                    {/* Grade label */}
                    <span className="text-sm font-medium text-foreground shrink-0 w-20 pt-0.5">{grade.name}</span>

                    {/* Teacher chips */}
                    <div className="flex flex-wrap gap-2 flex-1 min-w-0">
                      {rowAssignments.length === 0 && !isAddingHere && (
                        <span className="text-xs text-muted-foreground italic pt-0.5">No teachers assigned</span>
                      )}
                      {rowAssignments.map(a => {
                        const t = a.teacher as Profile | undefined;
                        return (
                          <div
                            key={a.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-muted/30 text-sm"
                          >
                            <span className="font-medium">{t?.full_name ?? t?.username ?? "—"}</span>
                            <button
                              onClick={() => handleToggleLead(a, subject.id, grade.id)}
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                                a.is_lead
                                  ? "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200"
                                  : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                              }`}
                              title={a.is_lead ? "Remove lead" : "Set as lead"}
                            >
                              {a.is_lead ? "Lead" : "Set lead"}
                            </button>
                            <button
                              onClick={() => handleRemove(a.id, subject.id, grade.id)}
                              className="text-muted-foreground/50 hover:text-destructive transition-colors"
                              aria-label="Remove"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}

                      {/* Inline add form */}
                      {isAddingHere ? (
                        <div className="flex items-center gap-2">
                          <Select value={addTeacherId} onValueChange={(v) => v && setAddTeacherId(v)}>
                            <SelectTrigger className="h-7 text-xs w-40">
                              <SelectValue placeholder="Choose teacher…" />
                            </SelectTrigger>
                            <SelectContent>
                              {available.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.full_name ?? t.username}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" className="h-7 text-xs" onClick={() => handleAdd(subject.id, grade.id)} disabled={addSaving || !addTeacherId}>
                            {addSaving ? "…" : "Assign"}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingFor(null); setAddTeacherId(""); setAddError(""); }}>
                            Cancel
                          </Button>
                          {addError && <span className="text-xs text-destructive">{addError}</span>}
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddingFor({ subjectId: subject.id, gradeId: grade.id }); setAddTeacherId(""); setAddError(""); }}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          disabled={available.length === 0}
                        >
                          <Plus className="h-3 w-3" /> Assign teacher
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Classes Section ───────────────────────────────────────────────────────────

interface ClassRecord { id: string; name: string; school_year: string; teacher_id: string; teacher?: { id: string; full_name: string | null; username: string } | null }

function ClassesSection() {
  const doFetch = useSchoolFetch();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [assignMap, setAssignMap] = useState<Record<string, ClassAssignment[]>>({});
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  // which teacher is showing the add-class inline form: teacherId
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [newClassName, setNewClassName] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [sjRes, glRes, clsRes] = await Promise.all([
      doFetch("/api/admin/list-subjects").then(r => r.json()),
      doFetch("/api/admin/list-grade-levels").then(r => r.json()),
      doFetch("/api/admin/list-classes").then(r => r.json()),
    ]);
    const subs: Subject[] = sjRes.subjects ?? [];
    const grds: GradeLevel[] = glRes.grade_levels ?? [];
    setSubjects(subs);
    setGradeLevels(grds);
    setClasses(clsRes.classes ?? []);

    const entries = await Promise.all(
      subs.flatMap(s =>
        grds.map(async g => {
          const res = await doFetch(`/api/admin/list-class-assignments?subject_id=${s.id}&grade_level_id=${g.id}`);
          const json = await res.json();
          return { key: `${s.id}-${g.id}`, assignments: (json.assignments ?? []) as ClassAssignment[] };
        })
      )
    );
    const map: Record<string, ClassAssignment[]> = {};
    for (const { key, assignments } of entries) map[key] = assignments;
    setAssignMap(map);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleAddClass(teacherId: string) {
    if (!newClassName.trim()) return;
    setAddSaving(true); setAddError("");
    const res = await doFetch("/api/admin/create-class", {
      method: "POST",
      body: JSON.stringify({ teacher_id: teacherId, name: newClassName.trim() }),
    });
    const json = await res.json();
    if (json.error) { setAddError(json.error); setAddSaving(false); return; }
    setClasses(prev => [...prev, { ...json.class, teacher: null }]);
    setAddingFor(null); setNewClassName(""); setAddSaving(false);
    toast.success("Class created");
  }

  async function handleDeleteClass(id: string) {
    if (!confirm("Delete this class? Students enrolled will be unenrolled.")) return;
    await doFetch("/api/admin/delete-class", { method: "DELETE", body: JSON.stringify({ id }) });
    setClasses(prev => prev.filter(c => c.id !== id));
    toast.success("Class deleted");
  }

  if (loading) return <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>;
  if (subjects.length === 0) return <p className="text-sm text-muted-foreground">Add subjects first.</p>;

  // Get unique teachers per subject from assignMap
  return (
    <div className="space-y-5">
      {subjects.map(subject => {
        // All teachers assigned to this subject (across all grades)
        const teacherMap = new Map<string, ClassAssignment>();
        gradeLevels.forEach(g => {
          (assignMap[`${subject.id}-${g.id}`] ?? []).forEach(a => {
            if (!teacherMap.has(a.teacher_id)) teacherMap.set(a.teacher_id, a);
          });
        });
        if (teacherMap.size === 0) return null;

        return (
          <div key={subject.id}>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{subject.name}</p>
            <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
              {[...teacherMap.values()].map(assignment => {
                const teacher = assignment.teacher as { id: string; full_name: string | null; username: string } | undefined;
                const teacherId = assignment.teacher_id;
                const teacherClasses = classes.filter(c => c.teacher_id === teacherId);
                const isAddingHere = addingFor === teacherId;

                return (
                  <div key={teacherId} className="px-4 py-3">
                    <div className="flex items-start gap-3 flex-wrap">
                      <span className="text-sm font-medium text-foreground shrink-0 w-36 pt-0.5 truncate">
                        {teacher?.full_name ?? teacher?.username ?? "—"}
                      </span>
                      <div className="flex flex-wrap gap-2 flex-1 min-w-0">
                        {teacherClasses.length === 0 && !isAddingHere && (
                          <span className="text-xs text-muted-foreground italic pt-0.5">No classes yet</span>
                        )}
                        {teacherClasses.map(cls => (
                          <div key={cls.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-muted/30 text-sm">
                            <span className="font-medium">{cls.name}</span>
                            <button
                              onClick={() => handleDeleteClass(cls.id)}
                              className="text-muted-foreground/50 hover:text-destructive transition-colors"
                              aria-label="Delete class"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        {isAddingHere ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={newClassName}
                              onChange={e => setNewClassName(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") handleAddClass(teacherId); if (e.key === "Escape") { setAddingFor(null); setNewClassName(""); }}}
                              placeholder="e.g. Class A"
                              autoFocus
                              className="h-7 w-28 px-2 text-xs border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
                            />
                            <Button size="sm" className="h-7 text-xs" onClick={() => handleAddClass(teacherId)} disabled={addSaving || !newClassName.trim()}>
                              {addSaving ? "…" : "Add"}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingFor(null); setNewClassName(""); setAddError(""); }}>
                              Cancel
                            </Button>
                            {addError && <span className="text-xs text-destructive">{addError}</span>}
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAddingFor(teacherId); setNewClassName(""); setAddError(""); }}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Plus className="h-3 w-3" /> Add class
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Accordion section wrapper ─────────────────────────────────────────────────

function AccordionSection({ title, description, children, defaultOpen = true }: { title: string; description?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 bg-muted/20 hover:bg-muted/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset" aria-expanded={open}>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-5 py-5 border-t border-border">{children}</div>}
    </div>
  );
}

// ── Page navigation types ─────────────────────────────────────────────────────

type SetupPage =
  | { type: "root" }
  | { type: "grade"; gradeId: string; gradeName: string }
  | { type: "subject"; gradeId: string; gradeName: string; subjectId: string; subjectName: string };

// ── Breadcrumb ────────────────────────────────────────────────────────────────

function Breadcrumb({ page, onNavigate }: { page: SetupPage; onNavigate: (p: SetupPage) => void }) {
  if (page.type === "root") return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
      <button onClick={() => onNavigate({ type: "root" })} className="hover:text-foreground transition-colors">School Setup</button>
      <span>/</span>
      {page.type === "grade" && <span className="text-foreground font-medium">{page.gradeName}</span>}
      {page.type === "subject" && (
        <>
          <button onClick={() => onNavigate({ type: "grade", gradeId: page.gradeId, gradeName: page.gradeName })} className="hover:text-foreground transition-colors">{page.gradeName}</button>
          <span>/</span>
          <span className="text-foreground font-medium">{page.subjectName}</span>
        </>
      )}
    </div>
  );
}

// ── Grade config table (root → grade overview) ────────────────────────────────

function GradeConfigTable({ onGradeClick }: { onGradeClick: (gradeId: string, gradeName: string) => void }) {
  const doFetch = useSchoolFetch();
  const [grades, setGrades] = useState<GradeLevel[]>([]);
  const [progress, setProgress] = useState<Record<string, { subjects: number; withTeacher: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [glRes, assignRes] = await Promise.all([
        doFetch("/api/admin/list-grade-levels").then(r => r.json()),
        doFetch("/api/admin/list-class-assignments").then(r => r.json()),
      ]);
      const grds: GradeLevel[] = glRes.grade_levels ?? [];
      setGrades(grds);

      // Load grade_subjects for each grade to get subject counts
      const progressMap: Record<string, { subjects: number; withTeacher: number }> = {};
      await Promise.all(grds.map(async g => {
        const gsRes = await doFetch(`/api/admin/grade-subjects?grade_level_id=${g.id}`).then(r => r.json());
        const gradeSubjects = gsRes.grade_subjects ?? [];
        const assignments: ClassAssignment[] = (assignRes.assignments ?? []).filter((a: ClassAssignment) => a.grade_level_id === g.id);
        const assignedSubjectIds = new Set(assignments.map((a: ClassAssignment) => a.subject_id));
        progressMap[g.id] = {
          subjects: gradeSubjects.length,
          withTeacher: gradeSubjects.filter((gs: { subject_id: string }) => assignedSubjectIds.has(gs.subject_id)).length,
        };
      }));
      setProgress(progressMap);
      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="text-sm text-muted-foreground py-4">Loading grades…</div>;
  if (grades.length === 0) return <p className="text-sm text-muted-foreground">Add grade levels above first.</p>;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Grade</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Subjects</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Status</th>
            <th className="w-28 px-4" />
          </tr>
        </thead>
        <tbody>
          {grades.map(g => {
            const p = progress[g.id] ?? { subjects: 0, withTeacher: 0 };
            const complete = p.subjects > 0 && p.withTeacher === p.subjects;
            return (
              <tr key={g.id} className="border-t hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium">{g.name}</td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                  {p.subjects === 0 ? "None added" : `${p.subjects} subject${p.subjects !== 1 ? "s" : ""}`}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  {p.subjects === 0 ? (
                    <span className="text-xs text-muted-foreground">Not configured</span>
                  ) : complete ? (
                    <span className="text-xs font-medium" style={{ color: "var(--status-taught-text)" }}>All teachers assigned</span>
                  ) : (
                    <span className="text-xs text-amber-600">{p.withTeacher}/{p.subjects} teachers assigned</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onGradeClick(g.id, g.name)}>
                    Configure <span className="text-muted-foreground">→</span>
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Grade page (subjects for a grade) ─────────────────────────────────────────

function GradeSubjectsPage({ gradeId, gradeName, onSubjectClick }: { gradeId: string; gradeName: string; onSubjectClick: (subjectId: string, subjectName: string) => void }) {
  const doFetch = useSchoolFetch();
  const [gradeSubjects, setGradeSubjects] = useState<{ id: string; subject_id: string; subjects: { id: string; name: string; slot: number } }[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [savingSubject, setSavingSubject] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [gsRes, sjRes, assignRes] = await Promise.all([
      doFetch(`/api/admin/grade-subjects?grade_level_id=${gradeId}`).then(r => r.json()),
      doFetch("/api/admin/list-subjects").then(r => r.json()),
      doFetch(`/api/admin/list-class-assignments?grade_level_id=${gradeId}`).then(r => r.json()),
    ]);
    setGradeSubjects(gsRes.grade_subjects ?? []);
    setAllSubjects(sjRes.subjects ?? []);
    setAssignments(assignRes.assignments ?? []);
    setLoading(false);
  }, [gradeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const addedSubjectIds = new Set(gradeSubjects.map(gs => gs.subject_id));
  const availableSubjects = allSubjects.filter(s => !addedSubjectIds.has(s.id));

  async function handleAddSubject(subjectId: string) {
    setSavingSubject(subjectId);
    const res = await doFetch("/api/admin/grade-subjects", {
      method: "POST",
      body: JSON.stringify({ grade_level_id: gradeId, subject_id: subjectId }),
    });
    const json = await res.json();
    if (!json.error) {
      await load();
      setAdding(false);
      toast.success("Subject added to grade");
    }
    setSavingSubject("");
  }

  async function handleRemoveSubject(gsId: string) {
    if (!confirm("Remove this subject from the grade? Teacher assignments for it will also be removed.")) return;
    await doFetch("/api/admin/grade-subjects", { method: "DELETE", body: JSON.stringify({ id: gsId }) });
    await load();
    toast.success("Subject removed");
  }

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Select which subjects are taught in {gradeName}, then configure the teacher and classes for each.</p>

      {gradeSubjects.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Subject</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Teacher</th>
                <th className="w-32 px-4" />
              </tr>
            </thead>
            <tbody>
              {gradeSubjects.map(gs => {
                const assignment = assignments.find(a => a.subject_id === gs.subject_id);
                const teacher = assignment?.teacher as Profile | undefined;
                return (
                  <tr key={gs.id} className="border-t hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{gs.subjects?.name}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {teacher ? (
                        <span className="text-sm text-foreground">{teacher.full_name ?? teacher.username}</span>
                      ) : (
                        <span className="text-xs text-amber-600">No teacher assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onSubjectClick(gs.subject_id, gs.subjects?.name)}>
                          Configure <span className="text-muted-foreground">→</span>
                        </Button>
                        <button onClick={() => handleRemoveSubject(gs.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1" aria-label="Remove subject">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {gradeSubjects.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">No subjects added to {gradeName} yet.</p>
      )}

      {adding ? (
        <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
          <p className="text-xs font-medium text-muted-foreground">Choose a subject to add</p>
          {availableSubjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">All school subjects are already added to this grade.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableSubjects.map(s => (
                <Button key={s.id} size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAddSubject(s.id)} disabled={savingSubject === s.id}>
                  {savingSubject === s.id ? "Adding…" : `+ ${s.name}`}
                </Button>
              ))}
            </div>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(false)}>Cancel</Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => setAdding(true)} disabled={availableSubjects.length === 0}>
          <Plus className="h-3.5 w-3.5" /> Add Subject
        </Button>
      )}
    </div>
  );
}

// ── Subject detail page (teacher + class assignment) ──────────────────────────

interface ClassRecord { id: string; name: string; teacher_id: string }

function SubjectDetailPage({ gradeId, subjectId, subjectName }: { gradeId: string; subjectId: string; subjectName: string }) {
  const doFetch = useSchoolFetch();
  const [availableTeachers, setAvailableTeachers] = useState<Profile[]>([]);
  const [allClasses, setAllClasses] = useState<ClassRecord[]>([]);
  const [existingAssignment, setExistingAssignment] = useState<ClassAssignment | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [assignmentLoaded, setAssignmentLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const [assignRes, clsRes, usersRes] = await Promise.all([
        doFetch(`/api/admin/list-class-assignments?subject_id=${subjectId}&grade_level_id=${gradeId}`).then(r => r.json()),
        doFetch("/api/admin/list-classes").then(r => r.json()),
        doFetch("/api/admin/list-users").then(r => r.json()),
      ]);
      const assignments: ClassAssignment[] = assignRes.assignments ?? [];
      const existing = assignments[0] ?? null;
      setExistingAssignment(existing);
      setAllClasses(clsRes.classes ?? []);
      setAvailableTeachers((usersRes.users ?? []).filter((u: Profile) => u.role === "teacher" || u.role === "hod"));
      setAssignmentLoaded(true);
      setLoading(false);
    }
    load();
  }, [gradeId, subjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Set teacher selection after all data is loaded (teachers + assignment loaded together)
  useEffect(() => {
    if (assignmentLoaded && existingAssignment) {
      setSelectedTeacherId(existingAssignment.teacher_id ?? "");
      setSelectedClassIds((existingAssignment as unknown as { class_ids?: string[] })?.class_ids ?? []);
    }
  }, [assignmentLoaded, existingAssignment]);

  const teacherClasses = allClasses.filter(c => c.teacher_id === selectedTeacherId);

  function toggleClass(classId: string) {
    setSelectedClassIds(prev => prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]);
  }

  async function handleSave() {
    if (!selectedTeacherId) return;
    setSaving(true); setSaved(false);
    let res: Response;
    if (existingAssignment) {
      // Update existing assignment
      res = await doFetch("/api/admin/update-class-assignment", {
        method: "PATCH",
        body: JSON.stringify({ id: existingAssignment.id, class_ids: selectedClassIds }),
      });
      // If teacher changed, we need to delete + recreate
      if (existingAssignment.teacher_id !== selectedTeacherId) {
        await doFetch("/api/admin/delete-class-assignment", { method: "DELETE", body: JSON.stringify({ id: existingAssignment.id }) });
        res = await doFetch("/api/admin/update-class-assignment", {
          method: "POST",
          body: JSON.stringify({ teacher_id: selectedTeacherId, subject_id: subjectId, grade_level_id: gradeId, class_ids: selectedClassIds }),
        });
      }
    } else {
      res = await doFetch("/api/admin/update-class-assignment", {
        method: "POST",
        body: JSON.stringify({ teacher_id: selectedTeacherId, subject_id: subjectId, grade_level_id: gradeId, class_ids: selectedClassIds }),
      });
    }
    const json = await res.json();
    setSaving(false);
    if (!json.error) {
      setSaved(true);
      setExistingAssignment(json.assignment ?? json.assignment);
      toast.success("Assignment saved");
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>;

  return (
    <div className="space-y-6 max-w-lg">
      <p className="text-xs text-muted-foreground">Assign a teacher to {subjectName} and select which of their classes they will teach for this grade.</p>

      {/* Teacher selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Teacher</Label>
        <Select value={selectedTeacherId} onValueChange={(v) => { setSelectedTeacherId(v ?? ""); setSelectedClassIds([]); setSaved(false); }}>
          <SelectTrigger className="h-9">
            {/* Resolve label directly — SelectValue only resolves after dropdown is opened */}
            <span className={selectedTeacherId ? "text-foreground" : "text-muted-foreground"}>
              {selectedTeacherId
                ? (availableTeachers.find(t => t.id === selectedTeacherId)?.full_name ?? availableTeachers.find(t => t.id === selectedTeacherId)?.username ?? "Unknown teacher")
                : "Select a teacher…"}
            </span>
          </SelectTrigger>
          <SelectContent>
            {availableTeachers.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.full_name ?? t.username}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Class selection — only when teacher is selected */}
      {selectedTeacherId && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Classes</Label>
          <p className="text-xs text-muted-foreground">Which of this teacher&apos;s pre-created classes will they teach for {subjectName}?</p>
          {teacherClasses.length === 0 ? (
            <p className="text-sm text-amber-600">This teacher has no classes created yet. Go to School Setup → Classes to create them first.</p>
          ) : (
            <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
              {teacherClasses.map(cls => (
                <label key={cls.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedClassIds.includes(cls.id)}
                    onChange={() => { toggleClass(cls.id); setSaved(false); }}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary/50"
                  />
                  <span className="text-sm font-medium">{cls.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={saving || !selectedTeacherId || selectedClassIds.length === 0}
        className="h-9"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save Assignment"}
      </Button>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function SchoolSetupView({ overrideSchoolId }: { overrideSchoolId?: string | null } = {}) {
  const [page, setPage] = useState<SetupPage>({ type: "root" });

  return (
    <SchoolOverrideCtx.Provider value={overrideSchoolId ?? null}>
      <PageContainer
        title="School Setup"
        description={page.type === "root" ? "Configure your school's subjects, grade levels, classes, and grade curriculum." : undefined}
      >
        <Breadcrumb page={page} onNavigate={setPage} />

        {page.type === "root" && (
          <div className="space-y-4">
            <AccordionSection title="Subjects" description="School-wide subject names. Add all subjects taught across any grade." defaultOpen={true}>
              <SubjectsTab />
            </AccordionSection>
            <AccordionSection title="Grade Levels" description="Year or grade groupings." defaultOpen={true}>
              <GradeLevelsTab />
            </AccordionSection>
            <AccordionSection title="Classes" description="Pre-create named class sections (e.g. Class A, Class B). These are assigned to teachers per subject below." defaultOpen={true}>
              <ClassesSection />
            </AccordionSection>
            <AccordionSection title="Grade Configuration" description="Configure which subjects are taught in each grade, assign teachers, and assign classes." defaultOpen={true}>
              <GradeConfigTable onGradeClick={(id, name) => setPage({ type: "grade", gradeId: id, gradeName: name })} />
            </AccordionSection>
          </div>
        )}

        {page.type === "grade" && (
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">{page.gradeName}</h2>
            <p className="text-sm text-muted-foreground mb-4">Subjects taught in this grade.</p>
            <GradeSubjectsPage
              gradeId={page.gradeId}
              gradeName={page.gradeName}
              onSubjectClick={(subjectId, subjectName) =>
                setPage({ type: "subject", gradeId: page.gradeId, gradeName: page.gradeName, subjectId, subjectName })
              }
            />
          </div>
        )}

        {page.type === "subject" && (
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">{page.subjectName}</h2>
            <p className="text-sm text-muted-foreground mb-4">Teacher and class assignment for {page.gradeName}.</p>
            <SubjectDetailPage gradeId={page.gradeId} subjectId={page.subjectId} subjectName={page.subjectName} />
          </div>
        )}
      </PageContainer>
    </SchoolOverrideCtx.Provider>
  );
}
