"use client";

import { useState } from "react";
import { PageContainer } from "@/components/PageContainer";
import { MeetingNoteCard, MeetingNoteCreateForm } from "@/components/department/MeetingNoteCard";
import { RecognitionCard, RecognitionCreateSheet } from "@/components/department/RecognitionCard";
import { useDepartmentCollaboration } from "@/hooks/useDepartmentCollaboration";
import { useCoaching } from "@/hooks/useCoaching";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Star, CheckSquare, MessageSquare } from "lucide-react";
import { ActionItem } from "@/types";

interface Props {
  schoolId: string | null;
  userId: string;
  isHod: boolean;
}

function PendingActionItem({ item, onToggle }: { item: ActionItem; onToggle: (id: string) => void }) {
  return (
    <div className="flex items-start gap-2 py-2 px-3 rounded-lg bg-muted/30 border border-border/40">
      <button
        onClick={() => onToggle(item.id)}
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Mark complete"
      >
        <CheckSquare className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">{item.description}</p>
        {item.due_date && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Due {new Date(item.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </p>
        )}
      </div>
    </div>
  );
}

export function DepartmentView({ schoolId, userId, isHod }: Props) {
  const { meetingNotes, actionItems, recognitions, loading, createMeetingNote, toggleActionItem, createRecognition } =
    useDepartmentCollaboration(schoolId, userId, isHod);
  const { profiles } = useCoaching(schoolId, isHod ? userId : null);

  const teachers = profiles.map((p) => ({ id: p.teacherId, name: p.teacherName }));

  const [createNoteOpen, setCreateNoteOpen] = useState(false);
  const [recognizeOpen, setRecognizeOpen] = useState(false);

  if (loading) {
    return (
      <PageContainer title="Department">
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Department"
      description={isHod ? "Meeting notes, action items, and team recognitions" : "Department updates and your action items"}
      action={
        isHod ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setRecognizeOpen(true)}>
              <Star className="h-3.5 w-3.5" style={{ color: "var(--recognition-accent)" }} />
              Recognise
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setCreateNoteOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Meeting Note
            </Button>
          </div>
        ) : undefined
      }
    >
      {/* Pending action items */}
      {actionItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pt-2 border-t border-border/40">
            Pending Actions
          </h2>
          <div className="space-y-1.5">
            {actionItems.map((item) => (
              <PendingActionItem key={item.id} item={item} onToggle={toggleActionItem} />
            ))}
          </div>
        </section>
      )}

      {/* Inline create form */}
      {createNoteOpen && (
        <MeetingNoteCreateForm
          teachers={teachers}
          onSave={async (data) => { await createMeetingNote(data); setCreateNoteOpen(false); }}
          onCancel={() => setCreateNoteOpen(false)}
        />
      )}

      {/* Meeting notes feed */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pt-2 border-t border-border/40">
          Meeting Notes
        </h2>
        {meetingNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-36 border border-dashed border-border rounded-lg gap-2">
            <MessageSquare className="h-7 w-7 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {isHod ? "No meeting notes yet. Record your first department meeting." : "No meeting notes shared yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {meetingNotes.map((note) => (
              <MeetingNoteCard key={note.id} note={note} onToggleAction={toggleActionItem} isHod={isHod} />
            ))}
          </div>
        )}
      </section>

      {/* Recognitions */}
      {recognitions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pt-2 border-t border-border/40">
            {isHod ? "Recognitions" : "My Recognitions"}
          </h2>
          <div className="space-y-2">
            {recognitions.map((r) => <RecognitionCard key={r.id} recognition={r} />)}
          </div>
        </section>
      )}

      <RecognitionCreateSheet
        open={recognizeOpen}
        onClose={() => setRecognizeOpen(false)}
        teachers={teachers}
        onSave={createRecognition}
      />
    </PageContainer>
  );
}
