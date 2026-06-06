"use client";

import { useState } from "react";
import { Recognition } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Plus } from "lucide-react";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  recognition: Recognition;
}

export function RecognitionCard({ recognition }: Props) {
  return (
    <Card
      className="shadow-none border overflow-hidden"
      style={{ borderColor: "var(--recognition-border)", background: "var(--recognition-bg)" }}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <Star className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--recognition-accent)" }} />
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                {recognition.teacher?.full_name ?? "Teacher"}
              </p>
              <span className="text-xs text-muted-foreground shrink-0">{formatDate(recognition.created_at)}</span>
            </div>
            {recognition.unit && (
              <p className="text-xs text-muted-foreground">Re: {recognition.unit.title}</p>
            )}
            <p className="text-sm text-foreground leading-relaxed">{recognition.note}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TeacherOption { id: string; name: string }
interface UnitOption { id: string; title: string }

interface CreateSheetProps {
  open: boolean;
  onClose: () => void;
  teachers: TeacherOption[];
  units?: UnitOption[];
  onSave: (data: { teacher_id: string; unit_id?: string; note: string }) => Promise<void>;
}

export function RecognitionCreateSheet({ open, onClose, teachers, units = [], onSave }: CreateSheetProps) {
  const [teacherId, setTeacherId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!teacherId || !note.trim()) return;
    setSaving(true);
    await onSave({ teacher_id: teacherId, unit_id: unitId || undefined, note });
    setSaving(false);
    setTeacherId(""); setUnitId(""); setNote("");
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[400px]">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4" style={{ color: "var(--recognition-accent)" }} />
            Recognise a Teacher
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Teacher</label>
            <Select value={teacherId} onValueChange={(v) => setTeacherId(v ?? "")}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Select teacher…" /></SelectTrigger>
              <SelectContent>
                {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {units.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Linked unit (optional)</label>
              <Select value={unitId} onValueChange={(v) => setUnitId(v ?? "")}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="No unit" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No unit</SelectItem>
                  {units.map((u) => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Note</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What stood out? What was the impact?"
              className="min-h-[120px] text-sm resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !teacherId || !note.trim()}>
              {saving ? "Saving…" : "Send Recognition"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
