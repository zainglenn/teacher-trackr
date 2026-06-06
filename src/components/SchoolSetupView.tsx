"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { adminFetch } from "@/lib/authToken";
import { getSubjectSlotStyle, nextAvailableSlot, SUBJECT_SLOTS, type SubjectSlot } from "@/lib/subjectSlot";
import { GradeLevel, Subject, ClassAssignment, Profile } from "@/types";

// ── Context ───────────────────────────────────────────────────────────────────

const SchoolOverrideCtx = createContext<string | null>(null);

function useSchoolFetch() {
  const overrideId = useContext(SchoolOverrideCtx);
  return (path: string, options?: RequestInit) =>
    adminFetch(path, options, overrideId ? { "x-school-id": overrideId } : undefined);
}

// ── Page types ────────────────────────────────────────────────────────────────

type SetupPage =
  | { type: "root" }
  | { type: "grade"; gradeId: string; gradeName: string }
  | { type: "subject"; gradeId: string; gradeName: string; subjectId: string; subjectName: string };

// ── Breadcrumb ────────────────────────────────────────────────────────────────

function Breadcrumb({ page, onNavigate }: { page: SetupPage; onNavigate: (p: SetupPage) => void }) {
  if (page.type === "root") return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-5">
      <button onClick={() => onNavigate({ type: "root" })} className="hover:text-foreground transition-colors">School Setup</button>
      <ChevronRight className="h-3 w-3" />
      {page.type === "grade" && <span className="font-medium text-foreground">{page.gradeName}</span>}
      {page.type === "subject" && (
        <>
          <button onClick={() => onNavigate({ type: "grade", gradeId: page.gradeId, gradeName: page.gradeName })} className="hover:text-foreground transition-colors">{page.gradeName}</button>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-foreground">{page.subjectName}</span>
        </>
      )}
    </div>
  );
}

// ── Root page — grade table ───────────────────────────────────────────────────

interface GradeProgress { subjects: number; withTeacher: number }
interface ClassRecord { id: string; name: string; teacher_id: string }

function RootPage({ onGradeClick }: { onGradeClick: (id: string, name: string) => void }) {
  const doFetch = useSchoolFetch();
  const [grades, setGrades] = useState<GradeLevel[]>([]);
  const [progress, setProgress] = useState<Record<string, GradeProgress>>({});
  const [loading, setLoading] = useState(true);
  const [newGradeName, setNewGradeName] = useState("");
  const [addingGrade, setAddingGrade] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [glRes, assignRes] = await Promise.all([
      doFetch("/api/admin/list-grade-levels").then(r => r.json()),
      doFetch("/api/admin/list-class-assignments").then(r => r.json()),
    ]);
    const grds: GradeLevel[] = glRes.grade_levels ?? [];
    setGrades(grds);

    const pMap: Record<string, GradeProgress> = {};
    await Promise.all(grds.map(async g => {
      const gsRes = await doFetch(`/api/admin/grade-subjects?grade_level_id=${g.id}`).then(r => r.json());
      const gs = gsRes.grade_subjects ?? [];
      const assigned = new Set((assignRes.assignments ?? []).filter((a: ClassAssignment) => a.grade_level_id === g.id).map((a: ClassAssignment) => a.subject_id));
      pMap[g.id] = { subjects: gs.length, withTeacher: gs.filter((s: { subject_id: string }) => assigned.has(s.subject_id)).length };
    }));
    setProgress(pMap);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  async function handleAddGrade() {
    if (!newGradeName.trim()) return;
    const res = await doFetch("/api/admin/create-grade-level", {
      method: "POST",
      body: JSON.stringify({ name: newGradeName.trim(), sort_order: grades.length }),
    });
    const json = await res.json();
    if (json.error) { toast.error(json.error); return; }
    setNewGradeName(""); setAddingGrade(false);
    await load();
    toast.success("Grade added");
  }

  async function handleDeleteGrade(id: string, name: string) {
    if (!confirm(`Remove ${name}? All subjects and teacher assignments for this grade will also be removed.`)) return;
    await doFetch("/api/admin/delete-grade-level", { method: "DELETE", body: JSON.stringify({ id }) });
    await load();
    toast.success("Grade removed");
  }

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>;

  return (
    <div className="space-y-2">
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Grade</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Subjects</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Teachers</th>
              <th className="w-32 px-4" />
            </tr>
          </thead>
          <tbody>
            {grades.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">No grades yet — add one below.</td></tr>
            )}
            {grades.map(g => {
              const p = progress[g.id] ?? { subjects: 0, withTeacher: 0 };
              const done = p.subjects > 0 && p.withTeacher === p.subjects;
              return (
                <tr key={g.id} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{g.name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell text-sm">
                    {p.subjects === 0 ? "None added" : `${p.subjects} subject${p.subjects !== 1 ? "s" : ""}`}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-sm">
                    {p.subjects === 0 ? <span className="text-muted-foreground">—</span>
                      : done ? <span style={{ color: "var(--status-taught-text)" }}>All assigned</span>
                      : <span className="text-amber-600">{p.withTeacher}/{p.subjects} assigned</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onGradeClick(g.id, g.name)}>Configure →</Button>
                      <button onClick={() => handleDeleteGrade(g.id, g.name)} className="text-muted-foreground hover:text-destructive transition-colors p-1" aria-label="Delete grade">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {/* Inline add grade row */}
            <tr className="border-t bg-muted/10">
              <td colSpan={4} className="px-4 py-2.5">
                {addingGrade ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newGradeName}
                      onChange={e => setNewGradeName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleAddGrade(); if (e.key === "Escape") { setAddingGrade(false); setNewGradeName(""); } }}
                      placeholder="e.g. Grade 6"
                      autoFocus
                      className="h-7 w-36 px-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
                    />
                    <Button size="sm" className="h-7 text-xs" onClick={handleAddGrade} disabled={!newGradeName.trim()}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingGrade(false); setNewGradeName(""); }}>Cancel</Button>
                  </div>
                ) : (
                  <button onClick={() => setAddingGrade(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Plus className="h-3.5 w-3.5" /> Add Grade
                  </button>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Grade page — subjects ─────────────────────────────────────────────────────

function GradePage({ gradeId, gradeName, onSubjectClick }: { gradeId: string; gradeName: string; onSubjectClick: (id: string, name: string) => void }) {
  const doFetch = useSchoolFetch();
  const [gradeSubjects, setGradeSubjects] = useState<{ id: string; subject_id: string; subjects: { id: string; name: string; slot: number } }[]>([]);
  const [schoolSubjects, setSchoolSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [addingSaving, setAddingSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [gsRes, sjRes, assignRes] = await Promise.all([
      doFetch(`/api/admin/grade-subjects?grade_level_id=${gradeId}`).then(r => r.json()),
      doFetch("/api/admin/list-subjects").then(r => r.json()),
      doFetch(`/api/admin/list-class-assignments?grade_level_id=${gradeId}`).then(r => r.json()),
    ]);
    setGradeSubjects(gsRes.grade_subjects ?? []);
    setSchoolSubjects(sjRes.subjects ?? []);
    setAssignments(assignRes.assignments ?? []);
    setLoading(false);
  }, [gradeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  async function handleAddSubject() {
    const name = newSubjectName.trim();
    if (!name) return;
    setAddingSaving(true);
    try {
      // Find or create the school-wide subject
      let subjectId = schoolSubjects.find(s => s.name.toLowerCase() === name.toLowerCase())?.id;
      if (!subjectId) {
        const usedSlots = schoolSubjects.map(s => s.slot);
        const slot = nextAvailableSlot(usedSlots as SubjectSlot[]);
        const createRes = await doFetch("/api/admin/create-subject", { method: "POST", body: JSON.stringify({ name, slot }) });
        const createJson = await createRes.json();
        if (createJson.error) { toast.error(createJson.error); return; }
        subjectId = createJson.subject?.id;
      }
      if (!subjectId) return;
      // Check not already in this grade
      if (gradeSubjects.some(gs => gs.subject_id === subjectId)) { toast.error("Already added to this grade"); return; }
      // Add to grade
      const addRes = await doFetch("/api/admin/grade-subjects", { method: "POST", body: JSON.stringify({ grade_level_id: gradeId, subject_id: subjectId }) });
      const addJson = await addRes.json();
      if (addJson.error) { toast.error(addJson.error); return; }
      setNewSubjectName("");
      await load();
      toast.success(`${name} added to ${gradeName}`);
    } finally { setAddingSaving(false); }
  }

  async function handleRemoveSubject(gsId: string, subjectName: string) {
    if (!confirm(`Remove ${subjectName} from ${gradeName}? Teacher and class assignments for it will also be removed.`)) return;
    await doFetch("/api/admin/grade-subjects", { method: "DELETE", body: JSON.stringify({ id: gsId }) });
    await load();
    toast.success("Subject removed");
  }

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>;

  return (
    <div className="space-y-2">
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Subject</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Teacher</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Classes</th>
              <th className="w-32 px-4" />
            </tr>
          </thead>
          <tbody>
            {gradeSubjects.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">No subjects yet — add one below.</td></tr>
            )}
            {gradeSubjects.map(gs => {
              const assignment = assignments.find(a => a.subject_id === gs.subject_id);
              const teacher = assignment?.teacher as Profile | undefined;
              const classIds = (assignment as unknown as { class_ids?: string[] })?.class_ids ?? [];
              const subjectStyle = getSubjectSlotStyle(gs.subjects?.slot as SubjectSlot ?? 1);
              return (
                <tr key={gs.id} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: subjectStyle.accentColor }} />
                      <span className="font-medium">{gs.subjects?.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-sm">
                    {teacher ? <span>{teacher.full_name ?? teacher.username}</span> : <span className="text-amber-600">No teacher</span>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">
                    {classIds.length > 0 ? `${classIds.length} class${classIds.length !== 1 ? "es" : ""}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onSubjectClick(gs.subject_id, gs.subjects?.name)}>Configure →</Button>
                      <button onClick={() => handleRemoveSubject(gs.id, gs.subjects?.name)} className="text-muted-foreground hover:text-destructive transition-colors p-1" aria-label="Remove">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {/* Inline add subject row */}
            <tr className="border-t bg-muted/10">
              <td colSpan={4} className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSubjectName}
                    onChange={e => setNewSubjectName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleAddSubject(); if (e.key === "Escape") setNewSubjectName(""); }}
                    placeholder="Subject name (e.g. English)"
                    className="h-7 w-52 px-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
                  />
                  <Button size="sm" className="h-7 text-xs" onClick={handleAddSubject} disabled={addingSaving || !newSubjectName.trim()}>
                    {addingSaving ? "Adding…" : "+ Add Subject"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Type a subject name. If it doesn&apos;t exist school-wide it will be created automatically.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Subject page — teacher + classes ──────────────────────────────────────────

function SubjectPage({ gradeId, subjectId, subjectName }: { gradeId: string; subjectId: string; subjectName: string }) {
  const doFetch = useSchoolFetch();
  const [availableTeachers, setAvailableTeachers] = useState<Profile[]>([]);
  const [allClasses, setAllClasses] = useState<ClassRecord[]>([]);
  const [existingAssignment, setExistingAssignment] = useState<ClassAssignment | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [assignRes, clsRes, usersRes] = await Promise.all([
      doFetch(`/api/admin/list-class-assignments?subject_id=${subjectId}&grade_level_id=${gradeId}`).then(r => r.json()),
      doFetch(`/api/admin/list-classes?grade_level_id=${gradeId}`).then(r => r.json()),
      doFetch("/api/admin/list-users").then(r => r.json()),
    ]);
    const existing: ClassAssignment | null = (assignRes.assignments ?? [])[0] ?? null;
    const teachers: Profile[] = (usersRes.users ?? []).filter((u: Profile) => u.role === "teacher" || u.role === "hod");
    setExistingAssignment(existing);
    setAvailableTeachers(teachers);
    setAllClasses(clsRes.classes ?? []);
    if (existing) {
      setSelectedTeacherId(existing.teacher_id ?? "");
      setSelectedClassIds((existing as unknown as { class_ids?: string[] })?.class_ids ?? []);
    }
    setLoading(false);
  }, [gradeId, subjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // All classes for this grade (not filtered by teacher — classes belong to grade, not teacher)
  const teacherClasses = allClasses;

  function toggleClass(id: string) {
    setSelectedClassIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setSaved(false);
  }

  async function handleSave() {
    if (!selectedTeacherId || selectedClassIds.length === 0) return;
    setSaving(true); setSaved(false);
    let res: Response;
    if (existingAssignment && existingAssignment.teacher_id === selectedTeacherId) {
      res = await doFetch("/api/admin/update-class-assignment", {
        method: "PATCH",
        body: JSON.stringify({ id: existingAssignment.id, class_ids: selectedClassIds }),
      });
    } else {
      if (existingAssignment) {
        await doFetch("/api/admin/delete-class-assignment", { method: "DELETE", body: JSON.stringify({ id: existingAssignment.id }) });
      }
      res = await doFetch("/api/admin/update-class-assignment", {
        method: "POST",
        body: JSON.stringify({ teacher_id: selectedTeacherId, subject_id: subjectId, grade_level_id: gradeId, class_ids: selectedClassIds }),
      });
    }
    const json = await res.json();
    setSaving(false);
    if (!json.error) { setSaved(true); toast.success("Assignment saved"); }
  }

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>;

  return (
    <div className="space-y-6 max-w-lg">
      {/* Teacher */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Teacher</Label>
        <Select
          value={selectedTeacherId}
          onValueChange={v => { setSelectedTeacherId(v ?? ""); setSelectedClassIds([]); setSaved(false); }}
        >
          <SelectTrigger className="h-9">
            <span className={selectedTeacherId ? "text-foreground" : "text-muted-foreground"}>
              {selectedTeacherId
                ? (availableTeachers.find(t => t.id === selectedTeacherId)?.full_name ?? availableTeachers.find(t => t.id === selectedTeacherId)?.username ?? "Unknown")
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

      {/* Classes */}
      {selectedTeacherId && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Classes</Label>
          <p className="text-xs text-muted-foreground">Select which of this teacher&apos;s classes cover {subjectName}.</p>
          {teacherClasses.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-4 text-center">
              <p className="text-sm text-muted-foreground">No classes created for this teacher yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Go back to School Setup and create classes under <strong>Classes</strong>.</p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
              {teacherClasses.map(cls => (
                <label key={cls.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedClassIds.includes(cls.id)}
                    onChange={() => toggleClass(cls.id)}
                    className="h-4 w-4 rounded border-border text-primary"
                  />
                  <span className="text-sm font-medium">{cls.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <Button onClick={handleSave} disabled={saving || !selectedTeacherId || selectedClassIds.length === 0} className="h-9">
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save Assignment"}
      </Button>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function SchoolSetupView({ overrideSchoolId }: { overrideSchoolId?: string | null } = {}) {
  const [page, setPage] = useState<SetupPage>({ type: "root" });

  const pageTitle = page.type === "root" ? "School Setup"
    : page.type === "grade" ? page.gradeName
    : page.subjectName;

  const pageDesc = page.type === "root"
    ? "Configure grades, subjects, teachers, and classes for the school year."
    : page.type === "grade"
    ? `Subjects taught in ${page.gradeName}.`
    : `Teacher and class assignment for ${page.subjectName} in ${page.gradeName}.`;

  return (
    <SchoolOverrideCtx.Provider value={overrideSchoolId ?? null}>
      <PageContainer title={pageTitle} description={pageDesc}>
        <Breadcrumb page={page} onNavigate={setPage} />
        {page.type === "root" && (
          <RootPage onGradeClick={(id, name) => setPage({ type: "grade", gradeId: id, gradeName: name })} />
        )}
        {page.type === "grade" && (
          <GradePage
            gradeId={page.gradeId}
            gradeName={page.gradeName}
            onSubjectClick={(id, name) => setPage({ type: "subject", gradeId: page.gradeId, gradeName: page.gradeName, subjectId: id, subjectName: name })}
          />
        )}
        {page.type === "subject" && (
          <SubjectPage gradeId={page.gradeId} subjectId={page.subjectId} subjectName={page.subjectName} />
        )}
      </PageContainer>
    </SchoolOverrideCtx.Provider>
  );
}
