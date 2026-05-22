"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Profile, Role } from "@/types";

export function useAdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;

    const res = await fetch("/api/admin/list-users", {
      headers: { authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    setUsers(json.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function createUser(email: string, password: string, full_name: string, role: Role) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ email, password, full_name, role }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    await fetchUsers();
  }

  async function deleteUser(userId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch("/api/admin/delete-user", {
      method: "DELETE",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }

  return { users, loading, createUser, deleteUser };
}
