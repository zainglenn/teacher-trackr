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

// ── Shell ─────────────────────────────────────────────────────────────────────

// ── Accordion section wrapper ─────────────────────────────────────────────────

function AccordionSection({
  title,
  description,
  children,
  defaultOpen = true,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-muted/20 hover:bg-muted/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
        aria-expanded={open}
      >
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 py-5 border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}

export function SchoolSetupView({ overrideSchoolId }: { overrideSchoolId?: string | null } = {}) {
  return (
    <SchoolOverrideCtx.Provider value={overrideSchoolId ?? null}>
      <PageContainer
        title="School Setup"
        description="Configure your school's subjects, grade levels, and teacher class assignments."
      >
        <div className="space-y-4">
          <AccordionSection
            title="Subjects"
            description="Top-level groupings for plans and teacher assignments."
            defaultOpen={true}
          >
            <SubjectsTab />
          </AccordionSection>

          <AccordionSection
            title="Grade Levels"
            description="Year or grade groupings for teacher class assignments."
            defaultOpen={true}
          >
            <GradeLevelsTab />
          </AccordionSection>

          <AccordionSection
            title="Class Assignments"
            description="Assign teachers to subject and grade combinations."
            defaultOpen={true}
          >
            <ClassAssignmentsTab />
          </AccordionSection>
        </div>
      </PageContainer>
    </SchoolOverrideCtx.Provider>
  );
}
