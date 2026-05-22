"use client";

import { useState } from "react";
import { PageContainer } from "@/components/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LongTermPlan, LTPUnit, Profile, UnitStatus } from "@/types";
import { UNIT_STATUS_CONFIG } from "@/lib/ltpStatus";

interface UnitRow {
  unit: LTPUnit;
  plan: LongTermPlan;
  teacher: Profile | undefined;
}

type AssignmentFilter = "all" | "assigned" | "unassigned";
type StatusFilter = "all" | UnitStatus;

interface UnitAssignmentsViewProps {
  plans: LongTermPlan[];
  teachers: Profile[];
  assignUnit: (unitId: string, teacherId: string | null) => Promise<void>;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "revision", label: "Needs Revision" },
];

export function UnitAssignmentsView({ plans, teachers, assignUnit }: UnitAssignmentsViewProps) {
  const [teacherFilter, setTeacherFilter] = useState<string>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Flatten all units across all plans
  const allRows: UnitRow[] = plans.flatMap((p) =>
    (p.units ?? []).map((u) => ({ unit: u, plan: p, teacher: p.teacher }))
  );

  const filtered = allRows.filter((row) => {
    if (teacherFilter !== "all" && row.plan.teacher_id !== teacherFilter) return false;
    if (assignmentFilter === "assigned" && !row.unit.assigned_to) return false;
    if (assignmentFilter === "unassigned" && row.unit.assigned_to) return false;
    if (statusFilter !== "all" && row.unit.status !== statusFilter) return false;
    return true;
  });

  return (
    <PageContainer
      title="Unit Assignments"
      description={`${filtered.length} unit${filtered.length !== 1 ? "s" : ""}`}
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={teacherFilter} onValueChange={(v) => v && setTeacherFilter(v)}>
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teachers</SelectItem>
            {teachers.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.full_name ?? t.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={assignmentFilter} onValueChange={(v) => setAssignmentFilter(v as AssignmentFilter)}>
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Units</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          No units match the current filters.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(({ unit, plan, teacher }) => {
            const statusCfg = UNIT_STATUS_CONFIG[unit.status];
            const assignedTeacher = teachers.find((t) => t.id === unit.assigned_to);

            return (
              <Card key={unit.id}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground shrink-0">T{unit.term} · U{unit.unit_number}</span>
                        <span className="text-sm font-medium">{unit.title}</span>
                        <Badge variant="outline" className={`text-xs ${statusCfg.className}`}>{statusCfg.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {plan.title} · <span className="font-medium">{teacher?.full_name ?? teacher?.email ?? "Unknown"}</span> · {plan.school_year}
                      </p>
                    </div>

                    <div className="shrink-0 w-52">
                      <Select
                        value={unit.assigned_to ?? "none"}
                        onValueChange={(v) => assignUnit(unit.id, v === "none" ? null : v)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue>
                            {assignedTeacher ? (assignedTeacher.full_name ?? assignedTeacher.email) : "— Unassigned —"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Unassigned —</SelectItem>
                          {teachers.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.full_name ?? t.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
