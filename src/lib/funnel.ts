import type { Contact, Conversation, Deal, PipelineStage } from "./types";
import { contactCampo, contactUniao } from "./scope";

/** Captação Escola Bíblica: Lead → Aluno → Jornada → (Visita | Estudo) */
export const FUNNEL_STEPS = [
  {
    id: "leads",
    label: "Leads",
    hint: "Captados no WhatsApp, campanhas e regionais",
    tagIds: null as string[] | null,
    branch: "main" as const,
    match: "all" as const,
  },
  {
    id: "alunos",
    label: "Alunos",
    hint: "Matriculados na Escola Bíblica (Novo Tempo / Aluno)",
    tagIds: ["t3", "eb_aluno", "eb_estudando", "eb_visita", "eb_estudo", "t4", "t5"],
    branch: "main" as const,
    match: "tags" as const,
  },
  {
    id: "jornada",
    label: "Na jornada",
    hint: "Nutrido por automação, IA e atendimento",
    tagIds: ["eb_estudando", "t1"],
    branch: "main" as const,
    match: "jornada" as const,
  },
  {
    id: "visita",
    label: "Visita",
    hint: "Agente agendou visita presencial",
    tagIds: ["eb_visita", "t4", "eb_pend"],
    branch: "fundo" as const,
    match: "tags" as const,
  },
  {
    id: "estudo",
    label: "Estudo",
    hint: "Agente agendou estudo bíblico",
    tagIds: ["eb_estudo", "t5"],
    branch: "fundo" as const,
    match: "tags" as const,
  },
] as const;

export type FunnelStepId = (typeof FUNNEL_STEPS)[number]["id"];

export type FunnelStepStat = {
  id: FunnelStepId;
  label: string;
  hint: string;
  branch: "main" | "fundo";
  count: number;
  pctOfBase: number;
  pctOfPrev: number;
  dropFromPrev: number;
};

export type FunnelGroup = {
  key: string;
  label: string;
  steps: FunnelStepStat[];
  overall: number;
};

export type ConversionFunnel = {
  steps: FunnelStepStat[];
  main: FunnelStepStat[];
  fundo: FunnelStepStat[];
  fundoTotal: number;
  overall: number;
  biggestDrop: { from: string; to: string; lost: number; rate: number } | null;
  byUniao: FunnelGroup[];
  byCampo: FunnelGroup[];
  crm: { id: string; name: string; count: number; pctOfPrev: number }[];
};

const COLORS = [
  "#002860",
  "#0050a0",
  "#3d6bc0",
  "#f5c400",
  "#e8a800",
];

export function funnelColor(i: number) {
  return COLORS[i % COLORS.length]!;
}

function hasTag(c: Contact, ids: readonly string[] | null) {
  if (!ids) return true;
  return ids.some((id) => c.tagIds.includes(id));
}

function inStep(
  c: Contact,
  step: (typeof FUNNEL_STEPS)[number],
  attendedIds: Set<string>,
) {
  if (step.match === "all") return true;
  if (step.match === "jornada") {
    return attendedIds.has(c.id) || hasTag(c, step.tagIds);
  }
  return hasTag(c, step.tagIds);
}

const FUNDO_TAG_IDS = FUNNEL_STEPS.filter((s) => s.branch === "fundo").flatMap(
  (s) => s.tagIds ?? [],
);

function inFundo(c: Contact) {
  return hasTag(c, FUNDO_TAG_IDS);
}

function statsFor(contacts: Contact[], attendedIds: Set<string>): FunnelStepStat[] {
  const base = contacts.length;
  const counts = Object.fromEntries(
    FUNNEL_STEPS.map((step) => [
      step.id,
      contacts.filter((c) => inStep(c, step, attendedIds)).length,
    ]),
  ) as Record<FunnelStepId, number>;

  const jornadaCount = counts.jornada ?? 0;

  return FUNNEL_STEPS.map((step) => {
    const count = counts[step.id] ?? 0;
    const prev =
      step.branch === "fundo"
        ? jornadaCount
        : step.id === "leads"
          ? base
          : step.id === "alunos"
            ? counts.leads
            : counts.alunos;
    const pctOfBase = base ? Math.round((count / base) * 1000) / 10 : 0;
    const pctOfPrev = prev ? Math.round((count / prev) * 1000) / 10 : 0;
    const dropFromPrev = Math.max(0, prev - count);
    return {
      id: step.id,
      label: step.label,
      hint: step.hint,
      branch: step.branch,
      count,
      pctOfBase,
      pctOfPrev,
      dropFromPrev,
    };
  });
}

function overallRate(steps: FunnelStepStat[], contacts: Contact[]) {
  const base = steps.find((s) => s.id === "leads")?.count ?? contacts.length;
  const fundo = contacts.filter(inFundo).length;
  return base ? Math.round((fundo / base) * 1000) / 10 : 0;
}

export function buildConversionFunnel(
  contacts: Contact[],
  conversations: Conversation[],
  deals: Deal[],
  stages: PipelineStage[],
): ConversionFunnel {
  const attendedIds = new Set(conversations.map((cv) => cv.contactId));
  const steps = statsFor(contacts, attendedIds);
  const main = steps.filter((s) => s.branch === "main");
  const fundo = steps.filter((s) => s.branch === "fundo");
  const fundoTotal = contacts.filter(inFundo).length;

  let biggestDrop: ConversionFunnel["biggestDrop"] = null;
  const transitions: { from: FunnelStepStat; to: FunnelStepStat }[] = [];
  for (let i = 1; i < main.length; i++) {
    transitions.push({ from: main[i - 1]!, to: main[i]! });
  }
  const jornada = main.find((s) => s.id === "jornada");
  if (jornada) {
    for (const f of fundo) transitions.push({ from: jornada, to: f });
  }
  for (const { from, to } of transitions) {
    const lost = to.dropFromPrev;
    const rate = from.count ? Math.round((lost / from.count) * 1000) / 10 : 0;
    if (!biggestDrop || lost > biggestDrop.lost) {
      biggestDrop = { from: from.label, to: to.label, lost, rate };
    }
  }

  const groupBy = (keyOf: (c: Contact) => string, labelOf = (k: string) => k) => {
    const map = new Map<string, Contact[]>();
    for (const c of contacts) {
      const k = keyOf(c) || "—";
      const arr = map.get(k) ?? [];
      arr.push(c);
      map.set(k, arr);
    }
    return [...map.entries()]
      .map(([key, list]) => {
        const s = statsFor(list, attendedIds);
        return { key, label: labelOf(key), steps: s, overall: overallRate(s, list) };
      })
      .sort((a, b) => (b.steps[0]?.count ?? 0) - (a.steps[0]?.count ?? 0));
  };

  const orderedStages = [...stages].sort((a, b) => a.order - b.order);
  let prevCrm = deals.length || 1;
  const crm = orderedStages.map((st) => {
    const count = deals.filter((d) => d.stageId === st.id).length;
    const pctOfPrev = prevCrm ? Math.round((count / prevCrm) * 1000) / 10 : 0;
    prevCrm = count || prevCrm;
    return { id: st.id, name: st.name, count, pctOfPrev };
  });

  return {
    steps,
    main,
    fundo,
    fundoTotal,
    overall: overallRate(steps, contacts),
    biggestDrop: biggestDrop && biggestDrop.lost > 0 ? biggestDrop : null,
    byUniao: groupBy((c) => contactUniao(c), (k) => (k === "—" ? "Sem união" : `União ${k}`)),
    byCampo: groupBy((c) => contactCampo(c), (k) => (k === "—" ? "Sem campo" : k)),
    crm,
  };
}

export type BottleneckRule = {
  toStep: FunnelStepId;
  minPct: number;
  enabled: boolean;
};

export type BottleneckSettings = {
  enabled: boolean;
  minSample: number;
  rules: BottleneckRule[];
};

export type BottleneckAlert = {
  id: string;
  toStep: FunnelStepId;
  fromLabel: string;
  toLabel: string;
  actual: number;
  minPct: number;
  lost: number;
  prevCount: number;
  severity: "warning" | "critical";
};

export const DEFAULT_BOTTLENECK: BottleneckSettings = {
  enabled: true,
  minSample: 3,
  rules: [
    { toStep: "alunos", minPct: 40, enabled: true },
    { toStep: "jornada", minPct: 50, enabled: true },
    { toStep: "visita", minPct: 20, enabled: true },
    { toStep: "estudo", minPct: 20, enabled: true },
  ],
};

export function normalizeBottleneckSettings(
  raw?: Partial<BottleneckSettings> | null,
): BottleneckSettings {
  const base = DEFAULT_BOTTLENECK;
  const rules = FUNNEL_STEPS.filter((s) => s.id !== "leads").map((step) => {
    const found = raw?.rules?.find((r) => r.toStep === step.id);
    const def = base.rules.find((r) => r.toStep === step.id);
    return {
      toStep: step.id,
      minPct: found?.minPct ?? def?.minPct ?? 20,
      enabled: found?.enabled ?? def?.enabled ?? true,
    };
  });
  return {
    enabled: raw?.enabled ?? base.enabled,
    minSample: Math.max(1, raw?.minSample ?? base.minSample),
    rules,
  };
}

export function evaluateBottlenecks(
  funnel: ConversionFunnel,
  settings: BottleneckSettings,
): BottleneckAlert[] {
  if (!settings.enabled) return [];
  const alerts: BottleneckAlert[] = [];
  for (const step of funnel.steps) {
    if (step.id === "leads") continue;
    const rule = settings.rules.find((r) => r.toStep === step.id);
    if (!rule?.enabled) continue;
    const prev =
      step.branch === "fundo"
        ? funnel.main.find((s) => s.id === "jornada")
        : funnel.main[funnel.main.findIndex((s) => s.id === step.id) - 1];
    if (!prev || prev.count < settings.minSample) continue;
    if (step.pctOfPrev >= rule.minPct) continue;
    alerts.push({
      id: `${prev.id}-${step.id}`,
      toStep: step.id,
      fromLabel: prev.label,
      toLabel: step.label,
      actual: step.pctOfPrev,
      minPct: rule.minPct,
      lost: step.dropFromPrev,
      prevCount: prev.count,
      severity: step.pctOfPrev < rule.minPct * 0.5 ? "critical" : "warning",
    });
  }
  return alerts;
}
