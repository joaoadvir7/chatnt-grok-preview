import { interpolateText } from "./interpolate";
import type { AutomationEvent } from "./automation-triggers";
import { inferTriggerKind, matchCtwaEvent, matchInboundText, parseCtwaFieldMap } from "./automation-triggers";
import { parseListSections, parseMsgStack, parseReplyButtons } from "./message-blocks";
import { contactCampo, contactUniao } from "./scope";
import type {
  Automation,
  Contact,
  Conversation,
  FlowEdge,
  FlowNode,
  Message,
} from "./types";

export type AutoAction =
  | {
      type: "bot_message";
      conversationId: string;
      text: string;
      autoName: string;
      header?: string;
      footer?: string;
      buttons?: { id: string; label: string }[];
      ctaUrls?: { label: string; url: string }[];
      listButton?: string;
      listSections?: { title: string; rows: { id: string; title: string }[] }[];
    }
  | { type: "add_tag"; contactId: string; tagId: string }
  | { type: "remove_tag"; contactId: string; tagId: string }
  | { type: "assign"; conversationId: string; agentId: string }
  | {
      type: "queue";
      conversationId: string;
      queue: Conversation["queue"];
    }
  | { type: "crm"; contactId: string; stageId: string; title: string }
  | { type: "set_field"; contactId: string; fieldId: string; value: string }
  | { type: "optout"; contactId: string }
  | { type: "system"; conversationId: string; action: string }
  | { type: "event"; conversationId: string; text: string }
  | { type: "mark_run"; automationId: string }
  | {
      type: "wait_button";
      conversationId: string;
      automationId: string;
      nodeId: string;
      stackIndex?: number;
      usedLabels?: string[];
    }
  | { type: "clear_wait"; conversationId: string }
  | {
      type: "http";
      conversationId: string;
      contactId: string;
      method: string;
      url: string;
      headers: { key: string; value: string }[];
      body?: string;
      fieldMap: Record<string, string>;
    };

export type RandomVariation = { id: string; label: string };

export function parseRandomVariations(
  config?: Record<string, string> | null,
): RandomVariation[] {
  if (!config?.variations) return [];
  try {
    const raw = JSON.parse(config.variations) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item, i) => {
        if (typeof item === "string") {
          const label = item.trim();
          return label ? { id: `v${i + 1}`, label } : null;
        }
        if (item && typeof item === "object") {
          const o = item as { id?: string; label?: string };
          const label = String(o.label ?? "").trim();
          if (!label) return null;
          return { id: String(o.id || `v${i + 1}`), label };
        }
        return null;
      })
      .filter((v): v is RandomVariation => Boolean(v));
  } catch {
    return [];
  }
}

export function parseButtons(config: Record<string, string>): string[] {
  const fromList = (config.buttons ?? "")
    .split(/\n|\|/)
    .map((s) => s.trim())
    .filter(Boolean);
  const singles = [config.button, config.button2, config.button3].filter(
    (s): s is string => Boolean(s?.trim()),
  );
  const replies = parseReplyButtons(config)
    .filter((b) => b.type === "reply" && b.label.trim())
    .map((b) => b.label.trim());
  const listRows = parseListSections(config).flatMap((s) =>
    s.rows.map((r) => r.title.trim()).filter(Boolean),
  );
  const stackBtns = parseMsgStack(config).flatMap((item) => [
    ...(item.buttons ?? [])
      .filter((b) => (b.type ?? "reply") === "reply" && b.label?.trim())
      .map((b) => b.label.trim()),
    ...(item.listSections ?? []).flatMap((s) =>
      s.rows.map((r) => r.title.trim()).filter(Boolean),
    ),
  ]);
  return [...new Set([...fromList, ...singles, ...replies, ...listRows, ...stackBtns])];
}

export function flowOutputLabels(
  node: FlowNode,
  templates?: { id: string; buttons: string[] }[],
): string[] {
  if (node.type === "random") {
    return parseRandomVariations(node.config).map((v) => v.label);
  }
  if (node.type === "condition") {
    return ["Atende", "Não atende"];
  }
  const base = parseButtons(node.config ?? {});
  const tpl = templates?.find((t) => t.id === node.config?.templateId);
  const fromTpl = (tpl?.buttons ?? []).map((b) => b.trim()).filter(Boolean);
  return [...new Set([...base, ...fromTpl])];
}

function interpolate(
  text: string,
  contact: Contact,
  fields?: { id: string; name: string }[],
): string {
  return interpolateText(text, contact, { fields });
}

function contextFieldOf(node: FlowNode, stackIndex?: number): string {
  const stack = parseMsgStack(node.config);
  if (stack.length) {
    const from = stackIndex ?? 0;
    const at = stack[from];
    if (at?.contextFieldId) return at.contextFieldId;
    const later = stack.find(
      (i, idx) => idx >= from && (i.kind === "context" || Boolean(i.contextFieldId)),
    );
    if (later?.contextFieldId) return later.contextFieldId;
  }
  return (node.config.contextFieldId ?? "").trim();
}

function itemIsContext(item: { kind?: string; contextFieldId?: string } | undefined) {
  return Boolean(item && (item.kind === "context" || item.contextFieldId));
}

function unlabeledNext(nodeId: string, edges: FlowEdge[]): string[] {
  const first = edges.find((e) => e.from === nodeId && !e.label);
  return first ? [first.to] : [];
}

function nextNodes(nodeId: string, edges: FlowEdge[], label?: string): string[] {
  if (label) {
    return edges
      .filter(
        (e) =>
          e.from === nodeId &&
          (e.label ?? "").toLowerCase() === label.toLowerCase(),
      )
      .slice(0, 1)
      .map((e) => e.to);
  }
  return unlabeledNext(nodeId, edges);
}

function allNext(nodeId: string, edges: FlowEdge[]): string[] {
  return edges.filter((e) => e.from === nodeId).map((e) => e.to);
}

function matchButtonLabel(inbound: string, label: string): boolean {
  const a = inbound.trim().toLowerCase();
  const b = label.trim().toLowerCase();
  if (!a || !b) return false;
  return a === b;
}

function triggerMatches(
  node: FlowNode,
  opts: {
    text: string;
    isNewConversation: boolean;
    contact: Contact;
    event?: AutomationEvent;
  },
): boolean {
  const kind = inferTriggerKind(node.config);
  const ev = opts.event ?? { type: "inbound", text: opts.text };
  const text = (ev.text ?? opts.text).toLowerCase().trim();

  switch (kind) {
    case "any_inbound":
      if (
        ev.type !== "inbound" &&
        ev.type !== "any_inbound" &&
        ev.type !== "ctwa" &&
        ev.type !== "keyword"
      ) {
        return false;
      }
      return matchInboundText(
        ev.text ?? opts.text,
        node.config?.matchMode,
        node.config?.matchValue || node.config?.keyword,
      );
    case "ctwa":
      return matchCtwaEvent(
        {
          type: ev.type,
          text: ev.text ?? opts.text,
          adName: ev.adName,
          campaign: ev.campaign,
        },
        node.config,
      );
    case "broadcast":
      return ev.type === "broadcast";
    case "keyword": {
      if (
        ev.type !== "inbound" &&
        ev.type !== "keyword" &&
        ev.type !== "ctwa" &&
        ev.type !== "any_inbound"
      ) {
        return false;
      }
      return matchInboundText(
        ev.text ?? opts.text,
        node.config?.matchMode || "words",
        node.config?.matchValue || node.config?.keyword,
      );
    }
    case "first_message":
      return (
        (ev.type === "inbound" || ev.type === "first_message") &&
        (ev.isNewConversation ?? opts.isNewConversation)
      );
    case "contact_created":
      return ev.type === "contact_created";
    case "tag":
      return (
        (ev.type === "tag_added" || ev.type === "tag") &&
        (!node.config.tagId || ev.tagId === node.config.tagId)
      );
    case "tag_removed":
      return ev.type === "tag_removed" && (!node.config.tagId || ev.tagId === node.config.tagId);
    case "http_in":
      return ev.type === "http_in";
    case "assigned":
      return (
        ev.type === "assigned" &&
        (!node.config.agentId || ev.agentId === node.config.agentId)
      );
    case "conversation_closed":
      return ev.type === "conversation_closed";
    case "contact_no_reply":
      return ev.type === "contact_no_reply";
    case "agent_no_reply":
      return ev.type === "agent_no_reply";
    case "pipeline_stage":
      return (
        ev.type === "pipeline_stage" &&
        (!node.config.stageId || ev.stageId === node.config.stageId)
      );
    case "pipeline_stale":
      return ev.type === "pipeline_stale";
    case "deal_won":
      return ev.type === "deal_won";
    case "deal_lost":
      return ev.type === "deal_lost";
    case "deal_created":
      return ev.type === "deal_created";
    case "deal_deleted":
      return ev.type === "deal_deleted";
    default:
      return false;
  }
}

export type CondKind =
  | "tag"
  | "contact"
  | "global"
  | "hours"
  | "window"
  | "agent"
  | "pipeline"
  | "noreply"
  | "sheets";

export const CONDITION_KINDS: {
  kind: CondKind;
  label: string;
  hint: string;
  icon: string;
  beta?: boolean;
}[] = [
  {
    kind: "tag",
    label: "Tags",
    hint: "Realize verificações com base nas tags do contato para criar um fluxo dinâmico",
    icon: "tag",
  },
  {
    kind: "contact",
    label: "Campos do contato",
    hint: "Verifique os campos do contato, como nome, e-mail ou campos personalizados",
    icon: "user",
  },
  {
    kind: "global",
    label: "Campos customizados globais",
    hint: "Verifique os campos customizados globais",
    icon: "globe",
  },
  {
    kind: "hours",
    label: "Intervalo comercial",
    hint: "Verifique se está dentro do horário e dia esperados ou se a data desejada já foi alcançada, e siga o fluxo conforme definido",
    icon: "clock",
  },
  {
    kind: "window",
    label: "Janela de conversa",
    hint: "Verifique se a janela de conversa com o contato está aberta ou não",
    icon: "chat",
  },
  {
    kind: "agent",
    label: "Atendentes",
    hint: "Verifique se o contato está com um atendente específico ou está com qualquer atendente.",
    icon: "users",
  },
  {
    kind: "pipeline",
    label: "Está no pipeline",
    hint: "Verifique se o contato está em um pipeline, em qualquer etapa ou em uma etapa específica.",
    icon: "kanban",
  },
  {
    kind: "noreply",
    label: "Tempo sem resposta do contato",
    hint: "Verifique se o contato não respondeu dentro de um período definido.",
    icon: "timer",
  },
  {
    kind: "sheets",
    label: "Google Sheets",
    hint: "Compare o valor de uma coluna da pesquisa ou verifique o status da pesquisa na planilha.",
    icon: "sheets",
    beta: true,
  },
];

export type ConditionItem = {
  id: string;
  kind?: CondKind;
  field: string;
  op: string;
  value: string;
};

export type ConditionGroup = {
  id: string;
  name: string;
  join: "and" | "or";
  items: ConditionItem[];
};

export function parseConditionGroups(
  config?: Record<string, string> | null,
): ConditionGroup[] {
  if (!config) return [];
  if (config.conditionGroups) {
    try {
      const raw = JSON.parse(config.conditionGroups) as unknown;
      if (Array.isArray(raw)) {
        const groups: ConditionGroup[] = [];
        raw.forEach((g, i) => {
          if (!g || typeof g !== "object") return;
          const o = g as Partial<ConditionGroup>;
          const items: ConditionItem[] = Array.isArray(o.items)
            ? o.items.map((it, j) => ({
                id: String(it?.id || `c${j + 1}`),
                kind: (it?.kind as CondKind) || inferKind(it?.field),
                field: String(it?.field || "tag"),
                op: String(it?.op || "eq"),
                value: String(it?.value ?? ""),
              }))
            : [];
          groups.push({
            id: String(o.id || `g${i + 1}`),
            name: String(o.name || "Grupo de condições"),
            join: o.join === "and" ? "and" : "or",
            items,
          });
        });
        return groups;
      }
    } catch {
      /* ignore */
    }
  }
  if (config.field || config.tagId || config.value) {
    return [
      {
        id: "g1",
        name: "Grupo de condições",
        join: "and",
        items: [
          {
            id: "c1",
            kind: inferKind(config.field),
            field: config.field || "tag",
            op: "eq",
            value: config.tagId || config.value || "",
          },
        ],
      },
    ];
  }
  return [];
}

function inferKind(field?: string): CondKind {
  if (!field || field === "tag") return "tag";
  if (["name", "phone", "email", "campo", "uniao", "optout"].includes(field))
    return "contact";
  if (field === "hours") return "hours";
  if (field === "window") return "window";
  if (field === "agent") return "agent";
  if (field === "pipeline") return "pipeline";
  if (field === "noreply") return "noreply";
  if (field === "sheets") return "sheets";
  return "global";
}

function fieldValue(contact: Contact, field: string): string {
  if (field === "name") return contact.name ?? "";
  if (field === "phone") return contact.phone ?? "";
  if (field === "email") return contact.email ?? "";
  if (field === "campo") return contactCampo(contact);
  if (field === "uniao") return contactUniao(contact);
  if (field === "optout") return contact.optedOut ? "1" : "0";
  if (field === "tag") return contact.tagIds.join(",");
  return (contact.customFields ?? {})[field] ?? "";
}

function cmpStr(got: string, want: string, op: string): boolean {
  const a = got.toLowerCase().trim();
  const b = want.toLowerCase().trim();
  if (op === "exists") return a.length > 0;
  if (op === "not_exists") return a.length === 0;
  if (op === "contains") return a.includes(b);
  if (op === "not_contains") return !a.includes(b);
  if (op === "neq") return a !== b;
  if (op === "gt") return Number(got) > Number(want);
  if (op === "lt") return Number(got) < Number(want);
  return a === b;
}

export type CondContext = {
  contact: Contact;
  conversation: Conversation;
  deals?: { contactId: string; stageId: string }[];
  lastInboundAt?: string;
  lastOutboundAt?: string;
  now?: number;
};

function inBusinessHours(value: string, now: Date): boolean {
  let days = [1, 2, 3, 4, 5];
  let from = "08:00";
  let to = "18:00";
  try {
    const j = JSON.parse(value) as { days?: number[]; from?: string; to?: string };
    if (Array.isArray(j.days) && j.days.length) days = j.days;
    if (j.from) from = j.from;
    if (j.to) to = j.to;
  } catch {
    /* default */
  }
  if (!days.includes(now.getDay())) return false;
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return hhmm >= from && hhmm <= to;
}

function itemPass(item: ConditionItem, ctx: CondContext): boolean {
  const kind = item.kind || inferKind(item.field);
  const op = item.op || "eq";
  const contact = ctx.contact;
  const now = ctx.now ?? Date.now();

  if (kind === "tag") {
    const has = contact.tagIds.includes(item.value);
    if (op === "neq" || op === "not_contains") return !has;
    if (op === "exists") return contact.tagIds.length > 0;
    if (op === "not_exists") return contact.tagIds.length === 0;
    return has;
  }
  if (kind === "window") {
    const last = ctx.lastInboundAt ? new Date(ctx.lastInboundAt).getTime() : 0;
    const open = last > 0 && now - last < 24 * 60 * 60 * 1000;
    return item.value === "closed" || op === "neq" ? !open : open;
  }
  if (kind === "agent") {
    const asg = ctx.conversation.assignee ?? "";
    if (item.value === "*" || item.value === "any") return Boolean(asg);
    if (item.value === "none" || item.value === "") return !asg;
    return asg === item.value;
  }
  if (kind === "pipeline") {
    const deals = (ctx.deals ?? []).filter((d) => d.contactId === contact.id);
    if (item.value === "*" || item.value === "any") return deals.length > 0;
    if (item.value === "none") return deals.length === 0;
    return deals.some((d) => d.stageId === item.value);
  }
  if (kind === "noreply") {
    const hours = Number(item.value || item.field || 24) || 24;
    const last = ctx.lastInboundAt ? new Date(ctx.lastInboundAt).getTime() : 0;
    if (!last) return true;
    return now - last >= hours * 60 * 60 * 1000;
  }
  if (kind === "hours") {
    const inside = inBusinessHours(item.value, new Date(now));
    return op === "out" || item.field === "out" ? !inside : inside;
  }
  if (kind === "sheets") {
    return cmpStr(fieldValue(contact, item.field), item.value, op);
  }
  return cmpStr(fieldValue(contact, item.field), item.value, op);
}

function groupPass(group: ConditionGroup, ctx: CondContext): boolean {
  if (!group.items.length) return false;
  return group.join === "and"
    ? group.items.every((it) => itemPass(it, ctx))
    : group.items.some((it) => itemPass(it, ctx));
}

function conditionPass(node: FlowNode, ctx: CondContext): boolean {
  const groups = parseConditionGroups(node.config);
  if (groups.length) return groups.every((g) => groupPass(g, ctx));
  const field = node.config.field || "tag";
  const value = (node.config.value ?? "").trim();
  if (field === "tag") {
    return ctx.contact.tagIds.includes(node.config.tagId || value);
  }
  const cf = ctx.contact.customFields ?? {};
  const got = (cf[field] ?? "").toLowerCase();
  return got === value.toLowerCase() || got.includes(value.toLowerCase());
}

/**
 * Decide quais automações disparam e quais ações aplicar (sem mutar o store).
 */
const recentFires = new Map<string, number>();
const FIRE_DEBOUNCE_MS = 8000;

function alreadyFired(autoId: string, conversationId: string, text: string) {
  const key = `${autoId}|${conversationId}|${text.trim().toLowerCase()}`;
  const now = Date.now();
  const prev = recentFires.get(key) ?? 0;
  if (now - prev < FIRE_DEBOUNCE_MS) return true;
  recentFires.set(key, now);
  if (recentFires.size > 400) {
    for (const [k, t] of recentFires) {
      if (now - t > FIRE_DEBOUNCE_MS * 4) recentFires.delete(k);
    }
  }
  return false;
}

export function planAutomationRuns(opts: {
  automations: Automation[];
  contact: Contact;
  conversation: Conversation;
  inboundText: string;
  contactMessageCount: number;
  forceAutomationId?: string;
  startNodeIds?: string[];
  startStackIndex?: number;
  event?: AutomationEvent;
  fields?: { id: string; name: string }[];
  deals?: { contactId: string; stageId: string }[];
  lastInboundAt?: string;
  lastOutboundAt?: string;
}): AutoAction[] {
  if (opts.conversation.automationsPaused && !opts.forceAutomationId) {
    return [];
  }

  const actions: AutoAction[] = [];
  const isNew = opts.contactMessageCount <= 1;

  const waiting = opts.conversation.waitingFlow;
  let keepWait = false;
  if (waiting && !opts.forceAutomationId && !opts.startNodeIds) {
    const auto = opts.automations.find((a) => a.id === waiting.automationId);
    const node = auto?.nodes.find((n) => n.id === waiting.nodeId);
    if (auto && node) {
      const text = opts.inboundText.trim().toLowerCase();
      const btns = parseButtons(node.config);
      const used = (waiting.usedLabels ?? []).map((x) => x.toLowerCase());
      const hit = auto.edges.find(
        (e) => e.from === node.id && e.label && matchButtonLabel(text, e.label),
      );
      const byBtn = hit
        ? hit
        : btns.some((b) => matchButtonLabel(text, b))
          ? auto.edges.find((e) => e.from === node.id && !e.label)
          : undefined;
      const start = hit?.to ?? byBtn?.to;
      const hitKey = (hit?.label || opts.inboundText).trim();
      if (start && hitKey && used.includes(hitKey.toLowerCase())) {
        return [
          {
            type: "event",
            conversationId: opts.conversation.id,
            text: `Botão “${hitKey}” já foi usado · ${auto.name}`,
          },
        ];
      }
      if (start) {
        const rest = planAutomationRuns({
          ...opts,
          forceAutomationId: auto.id,
          startNodeIds: [start],
        });
        return [
          {
            type: "wait_button",
            conversationId: opts.conversation.id,
            automationId: auto.id,
            nodeId: node.id,
            stackIndex: waiting.stackIndex,
            usedLabels: [...(waiting.usedLabels ?? []), hitKey],
          },
          {
            type: "event",
            conversationId: opts.conversation.id,
            text: `Botão “${hitKey}” · ${auto.name}`,
          },
          ...rest,
        ];
      }
      const ctxField = contextFieldOf(node, waiting.stackIndex);
      const isContext =
        Boolean(ctxField) ||
        node.config.sessionBlock === "context" ||
        itemIsContext(parseMsgStack(node.config)[waiting.stackIndex ?? 0]);
      if (isContext || ctxField) {
        const stack = parseMsgStack(node.config);
        const nextIdx = (waiting.stackIndex ?? 0) + 1;
        const moreStack = stack.length > 0 && nextIdx < stack.length;
        const rest = moreStack
          ? planAutomationRuns({
              ...opts,
              forceAutomationId: auto.id,
              startNodeIds: [node.id],
              startStackIndex: nextIdx,
            })
          : (() => {
              const nxt = unlabeledNext(node.id, auto.edges);
              return nxt.length
                ? planAutomationRuns({
                    ...opts,
                    forceAutomationId: auto.id,
                    startNodeIds: nxt,
                  })
                : [];
            })();
        return [
          {
            type: "clear_wait",
            conversationId: opts.conversation.id,
          },
          ...(ctxField
            ? [
                {
                  type: "set_field" as const,
                  contactId: opts.contact.id,
                  fieldId: ctxField,
                  value: opts.inboundText,
                },
              ]
            : []),
          {
            type: "event",
            conversationId: opts.conversation.id,
            text: ctxField
              ? `Campo atualizado · ${auto.name}`
              : `Resposta recebida · ${auto.name}`,
          },
          ...rest,
        ];
      }
      const stillOpen = auto.edges.some((e) => e.from === node.id && e.label);
      if (stillOpen) {
        keepWait = true;
      }
    }
    if (!keepWait) {
      actions.push({
        type: "clear_wait",
        conversationId: opts.conversation.id,
      });
      opts = {
        ...opts,
        conversation: { ...opts.conversation, waitingFlow: undefined },
      };
    }
  }

  const candidates = opts.automations.filter((a) => {
    if (opts.forceAutomationId) return a.id === opts.forceAutomationId;
    return a.active;
  });

  for (const auto of candidates) {
    const trigger = auto.nodes.find((n) => n.type === "trigger");
    if (!trigger && !opts.startNodeIds) continue;
    if (
      !opts.forceAutomationId &&
      !opts.startNodeIds &&
      trigger &&
      !triggerMatches(trigger, {
        text: opts.inboundText,
        isNewConversation: isNew,
        contact: opts.contact,
        event: opts.event,
      })
    ) {
      continue;
    }

    if (!opts.forceAutomationId && !opts.startNodeIds) {
      if (alreadyFired(auto.id, opts.conversation.id, opts.inboundText)) {
        continue;
      }
    }

    if (!opts.forceAutomationId && !opts.startNodeIds) {
      const evs = opts.conversation.events ?? [];
      const marker = `Automação “${auto.name}” executada`;
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const runs24h = evs.filter(
        (e) => e.text === marker && new Date(e.at).getTime() >= dayAgo,
      );
      if (runs24h.length >= 40) continue;
    }

    if (trigger && inferTriggerKind(trigger.config) === "ctwa") {
      const map = parseCtwaFieldMap(trigger.config);
      const ev = opts.event;
      const values: Record<string, string> = {
        message: opts.inboundText,
        ad_name: ev?.adName ?? "",
        campaign: ev?.campaign ?? "",
        headline: ev?.headline ?? "",
        ad_body: ev?.adBody ?? "",
        source_url: ev?.sourceUrl ?? "",
        referral: ev?.referral ?? "",
      };
      for (const [fieldId, source] of Object.entries(map)) {
        const value = (values[source] ?? "").trim();
        if (!fieldId || !source || !value) continue;
        actions.push({
          type: "set_field",
          contactId: opts.contact.id,
          fieldId,
          value,
        });
      }
    }

    const visited = new Set<string>();
    const queue = opts.startNodeIds
      ? [...opts.startNodeIds]
      : trigger
        ? (() => {
            const unlabeled = unlabeledNext(trigger.id, auto.edges);
            if (unlabeled.length) return unlabeled;
            const any = allNext(trigger.id, auto.edges);
            if (any.length) return any.slice(0, 1);
            const first = auto.nodes.find((n) => n.type !== "trigger");
            return first ? [first.id] : [];
          })()
        : [];
    let applied = 0;

    while (queue.length) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const node = auto.nodes.find((n) => n.id === id);
      if (!node) continue;

      if (node.type === "message" || node.type === "template") {
        const stack = parseMsgStack(node.config);
        const items =
          stack.length > 0
            ? stack
            : [
                {
                  id: node.id,
                  kind: (node.config.sessionBlock || "text") as "text",
                  text: node.config.text ?? node.config.body,
                  header: node.config.header,
                  footer: node.config.footer,
                  buttons: parseReplyButtons(node.config),
                  listButton: node.config.listButton || node.config.button,
                  listSections: undefined as
                    | { title: string; rows: { id: string; title: string }[] }[]
                    | undefined,
                  contextFieldId: node.config.contextFieldId,
                },
              ];
        const fromIdx =
          opts.startStackIndex && opts.startNodeIds?.[0] === node.id
            ? opts.startStackIndex
            : 0;
        let stoppedForWait = false;
        let nodeSent = 0;
        const sentKeys = new Set<string>();
        for (let i = fromIdx; i < items.length; i++) {
          const item = items[i]!;
          try {
            const raw = String(
              item.text ?? node.config.text ?? node.config.body ?? "",
            ).trim();
            const text = interpolate(raw, opts.contact, opts.fields);
            const header = interpolate(String(item.header ?? ""), opts.contact, opts.fields).trim();
            const footer = interpolate(String(item.footer ?? ""), opts.contact, opts.fields).trim();
            const btnSrc = (
              Array.isArray(item.buttons) && item.buttons.length
                ? item.buttons
                : parseReplyButtons(node.config)
            );
            const replyBtns = btnSrc
              .filter(
                (b) =>
                  (b.type ?? "reply") === "reply" &&
                  String(b.label ?? "").trim(),
              )
              .slice(0, 3)
              .map((b) => ({
                id: String(b.id || b.label).slice(0, 256),
                label: interpolate(String(b.label), opts.contact, opts.fields)
                  .trim()
                  .slice(0, 20),
              }));
            const secSrc = Array.isArray(item.listSections)
              ? item.listSections
              : [];
            const listSecs = secSrc
              .map((s) => ({
                title: String(s.title || "Opções").slice(0, 24),
                rows: (Array.isArray(s.rows) ? s.rows : [])
                  .filter((r) => String(r.title ?? "").trim())
                  .slice(0, 10)
                  .map((r) => ({
                    id: String(r.id || r.title).slice(0, 200),
                    title: String(r.title).trim().slice(0, 24),
                  })),
              }))
              .filter((s) => s.rows.length);
            const linkBtns = btnSrc
              .filter(
                (b) =>
                  b.type === "link" &&
                  String(b.label ?? "").trim() &&
                  String(b.url ?? "").trim(),
              )
              .slice(0, 2)
              .map((b) => {
                let url = interpolate(String(b.url), opts.contact, opts.fields).trim();
                if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
                return {
                  label: interpolate(String(b.label), opts.contact, opts.fields)
                    .trim()
                    .slice(0, 20),
                  url,
                };
              })
              .filter((b) => /^https?:\/\//i.test(b.url));
            const hasList = item.kind === "list" && listSecs.length > 0;
            const sendKey = `${text}|${header}|${replyBtns.map((b) => b.label).join(",")}|${linkBtns.map((b) => b.url).join(",")}`;
            if (sentKeys.has(sendKey)) continue;
            if (text || header || replyBtns.length || hasList || linkBtns.length) {
              sentKeys.add(sendKey);
              actions.push({
                type: "bot_message",
                conversationId: opts.conversation.id,
                text: text || header || " ",
                autoName: auto.name,
                header: header || undefined,
                footer: footer || undefined,
                buttons: hasList
                  ? undefined
                  : replyBtns.length
                    ? replyBtns
                    : undefined,
                ctaUrls: linkBtns.length ? linkBtns : undefined,
                listButton: hasList
                  ? String(item.listButton || "Opções").slice(0, 20)
                  : undefined,
                listSections: hasList ? listSecs : undefined,
              });
              applied++;
              nodeSent++;
            }
          } catch {
            /* item inválido não derruba o fluxo */
          }
          if (itemIsContext(item) || (item.kind === "context")) {
            actions.push({
              type: "wait_button",
              conversationId: opts.conversation.id,
              automationId: auto.id,
              nodeId: node.id,
              stackIndex: i,
            });
            stoppedForWait = true;
            break;
          }
          const itemReplies = (item.buttons ?? []).filter(
            (b) => (b.type ?? "reply") === "reply" && b.label?.trim(),
          );
          if (itemReplies.length || (item.kind === "list" && (item.listSections ?? []).length)) {
            const labeled = auto.edges.filter(
              (e) => e.from === node.id && Boolean(e.label),
            );
            if (labeled.length) {
              actions.push({
                type: "wait_button",
                conversationId: opts.conversation.id,
                automationId: auto.id,
                nodeId: node.id,
                stackIndex: i,
                usedLabels: [],
              });
            }
          }
        }
        if (nodeSent === 0 && !stoppedForWait) {
          const raw = (node.config.text ?? node.config.body ?? "").trim();
          const text = interpolate(raw, opts.contact, opts.fields);
          if (text) {
            actions.push({
              type: "bot_message",
              conversationId: opts.conversation.id,
              text,
              autoName: auto.name,
            });
            applied++;
          }
        }
        if (!stoppedForWait) {
          const labeled = auto.edges.filter(
            (e) => e.from === node.id && Boolean(e.label),
          );
          const nodeIsContext =
            node.config.sessionBlock === "context" ||
            Boolean(node.config.contextFieldId);
          if (nodeIsContext) {
            actions.push({
              type: "wait_button",
              conversationId: opts.conversation.id,
              automationId: auto.id,
              nodeId: node.id,
              stackIndex: Math.max(items.length - 1, 0),
            });
          } else {
            queue.push(...unlabeledNext(node.id, auto.edges));
            if (labeled.length) {
              actions.push({
                type: "wait_button",
                conversationId: opts.conversation.id,
                automationId: auto.id,
                nodeId: node.id,
                usedLabels: [],
              });
            }
          }
        }
      } else if (node.type === "tag") {
        const tagId = node.config.tagId;
        if (tagId) {
          if (node.config.action === "remove") {
            actions.push({
              type: "remove_tag",
              contactId: opts.contact.id,
              tagId,
            });
          } else {
            actions.push({
              type: "add_tag",
              contactId: opts.contact.id,
              tagId,
            });
          }
          applied++;
        }
        queue.push(...nextNodes(node.id, auto.edges));
      } else if (node.type === "delay") {
        // no runtime persistido: segue imediatamente (atraso só documenta o fluxo)
        queue.push(...nextNodes(node.id, auto.edges));
      } else if (node.type === "condition") {
        const ok = conditionPass(node, {
          contact: opts.contact,
          conversation: opts.conversation,
          deals: opts.deals,
          lastInboundAt: opts.lastInboundAt,
          lastOutboundAt: opts.lastOutboundAt,
        });
        const yes = nextNodes(node.id, auto.edges, "sim")
          .concat(nextNodes(node.id, auto.edges, "atende"));
        const no = nextNodes(node.id, auto.edges, "nao")
          .concat(nextNodes(node.id, auto.edges, "não"))
          .concat(nextNodes(node.id, auto.edges, "não atende"))
          .concat(nextNodes(node.id, auto.edges, "nao atende"));
        actions.push({
          type: "event",
          conversationId: opts.conversation.id,
          text: ok ? "Condicional · Atende" : "Condicional · Não atende",
        });
        if (ok && yes.length) queue.push(...yes);
        else if (!ok && no.length) queue.push(...no);
        else if (ok) queue.push(...nextNodes(node.id, auto.edges));
      } else if (node.type === "fields") {
        if (node.config.fieldId && node.config.value) {
          actions.push({
            type: "set_field",
            contactId: opts.contact.id,
            fieldId: node.config.fieldId,
            value: node.config.value,
          });
          applied++;
        }
        queue.push(...nextNodes(node.id, auto.edges));
      } else if (node.type === "http") {
        const method = (node.config.method || "GET").toUpperCase();
        const url = interpolate(node.config.url || "", opts.contact, opts.fields).trim();
        let headers: { key: string; value: string }[] = [];
        try {
          const raw = JSON.parse(node.config.headers || "[]") as unknown;
          if (Array.isArray(raw)) {
            headers = raw
              .map((h) => ({
                key: String((h as { key?: string }).key ?? "").trim(),
                value: interpolate(
                  String((h as { value?: string }).value ?? ""),
                  opts.contact,
                  opts.fields,
                ),
              }))
              .filter((h) => h.key);
          }
        } catch {
          /* ignore */
        }
        let fieldMap: Record<string, string> = {};
        try {
          fieldMap = JSON.parse(node.config.fieldMap || "{}") as Record<string, string>;
        } catch {
          fieldMap = {};
        }
        const useBody =
          node.config.customBody === "1" &&
          method !== "GET" &&
          method !== "DELETE";
        const body = useBody
          ? interpolate(node.config.body || "", opts.contact, opts.fields)
          : method === "POST" || method === "PUT"
            ? JSON.stringify({
                name: opts.contact.name,
                phone: opts.contact.phone,
                email: opts.contact.email ?? "",
                fields: opts.contact.customFields,
              })
            : undefined;
        if (url) {
          actions.push({
            type: "http",
            conversationId: opts.conversation.id,
            contactId: opts.contact.id,
            method,
            url,
            headers,
            body,
            fieldMap,
          });
          applied++;
        } else {
          actions.push({
            type: "event",
            conversationId: opts.conversation.id,
            text: "HTTP · URL não configurada",
          });
        }
        queue.push(...nextNodes(node.id, auto.edges));
      } else if (node.type === "optout") {
        actions.push({ type: "optout", contactId: opts.contact.id });
        applied++;
        queue.push(...nextNodes(node.id, auto.edges));
      } else if (node.type === "random") {
        const vars = parseRandomVariations(node.config);
        const labeled = vars
          .map((v) => {
            const to = auto.edges.find(
              (e) =>
                e.from === node.id &&
                (e.label || "").trim().toLowerCase() === v.label.toLowerCase(),
            )?.to;
            return to ? { key: v.label, to } : null;
          })
          .filter((x): x is { key: string; to: string } => Boolean(x));
        const unlabeled = auto.edges
          .filter((e) => e.from === node.id && !e.label)
          .map((e) => ({ key: e.to, to: e.to }));
        const pool = labeled.length ? labeled : unlabeled;
        if (pool.length) {
          const always = node.config.randomAlways === "1";
          const stickyKey = `_rand_${node.id}`;
          const prev = (opts.contact.customFields?.[stickyKey] ?? "").trim();
          let pick = !always
            ? pool.find((p) => p.key.toLowerCase() === prev.toLowerCase())
            : undefined;
          if (!pick) pick = pool[Math.floor(Math.random() * pool.length)]!;
          if (!always && pick.key !== prev) {
            actions.push({
              type: "set_field",
              contactId: opts.contact.id,
              fieldId: stickyKey,
              value: pick.key,
            });
          }
          actions.push({
            type: "event",
            conversationId: opts.conversation.id,
            text: `Randomizador · ${pick.key}`,
          });
          queue.push(pick.to);
        }
      } else if (node.type === "forward") {
        const target = opts.automations.find(
          (a) => a.id === node.config.automationId,
        );
        if (target && target.id !== auto.id) {
          const tr = target.nodes.find((n) => n.type === "trigger");
          const start = tr ? nextNodes(tr.id, target.edges) : [];
          // percorre o fluxo alvo usando os nós dele
          for (const nid of start) {
            const extra = planAutomationRuns({
              ...opts,
              forceAutomationId: target.id,
            });
            actions.push(...extra.filter((a) => a.type !== "mark_run"));
            applied++;
          }
        }
        queue.push(...nextNodes(node.id, auto.edges));
      } else if (node.type === "system") {
        actions.push({
          type: "system",
          conversationId: opts.conversation.id,
          action: node.config.action || "pause_ia",
        });
        applied++;
        queue.push(...nextNodes(node.id, auto.edges));
      } else if (node.type === "conversion" || node.type === "call" || node.type === "sheets") {
        actions.push({
          type: "event",
          conversationId: opts.conversation.id,
          text:
            node.type === "conversion"
              ? "API de conversão registrada"
              : node.type === "call"
                ? `SMS/Áudio: ${node.config.text || "acionado"}`
                : `Google Sheets: ${node.config.sheet || "linha adicionada"}`,
        });
        applied++;
        queue.push(...nextNodes(node.id, auto.edges));
      } else if (node.type === "assign") {
        if (node.config.agentId) {
          actions.push({
            type: "assign",
            conversationId: opts.conversation.id,
            agentId: node.config.agentId,
          });
          applied++;
        }
        queue.push(...nextNodes(node.id, auto.edges));
      } else if (node.type === "crm") {
        if (node.config.stageId) {
          actions.push({
            type: "crm",
            contactId: opts.contact.id,
            stageId: node.config.stageId,
            title: `Automação · ${auto.name}`,
          });
          applied++;
        }
        queue.push(...nextNodes(node.id, auto.edges));
      } else if (node.type === "finalize") {
        actions.push({
          type: "queue",
          conversationId: opts.conversation.id,
          queue: "finalizados",
        });
        applied++;
      } else {
        queue.push(...nextNodes(node.id, auto.edges));
      }
    }

    if (applied > 0 || opts.forceAutomationId) {
      actions.push({
        type: "event",
        conversationId: opts.conversation.id,
        text: `Automação “${auto.name}” executada`,
      });
      actions.push({ type: "mark_run", automationId: auto.id });
    }
  }

  return actions;
}

export function inboundMessageCount(
  messages: Message[],
  conversationId: string,
): number {
  return messages.filter(
    (m) => m.conversationId === conversationId && m.from === "contact",
  ).length;
}
