import { serializeMsgStack, type ReplyBtn } from "./message-blocks";
import type { FlowEdge, FlowNode, FlowNodeType } from "./types";

export type ImportedAutomation = {
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
};

const NODE_TYPES = new Set<FlowNodeType>([
  "trigger",
  "message",
  "template",
  "tag",
  "fields",
  "delay",
  "condition",
  "assign",
  "crm",
  "http",
  "finalize",
  "forward",
  "optout",
  "random",
  "system",
  "conversion",
  "call",
  "sheets",
]);

function asRec(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function str(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function mapType(raw: string): FlowNodeType {
  const t = raw.toLowerCase().replace(/[\s_-]+/g, "");
  if (NODE_TYPES.has(raw as FlowNodeType)) return raw as FlowNodeType;
  if (/(trigger|gatilho|start|inicio|inbound|keyword|palavra|init)/.test(t))
    return "trigger";
  if (/(template|hsm|modelo)/.test(t)) return "template";
  if (/(message|mensagem|sendmessage|send|whatsapp|text|msg)/.test(t))
    return "message";
  if (/(tag|etiqueta|label)/.test(t)) return "tag";
  if (/(field|campo|customfield)/.test(t)) return "fields";
  if (/(delay|atraso|wait|timeout|timer)/.test(t)) return "delay";
  if (/(condition|condicional|if|branch)/.test(t)) return "condition";
  if (/(assign|atribuir|agent|atendente)/.test(t)) return "assign";
  if (/(crm|deal|pipeline|kanban)/.test(t)) return "crm";
  if (/(http|webhook|request|api)/.test(t)) return "http";
  if (/(final|end|stop|encerrar)/.test(t)) return "finalize";
  if (/(forward|goto|jump|encaminhar|foward)/.test(t)) return "forward";
  if (/(optout|opt_out|sair)/.test(t)) return "optout";
  if (/(random|randomizer|sorteio)/.test(t)) return "random";
  if (/(system|sistema|pause)/.test(t)) return "system";
  if (/(conversion|pixel|ads)/.test(t)) return "conversion";
  if (/(call|sms|audio|ligacao)/.test(t)) return "call";
  if (/(sheet|planilha|spreadsheet)/.test(t)) return "sheets";
  return "message";
}

function pickName(rec: Record<string, unknown>): string {
  return (
    str(rec.name) ||
    str(rec.title) ||
    str(rec.label) ||
    str(asRec(rec.automation)?.name) ||
    str(asRec(rec.flow)?.name) ||
    "Automação importada"
  );
}

function parsePos(raw: unknown): { x: number; y: number } {
  if (typeof raw === "string") {
    try {
      const o = JSON.parse(raw) as { x?: number; y?: number };
      return { x: num(o.x), y: num(o.y) };
    } catch {
      return { x: 0, y: 0 };
    }
  }
  const o = asRec(raw);
  return { x: num(o?.x), y: num(o?.y) };
}

function unniTag(node: Record<string, unknown>): string {
  const t = asRec(node.type);
  return str(t?.tag || t?.id || node.type).toLowerCase();
}

function delayHours(delay: Record<string, unknown> | null): string {
  if (!delay) return "1";
  const time = num(delay.time, 1);
  const unit = str(delay.type).toLowerCase();
  if (unit.startsWith("min")) return String(Math.max(1, Math.round(time / 60)) || 1);
  if (unit.startsWith("week") || unit.startsWith("semana")) return String(time * 24 * 7);
  if (unit.startsWith("day") || unit.startsWith("dia")) return String(time * 24);
  return String(time || 1);
}

function parseUnnichat(raw: unknown): ImportedAutomation | null {
  const rec = asRec(raw);
  if (!rec) return null;
  const root = asRec(rec.node);
  if (!root || !Array.isArray(root.nodes)) return null;

  const children = root.nodes.map(asRec).filter((n): n is Record<string, unknown> => Boolean(n));
  const all = [root, ...children];
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  let ei = 0;
  const link = (from: string, to: string, label?: string) => {
    if (!from || !to || from === to) return;
    edges.push({
      id: `e_${++ei}`,
      from,
      to,
      label: label?.trim() || undefined,
    });
  };

  for (const src of all) {
    const id = str(src.id);
    if (!id) continue;
    const tag = unniTag(src) || (src === root ? "init" : "message");
    const pos = parsePos(src.pos);
    let type: FlowNodeType = "message";
    let label = "Bloco";
    const cfg: Record<string, string> = {};

    if (tag === "init" || src === root) {
      type = "trigger";
      const triggers = Array.isArray(src.triggers) ? src.triggers : [];
      const tr = asRec(triggers[0]) ?? {};
      const interaction = str(tr.interaction || tr.type).toLowerCase();
      label = "Gatilho";
      if (interaction.includes("tag")) {
        cfg.kind = interaction.includes("remov") ? "tag_removed" : "tag";
        cfg.tagId = str(tr.tag || tr.tagName);
        label = cfg.kind === "tag" ? "Adicionar tag" : "Remover tag";
      } else if (interaction.includes("keyword") || str(tr.keyword)) {
        cfg.kind = "keyword";
        cfg.keyword = str(tr.keyword || tr.value);
        cfg.matchMode = "words";
        label = "Palavra-chave";
      } else if (interaction.includes("ctwa")) {
        cfg.kind = "ctwa";
        label = "Clique para WhatsApp (CTWA)";
      } else {
        cfg.kind = "any_inbound";
        cfg.matchMode = "any";
        label = "Cliente interagir";
      }
    } else if (tag === "message") {
      const msg = asRec(src.message) ?? {};
      const msgType = str(msg.type || msg.messageType).toLowerCase();
      if (msgType.includes("template") || asRec(msg.template)) {
        type = "template";
        label = str(asRec(msg.template)?.name) || "Template";
        cfg.templateId = str(msg.templateId || asRec(msg.template)?.id);
        const comps = Array.isArray(asRec(msg.template)?.components)
          ? (asRec(msg.template)!.components as unknown[])
          : [];
        cfg.text =
          comps.map((c) => str(asRec(c)?.text)).filter(Boolean).join("\n") ||
          str(msg.message);
        const tBtns = Array.isArray(msg.templateButtons) ? msg.templateButtons : [];
        const replies: ReplyBtn[] = tBtns.map((b, i) => {
          const o = asRec(b) ?? {};
          return {
            id: str(o.id) || `tb${i}`,
            type: "reply",
            label: str(o.text || o.title),
          };
        });
        if (replies.length) {
          Object.assign(
            cfg,
            serializeMsgStack([{ id: "m1", kind: "text", text: cfg.text, buttons: replies }]),
          );
        }
        for (const b of tBtns) {
          const o = asRec(b) ?? {};
          if (str(o.sonId)) link(id, str(o.sonId), str(o.text || o.title));
        }
      } else {
        type = "message";
        label = "Envio de mensagem";
        const body = str(msg.buttonsBodyText || msg.message || msg.text);
        cfg.text = body;
        const rawBtns = Array.isArray(msg.buttons) ? msg.buttons : [];
        const replies: ReplyBtn[] = rawBtns.map((b, i) => {
          const o = asRec(b) ?? {};
          const reply = asRec(o.reply) ?? {};
          const url = str(o.url);
          const btn: ReplyBtn = {
            id: str(reply.id || o.id) || `b${i}`,
            type: url ? "link" : "reply",
            label: str(reply.title || o.title || o.text),
          };
          if (url) btn.url = url;
          return btn;
        });
        Object.assign(
          cfg,
          serializeMsgStack([{ id: "m1", kind: "text", text: body, buttons: replies }]),
        );
        for (const b of rawBtns) {
          const o = asRec(b) ?? {};
          const reply = asRec(o.reply) ?? {};
          const title = str(reply.title || o.title || o.text);
          if (str(o.sonId)) link(id, str(o.sonId), title);
        }
      }
    } else if (tag === "context") {
      type = "message";
      label = "Pergunta / contexto";
      const ctx = asRec(src.context) ?? {};
      cfg.sessionBlock = "context";
      cfg.msgKind = "session";
      cfg.text = str(ctx.message);
      cfg.contextFieldId = str(ctx.fieldName);
      cfg.hours = str(ctx.timeLimit || "10");
      Object.assign(
        cfg,
        serializeMsgStack([
          {
            id: "m1",
            kind: "context",
            text: cfg.text,
            contextFieldId: cfg.contextFieldId,
          },
        ]),
      );
      if (str(ctx.unansweredId)) link(id, str(ctx.unansweredId), "Sem resposta");
    } else if (tag === "delay") {
      type = "delay";
      const d = asRec(src.delay) ?? {};
      label = "Atraso inteligente";
      cfg.hours = delayHours(d);
      cfg.time = str(d.time);
      cfg.timeUnit = str(d.type);
    } else if (tag === "action") {
      const act = asRec(src.action) ?? {};
      const at = str(act.type).toLowerCase();
      const tags = Array.isArray(act.tags) ? act.tags.map(str).filter(Boolean) : [];
      if (at.includes("assign")) {
        type = "assign";
        label = "Atribuir";
        cfg.action = "assign_attendant";
      } else if (at.includes("remove")) {
        type = "tag";
        label = "Remover tag";
        cfg.action = "remove";
        cfg.tagId = tags[0] || "";
        cfg.tags = tags.join(",");
      } else {
        type = "tag";
        label = "Adicionar tag";
        cfg.action = "add";
        cfg.tagId = tags[0] || "";
        cfg.tags = tags.join(",");
      }
    } else if (tag === "crmaction") {
      type = "crm";
      label = "Ações de CRM";
      const crm = asRec(src.crmAction) ?? {};
      cfg.action = str(crm.type);
    } else if (tag === "fowardautomation" || tag === "forwardautomation") {
      type = "forward";
      label = "Encaminhar automação";
      const fw = asRec(src.fowardAutomation) ?? asRec(src.forwardAutomation) ?? {};
      cfg.automationId = str(fw.automationId);
      cfg.automationName = str(fw.automationName);
    } else if (tag === "callsms") {
      type = "call";
      label = "SMS e Áudio";
      const cs = asRec(src.callSms) ?? {};
      cfg.text = str(cs.smsMessage || cs.message);
      cfg.method = str(cs.type);
    } else if (tag === "conditionalv2" || tag === "conditional") {
      type = "condition";
      label = "Condicional";
      const cond = asRec(src.conditionalV2) ?? asRec(src.conditional) ?? {};
      const groups = Array.isArray(cond.groupConditions) ? cond.groupConditions : [];
      const first = asRec(groups[0]);
      const conds = Array.isArray(first?.conditions) ? first!.conditions : [];
      const c0 = asRec(conds[0]) ?? {};
      const tags = Array.isArray(c0.tags) ? c0.tags.map(str) : [];
      cfg.field = "tag";
      cfg.tagId = tags[0] || "";
      cfg.value = tags.join(",");
      for (const g of groups) {
        const go = asRec(g) ?? {};
        if (str(go.sonId)) link(id, str(go.sonId), str(go.name) || "Sim");
      }
      if (str(cond.falseId)) link(id, str(cond.falseId), "Não");
    } else if (tag === "conversionapi") {
      type = "conversion";
      label = "API de Conversão";
      const cv = asRec(src.conversionApi) ?? {};
      cfg.event = str(cv.eventType || "Lead");
    } else {
      type = mapType(tag);
      label = tag;
    }

    nodes.push({ id, type, label, x: pos.x, y: pos.y, config: cfg });
    if (str(src.sonId)) link(id, str(src.sonId));
  }

  const ids = new Set(nodes.map((n) => n.id));
  const cleanEdges = edges.filter((e) => ids.has(e.from) && ids.has(e.to));
  if (!nodes.length) return null;

  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  for (const n of nodes) {
    n.x = Math.round(n.x - minX + 80);
    n.y = Math.round(n.y - minY + 80);
  }

  return { name: pickName(rec), nodes, edges: cleanEdges };
}

function looksLikeNode(v: unknown): boolean {
  const o = asRec(v);
  if (!o) return false;
  return Boolean(
    (o.id || o._id) && (o.type || o.kind || o.data || o.position || "x" in o),
  );
}

function looksLikeEdge(v: unknown): boolean {
  const o = asRec(v);
  if (!o) return false;
  return Boolean((o.from || o.source) && (o.to || o.target));
}

function collectArrays(root: unknown, depth = 0): { nodes: unknown[]; edges: unknown[] } {
  const nodes: unknown[] = [];
  const edges: unknown[] = [];
  if (depth > 6 || root == null) return { nodes, edges };
  if (Array.isArray(root)) {
    for (const item of root) {
      if (looksLikeEdge(item)) edges.push(item);
      else if (looksLikeNode(item)) nodes.push(item);
      else {
        const inner = collectArrays(item, depth + 1);
        nodes.push(...inner.nodes);
        edges.push(...inner.edges);
      }
    }
    return { nodes, edges };
  }
  const rec = asRec(root);
  if (!rec) return { nodes, edges };
  for (const key of ["nodes", "edges", "blocks", "steps", "flow", "diagram", "automation", "data"]) {
    if (key in rec) {
      const inner = collectArrays(rec[key], depth + 1);
      nodes.push(...inner.nodes);
      edges.push(...inner.edges);
    }
  }
  return { nodes, edges };
}

function convertGenericNode(raw: unknown, index: number): FlowNode | null {
  const o = asRec(raw);
  if (!o) return null;
  const data = { ...o, ...(asRec(o.data) ?? {}), ...(asRec(o.config) ?? {}) };
  const type = mapType(str(data.type || data.kind || o.type || "message"));
  const pos = asRec(o.position) ?? asRec(data.position) ?? {};
  return {
    id: str(o.id || o._id || data.id) || `n_${index + 1}`,
    type,
    label: str(data.label || data.title || data.name || o.label) || (type === "trigger" ? "Gatilho" : "Bloco"),
    x: num(o.x ?? pos.x, 80 + (index % 4) * 280),
    y: num(o.y ?? pos.y, 120 + Math.floor(index / 4) * 180),
    config:
      asRec(o.config) && Object.keys(asRec(o.config) as object).every((k) => typeof (asRec(o.config) as Record<string, unknown>)[k] === "string")
        ? (o.config as Record<string, string>)
        : { text: str(data.text || data.message || data.body), kind: str(data.kind) },
  };
}

function convertGenericEdge(raw: unknown, index: number): FlowEdge | null {
  const o = asRec(raw);
  if (!o) return null;
  const from = str(o.from ?? o.source);
  const to = str(o.to ?? o.target);
  if (!from || !to) return null;
  const handle = str(o.label ?? o.sourceHandle);
  return {
    id: str(o.id) || `e_${index + 1}`,
    from,
    to,
    label: handle && !/^(out|next|source)$/i.test(handle) ? handle : undefined,
  };
}

export function parseAutomationJson(raw: unknown): ImportedAutomation[] {
  const unni = parseUnnichat(raw);
  if (unni) return [unni];

  const roots = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray(asRec(raw)?.automations)
      ? (asRec(raw)!.automations as unknown[])
      : [raw];

  const out: ImportedAutomation[] = [];
  for (const item of roots) {
    if (item == null) continue;
    const rec = asRec(item) ?? { value: item };
    const found = collectArrays(item);
    const nodes = found.nodes
      .map(convertGenericNode)
      .filter((n): n is FlowNode => Boolean(n));
    const ids = new Set(nodes.map((n) => n.id));
    const edges = found.edges
      .map(convertGenericEdge)
      .filter((e): e is FlowEdge => Boolean(e && ids.has(e.from) && ids.has(e.to)));
    if (!nodes.length) continue;
    out.push({ name: pickName(rec), nodes, edges });
  }
  return out;
}

export function jsonKeysPreview(raw: unknown): string {
  const rec = asRec(raw);
  if (!rec) return Array.isArray(raw) ? "array" : typeof raw;
  return Object.keys(rec).slice(0, 12).join(", ");
}
