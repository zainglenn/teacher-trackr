export type Role = "teacher" | "hod" | "admin" | "platform_admin";

export interface School {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Subject {
  id: string;
  school_id: string | null;
  name: string;
  slot: 1 | 2 | 3 | 4 | 5 | 6;
  created_at: string;
}

export interface GradeLevel {
  id: string;
  school_id: string | null;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface StandardSet {
  id: string;
  school_id: string | null;
  subject_id: string;
  grade_level_id: string;
  name: string;
  created_at: string;
  subject?: Subject;
  grade_level?: GradeLevel;
}

export interface ClassAssignment {
  id: string;
  school_id: string | null;
  teacher_id: string;
  subject_id: string;
  grade_level_id: string;
  is_lead: boolean;
  created_at: string;
  teacher?: Pick<Profile, "id" | "full_name" | "username">;
  subject?: Subject;
  grade_level?: GradeLevel;
}

export interface Profile {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  role: Role;
  notification_email: string | null;
  subject_id: string | null;
  school_id: string | null;
  created_at: string;
}

export interface Standard {
  id: string;
  code: string;
  strand: string;
  description: string;
  standard_set_id: string | null;
  created_at: string;
  // present when fetched via ltp_unit_standards join
  is_priority?: boolean;
}

export interface CoverageLog {
  id: string;
  teacher_id: string;
  standard_id: string;
  taught_date: string;
  notes: string | null;
  created_at: string;
}

export type LTPStatus = "draft" | "submitted" | "approved" | "revision" | "published";
export type { UnitStatus, ComputedLTPStatus } from "@/lib/ltpStatus";

export interface AssessmentRow {
  id: string;
  type: string;
  when: string;
  assessment: string;
  purpose: string;
  tool: string;
}

export interface StandardAssessment {
  standard_id: string;
  standard_code: string;
  task: string;
  assessment_type: "formative" | "summative";
}

export interface AnchorText {
  title: string;
  type: "literary" | "informational";
  complexity?: string;
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
  rejection_reason: string | null;
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
  anchor_text_details: AnchorText[] | null;
  standard_assessments: StandardAssessment[] | null;
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

export type LTPMemberRole = "contributor" | "lead";

export interface LTPMember {
  id: string;
  plan_id: string;
  teacher_id: string;
  role: LTPMemberRole;
  created_at: string;
  teacher?: Pick<Profile, "id" | "email" | "full_name">;
}

export interface LongTermPlan {
  id: string;
  teacher_id: string;
  title: string;
  school_year: string;
  status: LTPStatus;
  class_id: string | null;
  school_id: string | null;
  subject_id: string | null;
  grade_level_id: string | null;
  hod_feedback: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  units?: LTPUnit[];
  teacher?: Profile;
  members?: LTPMember[];
  subject?: Subject;
  grade_level?: GradeLevel;
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
