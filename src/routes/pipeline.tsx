import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { fetchAllProspectsFn } from "~/server/fns";

// ---- Types ----

type ProspectStatus = "new" | "qualified" | "proposal_sent" | "won" | "lost" | "nurture";

interface ProspectRecord {
  id: string;
  name: string;
  company: string;
  role: string;
  source: string;
  painPoints: string;
  currentFlow: string;
  desiredOutcomes: string;
  budgetRange: string;
  decisionAuthority: string;
  urgency: string;
  score: number;
  status: ProspectStatus;
  callNotes: string;
  script: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLUMNS: { key: ProspectStatus; label: string; color: string }[] = [
  { key: "new", label: "New", color: "bg-blue-100 text-blue-800" },
  { key: "qualified", label: "Qualified", color: "bg-green-100 text-green-800" },
  { key: "proposal_sent", label: "Proposal Sent", color: "bg-purple-100 text-purple-800" },
  { key: "won", label: "Won", color: "bg-emerald-100 text-emerald-800" },
  { key: "lost", label: "Lost", color: "bg-red-100 text-red-800" },
  { key: "nurture", label: "Nurture", color: "bg-yellow-100 text-yellow-800" },
];

function getScoreColor(score: number): string {
  if (score >= 70) return "text-green-600 bg-green-50";
  if (score >= 40) return "text-yellow-600 bg-yellow-50";
  return "text-red-600 bg-red-50";
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

// ---- Route ----

export const Route = createFileRoute("/pipeline")({
  component: PipelinePage,
});

function PipelinePage() {
  const navigate = useNavigate();
  const [prospects, setProspects] = useState<ProspectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [selectedStatus, setSelectedStatus] = useState<ProspectStatus | "all">("all");

  const loadProspects = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchAllProspectsFn();
      setProspects((result ?? []) as ProspectRecord[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load prospects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProspects();
  }, [loadProspects]);

  const filtered =
    selectedStatus === "all"
      ? prospects
      : prospects.filter((p) => p.status === selectedStatus);

  // Stats
  const totalProspects = prospects.length;
  const avgScore = totalProspects > 0
    ? Math.round(prospects.reduce((sum, p) => sum + p.score, 0) / totalProspects)
    : 0;
  const wonCount = prospects.filter((p) => p.status === "won").length;

  return (
    <main className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
              <p className="mt-1 text-gray-500">
                {totalProspects} prospect{totalProspects !== 1 ? "s" : ""} · Avg score: {avgScore}/100
                {wonCount > 0 && ` · ${wonCount} won`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate({ to: "/sales-call" })}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
              >
                + New Sales Call
              </button>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {STATUS_COLUMNS.map((col) => {
            const count = prospects.filter((p) => p.status === col.key).length;
            return (
              <button
                key={col.key}
                onClick={() =>
                  setSelectedStatus(selectedStatus === col.key ? "all" : col.key)
                }
                className={`rounded-lg px-3 py-2 text-center text-xs font-medium transition ${
                  selectedStatus === col.key || selectedStatus === "all"
                    ? `${col.color} ring-2 ring-offset-1 ring-current`
                    : "bg-gray-100 text-gray-600 opacity-60"
                }`}
              >
                {col.label}
                <span className="block text-lg font-bold">{count}</span>
              </button>
            );
          })}
        </div>

        {/* View toggle */}
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => setViewMode("kanban")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              viewMode === "kanban"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            Kanban
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              viewMode === "table"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            Table
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button
              onClick={loadProspects}
              className="ml-3 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && prospects.length === 0 && (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
            <svg
              className="mx-auto h-12 w-12 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">No prospects yet</h2>
            <p className="mt-1 text-sm text-gray-500">
              Start a sales call to add your first prospect to the pipeline.
            </p>
            <button
              onClick={() => navigate({ to: "/sales-call" })}
              className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
            >
              Start Sales Call
            </button>
          </div>
        )}

        {/* Kanban view */}
        {!loading && viewMode === "kanban" && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(selectedStatus === "all"
              ? STATUS_COLUMNS
              : STATUS_COLUMNS.filter((c) => c.key === selectedStatus)
            ).map((col) => {
              const colProspects = filtered.filter((p) => p.status === col.key);
              if (colProspects.length === 0 && selectedStatus !== "all") {
                return (
                  <div key={col.key} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 text-center">
                    <p className="text-sm text-gray-400">No prospects in this column</p>
                  </div>
                );
              }
              return (
                <div key={col.key} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${col.color}`}>
                      {colProspects.length}
                    </span>
                  </div>
                  {colProspects.map((p) => (
                    <ProspectCard key={p.id} prospect={p} />
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Table view */}
        {!loading && viewMode === "table" && filtered.length > 0 && (
          <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600">Name</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Company</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Role</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Score</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Source</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Last Contact</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const statusDef = STATUS_COLUMNS.find((c) => c.key === p.status);
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition"
                      onClick={() => navigate({ to: "/sales-call" })}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-3 text-gray-600">{p.company}</td>
                      <td className="px-4 py-3 text-gray-600">{p.role || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${getScoreColor(p.score)}`}>
                          {p.score}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusDef?.color || "bg-gray-100 text-gray-600"}`}>
                          {statusDef?.label || p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.source || "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDateTime(p.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function ProspectCard({ prospect: p }: { prospect: ProspectRecord }) {
  const statusDef = STATUS_COLUMNS.find((c) => c.key === p.status);
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200 hover:ring-indigo-300 hover:shadow-md transition cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-semibold text-gray-900 text-sm">{p.name}</h4>
          <p className="text-xs text-gray-500">{p.company}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getScoreColor(p.score)}`}>
          {p.score}
        </span>
      </div>
      {p.role && <p className="text-xs text-gray-500 mb-1">{p.role}</p>}
      {p.source && (
        <p className="text-xs text-gray-400 mb-1">Source: {p.source}</p>
      )}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusDef?.color || "bg-gray-100 text-gray-600"}`}>
          {statusDef?.label || p.status}
        </span>
        <span className="text-xs text-gray-400">{formatDate(p.updatedAt)}</span>
      </div>
    </div>
  );
}
