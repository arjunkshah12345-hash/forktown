import { nanoid } from "nanoid";
import { inventActorMind, inventBuyerMind } from "./mind";
import { chance, createPrng, hashSeed, int, pick } from "./prng";
import type {
  Actor,
  CreateTownInput,
  District,
  Incident,
  SyntheticUser,
  Ticket,
  Town,
  WorldSnapshot,
} from "./types";

const FIRST = [
  "Avery", "Blake", "Casey", "Devon", "Ellis", "Finley", "Gray", "Harper",
  "Indigo", "Jules", "Kai", "Logan", "Morgan", "Noa", "Oakley", "Parker",
  "Quinn", "Remy", "Sage", "Tatum", "Uma", "Vale", "Wren", "Xia", "Yuri", "Zion",
];
const LAST = [
  "Chen", "Ortiz", "Nguyen", "Patel", "Brooks", "Kim", "Silva", "Hassan",
  "Iwata", "Mbeki", "Rossi", "Dubois", "Kowalski", "Singh", "Almeida", "Berg",
];

const DISTRICT_BLUEPRINT: Array<{
  name: string;
  kind: District["kind"];
  x: number;
  y: number;
}> = [
  { name: "Checkout Harbor", kind: "billing", x: 18, y: 42 },
  { name: "Invoice District", kind: "billing", x: 32, y: 58 },
  { name: "Identity Gate", kind: "auth", x: 55, y: 28 },
  { name: "Session Yards", kind: "auth", x: 68, y: 40 },
  { name: "Public Pier", kind: "api", x: 42, y: 22 },
  { name: "Webhook Canal", kind: "api", x: 78, y: 55 },
  { name: "Ledger Vault", kind: "data", x: 48, y: 72 },
  { name: "Archive Quay", kind: "data", x: 22, y: 78 },
  { name: "Ticket Row", kind: "support", x: 12, y: 28 },
  { name: "Close Street", kind: "finance", x: 62, y: 78 },
  { name: "Red Team Alley", kind: "security", x: 82, y: 22 },
  { name: "Edge Spur", kind: "edge", x: 88, y: 70 },
];

const BUG_CONTRACTS = [
  "double-apply coupon on retry",
  "tax rounded down for EU VAT",
  "enterprise seats never expire",
  "webhook idempotency key ignored",
  "legacy plan ID still accepted",
  "refunds create ghost credits",
  "timezone off-by-one on invoices",
  "partial payment leaves active access",
];

const TICKET_SUBJECTS = [
  "Charged twice after migrate preview",
  "Invoice PDF missing line items",
  "Coupon vanished mid-checkout",
  "Enterprise contract seat count wrong",
  "Webhook delivery stuck 14m",
  "Past-due banner for paid customer",
  "Tax ID rejected for DE",
  "Refund posted but access revoked",
  "Old Stripe Checkout still redirecting",
  "Finance close blocked on orphan invoices",
];

const ACTOR_TEMPLATES: Array<{ kind: Actor["kind"]; names: string[]; stances: string[] }> = [
  {
    kind: "pm",
    names: ["Priya Motwani", "Chris Vale", "Sam Okonkwo"],
    stances: ["ships Friday or dies", "scope creeps mid-rehearsal", "wants feature flags everywhere"],
  },
  {
    kind: "sre",
    names: ["Jordan Rhee", "Alex Novak", "Mina Park"],
    stances: ["pages on p95", "hates silent retries", "demands rollback runbooks"],
  },
  {
    kind: "attacker",
    names: ["Shadow Cart", "Replay Fox", "Coupon Ghost"],
    stances: ["replays webhooks", "abuses race on refunds", "forges tax IDs"],
  },
  {
    kind: "reviewer",
    names: ["Dana Skeptic", "Lee Nitpick", "Omar Guard"],
    stances: ["blocks without chaos tests", "obsessed with idempotency", "wants dual-write proof"],
  },
  {
    kind: "finance",
    names: ["Helen Close", "Marco Ledger"],
    stances: ["month-end is sacred", "orphan invoices = fireable offense"],
  },
];

function buildDistricts(rng: () => number): District[] {
  return DISTRICT_BLUEPRINT.map((d, i) => {
    const id = `d_${i}_${d.kind}`;
    const deps: string[] = [];
    if (d.kind === "billing") deps.push("d_6_data", "d_4_api");
    if (d.kind === "finance") deps.push("d_0_billing", "d_1_billing");
    if (d.kind === "support") deps.push("d_0_billing");
    if (d.kind === "edge") deps.push("d_4_api");
    return {
      id,
      name: d.name,
      kind: d.kind,
      x: d.x + int(rng, -2, 2),
      y: d.y + int(rng, -2, 2),
      health: 0.82 + rng() * 0.16,
      load: 0.2 + rng() * 0.35,
      dependencies: deps,
    };
  });
}

function buildPlans(rng: () => number) {
  const base = [
    { id: "plan_free", name: "Starter", price: 0 },
    { id: "plan_pro", name: "Pro", price: 49 },
    { id: "plan_biz", name: "Business", price: 199 },
    { id: "plan_ent", name: "Enterprise", price: 2400 },
  ];
  const extras = [
    "Growth 2019", "Agency Bundle", "Nonprofit", "Student Legacy",
    "Partner SKU", "Usage+Base", "EU VAT Bundle", "APAC Flat",
  ];
  return [
    ...base,
    ...extras.slice(0, 8).map((name, i) => ({
      id: `plan_legacy_${i}`,
      name,
      price: int(rng, 9, 899),
    })),
  ];
}

function buildUsers(
  rng: () => number,
  count: number,
  plans: Town["plans"],
  sampleSize = 400,
  deepMinds = 80,
): SyntheticUser[] {
  const users: SyntheticUser[] = [];
  const n = Math.min(count, sampleSize);
  const mindN = Math.min(n, deepMinds);
  for (let i = 0; i < n; i++) {
    const segment = pick(rng, ["free", "pro", "enterprise", "legacy"] as const);
    const billingState =
      segment === "enterprise"
        ? pick(rng, ["healthy", "contract"] as const)
        : pick(rng, ["healthy", "past_due", "refunded", "coupon", "healthy", "healthy"] as const);
    const user: SyntheticUser = {
      id: `u_${i}`,
      name: `${pick(rng, FIRST)} ${pick(rng, LAST)}`,
      segment,
      planId: pick(rng, plans).id,
      billingState,
      anger: segment === "legacy" ? 0.4 + rng() * 0.5 : rng() * 0.35,
    };
    if (chance(rng, segment === "legacy" ? 0.45 : 0.08)) {
      user.dependsOnBug = pick(rng, BUG_CONTRACTS);
    }
    if (i < mindN) {
      user.mind = inventBuyerMind(user, rng);
    }
    users.push(user);
  }
  return users;
}

function buildTickets(rng: () => number, districts: District[], users: SyntheticUser[]): Ticket[] {
  const tickets: Ticket[] = [];
  const n = int(rng, 18, 36);
  for (let i = 0; i < n; i++) {
    tickets.push({
      id: `t_${i}`,
      subject: pick(rng, TICKET_SUBJECTS),
      severity: pick(rng, ["low", "med", "high", "sev1"] as const),
      districtId: pick(rng, districts).id,
      userId: chance(rng, 0.7) ? pick(rng, users).id : undefined,
      open: chance(rng, 0.65),
    });
  }
  return tickets;
}

function buildIncidents(rng: () => number): Incident[] {
  if (!chance(rng, 0.55)) return [];
  return [
    {
      id: nanoid(8),
      title: pick(rng, [
        "Webhook lag spike (p99 42s)",
        "Stripe API flaky 3%",
        "Ledger write amplification",
        "Auth session store saturation",
      ]),
      layer: pick(rng, ["infra", "sre", "traffic"] as const),
      severity: 0.3 + rng() * 0.4,
      active: true,
      startedAt: Date.now() - int(rng, 60_000, 3_600_000),
    },
  ];
}

function buildActors(rng: () => number): Actor[] {
  const actors: Actor[] = [];
  for (const tmpl of ACTOR_TEMPLATES) {
    const name = pick(rng, tmpl.names);
    const actor: Actor = {
      id: nanoid(8),
      kind: tmpl.kind,
      name,
      stance: pick(rng, tmpl.stances),
      aggression: 0.35 + rng() * 0.55,
    };
    actor.mind = inventActorMind(actor, rng);
    actors.push(actor);
  }
  return actors;
}

function snapshot(
  customers: number,
  tickets: Ticket[],
  incidents: Incident[],
  users: SyntheticUser[],
  rng: () => number,
): WorldSnapshot {
  const legacyContracts = users.filter((u) => u.dependsOnBug).length;
  return {
    tick: 0,
    customers,
    activeTickets: tickets.filter((t) => t.open).length,
    activeIncidents: incidents.filter((i) => i.active).length,
    trafficRps: int(rng, 180, 920),
    revenueAtRisk: Math.round(customers * (2 + rng() * 8)),
    legacyContracts,
    outagePercent: incidents.some((i) => i.active) ? +(rng() * 4).toFixed(1) : 0,
  };
}

export function generateTown(input: CreateTownInput): Town {
  const seedStr = input.seed ?? `${input.name}:${input.codebase}:${Date.now()}`;
  const seed = hashSeed(seedStr);
  const rng = createPrng(seed);
  const customers = input.customerCount ?? int(rng, 12_000, 58_000);
  const districts = buildDistricts(rng);
  const plans = buildPlans(rng);
  const users = buildUsers(
    rng,
    customers,
    plans,
    input.userSample ?? 400,
    input.deepMinds ?? 80,
  );
  const tickets = buildTickets(rng, districts, users);
  const incidents = buildIncidents(rng);
  const actors = buildActors(rng);
  const slug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);

  return {
    id: nanoid(10),
    name: input.name,
    slug: slug || "town",
    codebase: input.codebase,
    seed,
    createdAt: new Date().toISOString(),
    districts,
    users,
    tickets,
    incidents,
    actors,
    plans,
    world: snapshot(customers, tickets, incidents, users, rng),
    tags: ["migration-ready", "synthetic-world", "agent-safe", "subjective-minds"],
  };
}

export const ACME_BILLING_SEED = "acme-billing-forktown-v1";

export function generateAcmeBillingTown(): Town {
  return generateTown({
    name: "Acme Billing Town",
    codebase: "github.com/acme/billing-platform",
    customerCount: 50_000,
    seed: ACME_BILLING_SEED,
  });
}
