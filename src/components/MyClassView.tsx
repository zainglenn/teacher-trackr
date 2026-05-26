"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Check, ChevronDown, ChevronUp,
  Presentation, BookOpen, School, ArrowRight, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StrandBadge } from "@/components/ltp/StrandBadge";
import { supabase } from "@/lib/supabase";
import { useClasses } from "@/hooks/useClasses";
import { useIsMobile } from "@/hooks/use-mobile";
import { Standard, LessonWeek } from "@/types";
import { PptGenerationSheet } from "@/components/PptGenerationSheet";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClassDelivery {
  id: string;
  class_id: string;
  unit_id: string;
  week_number: number;
  delivered_at: string;
  notes: string | null;
}

interface UnitInfo {
  id: string;
  title: string;
  term: number;
  unit_number: number;
  assessment_type: string;
}

interface MasterWeek extends LessonWeek {
  unit_id: string;
  unit_title: string;
  term: number;
  unit_number: number;
}

// ── Data hook ─────────────────────────────────────────────────────────────────

function useMyClassData(teacherId: string) {
  const { classes, loading: classLoading } = useClasses(teacherId);
  const [deliveries, setDeliveries] = useState<ClassDelivery[]>([]);
  const [masterWeeks, setMasterWeeks] = useState<MasterWeek[]>([]);
  const [unitInfos, setUnitInfos] = useState<UnitInfo[]>([]);
  const [myPlanRole, setMyPlanRole] = useState<"contributor" | "lead" | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const myClass = classes[0] ?? null;

  const fetchData = useCallback(async () => {
    if (!myClass) { setLoadingData(false); return; }

    const extClass = myClass as typeof myClass & { ltp_id?: string };
    if (extClass.ltp_id) {
      supabase.from("ltp_members")
        .select("role")
        .eq("plan_id", extClass.ltp_id)
        .eq("teacher_id", teacherId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setMyPlanRole(data.role as "contributor" | "lead");
        });

      const { data: units } = await supabase
        .from("ltp_units")
        .select("id, title, term, lesson_sequence, unit_number, assessment_type")
        .eq("ltp_id", extClass.ltp_id)
        .order("term")
        .order("unit_number");

      const infos: UnitInfo[] = [];
      const weeks: MasterWeek[] = [];
      for (const unit of units ?? []) {
        infos.push({
          id: unit.id,
          title: unit.title,
          term: unit.term,
          unit_number: unit.unit_number,
          assessment_type: unit.assessment_type ?? "formative",
        });
        const seq: LessonWeek[] = unit.lesson_sequence ?? [];
        for (const w of seq) {
          weeks.push({ ...w, unit_id: unit.id, unit_title: unit.title, term: unit.term, unit_number: unit.unit_number });
        }
      }
      setUnitInfos(infos);
      setMasterWeeks(weeks);
    }

    const { data: deliveryRows } = await supabase
      .from("class_lesson_deliveries")
      .select("*")
      .eq("class_id", myClass.id);
    setDeliveries((deliveryRows ?? []) as ClassDelivery[]);
    setLoadingData(false);
  }, [myClass]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function isDelivered(unitId: string, weekNumber: number) {
    return deliveries.some((d) => d.unit_id === unitId && d.week_number === weekNumber);
  }

  function getDelivery(unitId: string, weekNumber: number) {
    return deliveries.find((d) => d.unit_id === unitId && d.week_number === weekNumber) ?? null;
  }

  async function markTaught(unitId: string, weekNumber: number, notes?: string) {
    if (!myClass) return;
    const { data } = await supabase
      .from("class_lesson_deliveries")
      .upsert({
        class_id: myClass.id,
        unit_id: unitId,
        week_number: weekNumber,
        delivered_at: new Date().toISOString(),
        delivered_by: teacherId,
        notes: notes ?? null,
      }, { onConflict: "class_id,unit_id,week_number" })
      .select()
      .single();
    if (data) {
      setDeliveries((prev) => {
        const filtered = prev.filter((d) => !(d.unit_id === unitId && d.week_number === weekNumber));
        return [...filtered, data as ClassDelivery];
      });
    }
  }

  async function unmarkTaught(unitId: string, weekNumber: number) {
    if (!myClass) return;
    await supabase
      .from("class_lesson_deliveries")
      .delete()
      .eq("class_id", myClass.id)
      .eq("unit_id", unitId)
      .eq("week_number", weekNumber);
    setDeliveries((prev) => prev.filter((d) => !(d.unit_id === unitId && d.week_number === weekNumber)));
  }

  async function saveNotes(unitId: string, weekNumber: number, notes: string) {
    if (!myClass) return;
    await supabase
      .from("class_lesson_deliveries")
      .update({ notes })
      .eq("class_id", myClass.id)
      .eq("unit_id", unitId)
      .eq("week_number", weekNumber);
    setDeliveries((prev) =>
      prev.map((d) =>
        d.unit_id === unitId && d.week_number === weekNumber ? { ...d, notes } : d
      )
    );
  }

  return {
    myClass,
    masterWeeks,
    unitInfos,
    deliveries,
    myPlanRole,
    loading: classLoading || loadingData,
    isDelivered,
    getDelivery,
    markTaught,
    unmarkTaught,
    saveNotes,
  };
}

// ── WeekChip ──────────────────────────────────────────────────────────────────

interface WeekChipProps {
  week: MasterWeek;
  delivered: boolean;
  isCurrent: boolean;
  onOpen: () => void;
  onQuickMark: () => Promise<void>;
}

function WeekChip({ week, delivered, isCurrent, onOpen, onQuickMark }: WeekChipProps) {
  const [saving, setSaving] = useState(false);

  async function handleCheckClick(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
    setSaving(true);
    await onQuickMark();
    setSaving(false);
  }

  const termVar = `var(--term-${week.term}-accent)`;

  const chipStyle: React.CSSProperties = delivered
    ? {
        background: "var(--status-taught-bg)",
        borderColor: "var(--status-taught-border)",
        borderLeftColor: "var(--status-taught-text)",
        borderLeftWidth: 3,
      }
    : isCurrent
    ? {
        background: "var(--status-behind-bg)",
        borderColor: "var(--status-behind-border)",
        borderLeftColor: "var(--status-behind-text)",
        borderLeftWidth: 3,
      }
    : {
        borderLeftColor: termVar,
        borderLeftWidth: 3,
      };

  return (
    <button
      onClick={onOpen}
      className="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all duration-150 hover:shadow-sm active:scale-[0.98] flex-1 min-w-[150px] group"
      style={chipStyle}
    >
      {/* Check circle */}
      <span
        role="checkbox"
        aria-checked={delivered}
        aria-label={`Mark Week ${week.week} as ${delivered ? "not taught" : "taught"}`}
        tabIndex={0}
        onClick={handleCheckClick}
        onKeyDown={(e) => (e.key === " " || e.key === "Enter") && handleCheckClick(e)}
        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
          delivered
            ? "border-transparent"
            : isCurrent
            ? "border-current opacity-70 group-hover:opacity-100"
            : "border-muted-foreground/30 group-hover:border-muted-foreground/60"
        }`}
        style={
          delivered
            ? { background: "var(--status-taught-text)", borderColor: "var(--status-taught-text)" }
            : saving
            ? { borderColor: "var(--muted-foreground)" }
            : {}
        }
      >
        {delivered && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
        {saving && !delivered && (
          <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse" />
        )}
      </span>

      {/* Label */}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wide leading-none mb-0.5"
          style={{
            color: delivered
              ? "var(--status-taught-text)"
              : isCurrent
              ? "var(--status-behind-text)"
              : "var(--muted-foreground)",
            opacity: delivered || isCurrent ? 1 : 0.7,
          }}
        >
          Wk {week.week}
        </p>
        <p className="text-xs font-medium leading-snug truncate"
          style={{
            color: delivered
              ? "var(--status-taught-text)"
              : isCurrent
              ? "var(--status-behind-text)"
              : "var(--foreground)",
            opacity: delivered ? 0.85 : 1,
          }}
        >
          {week.focus || week.unit_title}
        </p>
      </div>
    </button>
  );
}

// ── WeekDetailSheet ───────────────────────────────────────────────────────────

interface WeekDetailSheetProps {
  week: MasterWeek | null;
  open: boolean;
  onClose: () => void;
  delivered: boolean;
  delivery: ClassDelivery | null;
  classId?: string;
  canEditUnit: boolean;
  onMarkTaught: (notes?: string) => Promise<void>;
  onUnmark: () => Promise<void>;
  onSaveNotes: (notes: string) => Promise<void>;
  onEditUnit?: () => void;
}

function WeekDetailSheet({
  week, open, onClose, delivered, delivery, classId,
  canEditUnit, onMarkTaught, onUnmark, onSaveNotes, onEditUnit,
}: WeekDetailSheetProps) {
  const [notes, setNotes] = useState(delivery?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [pptOpen, setPptOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setNotes(delivery?.notes ?? ""); }, [delivery?.notes]);

  function handleNotesChange(val: string) {
    setNotes(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (delivered) onSaveNotes(val);
    }, 600);
  }

  async function handleToggleTaught() {
    setSaving(true);
    if (delivered) {
      await onUnmark();
    } else {
      await onMarkTaught(notes || undefined);
      onClose();
    }
    setSaving(false);
  }

  const isMobile = useIsMobile();

  if (!week) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={`flex flex-col gap-0 p-0 overflow-hidden ${isMobile ? "max-h-[88vh] rounded-t-2xl" : "w-full sm:max-w-[420px]"}`}
        >
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/60 shrink-0">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              {week.unit_title} · Week {week.week}
            </p>
            <SheetTitle className="text-base font-semibold leading-snug mt-0.5">
              {week.focus || week.unit_title}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            {/* Mark taught */}
            <button
              onClick={handleToggleTaught}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-60"
              style={
                delivered
                  ? {
                      background: "var(--status-taught-bg)",
                      color: "var(--status-taught-text)",
                      border: "1px solid var(--status-taught-border)",
                    }
                  : {
                      background: "var(--status-taught-text)",
                      color: "#fff",
                    }
              }
            >
              {delivered ? (
                <><X className="h-4 w-4" /> {saving ? "Unmarking…" : "Taught — tap to undo"}</>
              ) : (
                <><Check className="h-4 w-4" /> {saving ? "Marking…" : "Mark as Taught"}</>
              )}
            </button>

            {/* Standards */}
            {week.standards.length > 0 && (
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Standards
                </p>
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
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Activities
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">{week.activities}</p>
              </div>
            )}

            {/* Notes — only when taught */}
            {delivered && (
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Class Notes
                </p>
                <Textarea
                  placeholder="Notes from this lesson… (autosaves)"
                  className="text-sm min-h-[90px] resize-none bg-muted/30 border-border/60 focus-visible:ring-ring/40"
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                />
                {delivery?.delivered_at && (
                  <p className="text-[11px] text-muted-foreground/60 mt-1.5">
                    Taught {new Date(delivery.delivered_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setPptOpen(true)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg bg-muted/60 hover:bg-muted"
              >
                <Presentation className="h-3.5 w-3.5" />
                Generate PPT
              </button>
              {canEditUnit && onEditUnit && (
                <button
                  onClick={() => { onEditUnit(); onClose(); }}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg bg-muted/60 hover:bg-muted"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  View unit plan
                </button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <PptGenerationSheet
        open={pptOpen}
        onClose={() => setPptOpen(false)}
        unitId={week.unit_id}
        unitTitle={week.unit_title}
        week={week}
        classId={classId}
        vocabulary={[]}
      />
    </>
  );
}

// ── UnitLane ──────────────────────────────────────────────────────────────────

type UnitState = "completed" | "active" | "upcoming";

interface UnitLaneProps {
  unit: UnitInfo;
  weeks: MasterWeek[];
  unitState: UnitState;
  taughtCount: number;
  isDelivered: (unitId: string, week: number) => boolean;
  getDelivery: (unitId: string, week: number) => ClassDelivery | null;
  markTaught: (unitId: string, week: number, notes?: string) => Promise<void>;
  unmarkTaught: (unitId: string, week: number) => Promise<void>;
  saveNotes: (unitId: string, week: number, notes: string) => Promise<void>;
  classId?: string;
  canEditUnit: boolean;
  onEditUnit?: (unitId: string) => void;
}

function UnitLane({
  unit, weeks, unitState, taughtCount,
  isDelivered, getDelivery, markTaught, unmarkTaught, saveNotes,
  classId, canEditUnit, onEditUnit,
}: UnitLaneProps) {
  const [expanded, setExpanded] = useState(unitState === "active");
  const [selectedWeek, setSelectedWeek] = useState<MasterWeek | null>(null);
  const chipRowId = `unit-chips-${unit.id}`;

  const currentWeekIndex = weeks.findIndex((w) => !isDelivered(unit.id, w.week));

  const assessmentLabel =
    unit.assessment_type === "summative"
      ? "Summative"
      : unit.assessment_type === "both"
      ? "Form + Sum"
      : "Formative";

  const headerStyle: React.CSSProperties =
    unitState === "completed"
      ? {
          background: "var(--status-taught-bg)",
          borderBottomColor: expanded ? "var(--status-taught-border)" : "transparent",
        }
      : {};

  const laneStyle: React.CSSProperties =
    unitState === "upcoming"
      ? { opacity: "var(--lane-upcoming-opacity)" }
      : {};

  const borderStyle: React.CSSProperties =
    unitState === "completed"
      ? { borderColor: "var(--status-taught-border)" }
      : {};

  return (
    <div
      className="rounded-xl border bg-card overflow-hidden transition-shadow duration-150 hover:shadow-sm"
      style={{ ...borderStyle, ...laneStyle }}
    >
      {/* Lane header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={chipRowId}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-muted/30"
        style={headerStyle}
      >
        {/* Completed check icon */}
        {unitState === "completed" && (
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--status-taught-text)" }}
          >
            <Check className="h-3 w-3 text-white" strokeWidth={3} />
          </span>
        )}

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground shrink-0">
            Unit {unit.unit_number}
          </span>
          <span className="text-sm font-semibold truncate">{unit.title}</span>
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 shrink-0 font-normal text-muted-foreground hidden sm:inline-flex"
          >
            {assessmentLabel}
          </Badge>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-xs font-medium tabular-nums"
            style={
              unitState === "completed"
                ? { color: "var(--status-taught-text)" }
                : { color: "var(--muted-foreground)" }
            }
          >
            {taughtCount}/{weeks.length}
          </span>
          {expanded
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
          }
        </div>
      </button>

      {/* Chip row */}
      {expanded && (
        <div
          id={chipRowId}
          className="px-4 pb-4 pt-3 border-t border-border/40"
        >
          <div className="flex gap-2 flex-wrap">
            {weeks.map((week) => {
              const delivered = isDelivered(unit.id, week.week);
              const isCurrent = unitState === "active" && currentWeekIndex >= 0 && weeks[currentWeekIndex]?.week === week.week;
              return (
                <WeekChip
                  key={week.week}
                  week={week}
                  delivered={delivered}
                  isCurrent={isCurrent}
                  onOpen={() => setSelectedWeek(week)}
                  onQuickMark={async () => {
                    if (delivered) await unmarkTaught(unit.id, week.week);
                    else await markTaught(unit.id, week.week);
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Week detail sheet */}
      <WeekDetailSheet
        week={selectedWeek}
        open={!!selectedWeek}
        onClose={() => setSelectedWeek(null)}
        delivered={selectedWeek ? isDelivered(unit.id, selectedWeek.week) : false}
        delivery={selectedWeek ? getDelivery(unit.id, selectedWeek.week) : null}
        classId={classId}
        canEditUnit={canEditUnit}
        onMarkTaught={(notes) => markTaught(unit.id, selectedWeek!.week, notes)}
        onUnmark={() => unmarkTaught(unit.id, selectedWeek!.week)}
        onSaveNotes={(n) => saveNotes(unit.id, selectedWeek!.week, n)}
        onEditUnit={onEditUnit ? () => onEditUnit(unit.id) : undefined}
      />
    </div>
  );
}

// ── Main View ─────────────────────────────────────────────────────────────────

interface MyClassViewProps {
  teacherId: string;
  standards: Standard[];
  onNavigateToUnit?: (planId: string, unitId: string) => void;
}

export function MyClassView({ teacherId, onNavigateToUnit }: MyClassViewProps) {
  const {
    myClass, masterWeeks, unitInfos, myPlanRole, loading,
    isDelivered, getDelivery, markTaught, unmarkTaught, saveNotes,
  } = useMyClassData(teacherId);
  const canEditUnit = myPlanRole === "lead";
  const [activeTerm, setActiveTerm] = useState<1 | 2 | 3>(1);

  const termUnitInfos = unitInfos.filter((u) => u.term === activeTerm);
  const termWeeks = masterWeeks.filter((w) => w.term === activeTerm);
  const totalWeeks = termWeeks.length;
  const taughtCount = termWeeks.filter((w) => isDelivered(w.unit_id, w.week)).length;
  const progressPct = totalWeeks > 0 ? (taughtCount / totalWeeks) * 100 : 0;

  function getUnitState(unit: UnitInfo): UnitState {
    const unitWeeks = masterWeeks.filter((w) => w.unit_id === unit.id);
    if (unitWeeks.length === 0) return "upcoming";
    if (unitWeeks.every((w) => isDelivered(unit.id, w.week))) return "completed";
    // Active = first non-completed unit in this term (all prior units are completed)
    const priorUnitsAllDone = termUnitInfos
      .filter((u) => u.unit_number < unit.unit_number)
      .every((u) => {
        const uw = masterWeeks.filter((w) => w.unit_id === u.id);
        return uw.length > 0 && uw.every((w) => isDelivered(u.id, w.week));
      });
    return priorUnitsAllDone ? "active" : "upcoming";
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-5">
        <div className="space-y-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-8 w-48 rounded-lg" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // ── No class ───────────────────────────────────────────────────────────────
  if (!myClass) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
          <School className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-base font-semibold mb-1">No class assigned yet</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Your HOD will assign you a class and master plan. Check back soon.
        </p>
      </div>
    );
  }

  const extClass = myClass as typeof myClass & { ltp_id?: string };
  const extClass2 = myClass as typeof myClass & { subject?: string; grade?: string };
  const classSubject = extClass2.subject ?? "English";
  const classGrade = extClass2.grade ?? "";
  const classLabel = [classGrade, classSubject].filter(Boolean).join(" · ") || myClass.school_year;

  // ── No master plan ─────────────────────────────────────────────────────────
  if (!extClass.ltp_id || masterWeeks.length === 0) {
    return (
      <div className="max-w-lg space-y-5">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{myClass.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{classLabel}</p>
        </div>
        <div className="rounded-xl border bg-card p-12 flex flex-col items-center text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium mb-1">No master plan attached</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Your HOD needs to attach a master plan to your class before lesson weeks appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">{myClass.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{classLabel}</p>
        </div>

        {/* Term tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit shrink-0">
          {([1, 2, 3] as const).map((term) => (
            <button
              key={term}
              onClick={() => setActiveTerm(term)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 ${
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

      {/* Term progress bar */}
      {totalWeeks > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Term {activeTerm} progress</span>
            <span className="tabular-nums">{taughtCount}/{totalWeeks} weeks taught</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: progressPct === 100
                  ? "var(--status-taught-text)"
                  : "var(--strand-sl-accent)",
              }}
            />
          </div>
        </div>
      )}

      {/* Empty term */}
      {termUnitInfos.length === 0 && (
        <p className="text-sm text-muted-foreground py-10 text-center">
          No units planned for Term {activeTerm} yet.
        </p>
      )}

      {/* Unit swim lanes */}
      <div className="space-y-3">
        {termUnitInfos.map((unit) => {
          const unitWeeks = masterWeeks.filter((w) => w.unit_id === unit.id);
          const unitTaught = unitWeeks.filter((w) => isDelivered(unit.id, w.week)).length;
          const unitState = getUnitState(unit);

          return (
            <UnitLane
              key={unit.id}
              unit={unit}
              weeks={unitWeeks}
              unitState={unitState}
              taughtCount={unitTaught}
              isDelivered={isDelivered}
              getDelivery={getDelivery}
              markTaught={markTaught}
              unmarkTaught={unmarkTaught}
              saveNotes={saveNotes}
              classId={myClass.id}
              canEditUnit={canEditUnit}
              onEditUnit={
                onNavigateToUnit
                  ? (unitId) => onNavigateToUnit(extClass.ltp_id ?? "", unitId)
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
