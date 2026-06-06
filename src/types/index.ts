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
  name: string;
  subject_label: string | null;
  grade_label: string | null;
  created_at: string;
}

export interface SchoolCurriculum {
  id: string;
  school_id: string;
  standard_set_id: string;
  subject_id: string;
  grade_level_id: string;
  created_at: string;
  standard_set?: StandardSet;
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

// ── Department Leadership Suite ───────────────────────────────────────────────

export type ObservationFocusArea =
  | "literacy"
  | "differentiation"
  | "assessment"
  | "classroom_management"
  | "other";

export type CoachingStep = "observe" | "debrief" | "model" | "reflect";

export type PDType = "conference" | "workshop" | "peer_obs" | "online" | "other";

export type InterventionStatus = "active" | "monitoring" | "concluded";

export type InitiativeStatus = "active" | "completed";

export type CheckInCadence = "weekly" | "fortnightly" | "monthly";

export interface Observation {
  id: string;
  hod_id: string;
  teacher_id: string;
  school_id: string;
  date: string;
  focus_area: ObservationFocusArea;
  notes: string | null;
  next_steps: string | null;
  created_at: string;
  teacher?: Pick<Profile, "id" | "full_name" | "username">;
}

export interface CoachingCycle {
  id: string;
  hod_id: string;
  teacher_id: string;
  school_id: string;
  steps_completed: CoachingStep[];
  started_at: string;
  completed_at: string | null;
}

export interface MentoringPair {
  id: string;
  hod_id: string;
  mentor_id: string;
  mentee_id: string;
  school_id: string;
  check_in_cadence: CheckInCadence;
  last_checkin_at: string | null;
  created_at: string;
  mentor?: Pick<Profile, "id" | "full_name">;
  mentee?: Pick<Profile, "id" | "full_name">;
}

export interface PDEntry {
  id: string;
  teacher_id: string;
  school_id: string;
  pd_type: PDType;
  focus_area: string | null;
  attended_date: string;
  notes: string | null;
  created_at: string;
}

export interface BenchmarkSnapshot {
  id: string;
  hod_id: string;
  school_id: string;
  subject_id: string | null;
  grade_level_id: string | null;
  snapshot_date: string;
  strand_averages: Record<string, number>; // e.g. { RL: 72.5, RI: 65.0 }
  created_at: string;
}

export interface Intervention {
  id: string;
  teacher_id: string;
  school_id: string;
  strand_codes: string[];
  student_ids: string[];
  strategy: string;
  start_date: string;
  end_date: string | null;
  outcome_notes: string | null;
  status: InterventionStatus;
  created_at: string;
  updated_at: string;
  teacher?: Pick<Profile, "id" | "full_name">;
  student_names?: string[]; // joined for display
}

export interface MeetingNote {
  id: string;
  hod_id: string;
  school_id: string;
  meeting_date: string;
  agenda: string | null;
  notes: string | null;
  attendee_ids: string[];
  created_at: string;
  updated_at: string;
  action_items?: ActionItem[];
  attendees?: Pick<Profile, "id" | "full_name">[];
}

export interface ActionItem {
  id: string;
  meeting_note_id: string;
  assignee_id: string;
  description: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  assignee?: Pick<Profile, "id" | "full_name">;
}

export interface Recognition {
  id: string;
  hod_id: string;
  teacher_id: string;
  school_id: string;
  unit_id: string | null;
  note: string;
  created_at: string;
  teacher?: Pick<Profile, "id" | "full_name">;
  unit?: Pick<LTPUnit, "id" | "title">;
}

export interface Initiative {
  id: string;
  owner_id: string;
  school_id: string;
  name: string;
  description: string | null;
  subject_ids: string[];
  grade_level_ids: string[];
  metric_label: string | null;
  status: InitiativeStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  participants?: InitiativeParticipant[];
  progress?: InitiativeProgress[];
}

export interface InitiativeParticipant {
  id: string;
  initiative_id: string;
  teacher_id: string;
  class_id: string | null;
  created_at: string;
  teacher?: Pick<Profile, "id" | "full_name">;
}

export interface InitiativeProgress {
  id: string;
  initiative_id: string;
  recorded_by: string;
  recorded_at: string;
  metric_value: number;
  notes: string | null;
}
