export type MsgChannel = "session" | "flow" | "template";
export type SessionBlock = "text" | "media" | "list" | "context" | "carousel";

export type ReplyBtn = {
  id: string;
  type: "reply" | "link";
  label: string;
  url?: string;
};

export type ListRow = { id: string; title: string };
export type ListSection = { id: string; title: string; rows: ListRow[] };
export type CarouselCard = {
  id: string;
  mediaUrl: string;
  body: string;
  buttons: ReplyBtn[];
};

export function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function parseReplyButtons(cfg?: Record<string, string> | null): ReplyBtn[] {
  return parseJson<ReplyBtn[]>(cfg?.msgButtons, []);
}

export function collectLinkButtons(
  cfg?: Record<string, string> | null,
): ReplyBtn[] {
  const fromCfg = parseReplyButtons(cfg).filter(
    (b) => b.type === "link" && Boolean(b.label?.trim() || b.url?.trim()),
  );
  const fromStack = parseMsgStack(cfg).flatMap((item) =>
    (item.buttons ?? []).filter(
      (b) => b.type === "link" && Boolean(b.label?.trim() || b.url?.trim()),
    ),
  );
  const seen = new Set<string>();
  const out: ReplyBtn[] = [];
  for (const b of [...fromCfg, ...fromStack]) {
    const key = `${b.id}|${b.label}|${b.url ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(b);
  }
  return out;
}

export function parseListSections(cfg?: Record<string, string> | null): ListSection[] {
  const parsed = parseJson<ListSection[]>(cfg?.listSections, []);
  if (parsed.length) return parsed;
  return [{ id: "s1", title: "", rows: [{ id: "r1", title: "" }] }];
}

export function parseCarouselCards(cfg?: Record<string, string> | null): CarouselCard[] {
  const parsed = parseJson<CarouselCard[]>(cfg?.carouselCards, []);
  if (parsed.length) return parsed;
  return [{ id: "c1", mediaUrl: "", body: "", buttons: [] }];
}

export function inferMsgChannel(
  type: string,
  cfg?: Record<string, string> | null,
): MsgChannel | "" {
  if (cfg?.msgKind === "session" || cfg?.msgKind === "flow" || cfg?.msgKind === "template") {
    return cfg.msgKind;
  }
  if (type === "template" || cfg?.templateId) return "template";
  if (cfg?.flowId) return "flow";
  if (cfg?.text || cfg?.mediaUrl || cfg?.sessionBlock || cfg?.msgStack) return "session";
  return "";
}

export function inferSessionBlock(cfg?: Record<string, string> | null): SessionBlock | "" {
  const b = cfg?.sessionBlock;
  if (b === "text" || b === "media" || b === "list" || b === "context" || b === "carousel") {
    return b;
  }
  if (cfg?.mediaUrl) return "media";
  if (cfg?.listSections) return "list";
  if (cfg?.contextFieldId) return "context";
  if (cfg?.carouselCards) return "carousel";
  if (cfg?.text || cfg?.msgStack) return "text";
  return "";
}

export const SESSION_BLOCKS: {
  id: SessionBlock;
  label: string;
  hint: string;
  icon: "text" | "media" | "list" | "context" | "carousel";
}[] = [
  {
    id: "text",
    label: "Mensagem de texto",
    hint: "Texto simples com ou sem botão",
    icon: "text",
  },
  {
    id: "media",
    label: "Mídia",
    hint: "Imagem, vídeo, audio ou documento",
    icon: "media",
  },
  {
    id: "list",
    label: "Lista de mensagem",
    hint: "Mensagem com menu de opções interativas",
    icon: "list",
  },
  {
    id: "context",
    label: "Mensagem contexto",
    hint: "Pergunte e atualize o campo selecionado",
    icon: "context",
  },
  {
    id: "carousel",
    label: "Carrossel",
    hint: "Exibe múltiplos conteúdos em formato de rolagem horizontal",
    icon: "carousel",
  },
];

export type StackItem = {
  id: string;
  kind: SessionBlock;
  text?: string;
  header?: string;
  footer?: string;
  listButton?: string;
  buttons?: ReplyBtn[];
  mediaUrl?: string;
  mediaName?: string;
  listSections?: ListSection[];
  contextFieldId?: string;
  carouselCards?: CarouselCard[];
};

export function parseMsgStack(cfg?: Record<string, string> | null): StackItem[] {
  const parsed = parseJson<StackItem[]>(cfg?.msgStack, []);
  const normalize = (item: StackItem): StackItem => ({
    ...item,
    id: item.id || `m_${Math.random().toString(36).slice(2, 7)}`,
    kind: item.kind || "text",
    buttons: Array.isArray(item.buttons)
      ? item.buttons
      : parseJson<ReplyBtn[]>(item.buttons as unknown as string, []),
    listSections: Array.isArray(item.listSections)
      ? item.listSections
      : item.listSections
        ? parseJson<ListSection[]>(item.listSections as unknown as string, [])
        : undefined,
    carouselCards: Array.isArray(item.carouselCards)
      ? item.carouselCards
      : undefined,
  });
  if (parsed.length) {
    const items = parsed.map(normalize);
    const hasContent = items.some(
      (i) =>
        (i.text ?? "").trim() ||
        (i.header ?? "").trim() ||
        i.mediaUrl ||
        (i.buttons ?? []).some((b) => b.label?.trim()),
    );
    if (hasContent || !(cfg?.text || cfg?.body || cfg?.header)) return items;
  }
  const block = inferSessionBlock(cfg);
  if (!cfg) return [];
  if (!block && !cfg.text && !cfg.body && !cfg.mediaUrl && !cfg.header) return [];
  return [
    normalize({
      id: "m1",
      kind: block || "text",
      text: cfg.text || cfg.body,
      header: cfg.header,
      footer: cfg.footer,
      listButton: cfg.listButton || cfg.button,
      buttons: parseReplyButtons(cfg),
      mediaUrl: cfg.mediaUrl,
      mediaName: cfg.mediaName,
      listSections: cfg.listSections ? parseListSections(cfg) : undefined,
      contextFieldId: cfg.contextFieldId,
      carouselCards: cfg.carouselCards ? parseCarouselCards(cfg) : undefined,
    }),
  ];
}

export function serializeMsgStack(items: StackItem[]): Record<string, string> {
  const first = items[0];
  const withBtns = [...items].reverse().find((i) => (i.buttons ?? []).length);
  const withList = items.find((i) =>
    (i.listSections ?? []).some((s) => s.rows.some((r) => r.title.trim())),
  );
  const withMedia = items.find((i) => i.mediaUrl);
  return {
    msgKind: "session",
    sessionBlock: first?.kind || "text",
    msgStack: JSON.stringify(items),
    text: first?.text || items.find((i) => i.text)?.text || "",
    header: first?.header || "",
    footer: items[items.length - 1]?.footer || "",
    listButton: withList?.listButton || "",
    msgButtons: JSON.stringify(withBtns?.buttons ?? []),
    mediaUrl: withMedia?.mediaUrl || "",
    mediaName: withMedia?.mediaName || "",
    listSections: JSON.stringify(withList?.listSections ?? []),
    contextFieldId: items.find((i) => i.contextFieldId)?.contextFieldId || "",
    carouselCards: JSON.stringify(
      items.find((i) => i.carouselCards?.length)?.carouselCards ?? [],
    ),
  };
}
