import { createServerFn } from "@tanstack/react-start";
import {
  saveClient,
  getClient,
  getAllClients,
  getClientsByTenant,
  getChecklistProgress,
  getDashboardStats,
  getCapacityData,
  getTenantsWithActivity,
  getTenant,
  getAllTenants,
  createTenant,
  updateTenant,
  getActivityTimeline,
  type OnboardingData,
  type TenantTier,
  type TenantStatus,
  type DashboardStats,
  type CapacityData,
  type TenantWithActivity,
} from "~/server/storage";
import {
  saveProspect,
  fetchProspect,
  fetchAllProspects,
  updateProspect,
  type ProspectData,
} from "~/server/storage";

// ---- Onboarding ----

/**
 * Submit a completed onboarding form. Creates a tenant + client record.
 */
export const submitOnboarding = createServerFn({ method: "POST" })
  .validator((data: unknown): OnboardingData & { tenantId?: string } => {
    const d = data as Record<string, unknown>;
    return {
      tenantId: typeof d.tenantId === "string" ? d.tenantId : undefined,
      businessName: String(d.businessName ?? ""),
      niche: String(d.niche ?? ""),
      serviceArea: String(d.serviceArea ?? ""),
      serviceOffering: String(d.serviceOffering ?? ""),
      pricePoints: String(d.pricePoints ?? ""),
      calendarLink: String(d.calendarLink ?? ""),
      crmType: String(d.crmType ?? ""),
      phoneNumber: String(d.phoneNumber ?? ""),
      email: String(d.email ?? ""),
      brandVoice: String(d.brandVoice ?? ""),
      faqs: String(d.faqs ?? ""),
      commonObjections: String(d.commonObjections ?? ""),
      leadSources: Array.isArray(d.leadSources)
        ? d.leadSources.map((s: unknown) => String(s))
        : [],
    };
  })
  .handler(async ({ data }) => {
    // Auto-create tenant if no tenantId provided
    let tenantId = data.tenantId;
    if (!tenantId) {
      const tenant = await createTenant(data.businessName, data.niche, "starter");
      tenantId = tenant.id;
      // Auto-move to live when first client created
      await updateTenant(tenantId, { status: "live" });
    }
    const { tenantId: _, ...onboardingData } = data;
    const record = await saveClient(onboardingData, tenantId);
    const progress = getChecklistProgress(record.checklist);
    return { ...record, tenantId, progress };
  });

// ---- Clients ----

/**
 * Fetch a single client by ID.
 */
export const fetchClient = createServerFn({ method: "GET" })
  .validator((id: unknown): string => String(id ?? ""))
  .handler(async ({ data: id }) => {
    const client = await getClient(id);
    if (!client) return null;
    return { ...client, progress: getChecklistProgress(client.checklist) };
  });

/**
 * Fetch all clients (for admin).
 */
export const fetchAllClients = createServerFn({ method: "GET" }).handler(async () => {
  const clients = await getAllClients();
  return clients.map((c) => ({
    ...c,
    progress: getChecklistProgress(c.checklist),
  }));
});

// ---- Tenants ----

/**
 * Fetch all tenants with activity data.
 */
export const fetchTenantsWithActivity = createServerFn({ method: "GET" })
  .handler(async (): Promise<TenantWithActivity[]> => {
    return getTenantsWithActivity();
  });

/**
 * Fetch a single tenant by ID.
 */
export const fetchTenant = createServerFn({ method: "GET" })
  .validator((id: unknown): string => String(id ?? ""))
  .handler(async ({ data: id }) => {
    const tenant = await getTenant(id);
    if (!tenant) return null;
    const timeline = getActivityTimeline(tenant);
    return { ...tenant, timeline };
  });

/**
 * Fetch all tenants.
 */
export const fetchAllTenants = createServerFn({ method: "GET" }).handler(async () => {
  return getAllTenants();
});

/**
 * Update a tenant.
 */
export const updateTenantFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as Record<string, unknown>;
    return {
      id: String(d.id ?? ""),
      name: typeof d.name === "string" ? d.name : undefined,
      niche: typeof d.niche === "string" ? d.niche : undefined,
      tier: typeof d.tier === "string" ? (d.tier as TenantTier) : undefined,
      status: typeof d.status === "string" ? (d.status as TenantStatus) : undefined,
    };
  })
  .handler(async ({ data }) => {
    const { id, ...patch } = data;
    const tenant = await updateTenant(id, patch);
    return tenant ?? null;
  });

// ---- Dashboard ----

/**
 * Fetch master dashboard stats.
 */
export const fetchDashboardStats = createServerFn({ method: "GET" })
  .handler(async (): Promise<DashboardStats> => {
    return getDashboardStats();
  });

/**
 * Fetch capacity dashboard data.
 */
export const fetchCapacityData = createServerFn({ method: "GET" })
  .validator((maxCapacity: unknown): number => {
    const n = Number(maxCapacity);
    return Number.isFinite(n) && n > 0 ? n : 25;
  })
  .handler(async ({ data: maxCapacity }): Promise<CapacityData> => {
    return getCapacityData(maxCapacity);
  });

/**
 * Fetch clients for a specific tenant.
 */
export const fetchClientsByTenant = createServerFn({ method: "GET" })
  .validator((tenantId: unknown): string => String(tenantId ?? ""))
  .handler(async ({ data: tenantId }) => {
    const clients = await getClientsByTenant(tenantId);
    return clients.map((c) => ({
      ...c,
      progress: getChecklistProgress(c.checklist),
    }));
  });

// ---- Prospects ----

/**
 * Save a prospect record (create or update if ID provided).
 */
export const saveProspectFn = createServerFn({ method: "POST" })
  .validator((data: unknown): ProspectData & { id?: string; tenantId?: string } => {
    const d = data as Record<string, unknown>;
    return {
      id: typeof d.id === "string" ? d.id : undefined,
      tenantId: typeof d.tenantId === "string" ? d.tenantId : undefined,
      name: String(d.name ?? ""),
      company: String(d.company ?? ""),
      role: String(d.role ?? ""),
      source: String(d.source ?? ""),
      painPoints: String(d.painPoints ?? ""),
      currentFlow: String(d.currentFlow ?? ""),
      desiredOutcomes: String(d.desiredOutcomes ?? ""),
      budgetRange: String(d.budgetRange ?? ""),
      decisionAuthority: String(d.decisionAuthority ?? ""),
      urgency: String(d.urgency ?? ""),
      score: typeof d.score === "number" ? d.score : 0,
      status: String(d.status ?? "new") as ProspectData["status"],
      callNotes: String(d.callNotes ?? ""),
      script: String(d.script ?? ""),
    };
  })
  .handler(async ({ data }) => {
    if (data.id) {
      const { id, tenantId, ...patch } = data;
      const updated = await updateProspect(id, patch);
      return updated ?? null;
    }
    const { id: _, tenantId, ...prospectData } = data;
    const record = await saveProspect(prospectData, tenantId ?? "");
    return record;
  });

/**
 * Fetch a single prospect by ID.
 */
export const fetchProspectFn = createServerFn({ method: "GET" })
  .validator((id: unknown): string => String(id ?? ""))
  .handler(async ({ data: id }) => {
    const prospect = await fetchProspect(id);
    return prospect ?? null;
  });

/**
 * Fetch all prospects.
 */
export const fetchAllProspectsFn = createServerFn({ method: "GET" }).handler(async () => {
  const prospects = await fetchAllProspects();
  return prospects;
});

// ---- Script Generation ----

/**
 * Generate a tailored call script from prospect data.
 */
export const generateScriptFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as Record<string, unknown>;
    return {
      name: String(d.name ?? ""),
      company: String(d.company ?? ""),
      role: String(d.role ?? ""),
      niche: String(d.niche ?? ""),
      painPoints: String(d.painPoints ?? ""),
      currentFlow: String(d.currentFlow ?? ""),
      desiredOutcomes: String(d.desiredOutcomes ?? ""),
      budgetRange: String(d.budgetRange ?? ""),
      decisionAuthority: String(d.decisionAuthority ?? ""),
      urgency: String(d.urgency ?? ""),
    };
  })
  .handler(async ({ data }) => {
    return generateScript(data);
  });

// ---- Script Generation Logic ----

function generateScript(data: {
  name: string;
  company: string;
  role: string;
  niche: string;
  painPoints: string;
  currentFlow: string;
  desiredOutcomes: string;
  budgetRange: string;
  decisionAuthority: string;
  urgency: string;
}): string {
  const painPointsList = data.painPoints
    ? data.painPoints.split("\n").filter(Boolean)
    : [];
  const outcomesList = data.desiredOutcomes
    ? data.desiredOutcomes.split("\n").filter(Boolean)
    : [];

  const openingHook = generateOpening(data, painPointsList);
  const discoveryQuestions = generateDiscovery(data, painPointsList);
  const valueProp = generateValueProp(data, outcomesList);
  const objections = generateObjections(data);
  const closing = generateClosing(data);

  return `
========================================
SALES CALL SCRIPT — ${data.company}
Prospect: ${data.name} (${data.role})
========================================

---

## 1. OPENING HOOK

${openingHook}

---

## 2. DISCOVERY QUESTIONS

${discoveryQuestions}

---

## 3. VALUE PROPOSITION

${valueProp}

---

## 4. OBJECTION HANDLING

${objections}

---

## 5. CLOSING

${closing}

---

*Generated by LeadLoop Sales Call Engine*
`.trim();
}

function generateOpening(
  data: { name: string; company: string; role: string; urgency: string },
  painPoints: string[],
): string {
  let hook = `"Hi ${data.name}, thanks for taking the time to chat today. I've been looking at ${data.company} and I'm excited to learn more about what you're building."`;

  if (painPoints.length > 0 && painPoints[0]) {
    hook += `\n\n"From what I understand, ${painPoints[0].toLowerCase().replace(/\.$/, '')} — does that sound right? I want to make sure I'm tracking."`;
  }

  if (data.urgency && data.urgency.toLowerCase().includes("immediately")) {
    hook += `\n\n"I know timing is critical here, so let's dive right into the areas where we can make the biggest impact fastest."`;
  }

  return hook;
}

function generateDiscovery(
  data: {
    name: string;
    company: string;
    painPoints: string;
    currentFlow: string;
    budgetRange: string;
  },
  painPoints: string[],
): string {
  const questions = [
    `"Can you walk me through what happens when a new lead comes in right now — from the moment they reach out to when someone follows up?"`,
    `"What's your current response time on new leads? And are you tracking how many fall through the cracks?"`,
    `"How much time does your team spend on manual follow-up each week?"`,
  ];

  if (painPoints.length > 0) {
    painPoints.slice(0, 2).forEach((p) => {
      const clean = p.replace(/^\W*/, "").trim();
      if (clean.length > 5) {
        questions.push(
          `"You mentioned ${clean.toLowerCase().replace(/\.$/, '')} — can you quantify the impact that's having? Revenue lost? Opportunities missed?"`,
        );
      }
    });
  }

  if (data.budgetRange) {
    questions.push(
      `"What are you currently spending on tools or people to manage lead follow-up? And what kind of ROI would make this a no-brainer?"`,
    );
  }

  questions.push(
    `"If we could solve this completely, what does that look like 6 months from now?"`,
  );

  return questions.map((q, i) => `${i + 1}. ${q}`).join("\n\n");
}

function generateValueProp(
  data: { budgetRange: string; urgency: string },
  outcomes: string[],
): string {
  let vp =
    "**LeadLoop's AI Lead Recovery OS** automates your entire lead follow-up lifecycle — from instant response to qualification to booking — so no lead ever goes cold again. Here's what that means for you specifically:";

  vp +=
    "\n\n• **Instant lead response** — every lead gets contacted within 60 seconds, 24/7, with a tailored message";
  vp +=
    "\n• **Automated follow-up sequences** — multi-touch campaigns that adapt based on lead behavior";
  vp += "\n• **Human handoff only when ready** — your team talks to qualified, interested prospects";

  if (outcomes.length > 0) {
    vp += "\n\nBased on what you've shared, here's how we'd map to your goals:";
    outcomes.slice(0, 3).forEach((o) => {
      vp += `\n• ${o.trim()}`;
    });
  }

  if (data.budgetRange && data.budgetRange.toLowerCase().includes("$")) {
    vp += `\n\nAt ${data.budgetRange}, you're in the right range for our core plan, which includes full lead recovery automation, AI response, and a dedicated dashboard.`;
  }

  return vp;
}

function generateObjections(data: {
  budgetRange: string;
  decisionAuthority: string;
  urgency: string;
}): string {
  const objections = [
    {
      trigger: "It's too expensive",
      rebuttal: `"I hear you. But let's look at the math — if you're losing even 5 leads a month at your average deal size, that's likely far more than our monthly fee. Most clients see ROI within the first 2 weeks. We can start with a smaller scope and prove value before scaling."`,
    },
    {
      trigger: "We need to think about it",
      rebuttal: `"Completely fair — this is an important decision. What specific information would help you feel confident moving forward? I'm happy to put together a comparison or connect you with a client in a similar industry."${
        data.urgency ? `\n\nAlso: "${data.urgency}" — I want to make sure we're respecting your timeline. What's the cost of waiting another month?"` : ""
      }`,
    },
    {
      trigger: "We already have a CRM / someone handles this",
      rebuttal:
        '"That\'s great — having a system in place means you already understand the value. What we do is layer on top of your existing tools. Our AI handles the repetitive follow-up so your CRM is filled with qualified conversations, not cold leads. It\'s augmentation, not replacement."',
    },
    {
      trigger: "I need to talk to my [partner/team]",
      rebuttal: `"Absolutely — and I want to make that conversation easy for you. Let me send over a one-page summary of what we discussed, including the ROI projection. When would be a good time to schedule a quick follow-up with ${data.decisionAuthority || 'your team'} included?"`,
    },
    {
      trigger: "We're not ready yet",
      rebuttal:
        '"Understood. What does "ready" look like for you? Is it a timing thing, a budget thing, or something else? I want to make sure we stay helpful, not pushy — can I check back in [30 days] with some relevant content?"',
    },
  ];

  return objections
    .map(
      (o, i) =>
        `${i + 1}. **Objection**: "${o.trigger}"\n   **Rebuttal**: ${o.rebuttal}`,
    )
    .join("\n\n");
}

function generateClosing(data: {
  name: string;
  company: string;
  budgetRange: string;
  urgency: string;
}): string {
  let closing = `"${data.name}, based on everything we've discussed today, I believe LeadLoop would be a strong fit for ${data.company}. Here's what I'd propose as a next step:"`;

  closing +=
    "\n\n**Proposed Next Step**: I'll send over a proposal with pricing and scope within 24 hours. We can review it together on a quick follow-up call, or you can review and sign at your convenience.";

  if (data.urgency) {
    closing += `\n\n"I know ${data.urgency.toLowerCase()} — let's aim to get this proposal to you by EOD, and we can have a decision by end of week. Does that timeline work?"`;
  }

  closing +=
    '\n\n"Sound fair? Great — I\'ll get that over to you shortly. Thanks again for your time, ${data.name}."';

  return closing;
}
