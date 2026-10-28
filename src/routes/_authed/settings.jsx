import { createFileRoute } from "@tanstack/react-router";
import ProfileSection from "@/components/settings/ProfileSection";
import SecuritySection from "@/components/settings/SecuritySection";
import GitHubSection from "@/components/settings/GitHubSection";
import SubscriptionSection from "@/components/settings/SubscriptionSection";

export const Route = createFileRoute("/_authed/settings")({
  head: () => ({ meta: [{ title: "Account settings — ONEORIGIN" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = Route.useRouteContext();

  return (
    <div className="relative">
      <div className="absolute -top-16 left-1/3 w-[420px] h-[300px] bg-accent/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="relative max-w-3xl mx-auto px-6 py-12 md:py-16">
        <p className="text-[10px] tracking-[0.3em] font-bold text-accent mb-3">ACCOUNT</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Manage your profile, security, connected accounts and plan.
        </p>

        <div className="mt-10 space-y-6">
          <ProfileSection user={user} />
          <SecuritySection user={user} />
          <GitHubSection />
          <SubscriptionSection user={user} />
        </div>
      </div>
    </div>
  );
}
