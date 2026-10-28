import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Mail, LogOut } from "lucide-react";
import SettingsCard from "@/components/settings/SettingsCard";

export default function SecuritySection({ user }) {
  const { logout } = useAuth();
  const [sending, setSending] = useState(false);

  const sendReset = async () => {
    if (!user?.email) return;
    setSending(true);
    try {
      await base44.auth.resetPasswordRequest(user.email);
      toast.success("If that address is registered, a reset link is on its way.");
    } catch (error) {
      toast.error(error?.message || "Could not send the reset link");
    } finally {
      setSending(false);
    }
  };

  return (
    <SettingsCard title="Security" description="Keep your account protected.">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/40 p-4">
          <div>
            <p className="text-sm font-medium">Password</p>
            <p className="text-xs text-muted-foreground mt-1">
              We'll email a secure link to {user?.email || "your address"} to set a new password.
            </p>
          </div>
          <Button onClick={sendReset} disabled={sending} variant="outline" className="border-border bg-transparent h-9 shrink-0">
            <Mail className="w-3.5 h-3.5 mr-2" /> {sending ? "Sending…" : "Reset link"}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/40 p-4">
          <div>
            <p className="text-sm font-medium">Signed in session</p>
            <p className="text-xs text-muted-foreground mt-1">Sign out of this browser.</p>
          </div>
          <Button onClick={logout} variant="outline" className="border-border bg-transparent h-9 shrink-0 hover:text-destructive">
            <LogOut className="w-3.5 h-3.5 mr-2" /> Sign out
          </Button>
        </div>
      </div>
    </SettingsCard>
  );
}
