export type Role = "teacher" | "hod" | "admin";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  created_at: string;
}

export interface Standard {
  id: string;
  code: string;
  strand: string;
  description: string;
  created_at: string;
}

export interface CoverageLog {
  id: string;
  teacher_id: string;
  standard_id: string;
  taught_date: string;
  notes: string | null;
  created_at: string;
}

export type LTPStatus = "draft" | "submitted" | "approved" | "revision";
export type { UnitStatus, ComputedLTPStatus } from "@/lib/ltpStatus";

export interface AssessmentRow {
  id: string;
  type: string;
  when: string;
  assessment: string;
  purpose: string;
  tool: string;
}

export interface LessonWeek {
  week: number;
  focus: string;
  activities: string;
  standards: string[];
}

export interface LTPUnit {
  id: string;
  ltp_id: string;
  term: number;
  unit_number: number;
  title: string;
  big_idea: string | null;
  start_week: number | null;
  duration_weeks: number;
  assessment_type: "formative" | "summative" | "both";
  sort_order: number;
  assigned_to: string | null;
  created_at: string;
  status: import("@/lib/ltpStatus").UnitStatus;
  hod_feedback: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  // rich content fields
  big_ideas: string[] | null;
  enduring_understandings: string[] | null;
  real_world_connections: string | null;
  learning_outcomes: string[] | null;
  success_criteria: string[] | null;
  assessment_plan: AssessmentRow[] | null;
  lesson_sequence: LessonWeek[] | null;
  anchor_texts: string[] | null;
  mentor_texts: string[] | null;
  multimedia: string[] | null;
  vocabulary: string[] | null;
  diff_ell: string[] | null;
  diff_intervention: string[] | null;
  diff_enrichment: string[] | null;
  diff_accessibility: string[] | null;
  final_product: string | null;
  teacher_reflection: string | null;
  student_self_assessment: string | null;
  standards?: Standard[];
  assignedTeacher?: Profile | null;
}

export interface LongTermPlan {
  id: string;
  teacher_id: string;
  title: string;
  school_year: string;
  status: LTPStatus;
  class_id: string | null;
  hod_feedback: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  units?: LTPUnit[];
  teacher?: Profile;
}

export interface Class {
  id: string;
  teacher_id: string;
  name: string;
  school_year: string;
  created_at: string;
}

export interface Student {
  id: string;
  teacher_id: string;
  class_id: string | null;
  full_name: string;
  student_number: string | null;
  created_at: string;
}

export type Attainment = "not_assessed" | "below" | "approaching" | "meeting" | "exceeding";

export interface StudentProgress {
  id: string;
  student_id: string;
  standard_id: string;
  attainment: Attainment;
  assessed_date: string | null;
  notes: string | null;
  updated_at: string;
}
