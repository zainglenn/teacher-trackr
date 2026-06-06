"use client";

import { useState } from "react";
import { MeetingNote, ActionItem } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckSquare, Square, Plus, ChevronDown, ChevronUp } from "lucide-react";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

interface ActionItemRowProps {
  item: ActionItem;
  onToggle: (id: string) => void;
  isHod: boolean;
}

function ActionItemRow({ item, onToggle, isHod }: ActionItemRowProps) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <button
        onClick={() => onToggle(item.id)}
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
        aria-label={item.completed_at ? "Mark incomplete" : "Mark complete"}
      >
        {item.completed_at
          ? <CheckSquare className="h-4 w-4" style={{ color: "var(--status-taught-text)" }} />
          : <Square className="h-4 w-4" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${item.completed_at ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {item.description}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {item.assignee && <span className="text-xs text-muted-foreground">{item.assignee.full_name}</span>}
          {item.due_date && (
            <span className="text-xs text-muted-foreground">
              Due {new Date(item.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface Props {
  note: MeetingNote;
  onToggleAction: (id: string) => void;
  isHod: boolean;
  defaultExpanded?: boolean;
}

export function MeetingNoteCard({ note, onToggleAction, isHod, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const actions = note.action_items ?? [];
  const pending = actions.filter((a) => !a.completed_at);

  return (
    <Card className="shadow-none border-border/60">
      <CardContent className="p-4">
        <button
          className="w-full text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">{formatDate(note.meeting_date)}</p>
              {note.agenda && (
                <p className={`text-sm text-muted-foreground ${expanded ? "" : "line-clamp-1"}`}>{note.agenda}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {pending.length > 0 && (
                <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  {pending.length} action{pending.length !== 1 ? "s" : ""}
                </span>
              )}
              {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
        </button>

        {expanded && (
          <div className="mt-3 space-y-3 pt-3 border-t border-border/50">
            {note.notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{note.notes}</p>
              </div>
            )}
            {actions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Action Items</p>
                <div className="space-y-0">
                  {actions.map((a) => (
                    <ActionItemRow key={a.id} item={a} onToggle={onToggleAction} isHod={isHod} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Inline create form ───────────────────────────────────────────────────────

interface NewActionItem {
  assignee_id: string;
  description: string;
  due_date?: string;
}

interface TeacherOption { id: string; name: string }

interface CreateFormProps {
  teachers: TeacherOption[];
  onSave: (data: {
    meeting_date: string;
    agenda: string;
    notes: string;
    attendee_ids: string[];
    action_items_data: NewActionItem[];
  }) => Promise<void>;
  onCancel: () => void;
}

export function MeetingNoteCreateForm({ teachers, onSave, onCancel }: CreateFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [agenda, setAgenda] = useState("");
  const [notes, setNotes] = useState("");
  const [attendees, setAttendees] = useState<string[]>([]);
  const [actionItems, setActionItems] = useState<NewActionItem[]>([]);
  const [saving, setSaving] = useState(false);

  function addActionItem() {
    setActionItems((prev) => [...prev, { assignee_id: teachers[0]?.id ?? "", description: "" }]);
  }
  function updateAction(idx: number, field: keyof NewActionItem, value: string) {
    setActionItems((prev) => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  }
  function removeAction(idx: number) {
    setActionItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setSaving(true);
    await onSave({
      meeting_date: date,
      agenda,
      notes,
      attendee_ids: attendees,
      action_items_data: actionItems.filter((a) => a.description.trim()),
    });
    setSaving(false);
  }

  function toggleAttendee(id: string) {
    setAttendees((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]);
  }

  return (
    <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/20">
      <p className="text-sm font-semibold">New Meeting Note</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full h-8 px-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Attendees</label>
          <div className="flex gap-1 flex-wrap">
            {teachers.map((t) => (
              <button key={t.id} onClick={() => toggleAttendee(t.id)}
                className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                  attendees.includes(t.id) ? "bg-primary/10 border-primary/30 text-foreground" : "bg-background border-border/50 text-muted-foreground hover:bg-muted"
                }`}>
                {t.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Agenda</label>
        <Textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} className="min-h-[56px] text-sm resize-none" placeholder="What was discussed?" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Notes</label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[80px] text-sm resize-none" placeholder="Key decisions, observations, context…" />
      </div>

      {/* Action items */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">Action Items</label>
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={addActionItem}>
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
        {actionItems.map((item, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_140px_100px_auto] gap-2 items-center">
            <input
              type="text"
              value={item.description}
              onChange={(e) => updateAction(idx, "description", e.target.value)}
              placeholder="What needs to happen?"
              className="h-8 px-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
            />
            <Select value={item.assignee_id} onValueChange={(v) => updateAction(idx, "assignee_id", v ?? "")}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Assignee" /></SelectTrigger>
              <SelectContent>
                {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <input
              type="date"
              value={item.due_date ?? ""}
              onChange={(e) => updateAction(idx, "due_date", e.target.value)}
              className="h-8 px-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
            />
            <button onClick={() => removeAction(idx)} className="text-muted-foreground hover:text-foreground text-xs px-1">✕</button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Meeting Note"}
        </Button>
      </div>
    </div>
  );
}
