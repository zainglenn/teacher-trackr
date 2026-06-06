"use client";

import { MentoringPair, CheckInCadence } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Plus } from "lucide-react";
import { useState } from "react";

function formatRelative(d: string | null) {
  if (!d) return "Never";
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

interface TeacherOption { id: string; name: string }

interface Props {
  pair: MentoringPair | null;
  teacherName: string;
  allTeachers: TeacherOption[];
  onUpdateCheckIn: (pairId: string) => Promise<void>;
  onCreatePair: (mentorId: string, menteeId: string, cadence: CheckInCadence) => Promise<void>;
  currentTeacherId: string;
}

export function MentoringPairCard({ pair, teacherName, allTeachers, onUpdateCheckIn, onCreatePair, currentTeacherId }: Props) {
  const [creating, setCreating] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const [role, setRole] = useState<"mentor" | "mentee">("mentee");
  const [cadence, setCadence] = useState<CheckInCadence>("fortnightly");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!partnerId) return;
    setSaving(true);
    const mentorId = role === "mentor" ? currentTeacherId : partnerId;
    const menteeId = role === "mentor" ? partnerId : currentTeacherId;
    await onCreatePair(mentorId, menteeId, cadence);
    setSaving(false);
    setCreating(false);
  }

  if (!pair && !creating) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 border border-dashed border-border rounded-lg">
        <p className="text-sm text-muted-foreground">No mentoring pair assigned.</p>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" /> Assign Pair
        </Button>
      </div>
    );
  }

  if (creating) {
    const others = allTeachers.filter((t) => t.id !== currentTeacherId);
    return (
      <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{teacherName} is the</label>
            <Select value={role} onValueChange={(v) => setRole(v as "mentor" | "mentee")}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mentor">Mentor</SelectItem>
                <SelectItem value="mentee">Mentee</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Paired with</label>
            <Select value={partnerId} onValueChange={(v) => setPartnerId(v ?? "")}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select teacher" /></SelectTrigger>
              <SelectContent>
                {others.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Check-in cadence</label>
          <Select value={cadence} onValueChange={(v) => setCadence(v as CheckInCadence)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="fortnightly">Fortnightly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
          <Button size="sm" onClick={handleCreate} disabled={saving || !partnerId}>
            {saving ? "Saving…" : "Save Pair"}
          </Button>
        </div>
      </div>
    );
  }

  // Display existing pair
  const isMentor = pair!.mentor_id === currentTeacherId;
  const partnerName = isMentor ? "Mentee" : "Mentor";
  const CADENCE_LABELS: Record<CheckInCadence, string> = { weekly: "Weekly", fortnightly: "Fortnightly", monthly: "Monthly" };

  return (
    <Card className="shadow-none border-border/60">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{teacherName}</span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{partnerName}</span>
          <span className="ml-auto text-xs text-muted-foreground">{CADENCE_LABELS[pair!.check_in_cadence as CheckInCadence]}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Last check-in: {formatRelative(pair!.last_checkin_at)}</span>
          <Button
            variant="outline" size="sm" className="h-7 text-xs"
            onClick={() => onUpdateCheckIn(pair!.id)}
          >
            Update Check-in
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
