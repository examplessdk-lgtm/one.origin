import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SettingsCard from "@/components/settings/SettingsCard";

export default function ProfileSection({ user }) {
  const { refresh } = useAuth();
  const [name, setName] = useState(user?.full_name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.auth.updateMe({ full_name: name.trim(), bio });
      await refresh();
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error?.message || "Could not update your profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard title="Profile" description="How you appear across ONEORIGIN.">
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="profile-name">Full name</Label>
          <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="bg-background border-border h-10" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-email">Email</Label>
          <Input id="profile-email" value={user?.email || ""} disabled className="bg-secondary/40 border-border h-10 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground/70">Your email is used to sign in and cannot be changed here.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-bio">About you</Label>
          <Textarea id="profile-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="A line about the work you do" className="bg-background border-border" />
        </div>
        <Button type="submit" disabled={saving} className="bg-foreground text-background hover:bg-foreground/90 h-10">
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </SettingsCard>
  );
}
