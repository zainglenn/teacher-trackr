"use client";

import { useState, useCallback, useEffect } from "react";
import { BookOpen, Plus, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal, ModalFooter, ModalCancel } from "@/components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { StandardSet, Standard } from "@/types";

const VALID_STRANDS = ["RL", "RI", "W", "SL", "L"];

export function PlatformCurriculaView() {
  const [sets, setSets] = useState<StandardSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedStandards, setExpandedStandards] = useState<Record<string, Standard[]>>({});

  // Create form
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newGrade, setNewGrade] = useState("");
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<StandardSet | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Per-set add-standard form
  const [addingStdFor, setAddingStdFor] = useState<string | null>(null);
  const [stdCode, setStdCode] = useState("");
  const [stdStrand, setStdStrand] = useState("");
  const [stdDesc, setStdDesc] = useState("");
  const [stdSaving, setStdSaving] = useState(false);

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? "";
  }, []);

  const loadSets = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    const res = await fetch("/api/platform/curricula", { headers: { authorization: `Bearer ${token}` } });
    const json = await res.json();
    setSets(json.standard_sets ?? []);
    setLoading(false);
  }, [getToken]);

  useEffect(() => { loadSets(); }, [loadSets]);

  async function loadStandards(setId: string) {
    if (expandedStandards[setId]) return;
    const token = await getToken();
    const res = await fetch(`/api/platform/curricula/standards?standard_set_id=${setId}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    setExpandedStandards(prev => ({ ...prev, [setId]: json.standards ?? [] }));
  }

  function toggleExpand(setId: string) {
    if (expandedId === setId) {
      setExpandedId(null);
    } else {
      setExpandedId(setId);
      loadStandards(setId);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    setCreateError("");
    const token = await getToken();
    const res = await fetch("/api/platform/curricula", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: newName.trim(), subject_label: newSubject.trim() || null, grade_label: newGrade.trim() || null }),
    });
    const json = await res.json();
    if (json.error) { setCreateError(json.error); setSaving(false); return; }
    setNewName(""); setNewSubject(""); setNewGrade(""); setCreating(false);
    await loadSets();
    setSaving(false);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    const token = await getToken();
    await fetch("/api/platform/curricula", {
      method: "DELETE",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: deleteTarget.id }),
    });
    setSets(prev => prev.filter(s => s.id !== deleteTarget.id));
    if (expandedId === deleteTarget.id) setExpandedId(null);
    setDeleteTarget(null);
    setDeleting(false);
  }

  async function handleAddStandard(setId: string) {
    if (!stdCode.trim() || !stdStrand || !stdDesc.trim()) return;
    setStdSaving(true);
    const token = await getToken();
    const res = await fetch("/api/platform/curricula/standards", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ code: stdCode.trim(), strand: stdStrand, description: stdDesc.trim(), standard_set_id: setId }),
    });
    const json = await res.json();
    if (json.standard) {
      setExpandedStandards(prev => ({
        ...prev,
        [setId]: [...(prev[setId] ?? []), json.standard].sort((a, b) => a.code.localeCompare(b.code)),
      }));
    }
    setStdCode(""); setStdStrand(""); setStdDesc(""); setAddingStdFor(null);
    setStdSaving(false);
  }

  async function handleDeleteStandard(setId: string, stdId: string) {
    const token = await getToken();
    await fetch("/api/platform/curricula/standards", {
      method: "DELETE",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: stdId }),
    });
    setExpandedStandards(prev => ({
      ...prev,
      [setId]: (prev[setId] ?? []).filter(s => s.id !== stdId),
    }));
  }

  return (
    <>
      <div className="hidden md:block">
        <PageContainer
          title="Curricula"
          description="Platform-managed standard sets available to all schools"
          action={
            <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreating(true)}>
              <Plus className="h-3.5 w-3.5" /> New Curriculum
            </Button>
          }
        >
          {creating && (
            <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
              <p className="text-sm font-medium">New Standard Set</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3">
                  <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. NYSED Grade 6 ELA" className="h-8 text-sm"
                    onKeyDown={e => { if (e.key === "Enter") handleCreate(); }} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Subject label</label>
                  <Input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="e.g. English Language Arts" className="h-8 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Grade label</label>
                  <Input value={newGrade} onChange={e => setNewGrade(e.target.value)} placeholder="e.g. Grade 6" className="h-8 text-sm" />
                </div>
              </div>
              {createError && <p className="text-xs text-destructive">{createError}</p>}
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={handleCreate} disabled={saving || !newName.trim()}>
                  {saving ? "Creating…" : "Create"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setCreating(false); setCreateError(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-4 py-3"><Skeleton className="h-4 w-64" /></div>
              ))
            ) : sets.length === 0 ? (
              <div className="px-4 py-12 text-center space-y-2">
                <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">No curricula yet — create one to get started.</p>
              </div>
            ) : sets.map(set => (
              <div key={set.id}>
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <button
                    className="flex items-center gap-2 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded"
                    onClick={() => toggleExpand(set.id)}
                  >
                    {expandedId === set.id
                      ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    <span className="text-sm font-medium">{set.name}</span>
                    {(set.subject_label || set.grade_label) && (
                      <span className="text-xs text-muted-foreground">
                        {[set.subject_label, set.grade_label].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </button>
                  <Button
                    size="sm" variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => setDeleteTarget(set)}
                    aria-label={`Delete ${set.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {expandedId === set.id && (
                  <div className="border-t border-border bg-muted/10">
                    {(expandedStandards[set.id] ?? []).length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs min-w-[520px]">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground w-24">Code</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground w-20">Strand</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Description</th>
                              <th className="px-4 py-2 w-8" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {(expandedStandards[set.id] ?? []).map(s => (
                              <tr key={s.id} className="hover:bg-muted/20">
                                <td className="px-4 py-2 font-mono">{s.code}</td>
                                <td className="px-4 py-2 text-muted-foreground">{s.strand}</td>
                                <td className="px-4 py-2 text-muted-foreground">{s.description}</td>
                                <td className="px-4 py-2">
                                  <button
                                    onClick={() => handleDeleteStandard(set.id, s.id)}
                                    className="text-muted-foreground hover:text-destructive transition-colors"
                                    aria-label={`Delete ${s.code}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="px-4 py-3">
                      {addingStdFor === set.id ? (
                        <div className="grid grid-cols-[90px_100px_1fr_auto_auto] gap-2 items-end">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Code</label>
                            <Input value={stdCode} onChange={e => setStdCode(e.target.value)} placeholder="RL.6.1" className="h-7 text-xs" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Strand</label>
                            <Select value={stdStrand} onValueChange={v => setStdStrand(v ?? "")}>
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent>
                                {VALID_STRANDS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                            <Input value={stdDesc} onChange={e => setStdDesc(e.target.value)} placeholder="Standard description…" className="h-7 text-xs" />
                          </div>
                          <Button size="sm" className="h-7 text-xs" onClick={() => handleAddStandard(set.id)}
                            disabled={stdSaving || !stdCode.trim() || !stdStrand || !stdDesc.trim()}>
                            {stdSaving ? "…" : "Add"}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs"
                            onClick={() => { setAddingStdFor(null); setStdCode(""); setStdStrand(""); setStdDesc(""); }}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"
                          onClick={() => { setAddingStdFor(set.id); setStdCode(""); setStdStrand(""); setStdDesc(""); }}>
                          <Plus className="h-3 w-3" /> Add Standard
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </PageContainer>
      </div>

      <div className="flex md:hidden flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <BookOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium">Platform admin requires a desktop browser.</p>
        <p className="text-xs text-muted-foreground mt-1">Please use a screen wider than 768px.</p>
      </div>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete curriculum"
      >
        <div className="space-y-2 py-1">
          <p className="text-sm">
            Delete <strong>{deleteTarget?.name}</strong>?
          </p>
          <p className="text-xs text-muted-foreground">
            This will permanently delete the standard set and all its standards. Any schools using this curriculum will lose their assignment. This cannot be undone.
          </p>
        </div>
        <ModalFooter>
          <ModalCancel onClick={() => setDeleteTarget(null)} />
          <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
