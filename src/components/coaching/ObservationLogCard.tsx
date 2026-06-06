"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Observation, ObservationFocusArea } from "@/types";
import { Plus } from "lucide-react";

const FOCUS_LABELS: Record<ObservationFocusArea, string> = {
  literacy: "Literacy",
  differentiation: "Differentiation",
  assessment: "Assessment",
  classroom_management: "Classroom Management",
  other: "Other",
};

const FOCUS_COLORS: Record<ObservationFocusArea, { bg: string; text: string; border: string }> = {
  literacy:            { bg: "var(--strand-rl-bg)",  text: "var(--strand-rl-text)",  border: "var(--strand-rl-border)"  },
  differentiation:     { bg: "var(--strand-ri-bg)",  text: "var(--strand-ri-text)",  border: "var(--strand-ri-border)"  },
  assessment:          { bg: "var(--strand-w-bg)",   text: "var(--strand-w-text)",   border: "var(--strand-w-border)"   },
  classroom_management:{ bg: "var(--strand-sl-bg)",  text: "var(--strand-sl-text)",  border: "var(--strand-sl-border)"  },
  other:               { bg: "var(--status-pending-bg)", text: "var(--status-pending-text)", border: "var(--status-pending-border)" },
};

function FocusBadge({ area }: { area: ObservationFocusArea }) {
  const c = FOCUS_COLORS[area];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border"
      style={{ background: c.bg, color: c.text, borderColor: c.border }}
    >
      {FOCUS_LABELS[area]}
    </span>
  );
}

function formatDate(d: string): { display: string; title: string } {
  const date = new Date(d);
  const absolute = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diffDays === 0) return { display: "Today", title: absolute };
  if (diffDays === 1) return { display: "Yesterday", title: absolute };
  if (diffDays < 7) return { display: `${diffDays} days ago`, title: absolute };
  return { display: absolute, title: "" };
}

interface InlineFormProps {
  onSave: (data: { date: string; focus_area: ObservationFocusArea; notes: string; next_steps: string }) => Promise<void>;
  onCancel: () => void;
}

function InlineObservationForm({ onSave, onCancel }: InlineFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [focusArea, setFocusArea] = useState<ObservationFocusArea>("literacy");
  const [notes, setNotes] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave({ date, focus_area: focusArea, notes, next_steps: nextSteps });
    setSaving(false);
  }

  return (
    <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-8 px-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Focus Area</label>
          <Select value={focusArea} onValueChange={(v) => setFocusArea(v as ObservationFocusArea)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FOCUS_LABELS) as ObservationFocusArea[]).map((k) => (
                <SelectItem key={k} value={k}>{FOCUS_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Observation notes</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What did you observe?"
          className="min-h-[80px] text-sm resize-none"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Agreed next steps</label>
        <Textarea
          value={nextSteps}
          onChange={(e) => setNextSteps(e.target.value)}
          placeholder="What will the teacher try next?"
          className="min-h-[64px] text-sm resize-none"
        />
      </div>
      <div className="flex items-center gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !notes.trim()}>
          {saving ? "Saving…" : "Save Observation"}
        </Button>
      </div>
    </div>
  );
}

interface Props {
  observations: Observation[];
  onAdd: (data: { date: string; focus_area: ObservationFocusArea; notes: string; next_steps: string }) => Promise<void>;
}

export function ObservationLogCard({ observations, onAdd }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function handleSave(data: { date: string; focus_area: ObservationFocusArea; notes: string; next_steps: string }) {
    await onAdd(data);
    setFormOpen(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Observations</h3>
        {!formOpen && (
          <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => setFormOpen(true)}>
            <Plus className="h-3 w-3" /> Log Observation
          </Button>
        )}
      </div>

      {formOpen && (
        <InlineObservationForm onSave={handleSave} onCancel={() => setFormOpen(false)} />
      )}

      {observations.length === 0 && !formOpen ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No observations recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {observations.map((obs) => (
            <Card key={obs.id} className="shadow-none border-border/60">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FocusBadge area={obs.focus_area as ObservationFocusArea} />
                    {(() => { const f = formatDate(obs.date); return <span className="text-xs text-muted-foreground" title={f.title || undefined}>{f.display}</span>; })()}
                  </div>
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setExpanded(expanded === obs.id ? null : obs.id)}
                  >
                    {expanded === obs.id ? "Collapse" : "Expand"}
                  </button>
                </div>
                {obs.notes && (
                  <p className={`text-sm text-foreground leading-relaxed ${expanded !== obs.id ? "line-clamp-2" : ""}`}>
                    {obs.notes}
                  </p>
                )}
                {expanded === obs.id && obs.next_steps && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">Agreed next steps</p>
                    <p className="text-sm text-foreground leading-relaxed">{obs.next_steps}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
