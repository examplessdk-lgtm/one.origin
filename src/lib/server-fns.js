import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/auth-middleware";

export const getServerInfo = createServerFn({ method: "GET" }).handler(async () => ({
  renderedAt: new Date().toISOString(),
}));

// Workspace-registered GitHub OAuth app (APP_USER mode: each app user connects their own account).
const GITHUB_CONNECTOR_ID = "6ae1d4db2f0d72d71664025b";

// The signed-in app user's GitHub connection: { connected: false } until they connect, never the token.
export const getGitHubAccount = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const connection = await context
      .getBase44()
      .asServiceRole.connectors.getCurrentAppUserConnection(GITHUB_CONNECTOR_ID)
      .catch((error) => {
        if (error?.status === 404) return null;
        throw error;
      });
    if (!connection) return { connected: false };

    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "ONEORIGIN",
      },
    });
    if (!response.ok) throw new Error(`GitHub ${response.status}`);

    const profile = await response.json();
    return {
      connected: true,
      profile: {
        login: profile.login,
        name: profile.name,
        avatar_url: profile.avatar_url,
        html_url: profile.html_url,
      },
    };
  });
