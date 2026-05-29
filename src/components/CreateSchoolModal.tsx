"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Modal, ModalFooter, ModalCancel } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

interface CreateSchoolModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CURRICULA = ["American", "British", "IB", "Other"];

export function CreateSchoolModal({ open, onClose, onCreated }: CreateSchoolModalProps) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [curriculum, setCurriculum] = useState("");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = name.trim() && city.trim() && country.trim() && curriculum &&
    adminFullName.trim() && adminUsername.trim() && adminPassword.trim();

  async function handleSubmit() {
    if (!isValid) return;
    setSaving(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/platform/create-school", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ name, city, country, curriculum, adminFullName, adminUsername, adminEmail, adminPassword }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Something went wrong"); return; }
      // Reset
      setName(""); setCity(""); setCountry(""); setCurriculum("");
      setAdminFullName(""); setAdminUsername(""); setAdminEmail(""); setAdminPassword("");
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create School" size="md">
      <div className="space-y-5">
        {/* Section 1 */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">School Details</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>School Name <span className="text-rose-500">*</span></Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Greenwood Academy" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>City <span className="text-rose-500">*</span></Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Dubai" />
              </div>
              <div className="space-y-1.5">
                <Label>Country <span className="text-rose-500">*</span></Label>
                <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. UAE" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Curriculum <span className="text-rose-500">*</span></Label>
              <Select value={curriculum} onValueChange={(v) => v && setCurriculum(v)}>
                <SelectTrigger><SelectValue placeholder="Select curriculum…" /></SelectTrigger>
                <SelectContent>
                  {CURRICULA.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Section 2 */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">First Admin Account</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Full Name <span className="text-rose-500">*</span></Label>
              <Input value={adminFullName} onChange={(e) => setAdminFullName(e.target.value)} placeholder="e.g. Sarah Johnson" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Username <span className="text-rose-500">*</span></Label>
                <Input value={adminUsername} onChange={(e) => setAdminUsername(e.target.value.toLowerCase())} placeholder="e.g. sarah.admin" />
              </div>
              <div className="space-y-1.5">
                <Label>Notification Email</Label>
                <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="optional" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Temporary Password <span className="text-rose-500">*</span></Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Share this with the school admin — they can change it after first login.</p>
            </div>
          </div>
        </div>

        {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">{error}</p>}
      </div>

      <ModalFooter>
        <ModalCancel onClick={onClose} />
        <Button
          onClick={handleSubmit}
          disabled={!isValid || saving}
          size="sm"
          className="disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
        >
          {saving ? "Creating…" : "Create School"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
