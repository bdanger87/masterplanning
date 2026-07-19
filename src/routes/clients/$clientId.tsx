import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { fetchTenant, fetchClientsByTenant, fetchAllClients } from "~/server/fns";
import type { TenantRecord, ClientRecord, Checklist } from "~/server/storage";

type Tab = "overview" | "performance" | "activity" | "settings";

export const Route = createFileRoute("/clients/$clientId")({
  component: ClientDetailPage,
});

function ClientDetailPage() {
  const { clientId } = Route.useParams();
  const [tenant, setTenant] = useState<(TenantRecord & { timeline: { event: string; date: string; type: string }[] }) | null>(null);
  const [clients, setClients] = useState<(ClientRecord & { progress: { done: number; total: number; percent: number } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  useEffect(() => {
    loadData();
  }, [clientId]);

  const loadData = async () => {
    try {
      const t = await fetchTenant(clientId);
      setTenant(t);
      // Try tenant-scoped fetch first, fall back to all clients
      try {
        const c = await fetchClientsByTenant(clientId);
        setClients(c);
      } catch {
        const all = await fetchAllClients();
        setClients(all.filter((c) => c.tenantId === clientId));
      }
    } catch (e) {
      console.error("Failed to load client", e);
    } finally {
      setLoading(false);
    }
  };

  const tierPrice: Record<string, number> = {
    starter: 500,
    pro: 1000,
    growth: 1500,
  };

  const tierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      starter: "bg-gray-100 text-gray-700",
      pro: "bg-indigo-100 text-indigo-700",
      growth: "bg-purple-100 text-purple-700",
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[tier] ?? ""}`}>
        {tier}
      </span>
    );
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      onboarding: "bg-yellow-100 text-yellow-800",
      live: "bg-green-100 text-green-800",
      stalled: "bg-red-100 text-red-800",
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-800"}`}>
        {status}
      </span>
    );
  };

  const checklistDone = (cl: Checklist) => Object.values(cl).filter((s) => s === "done").length;
  const checklistTotal = (cl: Checklist) => Object.values(cl).length;

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">Loading client details...</p>
        </div>
      </main>
    );
  }

  if (!tenant) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">Client Not Found</h2>
          <a href="/dashboard" className="mt-4 inline-block text-sm text-indigo-600 hover:text-indigo-800">
            ← Back to Dashboard
          </a>
        </div>
      </main>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "performance", label: "Performance" },
    { key: "activity", label: "Activity" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <main className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <a href="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-800 mb-2 inline-block">
              ← Back to Dashboard
            </a>
            <h1 className="text-2xl font-bold text-gray-900">{tenant.name || "Unnamed Client"}</h1>
            <div className="mt-2 flex items-center gap-3">
              {tierBadge(tenant.tier)}
              {statusBadge(tenant.status)}
              <span className="text-sm text-gray-500">
                Activated {new Date(tenant.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
              View Portal
            </button>
            <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition">
              Generate Report
            </button>
          </div>
        </div>

        {/* Stats summary */}
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <StatCard label="MRR" value={`$${tierPrice[tenant.tier] ?? 500}/mo`} />
          <StatCard label="Lead Recovery" value="72%" />
          <StatCard label="Response Time" value="18s" />
          <StatCard label="Active Sequences" value="3" />
        </div>

        {/* Tabs */}
        <div className="mb-6 flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium transition border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          {activeTab === "overview" && (
            <OverviewTab
              tenant={tenant}
              clients={clients}
              checklistDone={checklistDone}
              checklistTotal={checklistTotal}
            />
          )}
          {activeTab === "performance" && <PerformanceTab tenant={tenant} />}
          {activeTab === "activity" && <ActivityTab tenant={tenant} />}
          {activeTab === "settings" && <SettingsTab tenant={tenant} />}
        </div>
      </div>
    </main>
  );
}

// ---- Overview Tab ----

function OverviewTab({
  tenant,
  clients,
  checklistDone,
  checklistTotal,
}: {
  tenant: TenantRecord;
  clients: (ClientRecord & { progress: { done: number; total: number; percent: number } })[];
  checklistDone: (cl: Checklist) => number;
  checklistTotal: (cl: Checklist) => number;
}) {
  const latestClient = clients[0];

  const checklistItems: { label: string; status: ChecklistItemStatus }[] = latestClient
    ? Object.entries(latestClient.checklist).map(([label, status]) => ({ label, status }))
    : [];

  const checklistPercent = latestClient
    ? Math.round((checklistDone(latestClient.checklist) / Math.max(checklistTotal(latestClient.checklist), 1)) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Launch readiness */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Launch Readiness</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Onboarding Progress</span>
              <span className="font-medium text-gray-900">{checklistPercent}%</span>
            </div>
            <div className="h-3 rounded-full bg-gray-200">
              <div
                className="h-3 rounded-full bg-indigo-600 transition-all"
                style={{ width: `${checklistPercent}%` }}
              />
            </div>
          </div>
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${
            checklistPercent === 100
              ? "bg-green-100 text-green-700"
              : checklistPercent >= 50
              ? "bg-yellow-100 text-yellow-700"
              : "bg-red-100 text-red-700"
          }`}>
            {checklistPercent === 100 ? "Ready" : checklistPercent >= 50 ? "In Progress" : "Early Stage"}
          </span>
        </div>

        {checklistItems.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {checklistItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                  item.status === "done"
                    ? "bg-green-100 text-green-600"
                    : item.status === "in_progress"
                    ? "bg-yellow-100 text-yellow-600"
                    : "bg-gray-100 text-gray-400"
                }`}>
                  {item.status === "done" ? "✓" : item.status === "in_progress" ? "○" : "—"}
                </span>
                <span className={item.status === "done" ? "text-gray-900" : "text-gray-500"}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Configuration summary */}
      {latestClient && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Configuration Summary</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ConfigField label="Business Name" value={latestClient.data.businessName} />
            <ConfigField label="Niche" value={latestClient.data.niche} />
            <ConfigField label="Service Area" value={latestClient.data.serviceArea} />
            <ConfigField label="CRM" value={latestClient.data.crmType} />
            <ConfigField label="Calendar" value={latestClient.data.calendarLink} />
            <ConfigField label="Email" value={latestClient.data.email} />
          </div>
        </div>
      )}
    </div>
  );
}

function ConfigField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-gray-900 truncate">{value || "Not set"}</div>
    </div>
  );
}

// ---- Performance Tab ----

function PerformanceTab({ tenant: _tenant }: { tenant: TenantRecord }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Lead Volume & Recovery</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard label="Total Leads (MTD)" value="124" trend="+12%" trendUp />
          <MetricCard label="Recovered" value="89" trend="+8%" trendUp />
          <MetricCard label="Avg Response" value="18s" trend="-3s" trendUp />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Recovery Rate Trend</h3>
        <div className="rounded-lg bg-gray-50 p-6">
          <div className="flex items-end gap-2 h-32">
            {[65, 72, 68, 75, 70, 78, 72].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-indigo-500 transition-all"
                  style={{ height: `${val}%` }}
                />
                <span className="text-xs text-gray-500">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-gray-400">Placeholder data — real metrics coming soon</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Response Time Distribution</h3>
        <div className="grid gap-4 sm:grid-cols-4">
          <MetricCard label="&lt; 1 min" value="42%" />
          <MetricCard label="1-5 min" value="31%" />
          <MetricCard label="5-15 min" value="18%" />
          <MetricCard label="15+ min" value="9%" />
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  trend,
  trendUp,
}: {
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-gray-900">{value}</div>
      {trend && (
        <div className={`mt-1 text-xs font-medium ${trendUp ? "text-green-600" : "text-red-600"}`}>
          {trend} {trendUp ? "↑" : "↓"}
        </div>
      )}
    </div>
  );
}

// ---- Activity Tab ----

function ActivityTab({ tenant }: { tenant: TenantRecord & { timeline: { event: string; date: string; type: string }[] } }) {
  const timeline = tenant.timeline ?? [];

  if (timeline.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-gray-500">No activity recorded yet.</p>
      </div>
    );
  }

  const typeIcon = (type: string) => {
    switch (type) {
      case "onboarding":
        return "🔄";
      case "status":
        return "📌";
      case "activity":
        return "📊";
      default:
        return "•";
    }
  };

  return (
    <div className="space-y-1">
      {timeline.map((item, i) => (
        <div key={i} className="flex items-start gap-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm">
            {typeIcon(item.type)}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{item.event}</p>
            <p className="text-xs text-gray-500">{new Date(item.date).toLocaleString()}</p>
          </div>
        </div>
      ))}
      <p className="mt-6 text-center text-xs text-gray-400">Activity timeline based on recorded events</p>
    </div>
  );
}

// ---- Settings Tab ----

function SettingsTab({ tenant }: { tenant: TenantRecord }) {
  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Account Settings</h3>
        <div className="space-y-4">
          <FieldDisplay label="Client Name" value={tenant.name || "—"} />
          <FieldDisplay label="Niche" value={tenant.niche || "—"} />
          <FieldDisplay label="Tier" value={tenant.tier} />
          <FieldDisplay label="Status" value={tenant.status} />
          <FieldDisplay label="Created" value={new Date(tenant.createdAt).toLocaleDateString()} />
          <FieldDisplay label="Last Updated" value={new Date(tenant.updatedAt).toLocaleDateString()} />
        </div>
      </div>

      <hr className="border-gray-200" />

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Integrations</h3>
        <div className="space-y-3">
          <IntegrationRow label="CRM" value="GoHighLevel" connected />
          <IntegrationRow label="Calendar" value="Calendly" connected />
          <IntegrationRow label="Phone" value="—" connected={false} />
          <IntegrationRow label="Email" value="—" connected={false} />
        </div>
      </div>

      <hr className="border-gray-200" />

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Pricing</h3>
        <div className="rounded-lg bg-gray-50 p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-900 capitalize">{tenant.tier} Plan</p>
              <p className="text-xs text-gray-500">Billed monthly</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">
                ${tenant.tier === "growth" ? "1,500" : tenant.tier === "pro" ? "1,000" : "500"}/mo
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-0.5 text-sm text-gray-900">{value}</div>
    </div>
  );
}

function IntegrationRow({
  label,
  value,
  connected,
}: {
  label: string;
  value: string;
  connected: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-500">{value}</div>
      </div>
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          connected
            ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        {connected ? "Connected" : "Not Connected"}
      </span>
    </div>
  );
}

// ---- Shared ----

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-gray-900">{value}</div>
    </div>
  );
}
