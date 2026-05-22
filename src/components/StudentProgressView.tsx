"use client";

import { useState } from "react";
import { PageContainer } from "@/components/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Users, GraduationCap } from "lucide-react";

import { Standard, Student, Attainment } from "@/types";
import { useStudents } from "@/hooks/useStudents";
import { useStudentProgress } from "@/hooks/useStudentProgress";
import { useClasses } from "@/hooks/useClasses";

const ATTAINMENT_CONFIG: Record<Attainment, { label: string; className: string }> = {
  not_assessed: { label: "Not Assessed", className: "bg-muted text-muted-foreground" },
  below: { label: "Below", className: "bg-rose-100 text-rose-700" },
  approaching: { label: "Approaching", className: "bg-amber-100 text-amber-700" },
  meeting: { label: "Meeting", className: "bg-emerald-100 text-emerald-700" },
  exceeding: { label: "Exceeding", className: "bg-blue-100 text-blue-700" },
};

interface StudentProgressViewProps {
  teacherId: string;
  standards: Standard[];
  byStrand: Record<string, Standard[]>;
  isHod?: boolean;
}

export function StudentProgressView({ teacherId, standards, byStrand, isHod }: StudentProgressViewProps) {
  const { classes, loading: classesLoading } = useClasses(teacherId);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  if (classesLoading) return null;

  return (
    <PageContainer
      title="Student Progress"
      description="Track attainment per student across all standards"
    >
      {/* Class selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setSelectedClassId(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            selectedClassId === null
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background border-border hover:bg-muted"
          }`}
        >
          All
        </button>
        {classes.map((cls) => (
          <button
            key={cls.id}
            onClick={() => setSelectedClassId(cls.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              selectedClassId === cls.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted"
            }`}
          >
            {cls.name}
          </button>
        ))}
      </div>

      <StudentList
        key={selectedClassId ?? "all"}
        teacherId={teacherId}
        classId={selectedClassId}
        standards={standards}
        byStrand={byStrand}
      />

    </PageContainer>
  );
}

function StudentList({
  teacherId,
  classId,
  standards,
  byStrand,
}: {
  teacherId: string;
  classId: string | null;
  standards: Standard[];
  byStrand: Record<string, Standard[]>;
}) {
  const { students, loading, addStudent, removeStudent } = useStudents(teacherId, classId ?? undefined);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [addDialog, setAddDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedStudent = students.find((s) => s.id === selectedStudentId) ?? null;

  async function handleAdd() {
    if (!newName.trim()) return;
    setSaving(true);
    await addStudent(newName.trim(), newNumber.trim() || undefined);
    setSaving(false);
    setAddDialog(false);
    setNewName("");
    setNewNumber("");
  }

  if (loading) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GraduationCap className="h-4 w-4" />
          <span>{students.length} student{students.length !== 1 ? "s" : ""}</span>
        </div>
        <Button size="sm" onClick={() => setAddDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Student
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Students</p>
          {students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No students yet</p>
            </div>
          ) : (
            students.map((student) => (
              <button
                key={student.id}
                onClick={() => setSelectedStudentId(student.id === selectedStudentId ? null : student.id)}
                className={`w-full text-left rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  selectedStudentId === student.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border hover:bg-muted"
                }`}
              >
                <p className="font-medium leading-tight">{student.full_name}</p>
                {student.student_number && (
                  <p className={`text-xs mt-0.5 ${selectedStudentId === student.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    #{student.student_number}
                  </p>
                )}
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-3">
          {!selectedStudent ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <p className="text-muted-foreground text-sm">Select a student to view their progress</p>
            </div>
          ) : (
            <ProgressGrid
              student={selectedStudent}
              standards={standards}
              byStrand={byStrand}
              onRemove={() => { removeStudent(selectedStudent.id); setSelectedStudentId(null); }}
            />
          )}
        </div>
      </div>

      <Dialog open={addDialog} onOpenChange={(o) => !o && setAddDialog(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Student</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                placeholder="Student full name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Student Number (optional)</Label>
              <Input
                placeholder="e.g. 2024001"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !newName.trim()}>
              {saving ? "Adding..." : "Add Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProgressGrid({
  student,
  standards,
  byStrand,
  onRemove,
}: {
  student: Student;
  standards: Standard[];
  byStrand: Record<string, Standard[]>;
  onRemove: () => void;
}) {
  const { getAttainment, upsertProgress } = useStudentProgress(student.id);

  const total = standards.length;
  const assessed = standards.filter((s) => getAttainment(s.id) !== "not_assessed").length;
  const meeting = standards.filter((s) => {
    const a = getAttainment(s.id);
    return a === "meeting" || a === "exceeding";
  }).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{student.full_name}</CardTitle>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground hover:text-rose-600"
              onClick={onRemove}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Remove
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-sm">
            <span className="text-muted-foreground">Assessed: <strong>{assessed}/{total}</strong></span>
            <span className="text-muted-foreground">Meeting/Exceeding: <strong className="text-emerald-600">{meeting}</strong></span>
          </div>
        </CardContent>
      </Card>

      {Object.entries(byStrand).map(([strand, items]) => (
        <Card key={strand}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{strand}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map((standard) => {
              const attainment = getAttainment(standard.id);
              const config = ATTAINMENT_CONFIG[attainment];
              return (
                <div key={standard.id} className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono text-xs w-16 justify-center shrink-0">
                    {standard.code}
                  </Badge>
                  <p className="text-xs text-muted-foreground flex-1 min-w-0 truncate" title={standard.description}>
                    {standard.description}
                  </p>
                  <Select
                    value={attainment}
                    onValueChange={(v) => upsertProgress(standard.id, v as Attainment)}
                  >
                    <SelectTrigger className={`h-7 w-36 text-xs ${config.className}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(ATTAINMENT_CONFIG) as [Attainment, { label: string; className: string }][]).map(([value, { label, className }]) => (
                        <SelectItem key={value} value={value}>
                          <span className={`text-xs ${className} px-1 rounded`}>{label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
