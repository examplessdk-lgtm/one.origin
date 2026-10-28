import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { ArrowUpRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import SettingsCard from "@/components/settings/SettingsCard";

export default function SubscriptionSection({ user }) {
  const { refresh } = useAuth();
  const [prefs, setPrefs] = useState({
    notify_product: !!user?.notify_product,
    notify_news: !!user?.notify_news,
  });

  const toggle = async (key, value) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    try {
      await base44.auth.updateMe({ [key]: value });
      await refresh();
    } catch (error) {
      setPrefs((p) => ({ ...p, [key]: !value }));
      toast.error(error?.message || "Could not save your preference");
    }
  };

  return (
    <SettingsCard title="Plan & membership" description="Your current plan and account communications.">
      <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-accent/10 to-transparent p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-accent">Current plan</p>
            <p className="text-lg font-semibold mt-2">Free</p>
            <p className="text-xs text-muted-foreground mt-1">
              Unlimited conversations, workspace library and multimodal input.
            </p>
          </div>
          <Link
            to="/"
            hash="pricing"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            Compare plans <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/40 p-4">
          <div>
            <p className="text-sm font-medium">Product updates</p>
            <p className="text-xs text-muted-foreground mt-1">New agent capabilities and workspace features.</p>
          </div>
          <Switch checked={prefs.notify_product} onCheckedChange={(v) => toggle("notify_product", v)} />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/40 p-4">
          <div>
            <p className="text-sm font-medium">Newsletter</p>
            <p className="text-xs text-muted-foreground mt-1">Occasional notes from the ONEORIGIN team.</p>
          </div>
          <Switch checked={prefs.notify_news} onCheckedChange={(v) => toggle("notify_news", v)} />
        </div>
      </div>
    </SettingsCard>
  );
}
