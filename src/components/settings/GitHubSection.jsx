import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { getGitHubAccount } from "@/lib/server-fns";
import { toast } from "sonner";
import { Github, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import SettingsCard from "@/components/settings/SettingsCard";

const CONNECTOR_ID = "6ae1d4db2f0d72d71664025b";

export default function GitHubSection() {
  const [state, setState] = useState({ loading: true, connected: false, profile: null, error: null });

  const load = async () => {
    try {
      const res = await getGitHubAccount();
      setState({ loading: false, connected: !!res.connected, profile: res.profile || null, error: null });
    } catch (error) {
      // A provider or network failure: keep whatever connection state we already had.
      setState((prev) => ({ ...prev, loading: false, error }));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const connect = async () => {
    try {
      const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
      const popup = window.open(url, "_blank");
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          load();
        }
      }, 500);
    } catch (error) {
      toast.error(error?.message || "Could not start the GitHub connection");
    }
  };

  const disconnect = async () => {
    try {
      await base44.connectors.disconnectAppUser(CONNECTOR_ID);
      setState({ loading: false, connected: false, profile: null, error: null });
      toast.success("GitHub disconnected");
    } catch (error) {
      toast.error(error?.message || "Could not disconnect GitHub");
    }
  };

  return (
    <SettingsCard title="Connected accounts" description="Sign in to GitHub to bring your repositories into your workspace.">
      <div className="rounded-xl border border-border/60 bg-background/40 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {state.connected && state.profile?.avatar_url ? (
              <img
                src={state.profile.avatar_url}
                alt={state.profile.login}
                className="h-10 w-10 rounded-full border border-border object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground">
                <Github className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium flex items-center gap-2">
                GitHub
                {state.connected && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                    <Check className="h-3 w-3" /> Connected
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-1">
                {state.loading
                  ? "Checking connection…"
                  : state.connected
                    ? `Signed in as ${state.profile?.login || "your GitHub account"}`
                    : "Not connected yet"}
              </p>
            </div>
          </div>

          {!state.loading && (
            state.connected ? (
              <Button onClick={disconnect} variant="outline" className="border-border bg-transparent h-9 shrink-0">
                Disconnect
              </Button>
            ) : (
              <Button onClick={connect} className="bg-foreground text-background hover:bg-foreground/90 h-9 shrink-0">
                <Github className="w-3.5 h-3.5 mr-2" /> Connect
              </Button>
            )
          )}
        </div>

        {state.connected && state.profile?.html_url && (
          <a
            href={state.profile.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Open GitHub profile <ExternalLink className="h-3 w-3" />
          </a>
        )}

        {state.error && (
          <p className="mt-3 text-xs text-destructive">
            GitHub didn't answer just now — your connection is unchanged. Try again in a moment.
          </p>
        )}
      </div>
    </SettingsCard>
  );
}
