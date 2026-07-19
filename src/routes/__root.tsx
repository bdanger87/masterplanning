import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "LeadLoop — AI Lead Recovery OS" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  notFoundComponent: () => <div>Page not found</div>,
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Nav />
      <Outlet />
    </RootDocument>
  );
}

function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-bold text-gray-900 hover:text-indigo-600 transition">
          LeadLoop
        </Link>
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link to="/dashboard" className="text-gray-600 hover:text-indigo-600 transition">
            Dashboard
          </Link>
          <Link to="/capacity" className="text-gray-600 hover:text-indigo-600 transition">
            Capacity
          </Link>
          <Link to="/onboarding" className="text-gray-600 hover:text-indigo-600 transition">
            Onboarding
          </Link>
          <Link to="/sales-call" className="text-gray-600 hover:text-indigo-600 transition">
            Sales Call
          </Link>
          <Link to="/pipeline" className="text-gray-600 hover:text-indigo-600 transition">
            Pipeline
          </Link>
          <Link to="/portal" className="text-gray-600 hover:text-indigo-600 transition">
            Portal
          </Link>
        </div>
      </div>
    </nav>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
