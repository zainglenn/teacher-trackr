"use client";

import { useState, useMemo } from "react";
import { PageContainer } from "@/components/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Pencil,
  MessageSquare,
  Languages,
  BookMarked,
  AlertTriangle,
  SlidersHorizontal,
  MoreHorizontal,
} from "lucide-react";
import { Standard } from "@/types";
import { useSkillCoverage } from "@/hooks/useSkillCoverage";
import { useAllSkills } from "@/hooks/useAllSkills";
import { useClasses } from "@/hooks/useClasses";
import { useTeachers } from "@/hooks/useTeachers";
import { useDepartmentCoverage } from "@/hooks/useDepartmentCoverage";
import { StandardDetailView } from "@/components/StandardDetailView";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STRAND_COLORS, StrandBadge } from "@/components/ltp/StrandBadge";

interface CoverageViewProps {
  standards: Standard[];
  byStrand: Record<string, Standard[]>;
  teacherId: string;
  isHod?: boolean;
}

type StatusFilter = "all" | "covered" | "partial" | "not_covered";

function skillStatus(covered: number, total: number): "covered" | "partial" | "not_covered" {
  if (total === 0 || covered === 0) return "not_covered";
  if (covered === total) return "covered";
  return "partial";
}

// byStrand keys are full strand names; this maps them to short codes
const STRAND_CODE: Record<string, string> = {
  "Reading Literature": "RL",
  "Reading Informational Text": "RI",
  "Writing": "W",
  "Speaking & Listening": "SL",
  "Language": "L",
};

const STRAND_FULL_NAME: Record<string, string> = {
  RL: "Reading Literature",
  RI: "Reading Informational Text",
  W: "Writing",
  SL: "Speaking & Listening",
  L: "Language",
};

const STRAND_ICON: Record<string, React.ReactNode> = {
  RL: <BookOpen className="h-5 w-5" />,
  RI: <BookMarked className="h-5 w-5" />,
  W: <Pencil className="h-5 w-5" />,
  SL: <MessageSquare className="h-5 w-5" />,
  L: <Languages className="h-5 w-5" />,
};

const STRAND_PROGRESS_COLOR: Record<string, string> = {
  RL: "bg-blue-500",
  RI: "bg-violet-500",
  W: "bg-amber-500",
  SL: "bg-emerald-500",
  L: "bg-rose-500",
};

const STRAND_ICON_BG: Record<string, string> = {
  RL: "bg-blue-50 text-blue-600",
  RI: "bg-violet-50 text-violet-600",
  W: "bg-amber-50 text-amber-600",
  SL: "bg-emerald-50 text-emerald-600",
  L: "bg-rose-50 text-rose-600",
};

export function CoverageView({ standards, byStrand, teacherId, isHod }: CoverageViewProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const { teachers } = useTeachers();

  const effectiveTeacherId = isHod ? selectedTeacherId : teacherId;
  const { classes, loading: classesLoading } = useClasses(effectiveTeacherId ?? "");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Default to first class once loaded
  const activeClassId = selectedClassId ?? classes[0]?.id ?? null;

  if (classesLoading && !isHod) return null;

  const showAllTeachers = isHod && !selectedTeacherId;

  return (
    <PageContainer
      title="Standards Coverage"
      description="View which New York State Next Generation ELA standards are mapped to your units, and which ones still need to be addressed."
    >
      <div className="space-y-4">
        {isHod && (
          <div className="flex items-center gap-2">
            <Select
              value={selectedTeacherId ?? "all"}
              onValueChange={(v) => { setSelectedTeacherId(v === "all" ? null : v); setSelectedClassId(null); }}
            >
              <SelectTrigger className="w-56 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teachers</SelectItem>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.full_name ?? t.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!showAllTeachers && classes.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClassId(cls.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  activeClassId === cls.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-muted"
                }`}
              >
                {cls.name}
              </button>
            ))}
          </div>
        )}

        {showAllTeachers ? (
          <DepartmentCoverageGrid standards={standards} byStrand={byStrand} teachers={teachers} />
        ) : (
          <CoverageGrid
            key={`${effectiveTeacherId}-${activeClassId ?? "none"}`}
            standards={standards}
            byStrand={byStrand}
            teacherId={effectiveTeacherId ?? teacherId}
            classId={activeClassId}
            isHod={isHod}
          />
        )}
      </div>
    </PageContainer>
  );
}

function CoverageGrid({
  standards,
  byStrand,
  teacherId,
  classId,
  isHod,
}: {
  standards: Standard[];
  byStrand: Record<string, Standard[]>;
  teacherId: string;
  classId: string | null;
  isHod?: boolean;
}) {
  const { coveredSkillIds } = useSkillCoverage(teacherId, classId);
  const { byStandardId, loading: skillsLoading } = useAllSkills();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selectedStandard, setSelectedStandard] = useState<(typeof standards)[0] | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [strandFilter, setStrandFilter] = useState<string>("all");

  const strandKeys = Object.keys(byStrand);

  // Per-standard computed values
  const standardStats = useMemo(() => {
    return standards.map((s) => {
      const skills = byStandardId[s.id] ?? [];
      const covered = skills.filter((sk) => coveredSkillIds.has(sk.id)).length;
      const total = skills.length;
      const status = skillStatus(covered, total);
      const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
      return { standard: s, covered, total, status, pct };
    });
  }, [standards, byStandardId, coveredSkillIds]);

  // Overall totals
  const totalSkills = standardStats.reduce((sum, s) => sum + s.total, 0);
  const totalCovered = standardStats.reduce((sum, s) => sum + s.covered, 0);
  const overallPct = totalSkills > 0 ? Math.round((totalCovered / totalSkills) * 100) : 0;

  const coveredCount = standardStats.filter((s) => s.status === "covered").length;
  const partialCount = standardStats.filter((s) => s.status === "partial").length;
  const notCoveredCount = standardStats.filter((s) => s.status === "not_covered").length;

  // Per-strand stats for header cards
  const strandStats = useMemo(() => {
    return strandKeys.map((strand) => {
      const items = byStrand[strand] ?? [];
      const stats = items.map((s) => {
        const skills = byStandardId[s.id] ?? [];
        const covered = skills.filter((sk) => coveredSkillIds.has(sk.id)).length;
        const total = skills.length;
        return { covered, total };
      });
      const totalSkillsInStrand = stats.reduce((sum, s) => sum + s.total, 0);
      const coveredSkillsInStrand = stats.reduce((sum, s) => sum + s.covered, 0);
      const coveredStandards = stats.filter((s) => s.covered === s.total && s.total > 0).length;
      const pct = totalSkillsInStrand > 0 ? Math.round((coveredSkillsInStrand / totalSkillsInStrand) * 100) : 0;
      return { strand, total: items.length, coveredStandards, pct };
    });
  }, [strandKeys, byStrand, byStandardId, coveredSkillIds]);

  if (selectedStandard) {
    return (
      <StandardDetailView
        standard={selectedStandard}
        teacherId={teacherId}
        classId={classId}
        onBack={() => setSelectedStandard(null)}
        preloadedSkills={byStandardId[selectedStandard.id] ?? []}
        coveredSkillIds={coveredSkillIds}
      />
    );
  }

  const tabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "All Standards", count: standards.length },
    { key: "covered", label: "Covered", count: coveredCount },
    { key: "partial", label: "Partial", count: partialCount },
    { key: "not_covered", label: "Not Covered", count: notCoveredCount },
  ];

  return (
    <div className="space-y-5">
      {/* Strand summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {strandStats.map(({ strand, total, coveredStandards, pct }) => {
          const code = STRAND_CODE[strand] ?? strand;
          const isActive = strandFilter === strand;
          return (
            <button
              key={strand}
              onClick={() => setStrandFilter(isActive ? "all" : strand)}
              className={`text-left p-4 rounded-xl border transition-all ${
                isActive
                  ? "border-primary ring-1 ring-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
              }`}
            >
              <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg mb-3 ${STRAND_ICON_BG[code] ?? "bg-muted text-muted-foreground"}`}>
                {STRAND_ICON[code]}
              </div>
              <div className="text-xs text-muted-foreground mb-0.5">{strand}</div>
              <div className="text-xl font-bold leading-none mb-1">{coveredStandards}</div>
              <div className="text-xs text-muted-foreground mb-2">of {total} standards</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${STRAND_PROGRESS_COLOR[code] ?? "bg-primary"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-medium tabular-nums">{pct}%</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main content: table + sidebar */}
      <div className="flex gap-5 items-start">
        {/* Left: tabs + table */}
        <div className="flex-1 min-w-0">
          {/* Tab bar + filters row */}
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-1 border-b border-transparent">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-2 text-sm font-medium rounded-t transition-colors whitespace-nowrap ${
                    statusFilter === tab.key
                      ? "text-primary border-b-2 border-primary -mb-px"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    statusFilter === tab.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Select value={strandFilter} onValueChange={(v) => setStrandFilter(v ?? "all")}>
                <SelectTrigger className="h-8 text-sm w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Strands</SelectItem>
                  {strandKeys.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button className="h-8 px-3 text-sm border rounded-md flex items-center gap-1.5 hover:bg-muted transition-colors text-muted-foreground">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-24">Standard</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Description</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-32 hidden md:table-cell">Strand</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-20 hidden sm:table-cell">Skills</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-32">Coverage</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-28">Status</th>
                  <th className="w-8 px-2" />
                </tr>
              </thead>
              <tbody>
                {skillsLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Loading skills…
                    </td>
                  </tr>
                ) : (
                  strandKeys.map((strand) => {
                    const code = STRAND_CODE[strand] ?? strand;
                    const items = (byStrand[strand] ?? []);
                    if (strandFilter !== "all" && strandFilter !== strand) return null;

                    const filteredItems = items.filter((s) => {
                      const stat = standardStats.find((st) => st.standard.id === s.id);
                      if (!stat) return statusFilter === "all";
                      return statusFilter === "all" || stat.status === statusFilter;
                    });
                    if (filteredItems.length === 0) return null;

                    const isOpen = !collapsed[strand];
                    const strandSkillTotal = items.reduce((sum, s) => sum + (byStandardId[s.id]?.length ?? 0), 0);
                    const strandSkillCovered = items.reduce((sum, s) => {
                      return sum + (byStandardId[s.id] ?? []).filter((sk) => coveredSkillIds.has(sk.id)).length;
                    }, 0);
                    const strandPct = strandSkillTotal > 0 ? Math.round((strandSkillCovered / strandSkillTotal) * 100) : 0;

                    return [
                      // Strand group header row
                      <tr
                        key={`header-${strand}`}
                        className="border-t bg-muted/20 cursor-pointer select-none hover:bg-muted/40 transition-colors"
                        onClick={() => setCollapsed((p) => ({ ...p, [strand]: !p[strand] }))}
                      >
                        <td colSpan={7} className="px-4 py-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isOpen
                                ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${STRAND_COLORS[code] ?? ""}`}>
                                {code}
                              </span>
                              <span className="text-xs font-medium">{strand}</span>
                              <span className="text-xs text-muted-foreground">· {filteredItems.length} standard{filteredItems.length !== 1 ? "s" : ""}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="hidden sm:flex items-center gap-2">
                                <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${STRAND_PROGRESS_COLOR[code] ?? "bg-primary"}`}
                                    style={{ width: `${strandPct}%` }}
                                  />
                                </div>
                                <span className="text-xs tabular-nums text-muted-foreground">{strandPct}%</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>,
                      // Standard rows
                      ...(isOpen ? filteredItems.map((standard) => {
                        const stat = standardStats.find((st) => st.standard.id === standard.id);
                        const { covered = 0, total = 0, status = "not_covered", pct = 0 } = stat ?? {};

                        return (
                          <tr
                            key={standard.id}
                            className="border-t hover:bg-muted/30 cursor-pointer transition-colors group"
                            onClick={() => setSelectedStandard(standard)}
                          >
                            <td className="px-4 py-3">
                              <StrandBadge code={standard.code} />
                            </td>
                            <td className="px-4 py-3 text-foreground/80 max-w-xs">
                              <span className="line-clamp-2 text-sm">{standard.description}</span>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STRAND_ICON_BG[code] ?? "bg-muted text-muted-foreground"}`}>
                                {strand}
                              </span>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground tabular-nums">
                              {total > 0 ? `${covered}/${total}` : "—"}
                            </td>
                            <td className="px-4 py-3">
                              {total > 0 ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden min-w-[48px]">
                                    <div
                                      className={`h-full rounded-full ${STRAND_PROGRESS_COLOR[code] ?? "bg-primary"}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="text-xs tabular-nums text-muted-foreground w-8">{pct}%</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {status === "covered" && (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                                  <CheckCircle2 className="h-3 w-3" /> Covered
                                </span>
                              )}
                              {status === "partial" && (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                                  <AlertTriangle className="h-3 w-3" /> Partial
                                </span>
                              )}
                              {status === "not_covered" && (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-medium">
                                  <Circle className="h-3 w-3" /> Not Covered
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-3">
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </td>
                          </tr>
                        );
                      }) : []),
                    ];
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-60 shrink-0 space-y-3 hidden lg:block">
          {/* Overall Coverage */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overall Coverage</span>
              </div>
              <div className="text-4xl font-bold mb-1">{overallPct}%</div>
              <Progress value={overallPct} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground">{totalCovered} of {totalSkills} skills covered</p>
            </CardContent>
          </Card>

          {/* Coverage Insights */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">Coverage Insights</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2.5">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{coveredCount} standard{coveredCount !== 1 ? "s" : ""} fully covered</p>
                  <p className="text-xs text-muted-foreground">Great job! Keep it up.</p>
                </div>
              </div>
              {partialCount > 0 && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{partialCount} standard{partialCount !== 1 ? "s" : ""} partially covered</p>
                    <p className="text-xs text-muted-foreground">More skills needed.</p>
                  </div>
                </div>
              )}
              {notCoveredCount > 0 && (
                <div className="flex items-start gap-2">
                  <Circle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{notCoveredCount} standard{notCoveredCount !== 1 ? "s" : ""} not covered</p>
                    <p className="text-xs text-muted-foreground">Add these to ensure full compliance.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* HOD Readiness */}
          {!isHod && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm">HOD Readiness</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex items-center gap-3 mb-3">
                  {/* Circular progress ring */}
                  <div className="relative shrink-0">
                    <svg width="56" height="56" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="22" fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
                      <circle
                        cx="28" cy="28" r="22"
                        fill="none"
                        stroke={overallPct >= 80 ? "#10b981" : overallPct >= 50 ? "#f59e0b" : "#ef4444"}
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 22}`}
                        strokeDashoffset={`${2 * Math.PI * 22 * (1 - overallPct / 100)}`}
                        transform="rotate(-90 28 28)"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{overallPct}%</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {overallPct >= 80 ? "Almost there!" : overallPct >= 50 ? "In progress" : "Getting started"}
                    </p>
                    <p className="text-xs text-muted-foreground leading-snug">
                      Full coverage recommended before submitting for HOD review.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function teacherInitials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function readinessLabel(pct: number) {
  if (pct >= 80) return { label: "Submission ready", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (pct >= 50) return { label: "In progress", color: "bg-amber-50 text-amber-700 border-amber-200" };
  return { label: "Getting started", color: "bg-red-50 text-red-700 border-red-200" };
}

function DepartmentCoverageGrid({
  standards,
  byStrand,
  teachers,
}: {
  standards: Standard[];
  byStrand: Record<string, Standard[]>;
  teachers: { id: string; full_name: string | null; email: string }[];
}) {
  const { coverageByTeacher, loading } = useDepartmentCoverage();
  const { byStandardId } = useAllSkills();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [focusTeacherId, setFocusTeacherId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [strandFilter, setStrandFilter] = useState<string>("all");

  const strandKeys = Object.keys(byStrand);

  // Per-teacher summary stats
  const teacherStats = teachers.map((t) => {
    const covered = coverageByTeacher.get(t.id) ?? new Set<string>();
    const totalSkills = standards.reduce((sum, s) => sum + (byStandardId[s.id]?.length ?? 0), 0);
    const coveredCount = standards.reduce((sum, s) => {
      return sum + (byStandardId[s.id] ?? []).filter((sk) => covered.has(sk.id)).length;
    }, 0);
    const pct = totalSkills > 0 ? Math.round((coveredCount / totalSkills) * 100) : 0;
    const standardsCovered = standards.filter((s) => {
      const skills = byStandardId[s.id] ?? [];
      return skills.length > 0 && skills.every((sk) => covered.has(sk.id));
    }).length;
    return { teacher: t, pct, coveredSkills: coveredCount, totalSkills, standardsCovered };
  });

  // Per-standard stats for the active view (focused teacher or union of all)
  const activeSkillIds: Set<string> = focusTeacherId
    ? (coverageByTeacher.get(focusTeacherId) ?? new Set())
    : new Set(teachers.flatMap((t) => [...(coverageByTeacher.get(t.id) ?? new Set())]));

  const standardStats = standards.map((s) => {
    const skills = byStandardId[s.id] ?? [];
    const covered = skills.filter((sk) => activeSkillIds.has(sk.id)).length;
    const total = skills.length;
    const status = skillStatus(covered, total);
    const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
    // Which teachers cover this standard (any skill)?
    const coveringTeachers = teachers.filter((t) => {
      const ts = coverageByTeacher.get(t.id) ?? new Set();
      return (byStandardId[s.id] ?? []).some((sk) => ts.has(sk.id));
    });
    return { standard: s, covered, total, status, pct, coveringTeachers };
  });

  const totalSkillsAll = standardStats.reduce((sum, s) => sum + s.total, 0);
  const totalCoveredAll = standardStats.reduce((sum, s) => sum + s.covered, 0);
  const deptPct = totalSkillsAll > 0 ? Math.round((totalCoveredAll / totalSkillsAll) * 100) : 0;

  const coveredCount = standardStats.filter((s) => s.status === "covered").length;
  const partialCount = standardStats.filter((s) => s.status === "partial").length;
  const notCoveredCount = standardStats.filter((s) => s.status === "not_covered").length;

  const readyCount = teacherStats.filter((t) => t.pct >= 80).length;
  const inProgressCount = teacherStats.filter((t) => t.pct >= 50 && t.pct < 80).length;
  const startingCount = teacherStats.filter((t) => t.pct < 50).length;

  // Top gaps: uncovered standards sorted by how few teachers touch them
  const topGaps = standardStats
    .filter((s) => s.status !== "covered")
    .sort((a, b) => a.coveringTeachers.length - b.coveringTeachers.length)
    .slice(0, 5);

  if (loading) return null;

  const tabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "All Standards", count: standards.length },
    { key: "covered", label: "Covered", count: coveredCount },
    { key: "partial", label: "Partial", count: partialCount },
    { key: "not_covered", label: "Not Covered", count: notCoveredCount },
  ];

  return (
    <div className="space-y-5">
      {/* Teacher summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {teacherStats.map(({ teacher, pct, standardsCovered }) => {
          const { label, color } = readinessLabel(pct);
          const isActive = focusTeacherId === teacher.id;
          return (
            <button
              key={teacher.id}
              onClick={() => setFocusTeacherId(isActive ? null : teacher.id)}
              className={`text-left p-4 rounded-xl border transition-all ${
                isActive
                  ? "border-primary ring-1 ring-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
                  {teacherInitials(teacher.full_name, teacher.email)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{teacher.full_name ?? teacher.email}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${color}`}>{label}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-400"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-semibold tabular-nums">{pct}%</span>
              </div>
              <p className="text-xs text-muted-foreground">{standardsCovered} of {standards.length} standards fully covered</p>
            </button>
          );
        })}
      </div>

      {/* Main content: table + sidebar */}
      <div className="flex gap-5 items-start">
        {/* Left: tabs + table */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-2 text-sm font-medium rounded-t transition-colors whitespace-nowrap ${
                    statusFilter === tab.key
                      ? "text-primary border-b-2 border-primary -mb-px"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    statusFilter === tab.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Select value={strandFilter} onValueChange={(v) => setStrandFilter(v ?? "all")}>
                <SelectTrigger className="h-8 text-sm w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Strands</SelectItem>
                  {strandKeys.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-24">Standard</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Description</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-32 hidden md:table-cell">Strand</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-28 hidden sm:table-cell">Teachers</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-28">Status</th>
                </tr>
              </thead>
              <tbody>
                {strandKeys.map((strand) => {
                  const code = STRAND_CODE[strand] ?? strand;
                  const items = byStrand[strand] ?? [];
                  if (strandFilter !== "all" && strandFilter !== strand) return null;

                  const filteredItems = items.filter((s) => {
                    const stat = standardStats.find((st) => st.standard.id === s.id);
                    if (!stat) return statusFilter === "all";
                    return statusFilter === "all" || stat.status === statusFilter;
                  });
                  if (filteredItems.length === 0) return null;

                  const isOpen = !collapsed[strand];

                  return [
                    <tr
                      key={`header-${strand}`}
                      className="border-t bg-muted/20 cursor-pointer select-none hover:bg-muted/40 transition-colors"
                      onClick={() => setCollapsed((p) => ({ ...p, [strand]: !p[strand] }))}
                    >
                      <td colSpan={5} className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${STRAND_COLORS[code] ?? ""}`}>{code}</span>
                          <span className="text-xs font-medium">{strand}</span>
                          <span className="text-xs text-muted-foreground">· {filteredItems.length} standard{filteredItems.length !== 1 ? "s" : ""}</span>
                        </div>
                      </td>
                    </tr>,
                    ...(isOpen ? filteredItems.map((standard) => {
                      const stat = standardStats.find((st) => st.standard.id === standard.id);
                      const { status = "not_covered", coveringTeachers = [] } = stat ?? {};

                      return (
                        <tr key={standard.id} className="border-t hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <StrandBadge code={standard.code} />
                          </td>
                          <td className="px-4 py-3 text-foreground/80 max-w-xs">
                            <span className="line-clamp-2 text-sm">{standard.description}</span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STRAND_ICON_BG[code] ?? "bg-muted text-muted-foreground"}`}>
                              {strand}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            {coveringTeachers.length === 0 ? (
                              <span className="text-xs text-muted-foreground">None</span>
                            ) : (
                              <div className="flex gap-1 flex-wrap">
                                {coveringTeachers.map((t) => (
                                  <span
                                    key={t.id}
                                    title={t.full_name ?? t.email}
                                    className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                                  >
                                    {teacherInitials(t.full_name, t.email)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {status === "covered" && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                                <CheckCircle2 className="h-3 w-3" /> Covered
                              </span>
                            )}
                            {status === "partial" && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                                <AlertTriangle className="h-3 w-3" /> Partial
                              </span>
                            )}
                            {status === "not_covered" && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-medium">
                                <Circle className="h-3 w-3" /> Not Covered
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    }) : []),
                  ];
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-60 shrink-0 space-y-3 hidden lg:block">
          {/* Department Overview */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Department Coverage</div>
              <div className="text-4xl font-bold mb-1">{deptPct}%</div>
              <Progress value={deptPct} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground">
                {focusTeacherId
                  ? `Filtered: ${teacherStats.find((t) => t.teacher.id === focusTeacherId)?.teacher.full_name ?? "teacher"}`
                  : `Across ${teachers.length} teachers`}
              </p>
            </CardContent>
          </Card>

          {/* Teacher Readiness */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">Teacher Readiness</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm">Submission ready</span>
                </div>
                <span className="text-sm font-semibold">{readyCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-sm">In progress</span>
                </div>
                <span className="text-sm font-semibold">{inProgressCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-sm">Getting started</span>
                </div>
                <span className="text-sm font-semibold">{startingCount}</span>
              </div>
            </CardContent>
          </Card>

          {/* Top Gaps */}
          {topGaps.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm">Biggest Gaps</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {topGaps.map(({ standard, coveringTeachers }) => (
                  <div key={standard.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <StrandBadge code={standard.code} />
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {coveringTeachers.length === 0 ? "No one" : `${coveringTeachers.length} teacher${coveringTeachers.length !== 1 ? "s" : ""}`}
                    </span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pt-1">Standards with the fewest teachers covering them.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
