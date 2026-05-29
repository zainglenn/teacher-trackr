"use client";

import { useState, useMemo } from "react";
import { PageContainer } from "@/components/PageContainer";
import { StatCard } from "@/components/StatCard";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, ClipboardList, Users, ClipboardCheck, AlertTriangle, Clock } from "lucide-react";
import { Standard, CoverageLog, LongTermPlan, Student } from "@/types";
import { AttainmentCounts } from "@/hooks/useClassProgress";
import { useDepartmentStats } from "@/hooks/useDepartmentStats";
import { useDepartmentPipeline } from "@/hooks/useDepartmentPipeline";
import { useStandardPipeline } from "@/hooks/useStandardPipeline";
import { useGradeLevels } from "@/hooks/useGradeLevels";
import { strandFromCode, STRAND_COLORS } from "@/components/ltp/StrandBadge";
import { GradeFilter } from "@/components/GradeFilter";
import { AppView } from "@/components/AppSidebar";

interface DashboardViewProps {
  standards: Standard[];
  coverageLogs: CoverageLog[];
  ltps: LongTermPlan[];
  students: Student[];
  isHod: boolean;
  classProgress: Map<string, AttainmentCounts>;
  onNavigate: (view: AppView) => void;
  teacherId?: string;
  subjectId?: string | null;
  gradeLevelId?: string | null;
}

const STRAND_ABBREV: Record<string, string> = { RL: "Rdg Lit", RI: "Rdg Info", W: "Writing", SL: "Speaking", L: "Language" };
const STRAND_ORDER = ["RL", "RI", "W", "SL", "L"];

function HodDashboard({ standards, ltps, onNavigate, subjectId, gradeLevelId }: {
  standards: Standard[];
  ltps: LongTermPlan[];
  onNavigate: (view: AppView) => void;
  subjectId?: string | null;
  gradeLevelId?: string | null;
}) {
  const { results: pipelineResults, loading } = useDepartmentPipeline(subjectId ?? null, gradeLevelId ?? null, standards);
  const teachers = pipelineResults.map((r) => ({ id: r.teacherId, full_name: r.teacherName, email: "" }));
  // For backwards-compat with heatmap: build a map of teacherId → Set of "in plan" standard IDs
  const coverageByTeacher = new Map(
    pipelineResults.map((r) => [
      r.teacherId,
      new Set([...r.statusByStandardId.entries()].filter(([, s]) => s !== "unmapped").map(([id]) => id)),
    ])
  );
  const { gradeLevels } = useGradeLevels();
  const [activeGradeId, setActiveGradeId] = useState<string>("");

  useMemo(() => {
    if (gradeLevels.length > 0 && !activeGradeId) setActiveGradeId(gradeLevels[0].id);
  }, [gradeLevels, activeGradeId]);

  const filteredLtps = useMemo(() => {
    if (!activeGradeId || gradeLevels.length === 0) return ltps;
    return ltps.filter(p => !p.grade_level_id || p.grade_level_id === activeGradeId);
  }, [ltps, activeGradeId, gradeLevels]);

  // Compute approved-this-week count from units
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const approvedThisWeek = filteredLtps.flatMap((p) => p.units ?? [])
    .filter((u) => u.status === "approved" && (u.reviewed_at ?? "") >= oneWeekAgo).length;

  // Plans needing attention: submitted (oldest first) + revision (most recent first)
  const submitted = filteredLtps.filter((p) => (p.units ?? []).some((u) => u.status === "submitted"))
    .sort((a, b) => {
      const aDate = Math.min(...(a.units ?? []).filter(u => u.status === "submitted").map(u => new Date(u.submitted_at ?? 0).getTime()));
      const bDate = Math.min(...(b.units ?? []).filter(u => u.status === "submitted").map(u => new Date(u.submitted_at ?? 0).getTime()));
      return aDate - bDate;
    });
  const revision = filteredLtps.filter((p) => (p.units ?? []).some((u) => u.status === "revision") && !(p.units ?? []).some(u => u.status === "submitted"))
    .sort((a, b) => {
      const aDate = Math.max(...(a.units ?? []).filter(u => u.status === "revision").map(u => new Date(u.reviewed_at ?? 0).getTime()));
      const bDate = Math.max(...(b.units ?? []).filter(u => u.status === "revision").map(u => new Date(u.reviewed_at ?? 0).getTime()));
      return bDate - aDate;
    });
  const attention = [...submitted, ...revision].slice(0, 6);

  // Pending units count
  const pendingUnits = filteredLtps.flatMap((p) => p.units ?? []).filter((u) => u.status === "submitted").length;

  // Heatmap: teachers × strands
  // strand code → standards IDs in that strand
  const strandStandardIds: Record<string, Set<string>> = {};
  for (const s of standards) {
    const sc = strandFromCode(s.code);
    if (!strandStandardIds[sc]) strandStandardIds[sc] = new Set();
    strandStandardIds[sc].add(s.id);
  }

  const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    submitted: { label: "Submitted", className: "bg-amber-100 text-amber-700" },
    revision: { label: "Needs Revision", className: "bg-rose-100 text-rose-700" },
  };

  return (
    <PageContainer
      title="Dashboard"
      description="Department overview"
      action={
        gradeLevels.length > 0 ? (
          <GradeFilter grades={gradeLevels} activeGradeId={activeGradeId} onChange={setActiveGradeId} />
        ) : undefined
      }
    >
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Teachers" value={loading ? "—" : teachers.length} sub="in department" icon={Users} iconColor="text-violet-500" />
        <StatCard label="Long Term Plans" value={filteredLtps.length} sub="across all teachers" icon={ClipboardList} iconColor="text-blue-500" />
        <StatCard
          label="Pending Review"
          value={pendingUnits}
          sub={`unit${pendingUnits !== 1 ? "s" : ""} to review`}
          icon={ClipboardCheck}
          iconColor={pendingUnits > 0 ? "text-amber-500" : "text-emerald-500"}
        />
        <StatCard label="Approved This Week" value={approvedThisWeek} sub="units approved" icon={CheckSquare} iconColor="text-emerald-500" />
      </div>

      {/* Plans needing attention */}
      {attention.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-amber-500" aria-hidden="true" />
            Plans Needing Attention
          </p>
          <div className="border border-border rounded-[var(--radius)] divide-y divide-border bg-card">
            {attention.map((p) => {
              const hasSubmitted = (p.units ?? []).some((u) => u.status === "submitted");
              const badge = STATUS_BADGE[hasSubmitted ? "submitted" : "revision"];
              const oldestMs = hasSubmitted
                ? Math.min(...(p.units ?? []).filter(u => u.status === "submitted").map(u => new Date(u.submitted_at ?? 0).getTime()))
                : 0;
              const daysAgo = oldestMs ? Math.floor((Date.now() - oldestMs) / 86400000) : null;
              return (
                <button
                  key={p.id}
                  className="flex items-center gap-3 px-3 h-12 w-full text-left hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
                  onClick={() => onNavigate("delivery-grid")}
                >
                  <span className="text-sm font-medium truncate flex-1 min-w-0">{p.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{p.teacher?.full_name ?? p.teacher?.email}</span>
                  {daysAgo !== null && (
                    <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{daysAgo}d ago</span>
                  )}
                  <Badge className={`text-xs shrink-0 ${badge.className}`}>{badge.label}</Badge>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Department coverage heatmap: rows=teachers, cols=strands */}
      {!loading && teachers.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Coverage by Teacher &amp; Strand</p>
          <div className="border border-border rounded-[var(--radius)] bg-card overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left font-medium text-muted-foreground py-2 px-3 whitespace-nowrap">Teacher</th>
                  {STRAND_ORDER.map((sc) => (
                    <th key={sc} className="text-center font-medium text-muted-foreground py-2 px-2 whitespace-nowrap">
                      <span className={`inline-block px-1 py-0.5 rounded-sm font-mono text-[11px] ${STRAND_COLORS[sc] ?? ""}`}>{sc}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {teachers.map((t) => {
                  const covered = coverageByTeacher.get(t.id) ?? new Set<string>();
                  return (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 font-medium whitespace-nowrap">{t.full_name ?? t.email}</td>
                      {STRAND_ORDER.map((sc) => {
                        const total = strandStandardIds[sc]?.size ?? 0;
                        const count = total === 0 ? 0 : [...(strandStandardIds[sc] ?? [])].filter((id) => covered.has(id)).length;
                        const pct = total === 0 ? 0 : Math.round((count / total) * 100);
                        const color = pct >= 80 ? "bg-emerald-100 text-emerald-700" : pct >= 40 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700";
                        return (
                          <td key={sc} className="py-2 px-2 text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded-sm font-mono ${color}`} title={`${count}/${total} standards`}>
                              {pct}%
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All LTPs overview */}
      {ltps.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Long Term Plans</p>
          <div className="border border-border rounded-[var(--radius)] divide-y divide-border bg-card">
            {ltps.slice(0, 8).map((p) => {
              const badge = { draft: { label: "Draft", className: "bg-muted text-muted-foreground" }, submitted: { label: "Submitted", className: "bg-amber-100 text-amber-700" }, approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700" }, revision: { label: "Needs Revision", className: "bg-rose-100 text-rose-700" }, published: { label: "Published", className: "bg-indigo-100 text-indigo-700" } }[p.status] ?? { label: p.status, className: "bg-muted text-muted-foreground" };
              return (
                <div key={p.id} className="flex items-center gap-3 px-3 h-12">
                  <span className="text-sm font-medium flex-1 min-w-0 truncate">{p.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{p.teacher?.full_name ?? p.teacher?.email}</span>
                  <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{p.school_year}</span>
                  <Badge className={`text-xs shrink-0 ${badge.className}`}>{badge.label}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PageContainer>
  );
}

export function DashboardView({ standards, coverageLogs: _, ltps, students, isHod, classProgress, onNavigate, teacherId, subjectId, gradeLevelId }: DashboardViewProps) {
  if (isHod) return <HodDashboard standards={standards} ltps={ltps} onNavigate={onNavigate} subjectId={subjectId} gradeLevelId={gradeLevelId} />;

  // Use pipeline for coverage: count standards that are "in plan" (not unmapped)
  const { entries: pipelineEntries } = useStandardPipeline(teacherId ?? null, subjectId ?? null, gradeLevelId ?? null, standards);
  const coveredIds = new Set(pipelineEntries.filter((e) => e.status !== "unmapped").map((e) => e.standard.id));
  const coveragePct = standards.length > 0 ? Math.round((coveredIds.size / standards.length) * 100) : 0;

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Coverage by Strand</p>
        <div className="border border-border rounded-[var(--radius)] bg-card divide-y divide-border">
          {strands.map((strand) => {
            const strandStandards = standards.filter((s) => s.strand === strand);
            const covered = strandStandards.filter((s) => coveredIds.has(s.id)).length;
            const pct = Math.round((covered / strandStandards.length) * 100);
            return (
              <div key={strand} className="flex items-center gap-3 px-3 h-11">
                <span className="text-sm font-medium w-32 shrink-0">{strand}</span>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <Progress value={pct} className="h-1.5" />
                </div>
                <span className="text-xs text-muted-foreground shrink-0 tabular-nums w-16 text-right">{covered}/{strandStandards.length}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mastery Alerts — only for teachers with students */}
      {!isHod && students.length > 0 && masteryAlerts.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-amber-500" aria-hidden="true" />
            Needs Attention ({masteryAlerts.length})
          </p>
          <div className="border border-border rounded-[var(--radius)] divide-y divide-border bg-card">
            {masteryAlerts.slice(0, 6).map((s) => {
              const counts = classProgress.get(s.id);
              const assessed = counts ? counts.below + counts.approaching + counts.meeting + counts.exceeding : 0;
              const struggling = counts ? counts.below + counts.approaching : 0;
              const notAssessed = assessed === 0;
              return (
                <button
                  key={s.id}
                  className="flex items-center gap-3 px-3 h-11 w-full text-left hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
                  onClick={() => onNavigate("student-progress")}
                >
                  <Badge variant="outline" className="font-mono text-xs shrink-0">{s.code}</Badge>
                  <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">{s.description}</span>
                  <div className="shrink-0">
                    {notAssessed ? (
                      <div className="flex items-center gap-1 text-xs text-amber-600">
                        <Clock className="h-3 w-3" />
                        <span>Not assessed</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <div className="flex h-1.5 w-16 rounded-full overflow-hidden">
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
          </div>
        </div>
      )}

      {ltps.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Long Term Plans</p>
          <div className="border border-border rounded-[var(--radius)] divide-y divide-border bg-card">
            {ltps.slice(0, 5).map((p) => {
              const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.draft;
              const unitCount = p.units?.length ?? 0;
              return (
                <div key={p.id} className="flex items-center gap-3 px-3 h-12">
                  <span className="text-sm font-medium flex-1 min-w-0 truncate">{p.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{p.school_year} · {unitCount} unit{unitCount !== 1 ? "s" : ""}</span>
                  <Badge className={`text-xs shrink-0 ${badge.className}`}>{badge.label}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
