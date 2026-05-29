"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Modal, ModalFooter, ModalCancel, ConfirmModal } from "@/components/ui/modal";
import {
  ArrowLeft, Sparkles, Loader2, Save, UserCircle2, ChevronDown, ChevronUp, Plus, X,
  AlertTriangle, Send, Check, RotateCcw, Clock, FileText, BookOpen, Video, Lock,
  Target, CheckCircle2, Circle, Wand2, Pencil, ClipboardList, Globe, Star,
} from "lucide-react";
import { LongTermPlan, LTPUnit, Standard, AssessmentRow, LessonWeek, AnchorText, StandardAssessment } from "@/types";
import { supabase } from "@/lib/supabase";
import { useDeliveryLog } from "@/hooks/useDeliveryLog";
import { STRAND_COLORS, strandFromCode } from "@/components/ltp/StrandBadge";
import { UNIT_STATUS_CONFIG } from "@/lib/ltpStatus";

interface SuggestedStandard { code: string; standardId: string; reason: string; }

interface UnitPlanViewProps {
  plan: LongTermPlan;
  unit: LTPUnit;
  standards: Standard[];
  currentUserId: string;
  isHod: boolean;
  canEdit?: boolean;
  onBack: () => void;
  updateUnit: (unitId: string, updates: Partial<Omit<LTPUnit, "id" | "ltp_id" | "created_at" | "standards">>) => Promise<void>;
  setUnitStandards: (unitId: string, standardIds: string[]) => Promise<void>;
  submitUnit?: (unitId: string, planId: string) => Promise<void>;
  withdrawUnit?: (unitId: string, planId: string) => Promise<void>;
  approveUnit?: (unitId: string, planId: string) => Promise<void>;
  requestUnitRevision?: (unitId: string, planId: string, feedback: string) => Promise<void>;
  reopenUnit?: (unitId: string, planId: string) => Promise<void>;
}

const ASSESSMENT_OPTIONS = [
  { value: "formative", label: "Formative" },
  { value: "summative", label: "Summative" },
  { value: "both", label: "Both" },
];

const STRAND_ORDER = ["RL", "RI", "W", "SL", "L"];

const STRAND_THEME: Record<string, { item: string; text: string; count: string }> = {
  RL: { item: "bg-blue-50 border-blue-200",         text: "text-blue-700",    count: "text-blue-600" },
  RI: { item: "bg-violet-50 border-violet-200",      text: "text-violet-700",  count: "text-violet-600" },
  W:  { item: "bg-amber-50 border-amber-200",        text: "text-amber-700",   count: "text-amber-600" },
  SL: { item: "bg-emerald-50 border-emerald-200",    text: "text-emerald-700", count: "text-emerald-600" },
  L:  { item: "bg-rose-50 border-rose-200",          text: "text-rose-700",    count: "text-rose-600" },
};
const STRAND_THEME_DEFAULT = { item: "bg-muted/30 border-muted", text: "text-muted-foreground", count: "text-muted-foreground" };

const ASSESSMENT_TYPE_COLORS: Record<string, string> = {
  Diagnostic:     "bg-violet-100 text-violet-700",
  Formative:      "bg-blue-100 text-blue-700",
  Checkpoint:     "bg-amber-100 text-amber-700",
  "Checkpoint 1": "bg-amber-100 text-amber-700",
  "Checkpoint 2": "bg-amber-100 text-amber-700",
  Summative:      "bg-emerald-100 text-emerald-700",
};

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground/60 italic">{text}</p>;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">{children}</p>;
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground border-b pb-2">{title}</h3>
      {children}
    </div>
  );
}

// Inline editable list — for use inside the Edit form only
function EditableList({
  items,
  onChange,
  placeholder = "Add item…",
  prefix,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  prefix?: string;
}) {
  const [adding, setAdding] = useState("");

  function commit() {
    if (adding.trim()) { onChange([...items, adding.trim()]); setAdding(""); }
  }

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 group rounded-md border bg-muted/20 px-3 py-1.5">
          {prefix && <span className="text-xs text-muted-foreground shrink-0">{prefix}</span>}
          <input
            value={item}
            onChange={e => { const n = [...items]; n[i] = e.target.value; onChange(n); }}
            className="flex-1 text-sm bg-transparent outline-none min-w-0"
          />
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="text-muted-foreground/40 hover:text-rose-500 transition-colors shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-1.5 text-muted-foreground/60 hover:border-muted-foreground/40 transition-colors">
        {prefix && <span className="text-xs shrink-0">{prefix}</span>}
        <input
          value={adding}
          onChange={e => setAdding(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
          onBlur={commit}
          placeholder={placeholder}
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/50 placeholder:italic"
        />
        <Plus className="h-3.5 w-3.5 shrink-0" />
      </div>
    </div>
  );
}

export function UnitPlanView({
  plan, unit, standards, currentUserId, isHod, canEdit: canEditProp,
  onBack, updateUnit, setUnitStandards,
  submitUnit, withdrawUnit, approveUnit, requestUnitRevision, reopenUnit,
}: UnitPlanViewProps) {
  // canEditProp is passed from LongTermPlanView based on membership role.
  // Fall back to old assigned_to logic if prop not provided.
  const isOwner = unit.assigned_to === currentUserId;
  const canEdit = canEditProp !== undefined
    ? canEditProp && (unit.status === "draft" || unit.status === "revision")
    : !isHod && isOwner && (unit.status === "draft" || unit.status === "revision");

  const [tab, setTab] = useState<"view" | "edit">("view");

  // Delivery logging (teachers only)
  const canLogDelivery = !isHod;
  const { deliveredWeeks, toggling: deliveryToggling, toggle: toggleDelivery } = useDeliveryLog(
    canLogDelivery ? currentUserId : null,
    unit.id
  );

  // Edit form state
  const [title, setTitle] = useState(unit.title);
  const [bigIdea, setBigIdea] = useState(unit.big_idea ?? "");
  const [startWeek, setStartWeek] = useState(unit.start_week?.toString() ?? "");
  const [durationWeeks, setDurationWeeks] = useState(unit.duration_weeks.toString());
  const [assessmentType, setAssessmentType] = useState(unit.assessment_type);
  const [bigIdeas, setBigIdeas] = useState<string[]>(unit.big_ideas ?? []);
  const [enduringUnderstandings, setEnduringUnderstandings] = useState<string[]>(unit.enduring_understandings ?? []);
  const [realWorldConnections, setRealWorldConnections] = useState(unit.real_world_connections ?? "");
  const [learningOutcomes, setLearningOutcomes] = useState<string[]>(unit.learning_outcomes ?? []);
  const [successCriteria, setSuccessCriteria] = useState<string[]>(unit.success_criteria ?? []);
  const [assessmentPlan, setAssessmentPlan] = useState<AssessmentRow[]>(unit.assessment_plan ?? []);
  const [lessonSequence, setLessonSequence] = useState<LessonWeek[]>(unit.lesson_sequence ?? []);
  const [anchorTexts, setAnchorTexts] = useState<string[]>(unit.anchor_texts ?? []);
  const [mentorTexts, setMentorTexts] = useState<string[]>(unit.mentor_texts ?? []);
  const [multimedia, setMultimedia] = useState<string[]>(unit.multimedia ?? []);
  const [vocabulary, setVocabulary] = useState<string[]>(unit.vocabulary ?? []);
  const [diffEll, setDiffEll] = useState<string[]>(unit.diff_ell ?? []);
  const [diffIntervention, setDiffIntervention] = useState<string[]>(unit.diff_intervention ?? []);
  const [diffEnrichment, setDiffEnrichment] = useState<string[]>(unit.diff_enrichment ?? []);
  const [diffAccessibility, setDiffAccessibility] = useState<string[]>(unit.diff_accessibility ?? []);
  const [finalProduct, setFinalProduct] = useState(unit.final_product ?? "");
  const [teacherReflection, setTeacherReflection] = useState(unit.teacher_reflection ?? "");
  const [studentSelfAssessment, setStudentSelfAssessment] = useState(unit.student_self_assessment ?? "");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(unit.standards?.map(s => s.id) ?? []));
  const [priorityIds, setPriorityIds] = useState<Set<string>>(new Set(unit.standards?.filter(s => s.is_priority).map(s => s.id) ?? []));
  const [anchorTextDetails, setAnchorTextDetails] = useState<AnchorText[]>(unit.anchor_text_details ?? []);

  // UI state
  const [saving, setSaving] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestedStandard[]>([]);
  const [coverageNote, setCoverageNote] = useState("");
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set());
  const [collapsedStrands, setCollapsedStrands] = useState<Set<string>>(new Set());

  // Workflow modals
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [withdrawConfirmOpen, setWithdrawConfirmOpen] = useState(false);
  const [hodRevisionDialogOpen, setHodRevisionDialogOpen] = useState(false);
  const [hodRevisionFeedback, setHodRevisionFeedback] = useState("");
  const [actionSaving, setActionSaving] = useState(false);

  // Assessment row modal
  const [assessRowModal, setAssessRowModal] = useState<{ open: boolean; row: AssessmentRow | null }>({ open: false, row: null });
  const [assessRowDraft, setAssessRowDraft] = useState<AssessmentRow>({ id: "", type: "Formative", when: "", assessment: "", purpose: "", tool: "" });

  // Lesson week modal
  const [weekModal, setWeekModal] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });
  const [weekDraft, setWeekDraft] = useState<LessonWeek & { standardsText: string }>({ week: 1, focus: "", activities: "", standards: [], standardsText: "" });

  function resetEditState() {
    setTitle(unit.title);
    setBigIdea(unit.big_idea ?? "");
    setStartWeek(unit.start_week?.toString() ?? "");
    setDurationWeeks(unit.duration_weeks.toString());
    setAssessmentType(unit.assessment_type);
    setBigIdeas(unit.big_ideas ?? []);
    setEnduringUnderstandings(unit.enduring_understandings ?? []);
    setRealWorldConnections(unit.real_world_connections ?? "");
    setLearningOutcomes(unit.learning_outcomes ?? []);
    setSuccessCriteria(unit.success_criteria ?? []);
    setAssessmentPlan(unit.assessment_plan ?? []);
    setLessonSequence(unit.lesson_sequence ?? []);
    setAnchorTexts(unit.anchor_texts ?? []);
    setMentorTexts(unit.mentor_texts ?? []);
    setMultimedia(unit.multimedia ?? []);
    setVocabulary(unit.vocabulary ?? []);
    setDiffEll(unit.diff_ell ?? []);
    setDiffIntervention(unit.diff_intervention ?? []);
    setDiffEnrichment(unit.diff_enrichment ?? []);
    setDiffAccessibility(unit.diff_accessibility ?? []);
    setFinalProduct(unit.final_product ?? "");
    setTeacherReflection(unit.teacher_reflection ?? "");
    setStudentSelfAssessment(unit.student_self_assessment ?? "");
    setSelectedIds(new Set(unit.standards?.map(s => s.id) ?? []));
    setPriorityIds(new Set(unit.standards?.filter(s => s.is_priority).map(s => s.id) ?? []));
    setAnchorTextDetails(unit.anchor_text_details ?? []);
    setSuggestions([]);
    setAcceptedSuggestions(new Set());
    setCollapsedStrands(new Set());
  }

  useEffect(() => {
    resetEditState();
    setTab("view");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit.id]);

  function togglePriority(standardId: string) {
    setPriorityIds(prev => {
      const n = new Set(prev);
      n.has(standardId) ? n.delete(standardId) : n.add(standardId);
      return n;
    });
  }

  async function savePriorities() {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const originalPriorityIds = new Set(unit.standards?.filter(s => s.is_priority).map(s => s.id) ?? []);
    const allSelected = [...selectedIds];
    const toUpdate = allSelected.filter(id => {
      const wasP = originalPriorityIds.has(id);
      const isP = priorityIds.has(id);
      return wasP !== isP;
    });
    await Promise.all(toUpdate.map(standardId =>
      fetch("/api/admin/set-standard-priority", {
        method: "POST",
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ unitId: unit.id, standardId, isPriority: priorityIds.has(standardId) }),
      })
    ));
  }

  async function handleSave() {
    setSaving(true);
    await updateUnit(unit.id, {
      title: title.trim(),
      big_idea: bigIdea.trim() || null,
      start_week: startWeek ? parseInt(startWeek) : null,
      duration_weeks: parseInt(durationWeeks) || unit.duration_weeks,
      assessment_type: assessmentType as "formative" | "summative" | "both",
      big_ideas: bigIdeas.length ? bigIdeas : null,
      enduring_understandings: enduringUnderstandings.length ? enduringUnderstandings : null,
      real_world_connections: realWorldConnections.trim() || null,
      learning_outcomes: learningOutcomes.length ? learningOutcomes : null,
      success_criteria: successCriteria.length ? successCriteria : null,
      assessment_plan: assessmentPlan.length ? assessmentPlan : null,
      lesson_sequence: lessonSequence.length ? lessonSequence : null,
      anchor_texts: anchorTexts.length ? anchorTexts : null,
      mentor_texts: mentorTexts.length ? mentorTexts : null,
      multimedia: multimedia.length ? multimedia : null,
      vocabulary: vocabulary.length ? vocabulary : null,
      diff_ell: diffEll.length ? diffEll : null,
      diff_intervention: diffIntervention.length ? diffIntervention : null,
      diff_enrichment: diffEnrichment.length ? diffEnrichment : null,
      diff_accessibility: diffAccessibility.length ? diffAccessibility : null,
      final_product: finalProduct.trim() || null,
      teacher_reflection: teacherReflection.trim() || null,
      student_self_assessment: studentSelfAssessment.trim() || null,
      anchor_text_details: anchorTextDetails.length ? anchorTextDetails : null,
    });
    await setUnitStandards(unit.id, [...selectedIds]);
    await savePriorities();
    setSaving(false);
    setTab("view");
  }

  async function handleAIDraft() {
    setAiDrafting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const unitStandards = standards.filter(s => selectedIds.has(s.id));
      const res = await fetch("/api/ai/draft-unit-content", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          unitTitle: title, bigIdea, term: unit.term,
          durationWeeks: parseInt(durationWeeks) || unit.duration_weeks,
          assessmentType,
          standards: unitStandards.map(s => ({ code: s.code, strand: s.strand, description: s.description })),
        }),
      });
      const json = await res.json();
      if (json.error) return;
      if (json.big_ideas?.length) setBigIdeas(json.big_ideas);
      if (json.enduring_understandings?.length) setEnduringUnderstandings(json.enduring_understandings);
      if (json.real_world_connections) setRealWorldConnections(json.real_world_connections);
      if (json.learning_outcomes?.length) setLearningOutcomes(json.learning_outcomes);
      if (json.success_criteria?.length) setSuccessCriteria(json.success_criteria);
      if (json.assessment_plan?.length) setAssessmentPlan(json.assessment_plan);
      if (json.lesson_sequence?.length) setLessonSequence(json.lesson_sequence);
      if (json.anchor_texts?.length) setAnchorTexts(json.anchor_texts);
      if (json.mentor_texts?.length) setMentorTexts(json.mentor_texts);
      if (json.multimedia?.length) setMultimedia(json.multimedia);
      if (json.vocabulary?.length) setVocabulary(json.vocabulary);
      if (json.diff_ell?.length) setDiffEll(json.diff_ell);
      if (json.diff_intervention?.length) setDiffIntervention(json.diff_intervention);
      if (json.diff_enrichment?.length) setDiffEnrichment(json.diff_enrichment);
      if (json.diff_accessibility?.length) setDiffAccessibility(json.diff_accessibility);
      if (json.final_product) setFinalProduct(json.final_product);
    } finally {
      setAiDrafting(false);
    }
  }

  async function handleSubmitUnit() {
    if (!submitUnit) return;
    setActionSaving(true); await submitUnit(unit.id, plan.id);
    setActionSaving(false); setSubmitDialogOpen(false);
  }

  async function handleWithdrawUnit() {
    if (!withdrawUnit) return;
    setActionSaving(true); await withdrawUnit(unit.id, plan.id);
    setActionSaving(false); setWithdrawConfirmOpen(false);
  }

  async function handleApprove() {
    if (!approveUnit) return;
    setActionSaving(true); await approveUnit(unit.id, plan.id); setActionSaving(false);
  }

  async function handleReopen() {
    if (!reopenUnit) return;
    setActionSaving(true); await reopenUnit(unit.id, plan.id); setActionSaving(false);
  }

  async function handleHodRevision() {
    if (!requestUnitRevision || !hodRevisionFeedback.trim()) return;
    setActionSaving(true);
    await requestUnitRevision(unit.id, plan.id, hodRevisionFeedback.trim());
    setActionSaving(false); setHodRevisionDialogOpen(false); setHodRevisionFeedback("");
  }

  async function handleSuggest() {
    setSuggesting(true); setSuggestions([]); setSuggestError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const selectedCodes = standards.filter(s => selectedIds.has(s.id)).map(s => s.code);
      const allMappedIds = new Set(plan.units?.filter(u => u.id !== unit.id).flatMap(u => u.standards?.map(s => s.id) ?? []) ?? []);
      const uncoveredCodes = standards.filter(s => !allMappedIds.has(s.id) && !selectedIds.has(s.id)).map(s => s.code);
      const res = await fetch("/api/ai/suggest-standards", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          unitTitle: title, bigIdea, term: unit.term,
          selectedStandardCodes: selectedCodes,
          allStandards: standards.map(s => ({ id: s.id, code: s.code, strand: s.strand, description: s.description })),
          uncoveredCodes,
        }),
      });
      const json = await res.json();
      if (json.error) { setSuggestError(json.error); }
      else if (json.suggestions?.length) {
        setSuggestions(json.suggestions); setCoverageNote(json.coverageNote ?? "");
        setAcceptedSuggestions(new Set(json.suggestions.map((s: SuggestedStandard) => s.standardId)));
      } else { setSuggestError("No suggestions returned — try adding a title and essential question first."); }
    } catch { setSuggestError("Failed to reach AI service."); }
    finally { setSuggesting(false); }
  }

  function applyAccepted() {
    setSelectedIds(prev => {
      const n = new Set(prev);
      suggestions.filter(s => acceptedSuggestions.has(s.standardId)).forEach(s => n.add(s.standardId));
      return n;
    });
    setSuggestions([]); setAcceptedSuggestions(new Set());
  }

  // Assessment helpers
  function openAddAssessRow() {
    setAssessRowDraft({ id: Date.now().toString(), type: "Formative", when: "", assessment: "", purpose: "", tool: "" });
    setAssessRowModal({ open: true, row: null });
  }
  function openEditAssessRow(row: AssessmentRow) {
    setAssessRowDraft({ ...row }); setAssessRowModal({ open: true, row });
  }
  function saveAssessRow() {
    if (assessRowModal.row) setAssessmentPlan(p => p.map(r => r.id === assessRowModal.row!.id ? assessRowDraft : r));
    else setAssessmentPlan(p => [...p, assessRowDraft]);
    setAssessRowModal({ open: false, row: null });
  }

  // Week helpers
  function openAddWeek() {
    setWeekDraft({ week: lessonSequence.length + 1, focus: "", activities: "", standards: [], standardsText: "" });
    setWeekModal({ open: true, index: null });
  }
  function openEditWeek(i: number) {
    const w = lessonSequence[i]; setWeekDraft({ ...w, standardsText: w.standards.join(", ") });
    setWeekModal({ open: true, index: i });
  }
  function saveWeek() {
    const { standardsText, ...rest } = weekDraft;
    const row = { ...rest, standards: standardsText.split(",").map(s => s.trim()).filter(Boolean) };
    if (weekModal.index !== null) setLessonSequence(p => p.map((w, i) => i === weekModal.index ? row : w));
    else setLessonSequence(p => [...p, row]);
    setWeekModal({ open: false, index: null });
  }

  const statusCfg = UNIT_STATUS_CONFIG[unit.status];
  const strands = [...new Set(standards.map(s => s.strand))];

  const viewStandards = (unit.standards ?? []).slice().sort((a, b) => {
    const ai = STRAND_ORDER.indexOf(strandFromCode(a.code));
    const bi = STRAND_ORDER.indexOf(strandFromCode(b.code));
    return ai !== bi ? ai - bi : a.code.localeCompare(b.code);
  });

  const editStandards = standards.filter(s => selectedIds.has(s.id)).sort((a, b) => {
    const ai = STRAND_ORDER.indexOf(strandFromCode(a.code));
    const bi = STRAND_ORDER.indexOf(strandFromCode(b.code));
    return ai !== bi ? ai - bi : a.code.localeCompare(b.code);
  });

  const canSubmitUnit = !isHod && isOwner && (unit.status === "draft" || unit.status === "revision") && !!submitUnit;
  const canWithdraw = !isHod && isOwner && unit.status === "submitted" && unit.reviewed_at === null && !!withdrawUnit;

  return (
    <div className="min-h-screen">

      {/* HOD feedback banner */}
      {unit.status === "revision" && unit.hod_feedback && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2 mb-4">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-700">Revision requested by HOD</p>
            <p className="text-sm text-amber-800 mt-1">{unit.hod_feedback}</p>
          </div>
        </div>
      )}

      {/* Published banner */}
      {unit.status === "published" && (
        <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 flex items-start gap-2 mb-4">
          <Lock className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" aria-label="Plan is published and locked" />
          <div>
            <p className="text-xs font-semibold text-indigo-700">This plan is published and locked</p>
            <p className="text-sm text-indigo-600 mt-0.5">No further edits can be made to this unit.</p>
          </div>
        </div>
      )}

      {/* Rejected banner */}
      {unit.status === "rejected" && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2 mb-4">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-red-700">This unit has been rejected</p>
            {unit.rejection_reason && (
              <p className="text-sm text-red-700 mt-0.5">{unit.rejection_reason}</p>
            )}
            <p className="text-xs text-red-500 mt-1">Contact your HOD to have this unit reopened.</p>
          </div>
        </div>
      )}

      {/* ── Sticky nav bar ── */}
      <div className="sticky top-0 z-20 -mx-1 mb-0 flex items-center justify-between h-11 px-1 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-1.5 min-w-0 text-xs text-muted-foreground">
          <Button variant="ghost" size="sm" className="h-8 px-2 shrink-0" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
          </Button>
          <span className="hidden sm:block">·</span>
          <span className="hidden sm:block truncate max-w-[200px]">{plan.title}</span>
          <span className="hidden sm:block">·</span>
          <span className="hidden sm:block whitespace-nowrap">Term {unit.term} · Unit {unit.unit_number}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canSubmitUnit && (
            <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setSubmitDialogOpen(true)}>
              <Send className="h-3.5 w-3.5 mr-1" />
              {unit.status === "revision" ? "Resubmit" : "Submit Unit"}
            </Button>
          )}
          {canWithdraw && (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setWithdrawConfirmOpen(true)}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Withdraw
            </Button>
          )}
          {isHod && unit.status === "submitted" && approveUnit && (
            <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleApprove} disabled={actionSaving}>
              <Check className="h-3.5 w-3.5 mr-1" /> Approve
            </Button>
          )}
          {isHod && unit.status === "submitted" && requestUnitRevision && (
            <Button size="sm" variant="outline" className="h-8 text-xs border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setHodRevisionDialogOpen(true)} disabled={actionSaving}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Request Revision
            </Button>
          )}
          {isHod && unit.status === "approved" && reopenUnit && (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleReopen} disabled={actionSaving}>
              Re-open
            </Button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 border-b px-0 mb-6">
        <button
          onClick={() => setTab("view")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "view" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <ClipboardList className="h-3.5 w-3.5" /> Plan
        </button>
        <button
          onClick={() => { if (canEdit) { resetEditState(); setTab("edit"); } }}
          disabled={!canEdit}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${tab === "edit" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          PLAN TAB — read-only premium display
      ══════════════════════════════════════════════════ */}
      {tab === "view" && (
        <div className="space-y-5">

          {/* Page header */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                <Badge variant="outline" className="text-xs">Grade 6 · English</Badge>
                <Badge variant="outline" className="text-xs">Term {unit.term} · Unit {unit.unit_number}</Badge>
                <Badge variant="outline" className="text-xs">{unit.duration_weeks}w</Badge>
                <Badge variant="outline" className={`text-xs ${statusCfg.className}`}>{statusCfg.label}</Badge>
                {isOwner && <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">Your unit</Badge>}
                {unit.assignedTeacher && !isOwner && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <UserCircle2 className="h-3 w-3" />
                    {unit.assignedTeacher.full_name ?? unit.assignedTeacher.email}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold">{unit.title}</h1>
              {unit.big_idea && <p className="text-muted-foreground mt-1.5 text-base leading-relaxed max-w-2xl">{unit.big_idea}</p>}
            </div>
            {canEdit && (
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 shrink-0" onClick={() => { resetEditState(); setTab("edit"); }}>
                <Pencil className="h-3.5 w-3.5" /> Edit Unit Plan
              </Button>
            )}
          </div>

          {/* Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* 1 · Unit Overview */}
            <Card className="rounded-2xl shadow-none">
              <CardContent className="p-5 space-y-4">
                <SectionHeading>1. Unit Overview</SectionHeading>
                <div className="grid grid-cols-5 gap-0">
                  <div className="col-span-3 space-y-4 pr-5">
                    {unit.big_ideas && unit.big_ideas.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold mb-1.5">Big Ideas</p>
                        <ul className="space-y-1">{unit.big_ideas.map((b, i) => <li key={i} className="text-xs text-muted-foreground">• {b}</li>)}</ul>
                      </div>
                    )}
                    {unit.enduring_understandings && unit.enduring_understandings.length > 0 && (
                      <>
                        <div className="h-px bg-border" />
                        <div>
                          <p className="text-xs font-semibold mb-1.5">Enduring Understandings</p>
                          <ul className="space-y-1">{unit.enduring_understandings.map((e, i) => <li key={i} className="text-xs text-muted-foreground">• {e}</li>)}</ul>
                        </div>
                      </>
                    )}
                    {!unit.big_ideas?.length && !unit.enduring_understandings?.length && (
                      <Empty text="No content added — click Edit Unit Plan to fill in this section." />
                    )}
                  </div>
                  <div className="col-span-2 border-l pl-5 space-y-4">
                    <div className="flex items-start gap-2.5">
                      <div className="rounded-lg bg-muted/50 p-1.5 shrink-0"><Clock className="h-3.5 w-3.5 text-muted-foreground" /></div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Duration</p>
                        <p className="text-sm font-semibold mt-0.5">{unit.duration_weeks} Weeks</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="rounded-lg bg-muted/50 p-1.5 shrink-0"><FileText className="h-3.5 w-3.5 text-muted-foreground" /></div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Assessment</p>
                        <p className="text-sm font-semibold mt-0.5 capitalize">{unit.assessment_type}</p>
                      </div>
                    </div>
                    {unit.real_world_connections && (
                      <div className="flex items-start gap-2.5">
                        <div className="rounded-lg bg-muted/50 p-1.5 shrink-0"><Globe className="h-3.5 w-3.5 text-muted-foreground" /></div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">Real-world</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{unit.real_world_connections}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2 · Learning Outcomes */}
            <Card className="rounded-2xl shadow-none">
              <CardContent className="p-5 space-y-4">
                <SectionHeading>2. Learning Outcomes</SectionHeading>
                {unit.learning_outcomes && unit.learning_outcomes.length > 0 ? (
                  <ul className="space-y-1.5">
                    {unit.learning_outcomes.map((o, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-foreground/80">I can {o}</span>
                      </li>
                    ))}
                  </ul>
                ) : <Empty text="No learning outcomes added yet." />}
                {unit.success_criteria && unit.success_criteria.length > 0 && (
                  <>
                    <div className="h-px bg-border" />
                    <div>
                      <p className="text-xs font-semibold mb-1.5">Success Criteria</p>
                      <ul className="space-y-1">{unit.success_criteria.map((c, i) => <li key={i} className="text-xs text-muted-foreground">• {c}</li>)}</ul>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* 3 · Assessment Plan */}
            <Card className="rounded-2xl shadow-none overflow-hidden">
              <CardContent className="p-5 pb-3"><SectionHeading>3. Assessment Plan</SectionHeading></CardContent>
              {unit.assessment_plan && unit.assessment_plan.length > 0 ? (
                <div className="border-t">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/40 border-b">
                        {["Type", "When", "Assessment", "Purpose", "Tool"].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {unit.assessment_plan.map(row => (
                        <tr key={row.id} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ASSESSMENT_TYPE_COLORS[row.type] ?? "bg-muted text-muted-foreground"}`}>{row.type}</span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{row.when}</td>
                          <td className="px-4 py-2.5 text-xs font-medium">{row.assessment}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.purpose}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.tool}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="border-t px-5 py-8 text-center"><Empty text="No assessment plan added yet." /></div>
              )}
            </Card>

            {/* 4 · Lesson Sequence */}
            <Card className="rounded-2xl shadow-none overflow-hidden">
              <CardContent className="p-5 pb-3"><SectionHeading>4. Lesson Sequence</SectionHeading></CardContent>
              {unit.lesson_sequence && unit.lesson_sequence.length > 0 ? (
                <div className="border-t">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/40 border-b">
                        {["Week", "Focus", "Key Activities", "Standards", ...(canLogDelivery ? ["Delivered"] : [])].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {unit.lesson_sequence.map((row, i) => {
                        const taught = deliveredWeeks.has(row.week);
                        const isBusy = deliveryToggling === row.week;
                        return (
                          <tr key={i} className={`hover:bg-muted/20 ${taught ? "bg-emerald-50/40 dark:bg-emerald-950/10" : ""}`}>
                            <td className="px-4 py-2.5"><span className="text-xs font-bold text-muted-foreground">{row.week}</span></td>
                            <td className="px-4 py-2.5 text-xs font-medium">{row.focus}</td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.activities}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex flex-wrap gap-1">
                                {row.standards.map(s => <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0 font-mono">{s}</Badge>)}
                              </div>
                            </td>
                            {canLogDelivery && (
                              <td className="px-4 py-2.5 w-24">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => toggleDelivery(row.week)}
                                  className={`flex items-center gap-1.5 text-xs font-medium rounded transition-colors disabled:opacity-50 ${
                                    taught
                                      ? "text-emerald-600 hover:text-rose-500"
                                      : "text-muted-foreground/40 hover:text-emerald-600"
                                  }`}
                                  title={taught ? "Click to unmark" : "Mark as taught"}
                                >
                                  {isBusy
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : taught
                                      ? <CheckCircle2 className="h-4 w-4" />
                                      : <Circle className="h-4 w-4" />
                                  }
                                  <span>{taught ? "Taught" : ""}</span>
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="border-t px-5 py-8 text-center"><Empty text="No lesson sequence added yet." /></div>
              )}
            </Card>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* 5 · Texts & Resources */}
            <Card className="rounded-2xl shadow-none lg:col-span-3">
              <CardContent className="p-5">
                <SectionHeading>5. Texts & Resources</SectionHeading>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="rounded p-1 bg-blue-50"><BookOpen className="h-3 w-3 text-blue-600" /></span>
                      <p className="text-xs font-semibold">Anchor Texts</p>
                    </div>
                    {unit.anchor_text_details && unit.anchor_text_details.length > 0 ? (
                      <ul className="space-y-1">
                        {unit.anchor_text_details.map((at: AnchorText, i: number) => (
                          <li key={i} className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs text-muted-foreground">• {at.title}</span>
                              <span className={`inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium ${at.type === "literary" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                                {at.type === "literary" ? "Literary" : "Informational"}
                              </span>
                            </div>
                            {at.complexity && <span className="text-[10px] text-muted-foreground/60 pl-3">{at.complexity}</span>}
                          </li>
                        ))}
                      </ul>
                    ) : unit.anchor_texts && unit.anchor_texts.length > 0 ? (
                      <ul className="space-y-0.5">{unit.anchor_texts.map((item, i) => <li key={i} className="text-xs text-muted-foreground">• {item}</li>)}</ul>
                    ) : (
                      <Empty text="None added" />
                    )}
                  </div>
                  {([
                    { label: "Mentor Texts",  Icon: FileText, items: unit.mentor_texts,  accent: "bg-violet-50 text-violet-600" },
                    { label: "Multimedia",    Icon: Video,    items: unit.multimedia,    accent: "bg-emerald-50 text-emerald-600" },
                    { label: "Vocabulary",    Icon: Target,   items: unit.vocabulary,    accent: "bg-amber-50 text-amber-600" },
                  ] as const).map(({ label, Icon, items, accent }) => (
                    <div key={label}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className={`rounded p-1 ${accent.split(" ")[0]}`}><Icon className={`h-3 w-3 ${accent.split(" ")[1]}`} /></span>
                        <p className="text-xs font-semibold">{label}</p>
                      </div>
                      {items && items.length > 0
                        ? <ul className="space-y-0.5">{items.map((item, i) => <li key={i} className="text-xs text-muted-foreground">• {item}</li>)}</ul>
                        : <Empty text="None added" />
                      }
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 6 · Differentiation */}
            <Card className="rounded-2xl shadow-none lg:col-span-2">
              <CardContent className="p-5">
                <SectionHeading>6. Differentiation</SectionHeading>
                <div className="grid grid-cols-2 gap-2.5">
                  {([
                    { label: "ELL Support",   items: unit.diff_ell,          bg: "bg-blue-50",    text: "text-blue-700" },
                    { label: "Intervention",  items: unit.diff_intervention,  bg: "bg-amber-50",   text: "text-amber-700" },
                    { label: "Enrichment",    items: unit.diff_enrichment,    bg: "bg-emerald-50", text: "text-emerald-700" },
                    { label: "Accessibility", items: unit.diff_accessibility, bg: "bg-violet-50",  text: "text-violet-700" },
                  ] as const).map(({ label, items, bg, text }) => (
                    <div key={label} className={`rounded-xl p-3 ${bg}`}>
                      <p className={`text-xs font-semibold mb-1.5 ${text}`}>{label}</p>
                      {items && items.length > 0
                        ? <ul className="space-y-0.5">{items.map((item, i) => <li key={i} className="text-xs text-muted-foreground">• {item}</li>)}</ul>
                        : <Empty text="None added" />
                      }
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* 7 · Final Product */}
            <Card className="rounded-2xl shadow-none">
              <CardContent className="p-5">
                <SectionHeading>7. Final Product</SectionHeading>
                {unit.final_product
                  ? <p className="text-sm text-muted-foreground leading-relaxed">{unit.final_product}</p>
                  : <Empty text="No final product description added yet." />
                }
              </CardContent>
            </Card>

            {/* 8 · Reflection */}
            <Card className="rounded-2xl shadow-none">
              <CardContent className="p-5 space-y-4">
                <SectionHeading>8. Reflection</SectionHeading>
                <div>
                  <p className="text-xs font-semibold mb-1">Teacher Reflection</p>
                  {unit.teacher_reflection
                    ? <p className="text-sm text-muted-foreground leading-relaxed">{unit.teacher_reflection}</p>
                    : <Empty text="No reflection added yet." />
                  }
                </div>
                <div className="h-px bg-border" />
                <div>
                  <p className="text-xs font-semibold mb-1">Student Self-Assessment</p>
                  {unit.student_self_assessment
                    ? <p className="text-sm text-muted-foreground leading-relaxed">{unit.student_self_assessment}</p>
                    : <Empty text="No student self-assessment added yet." />
                  }
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 9 · Standards */}
          <Card className="rounded-2xl shadow-none overflow-hidden">
            <CardContent className="p-5 pb-3">
              <SectionHeading>9. Standards Covered</SectionHeading>
            </CardContent>
            {viewStandards.length === 0 ? (
              <div className="border-t px-5 py-8 text-center"><Empty text="No standards mapped yet." /></div>
            ) : (
              <div className="border-t">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/40 border-b">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Code</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Strand</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Description</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {viewStandards.map(s => {
                      const sc = strandFromCode(s.code);
                      const theme = STRAND_THEME[sc] ?? STRAND_THEME_DEFAULT;
                      return (
                        <tr key={s.id} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-mono font-medium ${theme.item} ${theme.text}`}>
                              {s.code}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{s.strand}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground leading-snug">{s.description}</td>
                          <td className="px-4 py-2.5 text-center">
                            {s.is_priority
                              ? <Star className="h-3.5 w-3.5 text-amber-400 fill-current inline-block" />
                              : <Star className="h-3.5 w-3.5 text-muted-foreground/30 inline-block" />
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* 10 · Standards Alignment */}
          <Card className="rounded-2xl shadow-none overflow-hidden">
            <CardContent className="p-5 pb-3">
              <SectionHeading>10. Standards Alignment</SectionHeading>
            </CardContent>
            {!unit.standard_assessments || unit.standard_assessments.length === 0 ? (
              <div className="border-t px-5 py-8 text-center"><Empty text="No standards alignment added yet." /></div>
            ) : (
              <div className="border-t">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/40 border-b">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Standard</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Task</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {unit.standard_assessments.map((sa: StandardAssessment) => (
                      <tr key={sa.standard_id} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-mono font-medium bg-muted/30 text-muted-foreground">
                            {sa.standard_code}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{sa.task}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sa.assessment_type === "summative" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {sa.assessment_type.charAt(0).toUpperCase() + sa.assessment_type.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          EDIT TAB — structured form
      ══════════════════════════════════════════════════ */}
      {tab === "edit" && (
        <div className="space-y-5">

          {/* Edit toolbar */}
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50" onClick={handleAIDraft} disabled={aiDrafting}>
                {aiDrafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                {aiDrafting ? "Drafting all sections…" : "AI Draft All Sections"}
              </Button>
              <p className="text-xs text-muted-foreground hidden sm:block">Auto-fill from title, question &amp; standards (~10s)</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { resetEditState(); setTab("view"); }}>
                Cancel
              </Button>
              <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={saving || !title.trim()}>
                {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving…</> : <><Save className="h-3.5 w-3.5 mr-1.5" /> Save Changes</>}
              </Button>
            </div>
          </div>

          {/* Row 0: Basic Information — full width */}
          <Card className="rounded-2xl shadow-none">
            <CardContent className="p-5 space-y-4">
              <SectionHeading>Basic Information</SectionHeading>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-1.5">
                  <Label>Unit Title</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Identity & Narrative" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Duration (wks)</Label>
                    <Input type="number" min={1} max={20} value={durationWeeks} onChange={e => setDurationWeeks(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Start Week</Label>
                    <Input type="number" min={1} max={40} value={startWeek} onChange={e => setStartWeek(e.target.value)} placeholder="—" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Assessment</Label>
                    <Select value={assessmentType} onValueChange={v => v && setAssessmentType(v as "formative" | "summative" | "both")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ASSESSMENT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Essential Question</Label>
                <Textarea value={bigIdea} onChange={e => setBigIdea(e.target.value)} placeholder="What overarching question drives this unit?" rows={2} className="resize-none" />
              </div>
            </CardContent>
          </Card>

          {/* Row 1: Big Picture | Learning Outcomes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="rounded-2xl shadow-none">
              <CardContent className="p-5 space-y-4">
                <SectionHeading>1. Big Picture</SectionHeading>
                <div className="space-y-1.5">
                  <Label className="text-xs">Big Ideas</Label>
                  <EditableList items={bigIdeas} onChange={setBigIdeas} placeholder="Add a big idea…" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Enduring Understandings</Label>
                  <EditableList items={enduringUnderstandings} onChange={setEnduringUnderstandings} placeholder="Add an enduring understanding…" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Real-world Connections</Label>
                  <Input value={realWorldConnections} onChange={e => setRealWorldConnections(e.target.value)} placeholder="e.g. personal storytelling, cultural identity" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-none">
              <CardContent className="p-5 space-y-4">
                <SectionHeading>2. Learning Outcomes</SectionHeading>
                <div className="space-y-1.5">
                  <Label className="text-xs">I Can Statements <span className="text-muted-foreground font-normal">(without "I can" prefix)</span></Label>
                  <EditableList items={learningOutcomes} onChange={setLearningOutcomes} prefix="I can" placeholder="analyze how characters develop…" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Success Criteria</Label>
                  <EditableList items={successCriteria} onChange={setSuccessCriteria} placeholder="Add success criterion…" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Assessment Plan | Lesson Sequence */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="rounded-2xl shadow-none overflow-hidden">
              <CardContent className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <SectionHeading>3. Assessment Plan</SectionHeading>
                  <Button size="sm" variant="outline" className="h-6 text-xs gap-1 -mt-4" onClick={openAddAssessRow}>
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>
              </CardContent>
              {assessmentPlan.length > 0 && (
                <div className="border-t">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/40 border-b">
                        {["Type", "When", "Assessment", "Purpose", "Tool", ""].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {assessmentPlan.map(row => (
                        <tr key={row.id} className="hover:bg-muted/20 group">
                          <td className="px-3 py-2"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ASSESSMENT_TYPE_COLORS[row.type] ?? "bg-muted text-muted-foreground"}`}>{row.type}</span></td>
                          <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{row.when}</td>
                          <td className="px-3 py-2 text-xs">{row.assessment}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{row.purpose}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{row.tool}</td>
                          <td className="px-2 py-2">
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button type="button" className="text-muted-foreground hover:text-foreground p-0.5" onClick={() => openEditAssessRow(row)}><Pencil className="h-3.5 w-3.5" /></button>
                              <button type="button" className="text-muted-foreground hover:text-rose-500 p-0.5" onClick={() => setAssessmentPlan(p => p.filter(r => r.id !== row.id))}><X className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {assessmentPlan.length === 0 && (
                <div className="border-t px-5 py-6 text-center">
                  <p className="text-xs text-muted-foreground italic">No assessments yet — click Add or use AI Draft.</p>
                </div>
              )}
            </Card>

            <Card className="rounded-2xl shadow-none overflow-hidden">
              <CardContent className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <SectionHeading>4. Lesson Sequence</SectionHeading>
                  <Button size="sm" variant="outline" className="h-6 text-xs gap-1 -mt-4" onClick={openAddWeek}>
                    <Plus className="h-3 w-3" /> Add Week
                  </Button>
                </div>
              </CardContent>
              {lessonSequence.length > 0 && (
                <div className="border-t">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/40 border-b">
                        {["Wk", "Focus", "Activities", "Standards", ""].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {lessonSequence.map((row, i) => (
                        <tr key={i} className="hover:bg-muted/20 group">
                          <td className="px-3 py-2 text-xs font-bold text-muted-foreground">{row.week}</td>
                          <td className="px-3 py-2 text-xs font-medium">{row.focus}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{row.activities}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {row.standards.map(s => <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0 font-mono">{s}</Badge>)}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button type="button" className="text-muted-foreground hover:text-foreground p-0.5" onClick={() => openEditWeek(i)}><Pencil className="h-3.5 w-3.5" /></button>
                              <button type="button" className="text-muted-foreground hover:text-rose-500 p-0.5" onClick={() => setLessonSequence(p => p.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {lessonSequence.length === 0 && (
                <div className="border-t px-5 py-6 text-center">
                  <p className="text-xs text-muted-foreground italic">No weeks yet — click Add Week or use AI Draft.</p>
                </div>
              )}
            </Card>
          </div>

          {/* Row 3: Texts & Resources (3) | Differentiation (2) */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <Card className="rounded-2xl shadow-none lg:col-span-3">
              <CardContent className="p-5 space-y-4">
                <SectionHeading>5. Texts & Resources</SectionHeading>
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2 space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs"><BookOpen className="h-3.5 w-3.5 text-blue-500" /> Anchor Texts</Label>
                    <div className="space-y-1.5">
                      {anchorTextDetails.map((at, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-1.5">
                          <input
                            value={at.title}
                            onChange={e => setAnchorTextDetails(prev => prev.map((a, j) => j === i ? { ...a, title: e.target.value } : a))}
                            placeholder="Title…"
                            className="flex-1 text-sm bg-transparent outline-none min-w-0"
                          />
                          <select
                            value={at.type}
                            onChange={e => setAnchorTextDetails(prev => prev.map((a, j) => j === i ? { ...a, type: e.target.value as "literary" | "informational" } : a))}
                            className="text-xs bg-transparent border border-muted rounded px-1.5 py-0.5 outline-none shrink-0"
                          >
                            <option value="literary">Literary</option>
                            <option value="informational">Informational</option>
                          </select>
                          <input
                            value={at.complexity ?? ""}
                            onChange={e => setAnchorTextDetails(prev => prev.map((a, j) => j === i ? { ...a, complexity: e.target.value || undefined } : a))}
                            placeholder="Complexity…"
                            className="w-24 text-xs bg-transparent outline-none text-muted-foreground shrink-0"
                          />
                          <button type="button" onClick={() => setAnchorTextDetails(prev => prev.filter((_, j) => j !== i))}
                            className="text-muted-foreground/40 hover:text-rose-500 transition-colors shrink-0">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setAnchorTextDetails(prev => [...prev, { title: "", type: "literary" }])}
                        className="flex items-center gap-2 rounded-md border border-dashed px-3 py-1.5 text-xs text-muted-foreground/60 hover:border-muted-foreground/40 transition-colors w-full"
                      >
                        <Plus className="h-3.5 w-3.5 shrink-0" /> Add Anchor Text
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs"><FileText className="h-3.5 w-3.5 text-violet-500" /> Mentor Texts</Label>
                    <EditableList items={mentorTexts} onChange={setMentorTexts} placeholder="Add mentor text…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs"><Video className="h-3.5 w-3.5 text-emerald-500" /> Multimedia</Label>
                    <EditableList items={multimedia} onChange={setMultimedia} placeholder="Add resource…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs"><Target className="h-3.5 w-3.5 text-amber-500" /> Vocabulary</Label>
                    <EditableList items={vocabulary} onChange={setVocabulary} placeholder="Add vocabulary word…" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-none lg:col-span-2">
              <CardContent className="p-5 space-y-3">
                <SectionHeading>6. Differentiation</SectionHeading>
                <div className="grid grid-cols-2 gap-2.5">
                  {([
                    { label: "ELL Support",   items: diffEll,          setter: setDiffEll,          placeholder: "Add ELL strategy…",     bg: "bg-blue-50",    text: "text-blue-700" },
                    { label: "Intervention",  items: diffIntervention,  setter: setDiffIntervention, placeholder: "Add intervention…",      bg: "bg-amber-50",   text: "text-amber-700" },
                    { label: "Enrichment",    items: diffEnrichment,    setter: setDiffEnrichment,   placeholder: "Add enrichment option…", bg: "bg-emerald-50", text: "text-emerald-700" },
                    { label: "Accessibility", items: diffAccessibility, setter: setDiffAccessibility,placeholder: "Add accommodation…",     bg: "bg-violet-50",  text: "text-violet-700" },
                  ] as const).map(({ label, items, setter, placeholder, bg, text }) => (
                    <div key={label} className={`rounded-xl p-3 ${bg}`}>
                      <p className={`text-xs font-semibold mb-2 ${text}`}>{label}</p>
                      <EditableList items={items as string[]} onChange={setter as (v: string[]) => void} placeholder={placeholder} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 4: Final Product | Reflection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="rounded-2xl shadow-none">
              <CardContent className="p-5 space-y-3">
                <SectionHeading>7. Final Product</SectionHeading>
                <Textarea value={finalProduct} onChange={e => setFinalProduct(e.target.value)} placeholder="Describe the summative final product — type, length, format, and key requirements…" rows={6} className="resize-none" />
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-none">
              <CardContent className="p-5 space-y-4">
                <SectionHeading>8. Reflection</SectionHeading>
                <div className="space-y-1.5">
                  <Label className="text-xs">Teacher Reflection</Label>
                  <Textarea value={teacherReflection} onChange={e => setTeacherReflection(e.target.value)} placeholder="What worked well? What will I adjust next time?" rows={3} className="resize-none" />
                </div>
                <div className="h-px bg-border" />
                <div className="space-y-1.5">
                  <Label className="text-xs">Student Self-Assessment</Label>
                  <Textarea value={studentSelfAssessment} onChange={e => setStudentSelfAssessment(e.target.value)} placeholder="What did I do well? What can I improve?" rows={2} className="resize-none" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 5: Standards — full width */}
          <Card className="rounded-2xl shadow-none">
          <CardContent className="p-5 space-y-4">
          <SectionHeading>9. Standards</SectionHeading>
            {editStandards.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {editStandards.map(s => {
                  const sc = strandFromCode(s.code);
                  const theme = STRAND_THEME[sc] ?? STRAND_THEME_DEFAULT;
                  return (
                    <span key={s.id} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-mono font-medium ${theme.item} ${theme.text}`}>
                      {s.code}
                      <button type="button" onClick={() => setSelectedIds(prev => { const n = new Set(prev); n.delete(s.id); return n; })} className="hover:opacity-60">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* AI Suggest */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">Select standards from the list below</p>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-violet-600 hover:bg-violet-50" onClick={handleSuggest} disabled={suggesting}>
                {suggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                AI Suggest
              </Button>
            </div>

            {suggestError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 flex items-center justify-between gap-2 mb-3">
                <p className="text-xs text-rose-700">{suggestError}</p>
                <button type="button" className="text-xs text-rose-400 hover:text-rose-600" onClick={() => setSuggestError("")}>✕</button>
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 space-y-3 mb-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-violet-700 flex items-center gap-1.5"><Sparkles className="h-3 w-3" /> AI Suggestions</p>
                  <Button size="sm" variant="ghost" className="h-5 text-xs px-2 text-violet-500 hover:bg-violet-100" onClick={() => setSuggestions([])}>Dismiss</Button>
                </div>
                {coverageNote && <p className="text-xs text-violet-600 italic">{coverageNote}</p>}
                <div className="space-y-1.5">
                  {suggestions.map(s => (
                    <label key={s.standardId} className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" className="mt-0.5 shrink-0"
                        checked={acceptedSuggestions.has(s.standardId)}
                        onChange={e => setAcceptedSuggestions(prev => { const n = new Set(prev); e.target.checked ? n.add(s.standardId) : n.delete(s.standardId); return n; })}
                      />
                      <div className="min-w-0">
                        <Badge variant="outline" className={`font-mono text-xs px-1.5 py-0 mr-1 ${STRAND_COLORS[strandFromCode(s.code)] ?? ""}`}>{s.code}</Badge>
                        <span className="text-xs text-violet-700">{s.reason}</span>
                      </div>
                    </label>
                  ))}
                </div>
                <Button size="sm" className="h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white" onClick={applyAccepted} disabled={acceptedSuggestions.size === 0}>
                  Add {acceptedSuggestions.size > 0 ? `${acceptedSuggestions.size} ` : ""}Selected
                </Button>
              </div>
            )}

            <div className="space-y-2">
              {strands.map(strand => {
                const ss = standards.filter(s => s.strand === strand);
                const sc = strandFromCode(ss[0]?.code ?? "");
                const sel = ss.filter(s => selectedIds.has(s.id)).length;
                const c = STRAND_THEME[sc] ?? STRAND_THEME_DEFAULT;
                const collapsed = collapsedStrands.has(strand);
                return (
                  <div key={strand} className="rounded-xl border overflow-hidden">
                    <button type="button"
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-muted/30 transition-colors text-left"
                      onClick={() => setCollapsedStrands(prev => { const n = new Set(prev); n.has(strand) ? n.delete(strand) : n.add(strand); return n; })}>
                      <Badge variant="outline" className={`font-mono text-xs shrink-0 px-1.5 py-0 ${STRAND_COLORS[sc] ?? ""}`}>{sc}</Badge>
                      <span className="text-xs font-semibold flex-1">{strand}</span>
                      <span className={`text-xs tabular-nums font-medium ${sel > 0 ? c.count : "text-muted-foreground"}`}>{sel}/{ss.length}</span>
                      {collapsed ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                    {!collapsed && (
                      <div className="border-t px-4 pb-2 pt-2 space-y-0.5 bg-muted/10">
                        {ss.map(s => {
                          const selected = selectedIds.has(s.id);
                          const isPriority = priorityIds.has(s.id);
                          return (
                            <div key={s.id} className={`flex items-start gap-2.5 p-2 rounded-md border transition-colors ${selected ? `${c.item} border` : "border-transparent hover:bg-muted/40"}`}>
                              <label className="flex items-start gap-2.5 flex-1 cursor-pointer min-w-0">
                                <input type="checkbox" className="mt-0.5 shrink-0" checked={selected}
                                  onChange={() => setSelectedIds(prev => { const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n; })} />
                                <div className="min-w-0">
                                  <span className={`font-mono text-xs font-semibold ${selected ? c.text : "text-muted-foreground"}`}>{s.code}</span>
                                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">{s.description}</p>
                                </div>
                              </label>
                              {selected && (
                                <button
                                  type="button"
                                  onClick={() => togglePriority(s.id)}
                                  title={isPriority ? "Remove priority" : "Mark as priority"}
                                  className="shrink-0 mt-0.5 transition-colors"
                                >
                                  <Star className={`h-3.5 w-3.5 ${isPriority ? "text-amber-400 fill-current" : "text-muted-foreground/30 hover:text-amber-400"}`} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
          </Card>

          {/* Bottom save bar */}
          <div className="flex items-center justify-end gap-3 pt-2 pb-4">
            <Button variant="ghost" className="h-9 text-sm" onClick={() => { resetEditState(); setTab("view"); }}>Cancel</Button>
            <Button className="h-9 text-sm px-6" onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving…</> : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
            </Button>
          </div>
        </div>
      )}

      {/* ── Workflow modals ── */}
      <Modal open={submitDialogOpen} onClose={() => setSubmitDialogOpen(false)} title={unit.status === "revision" ? "Resubmit Unit" : "Submit Unit for Review"}>
        <p className="text-sm text-muted-foreground py-2">Submit <strong>{unit.title}</strong> for HOD review? The unit will be locked until the HOD responds.</p>
        <ModalFooter>
          <ModalCancel onClick={() => setSubmitDialogOpen(false)} />
          <Button onClick={handleSubmitUnit} disabled={actionSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {actionSaving ? "Submitting…" : "Submit"}
          </Button>
        </ModalFooter>
      </Modal>

      <ConfirmModal open={withdrawConfirmOpen} onClose={() => setWithdrawConfirmOpen(false)} title="Withdraw Unit"
        description={<>Return <strong>{unit.title}</strong> to draft? You can edit and resubmit it.</>}
        confirmLabel={actionSaving ? "Withdrawing…" : "Withdraw"} onConfirm={handleWithdrawUnit} loading={actionSaving} />

      <Modal open={hodRevisionDialogOpen} onClose={() => setHodRevisionDialogOpen(false)} title="Request Revision">
        <div className="space-y-3 py-2">
          <div className="bg-muted rounded-lg p-2.5 text-xs">
            <p className="font-medium">{unit.title}</p>
            <p className="text-muted-foreground">Term {unit.term} · Unit {unit.unit_number}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Feedback for teacher</Label>
            <Textarea placeholder="Explain what needs to be revised…" value={hodRevisionFeedback} onChange={e => setHodRevisionFeedback(e.target.value)} rows={4} autoFocus />
          </div>
        </div>
        <ModalFooter>
          <ModalCancel onClick={() => setHodRevisionDialogOpen(false)} />
          <Button variant="destructive" onClick={handleHodRevision} disabled={actionSaving || !hodRevisionFeedback.trim()}>
            {actionSaving ? "Sending…" : "Request Revision"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Assessment row modal */}
      <Modal open={assessRowModal.open} onClose={() => setAssessRowModal({ open: false, row: null })} title={assessRowModal.row ? "Edit Assessment" : "Add Assessment"} size="md">
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Input value={assessRowDraft.type} onChange={e => setAssessRowDraft(d => ({ ...d, type: e.target.value }))} placeholder="Formative, Summative…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">When</Label>
              <Input value={assessRowDraft.when} onChange={e => setAssessRowDraft(d => ({ ...d, when: e.target.value }))} placeholder="Week 1, Ongoing…" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Assessment Task</Label>
            <Input value={assessRowDraft.assessment} onChange={e => setAssessRowDraft(d => ({ ...d, assessment: e.target.value }))} placeholder="e.g. Character Analysis Paragraph" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Purpose</Label>
            <Input value={assessRowDraft.purpose} onChange={e => setAssessRowDraft(d => ({ ...d, purpose: e.target.value }))} placeholder="e.g. Assess understanding of theme" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tool</Label>
            <Input value={assessRowDraft.tool} onChange={e => setAssessRowDraft(d => ({ ...d, tool: e.target.value }))} placeholder="e.g. Analytic Rubric, Checklist" />
          </div>
        </div>
        <ModalFooter>
          <ModalCancel onClick={() => setAssessRowModal({ open: false, row: null })} />
          <Button onClick={saveAssessRow} disabled={!assessRowDraft.assessment.trim()}>
            {assessRowModal.row ? "Save Changes" : "Add Assessment"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Week modal */}
      <Modal open={weekModal.open} onClose={() => setWeekModal({ open: false, index: null })} title={weekModal.index !== null ? "Edit Week" : "Add Week"} size="md">
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Week #</Label>
              <Input type="number" min={1} value={weekDraft.week} onChange={e => setWeekDraft(d => ({ ...d, week: parseInt(e.target.value) || 1 }))} />
            </div>
            <div className="col-span-3 space-y-1.5">
              <Label className="text-xs">Focus</Label>
              <Input value={weekDraft.focus} onChange={e => setWeekDraft(d => ({ ...d, focus: e.target.value }))} placeholder="e.g. Exploring Identity in Stories" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Key Activities</Label>
            <Input value={weekDraft.activities} onChange={e => setWeekDraft(d => ({ ...d, activities: e.target.value }))} placeholder="e.g. Read short stories, discuss identity themes" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Standards <span className="text-muted-foreground font-normal">(comma-separated codes)</span></Label>
            <Input value={weekDraft.standardsText} onChange={e => setWeekDraft(d => ({ ...d, standardsText: e.target.value }))} placeholder="e.g. RL.6.1, RL.6.3, W.6.3" />
          </div>
        </div>
        <ModalFooter>
          <ModalCancel onClick={() => setWeekModal({ open: false, index: null })} />
          <Button onClick={saveWeek} disabled={!weekDraft.focus.trim()}>
            {weekModal.index !== null ? "Save Changes" : "Add Week"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
