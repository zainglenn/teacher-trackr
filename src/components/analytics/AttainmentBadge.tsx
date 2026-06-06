"use client";

import { Attainment } from "@/types";

const CONFIG: Record<Attainment, { label: string; bg: string; text: string; border: string }> = {
  not_assessed: {
    label: "Not Assessed",
    bg: "var(--attainment-not-assessed-bg)",
    text: "var(--attainment-not-assessed-text)",
    border: "var(--attainment-not-assessed-border)",
  },
  below: {
    label: "Below",
    bg: "var(--attainment-below-bg)",
    text: "var(--attainment-below-text)",
    border: "var(--attainment-below-border)",
  },
  approaching: {
    label: "Approaching",
    bg: "var(--attainment-approaching-bg)",
    text: "var(--attainment-approaching-text)",
    border: "var(--attainment-approaching-border)",
  },
  meeting: {
    label: "Meeting",
    bg: "var(--attainment-meeting-bg)",
    text: "var(--attainment-meeting-text)",
    border: "var(--attainment-meeting-border)",
  },
  exceeding: {
    label: "Exceeding",
    bg: "var(--attainment-exceeding-bg)",
    text: "var(--attainment-exceeding-text)",
    border: "var(--attainment-exceeding-border)",
  },
};

interface Props {
  attainment: Attainment;
  size?: "sm" | "md";
}

export function AttainmentBadge({ attainment, size = "sm" }: Props) {
  const c = CONFIG[attainment];
  return (
    <span
      className={`inline-flex items-center rounded font-medium border ${size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs"}`}
      style={{ background: c.bg, color: c.text, borderColor: c.border }}
    >
      {c.label}
    </span>
  );
}
