"use client";

import { useState } from "react";
import { Check, Clock, AlertCircle, Circle, X, ChevronRight, Grid3X3 } from "lucide-react";
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
    icon: AlertCircle,
    label: "Overdue",
    style: { background: "var(--status-overdue-bg)", color: "var(--status-overdue-text)", border: "1px solid var(--status-overdue-border)" },
    badgeStyle: { background: "var(--status-overdue-bg)", color: "var(--status-overdue-text)", borderColor: "var(--status-overdue-border)" },
  },
  behind: {
    icon: Clock,
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

function StatusCell({
  status,
  onClick,
}: {
  status: DeliveryStatus;
  onClick: () => void;
}) {
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
            <span className="font-semibold text-foreground">{cls.name}</span>
            <ChevronRight className="h-3 w-3" />
            <span>Week {week.week_number}</span>
          </div>
          <SheetTitle className="text-base leading-snug">{week.focus || week.unit_title}</SheetTitle>
          <Badge
            variant="outline"
            className="w-fit text-xs"
            style={cfg.badgeStyle}
          >
            {cfg.label}
          </Badge>
        </SheetHeader>

        <div className="py-5 space-y-5">
          {/* Teacher */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Teacher</p>
            <p className="text-sm">{cls.teacher?.full_name ?? cls.teacher?.email ?? "Unassigned"}</p>
          </div>

          {/* Delivery */}
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

          {/* Teacher notes */}
          {delivery?.notes && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Class Notes</p>
              <p className="text-sm leading-relaxed bg-muted/50 rounded-md px-3 py-2.5 border">
                {delivery.notes}
              </p>
            </div>
          )}

          {/* Standards */}
          {week.standards.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Standards</p>
              <div className="flex flex-wrap gap-1.5">
                {week.standards.map((code) => (
                  <StrandBadge key={code} code={code} />
                ))}
              </div>
            </div>
          )}

          {/* Activities */}
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
}

export function DeliveryGridView({ teacherId: _ }: DeliveryGridViewProps) {
  const { classes, weeks, loading, getCellStatus, getDelivery, overdueCount } = useDeliveryGrid();
  const [activeTerm, setActiveTerm] = useState<1 | 2 | 3>(1);
  const [sheet, setSheet] = useState<{ classId: string; unitId: string; weekNumber: number } | null>(null);
  const [dismissedBanner, setDismissedBanner] = useState(false);

  const termWeeks = weeks.filter((w) => w.term === activeTerm);

  // Group by unit for row headers
  const unitGroups = termWeeks.reduce<Record<string, GridWeek[]>>((acc, w) => {
    if (!acc[w.unit_id]) acc[w.unit_id] = [];
    acc[w.unit_id].push(w);
    return acc;
  }, {});

  // Sheet detail lookup
  const sheetClass = sheet ? classes.find((c) => c.id === sheet.classId) ?? null : null;
  const sheetWeek = sheet ? termWeeks.find((w) => w.unit_id === sheet.unitId && w.week_number === sheet.weekNumber) ?? null : null;
  const sheetStatus = sheet ? getCellStatus(sheet.classId, sheet.unitId, sheet.weekNumber) : "pending";
  const sheetDelivery = sheet && sheetClass && sheetWeek
    ? getDelivery(sheet.classId, sheet.unitId, sheet.weekNumber)
    : null;

  // Per-class delivery counts for footer
  function classDeliveredCount(classId: string) {
    return termWeeks.filter((w) => getCellStatus(classId, w.unit_id, w.week_number) === "taught").length;
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-7 gap-px mt-6">
          {Array.from({ length: 49 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-none" />
          ))}
        </div>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!classes.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
          <Grid3X3 className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-base font-semibold mb-1">No classes set up</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Create classes and attach a master plan from the Admin Panel to start tracking delivery.
        </p>
      </div>
    );
  }

  const noMasterPlan = classes.every((c) => !c.ltp_id);

  return (
    <div className="flex flex-col h-full">
      {/* ── At-risk banner ────────────────────────────────────────────────── */}
      {!dismissedBanner && overdueCount > 0 && (
        <div
          role="alert"
          className="flex items-center gap-3 px-4 py-3 text-sm font-medium border-b"
          style={{
            background: "var(--status-overdue-bg)",
            color: "var(--status-overdue-text)",
            borderColor: "var(--status-overdue-border)",
          }}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            {overdueCount} lesson week{overdueCount !== 1 ? "s" : ""} are overdue across your classes.
          </span>
          <button
            onClick={() => setDismissedBanner(true)}
            className="ml-auto hover:opacity-70 transition-opacity"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-5 pb-4 border-b flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <h1 className="text-lg font-semibold tracking-tight">Delivery Grid</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Lesson delivery status across all classes
          </p>
        </div>
        {/* Term tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
          {([1, 2, 3] as const).map((term) => (
            <button
              key={term}
              onClick={() => setActiveTerm(term)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTerm === term
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Term {term}
            </button>
          ))}
        </div>
      </div>

      {/* ── No master plan notice ─────────────────────────────────────────── */}
      {noMasterPlan && (
        <div className="px-4 sm:px-6 py-4 bg-muted/40 border-b text-sm text-muted-foreground">
          Attach a master plan to classes in the Admin Panel to populate the grid.
        </div>
      )}

      {/* ── Grid ──────────────────────────────────────────────────────────── */}
      {termWeeks.length > 0 && (
        <div className="flex-1 overflow-auto">
          {/* Mobile: card list */}
          <div className="sm:hidden divide-y">
            {classes.map((cls) => (
              <div key={cls.id} className="px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold">{cls.name}</p>
                    <p className="text-xs text-muted-foreground">{cls.teacher?.full_name ?? "Unassigned"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {classDeliveredCount(cls.id)}/{termWeeks.length} taught
                  </span>
                </div>
                <div className="space-y-1.5">
                  {termWeeks.map((week) => {
                    const st = getCellStatus(cls.id, week.unit_id, week.week_number);
                    const cfg = STATUS_CONFIG[st];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={`${week.unit_id}-${week.week_number}`}
                        onClick={() => setSheet({ classId: cls.id, unitId: week.unit_id, weekNumber: week.week_number })}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left text-xs transition-opacity hover:opacity-80"
                        style={cfg.style}
                      >
                        <Icon className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                        <span className="truncate">Week {week.week_number} — {week.focus || week.unit_title}</span>
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
                  {/* Sticky label column header */}
                  <th className="sticky left-0 z-20 bg-background border-b border-r w-44 px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Lesson Week
                  </th>
                  {/* Class column headers */}
                  {classes.map((cls) => (
                    <th
                      key={cls.id}
                      className="border-b border-r px-2 py-2.5 text-center font-medium min-w-[6rem]"
                    >
                      <p className="font-semibold text-foreground">{cls.name}</p>
                      <p className="text-muted-foreground font-normal truncate max-w-[5rem] mx-auto">
                        {cls.teacher?.full_name?.split(" ")[0] ?? "—"}
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {Object.entries(unitGroups).map(([unitId, unitWeeks]) => (
                  <>
                    {/* Unit separator row */}
                    <tr key={`unit-${unitId}`}>
                      <td
                        colSpan={classes.length + 1}
                        className="sticky left-0 bg-muted/60 border-b border-r px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
                      >
                        {unitWeeks[0].unit_title}
                      </td>
                    </tr>

                    {/* Week rows */}
                    {unitWeeks.map((week) => (
                      <tr key={`${unitId}-${week.week_number}`} className="group">
                        {/* Week label — sticky */}
                        <td className="sticky left-0 z-10 bg-background border-b border-r px-3 py-0 h-10">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground">W{week.week_number}</span>
                            <span className="text-muted-foreground truncate max-w-[7rem]">{week.focus}</span>
                          </div>
                        </td>

                        {/* Status cells */}
                        {classes.map((cls) => {
                          const st = getCellStatus(cls.id, week.unit_id, week.week_number);
                          return (
                            <td
                              key={cls.id}
                              className="border-b border-r h-10 p-0.5"
                            >
                              <StatusCell
                                status={st}
                                onClick={() => setSheet({ classId: cls.id, unitId: week.unit_id, weekNumber: week.week_number })}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}

                {/* Footer: delivery counts */}
                <tr>
                  <td className="sticky left-0 bg-background border-t px-3 py-2 text-xs font-semibold text-muted-foreground">
                    Progress
                  </td>
                  {classes.map((cls) => {
                    const delivered = classDeliveredCount(cls.id);
                    const pct = termWeeks.length > 0 ? (delivered / termWeeks.length) * 100 : 0;
                    return (
                      <td key={cls.id} className="border-t px-2 py-2 text-center">
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
      )}

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      {termWeeks.length > 0 && (
        <div className="px-4 sm:px-6 py-3 border-t flex flex-wrap gap-4">
          {(["taught", "behind", "overdue", "pending"] as DeliveryStatus[]).map((st) => {
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
      )}

      {/* ── Detail sheet ──────────────────────────────────────────────────── */}
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
