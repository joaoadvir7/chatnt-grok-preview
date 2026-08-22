import { create } from "zustand";
import { persist } from "zustand/middleware";
import { countAudience, filterAudience } from "./audience";
import {
  AGENTS,
  AUDIT,
  AUTOMATIONS,
  BROADCASTS,
  BROADCAST_FOLDERS,
  CONNECTION_FOLDERS,
  CONNECTIONS,
  CONTACTS,
  CONVERSATIONS,
  CUSTOM_FIELDS,
  DEALS,
  FOLDERS,
  MESSAGES,
  STAGES,
  TAGS,
  TEMPLATES,
  WEBHOOK_EVENTS,
} from "./seed";
import { FIELD_CAMPO, FIELD_UNIAO, getSede, SEDES_DEMO, type SedeRegional } from "./scope";
import {
  inboundMessageCount,
  planAutomationRuns,
} from "./automation-engine";
import type { AutomationEvent } from "./automation-triggers";
import { sendWabaInteractive, sendWabaTextMessage } from "./whatsapp-api";
import { interpolateText } from "./interpolate";
import { wabaReady } from "./whatsapp";
import type {
  Automation,
  Broadcast,
  BroadcastAudience,
  BroadcastChannel,
  BroadcastFolder,
  Connection,
  ConnectionFolder,
  Contact,
  Conversation,
  CustomFieldDef,
  Deal,
  DiarioEntry,
  FlowEdge,
  FlowNode,
  Message,
  MessageDeliveryStatus,
  MessageTemplate,
  MetaPlatform,
  Note,
  PipelineStage,
  SessionScope,
  Tag,
  WabaConfig,
  WebhookEvent,
} from "./types";
import { emptyWaba } from "./whatsapp";
import { uid } from "./utils";
import {
  DEFAULT_BOTTLENECK,
  normalizeBottleneckSettings,
  type BottleneckSettings,
} from "./funnel";

type CrmState = {
  tags: Tag[];
  customFields: CustomFieldDef[];
  contacts: Contact[];
  conversations: Conversation[];
  messages: Message[];
  folders: typeof FOLDERS;
  automations: Automation[];
  stages: PipelineStage[];
  deals: Deal[];
  agents: typeof AGENTS;
  connections: Connection[];
  connectionFolders: ConnectionFolder[];
  webhookEvents: WebhookEvent[];
  audit: typeof AUDIT;
  templates: MessageTemplate[];
  broadcasts: Broadcast[];
  broadcastFolders: BroadcastFolder[];
  activeAgentId: string;
  sessionScope: SessionScope;
  preferredConnectionId: string | null;
  /** demo = mostra dados fictícios; real = só contatos/conversas reais */
  operationMode: "demo" | "real";
  /** Papel de parede do Live Chat */
  chatWallpaperId: string;
  lastInboundConversationId: string | null;
  jornadaDone: string[];
  bottleneckSettings: BottleneckSettings;
  metaPlatform: MetaPlatform;
  sedes: SedeRegional[];
  diario: DiarioEntry[];
  securityPinHash: string | null;
  sessionLocked: boolean;

  setSessionScope: (scope: SessionScope) => void;
  setActiveAgent: (id: string) => void;
  setPreferredConnection: (id: string | null) => void;
  setOperationMode: (mode: "demo" | "real") => void;
  setChatWallpaper: (id: string) => void;
  /** Desliga demo na conexão preferida e entra em operação real */
  enableRealOperation: () => { ok: boolean; message: string };

  addContact: (data: {
    name: string;
    phone: string;
    email?: string;
    tagIds?: string[];
  }) => string;
  updateContact: (id: string, patch: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  toggleContactTag: (contactId: string, tagId: string) => void;
  setContactField: (contactId: string, fieldId: string, value: string) => void;
  addNote: (contactId: string, text: string) => void;
  deleteNote: (contactId: string, noteId: string) => void;
  importContacts: (
    rows: { name: string; phone: string; email?: string }[],
  ) => number;
  addTag: (name: string, color: string) => void;
  addCustomField: (name: string, type: CustomFieldDef["type"], options?: string[]) => string;

  sendMessage: (
    conversationId: string,
    text: string,
    opts?: {
      connectionId?: string;
      deliveryStatus?: MessageDeliveryStatus;
      wamid?: string;
      from?: "agent" | "bot";
      author?: string;
      mediaKind?: import("./types").MessageMediaKind;
      mediaName?: string;
      mediaUrl?: string;
      mediaMime?: string;
      mediaDurationSec?: number;
    },
  ) => string;
  updateMessageDelivery: (
    messageId: string,
    patch: {
      deliveryStatus?: MessageDeliveryStatus;
      wamid?: string;
      error?: string;
    },
  ) => void;
  updateMessageDeliveryByWamid: (
    wamid: string,
    status: MessageDeliveryStatus,
  ) => void;
  /** Entrada via webhook / simulação — cria contato+conversa se preciso */
  receiveInbound: (data: {
    phone: string;
    text: string;
    connectionId: string;
    name?: string;
    wamid?: string;
    referral?: string;
    ctwaClid?: string;
    ctwaId?: string;
  }) => { contactId: string; conversationId: string; messageId: string };
  markConversationRead: (conversationId: string) => void;
  setConversationQueue: (
    conversationId: string,
    queue: Conversation["queue"],
  ) => void;
  assignConversation: (
    conversationId: string,
    agentId: string | null,
  ) => void;
  transferDealsForContacts: (
    contactIds: string[],
    agentId: string,
  ) => void;
  markConversationUnread: (conversationId: string) => void;
  markConversationResponded: (
    conversationId: string,
    responded?: boolean,
  ) => void;
  patchConversation: (
    conversationId: string,
    patch: Partial<import("./types").Conversation>,
  ) => void;
  pushConversationEvent: (
    conversationId: string,
    text: string,
  ) => void;
  deleteConversation: (conversationId: string) => void;
  openConversationForContact: (contactId: string) => string;
  /** Após envio Cloud API: grava bolha no Live Chat (cria contato/conversa se preciso) */
  logOutboundByPhone: (data: {
    phone: string;
    text: string;
    connectionId: string;
    name?: string;
    wamid?: string;
    author?: string;
  }) => { contactId: string; conversationId: string; messageId: string };

  createAutomation: (name: string, folderId: string) => string;
  updateAutomation: (id: string, patch: Partial<Automation>) => void;
  saveFlow: (id: string, nodes: FlowNode[], edges: FlowEdge[]) => void;
  toggleAutomation: (id: string) => void;
  duplicateAutomation: (id: string) => string | null;
  deleteAutomation: (id: string) => void;
  trashAutomation: (id: string) => void;
  restoreAutomation: (id: string) => void;
  createFolder: (name: string) => string;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  moveFolder: (id: string, parentId?: string | null) => void;
  reorderFolders: (fromId: string, toId: string) => void;
  executeAutomations: (opts: {
    conversationId: string;
    contactId: string;
    inboundText: string;
    forceAutomationId?: string;
    event?: AutomationEvent;
  }) => number;

  moveDeal: (dealId: string, stageId: string) => void;
  addDeal: (contactId: string, title: string, stageId: string) => void;
  deleteDeal: (dealId: string) => void;
  closeDeal: (dealId: string, outcome: "ganho" | "perdido") => void;
  addStage: (name: string) => string;
  renameStage: (id: string, name: string) => void;
  deleteStage: (id: string) => void;
  reorderStages: (fromId: string, toId: string) => void;
  setStageColor: (id: string, color: string) => void;

  createBroadcast: (data: {
    name: string;
    type: "imediato" | "agendado";
    scheduledAt?: string;
    templateId: string;
    audience: BroadcastAudience;
    followUpTagId?: string;
    asDraft?: boolean;
    channel?: BroadcastChannel;
    folderId?: string;
  }) => string;
  updateBroadcast: (id: string, patch: Partial<Broadcast>) => void;
  deleteBroadcast: (id: string) => void;
  trashBroadcast: (id: string) => void;
  restoreBroadcast: (id: string) => void;
  sendBroadcast: (id: string) => { count: number; failed: number };
  previewAudience: (audience: BroadcastAudience) => Contact[];
  createBroadcastFolder: (name: string) => string;
  renameBroadcastFolder: (id: string, name: string) => void;
  deleteBroadcastFolder: (id: string) => void;
  moveBroadcastFolder: (id: string, parentId?: string | null) => void;
  reorderBroadcastFolders: (fromId: string, toId: string) => void;
  reorderBroadcasts: (fromId: string, toId: string) => void;
  ensureBroadcastFlow: (broadcastId: string) => string;

  updateConnection: (id: string, patch: Partial<Connection>) => void;
  createConnection: (data: {
    name: string;
    phone?: string;
    handle?: string;
    folderId?: string;
    scope?: Connection["scope"];
    campoCode?: string;
    uniao?: string;
  }) => string;
  trashConnection: (id: string) => void;
  restoreConnection: (id: string) => void;
  deleteConnection: (id: string) => void;
  createConnectionFolder: (name: string) => string;
  renameConnectionFolder: (id: string, name: string) => void;
  deleteConnectionFolder: (id: string) => void;
  reorderConnectionFolders: (fromId: string, toId: string) => void;
  updateWaba: (connectionId: string, patch: Partial<WabaConfig>) => void;
  setConnectionStatus: (
    connectionId: string,
    status: Connection["status"],
    extra?: Partial<Connection>,
  ) => void;
  pushWebhookEvent: (
    ev: Omit<WebhookEvent, "id" | "createdAt"> & { createdAt?: string },
  ) => void;
  clearWebhookEvents: (connectionId?: string) => void;
  /** Resolve conexão pelo Phone Number ID da Meta */
  findConnectionByPhoneNumberId: (phoneNumberId: string) => Connection | undefined;

  markJornadaDone: (id: string) => void;
  setBottleneckSettings: (patch: Partial<BottleneckSettings>) => void;
  setBottleneckRule: (
    toStep: BottleneckSettings["rules"][number]["toStep"],
    patch: Partial<BottleneckSettings["rules"][number]>,
  ) => void;
  setMetaPlatform: (patch: Partial<MetaPlatform>) => void;
  createSede: (data: {
    code: string;
    name: string;
    uniao: string;
    tipo: SedeRegional["tipo"];
    regiao: string;
    whatsapp?: string;
  }) => string;
  updateSede: (code: string, patch: Partial<SedeRegional>) => void;
  deleteSede: (code: string) => void;
  setSecurityPin: (hash: string) => void;
  closeDay: (entry: Omit<DiarioEntry, "id">) => void;
  unlockSession: () => void;
  resetDemo: () => void;
};

const seed = () => ({
  tags: TAGS,
  customFields: CUSTOM_FIELDS,
  contacts: CONTACTS,
  conversations: CONVERSATIONS,
  messages: MESSAGES,
  folders: FOLDERS,
  automations: AUTOMATIONS,
  stages: STAGES,
  deals: DEALS,
  agents: AGENTS,
  connections: CONNECTIONS,
  connectionFolders: CONNECTION_FOLDERS,
  webhookEvents: WEBHOOK_EVENTS,
  audit: AUDIT,
  templates: TEMPLATES,
  broadcasts: BROADCASTS,
  broadcastFolders: BROADCAST_FOLDERS,
  activeAgentId: "a1",
  sessionScope: {
    mode: "central" as const,
    campoCode: null,
  },
  preferredConnectionId: "cx_central",
  operationMode: "real" as const,
  chatWallpaperId: "doodle",
  lastInboundConversationId: null,
  jornadaDone: [] as string[],
  bottleneckSettings: DEFAULT_BOTTLENECK,
  metaPlatform: { appId: "", configId: "", appSecret: "" },
  sedes: SEDES_DEMO,
  diario: [] as DiarioEntry[],
  securityPinHash: null as string | null,
  sessionLocked: false,
});

function emptyMetrics() {
  return { sent: 0, delivered: 0, read: 0, failed: 0, clicks: 0 };
}

/** Nome genérico gerado sem perfil WhatsApp */
function isPlaceholderContactName(name?: string): boolean {
  if (!name || !name.trim()) return true;
  const n = name.trim();
  if (/^WhatsApp\s+\d{2,8}$/i.test(n)) return true;
  if (/^\+?\d{8,15}$/.test(n.replace(/[\s()-]/g, ""))) return true;
  // nomes genéricos do sistema
  if (/^(contato|aluno|sem nome|desconhecido)$/i.test(n)) return true;
  return false;
}

/** Só aceita nome “de verdade” (não placeholder) para gravar no contato */
function realContactName(name?: string): string | undefined {
  const n = name?.trim();
  if (!n || isPlaceholderContactName(n)) return undefined;
  return n;
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function phonesMatch(a: string, b: string) {
  const da = normalizePhone(a);
  const db = normalizePhone(b);
  if (!da || !db) return false;
  if (da === db) return true;
  if (da.slice(-8) && da.slice(-8) === db.slice(-8)) return true;
  if (da.length >= 10 && db.endsWith(da)) return true;
  if (db.length >= 10 && da.endsWith(db)) return true;
  return false;
}

function runAutoEvent(
  get: () => CrmState,
  contactId: string,
  event: AutomationEvent,
) {
  const s = get();
  const cv = s.conversations.find((c) => c.contactId === contactId);
  if (!cv) return;
  s.executeAutomations({
    conversationId: cv.id,
    contactId,
    inboundText: event.text ?? "",
    event,
  });
}

function uniqueById<T extends { id: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function moveById<T extends { id: string }>(arr: T[], fromId: string, toId: string) {
  if (fromId === toId) return arr;
  const from = arr.findIndex((x) => x.id === fromId);
  const to = arr.findIndex((x) => x.id === toId);
  if (from < 0 || to < 0) return arr;
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export const useCrmStore = create<CrmState>()(
  persist(
    (set, get) => ({
      ...seed(),

      setSessionScope: (scope) => {
        const agents = get().agents;
        let activeAgentId = get().activeAgentId;
        if (scope.mode === "central") {
          const central = agents.find(
            (a) => a.role === "central" && a.id !== "a4",
          );
          if (central) activeAgentId = central.id;
        } else if (scope.campoCode) {
          const regional = agents.find(
            (a) => a.role === "regional" && a.campoCode === scope.campoCode,
          );
          if (regional) activeAgentId = regional.id;
        }
        set({ sessionScope: scope, activeAgentId });
      },

      setActiveAgent: (id) => set({ activeAgentId: id }),

      setPreferredConnection: (id) => set({ preferredConnectionId: id }),

      setOperationMode: (mode) => set({ operationMode: mode }),

      setChatWallpaper: (id) => set({ chatWallpaperId: id }),

      enableRealOperation: () => {
        const state = get();
        const id = state.preferredConnectionId || "cx_central";
        const cx = state.connections.find((c) => c.id === id) || state.connections[0];
        if (!cx) {
          return { ok: false, message: "Nenhuma conexão WhatsApp no escopo" };
        }
        const w = cx.waba;
        if (!w?.accessToken || !w.phoneNumberId) {
          return {
            ok: false,
            message: "Em Conexões: cole Phone Number ID e Access Token primeiro",
          };
        }
        if (w.accessToken.startsWith("DEMO_") || w.accessToken.length < 20) {
          return {
            ok: false,
            message:
              "Token ainda é de demo. Cole o token real do sistema chatnt em Conexões",
          };
        }
        set((s) => ({
          operationMode: "real",
          preferredConnectionId: cx.id,
          connections: s.connections.map((c) =>
            c.id === cx.id
              ? {
                  ...c,
                  status: "conectado",
                  verified: true,
                  waba: {
                    ...(c.waba!),
                    demoMode: false,
                    lastError: undefined,
                  },
                }
              : c,
          ),
        }));
        return {
          ok: true,
          message: `Operação real · ${cx.phone} · dados de demo ocultos`,
        };
      },

      addContact: (data) => {
        const id = uid("c");
        const scope = get().sessionScope;
        const sede = getSede(scope.campoCode, get().sedes);
        const customFields: Record<string, string> = {};
        let connectionId: string | undefined;
        if (scope.mode === "regional" && sede) {
          customFields[FIELD_CAMPO] = sede.code;
          customFields[FIELD_UNIAO] = sede.uniao;
          connectionId = sede.connectionId;
        }
        const contact: Contact = {
          id,
          name: data.name.trim(),
          phone: data.phone.trim(),
          email: data.email?.trim(),
          createdAt: new Date().toISOString(),
          tagIds: data.tagIds ?? [],
          customFields,
          notes: [],
          status: "open",
          connectionId,
        };
        set((s) => ({ contacts: [contact, ...s.contacts] }));
        queueMicrotask(() =>
          runAutoEvent(get, id, { type: "contact_created" }),
        );
        return id;
      },

      updateContact: (id, patch) =>
        set((s) => ({
          contacts: s.contacts.map((c) => {
            if (c.id !== id) return c;
            const next = { ...c, ...patch };
            // Nome editado manualmente: limpa perfil genérico "WhatsApp 5733"
            if (patch.name !== undefined) {
              const real = realContactName(patch.name);
              if (real) {
                next.name = real;
                if (
                  next.waProfileName &&
                  isPlaceholderContactName(next.waProfileName)
                ) {
                  next.waProfileName = undefined;
                }
              }
            }
            return next;
          }),
        })),

      deleteContact: (id) =>
        set((s) => ({
          contacts: s.contacts.filter((c) => c.id !== id),
          conversations: s.conversations.filter((cv) => cv.contactId !== id),
          deals: s.deals.filter((d) => d.contactId !== id),
        })),

      toggleContactTag: (contactId, tagId) => {
        const had = get().contacts.find((c) => c.id === contactId)?.tagIds.includes(tagId);
        set((s) => ({
          contacts: s.contacts.map((c) => {
            if (c.id !== contactId) return c;
            const has = c.tagIds.includes(tagId);
            return {
              ...c,
              tagIds: has
                ? c.tagIds.filter((t) => t !== tagId)
                : [...c.tagIds, tagId],
            };
          }),
        }));
        queueMicrotask(() =>
          runAutoEvent(get, contactId, {
            type: had ? "tag_removed" : "tag_added",
            tagId,
          }),
        );
      },

      setContactField: (contactId, fieldId, value) =>
        set((s) => ({
          contacts: s.contacts.map((c) =>
            c.id === contactId
              ? {
                  ...c,
                  customFields: { ...c.customFields, [fieldId]: value },
                }
              : c,
          ),
        })),

      addNote: (contactId, text) => {
        const agent = get().agents.find((a) => a.id === get().activeAgentId);
        const note: Note = {
          id: uid("n"),
          text: text.trim(),
          author: agent?.name ?? "Atendente",
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          contacts: s.contacts.map((c) =>
            c.id === contactId
              ? { ...c, notes: [note, ...c.notes] }
              : c,
          ),
        }));
      },

      deleteNote: (contactId, noteId) =>
        set((s) => ({
          contacts: s.contacts.map((c) =>
            c.id === contactId
              ? { ...c, notes: c.notes.filter((n) => n.id !== noteId) }
              : c,
          ),
        })),

      importContacts: (rows) => {
        const scope = get().sessionScope;
        const sede = getSede(scope.campoCode, get().sedes);
        const created: Contact[] = rows.map((row) => {
          const customFields: Record<string, string> = {};
          let connectionId: string | undefined;
          if (scope.mode === "regional" && sede) {
            customFields[FIELD_CAMPO] = sede.code;
            customFields[FIELD_UNIAO] = sede.uniao;
            connectionId = sede.connectionId;
          }
          return {
            id: uid("c"),
            name: row.name.trim(),
            phone: row.phone.trim(),
            email: row.email?.trim(),
            createdAt: new Date().toISOString(),
            tagIds: [],
            customFields,
            notes: [],
            status: "open" as const,
            connectionId,
          };
        });
        set((s) => ({ contacts: [...created, ...s.contacts] }));
        return created.length;
      },

      addTag: (name, color) =>
        set((s) => ({
          tags: [...s.tags, { id: uid("t"), name: name.trim(), color }],
        })),

      addCustomField: (name, type, options) => {
        const id = uid("cf");
        set((s) => ({
          customFields: [
            ...s.customFields,
            {
              id,
              name: name.trim(),
              type,
              ...(options && options.length ? { options } : {}),
            },
          ],
        }));
        return id;
      },

      sendMessage: (conversationId, text, opts) => {
        const agent = get().agents.find((a) => a.id === get().activeAgentId);
        const id = uid("m");
        const msg: Message = {
          id,
          conversationId,
          from: opts?.from ?? "agent",
          text: text.trim(),
          createdAt: new Date().toISOString(),
          author: opts?.author ?? agent?.name ?? "Atendente",
          connectionId: opts?.connectionId,
          deliveryStatus: opts?.deliveryStatus ?? "sent",
          wamid: opts?.wamid,
          mediaKind: opts?.mediaKind,
          mediaName: opts?.mediaName,
          mediaUrl: opts?.mediaUrl,
          mediaMime: opts?.mediaMime,
          mediaDurationSec: opts?.mediaDurationSec,
        };
        set((s) => ({
          messages: [...s.messages, msg],
          conversations: s.conversations.map((cv) =>
            cv.id === conversationId
              ? {
                  ...cv,
                  lastMessageAt: msg.createdAt,
                  unread: 0,
                  queue: cv.queue === "finalizados" ? cv.queue : "meus",
                }
              : cv,
          ),
        }));
        return id;
      },

      updateMessageDelivery: (messageId, patch) =>
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === messageId ? { ...m, ...patch } : m,
          ),
        })),

      updateMessageDeliveryByWamid: (wamid, status) =>
        set((s) => ({
          messages: s.messages.map((m) =>
            m.wamid === wamid ? { ...m, deliveryStatus: status } : m,
          ),
        })),

      receiveInbound: (data) => {
        if (data.wamid && get().messages.some((m) => m.wamid === data.wamid)) {
          const existing = get().messages.find((m) => m.wamid === data.wamid);
          return {
            contactId: "",
            conversationId: existing?.conversationId ?? "",
            messageId: existing?.id ?? "",
          };
        }
        const echoText = (data.text ?? "").trim();
        if (echoText) {
          const cutoff = Date.now() - 45 * 1000;
          const echo = get().messages.find((m) => {
            if (m.from !== "bot" && m.from !== "agent") return false;
            if ((m.text ?? "").trim() !== echoText) return false;
            if (new Date(m.createdAt).getTime() < cutoff) return false;
            const cv = get().conversations.find((c) => c.id === m.conversationId);
            const ct = get().contacts.find((c) => c.id === cv?.contactId);
            if (!ct) return false;
            return phonesMatch(ct.phone, data.phone);
          });
          if (echo) {
            if (data.wamid && !echo.wamid) {
              set((s) => ({
                messages: s.messages.map((m) =>
                  m.id === echo.id ? { ...m, wamid: data.wamid } : m,
                ),
              }));
            }
            return {
              contactId: "",
              conversationId: echo.conversationId,
              messageId: echo.id,
            };
          }
        }
        const phoneDigits = normalizePhone(data.phone);
        const cx = get().connections.find((c) => c.id === data.connectionId);
        const profileName = realContactName(data.name) || "";
        let contact = get().contacts.find((c) => phonesMatch(c.phone, phoneDigits));

        let contactId = contact?.id;
        if (!contact) {
          contactId = uid("c");
          const customFields: Record<string, string> = {};
          if (cx?.campoCode) {
            customFields[FIELD_CAMPO] = cx.campoCode;
            if (cx.uniao) customFields[FIELD_UNIAO] = cx.uniao;
          }
          const newContact: Contact = {
            id: contactId,
            name: profileName || `WhatsApp ${phoneDigits.slice(-4)}`,
            waProfileName: profileName || undefined,
            phone: phoneDigits,
            createdAt: new Date().toISOString(),
            tagIds: [],
            customFields,
            notes: [],
            status: "open",
            connectionId: data.connectionId,
            isDemo: false,
          };
          set((s) => ({ contacts: [newContact, ...s.contacts] }));
          contact = newContact;
        } else {
          // Atualiza nome do perfil WhatsApp sempre que a Meta enviar
          set((s) => ({
            contacts: s.contacts.map((c) => {
              if (c.id !== contact!.id) return c;
              const next: Contact = {
                ...c,
                connectionId: c.connectionId || data.connectionId,
                isDemo: false,
              };
              if (cx?.campoCode && !next.customFields[FIELD_CAMPO]) {
                next.customFields = {
                  ...next.customFields,
                  [FIELD_CAMPO]: cx.campoCode,
                  ...(cx.uniao ? { [FIELD_UNIAO]: cx.uniao } : {}),
                };
              }
              if (profileName) {
                next.waProfileName = profileName;
                // Preenche nome de exibição se ainda for genérico
                if (isPlaceholderContactName(c.name)) {
                  next.name = profileName;
                }
              }
              return next;
            }),
          }));
          contact = get().contacts.find((c) => c.id === contactId);
        }

        const conversation = get().conversations.find(
          (cv) => cv.contactId === contactId,
        );
        let conversationId = conversation?.id;
        const nowIso = new Date().toISOString();

        if (!conversation) {
          conversationId = uid("cv");
          set((s) => ({
            conversations: [
              {
                id: conversationId!,
                contactId: contactId!,
                lastMessageAt: nowIso,
                unread: 1,
                queue: "novos",
              },
              ...s.conversations,
            ],
          }));
        } else {
          conversationId = conversation.id;
          set((s) => ({
            conversations: s.conversations.map((cv) =>
              cv.id === conversationId
                ? {
                    ...cv,
                    lastMessageAt: nowIso,
                    unread: cv.unread + 1,
                    queue: cv.queue === "finalizados" ? "novos" : cv.queue,
                  }
                : cv,
            ),
          }));
        }

        const messageId = uid("m");
        const msg: Message = {
          id: messageId,
          conversationId: conversationId!,
          from: "contact",
          text: data.text,
          createdAt: nowIso,
          wamid: data.wamid,
          connectionId: data.connectionId,
        };
        set((s) => ({
          messages: [...s.messages, msg],
          lastInboundConversationId: conversationId!,
          connections: s.connections.map((c) =>
            c.id === data.connectionId
              ? {
                  ...c,
                  messages24h: (c.messages24h ?? 0) + 1,
                  conversationsOpen: Math.max(
                    c.conversationsOpen ?? 0,
                    s.conversations.filter((cv) => {
                      const ct = s.contacts.find((x) => x.id === cv.contactId);
                      return (
                        ct?.connectionId === data.connectionId &&
                        cv.queue !== "finalizados"
                      );
                    }).length,
                  ),
                }
              : c,
          ),
        }));

        // dispara fluxos ativos (palavra-chave, 1ª msg, etc.)
        try {
          if (data.ctwaClid || data.ctwaId || data.referral) {
            set((s) => ({
              contacts: s.contacts.map((c) =>
                c.id !== contactId
                  ? c
                  : {
                      ...c,
                      customFields: {
                        ...c.customFields,
                        ...(data.ctwaId ? { cf17: data.ctwaId } : {}),
                        ...(data.ctwaClid ? { cf18: data.ctwaClid } : {}),
                      },
                    },
              ),
            }));
          }
          get().executeAutomations({
            conversationId: conversationId!,
            contactId: contactId!,
            inboundText: data.text,
            event:
              data.ctwaClid || data.referral
                ? {
                    type: "ctwa",
                    text: data.text,
                    referral: data.referral || data.ctwaClid,
                  }
                : { type: "inbound", text: data.text },
          });
        } catch {
          /* não bloqueia a entrada */
        }

        return {
          contactId: contactId!,
          conversationId: conversationId!,
          messageId,
        };
      },

      markConversationRead: (conversationId) =>
        set((s) => ({
          conversations: s.conversations.map((cv) =>
            cv.id === conversationId ? { ...cv, unread: 0 } : cv,
          ),
        })),

      markConversationUnread: (conversationId) =>
        set((s) => ({
          conversations: s.conversations.map((cv) =>
            cv.id === conversationId
              ? { ...cv, unread: Math.max(cv.unread, 1) }
              : cv,
          ),
        })),

      markConversationResponded: (conversationId, responded = true) =>
        set((s) => ({
          conversations: s.conversations.map((cv) =>
            cv.id === conversationId ? { ...cv, responded } : cv,
          ),
        })),

      patchConversation: (conversationId, patch) =>
        set((s) => ({
          conversations: s.conversations.map((cv) =>
            cv.id === conversationId ? { ...cv, ...patch } : cv,
          ),
        })),

      pushConversationEvent: (conversationId, text) => {
        const id = uid("ev");
        const at = new Date().toISOString();
        set((s) => ({
          conversations: s.conversations.map((cv) =>
            cv.id === conversationId
              ? {
                  ...cv,
                  events: [
                    ...(cv.events ?? []),
                    { id, at, text },
                  ],
                }
              : cv,
          ),
          messages: [
            ...s.messages,
            {
              id: uid("m"),
              conversationId,
              from: "system" as const,
              text,
              createdAt: at,
            },
          ],
        }));
      },

      deleteConversation: (conversationId) =>
        set((s) => ({
          conversations: s.conversations.filter(
            (cv) => cv.id !== conversationId,
          ),
          messages: s.messages.filter(
            (m) => m.conversationId !== conversationId,
          ),
        })),

      setConversationQueue: (conversationId, queue) => {
        set((s) => ({
          conversations: s.conversations.map((cv) =>
            cv.id === conversationId
              ? {
                  ...cv,
                  queue,
                  assignee: queue === "meus" ? s.activeAgentId : cv.assignee,
                }
              : cv,
          ),
        }));
        if (queue === "finalizados") {
          const cv = get().conversations.find((c) => c.id === conversationId);
          if (cv) {
            queueMicrotask(() =>
              runAutoEvent(get, cv.contactId, { type: "conversation_closed" }),
            );
          }
        }
      },

      assignConversation: (conversationId, agentId) => {
        set((s) => ({
          conversations: s.conversations.map((cv) =>
            cv.id === conversationId
              ? {
                  ...cv,
                  assignee: agentId ?? undefined,
                  queue: agentId ? "meus" : "novos",
                }
              : cv,
          ),
        }));
        if (agentId) {
          const cv = get().conversations.find((c) => c.id === conversationId);
          if (cv) {
            queueMicrotask(() =>
              runAutoEvent(get, cv.contactId, { type: "assigned", agentId }),
            );
          }
        }
      },

      transferDealsForContacts: (contactIds, agentId) => {
        const setIds = new Set(contactIds);
        set((s) => ({
          deals: s.deals.map((d) =>
            setIds.has(d.contactId) ? { ...d, assignee: agentId } : d,
          ),
        }));
      },

      openConversationForContact: (contactId) => {
        const existing = get().conversations.find(
          (cv) => cv.contactId === contactId,
        );
        if (existing) return existing.id;
        const id = uid("cv");
        const nowIso = new Date().toISOString();
        set((s) => ({
          conversations: [
            {
              id,
              contactId,
              lastMessageAt: nowIso,
              unread: 0,
              queue: "meus",
              assignee: s.activeAgentId,
            },
            ...s.conversations,
          ],
          messages: [
            ...s.messages,
            {
              id: uid("m"),
              conversationId: id,
              from: "system",
              text: "Conversa aberta pelo atendente",
              createdAt: nowIso,
            },
          ],
        }));
        return id;
      },


      logOutboundByPhone: (data) => {
        const phone = data.phone.replace(/\D/g, "");
        // ignora "WhatsApp 5733" e similares — não sobrescreve nome real
        const profileName = realContactName(data.name);
        const contact = get().contacts.find(
          (c) => c.phone.replace(/\D/g, "") === phone,
        );
        let contactId = contact?.id;
        if (!contactId) {
          contactId = get().addContact({
            name: profileName || `WhatsApp ${phone.slice(-4)}`,
            phone,
          });
          get().updateContact(contactId, {
            connectionId: data.connectionId,
            isDemo: false,
            ...(profileName
              ? { waProfileName: profileName, name: profileName }
              : {}),
          });
        } else {
          const patch: Partial<Contact> = {
            connectionId: data.connectionId,
            isDemo: false,
          };
          // Só atualiza nome se ainda for genérico E vier nome real
          if (profileName && isPlaceholderContactName(contact?.name)) {
            patch.name = profileName;
            patch.waProfileName = profileName;
          } else if (
            profileName &&
            !isPlaceholderContactName(profileName)
          ) {
            // guarda perfil WA sem apagar nome já editado pelo atendente
            patch.waProfileName = profileName;
          }
          get().updateContact(contactId, patch);
        }
        const conversationId = get().openConversationForContact(contactId);
        const agent = get().agents.find((a) => a.id === get().activeAgentId);
        const msgId = uid("m");
        const nowIso = new Date().toISOString();
        const msg = {
          id: msgId,
          conversationId,
          from: "agent" as const,
          text: data.text.trim(),
          createdAt: nowIso,
          author: data.author ?? agent?.name ?? "Atendente",
          deliveryStatus: "sent" as const,
          wamid: data.wamid,
          connectionId: data.connectionId,
        };
        set((s) => ({
          messages: [...s.messages, msg],
          conversations: s.conversations.map((cv) =>
            cv.id === conversationId
              ? { ...cv, lastMessageAt: nowIso, unread: 0, queue: "meus" as const }
              : cv,
          ),
        }));
        return { contactId, conversationId, messageId: msgId };
      },

      createAutomation: (name, folderId) => {
        const id = uid("auto");
        const a: Automation = {
          id,
          name: name.trim(),
          folderId,
          active: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          nodes: [
            {
              id: "n1",
              type: "trigger",
              label: "Gatilho",
              x: 80,
              y: 120,
              config: { kind: "keyword" },
            },
          ],
          edges: [],
        };
        set((s) => ({ automations: [a, ...s.automations] }));
        return id;
      },

      updateAutomation: (id, patch) =>
        set((s) => ({
          automations: s.automations.map((a) =>
            a.id === id
              ? { ...a, ...patch, updatedAt: new Date().toISOString() }
              : a,
          ),
        })),

      saveFlow: (id, nodes, edges) =>
        set((s) => ({
          automations: s.automations.map((a) =>
            a.id === id
              ? {
                  ...a,
                  nodes,
                  edges,
                  updatedAt: new Date().toISOString(),
                }
              : a,
          ),
        })),

      toggleAutomation: (id) =>
        set((s) => {
          const target = s.automations.find((a) => a.id === id);
          if (!target) return s;
          const next = !target.active;
          const seen = new Set<string>();
          return {
            automations: s.automations.flatMap((a) => {
              if (seen.has(a.id)) return [];
              seen.add(a.id);
              if (a.id === id) return [{ ...a, active: next }];
              return [a];
            }),
          };
        }),

      duplicateAutomation: (id) => {
        const src = get().automations.find((a) => a.id === id);
        if (!src) return null;
        const nid = uid("auto");
        const copy: Automation = {
          ...src,
          id: nid,
          name: `${src.name} (cópia)`,
          active: false,
          runCount: 0,
          lastRunAt: undefined,
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ automations: [copy, ...s.automations] }));
        return nid;
      },

      deleteAutomation: (id) =>
        set((s) => ({
          automations: s.automations.filter((a) => a.id !== id),
        })),

      trashAutomation: (id) =>
        set((s) => ({
          automations: s.automations.map((a) =>
            a.id === id ? { ...a, trashed: true } : a,
          ),
        })),

      restoreAutomation: (id) =>
        set((s) => ({
          automations: s.automations.map((a) =>
            a.id === id ? { ...a, trashed: false } : a,
          ),
        })),

      createFolder: (name) => {
        const id = uid("f");
        const now = new Date().toISOString();
        set((s) => ({
          folders: [
            ...s.folders,
            { id, name: name.trim(), createdAt: now, updatedAt: now },
          ],
        }));
        return id;
      },

      renameFolder: (id, name) =>
        set((s) => ({
          folders: s.folders.map((f) =>
            f.id === id
              ? { ...f, name: name.trim(), updatedAt: new Date().toISOString() }
              : f,
          ),
        })),

      deleteFolder: (id) =>
        set((s) => {
          const fallback = s.folders.find((f) => f.id !== id)?.id ?? "";
          return {
            folders: s.folders.filter((f) => f.id !== id),
            automations: s.automations.map((a) =>
              a.folderId === id ? { ...a, folderId: fallback } : a,
            ),
          };
        }),

      moveFolder: (id, parentId) =>
        set((s) => ({
          folders: s.folders.map((f) =>
            f.id === id
              ? {
                  ...f,
                  parentId: parentId || undefined,
                  updatedAt: new Date().toISOString(),
                }
              : f,
          ),
        })),

      reorderFolders: (fromId, toId) =>
        set((s) => ({
          folders: moveById(s.folders, fromId, toId),
        })),

      executeAutomations: ({
        conversationId,
        contactId,
        inboundText,
        forceAutomationId,
        event,
      }) => {
        const s = get();
        const contact = s.contacts.find((c) => c.id === contactId);
        const conversation = s.conversations.find(
          (cv) => cv.id === conversationId,
        );
        if (!contact || !conversation) return 0;

        const convMsgs = s.messages.filter((m) => m.conversationId === conversationId);
        const lastInbound = [...convMsgs]
          .filter((m) => m.from === "contact")
          .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
        const lastOutbound = [...convMsgs]
          .filter((m) => m.from === "agent" || m.from === "bot")
          .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
        const planned = planAutomationRuns({
          automations: s.automations,
          contact,
          conversation,
          inboundText,
          contactMessageCount: inboundMessageCount(s.messages, conversationId),
          forceAutomationId,
          event,
          fields: s.customFields,
          deals: s.deals,
          lastInboundAt: lastInbound?.createdAt,
          lastOutboundAt: lastOutbound?.createdAt,
        });
        if (planned.length === 0) {
          const why = conversation.automationsPaused
            ? "Automações pausadas nesta conversa"
            : `Nenhuma automação disparou para “${(inboundText || "").trim().slice(0, 48) || "mensagem"}”`;
          get().pushConversationEvent(conversationId, why);
          return 0;
        }

        const now = new Date().toISOString();
        let botCount = 0;
        const pendingSends: {
          id: string;
          text: string;
          header?: string;
          footer?: string;
          buttons?: { id: string; label: string }[];
          ctaUrls?: { label: string; url: string }[];
          listButton?: string;
          listSections?: { title: string; rows: { id: string; title: string }[] }[];
        }[] = [];
        const pendingHttp: Extract<
          import("@/lib/automation-engine").AutoAction,
          { type: "http" }
        >[] = [];

        set((state) => {
          let contacts = state.contacts;
          let conversations = state.conversations;
          let messages = state.messages;
          let deals = state.deals;
          let automations = state.automations;

          for (const act of planned) {
            if (act.type === "bot_message") {
              botCount += 1;
              const mid = uid("m");
              const interpOpts = { fields: s.customFields };
              const sentText = interpolateText(act.text, contact, interpOpts);
              const sentHeader = act.header
                ? interpolateText(act.header, contact, interpOpts)
                : undefined;
              const sentFooter = act.footer
                ? interpolateText(act.footer, contact, interpOpts)
                : undefined;
              pendingSends.push({
                id: mid,
                text: sentText,
                header: sentHeader,
                footer: sentFooter,
                buttons: act.buttons,
                ctaUrls: act.ctaUrls,
                listButton: act.listButton,
                listSections: act.listSections,
              });
              messages = [
                ...messages,
                {
                  id: mid,
                  conversationId: act.conversationId,
                  from: "bot",
                  text: sentText,
                  createdAt: now,
                  author: `Automação · ${act.autoName}`,
                  deliveryStatus: "pending",
                  mediaKind: "automation",
                  mediaName: act.autoName,
                  connectionId: contact.connectionId,
                  header: act.header,
                  footer: act.footer,
                  replyButtons: [
                    ...(act.buttons ??
                      act.listSections?.flatMap((s) =>
                        s.rows.map((r) => ({ id: r.id, label: r.title })),
                      ) ??
                      []),
                    ...(act.ctaUrls ?? []).map((c, i) => ({
                      id: `cta_${i}`,
                      label: c.label,
                      url: c.url,
                    })),
                  ],
                },
              ];
              conversations = conversations.map((cv) =>
                cv.id === act.conversationId
                  ? { ...cv, lastMessageAt: now }
                  : cv,
              );
            } else if (act.type === "add_tag") {
              const needle = act.tagId.replace(/^#/, "").toLowerCase();
              const resolved =
                state.tags.find((t) => t.id === act.tagId)?.id ??
                state.tags.find(
                  (t) => t.name.replace(/^#/, "").toLowerCase() === needle,
                )?.id ??
                act.tagId;
              contacts = contacts.map((c) =>
                c.id === act.contactId && !c.tagIds.includes(resolved)
                  ? { ...c, tagIds: [...c.tagIds, resolved] }
                  : c,
              );
            } else if (act.type === "remove_tag") {
              const needle = act.tagId.replace(/^#/, "").toLowerCase();
              const resolved =
                state.tags.find((t) => t.id === act.tagId)?.id ??
                state.tags.find(
                  (t) => t.name.replace(/^#/, "").toLowerCase() === needle,
                )?.id ??
                act.tagId;
              contacts = contacts.map((c) =>
                c.id === act.contactId
                  ? { ...c, tagIds: c.tagIds.filter((t) => t !== resolved && t !== act.tagId) }
                  : c,
              );
            } else if (act.type === "assign") {
              conversations = conversations.map((cv) =>
                cv.id === act.conversationId
                  ? { ...cv, assignee: act.agentId, queue: "meus" }
                  : cv,
              );
            } else if (act.type === "queue") {
              conversations = conversations.map((cv) =>
                cv.id === act.conversationId
                  ? { ...cv, queue: act.queue }
                  : cv,
              );
            } else if (act.type === "set_field") {
              contacts = contacts.map((c) =>
                c.id === act.contactId
                  ? {
                      ...c,
                      customFields: {
                        ...c.customFields,
                        [act.fieldId]: act.value,
                      },
                    }
                  : c,
              );
            } else if (act.type === "wait_button") {
              conversations = conversations.map((cv) =>
                cv.id === act.conversationId
                  ? {
                      ...cv,
                      waitingFlow: {
                        automationId: act.automationId,
                        nodeId: act.nodeId,
                        stackIndex: act.stackIndex,
                        usedLabels: act.usedLabels ?? [],
                      },
                    }
                  : cv,
              );
            } else if (act.type === "clear_wait") {
              conversations = conversations.map((cv) =>
                cv.id === act.conversationId
                  ? { ...cv, waitingFlow: undefined }
                  : cv,
              );
            } else if (act.type === "optout") {
              contacts = contacts.map((c) =>
                c.id === act.contactId ? { ...c, optedOut: true } : c,
              );
            } else if (act.type === "system") {
              conversations = conversations.map((cv) => {
                if (cv.id !== act.conversationId) return cv;
                if (act.action === "pause_ia") return { ...cv, iaPaused: true };
                if (act.action === "pause_auto")
                  return { ...cv, automationsPaused: true };
                if (act.action === "finalize")
                  return { ...cv, queue: "finalizados" };
                if (act.action === "reopen") return { ...cv, queue: "novos" };
                return cv;
              });
            } else if (act.type === "crm") {
              const existing = deals.find((d) => d.contactId === act.contactId);
              if (existing) {
                deals = deals.map((d) =>
                  d.id === existing.id
                    ? { ...d, stageId: act.stageId, daysInStage: 0 }
                    : d,
                );
              } else {
                deals = [
                  {
                    id: uid("d"),
                    contactId: act.contactId,
                    title: act.title,
                    stageId: act.stageId,
                    value: 0,
                    temperature: 50,
                    daysInStage: 0,
                    tagIds: [],
                  },
                  ...deals,
                ];
              }
            } else if (act.type === "event") {
              messages = [
                ...messages,
                {
                  id: uid("m"),
                  conversationId: act.conversationId,
                  from: "system",
                  text: act.text,
                  createdAt: now,
                },
              ];
              conversations = conversations.map((cv) =>
                cv.id === act.conversationId
                  ? {
                      ...cv,
                      events: [
                        ...(cv.events ?? []),
                        { id: uid("ev"), at: now, text: act.text },
                      ],
                    }
                  : cv,
              );
            } else if (act.type === "http") {
              pendingHttp.push(act);
              messages = [
                ...messages,
                {
                  id: uid("m"),
                  conversationId: act.conversationId,
                  from: "system",
                  text: `HTTP ${act.method} ${act.url}`,
                  createdAt: now,
                },
              ];
            } else if (act.type === "mark_run") {
              automations = automations.map((a) =>
                a.id === act.automationId
                  ? {
                      ...a,
                      runCount: (a.runCount ?? 0) + 1,
                      lastRunAt: now,
                    }
                  : a,
              );
            }
          }

          return {
            contacts,
            conversations,
            messages,
            deals,
            automations,
          };
        });

        if (pendingSends.length) {
          const st = get();
          const ct = st.contacts.find((c) => c.id === contactId);
          const cx =
            st.connections.find((c) => c.id === ct?.connectionId) ??
            st.connections.find((c) => c.id === st.preferredConnectionId) ??
            st.connections.find((c) => wabaReady(c.waba));
          const w = cx?.waba;
          if (ct && w && wabaReady(w)) {
            for (const item of pendingSends) {
              const hasList = Boolean(item.listSections && item.listSections.length);
              const hasReply = Boolean(item.buttons && item.buttons.length);
              const ctas = item.ctaUrls ?? [];
              const firstCta = !hasList && !hasReply && ctas[0] ? ctas[0] : undefined;
              const extraCtas = firstCta ? ctas.slice(1) : ctas;
              const req = hasList || hasReply || firstCta
                ? sendWabaInteractive({
                    data: {
                      accessToken: w.accessToken,
                      phoneNumberId: w.phoneNumberId,
                      to: ct.phone,
                      body: item.text || " ",
                      header: item.header,
                      footer: item.footer,
                      buttons: hasReply ? item.buttons : undefined,
                      listButton: item.listButton,
                      listSections: item.listSections,
                      ctaUrl: firstCta
                        ? { displayText: firstCta.label, url: firstCta.url }
                        : undefined,
                    },
                  }).then((res) =>
                    res.ok
                      ? res
                      : sendWabaTextMessage({
                          data: {
                            accessToken: w.accessToken,
                            phoneNumberId: w.phoneNumberId,
                            to: ct.phone,
                            text: [
                              item.header,
                              item.text,
                              item.footer,
                              ...ctas.map((c) => `${c.label}: ${c.url}`),
                            ]
                              .filter(Boolean)
                              .join("\n"),
                            demoMode: false,
                          },
                        }),
                  )
                : sendWabaTextMessage({
                    data: {
                      accessToken: w.accessToken,
                      phoneNumberId: w.phoneNumberId,
                      to: ct.phone,
                      text: item.text,
                      demoMode: false,
                    },
                  });
              void req
                .then(async (res) => {
                  for (const cta of extraCtas) {
                    await sendWabaInteractive({
                      data: {
                        accessToken: w.accessToken,
                        phoneNumberId: w.phoneNumberId,
                        to: ct.phone,
                        body: cta.label || " ",
                        ctaUrl: { displayText: cta.label, url: cta.url },
                      },
                    });
                  }
                  return res;
                })
                .then((res) => {
                set((cur) => ({
                  messages: cur.messages.map((m) =>
                    m.id === item.id
                      ? {
                          ...m,
                          deliveryStatus: res.ok ? "sent" : "failed",
                          wamid: res.messageId,
                          error: res.error,
                        }
                      : m,
                  ),
                }));
              });
            }
          } else {
            set((cur) => ({
              messages: cur.messages.map((m) =>
                pendingSends.some((p) => p.id === m.id)
                  ? {
                      ...m,
                      deliveryStatus: "failed",
                      error: "Sem conexão WhatsApp para enviar a automação",
                    }
                  : m,
              ),
            }));
          }
        }

        for (const req of pendingHttp) {
          void (async () => {
            const headers: Record<string, string> = {
              Accept: "application/json",
            };
            for (const h of req.headers) headers[h.key] = h.value;
            if (req.body && !headers["Content-Type"] && !headers["content-type"]) {
              headers["Content-Type"] = "application/json";
            }
            try {
              const res = await fetch(req.url, {
                method: req.method,
                headers,
                body: req.body && req.method !== "GET" && req.method !== "HEAD"
                  ? req.body
                  : undefined,
              });
              const text = await res.text();
              let json: unknown = null;
              try {
                json = JSON.parse(text) as unknown;
              } catch {
                json = { raw: text };
              }
              const pick = (obj: unknown, path: string): string => {
                if (!path.trim()) return "";
                const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
                let cur: unknown = obj;
                for (const p of parts) {
                  if (cur == null || typeof cur !== "object") return "";
                  cur = (cur as Record<string, unknown>)[p];
                }
                if (cur == null) return "";
                return typeof cur === "object" ? JSON.stringify(cur) : String(cur);
              };
              if (res.ok) {
                const mapped = Object.entries(req.fieldMap).filter(([, p]) => p.trim());
                if (mapped.length) {
                  for (const [fid, path] of mapped) {
                    get().setContactField(req.contactId, fid, pick(json, path));
                  }
                }
                get().pushConversationEvent(
                  req.conversationId,
                  `HTTP ${req.method} · ${res.status} ok`,
                );
              } else {
                get().pushConversationEvent(
                  req.conversationId,
                  `HTTP ${req.method} · falha ${res.status}`,
                );
              }
            } catch (err) {
              get().pushConversationEvent(
                req.conversationId,
                `HTTP ${req.method} · erro ${err instanceof Error ? err.message : "rede"}`,
              );
            }
          })();
        }

        return botCount;
      },

      moveDeal: (dealId, stageId) => {
        const deal = get().deals.find((d) => d.id === dealId);
        set((s) => ({
          deals: s.deals.map((d) =>
            d.id === dealId ? { ...d, stageId, daysInStage: 0 } : d,
          ),
        }));
        if (deal) {
          queueMicrotask(() =>
            runAutoEvent(get, deal.contactId, {
              type: "pipeline_stage",
              stageId,
            }),
          );
        }
      },

      addDeal: (contactId, title, stageId) => {
        const id = uid("d");
        set((s) => ({
          deals: [
            {
              id,
              contactId,
              title,
              stageId,
              value: 0,
              temperature: 50,
              daysInStage: 0,
              tagIds: [],
            },
            ...s.deals,
          ],
        }));
        queueMicrotask(() =>
          runAutoEvent(get, contactId, { type: "deal_created", stageId }),
        );
      },

      deleteDeal: (dealId) => {
        const deal = get().deals.find((d) => d.id === dealId);
        set((s) => ({ deals: s.deals.filter((d) => d.id !== dealId) }));
        if (deal) {
          queueMicrotask(() =>
            runAutoEvent(get, deal.contactId, {
              type: "deal_deleted",
              stageId: deal.stageId,
            }),
          );
        }
      },

      closeDeal: (dealId, outcome) => {
        const deal = get().deals.find((d) => d.id === dealId);
        if (!deal) return;
        set((s) => ({
          deals: s.deals.map((d) =>
            d.id === dealId ? { ...d, outcome } : d,
          ),
        }));
        queueMicrotask(() =>
          runAutoEvent(get, deal.contactId, {
            type: outcome === "ganho" ? "deal_won" : "deal_lost",
            stageId: deal.stageId,
          }),
        );
      },

      addStage: (name) => {
        const id = uid("s");
        const label = name.trim() || "Nova etapa";
        const tints = [
          "mint",
          "peach",
          "lilac",
          "sky",
          "sand",
          "cream",
          "gray",
        ];
        set((s) => {
          const max = s.stages.reduce((n, st) => Math.max(n, st.order), 0);
          return {
            stages: [
              ...s.stages,
              {
                id,
                name: label,
                order: max + 1,
                color: tints[s.stages.length % tints.length],
              },
            ],
          };
        });
        return id;
      },

      renameStage: (id, name) => {
        const label = name.trim();
        if (!label) return;
        set((s) => ({
          stages: s.stages.map((st) =>
            st.id === id ? { ...st, name: label } : st,
          ),
        }));
      },

      deleteStage: (id) => {
        const list = [...get().stages].sort((a, b) => a.order - b.order);
        if (list.length <= 1) return;
        const fallback = list.find((st) => st.id !== id);
        if (!fallback) return;
        set((s) => ({
          stages: s.stages
            .filter((st) => st.id !== id)
            .sort((a, b) => a.order - b.order)
            .map((st, i) => ({ ...st, order: i + 1 })),
          deals: s.deals.map((d) =>
            d.stageId === id ? { ...d, stageId: fallback.id, daysInStage: 0 } : d,
          ),
        }));
      },

      reorderStages: (fromId, toId) => {
        if (fromId === toId) return;
        set((s) => {
          const list = [...s.stages].sort((a, b) => a.order - b.order);
          const from = list.findIndex((st) => st.id === fromId);
          const to = list.findIndex((st) => st.id === toId);
          if (from < 0 || to < 0) return s;
          const next = [...list];
          const [item] = next.splice(from, 1);
          if (!item) return s;
          next.splice(to, 0, item);
          return {
            stages: next.map((st, i) => ({ ...st, order: i + 1 })),
          };
        });
      },

      setStageColor: (id, color) => {
        set((s) => ({
          stages: s.stages.map((st) =>
            st.id === id ? { ...st, color } : st,
          ),
        }));
      },

      createBroadcast: (data) => {
        const id = uid("bc");
        const audienceCount = countAudience(get().contacts, data.audience);
        const bc: Broadcast = {
          id,
          name: data.name,
          type: data.type,
          scheduledAt: data.scheduledAt,
          status: data.asDraft
            ? "rascunho"
            : data.type === "agendado"
              ? "agendado"
              : "rascunho",
          channel: data.channel ?? "whatsapp",
          folderId: data.folderId,
          templateId: data.templateId,
          audience: data.audience,
          audienceCount,
          metrics: emptyMetrics(),
          createdAt: new Date().toISOString(),
          followUpTagId: data.followUpTagId,
        };
        set((s) => ({ broadcasts: [bc, ...s.broadcasts] }));
        return id;
      },

      updateBroadcast: (id, patch) =>
        set((s) => ({
          broadcasts: s.broadcasts.map((b) =>
            b.id === id ? { ...b, ...patch } : b,
          ),
        })),

      deleteBroadcast: (id) =>
        set((s) => ({
          broadcasts: s.broadcasts.filter((b) => b.id !== id),
        })),

      trashBroadcast: (id) =>
        set((s) => ({
          broadcasts: s.broadcasts.map((b) =>
            b.id === id ? { ...b, trashed: true } : b,
          ),
        })),

      restoreBroadcast: (id) =>
        set((s) => ({
          broadcasts: s.broadcasts.map((b) =>
            b.id === id ? { ...b, trashed: false } : b,
          ),
        })),

      previewAudience: (audience) => filterAudience(get().contacts, audience),

      createBroadcastFolder: (name) => {
        const id = uid("bf");
        set((s) => ({
          broadcastFolders: [
            ...(s.broadcastFolders ?? []),
            { id, name: name.trim() },
          ],
        }));
        return id;
      },

      renameBroadcastFolder: (id, name) =>
        set((s) => ({
          broadcastFolders: (s.broadcastFolders ?? []).map((f) =>
            f.id === id ? { ...f, name: name.trim() } : f,
          ),
        })),

      deleteBroadcastFolder: (id) =>
        set((s) => ({
          broadcastFolders: (s.broadcastFolders ?? []).filter((f) => f.id !== id),
          broadcasts: s.broadcasts.map((b) =>
            b.folderId === id ? { ...b, folderId: undefined } : b,
          ),
        })),

      moveBroadcastFolder: (id, parentId) =>
        set((s) => ({
          broadcastFolders: (s.broadcastFolders ?? []).map((f) =>
            f.id === id ? { ...f, parentId: parentId || undefined } : f,
          ),
        })),

      reorderBroadcastFolders: (fromId, toId) =>
        set((s) => ({
          broadcastFolders: moveById(s.broadcastFolders ?? [], fromId, toId),
        })),

      reorderBroadcasts: (fromId, toId) =>
        set((s) => ({
          broadcasts: moveById(s.broadcasts, fromId, toId),
        })),

      ensureBroadcastFlow: (broadcastId) => {
        const s = get();
        const bc = s.broadcasts.find((b) => b.id === broadcastId);
        if (!bc) return "";
        if (bc.flowId && s.automations.some((a) => a.id === bc.flowId)) {
          return bc.flowId;
        }
        const id = uid("auto");
        const folderId = s.folders[0]?.id ?? "f1";
        const secondLabel =
          bc.channel === "sms"
            ? "SMS"
            : bc.channel === "call"
              ? "SMS e Áudio na Ligação"
              : "Envio de template";
        const auto: Automation = {
          id,
          name: `Fluxo · ${bc.name || "Broadcast"}`,
          folderId,
          active: false,
          source: "broadcast",
          updatedAt: new Date().toISOString(),
          nodes: [
            {
              id: "n_bc",
              type: "trigger",
              label: "Broadcast",
              x: 80,
              y: 160,
              config: { kind: "broadcast" },
            },
            {
              id: "n_tpl",
              type: bc.channel === "whatsapp" || !bc.channel ? "template" : "message",
              label: secondLabel,
              x: 400,
              y: 140,
              config: {
                msgKind: bc.channel === "whatsapp" || !bc.channel ? "template" : "session",
                sessionBlock: "text",
                templateId: bc.templateId ?? "",
                text: "",
              },
            },
          ],
          edges: [{ id: "e_bc", from: "n_bc", to: "n_tpl" }],
        };
        set((state) => ({
          automations: [auto, ...state.automations],
          broadcasts: state.broadcasts.map((b) =>
            b.id === broadcastId ? { ...b, flowId: id } : b,
          ),
        }));
        return id;
      },

      sendBroadcast: (id) => {
        const s = get();
        const bc = s.broadcasts.find((b) => b.id === id);
        if (!bc) return { count: 0, failed: 0 };
        const targets = filterAudience(s.contacts, bc.audience);
        const sent = targets.length;
        const failed = 0;
        const nowIso = new Date().toISOString();
        const agent = s.agents.find((a) => a.id === s.activeAgentId);
        const flowId = bc.flowId || get().ensureBroadcastFlow(id);

        set((state) => ({
          broadcasts: state.broadcasts.map((b) =>
            b.id === id
              ? {
                  ...b,
                  flowId,
                  status: "enviado" as const,
                  sentAt: nowIso,
                  metrics: {
                    ...b.metrics,
                    sent,
                    delivered: sent,
                    read: Math.max(0, Math.floor(sent * 0.7)),
                    failed,
                  },
                }
              : b,
          ),
          automations: state.automations.map((a) =>
            a.id === flowId ? { ...a, active: true } : a,
          ),
          audit: [
            {
              id: uid("au"),
              type: "Broadcast",
              status: "ok",
              count: sent,
              data: bc.name,
              author: agent?.name ?? "Atendente",
              createdAt: nowIso,
            },
            ...state.audit,
          ],
        }));

        for (const contact of targets) {
          const cvId = get().openConversationForContact(contact.id);
          get().executeAutomations({
            conversationId: cvId,
            contactId: contact.id,
            inboundText: "",
            forceAutomationId: flowId,
            event: { type: "broadcast", text: "" },
          });
        }

        return { count: sent, failed };
      },

      updateConnection: (id, patch) =>
        set((s) => ({
          connections: s.connections.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
          ),
        })),

      createConnection: (data) => {
        const id = uid("cx");
        const now = new Date().toISOString();
        const handle =
          data.handle?.trim() ||
          data.name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, ".")
            .replace(/^\.|\.$/g, "")
            .slice(0, 24) ||
          "nova.conexao";
        set((s) => ({
          connections: [
            {
              id,
              name: data.name.trim() || "Nova conexão",
              phone: data.phone?.trim() || "",
              handle,
              quality: "Alta",
              status: "configurando",
              verified: false,
              limit: "250 conversas/dia",
              scope: data.scope ?? "central",
              campoCode: data.campoCode,
              uniao: data.uniao,
              folderId: data.folderId,
              accountStatus: "Pendente",
              createdAt: now,
              updatedAt: now,
              messages24h: 0,
              conversationsOpen: 0,
              waba: emptyWaba(),
            },
            ...s.connections,
          ],
        }));
        return id;
      },

      trashConnection: (id) =>
        set((s) => ({
          connections: s.connections.map((c) =>
            c.id === id ? { ...c, trashed: true, updatedAt: new Date().toISOString() } : c,
          ),
        })),

      restoreConnection: (id) =>
        set((s) => ({
          connections: s.connections.map((c) =>
            c.id === id ? { ...c, trashed: false, updatedAt: new Date().toISOString() } : c,
          ),
        })),

      deleteConnection: (id) =>
        set((s) => ({
          connections: s.connections.filter((c) => c.id !== id),
          preferredConnectionId:
            s.preferredConnectionId === id ? null : s.preferredConnectionId,
        })),

      createConnectionFolder: (name) => {
        const id = uid("cg");
        set((s) => ({
          connectionFolders: [
            ...(s.connectionFolders ?? []),
            {
              id,
              name: name.trim(),
              status: "enabled",
              createdAt: new Date().toISOString(),
            },
          ],
        }));
        return id;
      },

      renameConnectionFolder: (id, name) =>
        set((s) => ({
          connectionFolders: (s.connectionFolders ?? []).map((f) =>
            f.id === id ? { ...f, name: name.trim(), updatedAt: new Date().toISOString() } : f,
          ),
        })),

      deleteConnectionFolder: (id) =>
        set((s) => ({
          connectionFolders: (s.connectionFolders ?? []).filter((f) => f.id !== id),
          connections: s.connections.map((c) =>
            c.folderId === id ? { ...c, folderId: undefined } : c,
          ),
        })),

      reorderConnectionFolders: (fromId, toId) =>
        set((s) => ({
          connectionFolders: moveById(s.connectionFolders ?? [], fromId, toId),
        })),

      updateWaba: (connectionId, patch) =>
        set((s) => ({
          connections: s.connections.map((c) => {
            if (c.id !== connectionId) return c;
            const base = c.waba ?? emptyWaba();
            return {
              ...c,
              waba: { ...base, ...patch, demoMode: false },
              status:
                c.status === "desconectado" ? "configurando" : c.status,
            };
          }),
        })),

      setConnectionStatus: (connectionId, status, extra) =>
        set((s) => ({
          connections: s.connections.map((c) =>
            c.id === connectionId
              ? {
                  ...c,
                  status,
                  verified: status === "conectado" ? true : c.verified,
                  ...extra,
                }
              : c,
          ),
        })),

      pushWebhookEvent: (ev) =>
        set((s) => ({
          webhookEvents: [
            {
              id: uid("wh"),
              createdAt: ev.createdAt ?? new Date().toISOString(),
              connectionId: ev.connectionId,
              type: ev.type,
              summary: ev.summary,
              payload: ev.payload,
              ok: ev.ok,
            },
            ...s.webhookEvents,
          ].slice(0, 200),
        })),

      clearWebhookEvents: (connectionId) =>
        set((s) => ({
          webhookEvents: connectionId
            ? s.webhookEvents.filter((e) => e.connectionId !== connectionId)
            : [],
        })),

      findConnectionByPhoneNumberId: (phoneNumberId) =>
        get().connections.find(
          (c) => c.waba?.phoneNumberId === phoneNumberId,
        ),

      markJornadaDone: (id) =>
        set((s) =>
          s.jornadaDone.includes(id)
            ? s
            : { jornadaDone: [...s.jornadaDone, id] },
        ),

      setBottleneckSettings: (patch) =>
        set((s) => ({
          bottleneckSettings: normalizeBottleneckSettings({
            ...s.bottleneckSettings,
            ...patch,
          }),
        })),

      setBottleneckRule: (toStep, patch) =>
        set((s) => ({
          bottleneckSettings: {
            ...s.bottleneckSettings,
            rules: s.bottleneckSettings.rules.map((r) =>
              r.toStep === toStep ? { ...r, ...patch } : r,
            ),
          },
        })),

      setMetaPlatform: (patch) =>
        set((s) => ({
          metaPlatform: { ...(s.metaPlatform ?? { appId: "", configId: "", appSecret: "" }), ...patch },
        })),

      createSede: (data) => {
        const code = data.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (!code) return "";
        if (get().sedes.some((s) => s.code === code)) return code;
        const nowName = data.name.trim() || code;
        const cxId = get().createConnection({
          name: `${code} · ${nowName}`,
          phone: data.whatsapp?.trim() || "",
          handle: `${code.toLowerCase()}.nt`,
          scope: "regional",
          campoCode: code,
          uniao: data.uniao.trim().toUpperCase(),
        });
        const sede: SedeRegional = {
          code,
          name: nowName,
          uniao: data.uniao.trim().toUpperCase() || "UNB",
          tipo: data.tipo,
          whatsapp: data.whatsapp?.trim() || "",
          handle: `${code.toLowerCase()}.nt`,
          connectionId: cxId,
          regiao: data.regiao.trim(),
        };
        set((s) => ({ sedes: [...s.sedes, sede] }));
        return code;
      },

      updateSede: (code, patch) => {
        set((s) => ({
          sedes: s.sedes.map((se) =>
            se.code === code ? { ...se, ...patch, code: se.code } : se,
          ),
        }));
        const sede = get().sedes.find((se) => se.code === code);
        if (sede?.connectionId) {
          get().updateConnection(sede.connectionId, {
            name: `${sede.code} · ${sede.name}`,
            phone: sede.whatsapp,
            handle: sede.handle,
            campoCode: sede.code,
            uniao: sede.uniao,
          });
        }
      },

      deleteSede: (code) => {
        const sede = get().sedes.find((se) => se.code === code);
        set((s) => ({
          sedes: s.sedes.filter((se) => se.code !== code),
          sessionScope:
            s.sessionScope.mode === "regional" && s.sessionScope.campoCode === code
              ? { mode: "central", campoCode: null }
              : s.sessionScope,
        }));
        if (sede?.connectionId) get().trashConnection(sede.connectionId);
      },

      setSecurityPin: (hash) => set({ securityPinHash: hash }),

      closeDay: (entry) =>
        set((s) => ({
          diario: [
            { ...entry, id: uid("dia") },
            ...s.diario,
          ],
          sessionLocked: true,
        })),

      unlockSession: () => set({ sessionLocked: false }),

      resetDemo: () => set(seed()),
    }),
    {
      name: "atendimento-nt-v17-name-fix",
      partialize: (s) => ({
        tags: s.tags,
        customFields: s.customFields,
        contacts: s.contacts,
        conversations: s.conversations,
        messages: s.messages,
        folders: s.folders,
        automations: s.automations,
        stages: s.stages,
        deals: s.deals,
        agents: s.agents,
        connections: s.connections,
        connectionFolders: s.connectionFolders,
        webhookEvents: s.webhookEvents,
        audit: s.audit,
        templates: s.templates,
        broadcasts: s.broadcasts,
        broadcastFolders: s.broadcastFolders,
        activeAgentId: s.activeAgentId,
        sessionScope: s.sessionScope,
        preferredConnectionId: s.preferredConnectionId,
        operationMode: s.operationMode,
        chatWallpaperId: s.chatWallpaperId,
        lastInboundConversationId: s.lastInboundConversationId,
        jornadaDone: s.jornadaDone,
        bottleneckSettings: s.bottleneckSettings,
        metaPlatform: s.metaPlatform,
        sedes: s.sedes,
        diario: s.diario,
        securityPinHash: s.securityPinHash,
        sessionLocked: s.sessionLocked,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CrmState>;
        const connections = (p.connections ?? current.connections).map(
          (cx) => {
            const seedCx = current.connections.find((c) => c.id === cx.id);
            return {
              ...cx,
              waba: cx.waba ?? emptyWaba(),
              folderId: cx.folderId ?? seedCx?.folderId,
              isDemo: cx.isDemo ?? seedCx?.isDemo,
              accountStatus:
                cx.accountStatus ??
                seedCx?.accountStatus ??
                (cx.verified ? "Aprovado" : "Pendente"),
            };
          },
        );
        return {
          ...current,
          ...p,
          connections,
          connectionFolders: p.connectionFolders ?? current.connectionFolders,
          broadcastFolders: p.broadcastFolders ?? current.broadcastFolders,
          bottleneckSettings: normalizeBottleneckSettings(
            p.bottleneckSettings ?? current.bottleneckSettings,
          ),
          metaPlatform: {
            appId: p.metaPlatform?.appId ?? current.metaPlatform?.appId ?? "",
            configId: p.metaPlatform?.configId ?? current.metaPlatform?.configId ?? "",
            appSecret: p.metaPlatform?.appSecret ?? current.metaPlatform?.appSecret ?? "",
          },
          sedes:
            p.sedes && p.sedes.length > 0 ? p.sedes : current.sedes,
          automations: uniqueById(p.automations ?? current.automations),
          diario: p.diario ?? current.diario,
          securityPinHash: p.securityPinHash ?? current.securityPinHash,
          sessionLocked: p.sessionLocked ?? current.sessionLocked,
          customFields: [
            ...(p.customFields ?? current.customFields),
            ...CUSTOM_FIELDS.filter(
              (f) =>
                !(p.customFields ?? current.customFields).some((x) => x.id === f.id),
            ),
          ],
        };
      },
    },
  ),
);
