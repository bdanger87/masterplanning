import { sql } from "~/db";

// ---- Types ----

export interface OnboardingData {
  // Step 1: Business basics
  businessName: string;
  niche: string;
  serviceArea: string;
  // Step 2: Offer & pricing
  serviceOffering: string;
  pricePoints: string;
  calendarLink: string;
  // Step 3: Systems access
  crmType: string;
  phoneNumber: string;
  email: string;
  // Step 4: Branding & content
  brandVoice: string;
  faqs: string;
  commonObjections: string;
  // Step 5: Lead sources
  leadSources: string[];
}

export type ClientStatus = "onboarding" | "live" | "stalled";
export type ChecklistItemStatus = "done" | "pending" | "in_progress";
export type TenantTier = "starter" | "pro" | "growth";
export type TenantStatus = "onboarding" | "live" | "stalled";

export interface Checklist {
  "Business info submitted": ChecklistItemStatus;
  "Service offering defined": ChecklistItemStatus;
  "Calendar linked": ChecklistItemStatus;
  "CRM connected": ChecklistItemStatus;
  "Phone verified": ChecklistItemStatus;
  "Email verified": ChecklistItemStatus;
  "Brand voice configured": ChecklistItemStatus;
  "FAQs provided": ChecklistItemStatus;
  "Objection handling prepared": ChecklistItemStatus;
  "Lead sources configured": ChecklistItemStatus;
}

export interface ClientRecord {
  id: string;
  tenantId: string;
  data: OnboardingData;
  status: ClientStatus;
  createdAt: string;
  checklist: Checklist;
}

export interface TenantRecord {
  id: string;
  name: string;
  niche: string;
  tier: TenantTier;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
  lastActivityAt?: string;
}

// ---- DB row types ----

interface ClientRow {
  id: string;
  tenant_id: string;
  business_name: string;
  niche: string;
  service_area: string;
  service_offering: string;
  price_points: string;
  calendar_link: string;
  crm_type: string;
  phone_number: string;
  email: string;
  brand_voice: string;
  faqs: string;
  common_objections: string;
  lead_sources: unknown;
  checklist_json: unknown;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface TenantRow {
  id: string;
  name: string;
  niche: string;
  tier: string;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
  last_activity_at: Date | string | null;
}

// ---- Helpers ----

function generateChecklist(data: OnboardingData): Checklist {
  return {
    "Business info submitted":
      data.businessName && data.niche && data.serviceArea ? "done" : "pending",
    "Service offering defined": data.serviceOffering ? "done" : "pending",
    "Calendar linked": data.calendarLink ? "done" : "pending",
    "CRM connected": data.crmType ? "done" : "pending",
    "Phone verified": data.phoneNumber ? "done" : "pending",
    "Email verified": data.email ? "done" : "pending",
    "Brand voice configured": data.brandVoice ? "done" : "pending",
    "FAQs provided": data.faqs ? "done" : "pending",
    "Objection handling prepared": data.commonObjections ? "done" : "pending",
    "Lead sources configured":
      data.leadSources && data.leadSources.length > 0 ? "done" : "pending",
  };
}

function parseJsonArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map((v) => String(v));
  return [];
}

function parseChecklist(val: unknown): Checklist {
  if (val && typeof val === "object" && !Array.isArray(val)) {
    return val as Checklist;
  }
  return {} as Checklist;
}

function rowToRecord(row: ClientRow): ClientRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    data: {
      businessName: row.business_name,
      niche: row.niche,
      serviceArea: row.service_area,
      serviceOffering: row.service_offering,
      pricePoints: row.price_points,
      calendarLink: row.calendar_link,
      crmType: row.crm_type,
      phoneNumber: row.phone_number,
      email: row.email,
      brandVoice: row.brand_voice,
      faqs: row.faqs,
      commonObjections: row.common_objections,
      leadSources: parseJsonArray(row.lead_sources),
    },
    status: row.status as ClientStatus,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    checklist: parseChecklist(row.checklist_json),
  };
}

function tenantRowToRecord(row: TenantRow): TenantRecord {
  return {
    id: row.id,
    name: row.name,
    niche: row.niche,
    tier: row.tier as TenantTier,
    status: row.status as TenantStatus,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
    lastActivityAt: row.last_activity_at
      ? row.last_activity_at instanceof Date
        ? row.last_activity_at.toISOString()
        : String(row.last_activity_at)
      : undefined,
  };
}

// ---- Schema init (idempotent) ----

let schemaReady = false;

async function ensureSchema(): Promise<void> {
  if (schemaReady) return;

  // Create tenants table
  await sql()`
    CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL DEFAULT '',
      niche TEXT NOT NULL DEFAULT '',
      tier TEXT NOT NULL DEFAULT 'starter',
      status TEXT NOT NULL DEFAULT 'onboarding',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_activity_at TIMESTAMPTZ
    )
  `;

  // Create clients table with tenant_id
  await sql()`
    CREATE TABLE IF NOT EXISTS clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
      business_name TEXT NOT NULL DEFAULT '',
      niche TEXT NOT NULL DEFAULT '',
      service_area TEXT NOT NULL DEFAULT '',
      service_offering TEXT NOT NULL DEFAULT '',
      price_points TEXT NOT NULL DEFAULT '',
      calendar_link TEXT NOT NULL DEFAULT '',
      crm_type TEXT NOT NULL DEFAULT '',
      phone_number TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      brand_voice TEXT NOT NULL DEFAULT '',
      faqs TEXT NOT NULL DEFAULT '',
      common_objections TEXT NOT NULL DEFAULT '',
      lead_sources JSONB NOT NULL DEFAULT '[]',
      checklist_json JSONB NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'onboarding',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // Add tenant_id column if it doesn't exist (migration for existing tables)
  await sql()`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clients' AND column_name = 'tenant_id'
      ) THEN
        ALTER TABLE clients ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `;

  schemaReady = true;
}

async function ensureProspectSchema(): Promise<void> {
  // Ensure base schema is ready (tenants + clients)
  await ensureSchema();

  await sql()`
    CREATE TABLE IF NOT EXISTS prospects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT '',
      company TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      pain_points JSONB NOT NULL DEFAULT '{}',
      current_flow JSONB NOT NULL DEFAULT '{}',
      desired_outcomes TEXT NOT NULL DEFAULT '',
      budget_range TEXT NOT NULL DEFAULT '',
      decision_authority TEXT NOT NULL DEFAULT '',
      urgency TEXT NOT NULL DEFAULT '',
      score INT NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'new',
      call_notes TEXT NOT NULL DEFAULT '',
      script TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // Add tenant_id column if it doesn't exist
  await sql()`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'prospects' AND column_name = 'tenant_id'
      ) THEN
        ALTER TABLE prospects ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `;
}

// ---- Tenant API ----

export async function createTenant(
  name: string,
  niche: string,
  tier: TenantTier = "starter",
): Promise<TenantRecord> {
  await ensureSchema();
  const rows = await sql()`
    INSERT INTO tenants (name, niche, tier, status)
    VALUES (${name}, ${niche}, ${tier}, 'onboarding')
    RETURNING *
  `;
  return tenantRowToRecord(rows[0] as TenantRow);
}

export async function getTenant(id: string): Promise<TenantRecord | undefined> {
  await ensureSchema();
  const rows = await sql()`SELECT * FROM tenants WHERE id = ${id}`;
  if (rows.length === 0) return undefined;
  return tenantRowToRecord(rows[0] as TenantRow);
}

export async function getAllTenants(): Promise<TenantRecord[]> {
  await ensureSchema();
  const rows = await sql()`SELECT * FROM tenants ORDER BY created_at DESC`;
  return (rows as TenantRow[]).map(tenantRowToRecord);
}

export async function updateTenant(
  id: string,
  patch: { name?: string; niche?: string; tier?: TenantTier; status?: TenantStatus },
): Promise<TenantRecord | undefined> {
  await ensureSchema();
  const current = await getTenant(id);
  if (!current) return undefined;

  const rows = await sql()`
    UPDATE tenants SET
      name = ${patch.name ?? current.name},
      niche = ${patch.niche ?? current.niche},
      tier = ${patch.tier ?? current.tier},
      status = ${patch.status ?? current.status},
      updated_at = now(),
      last_activity_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  if (rows.length === 0) return undefined;
  return tenantRowToRecord(rows[0] as TenantRow);
}

export async function touchTenant(id: string): Promise<void> {
  await ensureSchema();
  await sql()`UPDATE tenants SET last_activity_at = now(), updated_at = now() WHERE id = ${id}`;
}

// ---- Client API (tenant-scoped) ----

export async function saveClient(
  data: OnboardingData,
  tenantId: string,
): Promise<ClientRecord> {
  await ensureSchema();
  const checklist = generateChecklist(data);
  const rows = await sql()`
    INSERT INTO clients (
      tenant_id, business_name, niche, service_area,
      service_offering, price_points, calendar_link,
      crm_type, phone_number, email,
      brand_voice, faqs, common_objections,
      lead_sources, checklist_json
    ) VALUES (
      ${tenantId}, ${data.businessName}, ${data.niche}, ${data.serviceArea},
      ${data.serviceOffering}, ${data.pricePoints}, ${data.calendarLink},
      ${data.crmType}, ${data.phoneNumber}, ${data.email},
      ${data.brandVoice}, ${data.faqs}, ${data.commonObjections},
      ${JSON.stringify(data.leadSources)}, ${JSON.stringify(checklist)}
    )
    RETURNING *
  `;
  await touchTenant(tenantId);
  return rowToRecord(rows[0] as ClientRow);
}

export async function getClient(id: string): Promise<ClientRecord | undefined> {
  await ensureSchema();
  const rows = await sql()`SELECT * FROM clients WHERE id = ${id}`;
  if (rows.length === 0) return undefined;
  return rowToRecord(rows[0] as ClientRow);
}

export async function getClientsByTenant(tenantId: string): Promise<ClientRecord[]> {
  await ensureSchema();
  const rows = await sql()`SELECT * FROM clients WHERE tenant_id = ${tenantId} ORDER BY created_at DESC`;
  return (rows as ClientRow[]).map(rowToRecord);
}

export async function getAllClients(): Promise<ClientRecord[]> {
  await ensureSchema();
  const rows = await sql()`SELECT * FROM clients ORDER BY created_at DESC`;
  return (rows as ClientRow[]).map(rowToRecord);
}

export async function updateClientStatus(
  id: string,
  status: ClientStatus,
): Promise<ClientRecord | undefined> {
  await ensureSchema();
  const rows = await sql()`
    UPDATE clients
    SET status = ${status}, updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  if (rows.length === 0) return undefined;
  const record = rowToRecord(rows[0] as ClientRow);
  if (record.tenantId) await touchTenant(record.tenantId);
  return record;
}

export function getChecklistProgress(checklist: Checklist): {
  done: number;
  total: number;
  percent: number;
} {
  const items = Object.values(checklist);
  const done = items.filter((s) => s === "done").length;
  const total = items.length;
  return { done, total, percent: Math.round((done / total) * 100) };
}

// ---- Dashboard / Capacity helpers ----

export interface DashboardStats {
  totalClients: number;
  activeClients: number;
  onboarding: number;
  stalled: number;
  totalMRR: number;
  avgRecoveryRate: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  await ensureSchema();
  const tenants = await getAllTenants();
  const tierPrice: Record<string, number> = {
    starter: 500,
    pro: 1000,
    growth: 1500,
  };
  const totalMRR = tenants
    .filter((t) => t.status === "live")
    .reduce((sum, t) => sum + (tierPrice[t.tier] ?? 500), 0);

  return {
    totalClients: tenants.length,
    activeClients: tenants.filter((t) => t.status === "live").length,
    onboarding: tenants.filter((t) => t.status === "onboarding").length,
    stalled: tenants.filter((t) => t.status === "stalled").length,
    totalMRR,
    avgRecoveryRate: 72, // placeholder — will be real data later
  };
}

export interface CapacityData {
  activeClients: number;
  maxCapacity: number;
  utilizationPercent: number;
  utilizationColor: "green" | "yellow" | "red";
  revenuePerClient: { name: string; revenue: number }[];
  stalledOnboardings: { id: string; name: string; daysInOnboarding: number }[];
  inactiveClients: { id: string; name: string; daysSinceActivity: number }[];
  clientsPerTier: { tier: string; count: number }[];
  clientsPerNiche: { niche: string; count: number }[];
}

export async function getCapacityData(maxCapacity: number = 25): Promise<CapacityData> {
  await ensureSchema();
  const tenants = await getAllTenants();
  const activeClients = tenants.filter((t) => t.status === "live").length;
  const utilizationPercent = Math.round((activeClients / maxCapacity) * 100);

  let utilizationColor: "green" | "yellow" | "red" = "green";
  if (utilizationPercent > 80) utilizationColor = "red";
  else if (utilizationPercent >= 60) utilizationColor = "yellow";

  const tierPrice: Record<string, number> = {
    starter: 500,
    pro: 1000,
    growth: 1500,
  };

  const revenuePerClient = tenants
    .filter((t) => t.status === "live")
    .map((t) => ({
      name: t.name || "Unnamed",
      revenue: tierPrice[t.tier] ?? 500,
    }));

  const now = new Date();
  const stalledOnboardings = tenants
    .filter((t) => t.status === "onboarding")
    .map((t) => {
      const daysInOnboarding = Math.round(
        (now.getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24),
      );
      return { id: t.id, name: t.name, daysInOnboarding };
    })
    .filter((s) => s.daysInOnboarding > 14);

  const inactiveClients = tenants
    .filter((t) => t.status === "live")
    .map((t) => {
      const lastActivity = t.lastActivityAt ? new Date(t.lastActivityAt) : new Date(t.createdAt);
      const daysSinceActivity = Math.round(
        (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24),
      );
      return { id: t.id, name: t.name, daysSinceActivity };
    })
    .filter((c) => c.daysSinceActivity > 7);

  const clientsPerTier = Object.entries(
    tenants.reduce((acc, t) => {
      acc[t.tier] = (acc[t.tier] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  ).map(([tier, count]) => ({ tier, count }));

  const clientsPerNiche = Object.entries(
    tenants.reduce((acc, t) => {
      const niche = t.niche || "Uncategorized";
      acc[niche] = (acc[niche] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  ).map(([niche, count]) => ({ niche, count }));

  return {
    activeClients,
    maxCapacity,
    utilizationPercent,
    utilizationColor,
    revenuePerClient,
    stalledOnboardings,
    inactiveClients,
    clientsPerTier,
    clientsPerNiche,
  };
}

export interface TenantWithActivity extends TenantRecord {
  churnRisk: "green" | "yellow" | "red";
}

export async function getTenantsWithActivity(): Promise<TenantWithActivity[]> {
  await ensureSchema();
  const tenants = await getAllTenants();
  const now = new Date();

  return tenants.map((t) => {
    const lastActivity = t.lastActivityAt
      ? new Date(t.lastActivityAt)
      : new Date(t.createdAt);
    const daysSince = Math.round(
      (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24),
    );

    let churnRisk: "green" | "yellow" | "red" = "green";
    if (daysSince > 30) churnRisk = "red";
    else if (daysSince > 14) churnRisk = "yellow";

    return { ...t, churnRisk };
  });
}

export function getActivityTimeline(tenant: TenantRecord): {
  event: string;
  date: string;
  type: "onboarding" | "status" | "activity";
}[] {
  const timeline: {
    event: string;
    date: string;
    type: "onboarding" | "status" | "activity";
  }[] = [];

  timeline.push({
    event: "Account created",
    date: tenant.createdAt,
    type: "onboarding",
  });

  if (tenant.status !== "onboarding") {
    timeline.push({
      event: `Status changed to ${tenant.status}`,
      date: tenant.updatedAt,
      type: "status",
    });
  }

  if (tenant.lastActivityAt && tenant.lastActivityAt !== tenant.updatedAt) {
    timeline.push({
      event: "Last activity recorded",
      date: tenant.lastActivityAt,
      type: "activity",
    });
  }

  timeline.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return timeline;
}

// ---- Prospects (tenant-scoped) ----

export type ProspectStatus =
  | "new"
  | "qualified"
  | "proposal_sent"
  | "won"
  | "lost"
  | "nurture";

export interface ProspectData {
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
}

export interface ProspectRecord extends ProspectData {
  id: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

interface ProspectRow {
  id: string;
  tenant_id: string;
  name: string;
  company: string;
  role: string;
  source: string;
  pain_points: unknown;
  current_flow: unknown;
  desired_outcomes: string;
  budget_range: string;
  decision_authority: string;
  urgency: string;
  score: number;
  status: string;
  call_notes: string;
  script: string;
  created_at: Date | string;
  updated_at: Date | string;
}

function prospectRowToRecord(row: ProspectRow): ProspectRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    company: row.company,
    role: row.role,
    source: row.source,
    painPoints: typeof row.pain_points === "string" ? row.pain_points : JSON.stringify(row.pain_points ?? ""),
    currentFlow: typeof row.current_flow === "string" ? row.current_flow : JSON.stringify(row.current_flow ?? ""),
    desiredOutcomes: row.desired_outcomes,
    budgetRange: row.budget_range,
    decisionAuthority: row.decision_authority,
    urgency: row.urgency,
    score: row.score,
    status: row.status as ProspectStatus,
    callNotes: row.call_notes,
    script: row.script,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

export async function saveProspect(
  data: ProspectData,
  tenantId: string,
): Promise<ProspectRecord> {
  await ensureProspectSchema();
  const rows = await sql()`
    INSERT INTO prospects (
      tenant_id, name, company, role, source,
      pain_points, current_flow, desired_outcomes,
      budget_range, decision_authority, urgency,
      score, status, call_notes, script
    ) VALUES (
      ${tenantId}, ${data.name}, ${data.company}, ${data.role}, ${data.source},
      ${data.painPoints}, ${data.currentFlow}, ${data.desiredOutcomes},
      ${data.budgetRange}, ${data.decisionAuthority}, ${data.urgency},
      ${data.score}, ${data.status}, ${data.callNotes}, ${data.script}
    )
    RETURNING *
  `;
  await touchTenant(tenantId);
  return prospectRowToRecord(rows[0] as ProspectRow);
}

export async function fetchProspect(id: string): Promise<ProspectRecord | undefined> {
  await ensureProspectSchema();
  const rows = await sql()`SELECT * FROM prospects WHERE id = ${id}`;
  if (rows.length === 0) return undefined;
  return prospectRowToRecord(rows[0] as ProspectRow);
}

export async function fetchAllProspects(): Promise<ProspectRecord[]> {
  await ensureProspectSchema();
  const rows = await sql()`SELECT * FROM prospects ORDER BY created_at DESC`;
  return (rows as ProspectRow[]).map(prospectRowToRecord);
}

export async function fetchProspectsByTenant(tenantId: string): Promise<ProspectRecord[]> {
  await ensureProspectSchema();
  const rows = await sql()`SELECT * FROM prospects WHERE tenant_id = ${tenantId} ORDER BY created_at DESC`;
  return (rows as ProspectRow[]).map(prospectRowToRecord);
}

export async function updateProspect(
  id: string,
  patch: Partial<ProspectData>,
): Promise<ProspectRecord | undefined> {
  await ensureProspectSchema();
  const current = await fetchProspect(id);
  if (!current) return undefined;

  const merged: ProspectData = {
    name: patch.name ?? current.name,
    company: patch.company ?? current.company,
    role: patch.role ?? current.role,
    source: patch.source ?? current.source,
    painPoints: patch.painPoints ?? current.painPoints,
    currentFlow: patch.currentFlow ?? current.currentFlow,
    desiredOutcomes: patch.desiredOutcomes ?? current.desiredOutcomes,
    budgetRange: patch.budgetRange ?? current.budgetRange,
    decisionAuthority: patch.decisionAuthority ?? current.decisionAuthority,
    urgency: patch.urgency ?? current.urgency,
    score: patch.score ?? current.score,
    status: patch.status ?? current.status,
    callNotes: patch.callNotes ?? current.callNotes,
    script: patch.script ?? current.script,
  };

  const rows = await sql()`
    UPDATE prospects SET
      name = ${merged.name},
      company = ${merged.company},
      role = ${merged.role},
      source = ${merged.source},
      pain_points = ${merged.painPoints},
      current_flow = ${merged.currentFlow},
      desired_outcomes = ${merged.desiredOutcomes},
      budget_range = ${merged.budgetRange},
      decision_authority = ${merged.decisionAuthority},
      urgency = ${merged.urgency},
      score = ${merged.score},
      status = ${merged.status},
      call_notes = ${merged.callNotes},
      script = ${merged.script},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  if (rows.length === 0) return undefined;
  return prospectRowToRecord(rows[0] as ProspectRow);
}
