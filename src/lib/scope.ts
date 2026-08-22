import type { Contact, Connection, SessionScope } from "./types";
import { REPORT_CAMPOS, type CampoRow } from "./report-seed";

/** IDs dos campos customizados usados na segmentação regional */
export const FIELD_CAMPO = "cf5";
export const FIELD_UNIAO = "cf6";

/**
 * Sedes regionais da demo (associações / missões).
 * Cada uma tem WhatsApp exclusivo e só enxerga a própria base.
 */
export type SedeRegional = {
  code: string;
  name: string;
  uniao: string;
  tipo: "associacao" | "missao";
  whatsapp: string;
  handle: string;
  connectionId: string;
  /** Cidade / região de referência */
  regiao: string;
  isDemo?: boolean;
};

export const SEDES_DEMO: SedeRegional[] = [
  {
    code: "ANPA",
    name: "Associação Norte do Pará",
    uniao: "UNB",
    tipo: "associacao",
    whatsapp: "+55 91 99100-1001",
    handle: "anpa.nt",
    connectionId: "cx_anpa",
    regiao: "Belém / Pará",
    isDemo: true,
  },
  {
    code: "APL",
    name: "Associação Paulista Leste",
    uniao: "UCB",
    tipo: "associacao",
    whatsapp: "+55 11 99100-1002",
    handle: "apl.nt",
    connectionId: "cx_apl",
    regiao: "São Paulo",
    isDemo: true,
  },
  {
    code: "AMC",
    name: "Associação Mineira Central",
    uniao: "USEB",
    tipo: "associacao",
    whatsapp: "+55 31 99100-1003",
    handle: "amc.nt",
    connectionId: "cx_amc",
    regiao: "Belo Horizonte",
    isDemo: true,
  },
  {
    code: "MISAL",
    name: "Missão Alagoas",
    uniao: "UNEB",
    tipo: "missao",
    whatsapp: "+55 82 99100-1004",
    handle: "misal.nt",
    connectionId: "cx_misal",
    regiao: "Maceió",
    isDemo: true,
  },
];

export const UNIOES = [
  { code: "UNB", name: "União Norte Brasileira" },
  { code: "UCB", name: "União Centro-Oeste Brasileira" },
  { code: "USEB", name: "União Sudeste Brasileira" },
  { code: "UNEB", name: "União Nordeste Brasileira" },
  { code: "USB", name: "União Sul Brasileira" },
  { code: "ULB", name: "União Leste Brasileira" },
] as const;

export function getSede(
  code: string | null | undefined,
  sedes: SedeRegional[] = SEDES_DEMO,
) {
  if (!code) return null;
  const needle = code.toUpperCase();
  return sedes.find((s) => s.code.toUpperCase() === needle) ?? null;
}

export function contactCampo(c: Contact): string {
  return (c.customFields[FIELD_CAMPO] ?? "").trim().toUpperCase();
}

export function contactUniao(c: Contact): string {
  return (c.customFields[FIELD_UNIAO] ?? "").trim().toUpperCase();
}

/** Contato pertence ao escopo da sessão? */
export function contactInScope(c: Contact, scope: SessionScope): boolean {
  if (scope.mode === "central") return true;
  if (!scope.campoCode) return false;
  return contactCampo(c) === scope.campoCode.toUpperCase();
}

export function filterContactsByScope(
  contacts: Contact[],
  scope: SessionScope,
): Contact[] {
  if (scope.mode === "central") return contacts;
  return contacts.filter((c) => contactInScope(c, scope));
}

export function filterConnectionsByScope(
  connections: Connection[],
  scope: SessionScope,
): Connection[] {
  if (scope.mode === "central") return connections;
  return connections.filter(
    (cx) =>
      cx.scope === "regional" &&
      cx.campoCode?.toUpperCase() === scope.campoCode?.toUpperCase(),
  );
}

export function reportRowsForScope(scope: SessionScope): CampoRow[] {
  if (scope.mode === "central") return REPORT_CAMPOS;
  return REPORT_CAMPOS.filter(
    (r) => r.campo.toUpperCase() === (scope.campoCode ?? "").toUpperCase(),
  );
}

export function scopeLabel(
  scope: SessionScope,
  sedes: SedeRegional[] = SEDES_DEMO,
): string {
  if (scope.mode === "central") return "Central de Relacionamento";
  const sede = getSede(scope.campoCode, sedes);
  return sede
    ? `${sede.code} · ${sede.name}`
    : `Campo ${scope.campoCode ?? "?"}`;
}
