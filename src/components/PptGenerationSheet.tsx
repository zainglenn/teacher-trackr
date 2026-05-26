"use client";

import { useState } from "react";
import { Presentation, Download, RefreshCw, ChevronLeft, ChevronRight, AlertCircle, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StrandBadge } from "@/components/ltp/StrandBadge";
import { LessonWeek } from "@/types";

interface SlidePreview {
  index: number;
  title: string;
  content: string;
  type: "title" | "objectives" | "standards" | "activities" | "vocabulary" | "exit";
  enabled: boolean;
}

function buildPreviews(week: LessonWeek, unitTitle: string, vocabulary: string[]): SlidePreview[] {
  return [
    {
      index: 1,
      title: "Title Slide",
      content: `${unitTitle}\nWeek ${week.week}`,
      type: "title",
      enabled: true,
    },
    {
      index: 2,
      title: "Learning Objectives",
      content: week.focus || "Students will explore key concepts.",
      type: "objectives",
      enabled: true,
    },
    {
      index: 3,
      title: "Standards",
      content: week.standards.join(", ") || "No standards mapped",
      type: "standards",
      enabled: week.standards.length > 0,
    },
    {
      index: 4,
      title: "Activities",
      content: week.activities || "See unit plan for activities.",
      type: "activities",
      enabled: true,
    },
    {
      index: 5,
      title: "Key Vocabulary",
      content: vocabulary.slice(0, 6).join(", ") || "No vocabulary defined",
      type: "vocabulary",
      enabled: vocabulary.length > 0,
    },
    {
      index: 6,
      title: "Exit Ticket",
      content: "What is one thing you learned today?\nWhat is one question you still have?",
      type: "exit",
      enabled: true,
    },
  ];
}

const SLIDE_ICONS: Record<SlidePreview["type"], string> = {
  title: "T",
  objectives: "✦",
  standards: "S",
  activities: "A",
  vocabulary: "V",
  exit: "E",
};

const SLIDE_ACCENTS: Record<SlidePreview["type"], React.CSSProperties> = {
  title:       { background: "#1E293B", color: "#FFFFFF" },
  objectives:  { background: "#EFF6FF", color: "#1E40AF", borderColor: "#DBEAFE" },
  standards:   { background: "#F5F3FF", color: "#5B21B6", borderColor: "#EDE9FE" },
  activities:  { background: "#F0FDF4", color: "#065F46", borderColor: "#D1FAE5" },
  vocabulary:  { background: "#F8FAFC", color: "#1E293B", borderColor: "#E2E8F0" },
  exit:        { background: "#1E293B", color: "#FFFFFF" },
};

interface PptGenerationSheetProps {
  open: boolean;
  onClose: () => void;
  unitId: string;
  unitTitle: string;
  week: LessonWeek;
  classId?: string;
  vocabulary?: string[];
}

export function PptGenerationSheet({
  open,
  onClose,
  unitId,
  unitTitle,
  week,
  classId,
  vocabulary = [],
}: PptGenerationSheetProps) {
  const [slides, setSlides] = useState<SlidePreview[]>(() => buildPreviews(week, unitTitle, vocabulary));
  const [activeSlide, setActiveSlide] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  const enabledSlides = slides.filter((s) => s.enabled);
  const current = enabledSlides[activeSlide] ?? enabledSlides[0];

  function toggleSlide(index: number) {
    setSlides((prev) =>
      prev.map((s) => {
        if (s.index !== index) return s;
        // Title slide always required
        if (s.type === "title") return s;
        return { ...s, enabled: !s.enabled };
      })
    );
    setActiveSlide(0);
  }

  function editContent(slideIndex: number, content: string) {
    setSlides((prev) =>
      prev.map((s) => (s.index === slideIndex ? { ...s, content } : s))
    );
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setDownloaded(false);

    // Build overrides from edited slides
    const overrides: Record<number, { content: string }> = {};
    slides.forEach((s) => { overrides[s.index] = { content: s.content }; });

    try {
      const res = await fetch("/api/generate-ppt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ unitId, weekNumber: week.week, classId, overrides }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Generation failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Week-${week.week}-${unitTitle.replace(/\s+/g, "-")}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Presentation className="h-4 w-4 text-muted-foreground" />
            <SheetTitle className="text-sm font-semibold">Generate Lesson Slides</SheetTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Week {week.week} — {week.focus || unitTitle}
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* ── Slide preview ──────────────────────────────────────────────── */}
          {current && (
            <div className="px-5 py-4">
              <div
                className="rounded-xl border aspect-video flex flex-col items-start justify-center px-6 py-4 relative overflow-hidden"
                style={SLIDE_ACCENTS[current.type]}
              >
                {/* Slide type badge */}
                <span className="absolute top-3 right-3 text-[10px] font-mono opacity-40">
                  {SLIDE_ICONS[current.type]} {current.index}/{enabledSlides.length}
                </span>

                <p className="text-[11px] font-semibold uppercase tracking-widest opacity-50 mb-1">
                  {current.title}
                </p>
                <p className="text-base font-medium leading-snug whitespace-pre-line">
                  {current.content.length > 120 ? current.content.slice(0, 120) + "…" : current.content}
                </p>

                {current.type === "standards" && week.standards.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {week.standards.map((code) => (
                      <StrandBadge key={code} code={code} />
                    ))}
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={() => setActiveSlide((v) => Math.max(0, v - 1))}
                  disabled={activeSlide === 0}
                  className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 transition-colors"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="flex gap-1.5">
                  {enabledSlides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveSlide(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        i === activeSlide ? "bg-foreground" : "bg-muted-foreground/30"
                      }`}
                      aria-label={`Slide ${i + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => setActiveSlide((v) => Math.min(enabledSlides.length - 1, v + 1))}
                  disabled={activeSlide === enabledSlides.length - 1}
                  className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 transition-colors"
                  aria-label="Next slide"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Edit current slide content */}
              <div className="mt-3">
                <label className="text-xs text-muted-foreground mb-1 block">
                  Edit slide content
                </label>
                <textarea
                  className="w-full text-xs border rounded-lg px-3 py-2 resize-none bg-background focus:outline-none focus:ring-2 focus:ring-ring min-h-[72px]"
                  value={current.content}
                  onChange={(e) => editContent(current.index, e.target.value)}
                />
                {current.content !== buildPreviews(week, unitTitle, vocabulary).find((s) => s.index === current.index)?.content && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">✎ Modified</p>
                )}
              </div>
            </div>
          )}

          {/* ── Slide toggles ─────────────────────────────────────────────── */}
          <div className="px-5 pb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Include slides
            </p>
            <div className="space-y-1.5">
              {slides.map((slide) => (
                <label
                  key={slide.index}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    slide.enabled ? "bg-background" : "bg-muted/40 opacity-60"
                  } ${slide.type === "title" ? "cursor-not-allowed" : ""}`}
                >
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border-2 ${
                      slide.enabled ? "border-foreground bg-foreground" : "border-muted-foreground"
                    }`}
                  >
                    {slide.enabled && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={slide.enabled}
                    disabled={slide.type === "title"}
                    onChange={() => toggleSlide(slide.index)}
                  />
                  <span className="text-xs font-medium">{slide.title}</span>
                  {slide.type === "title" && (
                    <Badge variant="outline" className="text-[10px] ml-auto">Required</Badge>
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer actions ─────────────────────────────────────────────────── */}
        <div className="border-t px-5 py-4 shrink-0 space-y-2">
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
              style={{ background: "var(--status-overdue-bg)", color: "var(--status-overdue-text)" }}
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} className="text-xs underline">Dismiss</button>
            </div>
          )}

          {generating && (
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full animate-pulse"
                style={{ width: "60%", background: "var(--strand-sl-accent)" }}
                role="progressbar"
                aria-label="Generating presentation"
              />
            </div>
          )}

          <div className="flex gap-2">
            {downloaded && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleGenerate}
                disabled={generating}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Regenerate
              </Button>
            )}
            <Button
              size="sm"
              className="flex-1"
              onClick={handleGenerate}
              disabled={generating}
              aria-label={`Download Week ${week.week} slides for ${unitTitle}`}
            >
              {generating ? (
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Building slides…
                </span>
              ) : downloaded ? (
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  Download again
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Download .pptx
                </span>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
