export type TriggerKind =
  | "any_inbound"
  | "ctwa"
  | "keyword"
  | "first_message"
  | "contact_created"
  | "tag"
  | "tag_removed"
  | "http_in"
  | "assigned"
  | "conversation_closed"
  | "contact_no_reply"
  | "agent_no_reply"
  | "pipeline_stage"
  | "pipeline_stale"
  | "deal_won"
  | "deal_lost"
  | "deal_created"
  | "deal_deleted"
  | "broadcast";

export type AutomationEventType =
  | "inbound"
  | "ctwa"
  | "tag_added"
  | "tag_removed"
  | TriggerKind;

export type AutomationEvent = {
  type: AutomationEventType;
  text?: string;
  isNewConversation?: boolean;
  tagId?: string;
  stageId?: string;
  agentId?: string;
  hours?: number;
  adName?: string;
  campaign?: string;
  headline?: string;
  adBody?: string;
  sourceUrl?: string;
  referral?: string;
};

export type TriggerItem = {
  kind: TriggerKind;
  label: string;
  hint: string;
  icon: string;
};

export type TriggerGroup = {
  group: string;
  items: TriggerItem[];
};

export const TRIGGER_CATALOG: TriggerGroup[] = [
  {
    group: "Broadcast",
    items: [
      {
        kind: "broadcast",
        label: "Broadcast",
        hint: "Inicia quando este broadcast é enviado para o contato.",
        icon: "wa",
      },
    ],
  },
  {
    group: "Mensagem",
    items: [
      {
        kind: "any_inbound",
        label: "Cliente interagir",
        hint: "Quando o cliente enviar uma mensagem para você.",
        icon: "wa",
      },
      {
        kind: "ctwa",
        label: "Clique para WhatsApp (CTWA)",
        hint: "Quando alguém interagir com uma campanha do WhatsApp.",
        icon: "wa",
      },
      {
        kind: "keyword",
        label: "Palavra-chave",
        hint: "Quando a mensagem contiver uma palavra-chave.",
        icon: "wa",
      },
      {
        kind: "first_message",
        label: "Primeira mensagem",
        hint: "Na primeira mensagem do aluno nesta conversa.",
        icon: "wa",
      },
    ],
  },
  {
    group: "Contato",
    items: [
      {
        kind: "contact_created",
        label: "Contato criado",
        hint: "Quando o contato for criado.",
        icon: "user-plus",
      },
      {
        kind: "tag",
        label: "Adicionar tag",
        hint: "Quando uma das tags for adicionada ao contato.",
        icon: "tag",
      },
      {
        kind: "tag_removed",
        label: "Remover tag",
        hint: "Quando uma das tags for removida do contato.",
        icon: "tag",
      },
    ],
  },
  {
    group: "Integração",
    items: [
      {
        kind: "http_in",
        label: "Requisição HTTP",
        hint: "Ao receber uma requisição HTTP que atenda aos critérios.",
        icon: "http",
      },
    ],
  },
  {
    group: "Atendimento",
    items: [
      {
        kind: "assigned",
        label: "Atribuir a um atendente",
        hint: "Automação ativará ao atribuir um atendente.",
        icon: "user",
      },
      {
        kind: "conversation_closed",
        label: "Ao finalizar uma conversa",
        hint: "Será ativada assim que alguma conversa for encerrada.",
        icon: "check",
      },
      {
        kind: "contact_no_reply",
        label: "Contato não respondeu",
        hint: "Contato passou X tempo sem responder.",
        icon: "clock",
      },
      {
        kind: "agent_no_reply",
        label: "Atendente não respondeu",
        hint: "Atendente passou X tempo sem responder.",
        icon: "clock",
      },
    ],
  },
  {
    group: "CRM",
    items: [
      {
        kind: "pipeline_stage",
        label: "For atribuído a uma etapa do pipeline",
        hint: "Quando o contato for atribuído à etapa do pipeline.",
        icon: "kanban",
      },
      {
        kind: "pipeline_stale",
        label: "Tempo sem avançar no pipeline",
        hint: "Contato parado na etapa por mais de X horas/dias.",
        icon: "clock",
      },
      {
        kind: "deal_won",
        label: "Fechar negócio ganho",
        hint: "Quando o negócio no pipeline selecionado for marcado como \"ganho\".",
        icon: "thumb-up",
      },
      {
        kind: "deal_lost",
        label: "Fechar negócio perdido",
        hint: "Quando o negócio no pipeline selecionado for marcado como \"perdido\".",
        icon: "thumb-down",
      },
      {
        kind: "deal_created",
        label: "Negócio criado no pipeline",
        hint: "Quando um negócio for criado no pipeline selecionado.",
        icon: "plus",
      },
      {
        kind: "deal_deleted",
        label: "Negócio apagado do pipeline",
        hint: "Quando o negócio no pipeline selecionado for apagado.",
        icon: "trash",
      },
    ],
  },
];

export function allTriggerItems(): TriggerItem[] {
  return TRIGGER_CATALOG.flatMap((g) => g.items);
}

export function triggerByKind(kind: string | undefined): TriggerItem | undefined {
  if (!kind) return undefined;
  return allTriggerItems().find((i) => i.kind === kind);
}

export function inferTriggerKind(config?: Record<string, string> | null): TriggerKind {
  const cfg = config ?? {};
  if (cfg.kind && allTriggerItems().some((i) => i.kind === cfg.kind)) {
    return cfg.kind as TriggerKind;
  }
  if (cfg.matchMode) return "any_inbound";
  if (cfg.keyword) return "keyword";
  if (cfg.tagId) return "tag";
  return "any_inbound";
}

export type InteractMatch =
  | "any"
  | "exact"
  | "contains"
  | "starts_with"
  | "regex"
  | "words";

export const INTERACT_MATCHES: {
  mode: InteractMatch;
  label: string;
  hint: string;
}[] = [
  {
    mode: "any",
    label: "Qualquer mensagem",
    hint: "Qualquer mensagem enviada pelo contato.",
  },
  {
    mode: "exact",
    label: "Texto exato",
    hint: "A mensagem do contato é exatamente o texto que você definiu.",
  },
  {
    mode: "contains",
    label: "Contém o texto",
    hint: "A mensagem contém um valor específico definido",
  },
  {
    mode: "starts_with",
    label: "Texto começa com",
    hint: "A mensagem começa com um texto específico.",
  },
  {
    mode: "regex",
    label: "Regex",
    hint: "A mensagem contém um padrão de regex específico.",
  },
  {
    mode: "words",
    label: "Palavras gatilhos",
    hint: "A mensagem contém algumas das palavras definidas.",
  },
];

export function interactMatchOf(
  config?: Record<string, string> | null,
): InteractMatch {
  const mode = config?.matchMode;
  if (INTERACT_MATCHES.some((m) => m.mode === mode)) return mode as InteractMatch;
  if (config?.keyword) return "words";
  return "any";
}

export function matchInboundText(
  text: string,
  mode: string | undefined,
  value: string | undefined,
): boolean {
  const fold = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const raw = text ?? "";
  const t = fold(raw);
  const v = fold(value ?? "");
  switch (mode || "any") {
    case "exact":
      if (!v) return true;
      return t === v;
    case "contains":
      if (!v) return true;
      return t.includes(v);
    case "starts_with":
      if (!v) return true;
      return t.startsWith(v);
    case "regex": {
      if (!(value ?? "").trim()) return true;
      try {
        return new RegExp(value!.trim(), "i").test(raw);
      } catch {
        return false;
      }
    }
    case "words": {
      const words = (value ?? "")
        .split(/[,;\n|]+/)
        .map((s) => fold(s))
        .filter(Boolean);
      if (!words.length) return true;
      return words.some((w) => t === w || t.includes(w));
    }
    case "any":
    default:
      return true;
  }
}

export type CtwaMode = "ads" | "contains" | "all";

export const CTWA_MODES: { mode: CtwaMode; label: string; hint: string }[] = [
  {
    mode: "ads",
    label: "Anúncios",
    hint: "Ao clicar em algum dos anúncios, o fluxo será acionado.",
  },
  {
    mode: "contains",
    label: "Contém o texto",
    hint: "Clicar em um anúncio e enviar mensagem contendo o texto.",
  },
  {
    mode: "all",
    label: "Todas campanhas (CTWA)",
    hint: "Quando o contato clicar em qualquer anuncio.",
  },
];

export const CTWA_FIELD_SOURCES: { id: string; label: string }[] = [
  { id: "", label: "Não atualizar" },
  { id: "message", label: "Texto da mensagem" },
  { id: "ad_name", label: "Nome do anúncio" },
  { id: "campaign", label: "Campanha" },
  { id: "headline", label: "Headline" },
  { id: "ad_body", label: "Texto do anúncio" },
  { id: "source_url", label: "URL da origem" },
  { id: "referral", label: "ID CTWA / referral" },
];

export function ctwaModeOf(config?: Record<string, string> | null): CtwaMode {
  const mode = config?.ctwaMode;
  if (CTWA_MODES.some((m) => m.mode === mode)) return mode as CtwaMode;
  return "all";
}

export function parseCtwaFieldMap(
  config?: Record<string, string> | null,
): Record<string, string> {
  const raw = config?.ctwaFieldMap;
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw) as unknown;
    if (!obj || typeof obj !== "object") return {};
    return obj as Record<string, string>;
  } catch {
    return {};
  }
}

export function matchCtwaEvent(
  ev: { type: string; text?: string; adName?: string; campaign?: string },
  config?: Record<string, string> | null,
): boolean {
  if (ev.type !== "ctwa") return false;
  const mode = ctwaModeOf(config);
  const text = (ev.text ?? "").toLowerCase();
  const ad = `${ev.adName ?? ""} ${ev.campaign ?? ""}`.toLowerCase();
  if (mode === "contains") {
    const needle = (config?.ctwaText ?? "").toLowerCase().trim();
    return needle.length > 0 && text.includes(needle);
  }
  if (mode === "ads") {
    const list = (config?.ctwaAds ?? "")
      .split(/[,;\n]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (!list.length) return true;
    return list.some((name) => ad.includes(name) || text.includes(name));
  }
  return true;
}

export function triggerHint(config?: Record<string, string> | null): string {
  const cfg = config ?? {};
  const kind = inferTriggerKind(cfg);
  const item = triggerByKind(kind);
  if (kind === "any_inbound") {
    const match = INTERACT_MATCHES.find((m) => m.mode === interactMatchOf(cfg));
    const val = (cfg.matchValue || cfg.keyword || "").trim();
    if (match && match.mode !== "any" && val) return `${match.label}: “${val}”`;
    return match?.label ?? item?.label ?? "Cliente interagir";
  }
  if (kind === "ctwa") {
    const mode = CTWA_MODES.find((m) => m.mode === ctwaModeOf(cfg));
    const val = (cfg.ctwaText || cfg.ctwaAds || "").trim();
    if (mode && val) return `${mode.label}: “${val}”`;
    return mode?.label ?? item?.label ?? "CTWA";
  }
  if (kind === "keyword" && cfg.keyword) return `Palavra: “${cfg.keyword}”`;
  return item?.label ?? "Gatilho";
}
