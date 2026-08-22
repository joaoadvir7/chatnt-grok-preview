export type Tag = {
  id: string;
  name: string;
  color: string;
};

export type CustomFieldDef = {
  id: string;
  name: string;
  type: "text" | "select" | "date";
  options?: string[];
};

export type Contact = {
  id: string;
  name: string;
  /** Nome do perfil WhatsApp (Meta contacts.profile.name) */
  waProfileName?: string;
  phone: string;
  email?: string;
  createdAt: string;
  tagIds: string[];
  customFields: Record<string, string>;
  notes: Note[];
  assignee?: string;
  status: "open" | "pending" | "resolved";
  /** WhatsApp / conexão que originou o lead (sede regional) */
  connectionId?: string;
  /** true = dado de demonstração (oculto em operação real) */
  isDemo?: boolean;
  /** Saiu de broadcasts / OptOut */
  optedOut?: boolean;
};

export type Note = {
  id: string;
  text: string;
  author: string;
  createdAt: string;
};

export type ConversationEvent = {
  id: string;
  at: string;
  text: string;
};

export type Conversation = {
  id: string;
  contactId: string;
  lastMessageAt: string;
  unread: number;
  queue: "novos" | "meus" | "ia" | "finalizados";
  assignee?: string;
  responded?: boolean;
  events?: ConversationEvent[];
  automationsPaused?: boolean;
  iaPaused?: boolean;
  waitingFlow?: {
    automationId: string;
    nodeId: string;
    usedLabels?: string[];
    stackIndex?: number;
  };
};

export type MessageDeliveryStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export type MessageMediaKind =
  | "image"
  | "audio"
  | "document"
  | "automation"
  | "video"
  | "template";

export type Message = {
  id: string;
  conversationId: string;
  from: "contact" | "agent" | "bot" | "system";
  text: string;
  createdAt: string;
  author?: string;
  connectionId?: string;
  deliveryStatus?: MessageDeliveryStatus;
  wamid?: string;
  error?: string;
  mediaKind?: MessageMediaKind;
  mediaName?: string;
  mediaUrl?: string;
  mediaMime?: string;
  mediaDurationSec?: number;
  header?: string;
  footer?: string;
  replyButtons?: { id: string; label: string; url?: string }[];
};

export type FlowNodeType =
  | "trigger"
  | "message"
  | "template"
  | "tag"
  | "fields"
  | "http"
  | "condition"
  | "delay"
  | "crm"
  | "assign"
  | "finalize"
  | "forward"
  | "optout"
  | "random"
  | "system"
  | "conversion"
  | "call"
  | "sheets";

export type FlowNode = {
  id: string;
  type: FlowNodeType;
  label: string;
  x: number;
  y: number;
  config: Record<string, string>;
};

export type FlowEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
};

export type AutomationFolder = {
  id: string;
  name: string;
  parentId?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: "enabled" | "disabled";
};

export type Automation = {
  id: string;
  name: string;
  folderId: string;
  active: boolean;
  updatedAt: string;
  createdAt?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  isDemo?: boolean;
  trashed?: boolean;
  source?: "broadcast" | "automation";
  runCount?: number;
  lastRunAt?: string;
};

export type PipelineStage = {
  id: string;
  name: string;
  order: number;
  color?: string;
};

export type Deal = {
  id: string;
  contactId: string;
  title: string;
  stageId: string;
  value: number;
  temperature: number;
  daysInStage: number;
  tagIds: string[];
  outcome?: string;
  assignee?: string;
};

export type AgentRole = "central" | "regional";

export type Agent = {
  id: string;
  name: string;
  email: string;
  area: string;
  online: boolean;
  role: AgentRole;
  /** Código do campo (ex.: ANPA) — obrigatório se role = regional */
  campoCode?: string;
};

/** Status da conexão WhatsApp Cloud API */
export type WabaStatus =
  | "desconectado"
  | "configurando"
  | "conectado"
  | "erro"
  | "token_expirado";

/** Credenciais e estado da integração Meta / WhatsApp Business */
export type WabaConfig = {
  /** App ID do Meta for Developers */
  appId: string;
  /** WhatsApp Business Account ID */
  wabaId: string;
  /** Phone Number ID (não é o número E.164) */
  phoneNumberId: string;
  /** Token permanente (System User) ou de teste — nunca exibir completo */
  accessToken: string;
  /** Verify token do webhook (você define) */
  webhookVerifyToken: string;
  /** Última validação com Graph API */
  lastValidatedAt?: string;
  /** Nome verificado retornado pela Meta */
  verifiedName?: string;
  /** Mensagem de erro da última tentativa */
  lastError?: string;
  /** true = só simulação local (sem chamar Graph) */
  demoMode: boolean;
  /** Número também no WhatsApp Business App (coexistência oficial) */
  coexistence?: boolean;
  /** Ice breakers (iniciadores) publicados neste número */
  iceBreakers?: string[];
};

/** App Meta usado no Embedded Signup (painel “Continuar como…”) */
export type MetaPlatform = {
  appId: string;
  configId: string;
  appSecret: string;
};

export type ConnectionFolder = {
  id: string;
  name: string;
  parentId?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: "enabled" | "disabled";
};

export type Connection = {
  id: string;
  name: string;
  phone: string;
  handle: string;
  quality: "Alta" | "Média" | "Baixa";
  status: WabaStatus;
  verified: boolean;
  limit: string;
  scope: "central" | "regional";
  campoCode?: string;
  uniao?: string;
  folderId?: string;
  accountStatus?: string;
  createdAt?: string;
  updatedAt?: string;
  messages24h?: number;
  conversationsOpen?: number;
  waba?: WabaConfig;
  isDemo?: boolean;
  trashed?: boolean;
};

export type WebhookEvent = {
  id: string;
  connectionId: string;
  type: string;
  summary: string;
  payload: string;
  createdAt: string;
  ok: boolean;
};

export type AuditEntry = {
  id: string;
  type: string;
  status: string;
  count: number;
  data: string;
  author: string;
  createdAt: string;
};

export type MessageTemplate = {
  id: string;
  name: string;
  category: string;
  status: string;
  body: string;
  buttons: string[];
  language: string;
};

export type BroadcastChannel = "whatsapp" | "sms" | "call";

export type BroadcastAudience = {
  includeTagIds: string[];
  excludeTagIds: string[];
  tagMode: "any" | "all";
  fieldId?: string;
  fieldValue?: string;
  stageId?: string;
  window?: "any" | "open" | "closed";
};

export type BroadcastFolder = {
  id: string;
  name: string;
  parentId?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: "enabled" | "disabled";
};

export type BroadcastMetrics = {
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  clicks: number;
};

export type Broadcast = {
  id: string;
  name: string;
  type: "imediato" | "agendado";
  status: "rascunho" | "agendado" | "enviado" | "pausado";
  channel: BroadcastChannel;
  folderId?: string;
  templateId?: string;
  audience: BroadcastAudience;
  audienceCount: number;
  metrics: BroadcastMetrics;
  createdAt: string;
  sentAt?: string;
  scheduledAt?: string;
  followUpTagId?: string;
  flowId?: string;
  trashed?: boolean;
};

export type SessionScope = {
  mode: "central" | "regional";
  campoCode: string | null;
};

export type DiarioCheck = {
  id: string;
  label: string;
  done: boolean;
};

export type DiarioEntry = {
  id: string;
  date: string;
  closedAt: string;
  summary: string;
  notes: string;
  checklist: DiarioCheck[];
  author: string;
};

export const DEFAULT_DIARIO_CHECKS: DiarioCheck[] = [
  { id: "tokens", label: "Tokens da Meta não ficaram visíveis na tela", done: false },
  { id: "conexoes", label: "Conexões WhatsApp conferidas", done: false },
  { id: "autos", label: "Automações ativas conferidas", done: false },
  { id: "live", label: "Fila do Live Chat conferida", done: false },
  { id: "diario", label: "Diário do dia preenchido", done: false },
];
