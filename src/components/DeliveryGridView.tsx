"use client";

import { useState } from "react";
import { Check, Circle, X, ChevronRight, Grid3X3 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StrandBadge } from "@/components/ltp/StrandBadge";
import { useDeliveryGrid, DeliveryStatus, GridClass, GridWeek, DeliveryRecord } from "@/hooks/useDeliveryGrid";

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<DeliveryStatus, {
  icon: React.ElementType;
  label: string;
  style: React.CSSProperties;
  badgeStyle: React.CSSProperties;
}> = {
  taught: {
    icon: Check,
    label: "Taught",
    style: { background: "var(--status-taught-bg)", color: "var(--status-taught-text)", border: "1px solid var(--status-taught-border)" },
    badgeStyle: { background: "var(--status-taught-bg)", color: "var(--status-taught-text)", borderColor: "var(--status-taught-border)" },
  },
  overdue: {
    icon: Circle,
    label: "Overdue",
    style: { background: "var(--status-overdue-bg)", color: "var(--status-overdue-text)", border: "1px solid var(--status-overdue-border)" },
    badgeStyle: { background: "var(--status-overdue-bg)", color: "var(--status-overdue-text)", borderColor: "var(--status-overdue-border)" },
  },
  behind: {
    icon: Circle,
    label: "Due soon",
    style: { background: "var(--status-behind-bg)", color: "var(--status-behind-text)", border: "1px solid var(--status-behind-border)" },
    badgeStyle: { background: "var(--status-behind-bg)", color: "var(--status-behind-text)", borderColor: "var(--status-behind-border)" },
  },
  pending: {
    icon: Circle,
    label: "Not yet",
    style: { background: "var(--status-pending-bg)", color: "var(--status-pending-text)", border: "1px solid var(--status-pending-border)" },
    badgeStyle: { background: "var(--status-pending-bg)", color: "var(--status-pending-text)", borderColor: "var(--status-pending-border)" },
  },
};

// ── Status Cell ───────────────────────────────────────────────────────────────

function StatusCell({ status, onClick }: { status: DeliveryStatus; onClick: () => void }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <button
      onClick={onClick}
      className="w-full h-full flex items-center justify-center transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm"
      aria-label={cfg.label}
      style={cfg.style}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
    </button>
  );
}

// ── Detail Sheet ──────────────────────────────────────────────────────────────

interface DetailSheetProps {
  open: boolean;
  onClose: () => void;
  cls: GridClass | null;
  week: GridWeek | null;
  delivery: DeliveryRecord | null;
  status: DeliveryStatus;
}

function DetailSheet({ open, onClose, cls, week, delivery, status }: DetailSheetProps) {
  if (!cls || !week) return null;
  const cfg = STATUS_CONFIG[status];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span className="font-semibold text-foreground">{cls.teacher?.full_name ?? "Unassigned"}</span>
            <ChevronRight className="h-3 w-3" />
            <span>Week {week.weekNumber}</span>
          </div>
          <SheetTitle className="text-base leading-snug">{week.focus || week.unitTitle}</SheetTitle>
          <Badge variant="outline" className="w-fit text-xs" style={cfg.badgeStyle}>
            {cfg.label}
          </Badge>
        </SheetHeader>

        <div className="py-5 space-y-5">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Teacher</p>
            <p className="text-sm">{cls.teacher?.full_name ?? "Unassigned"}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Delivery</p>
            {delivery ? (
              <p className="text-sm">
                Taught on{" "}
                <span className="font-medium">
                  {new Date(delivery.delivered_at).toLocaleDateString("en-GB", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Not yet delivered</p>
            )}
          </div>

          {delivery?.notes && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Class Notes</p>
              <p className="text-sm leading-relaxed bg-muted/50 rounded-md px-3 py-2.5 border">{delivery.notes}</p>
            </div>
          )}

          {week.standards.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Standards</p>
              <div className="flex flex-wrap gap-1.5">
                {week.standards.map((code) => <StrandBadge key={code} code={code} />)}
              </div>
            </div>
          )}

          {week.activities && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Activities</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{week.activities}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface DeliveryGridViewProps {
  teacherId: string;
  subjectId?: string | null;
  gradeLevelId?: string | null;
  onNavigate?: (view: import("@/components/AppSidebar").AppView) => void;
}

export function DeliveryGridView({ teacherId: _, subjectId, gradeLevelId, onNavigate: __ }: DeliveryGridViewProps) {
  const { classes, weeks, loading, getCellStatus, getDelivery } = useDeliveryGrid(
    subjectId ?? null,
    gradeLevelId ?? null
  );
  const [activeTerm, setActiveTerm] = useState<1 | 2 | 3>(1);
  const [sheet, setSheet] = useState<{ planId: string; unitNumber: number; weekNumber: number } | null>(null);

  const termWeeks = weeks.filter((w) => w.term === activeTerm);

  // Group by unitNumber for separator rows
  const unitGroups = termWeeks.reduce<Record<number, GridWeek[]>>((acc, w) => {
    if (!acc[w.unitNumber]) acc[w.unitNumber] = [];
    acc[w.unitNumber].push(w);
    return acc;
  }, {});

  // Sheet detail lookup
  const sheetClass = sheet ? classes.find((c) => c.planId === sheet.planId) ?? null : null;
  const sheetWeek = sheet ? termWeeks.find((w) => w.unitNumber === sheet.unitNumber && w.weekNumber === sheet.weekNumber) ?? null : null;
  const sheetStatus = sheet && sheetClass && sheetWeek ? getCellStatus(sheetClass, sheetWeek.unitNumber, sheetWeek.weekNumber) : "pending";
  const sheetDelivery = sheet && sheetClass && sheetWeek ? getDelivery(sheetClass, sheetWeek.unitNumber, sheetWeek.weekNumber) : null;

  function classDeliveredCount(cls: GridClass) {
    return termWeeks.filter((w) => getCellStatus(cls, w.unitNumber, w.weekNumber) === "taught").length;
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-5 gap-px mt-6">
          {Array.from({ length: 40 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-none" />)}
        </div>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!subjectId || !gradeLevelId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
          <Grid3X3 className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-base font-semibold mb-1">No context selected</h2>
        <p className="text-sm text-muted-foreground max-w-xs">Select a subject and grade level to view the delivery grid.</p>
      </div>
    );
  }

  if (!classes.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
          <Grid3X3 className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-base font-semibold mb-1">No plans yet</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          No long term plans exist for this subject and grade level.
        </p>
      </div>
    );
  }

  if (termWeeks.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <GridHeader activeTerm={activeTerm} onTermChange={setActiveTerm} classes={classes} />
        <div className="flex-1 flex items-center justify-center py-16 text-center px-6">
          <p className="text-sm text-muted-foreground">
            No lesson weeks planned for Term {activeTerm} yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <GridHeader activeTerm={activeTerm} onTermChange={setActiveTerm} classes={classes} />

      {/* ── Grid ──────────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {/* Mobile: card list */}
        <div className="sm:hidden divide-y">
          {classes.map((cls) => (
            <div key={cls.planId} className="px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold">{cls.teacher?.full_name ?? "Unassigned"}</p>
                  <p className="text-xs text-muted-foreground">{cls.planTitle}</p>
                </div>
                <span className="text-xs text-muted-foreground">{classDeliveredCount(cls)}/{termWeeks.length} taught</span>
              </div>
              <div className="space-y-1.5">
                {termWeeks.map((week) => {
                  const st = getCellStatus(cls, week.unitNumber, week.weekNumber);
                  const cfg = STATUS_CONFIG[st];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={`${week.unitNumber}-${week.weekNumber}`}
                      onClick={() => setSheet({ planId: cls.planId, unitNumber: week.unitNumber, weekNumber: week.weekNumber })}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left text-xs transition-opacity hover:opacity-80"
                      style={cfg.style}
                    >
                      <Icon className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                      <span className="truncate">Week {week.weekNumber} — {week.focus || week.unitTitle}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: grid */}
        <div className="hidden sm:block min-w-max">
          <table className="border-collapse w-full text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-background border-b border-r w-44 px-3 py-2.5 text-left font-medium text-muted-foreground">
                  Lesson Week
                </th>
                {classes.map((cls) => (
                  <th key={cls.planId} className="border-b border-r px-2 py-2.5 text-center font-medium min-w-[6rem]">
                    <p className="font-semibold text-foreground">{cls.teacher?.full_name?.split(" ")[0] ?? "—"}</p>
                    <p className="text-muted-foreground font-normal truncate max-w-[5rem] mx-auto text-[10px]">
                      {cls.teacher?.full_name?.split(" ").slice(1).join(" ") ?? "Unassigned"}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(unitGroups).map(([unitNumberStr, unitWeeks]) => {
                const unitNumber = parseInt(unitNumberStr);
                return (
                  <>
                    <tr key={`unit-${unitNumber}`}>
                      <td
                        colSpan={classes.length + 1}
                        className="sticky left-0 bg-muted/60 border-b border-r px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
                      >
                        {unitWeeks[0].unitTitle}
                      </td>
                    </tr>
                    {unitWeeks.map((week) => (
                      <tr key={`${unitNumber}-${week.weekNumber}`} className="group">
                        <td className="sticky left-0 z-10 bg-background border-b border-r px-3 py-0 h-10">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground">W{week.weekNumber}</span>
                            <span className="text-muted-foreground truncate max-w-[7rem]">{week.focus}</span>
                          </div>
                        </td>
                        {classes.map((cls) => {
                          const st = getCellStatus(cls, week.unitNumber, week.weekNumber);
                          return (
                            <td key={cls.planId} className="border-b border-r h-10 p-0.5">
                              <StatusCell
                                status={st}
                                onClick={() => setSheet({ planId: cls.planId, unitNumber: week.unitNumber, weekNumber: week.weekNumber })}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                );
              })}

              {/* Footer: delivery counts */}
              <tr>
                <td className="sticky left-0 bg-background border-t px-3 py-2 text-xs font-semibold text-muted-foreground">
                  Progress
                </td>
                {classes.map((cls) => {
                  const delivered = classDeliveredCount(cls);
                  const pct = termWeeks.length > 0 ? (delivered / termWeeks.length) * 100 : 0;
                  return (
                    <td key={cls.planId} className="border-t px-2 py-2 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs text-muted-foreground">{delivered}/{termWeeks.length}</span>
                        <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: pct === 100
                                ? "var(--status-taught-text)"
                                : pct > 50
                                ? "var(--strand-sl-accent)"
                                : "var(--status-behind-text)",
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Legend ────────────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-3 border-t flex flex-wrap gap-4">
        {(["taught", "pending"] as DeliveryStatus[]).map((st) => {
          const cfg = STATUS_CONFIG[st];
          const Icon = cfg.icon;
          return (
            <div key={st} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="flex items-center justify-center w-5 h-5 rounded-sm" style={cfg.style}>
                <Icon className="h-3 w-3" strokeWidth={2.5} />
              </span>
              {cfg.label}
            </div>
          );
        })}
      </div>

      <DetailSheet
        open={!!sheet}
        onClose={() => setSheet(null)}
        cls={sheetClass}
        week={sheetWeek}
        delivery={sheetDelivery}
        status={sheetStatus}
      />
    </div>
  );
}

// ── Grid Header ───────────────────────────────────────────────────────────────

function GridHeader({
  activeTerm,
  onTermChange,
  classes,
}: {
  activeTerm: 1 | 2 | 3;
  onTermChange: (t: 1 | 2 | 3) => void;
  classes: GridClass[];
}) {
  return (
    <div className="px-4 sm:px-6 pt-5 pb-4 border-b flex flex-col sm:flex-row sm:items-end gap-3">
      <div className="flex-1">
        <h1 className="text-lg font-semibold tracking-tight">Delivery Grid</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {classes.length} teacher{classes.length !== 1 ? "s" : ""} · lesson delivery status
        </p>
      </div>
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        {([1, 2, 3] as const).map((term) => (
          <button
            key={term}
            onClick={() => onTermChange(term)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTerm === term
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Term {term}
          </button>
        ))}
      </div>
    </div>
  );
}
