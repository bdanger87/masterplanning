import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { fetchClient } from "~/server/fns";

// ---- Types for search params ----
type PortalSearch = {
  clientId?: string;
};

// ---- Route ----
export const Route = createFileRoute("/portal")({
  validateSearch: (search: Record<string, unknown>): PortalSearch => ({
    clientId: typeof search.clientId === "string" ? search.clientId : undefined,
  }),
  component: PortalPage,
});

function PortalPage() {
  const navigate = useNavigate();
  const { clientId } = Route.useSearch();
  const [lookupId, setLookupId] = useState(clientId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [client, setClient] = useState<Awaited<ReturnType<typeof fetchClient>>>(null);

  // Auto-fetch if clientId is in URL
  useEffect(() => {
    if (clientId) {
      loadClient(clientId);
    }
  }, [clientId]);

  const loadClient = async (id: string) => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchClient({ data: id });
      if (!result) {
        setError("Client not found. Check the ID and try again.");
      }
      setClient(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load client");
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (lookupId.trim()) {
      navigate({ to: "/portal", search: { clientId: lookupId.trim() } });
    }
  };

  // ---- Lookup screen (no client loaded) ----
  if (!client && !loading) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-4 inline-flex rounded-full bg-indigo-100 p-3">
            <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Client Portal</h1>
          <p className="mt-2 text-gray-500">Enter your client ID to view onboarding status</p>

          <form onSubmit={handleLookup} className="mt-6">
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                placeholder="Enter client ID (e.g. client_1234567890_abc)"
                className="field-input flex-1"
              />
              <button
                type="submit"
                disabled={!lookupId.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition"
              >
                Look Up
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  if (!client) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-gray-500">Client not found.</p>
      </main>
    );
  }

  const progress = client.progress;
  const statusColors: Record<string, string> = {
    done: "bg-green-500",
    pending: "bg-gray-300",
    in_progress: "bg-yellow-500",
  };
  const statusLabels: Record<string, string> = {
    done: "Complete",
    pending: "Pending",
    in_progress: "In Progress",
  };
  const clientStatusColors: Record<string, string> = {
    onboarding: "bg-yellow-100 text-yellow-800",
    live: "bg-green-100 text-green-800",
    stalled: "bg-red-100 text-red-800",
  };

  return (
    <main className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {client.data.businessName || "Client Portal"}
            </h1>
            <p className="text-sm text-gray-500">Client ID: {client.id}</p>
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${clientStatusColors[client.status] ?? "bg-gray-100 text-gray-800"}`}
          >
            {client.status}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Launch Readiness</h2>
            <span className="text-2xl font-bold text-indigo-600">{progress.percent}%</span>
          </div>
          <div className="mt-3 h-3 rounded-full bg-gray-200">
            <div
              className="h-3 rounded-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {progress.done} of {progress.total} tasks complete
          </p>
        </div>

        {/* Checklist */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Setup Checklist</h2>
          <div className="space-y-3">
            {Object.entries(client.checklist).map(([item, status]) => (
              <div key={item} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span className="text-sm font-medium text-gray-700">{item}</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    status === "done"
                      ? "bg-green-100 text-green-700"
                      : status === "in_progress"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-200 text-gray-600"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${statusColors[status]}`} />
                  {statusLabels[status]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration Summary */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Configuration Summary</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryCard title="Business">
              <SummaryRow label="Name" value={client.data.businessName} />
              <SummaryRow label="Niche" value={client.data.niche} />
              <SummaryRow label="Area" value={client.data.serviceArea} />
            </SummaryCard>
            <SummaryCard title="Offer">
              <SummaryRow label="Service" value={client.data.serviceOffering} />
              <SummaryRow label="Pricing" value={client.data.pricePoints || "—"} />
              <SummaryRow label="Calendar" value={client.data.calendarLink || "—"} />
            </SummaryCard>
            <SummaryCard title="Systems">
              <SummaryRow label="CRM" value={client.data.crmType} />
              <SummaryRow label="Phone" value={client.data.phoneNumber || "—"} />
              <SummaryRow label="Email" value={client.data.email} />
            </SummaryCard>
            <SummaryCard title="Leads">
              <SummaryRow
                label="Sources"
                value={
                  client.data.leadSources.length > 0
                    ? client.data.leadSources.join(", ")
                    : "—"
                }
              />
              <SummaryRow label="Created" value={new Date(client.createdAt).toLocaleDateString()} />
              <SummaryRow label="Status" value={client.status} />
            </SummaryCard>
          </div>
        </div>
      </div>
    </main>
  );
}

// ---- Helpers ----

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-900">{title}</h3>
      <dl className="space-y-1">{children}</dl>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className="max-w-[60%] truncate text-right font-medium text-gray-900">{value}</dd>
    </div>
  );
}
