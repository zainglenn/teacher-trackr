"use client";

import { useState, useMemo } from "react";
import { PageContainer } from "@/components/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Circle,
  Clock,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Pencil,
  MessageSquare,
  Languages,
  BookMarked,
  AlertTriangle,
} from "lucide-react";
import { Standard } from "@/types";
import { useStandardPipeline, PipelineStatus } from "@/hooks/useStandardPipeline";
import { useDepartmentPipeline } from "@/hooks/useDepartmentPipeline";
import { useAllSkills } from "@/hooks/useAllSkills";
import { useTeachers } from "@/hooks/useTeachers";
import { StandardContextView } from "@/components/StandardDetailView";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STRAND_COLORS, StrandBadge } from "@/components/ltp/StrandBadge";

interface CoverageViewProps {
  standards: Standard[];
  byStrand: Record<string, Standard[]>;
  teacherId: string;
  isHod?: boolean;
  contextLabel?: string | null;
  subjectId?: string | null;
  gradeLevelId?: string | null;
}

type StatusFilter = "all" | "taught" | "scheduled" | "planned" | "unmapped";

const STRAND_CODE: Record<string, string> = {
  "Reading Literature": "RL",
  "Reading Informational Text": "RI",
  "Writing": "W",
  "Speaking & Listening": "SL",
  "Language": "L",
};

const STRAND_ICON: Record<string, React.ReactNode> = {
  RL: <BookOpen className="h-5 w-5" />,
  RI: <BookMarked className="h-5 w-5" />,
  W: <Pencil className="h-5 w-5" />,
  SL: <MessageSquare className="h-5 w-5" />,
  L: <Languages className="h-5 w-5" />,
};

const STRAND_ACCENT_VAR: Record<string, string> = {
  RL: "--strand-rl-accent",
  RI: "--strand-ri-accent",
  W:  "--strand-w-accent",
  SL: "--strand-sl-accent",
  L:  "--strand-l-accent",
};

function strandIconStyle(code: string): React.CSSProperties {
  const c = code.toLowerCase();
  return {
    background: `color-mix(in srgb, var(--strand-${c}-accent, var(--muted)) 15%, transparent)`,
    color: `var(--strand-${c}-accent, var(--muted-foreground))`,
  };
}

function StatusBadge({ status }: { status: PipelineStatus }) {
  const styles: Record<PipelineStatus, { bg: string; text: string; border: string; label: string }> = {
    taught:     { bg: "var(--status-taught-bg)",  text: "var(--status-taught-text)",  border: "var(--status-taught-border)",  label: "Taught"     },
    scheduled:  { bg: "var(--status-behind-bg)",  text: "var(--status-behind-text)",  border: "var(--status-behind-border)",  label: "Scheduled"  },
    planned:    { bg: "var(--status-pending-bg)", text: "var(--status-pending-text)", border: "var(--status-pending-border)", label: "Planned"    },
    unmapped:   { bg: "var(--status-overdue-bg)", text: "var(--status-overdue-text)", border: "var(--status-overdue-border)", label: "Unmapped"   },
  };
  const s = styles[status];
  const Icon =
    status === "taught"    ? CheckCircle2 :
    status === "scheduled" ? Clock :
    status === "planned"   ? Circle :
    AlertTriangle;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      <Icon className="h-3 w-3" />
      {s.label}
    </span>
  );
}

/** Horizontal pipeline progress bar */
function PipelineSummaryBar({
  unmapped, planned, scheduled, taught, total,
}: {
  unmapped: number; planned: number; scheduled: number; taught: number; total: number;
}) {
  if (total === 0) return null;

  const segments: { count: number; color: string; label: string; textColor: string }[] = [
    { count: unmapped,  color: "var(--status-overdue-bg)",  textColor: "var(--status-overdue-text)",  label: "Unmapped"  },
    { count: planned,   color: "var(--status-pending-bg)",  textColor: "var(--status-pending-text)",  label: "Planned"   },
    { count: scheduled, color: "var(--status-behind-bg)",   textColor: "var(--status-behind-text)",   label: "Scheduled" },
    { count: taught,    color: "var(--status-taught-bg)",   textColor: "var(--status-taught-text)",   label: "Taught"    },
  ];

  return (
    <div className="space-y-2">
      {/* Bar */}
      <div className="flex h-2 rounded-full overflow-hidden w-full bg-muted">
        {segments.map(({ count, color, label }) => {
          const pct = (count / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={label}
              title={`${label}: ${count}`}
              style={{ width: `${pct}%`, background: color }}
            />
          );
        })}
      </div>
      {/* Labels */}
      <div className="flex items-center gap-4 flex-wrap">
        {segments.map(({ count, textColor, label }, i) => (
          <div key={label} className="flex items-center gap-1.5">
            {i < segments.length - 1 && (
              <span className="text-xs text-muted-foreground hidden sm:inline">→</span>
            )}
            <span
              className="text-xs font-medium tabular-nums"
              style={{ color: textColor }}
            >
              {label}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">({count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CoverageView({ standards, byStrand, teacherId, isHod, contextLabel, subjectId, gradeLevelId }: CoverageViewProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const { teachers } = useTeachers();

  const effectiveTeacherId = isHod ? selectedTeacherId : teacherId;

  const showAllTeachers = isHod && !selectedTeacherId;

  return (
    <PageContainer
      title="Standards Coverage"
      description={contextLabel ?? "Coverage is computed from your long term plans — no extra steps needed."}
    >
      <div className="space-y-4">
        {isHod && (
          <div className="flex items-center gap-2">
            <Select
              value={selectedTeacherId ?? "all"}
              onValueChange={(v) => { setSelectedTeacherId(v === "all" ? null : v); }}
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

        {showAllTeachers ? (
          <DepartmentCoverageGrid standards={standards} byStrand={byStrand} subjectId={subjectId} gradeLevelId={gradeLevelId} />
        ) : (
          <CoverageGrid
            key={`${effectiveTeacherId}-${subjectId ?? "none"}-${gradeLevelId ?? "none"}`}
            standards={standards}
            byStrand={byStrand}
            teacherId={effectiveTeacherId ?? teacherId}
            subjectId={subjectId ?? null}
            gradeLevelId={gradeLevelId ?? null}
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
  subjectId,
  gradeLevelId,
  isHod,
}: {
  standards: Standard[];
  byStrand: Record<string, Standard[]>;
  teacherId: string;
  subjectId: string | null;
  gradeLevelId: string | null;
  isHod?: boolean;
}) {
  const { entries, loading, summary } = useStandardPipeline(teacherId, subjectId, gradeLevelId, standards);
  const { byStandardId } = useAllSkills();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selectedStandard, setSelectedStandard] = useState<(typeof standards)[0] | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [strandFilter, setStrandFilter] = useState<string>("all");

  const strandKeys = Object.keys(byStrand);

  const standardStats = useMemo(() => {
    return standards.map((s) => {
      const entry = entries.find((e) => e.standard.id === s.id);
      const status: PipelineStatus = entry?.status ?? "unmapped";
      return { standard: s, status, entry };
    });
  }, [standards, entries]);

  const taughtCount    = standardStats.filter((s) => s.status === "taught").length;
  const scheduledCount = standardStats.filter((s) => s.status === "scheduled").length;
  const plannedCount   = standardStats.filter((s) => s.status === "planned").length;
  const unmappedCount  = standardStats.filter((s) => s.status === "unmapped").length;
  const overallPct     = standards.length > 0 ? Math.round((taughtCount / standards.length) * 100) : 0;

  const strandStats = useMemo(() => {
    return strandKeys.map((strand) => {
      const items = byStrand[strand] ?? [];
      const taughtStandards = items.filter((s) => {
        const entry = entries.find((e) => e.standard.id === s.id);
        return (entry?.status ?? "unmapped") === "taught";
      }).length;
      const pct = items.length > 0 ? Math.round((taughtStandards / items.length) * 100) : 0;
      return { strand, total: items.length, taughtStandards, pct };
    });
  }, [strandKeys, byStrand, entries]);

  if (selectedStandard) {
    return (
      <StandardContextView
        standard={selectedStandard}
        onBack={() => setSelectedStandard(null)}
        preloadedSkills={byStandardId[selectedStandard.id] ?? []}
        deliveryStatus={null}
      />
    );
  }

  const tabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all",       label: "All Standards", count: standards.length },
    { key: "taught",    label: "Taught",        count: taughtCount      },
    { key: "scheduled", label: "Scheduled",     count: scheduledCount   },
    { key: "planned",   label: "Planned",       count: plannedCount     },
    { key: "unmapped",  label: "Unmapped",      count: unmappedCount    },
  ];

  return (
    <div className="space-y-5">
      {/* Pipeline summary bar */}
      <PipelineSummaryBar
        unmapped={summary.unmapped}
        planned={summary.planned}
        scheduled={summary.scheduled}
        taught={summary.taught}
        total={summary.total}
      />

      {/* Unmapped alert banner */}
      {unmappedCount > 0 && (
        <div
          role="alert"
          className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{
            background: "var(--status-overdue-bg)",
            borderColor: "var(--status-overdue-border)",
          }}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "var(--status-overdue-text)" }} />
          <p className="text-sm flex-1" style={{ color: "var(--status-overdue-text)" }}>
            <span className="font-semibold">{unmappedCount} standard{unmappedCount !== 1 ? "s" : ""} have no unit plan</span>
            {" "}— they may not be taught this year.
          </p>
          <button
            onClick={() => setStatusFilter("unmapped")}
            className="text-sm font-medium underline shrink-0"
            style={{ color: "var(--status-overdue-text)" }}
          >
            Show unmapped
          </button>
        </div>
      )}

      {/* Strand summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {strandStats.map(({ strand, total, taughtStandards, pct }) => {
          const code = STRAND_CODE[strand] ?? strand;
          const isActive = strandFilter === strand;
          return (
            <button
              key={strand}
              type="button"
              aria-pressed={isActive}
              onClick={() => setStrandFilter(isActive ? "all" : strand)}
              className={`text-left p-4 rounded-xl border transition-all ${
                isActive
                  ? "border-primary ring-1 ring-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
              }`}
            >
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg mb-3" style={strandIconStyle(code)}>
                {STRAND_ICON[code]}
              </div>
              <div className="text-xs text-muted-foreground mb-0.5">{strand}</div>
              <div className="text-xl font-bold leading-none mb-1">{taughtStandards}</div>
              <div className="text-xs text-muted-foreground mb-2">of {total} standards</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: `var(${STRAND_ACCENT_VAR[code]})` }}
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
          {/* Tab bar + strand select */}
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] border-b border-transparent">
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

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-24">Standard</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Description</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-32 hidden md:table-cell">Strand</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-36 hidden sm:table-cell">Unit</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-28">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Loading coverage…
                    </td>
                  </tr>
                ) : (
                  strandKeys.map((strand) => {
                    const code = STRAND_CODE[strand] ?? strand;
                    const items = byStrand[strand] ?? [];
                    if (strandFilter !== "all" && strandFilter !== strand) return null;

                    const filteredItems = items.filter((s) => {
                      if (statusFilter === "all") return true;
                      const stat = standardStats.find((st) => st.standard.id === s.id);
                      return stat?.status === statusFilter;
                    });
                    if (filteredItems.length === 0) return null;

                    const isOpen = !collapsed[strand];
                    const strandTaught = items.filter((s) => {
                      const entry = entries.find((e) => e.standard.id === s.id);
                      return (entry?.status ?? "unmapped") === "taught";
                    }).length;
                    const strandPct = items.length > 0 ? Math.round((strandTaught / items.length) * 100) : 0;

                    return [
                      <tr
                        key={`header-${strand}`}
                        className="border-t bg-muted/20 cursor-pointer select-none hover:bg-muted/40 transition-colors"
                        onClick={() => setCollapsed((p) => ({ ...p, [strand]: !p[strand] }))}
                      >
                        <td colSpan={5} className="px-4 py-2">
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
                            <div className="hidden sm:flex items-center gap-2">
                              <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${strandPct}%`, backgroundColor: `var(${STRAND_ACCENT_VAR[code]})` }}
                                />
                              </div>
                              <span className="text-xs tabular-nums text-muted-foreground">{strandPct}%</span>
                            </div>
                          </div>
                        </td>
                      </tr>,
                      ...(isOpen ? filteredItems.map((standard) => {
                        const stat = standardStats.find((st) => st.standard.id === standard.id);
                        const status: PipelineStatus = stat?.status ?? "unmapped";
                        const entry = stat?.entry;

                        return (
                          <tr
                            key={standard.id}
                            tabIndex={0}
                            role="row"
                            className="border-t hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => setSelectedStandard(standard)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedStandard(standard); } }}
                          >
                            <td className="px-4 py-3">
                              <StrandBadge code={standard.code} />
                            </td>
                            <td className="px-4 py-3 text-foreground/80 max-w-xs">
                              <span className="line-clamp-2 text-sm">{standard.description}</span>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={strandIconStyle(code)}>
                                {strand}
                              </span>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              {entry?.unitTitle ? (
                                <span className="text-xs text-muted-foreground truncate max-w-[120px] block">
                                  {entry.unitNumber != null ? `Unit ${entry.unitNumber}: ` : ""}{entry.unitTitle}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={status} />
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
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overall Coverage</span>
              </div>
              <div className="text-4xl font-bold mb-1">{overallPct}%</div>
              <Progress value={overallPct} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground">{taughtCount} of {standards.length} standards taught</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">Coverage Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2.5">
              {taughtCount > 0 && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "var(--status-taught-text)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{taughtCount} taught</p>
                  </div>
                </div>
              )}
              {scheduledCount > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" style={{ color: "var(--status-behind-text)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{scheduledCount} scheduled</p>
                  </div>
                </div>
              )}
              {plannedCount > 0 && (
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4 shrink-0" style={{ color: "var(--status-pending-text)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{plannedCount} planned</p>
                  </div>
                </div>
              )}
              {unmappedCount > 0 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "var(--status-overdue-text)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{unmappedCount} unmapped</p>
                    <p className="text-xs text-muted-foreground">Not in any unit plan</p>
                  </div>
                </div>
              )}
              {taughtCount === 0 && scheduledCount === 0 && plannedCount === 0 && unmappedCount === 0 && (
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No data yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {!isHod && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm">HOD Readiness</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex items-center gap-3 mb-3">
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
  subjectId,
  gradeLevelId,
}: {
  standards: Standard[];
  byStrand: Record<string, Standard[]>;
  subjectId?: string | null;
  gradeLevelId?: string | null;
}) {
  const { results, loading } = useDepartmentPipeline(subjectId ?? null, gradeLevelId ?? null, standards);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [focusTeacherId, setFocusTeacherId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "taught" | "scheduled" | "unmapped">("all");
  const [strandFilter, setStrandFilter] = useState<string>("all");

  const strandKeys = Object.keys(byStrand);

  const teacherStats = results.map((r) => {
    const taughtCount = r.summary.taught;
    const pct = standards.length > 0 ? Math.round((taughtCount / standards.length) * 100) : 0;
    return { teacherId: r.teacherId, teacherName: r.teacherName, pct, taughtCount, summary: r.summary };
  });

  // For the standards table: aggregate across all teachers (or focus on one)
  const standardStats = standards.map((s) => {
    const activeResults = focusTeacherId
      ? results.filter((r) => r.teacherId === focusTeacherId)
      : results;
    const taughtByCount = activeResults.filter((r) => r.statusByStandardId.get(s.id) === "taught").length;
    const plannedByCount = activeResults.filter((r) => ["planned","scheduled"].includes(r.statusByStandardId.get(s.id) ?? "")).length;
    // Department status: taught by anyone > scheduled > planned > unmapped
    const status: "taught" | "scheduled" | "planned" | "unmapped" =
      taughtByCount > 0 ? "taught"
      : plannedByCount > 0 ? "scheduled"
      : activeResults.some((r) => r.statusByStandardId.get(s.id) === "planned") ? "planned"
      : "unmapped";
    const coveringTeachers = activeResults
      .filter((r) => r.statusByStandardId.get(s.id) === "taught")
      .map((r) => ({ id: r.teacherId, full_name: r.teacherName }));
    return { standard: s, status, taughtByCount, coveringTeachers };
  });

  const taughtCount   = standardStats.filter((s) => s.status === "taught").length;
  const scheduledCount = standardStats.filter((s) => s.status === "scheduled" || s.status === "planned").length;
  const unmappedCount  = standardStats.filter((s) => s.status === "unmapped").length;

  const deptTaughtPct = standards.length > 0
    ? Math.round((taughtCount / standards.length) * 100) : 0;

  const readyCount      = teacherStats.filter((t) => t.pct >= 80).length;
  const inProgressCount = teacherStats.filter((t) => t.pct >= 50 && t.pct < 80).length;
  const startingCount   = teacherStats.filter((t) => t.pct < 50).length;

  const topGaps = standardStats
    .filter((s) => s.status !== "taught")
    .sort((a, b) => a.coveringTeachers.length - b.coveringTeachers.length)
    .slice(0, 5);

  if (loading) return null;

  const tabs = [
    { key: "all" as const,       label: "All Standards", count: standards.length },
    { key: "taught" as const,    label: "Taught",        count: taughtCount      },
    { key: "scheduled" as const, label: "In Plan",       count: scheduledCount   },
    { key: "unmapped" as const,  label: "Unmapped",      count: unmappedCount    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {teacherStats.map(({ teacherId, teacherName, pct, taughtCount, summary }) => {
          const { label, color } = readinessLabel(pct);
          const isActive = focusTeacherId === teacherId;
          return (
            <button
              key={teacherId}
              type="button"
              onClick={() => setFocusTeacherId(isActive ? null : teacherId)}
              className={`text-left p-4 rounded-xl border transition-all ${
                isActive
                  ? "border-primary ring-1 ring-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
                  {(teacherName ?? "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{teacherName ?? "Unknown"}</p>
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
              <p className="text-xs text-muted-foreground">{taughtCount} of {standards.length} taught · {summary.unmapped} unmapped</p>
            </button>
          );
        })}
      </div>

      <div className="flex gap-5 items-start">
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
                    if (statusFilter === "all") return true;
                    const stat = standardStats.find((st) => st.standard.id === s.id);
                    if (!stat) return statusFilter === "unmapped";
                    if (statusFilter === "taught") return stat.status === "taught";
                    if (statusFilter === "scheduled") return stat.status === "scheduled" || stat.status === "planned";
                    if (statusFilter === "unmapped") return stat.status === "unmapped";
                    return true;
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
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={strandIconStyle(code)}>
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
                                    title={t.full_name ?? t.id}
                                    className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                                  >
                                    {(t.full_name ?? "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {status === "taught" && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                                <CheckCircle2 className="h-3 w-3" /> Taught
                              </span>
                            )}
                            {(status === "scheduled" || status === "planned") && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                                <Circle className="h-3 w-3" /> In Plan
                              </span>
                            )}
                            {status === "unmapped" && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border font-medium">
                                <AlertTriangle className="h-3 w-3" /> Unmapped
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

        <div className="w-60 shrink-0 space-y-3 hidden lg:block">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Taught This Year</div>
              <div className="text-4xl font-bold mb-1">{deptTaughtPct}%</div>
              <Progress value={deptTaughtPct} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground">
                {focusTeacherId
                  ? `Filtered: ${teacherStats.find((t) => t.teacherId === focusTeacherId)?.teacherName ?? "teacher"}`
                  : `${taughtCount} of ${standards.length} standards taught`}
              </p>
            </CardContent>
          </Card>

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

          {topGaps.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm">Biggest Gaps</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {topGaps.map(({ standard, coveringTeachers }) => (
                  <div key={standard.id} className="flex items-center justify-between gap-2">
                    <StrandBadge code={standard.code} />
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
