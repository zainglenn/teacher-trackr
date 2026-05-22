"use client";

import { useState } from "react";
import { PageContainer } from "@/components/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalFooter, ModalCancel, ConfirmModal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GraduationCap, UserCog, Pencil, CalendarRange } from "lucide-react";
import { useAllClasses } from "@/hooks/useAllClasses";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { schoolYears } from "@/lib/utils";

const YEARS = schoolYears(4);

export function ManageClassesView() {
  const { classes, loading: classesLoading, createClass, deleteClass, reassignClass } = useAllClasses();
  const { users, loading: usersLoading } = useAdminUsers();
  const teachers = users.filter((u) => u.role === "teacher");

  // Year filter — default to the most common year in existing classes, or first in list
  const existingYears = [...new Set(classes.map((c) => c.school_year))].sort();
  const allYears = [...new Set([...existingYears, ...YEARS])].sort();
  const [activeYear, setActiveYear] = useState<string | null>(null);
  const effectiveYear = activeYear ?? (allYears[0] ?? YEARS[0]);

  const filteredClasses = classes.filter((c) => c.school_year === effectiveYear);

  const [addDialog, setAddDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTeacherId, setNewTeacherId] = useState("");
  const [newYear, setNewYear] = useState(effectiveYear);
  const [saving, setSaving] = useState(false);

  // Start New Year wizard
  const [newYearWizard, setNewYearWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [checkedClassIds, setCheckedClassIds] = useState<Set<string>>(new Set());
  const [wizardSaving, setWizardSaving] = useState(false);

  const nextYear = YEARS.find((y) => y > effectiveYear) ?? YEARS[YEARS.length - 1];

  function openWizard() {
    setCheckedClassIds(new Set(filteredClasses.map((c) => c.id)));
    setWizardStep(1);
    setNewYearWizard(true);
  }

  async function handleStartNewYear() {
    setWizardSaving(true);
    const toCreate = filteredClasses.filter((c) => checkedClassIds.has(c.id));
    for (const cls of toCreate) {
      await createClass(cls.name, cls.teacher_id, nextYear);
    }
    setWizardSaving(false);
    setNewYearWizard(false);
    setActiveYear(nextYear);
  }

  const [reassignDialog, setReassignDialog] = useState<string | null>(null);
  const [reassignTeacherId, setReassignTeacherId] = useState("");
  const [reassigning, setReassigning] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function handleCreate() {
    if (!newName.trim() || !newTeacherId) return;
    setSaving(true);
    await createClass(newName.trim(), newTeacherId, newYear);
    setSaving(false);
    setAddDialog(false);
    setNewName("");
    setNewTeacherId("");
  }

  async function handleReassign() {
    if (!reassignDialog || !reassignTeacherId) return;
    setReassigning(true);
    await reassignClass(reassignDialog, reassignTeacherId);
    setReassigning(false);
    setReassignDialog(null);
    setReassignTeacherId("");
  }

  async function handleDelete(id: string) {
    await deleteClass(id);
    setConfirmDelete(null);
  }

  if (classesLoading || usersLoading) return null;

  // Group filtered classes by teacher
  const byTeacher = teachers.map((teacher) => ({
    teacher,
    classes: filteredClasses.filter((c) => c.teacher_id === teacher.id),
  }));

  const unassigned = filteredClasses.filter((c) => !teachers.find((t) => t.id === c.teacher_id));

  return (
    <PageContainer
      title="Manage Classes"
      description="Create classes and assign them to teachers"
      action={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={openWizard} disabled={filteredClasses.length === 0}>
            <CalendarRange className="h-4 w-4 mr-1" />
            Start New Year
          </Button>
          <Button size="sm" onClick={() => { setNewYear(effectiveYear); setAddDialog(true); }} disabled={teachers.length === 0}>
            <Plus className="h-4 w-4 mr-1" />
            New Class
          </Button>
        </div>
      }
    >
      {/* Year filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {allYears.map((year) => (
          <button
            key={year}
            onClick={() => setActiveYear(year)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              year === effectiveYear
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted"
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      {teachers.length === 0 && (
        <div className="text-center py-10 text-sm text-muted-foreground">
          No teachers found. Add teachers in Manage Users first.
        </div>
      )}

      <div className="space-y-4">
        {byTeacher.map(({ teacher, classes: teacherClasses }) => (
          <Card key={teacher.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <UserCog className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{teacher.full_name ?? teacher.email}</span>
                <Badge variant="outline" className="text-xs ml-auto">
                  {teacherClasses.length} {teacherClasses.length === 1 ? "class" : "classes"}
                </Badge>
              </div>

              {teacherClasses.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-6 italic">No classes assigned</p>
              ) : (
                <div className="space-y-2 pl-6">
                  {teacherClasses.map((cls) => (
                    <div key={cls.id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/20">
                      <GraduationCap className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm flex-1 font-medium">{cls.name}</span>
                      <span className="text-xs text-muted-foreground">{cls.school_year}</span>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        title="Reassign teacher"
                        onClick={() => { setReassignDialog(cls.id); setReassignTeacherId(cls.teacher_id); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                        title="Delete class"
                        onClick={() => setConfirmDelete(cls.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {unassigned.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-medium text-sm text-muted-foreground">Unassigned classes</span>
              </div>
              <div className="space-y-2">
                {unassigned.map((cls) => (
                  <div key={cls.id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/20">
                    <GraduationCap className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm flex-1 font-medium">{cls.name}</span>
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => { setReassignDialog(cls.id); setReassignTeacherId(""); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                      onClick={() => setConfirmDelete(cls.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Modal open={addDialog} onClose={() => setAddDialog(false)} title="New Class">
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Class Name</Label>
            <Input
              placeholder="e.g. 6A, 6B, Period 3"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Assign to Teacher</Label>
            <Select value={newTeacherId} onValueChange={(v) => v && setNewTeacherId(v)}>
              <SelectTrigger>
                <span className="truncate">
                  {newTeacherId
                    ? (teachers.find(t => t.id === newTeacherId)?.full_name ?? teachers.find(t => t.id === newTeacherId)?.email ?? "Select teacher…")
                    : <span className="text-muted-foreground">Select teacher…</span>
                  }
                </span>
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.full_name ?? t.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>School Year</Label>
            <Select value={newYear} onValueChange={(v) => v && setNewYear(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {allYears.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <ModalFooter>
          <ModalCancel onClick={() => setAddDialog(false)} />
          <Button onClick={handleCreate} disabled={saving || !newName.trim() || !newTeacherId}>
            {saving ? "Creating…" : "Create Class"}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal open={!!reassignDialog} onClose={() => setReassignDialog(null)} title="Reassign Class">
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Assign to Teacher</Label>
            <Select value={reassignTeacherId} onValueChange={(v) => v && setReassignTeacherId(v)}>
              <SelectTrigger>
                <span className="truncate">
                  {reassignTeacherId
                    ? (teachers.find(t => t.id === reassignTeacherId)?.full_name ?? teachers.find(t => t.id === reassignTeacherId)?.email ?? "Select teacher…")
                    : <span className="text-muted-foreground">Select teacher…</span>
                  }
                </span>
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.full_name ?? t.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <ModalFooter>
          <ModalCancel onClick={() => setReassignDialog(null)} />
          <Button onClick={handleReassign} disabled={reassigning || !reassignTeacherId}>
            {reassigning ? "Saving…" : "Reassign"}
          </Button>
        </ModalFooter>
      </Modal>

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Class"
        description="This will delete the class and remove it from all students and coverage records. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />

      {/* Start New Year wizard */}
      <Modal open={newYearWizard} onClose={() => setNewYearWizard(false)} title={`Start ${nextYear}`}>
        {wizardStep === 1 ? (
          <>
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Select classes to carry over from <strong>{effectiveYear}</strong> into <strong>{nextYear}</strong>.
              </p>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {filteredClasses.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No classes in {effectiveYear}.</p>
                ) : (
                  filteredClasses.map((cls) => {
                    const checked = checkedClassIds.has(cls.id);
                    const teacherName = teachers.find((t) => t.id === cls.teacher_id)?.full_name
                      ?? teachers.find((t) => t.id === cls.teacher_id)?.email
                      ?? "Unassigned";
                    return (
                      <label key={cls.id} className="flex items-center gap-3 p-2 rounded-md border hover:bg-muted/40 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setCheckedClassIds((prev) => {
                              const next = new Set(prev);
                              if (checked) next.delete(cls.id); else next.add(cls.id);
                              return next;
                            })
                          }
                          className="h-4 w-4"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{cls.name}</p>
                          <p className="text-xs text-muted-foreground">{teacherName}</p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
            <ModalFooter>
              <ModalCancel onClick={() => setNewYearWizard(false)} />
              <Button onClick={() => setWizardStep(2)} disabled={checkedClassIds.size === 0}>
                Next — Review ({checkedClassIds.size} {checkedClassIds.size === 1 ? "class" : "classes"})
              </Button>
            </ModalFooter>
          </>
        ) : (
          <>
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Creating <strong>{checkedClassIds.size}</strong> class{checkedClassIds.size !== 1 ? "es" : ""} for <strong>{nextYear}</strong>:
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {filteredClasses.filter((c) => checkedClassIds.has(c.id)).map((cls) => {
                  const teacherName = teachers.find((t) => t.id === cls.teacher_id)?.full_name
                    ?? teachers.find((t) => t.id === cls.teacher_id)?.email ?? "Unassigned";
                  return (
                    <div key={cls.id} className="flex items-center gap-2 text-sm px-2 py-1 rounded bg-muted/40">
                      <GraduationCap className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium">{cls.name}</span>
                      <span className="text-muted-foreground text-xs">→ {teacherName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <ModalFooter>
              <Button variant="outline" onClick={() => setWizardStep(1)}>Back</Button>
              <Button onClick={handleStartNewYear} disabled={wizardSaving}>
                {wizardSaving ? "Creating…" : `Create ${nextYear} Classes`}
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
