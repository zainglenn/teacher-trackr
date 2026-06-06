import { NextRequest, NextResponse } from "next/server";
import { makeAdminClient, requireAdmin } from "@/lib/adminClient";

export async function DELETE(req: NextRequest) {
  const admin = makeAdminClient();
  const result = await requireAdmin(req, admin);
  if (result instanceof NextResponse) return result;
  const { callerId, schoolId } = result;

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  if (userId === callerId) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

  // Verify target belongs to this school
  if (schoolId) {
    const { data: target } = await admin.from("profiles").select("school_id").eq("id", userId).single();
    if (target?.school_id !== schoolId) {
      return NextResponse.json({ error: "User not found in this school" }, { status: 404 });
    }
  }

  // Delete user-owned data from custom tables first to clear FK constraints.
  // Tables that reference profiles.id without ON DELETE CASCADE must be cleaned
  // manually before the auth user (and its cascaded profile) can be deleted.
  const cleanupOps = [
    // Leadership suite tables
    admin.from("observations").delete().or(`hod_id.eq.${userId},teacher_id.eq.${userId}`),
    admin.from("coaching_cycles").delete().or(`hod_id.eq.${userId},teacher_id.eq.${userId}`),
    admin.from("mentoring_pairs").delete().or(`hod_id.eq.${userId},mentor_id.eq.${userId},mentee_id.eq.${userId}`),
    admin.from("pd_entries").delete().eq("teacher_id", userId),
    admin.from("interventions").delete().eq("teacher_id", userId),
    admin.from("benchmark_snapshots").delete().eq("hod_id", userId),
    admin.from("recognitions").delete().or(`hod_id.eq.${userId},teacher_id.eq.${userId}`),
    admin.from("initiative_progress").delete().eq("recorded_by", userId),
    admin.from("initiative_participants").delete().eq("teacher_id", userId),
    admin.from("initiatives").delete().eq("owner_id", userId),
    // action_items via meeting_notes (cascade handled by meeting_notes delete below)
    admin.from("meeting_notes").delete().eq("hod_id", userId),
    // Core curriculum tables
    admin.from("class_lesson_deliveries").delete().eq("teacher_id", userId),
    admin.from("coverage_logs").delete().eq("teacher_id", userId),
    admin.from("student_progress").delete().in(
      "student_id",
      (await admin.from("students").select("id").eq("teacher_id", userId)).data?.map((s: { id: string }) => s.id) ?? []
    ),
    admin.from("students").delete().eq("teacher_id", userId),
    admin.from("classes").delete().eq("teacher_id", userId),
    admin.from("class_assignments").delete().eq("teacher_id", userId),
    admin.from("ltp_members").delete().eq("teacher_id", userId),
  ];

  await Promise.allSettled(cleanupOps);

  // Delete LTPs owned by this teacher (cascades to ltp_units and ltp_unit_standards)
  await admin.from("long_term_plans").delete().eq("teacher_id", userId);

  // Delete the profile — auth.users FK constraint is now clear
  await admin.from("profiles").delete().eq("id", userId);

  // Finally delete the auth user
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
