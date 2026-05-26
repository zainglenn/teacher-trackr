"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, ArrowLeft, BookOpen } from "lucide-react";
import { Standard } from "@/types";
import { useStandardSkills, StandardSkill } from "@/hooks/useStandardSkills";
import { StandardDeliveryStatus } from "@/hooks/useCoverageFromDelivery";

const GENRE_COLOURS: Record<string, string> = {
  "Argument Writing":                 "bg-rose-50 border-rose-200 text-rose-700",
  "Informative/Explanatory Writing":  "bg-blue-50 border-blue-200 text-blue-700",
  "Narrative Writing":                "bg-amber-50 border-amber-200 text-amber-700",
  "Writing Quality":                  "bg-emerald-50 border-emerald-200 text-emerald-700",
  "Writing Process":                  "bg-violet-50 border-violet-200 text-violet-700",
  "Digital Writing":                  "bg-cyan-50 border-cyan-200 text-cyan-700",
  "Research":                         "bg-orange-50 border-orange-200 text-orange-700",
  "Source Use":                       "bg-indigo-50 border-indigo-200 text-indigo-700",
  "Text Evidence":                    "bg-teal-50 border-teal-200 text-teal-700",
  "Writing Stamina":                  "bg-pink-50 border-pink-200 text-pink-700",
};

interface StandardContextViewProps {
  standard: Standard;
  onBack: () => void;
  preloadedSkills?: StandardSkill[];
  deliveryStatus?: StandardDeliveryStatus | null;
}

export function StandardContextView({ standard, onBack, preloadedSkills, deliveryStatus }: StandardContextViewProps) {
  const { skills: fetchedSkills } = useStandardSkills(preloadedSkills ? null : standard.id);
  const skills = preloadedSkills ?? fetchedSkills;

  const byGenre = skills.reduce<Record<string, StandardSkill[]>>((acc, skill) => {
    const key = skill.genre ?? "__none__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(skill);
    return acc;
  }, {});
  const hasGenres = skills.some((s) => s.genre !== null);
  const genreKeys = Object.keys(byGenre).filter((k) => k !== "__none__");
  const ungrouped = byGenre["__none__"] ?? [];

  const isGap = !deliveryStatus || deliveryStatus.status === "gap";
  const skillsCovered = deliveryStatus?.status === "covered";

  const statusBg = deliveryStatus?.status === "covered"
    ? "var(--status-taught-bg)"
    : deliveryStatus?.status === "in_progress"
    ? "var(--status-behind-bg)"
    : "var(--status-pending-bg)";
  const statusText = deliveryStatus?.status === "covered"
    ? "var(--status-taught-text)"
    : deliveryStatus?.status === "in_progress"
    ? "var(--status-behind-text)"
    : "var(--status-pending-text)";
  const statusBorder = deliveryStatus?.status === "covered"
    ? "var(--status-taught-border)"
    : deliveryStatus?.status === "in_progress"
    ? "var(--status-behind-border)"
    : "var(--status-pending-border)";
  const statusLabel = deliveryStatus?.status === "covered"
    ? "Covered"
    : deliveryStatus?.status === "in_progress"
    ? "In Progress"
    : "Planned";

  return (
    <div className="space-y-5">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      {/* Standard identity */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <Badge variant="outline" className="font-mono text-sm">{standard.code}</Badge>
          <Badge variant="secondary" className="text-xs">{standard.strand}</Badge>
        </div>
        <p className="text-base font-medium">{standard.description}</p>
      </div>

      {/* Unit delivery context */}
      {!isGap && deliveryStatus && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Unit Coverage</div>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{deliveryStatus.unitTitle}</p>
              <span className="text-xs text-muted-foreground shrink-0">Term {deliveryStatus.term}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${deliveryStatus.totalWeeks > 0 ? Math.round((deliveryStatus.deliveredWeeks / deliveryStatus.totalWeeks) * 100) : 0}%`,
                    backgroundColor: `var(--term-${deliveryStatus.term}-accent)`,
                  }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {deliveryStatus.deliveredWeeks}/{deliveryStatus.totalWeeks} weeks taught
              </span>
            </div>
            <span
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border"
              style={{ background: statusBg, color: statusText, borderColor: statusBorder }}
            >
              {deliveryStatus.status === "covered" ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
              {statusLabel}
            </span>
          </CardContent>
        </Card>
      )}

      {/* Gap prompt */}
      {isGap && (
        <div
          className="rounded-xl border p-4"
          style={{ background: "var(--status-overdue-bg)", borderColor: "var(--status-overdue-border)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--status-overdue-text)" }}>
            This standard is not mapped to any unit
          </p>
          <p className="text-xs mt-1 opacity-80" style={{ color: "var(--status-overdue-text)" }}>
            Add this standard to a unit in your Long Term Plan to start tracking coverage.
          </p>
        </div>
      )}

      {/* Skills list — read-only */}
      {hasGenres ? (
        <div className="space-y-4">
          {genreKeys.map((genre) => {
            const genreSkills = byGenre[genre];
            const colourClass = GENRE_COLOURS[genre] ?? "bg-muted border-border text-muted-foreground";
            return (
              <Card key={genre}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">{genre}</span>
                    <Badge className={`text-xs border ml-auto ${colourClass}`}>
                      {genreSkills.length} skills
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    {genreSkills.map((skill) => (
                      <ReadOnlySkillRow key={skill.id} skill={skill} covered={skillsCovered} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {ungrouped.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-1.5">
                {ungrouped.map((skill) => (
                  <ReadOnlySkillRow key={skill.id} skill={skill} covered={skillsCovered} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Skills & Success Criteria
            </div>
            <div className="space-y-1.5">
              {ungrouped.map((skill) => (
                <ReadOnlySkillRow key={skill.id} skill={skill} covered={skillsCovered} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReadOnlySkillRow({ skill, covered }: { skill: StandardSkill; covered: boolean }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 shrink-0">
        {covered
          ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          : <Circle className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <Badge variant="outline" className="font-mono text-xs mb-1">{skill.code}</Badge>
        <p className="text-sm text-foreground/80">{skill.description}</p>
      </div>
    </div>
  );
}

export { StandardContextView as StandardDetailView };
