"use client";

import { useState } from "react";
import { PageContainer } from "@/components/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GraduationCap, UserCog, Pencil } from "lucide-react";
import { useAllClasses } from "@/hooks/useAllClasses";
import { useAdminUsers } from "@/hooks/useAdminUsers";

export function ManageClassesView() {
  const { classes, loading: classesLoading, createClass, deleteClass, reassignClass } = useAllClasses();
  const { users, loading: usersLoading } = useAdminUsers();
  const teachers = users.filter((u) => u.role === "teacher");

  const [addDialog, setAddDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTeacherId, setNewTeacherId] = useState("");
  const [newYear, setNewYear] = useState("2024-25");
  const [saving, setSaving] = useState(false);

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

  // Group classes by teacher
  const byTeacher = teachers.map((teacher) => ({
    teacher,
    classes: classes.filter((c) => c.teacher_id === teacher.id),
  }));

  const unassigned = classes.filter((c) => !teachers.find((t) => t.id === c.teacher_id));

  return (
    <PageContainer
      title="Manage Classes"
      description="Create classes and assign them to teachers"
      action={
        <Button size="sm" onClick={() => setAddDialog(true)} disabled={teachers.length === 0}>
          <Plus className="h-4 w-4 mr-1" />
          New Class
        </Button>
      }
    >
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

      {/* Create class dialog */}
      <Dialog open={addDialog} onOpenChange={(o) => !o && setAddDialog(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Class</DialogTitle></DialogHeader>
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
                <SelectTrigger><SelectValue placeholder="Select teacher…" /></SelectTrigger>
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
              <Input
                placeholder="2024-25"
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !newName.trim() || !newTeacherId}>
              {saving ? "Creating…" : "Create Class"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign dialog */}
      <Dialog open={!!reassignDialog} onOpenChange={(o) => !o && setReassignDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reassign Class</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Assign to Teacher</Label>
              <Select value={reassignTeacherId} onValueChange={(v) => v && setReassignTeacherId(v)}>
                <SelectTrigger><SelectValue placeholder="Select teacher…" /></SelectTrigger>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignDialog(null)}>Cancel</Button>
            <Button onClick={handleReassign} disabled={reassigning || !reassignTeacherId}>
              {reassigning ? "Saving…" : "Reassign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Class</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This will delete the class and remove it from all students and coverage records. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => confirmDelete && handleDelete(confirmDelete)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
