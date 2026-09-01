import type { Mind } from "./mind";

export type DistrictKind =
  | "billing"
  | "auth"
  | "api"
  | "data"
  | "support"
  | "finance"
  | "security"
  | "edge";

export type ActorKind =
  | "user"
  | "enterprise"
  | "support_agent"
  | "pm"
  | "sre"
  | "attacker"
  | "reviewer"
  | "finance";

export type PressureLayer =
  | "traffic"
  | "support"
  | "finance"
  | "security"
  | "sre"
  | "product"
  | "legacy"
  | "infra";

export type MigrationKind =
  | "billing"
  | "auth"
  | "database"
  | "framework"
  | "api_version";

export type RunStatus = "queued" | "running" | "survived" | "collapsed" | "aborted";

export interface District {
  id: string;
  name: string;
  kind: DistrictKind;
  x: number;
  y: number;
  health: number;
  load: number;
  dependencies: string[];
}

export interface SyntheticUser {
  id: string;
  name: string;
  segment: "free" | "pro" | "enterprise" | "legacy";
  planId: string;
  billingState: "healthy" | "past_due" | "refunded" | "contract" | "coupon";
  dependsOnBug?: string;
  anger: number;
  /** Subjective mind — prospect theory + affect + memory */
  mind?: Mind;
}

export interface Ticket {
  id: string;
  subject: string;
  severity: "low" | "med" | "high" | "sev1";
  districtId: string;
  userId?: string;
  open: boolean;
}

export interface Incident {
  id: string;
  title: string;
  layer: PressureLayer;
  severity: number;
  active: boolean;
  startedAt: number;
}

export interface Actor {
  id: string;
  kind: ActorKind;
  name: string;
  stance: string;
  aggression: number;
  mind?: Mind;
}

export interface WorldSnapshot {
  tick: number;
  customers: number;
  activeTickets: number;
  activeIncidents: number;
  trafficRps: number;
  revenueAtRisk: number;
  legacyContracts: number;
  outagePercent: number;
  /** Subjective town pulse */
  meanTrust?: number;
  meanAnger?: number;
  churnIntent?: number;
}

export interface SubjectiveDecisionRef {
  mindId: string;
  mindName: string;
  role: string;
  optionId: string;
  label: string;
  utility: number;
  runnerUp?: { label: string; utility: number };
  rationale: string;
  affectAfter: { trust: number; anger: number; anxiety: number };
}

export interface DialogueTurn {
  speaker: "mind" | "agent" | "narrator";
  name: string;
  text: string;
  tone: "calm" | "tense" | "hostile" | "relieved" | "tactical";
}

export interface PressureEvent {
  id: string;
  tick: number;
  layer: PressureLayer;
  title: string;
  detail: string;
  impact: Partial<Record<PressureLayer, number>>;
  districtId?: string;
  decision?: SubjectiveDecisionRef;
  dialogue?: DialogueTurn[];
  phase?: SimulationPhase;
  kind?: "decision" | "scenario" | "cascade";
}

export type SimulationPhase = "prepare" | "canary" | "cutover" | "stress" | "recovery";

export interface ScenarioBeat {
  phase: SimulationPhase;
  title: string;
  detail: string;
}

export interface TrustCurvePoint {
  tick: number;
  phase: SimulationPhase;
  meanTrust: number;
  meanAnger: number;
  churnIntent: number;
  outagePercent: number;
}

export interface PhaseSummary {
  phase: SimulationPhase;
  events: number;
  trustStart: number;
  trustEnd: number;
  trustDelta: number;
}

export interface DimensionScore {
  layer: PressureLayer;
  score: number;
  note: string;
}

export interface TippingPoint {
  tick: number;
  phase: SimulationPhase;
  kind: "trust_crash" | "anger_spike" | "churn_cluster" | "outage_breach" | "recovery_turn";
  summary: string;
}

export interface SegmentPulse {
  segment: string;
  count: number;
  meanTrust: number;
  meanAnger: number;
  churnReady: number;
}

export interface SurvivalReport {
  survived: boolean;
  overall: number;
  dimensions: DimensionScore[];
  cascadingFailures: string[];
  agentActions: string[];
  verdict: string;
  recommendation: string;
  /** How minds felt at the end */
  subjective?: {
    meanTrust: number;
    meanAnger: number;
    churnReady: number;
    decisiveMoments: string[];
  };
  trustCurve?: TrustCurvePoint[];
  phaseSummaries?: PhaseSummary[];
  scenarioBeats?: ScenarioBeat[];
  tippingPoints?: TippingPoint[];
  segments?: SegmentPulse[];
  nearMiss?: string | null;
  hottestDistrictId?: string | null;
  counterMoves?: string[];
  hypothesis?: {
    status: "supported" | "partial" | "falsified";
    summary: string;
    coverage: number;
    present: string[];
    missing: string[];
  };
  cast?: Array<{
    id: string;
    name: string;
    role: string;
    segment?: string;
    decisions: number;
    avgUtility: number;
    finalTrust: number;
    finalAnger: number;
    topAction: string;
    memory?: string;
  }>;
  fidelity?: number;
}

export interface Town {
  id: string;
  name: string;
  slug: string;
  codebase: string;
  seed: number;
  createdAt: string;
  districts: District[];
  users: SyntheticUser[];
  tickets: Ticket[];
  incidents: Incident[];
  actors: Actor[];
  plans: { id: string; name: string; price: number }[];
  world: WorldSnapshot;
  tags: string[];
  /** Runtime district state — updated during rehearsal */
  districtState?: District[];
}

export interface RehearsalPlan {
  id: string;
  townId: string;
  kind: MigrationKind;
  title: string;
  hypothesis: string;
  agentName: string;
  intensity: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
}

export interface DistrictSnap {
  tick: number;
  districts: Array<{ id: string; health: number; load: number }>;
}

export interface RehearsalRun {
  id: string;
  planId: string;
  townId: string;
  status: RunStatus;
  startedAt: string;
  finishedAt?: string;
  ticks: number;
  events: PressureEvent[];
  snapshots: WorldSnapshot[];
  report?: SurvivalReport;
  liveLog: string[];
  dialogue?: DialogueTurn[];
  districtSnaps?: DistrictSnap[];
}

export interface CreateTownInput {
  name: string;
  codebase: string;
  customerCount?: number;
  seed?: string;
}
