import { contactCampo, contactUniao, type SedeRegional } from "./scope";
import {
  CHART_BRAND_COLORS,
  type CampoRow,
  type DistributionSlice,
  type ReportMetric,
} from "./report-seed";
import type { Contact, Tag } from "./types";

const C = {
  navy: "#1e48a0",
  navyDeep: "#163a86",
  navyMid: "#3d6bc0",
  gold: "#f5c400",
  goldSoft: "#f7d44a",
  muted: "#8b95a8",
  sky: "#5b8def",
  slate: "#c5cde0",
};

const DIST_TAGS: { id: string; label: string; tagId: string; color: string }[] = [
  { id: "estudando", label: "Estudando", tagId: "eb_estudando", color: C.navy },
  { id: "frio", label: "Nenhum (Frio)", tagId: "eb_nenhum", color: C.slate },
  { id: "nao_loc", label: "Não Localizado", tagId: "eb_nao_loc", color: C.muted },
  { id: "mkt", label: "MKT Digital", tagId: "eb_mkt", color: C.gold },
  { id: "desint", label: "Desinteressado", tagId: "eb_desint", color: C.navyDeep },
  { id: "nao_atend", label: "Não Atendidos", tagId: "eb_nao_atend", color: C.sky },
];

const METRIC_TAGS: { id: string; label: string; tag: string; tagIds: string[]; color: string }[] =
  [
    { id: "aquecidos", label: "Alunos aquecidos", tag: "Estudando", tagIds: ["eb_estudando"], color: C.navy },
    { id: "frios", label: "Alunos frios", tag: "Nenhum", tagIds: ["eb_nenhum"], color: C.slate },
    { id: "nao_enc", label: "Não encontrados", tag: "Não Localizado", tagIds: ["eb_nao_loc"], color: C.muted },
    { id: "visitas", label: "Visitas aceitas", tag: "Visita Aceita", tagIds: ["eb_visita", "t4"], color: C.gold },
    { id: "estudos", label: "Estudos aceitos", tag: "Estudo Aceito", tagIds: ["eb_estudo", "t5"], color: C.navyMid },
    { id: "oracao", label: "Grupo de oração", tag: "Grupo de Oração Aceito", tagIds: ["eb_oracao"], color: C.sky },
    { id: "conv_mkt", label: "Conversão de MKT", tag: "Conversão de MKT Aceito", tagIds: ["eb_conv_mkt"], color: C.goldSoft },
    { id: "pendentes", label: "Visitas pendentes", tag: "Visitas Pendentes", tagIds: ["eb_pend"], color: C.navy },
    { id: "esperanca", label: "Esperança", tag: "Esperança", tagIds: ["eb_esp"], color: C.gold },
  ];

function hasAnyTag(c: Contact, ids: string[]) {
  return ids.some((id) => c.tagIds.includes(id));
}

function emptyRow(campo: string, uniao: string): CampoRow {
  return {
    campo,
    uniao,
    base: 0,
    quentes: 0,
    frios: 0,
    naoLoc: 0,
    trafPago: 0,
    visitas: 0,
    estudos: 0,
    naoAtend: 0,
    bronze: 0,
    prata: 0,
    ouro: 0,
    diamante: 0,
  };
}

function bumpNivel(row: CampoRow, c: Contact) {
  const nivel = (c.customFields.cf7 ?? "").toLowerCase();
  if (nivel === "bronze" || c.tagIds.includes("eb_bronze")) row.bronze += 1;
  else if (nivel === "prata" || c.tagIds.includes("eb_prata")) row.prata += 1;
  else if (nivel === "ouro" || c.tagIds.includes("eb_ouro")) row.ouro += 1;
  else if (nivel === "diamante" || c.tagIds.includes("eb_diamante"))
    row.diamante += 1;
}

export function filterReportContacts(
  contacts: Contact[],
  opts: { uniao?: string; campo?: string },
) {
  return contacts.filter((c) => {
    if (opts.campo && contactCampo(c) !== opts.campo.toUpperCase()) return false;
    if (opts.uniao && contactUniao(c) !== opts.uniao.toUpperCase()) return false;
    return true;
  });
}

export function listUnioes(contacts: Contact[], sedes: SedeRegional[] = []) {
  const set = new Set<string>();
  for (const s of sedes) if (s.uniao) set.add(s.uniao.toUpperCase());
  for (const c of contacts) {
    const u = contactUniao(c);
    if (u) set.add(u);
  }
  return [...set].sort();
}

export type TagRank = { id: string; name: string; color: string; qty: number };

export type LiveReport = {
  generatedAt: string;
  base: number;
  header: {
    baseTotal: number;
    estudando: number;
    visitas: number;
    estudos: number;
    leadsMkt: number;
  };
  distribution: DistributionSlice[];
  metrics: ReportMetric[];
  campos: CampoRow[];
  unioes: { uniao: string; base: number; quentes: number; visitas: number; estudos: number }[];
  niveis: { bronze: number; prata: number; ouro: number; diamante: number };
  tagRank: TagRank[];
  total: CampoRow;
};

export function buildLiveReport(
  contacts: Contact[],
  tags: Tag[],
  sedes: SedeRegional[] = [],
): LiveReport {
  const base = contacts.length;
  const count = (ids: string[]) =>
    contacts.filter((c) => hasAnyTag(c, ids)).length;

  const distribution: DistributionSlice[] = DIST_TAGS.map((s) => {
    const value = count([s.tagId]);
    return {
      id: s.id,
      label: s.label,
      value,
      pct: base ? Math.round((value / base) * 1000) / 10 : 0,
      color: s.color,
    };
  });

  const metrics: ReportMetric[] = METRIC_TAGS.map((m) => ({
    id: m.id,
    label: m.label,
    value: count(m.tagIds),
    tag: m.tag,
    color: m.color,
  }));

  const byCampo = new Map<string, CampoRow>();
  for (const s of sedes) {
    const campo = s.code.toUpperCase();
    const uniao = (s.uniao || "—").toUpperCase();
    byCampo.set(`${uniao}::${campo}`, emptyRow(campo, uniao));
  }
  for (const c of contacts) {
    const campo = contactCampo(c) || "SEM CAMPO";
    const uniao = contactUniao(c) || "—";
    const key = `${uniao}::${campo}`;
    let row = byCampo.get(key);
    if (!row) {
      row = emptyRow(campo, uniao);
      byCampo.set(key, row);
    }
    row.base += 1;
    if (hasAnyTag(c, ["eb_estudando"])) row.quentes += 1;
    if (hasAnyTag(c, ["eb_nenhum"])) row.frios += 1;
    if (hasAnyTag(c, ["eb_nao_loc"])) row.naoLoc += 1;
    if (hasAnyTag(c, ["eb_mkt"])) row.trafPago += 1;
    if (hasAnyTag(c, ["eb_visita", "t4"])) row.visitas += 1;
    if (hasAnyTag(c, ["eb_estudo", "t5"])) row.estudos += 1;
    if (hasAnyTag(c, ["eb_nao_atend"])) row.naoAtend += 1;
    bumpNivel(row, c);
  }

  const campos = [...byCampo.values()].sort((a, b) => b.base - a.base);

  const byUniao = new Map<
    string,
    { uniao: string; base: number; quentes: number; visitas: number; estudos: number }
  >();
  for (const row of campos) {
    const u = byUniao.get(row.uniao) ?? {
      uniao: row.uniao,
      base: 0,
      quentes: 0,
      visitas: 0,
      estudos: 0,
    };
    u.base += row.base;
    u.quentes += row.quentes;
    u.visitas += row.visitas;
    u.estudos += row.estudos;
    byUniao.set(row.uniao, u);
  }

  const niveis = campos.reduce(
    (acc, r) => ({
      bronze: acc.bronze + r.bronze,
      prata: acc.prata + r.prata,
      ouro: acc.ouro + r.ouro,
      diamante: acc.diamante + r.diamante,
    }),
    { bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  );

  const tagMap = new Map(tags.map((t) => [t.id, t]));
  const tagCount = new Map<string, number>();
  for (const c of contacts) {
    for (const id of c.tagIds) {
      tagCount.set(id, (tagCount.get(id) ?? 0) + 1);
    }
  }
  const tagRank: TagRank[] = [...tagCount.entries()]
    .map(([id, qty]) => {
      const t = tagMap.get(id);
      return {
        id,
        name: t?.name ?? id,
        color: t?.color ?? CHART_BRAND_COLORS[0]!,
        qty,
      };
    })
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 12);

  const total = campos.reduce(
    (acc, r) => ({
      ...acc,
      base: acc.base + r.base,
      quentes: acc.quentes + r.quentes,
      frios: acc.frios + r.frios,
      naoLoc: acc.naoLoc + r.naoLoc,
      trafPago: acc.trafPago + r.trafPago,
      visitas: acc.visitas + r.visitas,
      estudos: acc.estudos + r.estudos,
      naoAtend: acc.naoAtend + r.naoAtend,
      bronze: acc.bronze + r.bronze,
      prata: acc.prata + r.prata,
      ouro: acc.ouro + r.ouro,
      diamante: acc.diamante + r.diamante,
    }),
    emptyRow("TOTAL DO ESCOPO", campos.length === 1 ? campos[0]!.uniao : "—"),
  );

  return {
    generatedAt: new Date().toLocaleString("pt-BR"),
    base,
    header: {
      baseTotal: base,
      estudando: count(["eb_estudando"]),
      visitas: count(["eb_visita", "t4"]),
      estudos: count(["eb_estudo", "t5"]),
      leadsMkt: count(["eb_mkt"]),
    },
    distribution,
    metrics,
    campos,
    unioes: [...byUniao.values()].sort((a, b) => b.base - a.base),
    niveis,
    tagRank,
    total,
  };
}
