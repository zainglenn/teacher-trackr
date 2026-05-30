export type SubjectSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export const SUBJECT_SLOTS: SubjectSlot[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const SLOT_LABELS: Record<SubjectSlot, string> = {
  1: "Teal",
  2: "Orange",
  3: "Fuchsia",
  4: "Lime",
  5: "Yellow",
  6: "Sky",
  7: "Rose",
  8: "Violet",
  9: "Emerald",
  10: "Indigo",
  11: "Pink",
};

export function getSubjectSlotStyle(slot: SubjectSlot): {
  background: string;
  color: string;
  borderColor: string;
  accentColor: string;
} {
  return {
    background:  `var(--subject-slot-${slot}-bg)`,
    color:       `var(--subject-slot-${slot}-text)`,
    borderColor: `var(--subject-slot-${slot}-border)`,
    accentColor: `var(--subject-slot-${slot}-accent)`,
  };
}

export function getSlotLabel(slot: SubjectSlot): string {
  return SLOT_LABELS[slot];
}

export function nextAvailableSlot(usedSlots: SubjectSlot[]): SubjectSlot {
  for (const slot of SUBJECT_SLOTS) {
    if (!usedSlots.includes(slot)) return slot;
  }
  return 1;
}
