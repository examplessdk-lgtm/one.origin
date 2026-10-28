import { ClientOnly, HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { DefaultCatchBoundary } from "@/components/DefaultCatchBoundary";
import { NotFound } from "@/components/NotFound";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/AuthContext";
import { Base44Scripts } from "base44:document";
import Layout from "@/components/Layout";
import appCss from "@/index.css?url";

export const Route = createRootRoute({
  // Per-page <title>/meta come from each route's head(); this is the shared base.
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Developer Having similar functions It's not just a command-line example" },
      { name: "description", content: "A full-stack Base44 app built with TanStack Start." },
    ],
    // No icon link: the platform adds the app's logo when serving.
    links: [
      { rel: "stylesheet", href: appCss },
      {"rel": "preconnect", "href": "https://fonts.googleapis.com"},
      {"rel": "preconnect", "href": "https://fonts.gstatic.com", "crossOrigin": "anonymous"},
      {"rel": "stylesheet", "href": "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"},
      {"rel": "stylesheet", "href": "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"},
    ],
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  shellComponent: RootDocument,
  component: RootComponent,
});

function RootComponent() {
  return (
    <AuthProvider>
      <ClientOnly>
        <Layout />
      </ClientOnly>
      <Toaster />
    </AuthProvider>
  );
}

// The document. There is no index.html: the server renders <html> from here.
function RootDocument({ children }) {
  return (
    <html lang={"en"}>
      <head>
        <HeadContent />
      </head>
      {/* data-react-root: the builder's preview bridge looks for #root and falls back to this. */}
      <body data-react-root="true">
        {children}
        <Base44Scripts />
        <Scripts />
      </body>
    </html>
  );
}
