export type Role = "teacher" | "hod";

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
  standards?: Standard[];
  assignedTeacher?: Profile | null;
}

export interface LongTermPlan {
  id: string;
  teacher_id: string;
  title: string;
  school_year: string;
  status: LTPStatus;
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
