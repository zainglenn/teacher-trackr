import { supabase } from "@/lib/supabase";

export async function getFreshToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) return session.access_token;
  const { data: { session: refreshed } } = await supabase.auth.refreshSession();
  return refreshed?.access_token ?? null;
}

export async function adminFetch(
  path: string,
  options: RequestInit = {},
  extraHeaders?: Record<string, string>
): Promise<Response> {
  const token = await getFreshToken();
  if (!token) throw new Error("Not authenticated");

  const buildHeaders = (t: string) => ({
    "content-type": "application/json",
    authorization: `Bearer ${t}`,
    ...(extraHeaders ?? {}),
    ...(options.headers ?? {}),
  });

  const res = await fetch(path, { ...options, headers: buildHeaders(token) });

  // On 401, force a session refresh and retry once — handles expired tokens
  if (res.status === 401) {
    const { data: { session: refreshed } } = await supabase.auth.refreshSession();
    const newToken = refreshed?.access_token;
    if (!newToken) return res; // truly logged out — return the 401 as-is
    return fetch(path, { ...options, headers: buildHeaders(newToken) });
  }

  return res;
}
