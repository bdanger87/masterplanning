import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useMemo } from "react";
import { saveProspectFn, generateScriptFn } from "~/server/fns";

// ---- Types ----

interface ProspectForm {
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
}

type ProspectStatus = "new" | "qualified" | "proposal_sent" | "won" | "lost" | "nurture";
type RoutingDecision = "fit" | "maybe" | "not_fit" | null;

const INITIAL: ProspectForm = {
  name: "",
  company: "",
  role: "",
  source: "",
  painPoints: "",
  currentFlow: "",
  desiredOutcomes: "",
  budgetRange: "",
  decisionAuthority: "",
  urgency: "",
};

const SOURCE_OPTIONS = [
  "Inbound lead",
  "Outbound prospecting",
  "Referral",
  "Paid ads",
  "Event / Trade show",
  "Partner",
  "Cold outreach",
  "Other",
];

const ROLE_OPTIONS = [
  "CEO / Owner",
  "VP / Director",
  "Manager",
  "Individual contributor",
  "Consultant",
];

const SECTIONS = [
  "Prospect Info",
  "Problem Discovery",
  "Current Lead Flow",
  "Desired Outcomes",
  "Pricing Fit",
  "Decision Authority",
  "Urgency",
  "Qualification",
];

// ---- Scoring ----

function calculateScore(form: ProspectForm): number {
  let score = 0;

  // Company & role completeness (max 10)
  if (form.company && form.name && form.role) score += 10;
  else if (form.company && form.name) score += 5;

  // Pain points articulated (max 20)
  const painLines = form.painPoints.split("\n").filter((l) => l.trim().length > 4);
  if (painLines.length >= 3) score += 20;
  else if (painLines.length >= 1) score += 10;

  // Current flow described (max 10)
  if (form.currentFlow.length > 20) score += 10;
  else if (form.currentFlow.length > 5) score += 5;

  // Desired outcomes (max 15)
  const outcomeLines = form.desiredOutcomes.split("\n").filter((l) => l.trim().length > 4);
  if (outcomeLines.length >= 3) score += 15;
  else if (outcomeLines.length >= 1) score += 8;

  // Budget range (max 15)
  if (form.budgetRange) {
    const b = form.budgetRange.toLowerCase();
    if (b.includes("$") || b.includes("enterprise") || b.includes("premium")) score += 15;
    else if (b.includes("mid") || b.includes("pro")) score += 10;
    else if (b.length > 3) score += 5;
  }

  // Decision authority (max 15)
  if (form.decisionAuthority) {
    const d = form.decisionAuthority.toLowerCase();
    if (d.includes("i am") || d.includes("me") || d.includes("myself") || d.includes("owner")) score += 15;
    else if (d.includes("partner") || d.includes("team")) score += 8;
    else score += 5;
  }

  // Urgency (max 10)
  if (form.urgency) {
    const u = form.urgency.toLowerCase();
    if (u.includes("immediately") || u.includes("asap") || u.includes("urgent") || u.includes("yesterday")) score += 10;
    else if (u.includes("soon") || u.includes("month") || u.includes("quarter")) score += 7;
    else score += 4;
  }

  // Source (max 5)
  if (form.source === "Referral" || form.source === "Inbound lead") score += 5;
  else if (form.source) score += 3;

  return Math.min(100, score);
}

function getScoreColor(score: number): string {
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-600";
}

function getScoreBg(score: number): string {
  if (score >= 70) return "bg-green-100 ring-green-500";
  if (score >= 40) return "bg-yellow-100 ring-yellow-500";
  return "bg-red-100 ring-red-500";
}

function getScoreLabel(score: number): string {
  if (score >= 70) return "Strong Fit";
  if (score >= 40) return "Potential Fit";
  return "Not a Fit";
}

// ---- Route ----

export const Route = createFileRoute("/sales-call")({
  component: SalesCallPage,
});

function SalesCallPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ProspectForm>(INITIAL);
  const [prospectId, setProspectId] = useState<string | null>(null);
  const [script, setScript] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [routingDecision, setRoutingDecision] = useState<RoutingDecision>(null);

  const score = useMemo(() => calculateScore(form), [form]);

  const update = useCallback(
    (patch: Partial<ProspectForm>) => setForm((f) => ({ ...f, ...patch })),
    [],
  );

  const canNext = (): boolean => {
    switch (step) {
      case 0:
        return !!form.name && !!form.company;
      case 1:
        return !!form.painPoints;
      default:
        return true;
    }
  };

  const getDecisionFromScore = (s: number): RoutingDecision => {
    if (s >= 70) return "fit";
    if (s >= 40) return "maybe";
    return "not_fit";
  };

  // Save prospect and generate script
  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const decision = getDecisionFromScore(score);
      const status: ProspectStatus =
        decision === "fit" ? "qualified" : decision === "maybe" ? "nurture" : "lost";

      const result = await saveProspectFn({
        data: {
          ...form,
          painPoints: form.painPoints,
          currentFlow: form.currentFlow,
          score,
          status,
          callNotes: "",
          script: "",
        },
      });

      if (result) {
        setProspectId(result.id);
        setRoutingDecision(decision);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Generate script
  const handleGenerateScript = async () => {
    setGenerating(true);
    setError("");
    try {
      const result = await generateScriptFn({
        data: {
          name: form.name,
          company: form.company,
          role: form.role,
          niche: form.source,
          painPoints: form.painPoints,
          currentFlow: form.currentFlow,
          desiredOutcomes: form.desiredOutcomes,
          budgetRange: form.budgetRange,
          decisionAuthority: form.decisionAuthority,
          urgency: form.urgency,
        },
      });

      if (result) {
        setScript(result as string);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Script generation failed");
    } finally {
      setGenerating(false);
    }
  };

  // Show post-call decision screen
  if (routingDecision && prospectId) {
    return (
      <DecisionScreen
        decision={routingDecision}
        score={score}
        form={form}
        prospectId={prospectId}
        script={script}
        onGenerateScript={handleGenerateScript}
        generating={generating}
        onBack={() => {
          setRoutingDecision(null);
          setProspectId(null);
        }}
        onViewPipeline={() => navigate({ to: "/pipeline" })}
      />
    );
  }

  // ---- Main call flow ----
  return (
    <main className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Sales Call</h1>
          <p className="mt-1 text-gray-500">
            Structured qualification and closing system
          </p>
        </div>

        {/* Step indicator */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex items-center justify-between min-w-max gap-1">
            {SECTIONS.map((label, i) => (
              <div key={label} className="flex flex-col items-center">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition flex-shrink-0 ${
                    i < step
                      ? "bg-indigo-600 text-white"
                      : i === step
                        ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-600"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {i < step ? "✓" : i + 1}
                </div>
                <span className="mt-1 text-[10px] text-gray-500 hidden sm:block text-center leading-tight max-w-16">
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div className="relative mt-3 h-1 rounded bg-gray-200">
            <div
              className="absolute h-1 rounded bg-indigo-600 transition-all duration-300"
              style={{ width: `${(step / (SECTIONS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          {step === 0 && <ProspectInfoStep form={form} update={update} />}
          {step === 1 && <ProblemDiscoveryStep form={form} update={update} />}
          {step === 2 && <CurrentFlowStep form={form} update={update} />}
          {step === 3 && <DesiredOutcomesStep form={form} update={update} />}
          {step === 4 && <PricingFitStep form={form} update={update} />}
          {step === 5 && <DecisionAuthorityStep form={form} update={update} />}
          {step === 6 && <UrgencyStep form={form} update={update} />}
          {step === 7 && (
            <QualificationStep
              form={form}
              score={score}
              onSave={handleSave}
              saving={saving}
              onGenerateScript={handleGenerateScript}
              generating={generating}
              script={script}
            />
          )}
        </div>

        {/* Navigation */}
        {step < 7 && (
          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep((s) => Math.min(7, s + 1))}
              disabled={!canNext()}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

// ---- Step Components ----

function ProspectInfoStep({
  form,
  update,
}: {
  form: ProspectForm;
  update: (p: Partial<ProspectForm>) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Prospect Information</h2>
      <p className="mb-4 text-sm text-gray-500">Basic details about who you're speaking with</p>
      <div className="space-y-4">
        <Field label="Full Name" required>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="e.g. Sarah Chen"
            className="field-input"
          />
        </Field>
        <Field label="Company" required>
          <input
            type="text"
            value={form.company}
            onChange={(e) => update({ company: e.target.value })}
            placeholder="e.g. Brightline Marketing"
            className="field-input"
          />
        </Field>
        <Field label="Role">
          <select
            value={form.role}
            onChange={(e) => update({ role: e.target.value })}
            className="field-input"
          >
            <option value="">Select role...</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field label="Lead Source">
          <select
            value={form.source}
            onChange={(e) => update({ source: e.target.value })}
            className="field-input"
          >
            <option value="">Select source...</option>
            {SOURCE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}

function ProblemDiscoveryStep({
  form,
  update,
}: {
  form: ProspectForm;
  update: (p: Partial<ProspectForm>) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Problem Discovery</h2>
      <p className="mb-4 text-sm text-gray-500">
        What's broken in their current lead flow? What pain points are they experiencing?
      </p>
      <div className="space-y-4">
        <Field label="Pain Points" required>
          <textarea
            value={form.painPoints}
            onChange={(e) => update({ painPoints: e.target.value })}
            placeholder={`Leads go unanswered for hours\nResponse time is 4+ hours on average\nNo structured follow-up process\nLost 3 deals this month from slow response\nCurrent CRM is too complex for the team`}
            rows={6}
            className="field-input"
          />
        </Field>
        <p className="text-xs text-gray-400">
          List each pain point on a new line. Be specific — this drives the tailored script.
        </p>
      </div>
    </div>
  );
}

function CurrentFlowStep({
  form,
  update,
}: {
  form: ProspectForm;
  update: (p: Partial<ProspectForm>) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Current Lead Flow</h2>
      <p className="mb-4 text-sm text-gray-500">
        How do they handle leads today? Volume, response time, follow-up process.
      </p>
      <div className="space-y-4">
        <Field label="Current Lead Flow Description">
          <textarea
            value={form.currentFlow}
            onChange={(e) => update({ currentFlow: e.target.value })}
            placeholder={`~50 leads/week from website forms and paid ads\nCurrently using HubSpot but only 30% of features\nManual follow-up by 2 SDRs\nAverage response time: 3 hours\nEstimated 20% of leads never get contacted`}
            rows={6}
            className="field-input"
          />
        </Field>
      </div>
    </div>
  );
}

function DesiredOutcomesStep({
  form,
  update,
}: {
  form: ProspectForm;
  update: (p: Partial<ProspectForm>) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Desired Outcomes</h2>
      <p className="mb-4 text-sm text-gray-500">
        What does success look like? What metrics matter to them?
      </p>
      <div className="space-y-4">
        <Field label="Desired Outcomes">
          <textarea
            value={form.desiredOutcomes}
            onChange={(e) => update({ desiredOutcomes: e.target.value })}
            placeholder={`Respond to every lead within 60 seconds\nIncrease qualified meetings by 40%\nReduce SDR workload by 50%\nClose rate from leads: 15% → 25%`}
            rows={5}
            className="field-input"
          />
        </Field>
      </div>
    </div>
  );
}

function PricingFitStep({
  form,
  update,
}: {
  form: ProspectForm;
  update: (p: Partial<ProspectForm>) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Pricing Fit</h2>
      <p className="mb-4 text-sm text-gray-500">
        What's their budget range? What are they currently spending?
      </p>
      <div className="space-y-4">
        <Field label="Budget Range">
          <input
            type="text"
            value={form.budgetRange}
            onChange={(e) => update({ budgetRange: e.target.value })}
            placeholder="e.g. $1,500–$3,000/mo, or 'Enterprise — needs custom pricing'"
            className="field-input"
          />
        </Field>
        <Field label="Current Spend (tools + people)">
          <input
            type="text"
            onChange={() => {}}
            placeholder="e.g. ~$4,500/mo on SDRs + $800/mo on HubSpot"
            className="field-input opacity-50"
            disabled
          />
          <span className="text-xs text-gray-400">Coming soon — add to call notes for now</span>
        </Field>
      </div>
    </div>
  );
}

function DecisionAuthorityStep({
  form,
  update,
}: {
  form: ProspectForm;
  update: (p: Partial<ProspectForm>) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Decision Authority</h2>
      <p className="mb-4 text-sm text-gray-500">
        Who makes the decision? What's the timeline? Any competing options?
      </p>
      <div className="space-y-4">
        <Field label="Decision Maker">
          <textarea
            value={form.decisionAuthority}
            onChange={(e) => update({ decisionAuthority: e.target.value })}
            placeholder={`I am the decision maker\nNeeds sign-off from the COO\nEvaluating 2 other vendors\nTimeline: decision by end of month`}
            rows={4}
            className="field-input"
          />
        </Field>
      </div>
    </div>
  );
}

function UrgencyStep({
  form,
  update,
}: {
  form: ProspectForm;
  update: (p: Partial<ProspectForm>) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Urgency</h2>
      <p className="mb-4 text-sm text-gray-500">
        Why now? What's the cost of inaction?
      </p>
      <div className="space-y-4">
        <Field label="Urgency / Timeline">
          <textarea
            value={form.urgency}
            onChange={(e) => update({ urgency: e.target.value })}
            placeholder={`Need a solution within 2 weeks — peak season starts next month\nLosing ~$15K/month in missed leads\nBoard is pushing for better lead conversion metrics`}
            rows={4}
            className="field-input"
          />
        </Field>
      </div>
    </div>
  );
}

function QualificationStep({
  form,
  score,
  onSave,
  saving,
  onGenerateScript,
  generating,
  script,
}: {
  form: ProspectForm;
  score: number;
  onSave: () => void;
  saving: boolean;
  onGenerateScript: () => void;
  generating: boolean;
  script: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Qualification Score</h2>
      <p className="mb-6 text-sm text-gray-500">
        Auto-calculated based on your responses across all sections
      </p>

      {/* Score Display */}
      <div className="mb-8 flex flex-col items-center">
        <div
          className={`flex h-28 w-28 items-center justify-center rounded-full ring-4 ${getScoreBg(score)}`}
        >
          <div className="text-center">
            <span className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</span>
            <span className={`block text-xs font-medium ${getScoreColor(score)}`}>/ 100</span>
          </div>
        </div>
        <span className={`mt-3 text-lg font-semibold ${getScoreColor(score)}`}>
          {getScoreLabel(score)}
        </span>
        <p className="mt-1 text-sm text-gray-500">
          {score >= 70
            ? "Great fit — route to proposal"
            : score >= 40
              ? "Needs nurturing — follow up in 2 weeks"
              : "Not a strong fit — consider polite pass"}
        </p>
      </div>

      {/* Score breakdown */}
      <div className="mb-6 rounded-lg border border-gray-200 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Score Breakdown</h3>
        <div className="space-y-2 text-sm">
          <ScoreRow label="Company & Role" score={form.company && form.name && form.role ? 10 : form.company && form.name ? 5 : 0} max={10} />
          <ScoreRow label="Pain Points Articulated" score={form.painPoints.split("\n").filter(l => l.trim().length > 4).length >= 3 ? 20 : form.painPoints.split("\n").filter(l => l.trim().length > 4).length >= 1 ? 10 : 0} max={20} />
          <ScoreRow label="Current Flow" score={form.currentFlow.length > 20 ? 10 : form.currentFlow.length > 5 ? 5 : 0} max={10} />
          <ScoreRow label="Desired Outcomes" score={form.desiredOutcomes.split("\n").filter(l => l.trim().length > 4).length >= 3 ? 15 : form.desiredOutcomes.split("\n").filter(l => l.trim().length > 4).length >= 1 ? 8 : 0} max={15} />
          <ScoreRow label="Budget Range" score={form.budgetRange ? (form.budgetRange.toLowerCase().includes("$") ? 15 : 10) : 0} max={15} />
          <ScoreRow label="Decision Authority" score={form.decisionAuthority ? (form.decisionAuthority.toLowerCase().includes("i am") || form.decisionAuthority.toLowerCase().includes("owner") ? 15 : 5) : 0} max={15} />
          <ScoreRow label="Urgency" score={form.urgency ? (form.urgency.toLowerCase().includes("immediate") || form.urgency.toLowerCase().includes("asap") ? 10 : 5) : 0} max={10} />
          <ScoreRow label="Lead Source" score={form.source === "Referral" || form.source === "Inbound lead" ? 5 : form.source ? 3 : 0} max={5} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onGenerateScript}
          disabled={generating}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition"
        >
          {generating ? "Generating..." : "Generate Call Script"}
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40 transition"
        >
          {saving ? "Saving..." : "Save & Route Prospect"}
        </button>
      </div>

      {/* Script preview */}
      {script && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Generated Script Preview</h3>
          <pre className="whitespace-pre-wrap text-xs text-gray-600 max-h-64 overflow-y-auto font-mono">
            {script}
          </pre>
        </div>
      )}
    </div>
  );
}

// ---- Decision Screen ----

function DecisionScreen({
  decision,
  score,
  form,
  prospectId,
  script,
  onGenerateScript,
  generating,
  onBack,
  onViewPipeline,
}: {
  decision: RoutingDecision;
  score: number;
  form: ProspectForm;
  prospectId: string;
  script: string;
  onGenerateScript: () => void;
  generating: boolean;
  onBack: () => void;
  onViewPipeline: () => void;
}) {
  return (
    <main className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
            decision === "fit" ? "bg-green-100" : decision === "maybe" ? "bg-yellow-100" : "bg-red-100"
          }`}>
            {decision === "fit" && (
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {decision === "maybe" && (
              <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {decision === "not_fit" && (
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {decision === "fit" && "Route to Proposal"}
            {decision === "maybe" && "Nurture"}
            {decision === "not_fit" && "Not a Fit"}
          </h1>
          <p className="mt-1 text-gray-500">
            Score: <span className={`font-semibold ${getScoreColor(score)}`}>{score}/100</span> — {form.name} at {form.company}
          </p>
        </div>

        {/* Decision content */}
        <div className="space-y-6">
          {decision === "fit" && <FitCard form={form} prospectId={prospectId} />}
          {decision === "maybe" && <MaybeCard form={form} prospectId={prospectId} />}
          {decision === "not_fit" && <NotFitCard form={form} />}

          {/* Script section */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Call Script</h2>
              {!script && (
                <button
                  onClick={onGenerateScript}
                  disabled={generating}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition"
                >
                  {generating ? "Generating..." : "Generate Script"}
                </button>
              )}
            </div>
            {script ? (
              <pre className="whitespace-pre-wrap text-sm text-gray-700 max-h-96 overflow-y-auto bg-gray-50 rounded-lg p-4 font-mono text-xs leading-relaxed">
                {script}
              </pre>
            ) : (
              <p className="text-sm text-gray-500 italic">
                Click "Generate Script" to create a tailored call script from this prospect's data.
              </p>
            )}
          </div>

          {/* Next Steps Checklist */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Next Steps</h2>
            <div className="space-y-3">
              {decision === "fit" && (
                <>
                  <CheckItem done={false} label="Send proposal & invoice (Stripe integration coming soon)" />
                  <CheckItem done={false} label="Schedule follow-up call within 48 hours" />
                  <CheckItem done={false} label="Prepare onboarding materials" />
                  <CheckItem done={true} label="Call recap saved" />
                </>
              )}
              {decision === "maybe" && (
                <>
                  <CheckItem done={false} label="Send nurture email with case studies" />
                  <CheckItem done={false} label="Schedule follow-up in 14 days" />
                  <CheckItem done={false} label="Add to nurture sequence" />
                  <CheckItem done={true} label="Call recap saved" />
                </>
              )}
              {decision === "not_fit" && (
                <>
                  <CheckItem done={false} label="Send polite pass email" />
                  <CheckItem done={false} label="Optionally add to low-touch nurture list" />
                  <CheckItem done={true} label="Call recap saved" />
                </>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              ← Back to Call
            </button>
            <button
              onClick={onViewPipeline}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition"
            >
              View Pipeline
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

// ---- Decision Cards ----

function FitCard({ form, prospectId }: { form: ProspectForm; prospectId: string }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-green-200">
      <h2 className="text-lg font-semibold text-green-800 mb-4">Proposal Summary</h2>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Prospect</span>
          <span className="font-medium">{form.name} — {form.company}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Role</span>
          <span className="font-medium">{form.role || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Budget Range</span>
          <span className="font-medium">{form.budgetRange || "Not specified"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Key Pain Points</span>
          <span className="font-medium text-right max-w-xs truncate">
            {form.painPoints.split("\n")[0] || "—"}
          </span>
        </div>
        <hr className="border-gray-200" />
        <div className="flex justify-between">
          <span className="text-gray-500">Offer</span>
          <span className="font-medium text-indigo-600">LeadLoop Core — Lead Recovery + AI Response</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Pricing</span>
          <span className="font-medium">Based on {form.budgetRange || "scope discussion"}</span>
        </div>
      </div>
      <button
        className="mt-4 w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition"
        onClick={() => {}}
      >
        Send Proposal & Invoice (Stripe — Coming Soon)
      </button>
    </div>
  );
}

function MaybeCard({ form, prospectId }: { form: ProspectForm; prospectId: string }) {
  const followUpDate = new Date();
  followUpDate.setDate(followUpDate.getDate() + 14);
  const dateStr = followUpDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-yellow-200">
      <h2 className="text-lg font-semibold text-yellow-800 mb-4">Nurture Plan</h2>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Status</span>
          <span className="font-medium text-yellow-700">Nurture</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Suggested Follow-up</span>
          <span className="font-medium">{dateStr}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Reason</span>
          <span className="font-medium">Moderate fit — needs more qualification or budget clarity</span>
        </div>
        <hr className="border-gray-200" />
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase">Nurture Email Template</span>
          <div className="mt-2 rounded bg-gray-50 p-3 text-xs text-gray-600 font-mono">
            Subject: Great chatting, {form.name} — a few resources for you{"\n\n"}
            Hi {form.name},{"\n\n"}
            Thanks again for your time today. I put together a few case studies that might be relevant as you evaluate your lead follow-up options.{"\n\n"}
            [Link to case studies]{"\n\n"}
            No rush — I'll follow up in a couple weeks to see how things are going. In the meantime, happy to answer any questions.{"\n\n"}
            Best,{"\n"}
            [Your name]
          </div>
        </div>
      </div>
    </div>
  );
}

function NotFitCard({ form }: { form: ProspectForm }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-red-200">
      <h2 className="text-lg font-semibold text-red-800 mb-4">Not a Fit</h2>
      <p className="text-sm text-gray-600 mb-4">
        Based on the qualification score, {form.name} at {form.company} is not a strong fit for LeadLoop at this time. 
        This could be due to budget mismatch, lack of urgency, or misaligned needs.
      </p>
      <div className="rounded bg-gray-50 p-3 text-xs text-gray-600 font-mono">
        Subject: Thanks for your time, {form.name}{"\n\n"}
        Hi {form.name},{"\n\n"}
        Thanks for taking the time to chat with me today. Based on our conversation, it sounds like our solution might not be the best fit for where you are right now — and I'd rather be upfront about that than waste your time.{"\n\n"}
        I'll keep you in mind if anything changes on our end that better aligns with your needs. In the meantime, best of luck with [their goals]!{"\n\n"}
        Best,{"\n"}
        [Your name]
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
        <input type="checkbox" className="rounded border-gray-300 text-indigo-600" />
        Add to low-touch nurture list
      </label>
    </div>
  );
}

// ---- Shared Components ----

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function ScoreRow({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-40 text-gray-600">{label}</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-gray-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 text-right text-xs text-gray-500">
        {score}/{max}
      </span>
    </div>
  );
}

function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
          done ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
        }`}
      >
        {done ? "✓" : "○"}
      </div>
      <span className={`text-sm ${done ? "text-gray-600 line-through" : "text-gray-700"}`}>
        {label}
      </span>
    </div>
  );
}
