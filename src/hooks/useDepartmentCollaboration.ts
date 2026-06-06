"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { MeetingNote, ActionItem, Recognition } from "@/types";

export function useDepartmentCollaboration(schoolId: string | null, userId: string, isHod: boolean) {
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [recognitions, setRecognitions] = useState<Recognition[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!schoolId) { setLoading(false); return; }
    setLoading(true);

    const [notesRes, actionsRes, recogRes] = await Promise.all([
      isHod
        ? supabase.from("meeting_notes").select("*").eq("school_id", schoolId).order("meeting_date", { ascending: false })
        : supabase.from("meeting_notes").select("*").eq("school_id", schoolId).contains("attendee_ids", [userId]).order("meeting_date", { ascending: false }),
      supabase.from("action_items").select("*, meeting_note:meeting_notes(school_id)").eq("assignee_id", userId).is("completed_at", null).order("due_date", { ascending: true }),
      isHod
        ? supabase.from("recognitions").select("*").eq("school_id", schoolId).order("created_at", { ascending: false })
        : supabase.from("recognitions").select("*").eq("teacher_id", userId).order("created_at", { ascending: false }),
    ]);

    const notes = (notesRes.data ?? []) as MeetingNote[];

    // Attach action items to notes
    if (isHod && notes.length > 0) {
      const noteIds = notes.map((n) => n.id);
      const { data: allActions } = await supabase
        .from("action_items")
        .select("*")
        .in("meeting_note_id", noteIds)
        .order("created_at");
      const actionsByNote = new Map<string, ActionItem[]>();
      for (const a of (allActions ?? []) as ActionItem[]) {
        if (!actionsByNote.has(a.meeting_note_id)) actionsByNote.set(a.meeting_note_id, []);
        actionsByNote.get(a.meeting_note_id)!.push(a);
      }
      setMeetingNotes(notes.map((n) => ({ ...n, action_items: actionsByNote.get(n.id) ?? [] })));
    } else {
      setMeetingNotes(notes);
    }

    setActionItems((actionsRes.data ?? []) as ActionItem[]);
    setRecognitions((recogRes.data ?? []) as Recognition[]);
    setLoading(false);
  }, [schoolId, userId, isHod]);

  useEffect(() => { load(); }, [load]);

  async function createMeetingNote(data: {
    meeting_date: string;
    agenda: string;
    notes: string;
    attendee_ids: string[];
    action_items_data: { assignee_id: string; description: string; due_date?: string }[];
  }) {
    if (!schoolId) return;
    const { data: note } = await supabase
      .from("meeting_notes")
      .insert({ hod_id: userId, school_id: schoolId, meeting_date: data.meeting_date, agenda: data.agenda, notes: data.notes, attendee_ids: data.attendee_ids })
      .select("*").single();
    if (!note) return;

    const newNote = note as MeetingNote;
    let newActions: ActionItem[] = [];
    if (data.action_items_data.length > 0) {
      const { data: actions } = await supabase
        .from("action_items")
        .insert(data.action_items_data.map((a) => ({ ...a, meeting_note_id: newNote.id })))
        .select("*");
      newActions = (actions ?? []) as ActionItem[];
    }
    setMeetingNotes((prev) => [{ ...newNote, action_items: newActions }, ...prev]);
  }

  async function toggleActionItem(id: string) {
    const existing = actionItems.find((a) => a.id === id);
    const completed_at = existing?.completed_at ? null : new Date().toISOString();
    await supabase.from("action_items").update({ completed_at }).eq("id", id);
    setActionItems((prev) =>
      completed_at
        ? prev.filter((a) => a.id !== id) // remove from pending list when completed
        : prev
    );
    // Also update in meeting notes
    setMeetingNotes((prev) => prev.map((n) => ({
      ...n,
      action_items: n.action_items?.map((a) => a.id === id ? { ...a, completed_at } : a),
    })));
  }

  async function createRecognition(data: { teacher_id: string; unit_id?: string; note: string }) {
    if (!schoolId) return;
    const { data: row } = await supabase
      .from("recognitions")
      .insert({ ...data, hod_id: userId, school_id: schoolId })
      .select("*").single();
    if (row) setRecognitions((prev) => [row as Recognition, ...prev]);
  }

  return { meetingNotes, actionItems, recognitions, loading, createMeetingNote, toggleActionItem, createRecognition };
}
