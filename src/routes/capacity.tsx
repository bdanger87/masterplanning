import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { fetchCapacityData } from "~/server/fns";
import type { CapacityData } from "~/server/storage";

export const Route = createFileRoute("/capacity")({
  component: CapacityPage,
});

function CapacityPage() {
  const [data, setData] = useState<CapacityData | null>(null);
  const [maxCapacity, setMaxCapacity] = useState(25);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [maxCapacity]);

  const loadData = async () => {
    setLoading(true);
    try {
      const d = await fetchCapacityData(maxCapacity);
      setData(d);
    } catch (e) {
      console.error("Failed to load capacity data", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">Loading capacity data...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Capacity Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Operational health and workload overview</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Max Capacity:</label>
            <input
              type="number"
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(Math.max(1, parseInt(e.target.value) || 25))}
              className="w-20 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              min={1}
            />
            <button
              onClick={loadData}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Utilization gauge */}
        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Capacity Utilization</h3>
            <div className="flex items-center gap-6">
              <div className="relative h-36 w-36 flex-shrink-0">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60" cy="60" r="52"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                  />
                  <circle
                    cx="60" cy="60" r="52"
                    fill="none"
                    stroke={
                      data.utilizationColor === "red"
                        ? "#ef4444"
                        : data.utilizationColor === "yellow"
                        ? "#eab308"
                        : "#22c55e"
                    }
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${(data.utilizationPercent / 100) * 327} 327`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{data.utilizationPercent}%</span>
                  <span className="text-xs text-gray-500">Used</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-gray-900">{data.activeClients}</span>
                  <span className="text-gray-500">active of</span>
                  <span className="font-medium text-gray-900">{data.maxCapacity}</span>
                  <span className="text-gray-500">max</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      data.utilizationColor === "red"
                        ? "bg-red-100 text-red-700"
                        : data.utilizationColor === "yellow"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {data.utilizationColor === "red"
                      ? "⚠ Near Capacity"
                      : data.utilizationColor === "yellow"
                      ? "● Moderate Load"
                      : "✓ Healthy"}
                  </span>
                </div>
                <div className="mt-4 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="h-2 w-2 rounded-full bg-green-500" /> 0–59% Healthy
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="h-2 w-2 rounded-full bg-yellow-500" /> 60–80% Monitor
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> 80%+ Critical
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Available slots */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 flex flex-col justify-center">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Available Slots</p>
            <p className="mt-1 text-4xl font-bold text-gray-900">
              {Math.max(0, data.maxCapacity - data.activeClients)}
            </p>
            <p className="mt-1 text-sm text-gray-500">of {data.maxCapacity} total capacity</p>
          </div>
        </div>

        {/* Revenue per client */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue per Client</h3>
          {data.revenuePerClient.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No live clients generating revenue.</p>
          ) : (
            <div className="space-y-2">
              {data.revenuePerClient.map((item, i) => {
                const maxRev = Math.max(...data.revenuePerClient.map((c) => c.revenue));
                const pct = (item.revenue / Math.max(maxRev, 1)) * 100;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-32 truncate text-sm text-gray-700">{item.name}</span>
                    <div className="flex-1">
                      <div className="h-5 rounded bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded bg-indigo-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-20 text-right text-sm font-medium text-gray-900">
                      ${item.revenue}/mo
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottlenecks & Distribution */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Bottleneck indicators */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Bottleneck Indicators</h3>

            {/* Stalled onboardings */}
            <div className="mb-6">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                Stalled Onboardings (&gt;14 days)
              </p>
              {data.stalledOnboardings.length === 0 ? (
                <p className="text-sm text-green-600">✓ No stalled onboardings</p>
              ) : (
                <div className="space-y-2">
                  {data.stalledOnboardings.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg bg-red-50 p-3">
                      <div>
                        <p className="text-sm font-medium text-red-800">{s.name}</p>
                        <p className="text-xs text-red-600">{s.daysInOnboarding} days in onboarding</p>
                      </div>
                      <a
                        href={`/clients/${s.id}`}
                        className="text-xs font-medium text-red-700 hover:text-red-900"
                      >
                        View →
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inactive clients */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                Inactive Clients (&gt;7 days no activity)
              </p>
              {data.inactiveClients.length === 0 ? (
                <p className="text-sm text-green-600">✓ All clients active within 7 days</p>
              ) : (
                <div className="space-y-2">
                  {data.inactiveClients.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg bg-yellow-50 p-3">
                      <div>
                        <p className="text-sm font-medium text-yellow-800">{c.name}</p>
                        <p className="text-xs text-yellow-600">{c.daysSinceActivity} days since last activity</p>
                      </div>
                      <a
                        href={`/clients/${c.id}`}
                        className="text-xs font-medium text-yellow-700 hover:text-yellow-900"
                      >
                        View →
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Workload distribution */}
          <div className="space-y-6">
            {/* Per tier */}
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Clients per Tier</h3>
              {data.clientsPerTier.length === 0 ? (
                <p className="text-sm text-gray-500">No data</p>
              ) : (
                <div className="space-y-3">
                  {data.clientsPerTier.map((item) => {
                    const total = data.clientsPerTier.reduce((s, i) => s + i.count, 0);
                    const pct = Math.round((item.count / Math.max(total, 1)) * 100);
                    return (
                      <div key={item.tier}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700 capitalize">{item.tier}</span>
                          <span className="text-gray-500">{item.count} ({pct}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100">
                          <div
                            className={`h-2 rounded-full ${
                              item.tier === "growth"
                                ? "bg-purple-500"
                                : item.tier === "pro"
                                ? "bg-indigo-500"
                                : "bg-gray-400"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Per niche */}
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Clients per Niche</h3>
              {data.clientsPerNiche.length === 0 ? (
                <p className="text-sm text-gray-500">No data</p>
              ) : (
                <div className="space-y-2">
                  {data.clientsPerNiche.map((item) => {
                    const total = data.clientsPerNiche.reduce((s, i) => s + i.count, 0);
                    const pct = Math.round((item.count / Math.max(total, 1)) * 100);
                    return (
                      <div key={item.niche} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{item.niche || "Uncategorized"}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-gray-100">
                            <div
                              className="h-1.5 rounded-full bg-indigo-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-gray-500 w-8 text-right">{item.count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
