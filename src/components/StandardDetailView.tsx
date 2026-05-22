"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Circle, ArrowLeft, BookOpen } from "lucide-react";
import { Standard } from "@/types";
import { useStandardSkills } from "@/hooks/useStandardSkills";
import { StandardSkill } from "@/hooks/useStandardSkills";
import { useSkillCoverage } from "@/hooks/useSkillCoverage";

const GENRE_COLOURS: Record<string, string> = {
  "Argument Writing":           "bg-rose-50 border-rose-200 text-rose-700",
  "Informative/Explanatory Writing": "bg-blue-50 border-blue-200 text-blue-700",
  "Narrative Writing":          "bg-amber-50 border-amber-200 text-amber-700",
  "Writing Quality":            "bg-emerald-50 border-emerald-200 text-emerald-700",
  "Writing Process":            "bg-violet-50 border-violet-200 text-violet-700",
  "Digital Writing":            "bg-cyan-50 border-cyan-200 text-cyan-700",
  "Research":                   "bg-orange-50 border-orange-200 text-orange-700",
  "Source Use":                 "bg-indigo-50 border-indigo-200 text-indigo-700",
  "Text Evidence":              "bg-teal-50 border-teal-200 text-teal-700",
  "Writing Stamina":            "bg-pink-50 border-pink-200 text-pink-700",
};

interface StandardDetailViewProps {
  standard: Standard;
  teacherId: string;
  classId?: string | null;
  onBack: () => void;
  preloadedSkills?: StandardSkill[];
  coveredSkillIds?: Set<string>;
}

export function StandardDetailView({ standard, teacherId, classId, onBack, preloadedSkills, coveredSkillIds: externalCovered }: StandardDetailViewProps) {
  const { skills: fetchedSkills, byGenre: fetchedByGenre, hasGenres: fetchedHasGenres, loading } = useStandardSkills(
    preloadedSkills ? null : standard.id
  );
  const skills = preloadedSkills ?? fetchedSkills;

  const byGenre = skills.reduce<Record<string, StandardSkill[]>>((acc, skill) => {
    const key = skill.genre ?? "__none__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(skill);
    return acc;
  }, {});
  const hasGenres = skills.some((s) => s.genre !== null);
  void fetchedByGenre; void fetchedHasGenres;

  const { isCovered: fetchedIsCovered, markSkill, unmarkSkill } = useSkillCoverage(teacherId, classId);
  const isCovered = externalCovered
    ? (skillId: string) => externalCovered.has(skillId)
    : fetchedIsCovered;
  const [markingSkill, setMarkingSkill] = useState<StandardSkill | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const coveredCount = skills.filter((s) => isCovered(s.id)).length;
  const pct = skills.length > 0 ? Math.round((coveredCount / skills.length) * 100) : 0;

  async function handleMark() {
    if (!markingSkill) return;
    setSaving(true);
    await markSkill(markingSkill.id, date, notes);
    setSaving(false);
    setMarkingSkill(null);
    setNotes("");
  }

  const genreKeys = Object.keys(byGenre).filter((k) => k !== "__none__");
  const ungrouped = byGenre["__none__"] ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="mt-0.5 shrink-0 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="font-mono text-sm">{standard.code}</Badge>
          <Badge variant="secondary" className="text-xs">{standard.strand}</Badge>
        </div>
        <p className="text-base font-medium mt-2">{standard.description}</p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Skills covered</span>
            <span className="text-muted-foreground">{coveredCount} / {skills.length}</span>
          </div>
          <Progress value={pct} className="h-2" />
          {pct === 100 && (
            <p className="text-xs text-emerald-600 font-medium">All skills covered — standard achieved!</p>
          )}
        </CardContent>
      </Card>

      {loading ? null : hasGenres ? (
        // Genre-grouped (Writing standards)
        <div className="space-y-4">
          {genreKeys.map((genre) => {
            const genreSkills = byGenre[genre];
            const genreCovered = genreSkills.filter((s) => isCovered(s.id)).length;
            const colourClass = GENRE_COLOURS[genre] ?? "bg-muted border-border text-muted-foreground";

            return (
              <Card key={genre}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-semibold">{genre}</CardTitle>
                    </div>
                    <Badge className={`text-xs border ${colourClass}`}>
                      {genreCovered}/{genreSkills.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {genreSkills.map((skill) => (
                    <SkillRow
                      key={skill.id}
                      skill={skill}
                      covered={isCovered(skill.id)}
                      onMark={() => { setMarkingSkill(skill); setDate(new Date().toISOString().split("T")[0]); setNotes(""); }}
                      onUnmark={() => unmarkSkill(skill.id)}
                    />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        // Flat list (non-writing standards)
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Skills & Success Criteria</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {ungrouped.map((skill) => (
              <SkillRow
                key={skill.id}
                skill={skill}
                covered={isCovered(skill.id)}
                onMark={() => { setMarkingSkill(skill); setDate(new Date().toISOString().split("T")[0]); setNotes(""); }}
                onUnmark={() => unmarkSkill(skill.id)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Mark skill dialog */}
      <Dialog open={!!markingSkill} onOpenChange={(o) => !o && setMarkingSkill(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Skill as Taught</DialogTitle>
          </DialogHeader>
          {markingSkill && (
            <div className="space-y-4 py-2">
              <div className="bg-muted rounded-lg p-3 text-sm">
                <Badge variant="outline" className="font-mono mb-1">{markingSkill.code}</Badge>
                {markingSkill.genre && (
                  <Badge className={`ml-1 mb-1 text-xs border ${GENRE_COLOURS[markingSkill.genre] ?? ""}`}>
                    {markingSkill.genre}
                  </Badge>
                )}
                <p className="text-muted-foreground mt-1">{markingSkill.description}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Date Taught</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="How was this skill taught? Any observations..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkingSkill(null)}>Cancel</Button>
            <Button onClick={handleMark} disabled={saving}>
              {saving ? "Saving..." : "Mark as Taught"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SkillRow({
  skill,
  covered,
  onMark,
  onUnmark,
}: {
  skill: StandardSkill;
  covered: boolean;
  onMark: () => void;
  onUnmark: () => void;
}) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
      covered ? "bg-emerald-50 border-emerald-200" : "bg-background border-border"
    }`}>
      <div className="mt-0.5 shrink-0">
        {covered
          ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          : <Circle className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <Badge variant="outline" className="font-mono text-xs mb-1">{skill.code}</Badge>
        <p className="text-sm text-foreground/80">{skill.description}</p>
      </div>
      <div className="shrink-0">
        {covered ? (
          <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground hover:text-rose-600" onClick={onUnmark}>
            Unmark
          </Button>
        ) : (
          <Button size="sm" className="text-xs h-7" onClick={onMark}>
            Mark
          </Button>
        )}
      </div>
    </div>
  );
}
