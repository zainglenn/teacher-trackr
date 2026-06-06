"use client";

import { Initiative } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp } from "lucide-react";

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  initiative: Initiative;
  onClick: () => void;
}

export function InitiativeCard({ initiative, onClick }: Props) {
  const participantCount = initiative.participants?.length ?? 0;
  const latestProgress = initiative.progress?.sort((a, b) =>
    new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  )[0];

  return (
    <Card
      className="shadow-none border-border/60 cursor-pointer hover:border-border transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-foreground">{initiative.name}</p>
            {initiative.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{initiative.description}</p>
            )}
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 text-[11px] ${
              initiative.status === "active"
                ? "border-[var(--status-taught-border)] text-[var(--status-taught-text)] bg-[var(--status-taught-bg)]"
                : "border-border text-muted-foreground"
            }`}
          >
            {initiative.status === "active" ? "Active" : "Completed"}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {participantCount} participant{participantCount !== 1 ? "s" : ""}
          </span>
          {latestProgress && initiative.metric_label && (
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              {initiative.metric_label}: {latestProgress.metric_value}
            </span>
          )}
          {initiative.start_date && (
            <span>From {formatDate(initiative.start_date)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
