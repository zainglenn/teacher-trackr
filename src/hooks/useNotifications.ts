"use client";

import { useMemo } from "react";
import { LongTermPlan } from "@/types";
import { PipelineEntry } from "@/hooks/useStandardPipeline";
import { TeacherPipelineResult } from "@/hooks/useDepartmentPipeline";

export type NotificationSeverity = "urgent" | "warning" | "info";
export type NotificationCategory = "submission" | "review" | "coverage" | "delivery";

export interface AppNotification {
  id: string;
  severity: NotificationSeverity;
  category: NotificationCategory;
  title: string;
  body: string;
  planId?: string;
  unitId?: string;
  actionView?: string;
}

const DAY_MS = 1000 * 60 * 60 * 24;
const now = Date.now();

function daysAgo(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  return Math.floor((now - new Date(dateStr).getTime()) / DAY_MS);
}

// ── Teacher notifications ─────────────────────────────────────────────────────

export function useTeacherNotifications(
  plans: LongTermPlan[],
  pipelineEntries: PipelineEntry[]
): AppNotification[] {
  return useMemo(() => {
    const notifications: AppNotification[] = [];

    for (const plan of plans) {
      for (const unit of plan.units ?? []) {
        // Revision requested but teacher hasn't resubmitted in 3+ days
        if (unit.status === "revision" && unit.reviewed_at) {
          const days = daysAgo(unit.reviewed_at);
          if (days >= 3) {
            notifications.push({
              id: `revision-${unit.id}`,
              severity: days >= 7 ? "urgent" : "warning",
              category: "submission",
              title: "Revision requested",
              body: `"${unit.title}" was sent for revision ${days} day${days !== 1 ? "s" : ""} ago. Resubmit when ready.`,
              planId: plan.id,
              unitId: unit.id,
              actionView: "long-term-plan",
            });
          }
        }

        // Unit rejected — needs attention
        if (unit.status === "rejected") {
          notifications.push({
            id: `rejected-${unit.id}`,
            severity: "urgent",
            category: "submission",
            title: "Unit rejected",
            body: `"${unit.title}" was rejected by your HOD. Review the feedback and revise.`,
            planId: plan.id,
            unitId: unit.id,
            actionView: "long-term-plan",
          });
        }
      }
    }

    // Unmapped standards
    const unmapped = pipelineEntries.filter((e) => e.status === "unmapped");
    if (unmapped.length > 0) {
      notifications.push({
        id: "unmapped-standards",
        severity: unmapped.length >= 5 ? "warning" : "info",
        category: "coverage",
        title: `${unmapped.length} standard${unmapped.length !== 1 ? "s" : ""} not in any unit`,
        body: "These standards may not be taught this year. Open your Long Term Plan to assign them.",
        actionView: "long-term-plan",
      });
    }

    // Draft units (informational — teacher should be aware)
    const draftCount = plans.flatMap((p) => p.units ?? []).filter((u) => u.status === "draft").length;
    if (draftCount > 0) {
      notifications.push({
        id: "draft-units",
        severity: "info",
        category: "submission",
        title: `${draftCount} unit${draftCount !== 1 ? "s" : ""} still in draft`,
        body: "Submit your unit plans so your HOD can review them before teaching begins.",
        actionView: "long-term-plan",
      });
    }

    return notifications.sort((a, b) => {
      const order: Record<NotificationSeverity, number> = { urgent: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });
  }, [plans, pipelineEntries]);
}

// ── HOD notifications ─────────────────────────────────────────────────────────

export function useHodNotifications(
  plans: LongTermPlan[],
  departmentResults: TeacherPipelineResult[],
  totalStandards: number
): AppNotification[] {
  return useMemo(() => {
    const notifications: AppNotification[] = [];

    for (const plan of plans) {
      for (const unit of plan.units ?? []) {
        // Submitted but HOD hasn't reviewed in 5+ days
        if (unit.status === "submitted" && unit.submitted_at) {
          const days = daysAgo(unit.submitted_at);
          if (days >= 5) {
            notifications.push({
              id: `pending-review-${unit.id}`,
              severity: days >= 10 ? "urgent" : "warning",
              category: "review",
              title: "Plan awaiting review",
              body: `"${unit.title}" was submitted ${days} day${days !== 1 ? "s" : ""} ago and hasn't been reviewed.`,
              planId: plan.id,
              unitId: unit.id,
              actionView: "hod-review",
            });
          }
        }

        // Revision requested but teacher hasn't resubmitted in 14+ days
        if (unit.status === "revision" && unit.reviewed_at) {
          const days = daysAgo(unit.reviewed_at);
          if (days >= 14) {
            notifications.push({
              id: `revision-stale-${unit.id}`,
              severity: "warning",
              category: "review",
              title: "Revision overdue",
              body: `"${unit.title}" was sent for revision ${days} days ago. The teacher hasn't resubmitted.`,
              planId: plan.id,
              unitId: unit.id,
              actionView: "hod-review",
            });
          }
        }
      }
    }

    // Department-level coverage gaps
    for (const result of departmentResults) {
      if (result.summary.unmapped > 0) {
        const pct = Math.round((result.summary.unmapped / totalStandards) * 100);
        if (pct >= 20) {
          notifications.push({
            id: `unmapped-${result.teacherId}`,
            severity: pct >= 40 ? "urgent" : "warning",
            category: "coverage",
            title: `${result.teacherName ?? "A teacher"} has ${result.summary.unmapped} unmapped standards`,
            body: `${pct}% of standards have no unit plan. Coverage may be incomplete.`,
            actionView: "coverage",
          });
        }
      }
    }

    return notifications.sort((a, b) => {
      const order: Record<NotificationSeverity, number> = { urgent: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });
  }, [plans, departmentResults, totalStandards]);
}
