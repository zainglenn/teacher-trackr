"use client";

import { PageContainer } from "@/components/PageContainer";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, ClipboardList, Users, ClipboardCheck, AlertTriangle, Clock } from "lucide-react";
import { Standard, CoverageLog, LongTermPlan, Student } from "@/types";
import { AttainmentCounts } from "@/hooks/useClassProgress";
import { AppView } from "@/components/AppSidebar";

interface DashboardViewProps {
  standards: Standard[];
  coverageLogs: CoverageLog[];
  ltps: LongTermPlan[];
  students: Student[];
  isHod: boolean;
  classProgress: Map<string, AttainmentCounts>;
  onNavigate: (view: AppView) => void;
}

export function DashboardView({ standards, coverageLogs, ltps, students, isHod, classProgress, onNavigate }: DashboardViewProps) {
  const coveredIds = new Set(coverageLogs.map((l) => l.standard_id));
  const coveragePct = standards.length > 0 ? Math.round((coveredIds.size / standards.length) * 100) : 0;

  const pendingLTPs = ltps.filter((p) => p.status === "submitted").length;
  const approvedLTP = ltps.find((p) => p.status === "approved");
  const latestLTP = ltps[0];

  const strands = [...new Set(standards.map((s) => s.strand))];

  // Mastery alerts: taught standards where >40% of assessed students are below/approaching
  const masteryAlerts = standards.filter((s) => {
    if (!coveredIds.has(s.id)) return false;
    const counts = classProgress.get(s.id);
    if (!counts) return true; // taught but not yet assessed
    const assessed = counts.below + counts.approaching + counts.meeting + counts.exceeding;
    if (assessed === 0) return true; // taught but not assessed
    return (counts.below + counts.approaching) / assessed > 0.4;
  });

  const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
    submitted: { label: "Submitted", className: "bg-amber-100 text-amber-700" },
    approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700" },
    revision: { label: "Needs Revision", className: "bg-rose-100 text-rose-700" },
  };

  return (
    <PageContainer
      title="Dashboard"
      description="Overview of Grade 6 English curriculum progress"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Coverage"
          value={`${coveragePct}%`}
          sub={`${coveredIds.size} of ${standards.length} standards`}
          icon={CheckSquare}
          iconColor="text-emerald-500"
        />
        <StatCard
          label="Long Term Plan"
          value={approvedLTP ? "Approved" : latestLTP ? latestLTP.status.charAt(0).toUpperCase() + latestLTP.status.slice(1) : "None"}
          sub={latestLTP ? latestLTP.school_year : "No plan yet"}
          icon={ClipboardList}
          iconColor={approvedLTP ? "text-emerald-500" : latestLTP?.status === "revision" ? "text-rose-500" : "text-blue-500"}
        />
        <StatCard
          label="Students"
          value={students.length}
          sub="enrolled"
          icon={Users}
          iconColor="text-violet-500"
        />
        {isHod && (
          <StatCard
            label="Pending Review"
            value={pendingLTPs}
            sub="LTPs awaiting HOD"
            icon={ClipboardCheck}
            iconColor={pendingLTPs > 0 ? "text-amber-500" : "text-muted-foreground"}
          />
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Coverage by Strand</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {strands.map((strand) => {
            const strandStandards = standards.filter((s) => s.strand === strand);
            const covered = strandStandards.filter((s) => coveredIds.has(s.id)).length;
            const pct = Math.round((covered / strandStandards.length) * 100);
            return (
              <div key={strand} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{strand}</span>
                  <span className="text-muted-foreground text-xs">{covered}/{strandStandards.length}</span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Mastery Alerts — only for teachers with students */}
      {!isHod && students.length > 0 && masteryAlerts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Needs Attention ({masteryAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {masteryAlerts.slice(0, 6).map((s) => {
              const counts = classProgress.get(s.id);
              const assessed = counts ? counts.below + counts.approaching + counts.meeting + counts.exceeding : 0;
              const struggling = counts ? counts.below + counts.approaching : 0;
              const notAssessed = assessed === 0;
              return (
                <button
                  key={s.id}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 w-full text-left hover:bg-muted/30 -mx-2 px-2 rounded transition-colors"
                  onClick={() => onNavigate("student-progress")}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs shrink-0">{s.code}</Badge>
                      <span className="text-xs text-muted-foreground truncate">{s.description}</span>
                    </div>
                  </div>
                  <div className="shrink-0 ml-3">
                    {notAssessed ? (
                      <div className="flex items-center gap-1 text-xs text-amber-600">
                        <Clock className="h-3 w-3" />
                        <span>Not assessed</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <div className="flex h-2 w-16 rounded-full overflow-hidden">
                          <div className="bg-rose-400" style={{ width: `${(counts!.below / assessed) * 100}%` }} />
                          <div className="bg-amber-400" style={{ width: `${(counts!.approaching / assessed) * 100}%` }} />
                          <div className="bg-emerald-400" style={{ width: `${((counts!.meeting + counts!.exceeding) / assessed) * 100}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{struggling}/{assessed}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {ltps.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Long Term Plans</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {ltps.slice(0, 5).map((p) => {
              const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.draft;
              const unitCount = p.units?.length ?? 0;
              return (
                <div key={p.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.school_year} · {unitCount} unit{unitCount !== 1 ? "s" : ""}</p>
                  </div>
                  <Badge className={`text-xs ${badge.className}`}>{badge.label}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
