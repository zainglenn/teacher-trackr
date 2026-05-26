"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Check, ChevronDown, ChevronUp, AlertTriangle,
  Presentation, X, BookOpen, School,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { StrandBadge } from "@/components/ltp/StrandBadge";
import { supabase } from "@/lib/supabase";
import { useClasses } from "@/hooks/useClasses";
import { Standard, LessonWeek } from "@/types";
import { PptGenerationSheet } from "@/components/PptGenerationSheet";

interface ClassDelivery {
  id: string;
  class_id: string;
  unit_id: string;
  week_number: number;
  delivered_at: string;
  notes: string | null;
}

interface MasterWeek extends LessonWeek {
  unit_id: string;
  unit_title: string;
  term: number;
}

// ── Delivery hook ─────────────────────────────────────────────────────────────

function useMyClassData(teacherId: string) {
  const { classes, loading: classLoading } = useClasses(teacherId);
  const [deliveries, setDeliveries] = useState<ClassDelivery[]>([]);
  const [masterWeeks, setMasterWeeks] = useState<MasterWeek[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const myClass = classes[0] ?? null;

  const fetchData = useCallback(async () => {
    if (!myClass) { setLoadingData(false); return; }

    // Load master plan weeks if an LTP is attached
    const extClass = myClass as typeof myClass & { ltp_id?: string };
    if (extClass.ltp_id) {
      const { data: units } = await supabase
        .from("ltp_units")
        .select("id, title, term, lesson_sequence, unit_number")
        .eq("ltp_id", extClass.ltp_id)
        .order("term")
        .order("unit_number");

      const weeks: MasterWeek[] = [];
      for (const unit of units ?? []) {
        const seq: LessonWeek[] = unit.lesson_sequence ?? [];
        for (const w of seq) {
          weeks.push({ ...w, unit_id: unit.id, unit_title: unit.title, term: unit.term });
        }
      }
      setMasterWeeks(weeks);
    }

    // Load delivery records
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
    deliveries,
    loading: classLoading || loadingData,
    isDelivered,
    getDelivery,
    markTaught,
    unmarkTaught,
    saveNotes,
  };
}

// ── Lesson Week Card ──────────────────────────────────────────────────────────

interface WeekCardProps {
  week: MasterWeek;
  isCurrent: boolean;
  isPast: boolean;
  delivered: boolean;
  delivery: ClassDelivery | null;
  classId?: string;
  unitTitle: string;
  vocabulary?: string[];
  onMarkTaught: (notes?: string) => Promise<void>;
  onUnmark: () => Promise<void>;
  onSaveNotes: (notes: string) => Promise<void>;
}

function WeekCard({ week, isCurrent, isPast, delivered, delivery, classId, unitTitle, vocabulary = [], onMarkTaught, onUnmark, onSaveNotes }: WeekCardProps) {
  const [notes, setNotes] = useState(delivery?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
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

  async function handleCheck() {
    setSaving(true);
    if (delivered) {
      await onUnmark();
    } else {
      await onMarkTaught(notes || undefined);
    }
    setSaving(false);
  }

  const cardStyle: React.CSSProperties = delivered
    ? { borderColor: "var(--status-taught-border)", background: "var(--status-taught-bg)" }
    : isCurrent
    ? { borderColor: "var(--status-behind-border)", background: "var(--status-behind-bg)" }
    : isPast
    ? { opacity: 0.7 }
    : {};

  return (
    <Card className="overflow-hidden transition-all" style={cardStyle}>
      <CardContent className="p-0">
        {/* Card header */}
        <div className="flex items-start gap-3 px-4 py-3">
          {/* Checkbox */}
          <button
            onClick={handleCheck}
            disabled={saving}
            aria-label={delivered ? "Mark as not taught" : "Mark as taught"}
            className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              delivered
                ? "border-transparent"
                : "border-current"
            }`}
            style={delivered ? { background: "var(--status-taught-text)", borderColor: "var(--status-taught-text)" } : {}}
          >
            {delivered && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground">
                Week {week.week}
              </span>
              {isCurrent && !delivered && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0" style={{ background: "var(--status-behind-bg)", color: "var(--status-behind-text)", borderColor: "var(--status-behind-border)" }}>
                  Current week
                </Badge>
              )}
              {delivered && (
                <span className="text-[10px] text-muted-foreground">
                  Taught {delivery?.delivered_at
                    ? new Date(delivery.delivered_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                    : ""}
                </span>
              )}
            </div>
            <p className="text-sm font-medium leading-snug mt-0.5">{week.focus || week.unit_title}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0 mt-1">
            <button
              onClick={() => setPptOpen(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              title="Generate PPT"
            >
              <Presentation className="h-3.5 w-3.5" />
            </button>
            {delivered && (
              <button
                onClick={() => setNotesOpen((v) => !v)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 ml-1"
              >
                {notesOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Standards + activities */}
        {(week.standards.length > 0 || week.activities) && (
          <div className="px-4 pb-3 pt-0 space-y-2">
            {week.standards.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {week.standards.map((code) => (
                  <StrandBadge key={code} code={code} />
                ))}
              </div>
            )}
            {week.activities && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {week.activities}
              </p>
            )}
          </div>
        )}

        {/* Notes area — only if delivered and open */}
        {delivered && notesOpen && (
          <div className="border-t px-4 py-3">
            <Textarea
              placeholder="Add class-specific notes… (autosaves)"
              className="text-xs min-h-[80px] resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
            />
          </div>
        )}
      </CardContent>

      <PptGenerationSheet
        open={pptOpen}
        onClose={() => setPptOpen(false)}
        unitId={week.unit_id}
        unitTitle={unitTitle}
        week={week}
        classId={classId}
        vocabulary={vocabulary}
      />
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface MyClassViewProps {
  teacherId: string;
  standards: Standard[];
}

export function MyClassView({ teacherId }: MyClassViewProps) {
  const { myClass, masterWeeks, loading, isDelivered, getDelivery, markTaught, unmarkTaught, saveNotes } = useMyClassData(teacherId);
  const [activeTerm, setActiveTerm] = useState<1 | 2 | 3>(1);
  const [pastExpanded, setPastExpanded] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);

  const termWeeks = masterWeeks.filter((w) => w.term === activeTerm);
  const totalWeeks = termWeeks.length;
  const taughtCount = termWeeks.filter((w) => isDelivered(w.unit_id, w.week)).length;
  const progressPct = totalWeeks > 0 ? (taughtCount / totalWeeks) * 100 : 0;

  // Determine current week: first not-yet-delivered week
  const currentWeekIndex = termWeeks.findIndex((w) => !isDelivered(w.unit_id, w.week));
  const currentWeek = currentWeekIndex >= 0 ? termWeeks[currentWeekIndex] : null;

  const pastWeeks = termWeeks.slice(0, currentWeekIndex >= 0 ? currentWeekIndex : termWeeks.length);
  const upcomingWeeks = currentWeekIndex >= 0 ? termWeeks.slice(currentWeekIndex) : [];

  // Coverage warning: standards in this term not in any lesson week
  const coveredCodes = new Set(termWeeks.flatMap((w) => w.standards));
  const warningCount: number = coveredCodes.size > 0 ? 0 : 0; // populated when standards wired

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  // ── No class assigned ────────────────────────────────────────────────────
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

  // ── No master plan ───────────────────────────────────────────────────────
  if (!extClass.ltp_id || masterWeeks.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{myClass.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your class</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium mb-1">No master plan attached</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Your HOD needs to attach a master plan to your class before lesson weeks appear here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-0">
      {/* ── Coverage warning ───────────────────────────────────────────────── */}
      {!warningDismissed && warningCount > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 px-4 py-3 rounded-xl mb-4 text-sm"
          style={{ background: "var(--status-behind-bg)", color: "var(--status-behind-text)", border: "1px solid var(--status-behind-border)" }}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="flex-1">
            {warningCount} standard{warningCount !== 1 ? "s" : ""} have no lesson planned in Term {activeTerm}.
          </span>
          <button onClick={() => setWarningDismissed(true)} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="pb-4 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <h1 className="text-lg font-semibold tracking-tight">{myClass.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{myClass.school_year}</p>
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

      {/* ── Progress bar ──────────────────────────────────────────────────── */}
      {totalWeeks > 0 && (
        <div className="mb-5 space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Term {activeTerm} progress</span>
            <span>{taughtCount}/{totalWeeks} weeks taught</span>
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

      {/* ── No weeks for this term ────────────────────────────────────────── */}
      {totalWeeks === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No lesson weeks planned for Term {activeTerm} yet.
        </p>
      )}

      {/* ── Past weeks (collapsed) ────────────────────────────────────────── */}
      {pastWeeks.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setPastExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            {pastExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {pastWeeks.length} past week{pastWeeks.length !== 1 ? "s" : ""}
          </button>

          {pastExpanded && (
            <div className="space-y-2 mb-3 opacity-70">
              {pastWeeks.map((week) => (
                <WeekCard
                  key={`${week.unit_id}-${week.week}`}
                  week={week}
                  isCurrent={false}
                  isPast={true}
                  delivered={isDelivered(week.unit_id, week.week)}
                  delivery={getDelivery(week.unit_id, week.week)}
                  classId={myClass?.id}
                  unitTitle={week.unit_title}
                  onMarkTaught={(notes) => markTaught(week.unit_id, week.week, notes)}
                  onUnmark={() => unmarkTaught(week.unit_id, week.week)}
                  onSaveNotes={(n) => saveNotes(week.unit_id, week.week, n)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Upcoming weeks ────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {upcomingWeeks.map((week, idx) => (
          <WeekCard
            key={`${week.unit_id}-${week.week}`}
            week={week}
            isCurrent={idx === 0 && !isDelivered(week.unit_id, week.week)}
            isPast={false}
            delivered={isDelivered(week.unit_id, week.week)}
            delivery={getDelivery(week.unit_id, week.week)}
            classId={myClass?.id}
            unitTitle={week.unit_title}
            onMarkTaught={(notes) => markTaught(week.unit_id, week.week, notes)}
            onUnmark={() => unmarkTaught(week.unit_id, week.week)}
            onSaveNotes={(n) => saveNotes(week.unit_id, week.week, n)}
          />
        ))}
      </div>
    </div>
  );
}
