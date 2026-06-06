"use client";

import { useState } from "react";
import { PDEntry, PDType } from "@/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

const PD_LABELS: Record<PDType, string> = {
  conference: "Conference",
  workshop: "Workshop",
  peer_obs: "Peer Observation",
  online: "Online",
  other: "Other",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  entries: PDEntry[];
  teacherId: string;
  onAdd: (data: { teacher_id: string; pd_type: PDType; focus_area?: string; attended_date: string; notes?: string }) => Promise<void>;
}

export function PDLogTable({ entries, teacherId, onAdd }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [pdType, setPdType] = useState<PDType>("workshop");
  const [focusArea, setFocusArea] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onAdd({ teacher_id: teacherId, pd_type: pdType, focus_area: focusArea || undefined, attended_date: date, notes: notes || undefined });
    setSaving(false);
    setFormOpen(false);
    setPdType("workshop"); setFocusArea(""); setNotes("");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Professional Development</h3>
        {!formOpen && (
          <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => setFormOpen(true)}>
            <Plus className="h-3 w-3" /> Add Entry
          </Button>
        )}
      </div>

      {formOpen && (
        <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <Select value={pdType} onValueChange={(v) => setPdType(v as PDType)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PD_LABELS) as PDType[]).map((k) => (
                    <SelectItem key={k} value={k}>{PD_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-8 px-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Focus area</label>
            <input
              type="text"
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
              placeholder="e.g. Close reading strategies"
              className="w-full h-8 px-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[60px] text-sm resize-none" placeholder="Key takeaways…" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Entry"}
            </Button>
          </div>
        </div>
      )}

      {entries.length === 0 && !formOpen ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No PD entries recorded.</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Date</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Focus</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{formatDate(e.attended_date)}</td>
                  <td className="px-3 py-2 text-xs font-medium">{PD_LABELS[e.pd_type as PDType]}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{e.focus_area ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
