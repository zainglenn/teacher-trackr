"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { Plus, Trash2, CheckSquare, Square } from "lucide-react";
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
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await doFetch("/api/admin/delete-subject", { method: "DELETE", body: JSON.stringify({ id }) });
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
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await doFetch("/api/admin/delete-grade-level", { method: "DELETE", body: JSON.stringify({ id }) });
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

// ── Class Assignments Tab ─────────────────────────────────────────────────────

function ClassAssignmentsTab() {
  const doFetch = useSchoolFetch();
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
      doFetch("/api/admin/list-subjects").then(r => r.json()),
      doFetch("/api/admin/list-grade-levels").then(r => r.json()),
    ]).then(([sj, gl]) => {
      setSubjects(sj.subjects ?? []);
      setGradeLevels(gl.grade_levels ?? []);
    });
  }, []);

  const loadAssignments = useCallback(async (subjectId: string, gradeId: string) => {
    if (!subjectId || !gradeId) return;
    setLoadingAssignments(true);
    const res = await doFetch(`/api/admin/list-class-assignments?subject_id=${subjectId}&grade_level_id=${gradeId}`);
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
    const res = await doFetch("/api/admin/create-class-assignment", {
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
    await doFetch("/api/admin/update-class-assignment", {
      method: "PATCH",
      body: JSON.stringify({ id: assignment.id, is_lead: !assignment.is_lead }),
    });
    await loadAssignments(selectedSubjectId, selectedGradeId);
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this teacher from the class assignment?")) return;
    await doFetch("/api/admin/delete-class-assignment", { method: "DELETE", body: JSON.stringify({ id }) });
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

export function SchoolSetupView({ overrideSchoolId }: { overrideSchoolId?: string | null } = {}) {
  const [tab, setTab] = useState<Tab>("subjects");
  const active = TABS.find(t => t.key === tab)!;

  return (
    <SchoolOverrideCtx.Provider value={overrideSchoolId ?? null}>
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
    </SchoolOverrideCtx.Provider>
  );
}
