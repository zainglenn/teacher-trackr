"use client";

import { useState, useMemo } from "react";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter, ModalCancel, ConfirmModal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Search, Copy, Check } from "lucide-react";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { Profile, Role } from "@/types";

const ROLE_CONFIG: Record<Role, { label: string; className: string }> = {
  hod:     { label: "Head of Department", className: "bg-violet-100 text-violet-700 border-violet-200" },
  teacher: { label: "Teacher",            className: "bg-blue-100 text-blue-700 border-blue-200" },
  admin:   { label: "Administrator",      className: "bg-rose-100 text-rose-700 border-rose-200" },
};

function userInitials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button onClick={copy} className="ml-1 text-muted-foreground hover:text-foreground transition-colors" title="Copy email">
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export function ManageUsersView({ currentUserId }: { currentUserId: string }) {
  const { users, loading, createUser, updateUser, deleteUser } = useAdminUsers();

  // Add user dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("teacher");
  const [addError, setAddError] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  // Edit user dialog
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<Role>("teacher");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<Profile | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // Search / filter
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        (u.full_name ?? "").toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });
  }, [users, search, roleFilter]);

  function resetAdd() {
    setNewEmail(""); setNewName(""); setNewPassword(""); setNewRole("teacher"); setAddError("");
  }

  function openEdit(user: Profile) {
    setEditUser(user);
    setEditName(user.full_name ?? "");
    setEditRole(user.role as Role);
    setEditError("");
  }

  async function handleAdd() {
    if (!newEmail || !newPassword) return;
    setAddSaving(true); setAddError("");
    try {
      await createUser(newEmail, newPassword, newName, newRole);
      setAddOpen(false); resetAdd();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to create user");
    } finally { setAddSaving(false); }
  }

  async function handleEdit() {
    if (!editUser) return;
    setEditSaving(true); setEditError("");
    try {
      await updateUser(editUser.id, { full_name: editName || undefined, role: editRole });
      setEditUser(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to update user");
    } finally { setEditSaving(false); }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleteSaving(true);
    try {
      await deleteUser(confirmDelete.id);
      setConfirmDelete(null);
    } finally { setDeleteSaving(false); }
  }

  if (loading) return null;

  return (
    <PageContainer
      title="Manage Users"
      description={`${users.length} user${users.length !== 1 ? "s" : ""} with access to the system`}
      action={
        <Button size="sm" onClick={() => { resetAdd(); setAddOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add User
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Search + role filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as Role | "all")}>
            <SelectTrigger className="h-8 text-sm w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
              <SelectItem value="hod">Head of Department</SelectItem>
              <SelectItem value="admin">Administrator</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{filtered.length} of {users.length}</span>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">
                  Sign-in Email
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-36">Role</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-28 hidden md:table-cell">Joined</th>
                <th className="w-20 px-4" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No users match your search.
                  </td>
                </tr>
              ) : filtered.map((user) => {
                const config = ROLE_CONFIG[user.role as Role] ?? ROLE_CONFIG.teacher;
                const isSelf = user.id === currentUserId;
                const joined = new Date(user.created_at).toLocaleDateString("en-GB", {
                  day: "numeric", month: "short", year: "numeric",
                });

                return (
                  <tr key={user.id} className="border-t hover:bg-muted/20 transition-colors">
                    {/* User column */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
                          {userInitials(user.full_name, user.email)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium truncate">{user.full_name ?? user.email}</span>
                            {isSelf && (
                              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">you</span>
                            )}
                          </div>
                          {/* Show email inline on small screens */}
                          <div className="flex items-center sm:hidden text-xs text-muted-foreground mt-0.5">
                            <span className="truncate">{user.email}</span>
                            <CopyButton text={user.email} />
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Sign-in email */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <span className="text-sm font-mono">{user.email}</span>
                        <CopyButton text={user.email} />
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${config.className}`}>
                        {config.label}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                      {joined}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(user)}
                          title="Edit user"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {!isSelf && (
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                            onClick={() => setConfirmDelete(user)}
                            title="Delete user"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add user dialog */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); resetAdd(); }} title="Add User">
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input
              placeholder="e.g. Sarah Al Mansoori"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sign-in Email</Label>
            <Input
              type="email"
              placeholder="teacher@dubaischools.ae"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">This is the email they'll use to log in.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Temporary Password</Label>
            <Input
              type="password"
              placeholder="Min. 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="hod">Head of Department</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {addError && <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{addError}</p>}
        </div>
        <ModalFooter>
          <ModalCancel onClick={() => { setAddOpen(false); resetAdd(); }} />
          <Button onClick={handleAdd} disabled={addSaving || !newEmail || !newPassword}>
            {addSaving ? "Creating…" : "Create User"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit user dialog */}
      <Modal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title="Edit User"
      >
        {editUser && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg mb-2">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
                {userInitials(editUser.full_name, editUser.email)}
              </div>
              <div>
                <p className="text-sm font-medium">{editUser.full_name ?? editUser.email}</p>
                <p className="text-xs text-muted-foreground font-mono">{editUser.email}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                placeholder="Full name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="hod">Head of Department</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editError && <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{editError}</p>}
          </div>
        )}
        <ModalFooter>
          <ModalCancel onClick={() => setEditUser(null)} />
          <Button onClick={handleEdit} disabled={editSaving}>
            {editSaving ? "Saving…" : "Save Changes"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Remove user?"
        description={
          confirmDelete
            ? `This will permanently delete ${confirmDelete.full_name ?? confirmDelete.email}'s account and all associated data. This cannot be undone.`
            : ""
        }
        confirmLabel="Remove User"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteSaving}
      />
    </PageContainer>
  );
}
