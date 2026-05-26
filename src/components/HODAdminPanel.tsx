"use client";

import { useState, useCallback } from "react";
import {
  Plus, Trash2, Settings2, Users, CalendarDays, Bell,
  GraduationCap, UserCheck, BookOpen, ChevronDown, ChevronRight, Pencil, Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useAllClasses, ClassWithTeacher } from "@/hooks/useAllClasses";
import { supabase } from "@/lib/supabase";
import { LongTermPlan } from "@/types";

const TABS = [
  { key: "classes", label: "Classes", icon: GraduationCap },
  { key: "deadlines", label: "Deadlines", icon: CalendarDays },
  { key: "notifications", label: "Notifications", icon: Bell },
] as const;
type Tab = typeof TABS[number]["key"];

interface HODAdminPanelProps {
  teachers?: { id: string; email: string; full_name: string | null; role: string }[];
  plans?: LongTermPlan[];
  assignUnit?: (unitId: string, teacherId: string) => Promise<void>;
}

// ── Class status badge ────────────────────────────────────────────────────────

function ClassStatusBadge({ cls }: { cls: ClassWithTeacher }) {
  const hasTeacher = !!cls.teacher;
  const hasPlan = !!(cls as ClassWithTeacher & { ltp_id?: string }).ltp_id;

  if (hasTeacher && hasPlan) {
    return (
      <Badge variant="outline" className="text-xs" style={{ background: "var(--status-taught-bg)", color: "var(--status-taught-text)", borderColor: "var(--status-taught-border)" }}>
        Active
      </Badge>
    );
  }
  if (hasTeacher || hasPlan) {
    return (
      <Badge variant="outline" className="text-xs" style={{ background: "var(--status-behind-bg)", color: "var(--status-behind-text)", borderColor: "var(--status-behind-border)" }}>
        Setup
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs" style={{ background: "var(--status-pending-bg)", color: "var(--status-pending-text)", borderColor: "var(--status-pending-border)" }}>
      Pending
    </Badge>
  );
}

// ── Classes Tab ───────────────────────────────────────────────────────────────

function ClassesTab({ plans, teachers }: { plans: LongTermPlan[]; teachers: { id: string; email: string; full_name: string | null; role: string }[] }) {
  const { classes, loading, createClass, deleteClass, reassignClass, refresh } = useAllClasses();

  const [createDialog, setCreateDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTeacherId, setNewTeacherId] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    await createClass(newName.trim(), (newTeacherId || teachers[0]?.id) ?? "");
    setNewName("");
    setNewTeacherId("");
    setCreateDialog(false);
    setSaving(false);
  }

  async function attachPlan(classId: string, ltpId: string) {
    await supabase.from("classes").update({ ltp_id: ltpId || null }).eq("id", classId);
    refresh();
  }

  if (loading) {
    return (
      <div className="space-y-2 p-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {classes.length} class{classes.length !== 1 ? "es" : ""} this year
        </p>
        <Button size="sm" onClick={() => setCreateDialog(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Class
        </Button>
      </div>

      {classes.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <GraduationCap className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium mb-1">No classes yet</p>
            <p className="text-xs text-muted-foreground mb-4">Create classes to assign teachers and plans.</p>
            <Button size="sm" onClick={() => setCreateDialog(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create first class
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {classes.map((cls) => {
          const extCls = cls as ClassWithTeacher & { ltp_id?: string };
          return (
            <Card key={cls.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center gap-3 px-4 py-3 border-b">
                  <div className="w-8 h-8 rounded-lg bg-sidebar text-sidebar-foreground flex items-center justify-center text-xs font-bold shrink-0">
                    {cls.name}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{cls.name}</p>
                    <p className="text-xs text-muted-foreground">{cls.school_year}</p>
                  </div>
                  <ClassStatusBadge cls={cls} />
                  <button
                    onClick={() => setDeleteConfirm(cls.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                    aria-label="Delete class"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x">
                  {/* Teacher assignment */}
                  <div className="px-4 py-3 flex items-center gap-2.5">
                    <UserCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">Teacher</p>
                      <Select
                        value={cls.teacher?.id ?? ""}
                        onValueChange={(val) => val && reassignClass(cls.id, val)}
                      >
                        <SelectTrigger className="h-7 text-xs border-0 bg-transparent p-0 shadow-none focus:ring-0">
                          <SelectValue placeholder="Assign teacher…">
                            {cls.teacher ? (cls.teacher.full_name ?? cls.teacher.email) : "Assign teacher…"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {teachers.map((t) => (
                            <SelectItem key={t.id} value={t.id} className="text-xs">
                              {t.full_name ?? t.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Plan attachment */}
                  <div className="px-4 py-3 flex items-center gap-2.5">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">Master Plan</p>
                      <Select
                        value={extCls.ltp_id ?? ""}
                        onValueChange={(val) => attachPlan(cls.id, val ?? "")}
                      >
                        <SelectTrigger className="h-7 text-xs border-0 bg-transparent p-0 shadow-none focus:ring-0">
                          <SelectValue placeholder="Attach plan…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="" className="text-xs text-muted-foreground">None</SelectItem>
                          {plans.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="text-xs">
                              {p.title} ({p.school_year})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Class</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="class-name">Class name</Label>
              <Input
                id="class-name"
                placeholder="e.g. 6A"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="class-teacher">Assign teacher</Label>
              <Select value={newTeacherId} onValueChange={(val) => val && setNewTeacherId(val)}>
                <SelectTrigger id="class-teacher">
                  <SelectValue placeholder="Select teacher…" />
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || saving}>
              {saving ? "Creating…" : "Create Class"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => !v && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete class?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This will permanently delete the class and all delivery records. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (deleteConfirm) await deleteClass(deleteConfirm);
                setDeleteConfirm(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Deadlines Tab ─────────────────────────────────────────────────────────────

function DeadlinesTab() {
  const { classes, loading } = useAllClasses();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (loading) {
    return <div className="h-32 rounded-lg bg-muted animate-pulse" />;
  }

  if (!classes.length) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Create classes first to set lesson deadlines.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Set the date each lesson week plan must be submitted by.
      </p>
      {classes.map((cls) => (
        <Card key={cls.id} className="overflow-hidden">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
            onClick={() => setExpanded(expanded === cls.id ? null : cls.id)}
          >
            <div className="w-7 h-7 rounded-md bg-sidebar text-sidebar-foreground flex items-center justify-center text-xs font-bold shrink-0">
              {cls.name}
            </div>
            <span className="flex-1 text-sm font-medium">{cls.name}</span>
            <span className="text-xs text-muted-foreground mr-2">
              {cls.teacher?.full_name ?? "Unassigned"}
            </span>
            {expanded === cls.id
              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            }
          </button>

          {expanded === cls.id && (
            <div className="border-t px-4 py-3">
              <p className="text-xs text-muted-foreground mb-3">
                Attach a master plan to this class to configure lesson-week deadlines.
              </p>
              <p className="text-xs text-muted-foreground italic">
                Deadline configuration will appear here once the class has a master plan attached.
              </p>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// ── Notifications Tab ─────────────────────────────────────────────────────────

function NotificationsTab() {
  const { classes, loading } = useAllClasses();
  const [reminderDays, setReminderDays] = useState<Record<string, string>>({});

  if (loading) {
    return <div className="h-32 rounded-lg bg-muted animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Teachers receive a reminder this many days before each lesson week deadline.
      </p>

      <div className="space-y-2">
        {classes.map((cls) => (
          <Card key={cls.id}>
            <CardContent className="flex items-center gap-4 py-3 px-4">
              <div className="w-7 h-7 rounded-md bg-sidebar text-sidebar-foreground flex items-center justify-center text-xs font-bold shrink-0">
                {cls.name}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{cls.name}</p>
                <p className="text-xs text-muted-foreground">{cls.teacher?.full_name ?? "Unassigned"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`reminder-${cls.id}`} className="text-xs text-muted-foreground whitespace-nowrap">
                  Remind
                </Label>
                <Input
                  id={`reminder-${cls.id}`}
                  type="number"
                  min="0"
                  max="14"
                  className="w-14 h-7 text-xs text-center"
                  value={reminderDays[cls.id] ?? "3"}
                  onChange={(e) => setReminderDays((prev) => ({ ...prev, [cls.id]: e.target.value }))}
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">days before</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {classes.length > 0 && (
        <Button size="sm" className="w-full" onClick={() => {}}>
          <Check className="h-3.5 w-3.5 mr-1.5" />
          Save notification settings
        </Button>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function HODAdminPanel({ plans = [], teachers: teachersProp = [] }: HODAdminPanelProps) {
  const [tab, setTab] = useState<Tab>("classes");

  return (
    <div className="max-w-3xl mx-auto space-y-0">
      {/* Header */}
      <div className="px-0 pt-1 pb-5">
        <h1 className="text-lg font-semibold tracking-tight">Admin Panel</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Set up classes, assign teachers, and configure lesson deadlines.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
              tab === key
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "classes" && <ClassesTab plans={plans} teachers={teachersProp} />}
      {tab === "deadlines" && <DeadlinesTab />}
      {tab === "notifications" && <NotificationsTab />}
    </div>
  );
}
