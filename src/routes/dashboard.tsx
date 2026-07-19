import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { fetchTenantsWithActivity, fetchDashboardStats } from "~/server/fns";
import type { TenantWithActivity, DashboardStats } from "~/server/storage";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

type FilterPreset = "all" | "live" | "onboarding" | "stalled" | "starter" | "pro" | "growth";

const FILTER_PRESETS: { label: string; value: FilterPreset }[] = [
  { label: "All", value: "all" },
  { label: "Live", value: "live" },
  { label: "Onboarding", value: "onboarding" },
  { label: "Stalled", value: "stalled" },
  { label: "Starter", value: "starter" },
  { label: "Pro", value: "pro" },
  { label: "Growth", value: "growth" },
];

function DashboardPage() {
  const [tenants, setTenants] = useState<TenantWithActivity[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterPreset>("all");
  const [nicheFilter, setNicheFilter] = useState("");
  const [sortKey, setSortKey] = useState<keyof TenantWithActivity>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [t, s] = await Promise.all([
        fetchTenantsWithActivity(),
        fetchDashboardStats(),
      ]);
      setTenants(t);
      setStats(s);
    } catch (e) {
      console.error("Failed to load dashboard", e);
    } finally {
      setLoading(false);
    }
  };

  const tierPrice: Record<string, number> = {
    starter: 500,
    pro: 1000,
    growth: 1500,
  };

  const filtered = tenants.filter((t) => {
    if (filter === "all") return true;
    if (["live", "onboarding", "stalled"].includes(filter)) return t.status === filter;
    if (["starter", "pro", "growth"].includes(filter)) return t.tier === filter;
    return true;
  }).filter((t) => {
    if (!nicheFilter) return true;
    return t.niche.toLowerCase().includes(nicheFilter.toLowerCase());
  });

  const sorted = [...filtered].sort((a, b) => {
    const aVal = a[sortKey] ?? "";
    const bVal = b[sortKey] ?? "";
    const cmp = String(aVal).localeCompare(String(bVal));
    return sortDir === "asc" ? cmp : -cmp;
  });

  const toggleSort = (key: keyof TenantWithActivity) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const churnBadge = (risk: string) => {
    const colors: Record<string, string> = {
      green: "bg-green-100 text-green-700",
      yellow: "bg-yellow-100 text-yellow-700",
      red: "bg-red-100 text-red-700",
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[risk] ?? ""}`}>
        {risk === "red" ? "⚠ High" : risk === "yellow" ? "● Medium" : "✓ Low"}
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

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Master Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Multi-client overview and management</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              ↻ Refresh
            </button>
            <a
              href="/onboarding"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
            >
              + Add Client
            </a>
          </div>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="mb-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <MiniStat label="Total Clients" value={stats.totalClients} />
            <MiniStat label="Active (Live)" value={stats.activeClients} color="green" />
            <MiniStat label="Onboarding" value={stats.onboarding} color="yellow" />
            <MiniStat label="Stalled" value={stats.stalled} color="red" />
            <MiniStat label="Total MRR" value={`$${stats.totalMRR.toLocaleString()}`} color="indigo" />
            <MiniStat label="Avg Recovery" value={`${stats.avgRecoveryRate}%`} color="indigo" />
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-500">Filter:</span>
          {FILTER_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setFilter(p.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                filter === p.value
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
              }`}
            >
              {p.label}
            </button>
          ))}
          <div className="h-5 w-px bg-gray-200" />
          <input
            type="text"
            placeholder="Search by niche..."
            value={nicheFilter}
            onChange={(e) => setNicheFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {nicheFilter && (
            <button
              onClick={() => setNicheFilter("")}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
          <span className="ml-auto text-xs text-gray-400">
            {sorted.length} client{sorted.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Client table */}
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          {sorted.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-gray-500">No clients match the current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <SortTh label="Client" field="name" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                    <SortTh label="Niche" field="niche" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                    <SortTh label="Tier" field="tier" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                    <SortTh label="Status" field="status" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Recovery
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      MRR
                    </th>
                    <SortTh label="Last Active" field="lastActivityAt" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Churn Risk
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sorted.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => {
                        window.location.href = `/clients/${t.id}`;
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {t.name || "Unnamed"}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">{t.id.slice(0, 8)}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{t.niche || "—"}</td>
                      <td className="px-4 py-3">{tierBadge(t.tier)}</td>
                      <td className="px-4 py-3">{statusBadge(t.status)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">72%</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        ${tierPrice[t.tier] ?? 500}/mo
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {t.lastActivityAt
                          ? new Date(t.lastActivityAt).toLocaleDateString()
                          : new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center">{churnBadge(t.churnRisk)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bulk actions bar */}
        {sorted.length > 0 && (
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200">
            <span className="text-sm text-gray-500">{sorted.length} selected —</span>
            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
              Export CSV
            </button>
            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
              Send Report
            </button>
            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
              Add Tag
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

// ---- Mini Stat ----

function MiniStat({
  label,
  value,
  color = "indigo",
}: {
  label: string;
  value: number | string;
  color?: "indigo" | "green" | "yellow" | "red";
}) {
  const bgColors: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-700",
    green: "bg-green-50 text-green-700",
    yellow: "bg-yellow-50 text-yellow-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <span className={`inline-flex rounded-lg px-2.5 py-1 text-lg font-bold ${bgColors[color]}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
      <p className="mt-1 text-xs font-medium text-gray-500">{label}</p>
    </div>
  );
}

// ---- Sort Header ----

function SortTh({
  label,
  field,
  sortKey,
  sortDir,
  onToggle,
}: {
  label: string;
  field: string;
  sortKey: string;
  sortDir: "asc" | "desc";
  onToggle: (key: string) => void;
}) {
  return (
    <th className="px-4 py-3 text-left">
      <button
        onClick={() => onToggle(field)}
        className="text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 flex items-center gap-1"
      >
        {label}
        {sortKey === field && (
          <span className="text-indigo-600">{sortDir === "asc" ? "↑" : "↓"}</span>
        )}
      </button>
    </th>
  );
}
