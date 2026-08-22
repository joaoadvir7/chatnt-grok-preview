/**
 * Snapshot do relatório semanal consolidado — Escola Bíblica Novo Tempo.
 * Fonte: RELATÓRIO CONSOLIDADO 31.07 (Dashboard Central / EU VENDO).
 * Paleta de status alinhada à marca ChatNT (navy + verde limão).
 */

export type ReportMetric = {
  id: string;
  label: string;
  value: number;
  tag: string;
  color: string;
};

export type DistributionSlice = {
  id: string;
  label: string;
  value: number;
  pct: number;
  color: string;
};

export type CampoRow = {
  campo: string;
  uniao: string;
  base: number;
  quentes: number;
  frios: number;
  naoLoc: number;
  trafPago: number;
  visitas: number;
  estudos: number;
  naoAtend: number;
  bronze: number;
  prata: number;
  ouro: number;
  diamante: number;
};

export type MaterialRow = {
  rank: number;
  name: string;
  qty: number;
};

export const REPORT_META = {
  title: "Dashboard Central — Consolidado de Filiais",
  org: "Escola Bíblica Novo Tempo",
  generatedAt: "31/07/2026 às 15:00",
  filiais: 36,
  unioes: 7,
};

export const REPORT_HEADER = {
  baseTotal: 1_157_127,
  estudando: 254_250,
  visitasAgendadas: 85_621,
  estudosAgendados: 22_038,
  leadsMkt: 39_758,
};

/** Cores da logo ChatNT: azul + amarelo */
const BRAND = {
  navyDeep: "#163a86",
  navy: "#1e48a0",
  navyMid: "#3d6bc0",
  gold: "#f5c400",
  goldSoft: "#f7d44a",
  ink: "#1a2744",
  muted: "#8b95a8",
  soft: "#e8eef8",
  sky: "#5b8def",
  slate: "#c5cde0",
};

export const REPORT_DISTRIBUTION: DistributionSlice[] = [
  { id: "estudando", label: "Estudando", value: 0, pct: 0, color: BRAND.navy },
  { id: "frio", label: "Nenhum (Frio)", value: 0, pct: 0, color: BRAND.slate },
  { id: "nao_loc", label: "Não Localizado", value: 0, pct: 0, color: BRAND.muted },
  { id: "mkt", label: "MKT Digital", value: 0, pct: 0, color: BRAND.gold },
  { id: "desint", label: "Desinteressado", value: 0, pct: 0, color: BRAND.navyDeep },
  { id: "nao_atend", label: "Não Atendidos", value: 0, pct: 0, color: BRAND.sky },
];

export const REPORT_METRICS: ReportMetric[] = [
  { id: "aquecidos", label: "Alunos aquecidos", value: 0, tag: "Estudando", color: BRAND.navy },
  { id: "frios", label: "Alunos frios", value: 0, tag: "Nenhum", color: BRAND.slate },
  { id: "nao_enc", label: "Não encontrados", value: 0, tag: "Não Localizado", color: BRAND.muted },
  { id: "visitas", label: "Visitas agendadas", value: 0, tag: "Visita Aceita", color: BRAND.gold },
  { id: "estudos", label: "Estudos agendados", value: 0, tag: "Estudo Aceito", color: BRAND.navyMid },
  { id: "oracao", label: "Grupo de oração", value: 0, tag: "Grupo de Oração Aceito", color: BRAND.sky },
  { id: "conv_mkt", label: "Conversão de MKT", value: 0, tag: "Conversão de MKT Aceito", color: BRAND.goldSoft },
  { id: "pendentes", label: "Visitas/estudos pendentes", value: 0, tag: "Visitas Pendentes", color: BRAND.navy },
  { id: "esperanca", label: "Esperança", value: 0, tag: "Esperança", color: BRAND.gold },
];

export const REPORT_NIVEIS = {
  bronze: 13,
  prata: 0,
  ouro: 1,
  diamante: 0,
};

export const REPORT_CAMPOS: CampoRow[] = [
  { campo: "APL", uniao: "UCB", base: 66646, quentes: 16826, frios: 21090, naoLoc: 25924, trafPago: 644, visitas: 4572, estudos: 753, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "APS", uniao: "UCB", base: 23852, quentes: 3109, frios: 4712, naoLoc: 2942, trafPago: 0, visitas: 1163, estudos: 327, naoAtend: 10779, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "APV", uniao: "UCB", base: 77632, quentes: 9066, frios: 12148, naoLoc: 15231, trafPago: 46, visitas: 2764, estudos: 726, naoAtend: 36074, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "AOM", uniao: "UCOB", base: 19361, quentes: 2564, frios: 8525, naoLoc: 1282, trafPago: 356, visitas: 503, estudos: 105, naoAtend: 5618, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "APLAC", uniao: "UCOB", base: 40394, quentes: 7795, frios: 13049, naoLoc: 15860, trafPago: 302, visitas: 2618, estudos: 628, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "ASM", uniao: "UCOB", base: 25862, quentes: 5144, frios: 11943, naoLoc: 9623, trafPago: 0, visitas: 2293, estudos: 522, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "AB", uniao: "ULB", base: 56222, quentes: 9135, frios: 20577, naoLoc: 18282, trafPago: 0, visitas: 1683, estudos: 472, naoAtend: 5117, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "MSE", uniao: "ULB", base: 18524, quentes: 4916, frios: 9711, naoLoc: 5816, trafPago: 0, visitas: 1361, estudos: 481, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "AMA", uniao: "UNB", base: 16938, quentes: 5412, frios: 4877, naoLoc: 6450, trafPago: 1194, visitas: 1853, estudos: 558, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "ANPA", uniao: "UNB", base: 44272, quentes: 14034, frios: 4597, naoLoc: 11807, trafPago: 18558, visitas: 5329, estudos: 1690, naoAtend: 0, bronze: 13, prata: 0, ouro: 1, diamante: 0 },
  { campo: "ASPA", uniao: "UNB", base: 10617, quentes: 3571, frios: 5512, naoLoc: 822, trafPago: 1002, visitas: 1064, estudos: 310, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "ASUMA", uniao: "UNB", base: 17456, quentes: 5812, frios: 7164, naoLoc: 3728, trafPago: 761, visitas: 1800, estudos: 477, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "MNEM", uniao: "UNB", base: 15966, quentes: 3701, frios: 7643, naoLoc: 1961, trafPago: 2744, visitas: 1333, estudos: 381, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "MOPA", uniao: "UNB", base: 6984, quentes: 2622, frios: 1893, naoLoc: 1760, trafPago: 1573, visitas: 940, estudos: 299, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "MPA", uniao: "UNB", base: 24427, quentes: 6571, frios: 10751, naoLoc: 5889, trafPago: 720, visitas: 3261, estudos: 101, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "ALP", uniao: "UNEB", base: 19241, quentes: 3830, frios: 6250, naoLoc: 6485, trafPago: 0, visitas: 1429, estudos: 463, naoAtend: 145, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "APEC", uniao: "UNEB", base: 13587, quentes: 2496, frios: 5153, naoLoc: 4615, trafPago: 0, visitas: 1254, estudos: 380, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "MISAL", uniao: "UNEB", base: 29769, quentes: 1875, frios: 3933, naoLoc: 5237, trafPago: 0, visitas: 758, estudos: 215, naoAtend: 17311, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "MPI", uniao: "UNEB", base: 16967, quentes: 4408, frios: 7488, naoLoc: 3018, trafPago: 997, visitas: 1224, estudos: 359, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "ACP", uniao: "USB", base: 34442, quentes: 9139, frios: 10942, naoLoc: 13082, trafPago: 773, visitas: 3362, estudos: 611, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "ACRS", uniao: "USB", base: 32094, quentes: 7531, frios: 15824, naoLoc: 12665, trafPago: 939, visitas: 2418, estudos: 442, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "ANC", uniao: "USB", base: 28263, quentes: 5502, frios: 13217, naoLoc: 9739, trafPago: 802, visitas: 1007, estudos: 222, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "ANP", uniao: "USB", base: 32900, quentes: 10449, frios: 8032, naoLoc: 9716, trafPago: 1310, visitas: 4398, estudos: 806, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "ANRS", uniao: "USB", base: 31918, quentes: 7695, frios: 6860, naoLoc: 14908, trafPago: 0, visitas: 3573, estudos: 1114, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "ASC", uniao: "USB", base: 42533, quentes: 13976, frios: 15699, naoLoc: 10138, trafPago: 416, visitas: 852, estudos: 230, naoAtend: 437, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "ASP", uniao: "USB", base: 26778, quentes: 10406, frios: 5553, naoLoc: 9279, trafPago: 489, visitas: 4768, estudos: 926, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "ASRS", uniao: "USB", base: 24962, quentes: 4572, frios: 15035, naoLoc: 4743, trafPago: 279, visitas: 509, estudos: 105, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "AES", uniao: "USEB", base: 35779, quentes: 8685, frios: 14561, naoLoc: 11424, trafPago: 496, visitas: 1969, estudos: 605, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "AMC", uniao: "USEB", base: 61204, quentes: 10127, frios: 21901, naoLoc: 22861, trafPago: 200, visitas: 5138, estudos: 1454, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "AML", uniao: "USEB", base: 27130, quentes: 6257, frios: 7295, naoLoc: 11754, trafPago: 374, visitas: 3012, estudos: 892, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "AMS", uniao: "USEB", base: 58490, quentes: 10565, frios: 17435, naoLoc: 21179, trafPago: 286, visitas: 3131, estudos: 1138, naoAtend: 3110, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "ARF", uniao: "USEB", base: 48180, quentes: 8523, frios: 13870, naoLoc: 15120, trafPago: 113, visitas: 2879, estudos: 813, naoAtend: 5290, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "ARJ", uniao: "USEB", base: 47725, quentes: 8552, frios: 14404, naoLoc: 22480, trafPago: 765, visitas: 2516, estudos: 810, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "ASES", uniao: "USEB", base: 31105, quentes: 9060, frios: 9074, naoLoc: 11877, trafPago: 67, visitas: 3233, estudos: 898, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "MMN", uniao: "USEB", base: 13083, quentes: 3654, frios: 4393, naoLoc: 4560, trafPago: 142, visitas: 1980, estudos: 617, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
  { campo: "MMO", uniao: "USEB", base: 35824, quentes: 6670, frios: 10769, naoLoc: 15493, trafPago: 3410, visitas: 3674, estudos: 1108, naoAtend: 0, bronze: 0, prata: 0, ouro: 0, diamante: 0 },
];

export const REPORT_TOTAL: CampoRow = {
  campo: "TOTAL GERAL",
  uniao: "—",
  base: 1_157_127,
  quentes: 254_250,
  frios: 371_880,
  naoLoc: 367_750,
  trafPago: 39_758,
  visitas: 85_621,
  estudos: 22_038,
  naoAtend: 0,
  bronze: 13,
  prata: 0,
  ouro: 1,
  diamante: 0,
};

export const REPORT_MATERIAIS: MaterialRow[] = [
  { rank: 1, name: "Respostas — Ivan Saraiva — Impresso", qty: 31694 },
  { rank: 2, name: "CD Verdades Bíblicas (Cid Moreira)", qty: 22552 },
  { rank: 3, name: "Evidências — PDF", qty: 22154 },
  { rank: 4, name: "Evidências — Impresso", qty: 21501 },
  { rank: 5, name: "Verdades para o Tempo do Fim (Est. Bíblico)", qty: 17740 },
  { rank: 6, name: "Apocalipse — Impresso", qty: 14545 },
  { rank: 7, name: "Princípios — Impresso", qty: 13763 },
  { rank: 8, name: "Fique Leve — Impresso", qty: 13199 },
  { rank: 9, name: "Daniel — Profecias de Daniel — Impresso", qty: 11245 },
  { rank: 10, name: "Ensinos de Jesus — Impresso", qty: 9152 },
  { rank: 11, name: "Verdades para o Tempo do Fim — Impresso", qty: 9066 },
  { rank: 12, name: "Deus Me Ouve? — Impresso", qty: 8439 },
];

export const EB_FUNNEL_TAGS = [
  { id: "eb_aluno", name: "Aluno", color: BRAND.navy },
  { id: "eb_estudando", name: "Estudando", color: BRAND.navy },
  { id: "eb_nenhum", name: "Nenhum", color: BRAND.slate },
  { id: "eb_nao_loc", name: "Não Localizado", color: BRAND.muted },
  { id: "eb_mkt", name: "MKT Digital", color: BRAND.gold },
  { id: "eb_desint", name: "Desinteressado", color: BRAND.navyDeep },
  { id: "eb_nao_atend", name: "Não Atendidos", color: BRAND.sky },
  { id: "eb_visita", name: "Visita Aceita", color: BRAND.gold },
  { id: "eb_estudo", name: "Estudo Aceito", color: BRAND.navyMid },
  { id: "eb_oracao", name: "Grupo de Oração Aceito", color: BRAND.sky },
  { id: "eb_conv_mkt", name: "Conversão de MKT Aceito", color: BRAND.goldSoft },
  { id: "eb_pend", name: "Visitas Pendentes", color: BRAND.navy },
  { id: "eb_esp", name: "Esperança", color: BRAND.gold },
  { id: "eb_bronze", name: "Bronze", color: "#cd7f32" },
  { id: "eb_prata", name: "Prata", color: "#94a3b8" },
  { id: "eb_ouro", name: "Ouro", color: "#eab308" },
  { id: "eb_diamante", name: "Diamante", color: "#38bdf8" },
] as const;

export function fmtBR(n: number) {
  return n.toLocaleString("pt-BR");
}

/** Paleta de barras / gráficos ChatNT */
export const CHART_BRAND_COLORS = [
  "#1e48a0",
  "#163a86",
  "#3d6bc0",
  "#f5c400",
  "#5b8def",
  "#1a2744",
  "#8b95a8",
  "#f7d44a",
  "#0f2f70",
  "#c5cde0",
  "#2a5bb8",
  "#d4a800",
];
