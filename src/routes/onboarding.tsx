import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { submitOnboarding } from "~/server/fns";

// ---- Types ----

interface FormData {
  businessName: string;
  niche: string;
  serviceArea: string;
  serviceOffering: string;
  pricePoints: string;
  calendarLink: string;
  crmType: string;
  phoneNumber: string;
  email: string;
  brandVoice: string;
  faqs: string;
  commonObjections: string;
  leadSources: string[];
}

const INITIAL: FormData = {
  businessName: "",
  niche: "",
  serviceArea: "",
  serviceOffering: "",
  pricePoints: "",
  calendarLink: "",
  crmType: "",
  phoneNumber: "",
  email: "",
  brandVoice: "",
  faqs: "",
  commonObjections: "",
  leadSources: [],
};

const LEAD_SOURCE_OPTIONS = [
  "Website forms",
  "Paid ads (Google/Facebook)",
  "Referral partners",
  "Cold outreach",
  "Social media (organic)",
  "Email marketing",
  "Events / trade shows",
  "Marketplaces (Angi, Thumbtack, etc.)",
];

const CRM_OPTIONS = [
  "GoHighLevel",
  "HubSpot",
  "Salesforce",
  "Zoho",
  "Pipedrive",
  "Keap/Infusionsoft",
  "Monday.com",
  "ClickUp",
  "Notion / Airtable",
  "None / Spreadsheets",
];

const STEPS = [
  "Business Basics",
  "Offer & Pricing",
  "Systems Access",
  "Branding & Content",
  "Lead Sources",
  "Review & Submit",
];

// ---- Route ----

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const update = useCallback(
    (patch: Partial<FormData>) => setForm((f) => ({ ...f, ...patch })),
    [],
  );

  const toggleLeadSource = (src: string) => {
    setForm((f) => ({
      ...f,
      leadSources: f.leadSources.includes(src)
        ? f.leadSources.filter((s) => s !== src)
        : [...f.leadSources, src],
    }));
  };

  const canNext = (): boolean => {
    switch (step) {
      case 0:
        return !!form.businessName && !!form.niche && !!form.serviceArea;
      case 1:
        return !!form.serviceOffering;
      case 2:
        return !!form.crmType && !!form.email;
      case 3:
        return !!form.brandVoice;
      case 4:
        return form.leadSources.length > 0;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const result = await submitOnboarding({ data: form });
      setSubmittedId(result.id);
      setStep(6); // Show success
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Success screen ----
  if (step === 6) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="rounded-full bg-green-100 p-4">
          <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold">Onboarding Submitted!</h1>
        <p className="max-w-md text-gray-600">
          Your client setup is in progress. View the checklist and launch status in the client portal.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => navigate({ to: "/portal", search: { clientId: submittedId! } })}
            className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700 transition"
          >
            View Portal
          </button>
          <button
            onClick={() => navigate({ to: "/admin" })}
            className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Admin Dashboard
          </button>
        </div>
      </main>
    );
  }

  // ---- Form steps ----
  return (
    <main className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Client Onboarding</h1>
          <p className="mt-1 text-gray-500">Set up a new client for AI Lead Recovery</p>
        </div>

        {/* Step indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((label, i) => (
              <div key={label} className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition ${
                    i < step
                      ? "bg-indigo-600 text-white"
                      : i === step
                        ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-600"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {i < step ? "✓" : i + 1}
                </div>
                <span className="mt-1 hidden text-xs text-gray-500 sm:block">{label}</span>
              </div>
            ))}
          </div>
          {/* Connector bar */}
          <div className="relative mt-4 h-1 rounded bg-gray-200">
            <div
              className="absolute h-1 rounded bg-indigo-600 transition-all duration-300"
              style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          {/* Step 0: Business Basics */}
          {step === 0 && (
            <StepWrapper
              title="Business Basics"
              subtitle="Tell us about the client's business"
            >
              <Field label="Business Name" required>
                <input
                  type="text"
                  value={form.businessName}
                  onChange={(e) => update({ businessName: e.target.value })}
                  placeholder="e.g. Acme Plumbing Co."
                  className="field-input"
                />
              </Field>
              <Field label="Industry / Niche" required>
                <input
                  type="text"
                  value={form.niche}
                  onChange={(e) => update({ niche: e.target.value })}
                  placeholder="e.g. Residential plumbing, HVAC, Legal services"
                  className="field-input"
                />
              </Field>
              <Field label="Service Area" required>
                <input
                  type="text"
                  value={form.serviceArea}
                  onChange={(e) => update({ serviceArea: e.target.value })}
                  placeholder="e.g. Greater Phoenix, AZ"
                  className="field-input"
                />
              </Field>
            </StepWrapper>
          )}

          {/* Step 1: Offer & Pricing */}
          {step === 1 && (
            <StepWrapper
              title="Offer & Pricing"
              subtitle="Define what the client sells and at what price"
            >
              <Field label="Service Offering" required>
                <textarea
                  value={form.serviceOffering}
                  onChange={(e) => update({ serviceOffering: e.target.value })}
                  placeholder="Describe the core service/product the client offers..."
                  rows={3}
                  className="field-input"
                />
              </Field>
              <Field label="Price Points">
                <input
                  type="text"
                  value={form.pricePoints}
                  onChange={(e) => update({ pricePoints: e.target.value })}
                  placeholder="e.g. $99/mo Starter, $299/mo Pro, $599/mo Enterprise"
                  className="field-input"
                />
              </Field>
              <Field label="Calendar / Booking Link">
                <input
                  type="url"
                  value={form.calendarLink}
                  onChange={(e) => update({ calendarLink: e.target.value })}
                  placeholder="https://calendly.com/yourname/discovery"
                  className="field-input"
                />
              </Field>
            </StepWrapper>
          )}

          {/* Step 2: Systems Access */}
          {step === 2 && (
            <StepWrapper
              title="Systems Access"
              subtitle="Connect the tools the client already uses"
            >
              <Field label="CRM / Pipeline Tool" required>
                <select
                  value={form.crmType}
                  onChange={(e) => update({ crmType: e.target.value })}
                  className="field-input"
                >
                  <option value="">Select CRM...</option>
                  {CRM_OPTIONS.map((crm) => (
                    <option key={crm} value={crm}>
                      {crm}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Business Phone Number">
                <input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) => update({ phoneNumber: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="field-input"
                />
              </Field>
              <Field label="Business Email" required>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update({ email: e.target.value })}
                  placeholder="client@business.com"
                  className="field-input"
                />
              </Field>
            </StepWrapper>
          )}

          {/* Step 3: Branding & Content */}
          {step === 3 && (
            <StepWrapper
              title="Branding & Content"
              subtitle="Define the client's voice and messaging"
            >
              <Field label="Brand Voice & Tone" required>
                <textarea
                  value={form.brandVoice}
                  onChange={(e) => update({ brandVoice: e.target.value })}
                  placeholder="e.g. Professional but friendly, no jargon, trust-building tone..."
                  rows={3}
                  className="field-input"
                />
              </Field>
              <Field label="Frequently Asked Questions">
                <textarea
                  value={form.faqs}
                  onChange={(e) => update({ faqs: e.target.value })}
                  placeholder="Q: Do you offer free estimates?&#10;A: Yes, all estimates are free...&#10;&#10;Q: What's your warranty?&#10;A: We offer a 1-year warranty on all work..."
                  rows={4}
                  className="field-input"
                />
              </Field>
              <Field label="Common Objections & Rebuttals">
                <textarea
                  value={form.commonObjections}
                  onChange={(e) => update({ commonObjections: e.target.value })}
                  placeholder="Objection: Too expensive&#10;Rebuttal: We offer financing options...&#10;&#10;Objection: Need to think about it&#10;Rebuttal: Our availability fills up quickly..."
                  rows={4}
                  className="field-input"
                />
              </Field>
            </StepWrapper>
          )}

          {/* Step 4: Lead Sources */}
          {step === 4 && (
            <StepWrapper
              title="Lead Sources"
              subtitle="Where do this client's leads come from?"
            >
              <p className="mb-4 text-sm text-gray-500">Select all that apply:</p>
              <div className="space-y-3">
                {LEAD_SOURCE_OPTIONS.map((src) => (
                  <label
                    key={src}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                      form.leadSources.includes(src)
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.leadSources.includes(src)}
                      onChange={() => toggleLeadSource(src)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{src}</span>
                  </label>
                ))}
              </div>
            </StepWrapper>
          )}

          {/* Step 5: Review & Submit */}
          {step === 5 && (
            <StepWrapper title="Review & Submit" subtitle="Verify everything looks correct">
              <div className="space-y-4">
                <ReviewSection title="Business Basics">
                  <ReviewRow label="Business Name" value={form.businessName} />
                  <ReviewRow label="Niche" value={form.niche} />
                  <ReviewRow label="Service Area" value={form.serviceArea} />
                </ReviewSection>
                <ReviewSection title="Offer & Pricing">
                  <ReviewRow label="Service Offering" value={form.serviceOffering} />
                  <ReviewRow label="Price Points" value={form.pricePoints} />
                  <ReviewRow label="Calendar Link" value={form.calendarLink} />
                </ReviewSection>
                <ReviewSection title="Systems Access">
                  <ReviewRow label="CRM" value={form.crmType} />
                  <ReviewRow label="Phone" value={form.phoneNumber} />
                  <ReviewRow label="Email" value={form.email} />
                </ReviewSection>
                <ReviewSection title="Branding & Content">
                  <ReviewRow label="Brand Voice" value={form.brandVoice} />
                  <ReviewRow label="FAQs" value={form.faqs || "—"} />
                  <ReviewRow label="Objections" value={form.commonObjections || "—"} />
                </ReviewSection>
                <ReviewSection title="Lead Sources">
                  <ReviewRow
                    label="Sources"
                    value={form.leadSources.length > 0 ? form.leadSources.join(", ") : "—"}
                  />
                </ReviewSection>
              </div>
            </StepWrapper>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition"
          >
            ← Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              disabled={!canNext()}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40 transition"
            >
              {submitting ? "Submitting..." : "Submit Onboarding"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

// ---- Helper components ----

function StepWrapper({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mb-4 text-sm text-gray-500">{subtitle}</p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

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

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-900">{title}</h3>
      <dl className="space-y-1">{children}</dl>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className="max-w-[60%] text-right font-medium text-gray-900 truncate">{value}</dd>
    </div>
  );
}
