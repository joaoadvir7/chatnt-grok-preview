/**
 * Buffer de eventos do webhook WhatsApp (Cloud API).
 * Persistido em arquivo para o POST da Meta e o poll do CRM
 * lerem a mesma fila (dev / preview / processo único).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type InboundParsed = {
  id: string;
  receivedAt: string;
  phoneNumberId?: string;
  wabaId?: string;
  type: "message_in" | "status" | "verify" | "error";
  from?: string;
  contactName?: string;
  text?: string;
  wamid?: string;
  status?: string;
  referral?: string;
  ctwaClid?: string;
  ctwaId?: string;
  summary: string;
  payload: string;
  ok: boolean;
  consumed: boolean;
};

const MAX = 200;
const FILE =
  process.env.CHATNT_WEBHOOK_FILE || "/tmp/chatnt-wa-events.json";

function loadFile(): InboundParsed[] {
  try {
    if (!existsSync(FILE)) return [];
    const raw = JSON.parse(readFileSync(FILE, "utf8"));
    return Array.isArray(raw) ? (raw as InboundParsed[]) : [];
  } catch {
    return [];
  }
}

function saveFile(rows: InboundParsed[]) {
  try {
    mkdirSync(dirname(FILE), { recursive: true });
    writeFileSync(FILE, JSON.stringify(rows.slice(0, MAX)));
  } catch {
    /* ambiente sem fs gravável */
  }
}

const buffer: InboundParsed[] = loadFile();

/** Tokens de verificação aceitos (demo + conexões). */
const DEFAULT_VERIFY_TOKENS = new Set([
  "chatnt_verify_token",
  "chatnt_nt_para_verify",
  "chatnt_anpa_verify",
  "chatnt_apl_verify",
  "chatnt_amc_verify",
  "chatnt_misal_verify",
]);

export function registerVerifyToken(token: string) {
  if (token.trim()) DEFAULT_VERIFY_TOKENS.add(token.trim());
}

export function isValidVerifyToken(token: string | null): boolean {
  if (!token) return false;
  return DEFAULT_VERIFY_TOKENS.has(token);
}

export function pushEvent(
  ev: Omit<InboundParsed, "id" | "receivedAt" | "consumed"> & {
    id?: string;
    receivedAt?: string;
  },
): InboundParsed {
  if (ev.type === "message_in" && ev.wamid) {
    const disk = loadFile();
    if (disk.length) {
      buffer.length = 0;
      buffer.push(...disk);
    }
    const dup = buffer.find(
      (r) => r.type === "message_in" && r.wamid === ev.wamid,
    );
    if (dup) return dup;
  }
  const row: InboundParsed = {
    id: ev.id ?? `whs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    receivedAt: ev.receivedAt ?? new Date().toISOString(),
    phoneNumberId: ev.phoneNumberId,
    wabaId: ev.wabaId,
    type: ev.type,
    from: ev.from,
    contactName: ev.contactName,
    text: ev.text,
    wamid: ev.wamid,
    status: ev.status,
    referral: ev.referral,
    ctwaClid: ev.ctwaClid,
    ctwaId: ev.ctwaId,
    summary: ev.summary,
    payload: ev.payload,
    ok: ev.ok,
    consumed: false,
  };
  buffer.unshift(row);
  if (buffer.length > MAX) buffer.length = MAX;
  saveFile(buffer);
  return row;
}

export function listEvents(opts?: {
  since?: string;
  onlyUnconsumed?: boolean;
  limit?: number;
}): InboundParsed[] {
  // Relê o arquivo: POST da Meta e poll do CRM podem ser instâncias distintas
  const disk = loadFile();
  if (disk.length) {
    buffer.length = 0;
    buffer.push(...disk);
  }
  let rows = buffer;
  if (opts?.onlyUnconsumed) rows = rows.filter((r) => !r.consumed);
  if (opts?.since) {
    const t = new Date(opts.since).getTime();
    rows = rows.filter((r) => new Date(r.receivedAt).getTime() > t);
  }
  const limit = opts?.limit ?? 50;
  return rows.slice(0, limit);
}

/** Lista e marca como consumido de uma vez — evita o CRM processar o mesmo evento 2x. */
export function claimUnconsumedEvents(limit = 50): InboundParsed[] {
  const disk = loadFile();
  if (disk.length) {
    buffer.length = 0;
    buffer.push(...disk);
  }
  const claimed: InboundParsed[] = [];
  for (const r of buffer) {
    if (r.consumed) continue;
    r.consumed = true;
    claimed.push({ ...r });
    if (claimed.length >= limit) break;
  }
  saveFile(buffer);
  return claimed;
}

export function markConsumed(ids: string[]) {
  const set = new Set(ids);
  const disk = loadFile();
  if (disk.length) {
    buffer.length = 0;
    buffer.push(...disk);
  }
  for (const r of buffer) {
    if (set.has(r.id)) r.consumed = true;
  }
  saveFile(buffer);
}

export function clearEvents() {
  buffer.length = 0;
  saveFile(buffer);
}

function extractText(msg: {
  type?: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: {
    button_reply?: { title?: string };
    list_reply?: { title?: string };
  };
  image?: { caption?: string };
  video?: { caption?: string };
  document?: { caption?: string; filename?: string };
  audio?: { voice?: boolean };
  reaction?: { emoji?: string };
  referral?: {
    source_id?: string;
    source_url?: string;
    source_type?: string;
    headline?: string;
    body?: string;
    ctwa_clid?: string;
  };
}): string {
  if (msg.type === "text") return msg.text?.body ?? "";
  if (msg.type === "button") return msg.button?.text ?? "[botão]";
  if (msg.type === "interactive") {
    return (
      msg.interactive?.button_reply?.title ||
      msg.interactive?.list_reply?.title ||
      "[interativo]"
    );
  }
  if (msg.type === "image") return msg.image?.caption || "[imagem]";
  if (msg.type === "video") return msg.video?.caption || "[vídeo]";
  if (msg.type === "document")
    return msg.document?.caption || msg.document?.filename || "[documento]";
  if (msg.type === "audio") return msg.audio?.voice ? "[áudio]" : "[áudio]";
  if (msg.type === "sticker") return "[figurinha]";
  if (msg.type === "location") return "[localização]";
  if (msg.type === "contacts") return "[contato]";
  if (msg.type === "reaction") return msg.reaction?.emoji || "[reação]";
  return msg.type ? `[${msg.type}]` : "";
}

/** Parse do payload oficial Meta WhatsApp Cloud API */
export function parseMetaWebhook(body: unknown): InboundParsed[] {
  const out: InboundParsed[] = [];
  if (!body || typeof body !== "object") {
    out.push(
      pushEvent({
        type: "error",
        summary: "Payload inválido",
        payload: String(body),
        ok: false,
      }),
    );
    return out;
  }

  const root = body as {
    object?: string;
    entry?: Array<{
      id?: string;
      changes?: Array<{
        field?: string;
        value?: {
          messaging_product?: string;
          metadata?: {
            display_phone_number?: string;
            phone_number_id?: string;
          };
          contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
          messages?: Array<{
            from?: string;
            id?: string;
            timestamp?: string;
            type?: string;
            text?: { body?: string };
            button?: { text?: string };
            interactive?: {
              button_reply?: { title?: string };
              list_reply?: { title?: string };
            };
            image?: { caption?: string };
            video?: { caption?: string };
            document?: { caption?: string; filename?: string };
            audio?: { voice?: boolean };
            reaction?: { emoji?: string };
            referral?: {
              source_id?: string;
              source_url?: string;
              source_type?: string;
              headline?: string;
              body?: string;
              ctwa_clid?: string;
            };
          }>;
          statuses?: Array<{
            id?: string;
            status?: string;
            timestamp?: string;
            recipient_id?: string;
          }>;
        };
      }>;
    }>;
  };

  if (root.object && root.object !== "whatsapp_business_account") {
    out.push(
      pushEvent({
        type: "error",
        summary: `object inesperado: ${root.object}`,
        payload: JSON.stringify(body).slice(0, 800),
        ok: false,
      }),
    );
    return out;
  }

  const entries = root.entry ?? [];
  if (entries.length === 0) {
    out.push(
      pushEvent({
        type: "message_in",
        summary: "Webhook vazio (sem entry)",
        payload: JSON.stringify(body).slice(0, 400),
        ok: true,
      }),
    );
    return out;
  }

  for (const entry of entries) {
    const wabaId = entry.id;
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const phoneNumberId = value.metadata?.phone_number_id;
      const contacts = value.contacts ?? [];

      for (const msg of value.messages ?? []) {
        const name =
          contacts.find((c) => c.wa_id === msg.from)?.profile?.name ||
          contacts[0]?.profile?.name;
        const text = extractText(msg);
        const referral = msg.referral;

        out.push(
          pushEvent({
            type: "message_in",
            phoneNumberId,
            wabaId,
            from: msg.from,
            contactName: name,
            text,
            wamid: msg.id,
            referral: referral?.source_url || referral?.source_id,
            ctwaClid: referral?.ctwa_clid,
            ctwaId: referral?.source_id,
            summary: `Entrada de ${name || msg.from || "desconhecido"}: ${text.slice(0, 80)}`,
            payload: JSON.stringify({ message: msg, metadata: value.metadata }).slice(
              0,
              1200,
            ),
            ok: true,
          }),
        );
      }

      for (const st of value.statuses ?? []) {
        out.push(
          pushEvent({
            type: "status",
            phoneNumberId,
            wabaId,
            from: st.recipient_id,
            wamid: st.id,
            status: st.status,
            summary: `Status ${st.status || "?"} · ${st.id || "sem id"}`,
            payload: JSON.stringify(st).slice(0, 800),
            ok: true,
          }),
        );
      }

      if (!(value.messages?.length || value.statuses?.length)) {
        out.push(
          pushEvent({
            type: "message_in",
            phoneNumberId,
            wabaId,
            summary: `Change field=${change.field || "?"} (sem messages/statuses)`,
            payload: JSON.stringify(change).slice(0, 800),
            ok: true,
          }),
        );
      }
    }
  }

  return out;
}
