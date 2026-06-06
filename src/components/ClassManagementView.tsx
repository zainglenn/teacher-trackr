"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/authToken";
import { GradeLevel } from "@/types";

interface ClassRow { id: string; name: string; grade_level_id: string; school_id: string }

type Page = { type: "root" } | { type: "grade"; gradeId: string; gradeName: string };

export function ClassManagementView() {
  const [page, setPage] = useState<Page>({ type: "root" });

  return page.type === "root"
    ? <GradeListPage onGradeClick={(id, name) => setPage({ type: "grade", gradeId: id, gradeName: name })} />
    : <GradeClassesPage gradeId={page.gradeId} gradeName={page.gradeName} onBack={() => setPage({ type: "root" })} />;
}

// ── Grade list ────────────────────────────────────────────────────────────────

function GradeListPage({ onGradeClick }: { onGradeClick: (id: string, name: string) => void }) {
  const [grades, setGrades] = useState<GradeLevel[]>([]);
  const [classCounts, setClassCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [glRes, clsRes] = await Promise.all([
      adminFetch("/api/admin/list-grade-levels").then(r => r.json()),
      adminFetch("/api/admin/list-classes").then(r => r.json()),
    ]);
    const grds: GradeLevel[] = glRes.grade_levels ?? [];
    const cls: ClassRow[] = clsRes.classes ?? [];
    setGrades(grds);
    const counts: Record<string, number> = {};
    for (const g of grds) counts[g.id] = cls.filter(c => c.grade_level_id === g.id).length;
    setClassCounts(counts);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <PageContainer title="Class Management" description="Create and manage class groups for each grade.">
      <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
    </PageContainer>
  );

  return (
    <PageContainer title="Class Management" description="Create class groups for each grade. These are referenced throughout the application for scheduling, delivery, and student assignment.">
      {grades.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 border border-dashed border-border rounded-lg gap-2">
          <p className="text-sm text-muted-foreground">No grades configured yet.</p>
          <p className="text-xs text-muted-foreground">Add grades in School Setup first.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Grade</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Classes</th>
                <th className="w-24 px-4" />
              </tr>
            </thead>
            <tbody>
              {grades.map(g => (
                <tr key={g.id} className="border-t hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => onGradeClick(g.id, g.name)}>
                  <td className="px-4 py-3 font-medium">{g.name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell text-sm">
                    {classCounts[g.id] ?? 0} class{(classCounts[g.id] ?? 0) !== 1 ? "es" : ""}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}

// ── Grade classes ─────────────────────────────────────────────────────────────

function GradeClassesPage({ gradeId, gradeName, onBack }: { gradeId: string; gradeName: string; onBack: () => void }) {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await adminFetch(`/api/admin/list-classes?grade_level_id=${gradeId}`).then(r => r.json());
    setClasses(res.classes ?? []);
    setLoading(false);
  }, [gradeId]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    if (!newName.trim()) return;
    setSaving(true);
    const res = await adminFetch("/api/admin/create-class", {
      method: "POST",
      body: JSON.stringify({ name: newName.trim(), grade_level_id: gradeId }),
    });
    const json = await res.json();
    if (json.error) { toast.error(json.error); setSaving(false); return; }
    setClasses(prev => [...prev, json.class]);
    setNewName("");
    setSaving(false);
    toast.success("Class created");
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete ${name}? Students and delivery records will be unlinked.`)) return;
    await adminFetch("/api/admin/delete-class", { method: "DELETE", body: JSON.stringify({ id }) });
    setClasses(prev => prev.filter(c => c.id !== id));
    toast.success("Class deleted");
  }

  return (
    <PageContainer
      title={gradeName}
      description={`Class groups in ${gradeName}. Add all classes that are taught in this grade.`}
      action={
        <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={onBack}>
          ← All Grades
        </Button>
      }
    >
      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Class Name</th>
                <th className="w-16 px-4" />
              </tr>
            </thead>
            <tbody>
              {classes.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No classes yet — add one below.
                  </td>
                </tr>
              )}
              {classes.map(cls => (
                <tr key={cls.id} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{cls.name}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(cls.id, cls.name)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {/* Inline add row */}
              <tr className="border-t bg-muted/10">
                <td colSpan={2} className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
                      placeholder={`e.g. ${gradeName.replace("Grade ", "")}A`}
                      className="h-7 w-36 px-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
                    />
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={handleAdd} disabled={saving || !newName.trim()}>
                      <Plus className="h-3 w-3" /> Add Class
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}
