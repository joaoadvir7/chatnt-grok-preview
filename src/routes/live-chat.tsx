import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  User,
  Users,
  List,
  Bell,
  Bot,
  Check,
  CheckCheck,
  ChevronDown,
  ClipboardList,
  Clock,
  Columns3,
  FileText,
  FormInput,
  Kanban,
  Loader2,
  MoreVertical,
  Phone,
  History,
  Download,
  Sparkles,
  Trash2,
  Ban,
  MailOpen,
  MessageSquare,
  CircleCheck,
  Smile,
  Paperclip,
  Mic,
  Slash,
  Image,
  Workflow,
  File,
  Square,
  Filter,
  ArrowUpDown,
  Menu,
  Palette,
  Pencil,
  Settings,
  Tag,
  ArrowRightLeft,
  RotateCcw,
  Search,
  Plus,
  Send,
  StickyNote,
  TriangleAlert,
  X,
  Radio,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useDismissOnOutside } from "@/hooks/use-dismiss-on-outside";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { IceBreakers } from "@/components/live-chat/IceBreakers";
import { interpolateText } from "@/lib/interpolate";
import { VarInsert } from "@/components/automation/MessageComposer";
import { Avatar } from "@/components/Avatar";
import { RelativeTime } from "@/components/RelativeTime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import { useCrmStore } from "@/lib/store";
import { useScopedData } from "@/lib/useScopedData";
import { cn, formatPhone } from "@/lib/utils";
import { sendWabaTemplate, sendWabaTextMessage } from "@/lib/whatsapp-api";
import type { Connection, CustomFieldDef, Message, MessageDeliveryStatus } from "@/lib/types";
import { wabaReady } from "@/lib/whatsapp";

type LiveChatSearch = { cv?: string };

export const Route = createFileRoute("/live-chat")({
  validateSearch: (s: Record<string, unknown>): LiveChatSearch => ({
    cv: typeof s.cv === "string" ? s.cv : undefined,
  }),
  component: LiveChatPage,
});

type QueueTab = "novos" | "meus" | "ia" | "finalizados" | "todas" | "agent";

const CHAT_WALLPAPERS = [
  {
    id: "oficial",
    label: "WhatsApp oficial",
    className: "wa-wp-oficial",
    swatch: "#efeae2",
    preview: "/wallpapers/whatsapp-oficial.png?v=3",
  },
  {
    id: "doodle",
    label: "Cinza Claro WhatsApp",
    className: "wa-wp-doodle",
    swatch: "#efeae2",
    preview: "/wallpapers/whatsapp-oficial.png?v=3",
  },
  { id: "classic", label: "Clássico", className: "wa-wp-classic", swatch: "#eae6df" },
  { id: "areia", label: "Areia", className: "wa-wp-areia", swatch: "#efe6dd" },
  { id: "verde", label: "Verde suave", className: "wa-wp-verde-suave", swatch: "#dce8e0" },
  { id: "nt", label: "Novo Tempo", className: "wa-wp-nt", swatch: "#e2efe8" },
  { id: "oliva", label: "Oliva", className: "wa-wp-oliva", swatch: "#cfd9c8" },
  { id: "ceu", label: "Céu", className: "wa-wp-ceu", swatch: "#c5e4f3" },
  { id: "rosa", label: "Rosa", className: "wa-wp-rosa", swatch: "#f5e6ea" },
  { id: "minimal", label: "Minimal", className: "wa-wp-minimal", swatch: "#f0f2f5" },
  { id: "noite", label: "Noite", className: "wa-wp-noite", swatch: "#0b141a" },
] as const;

const QUICK_REPLIES: { id: string; shortcut: string; title: string; text: string }[] = [
  {
    id: "qr1",
    shortcut: "oi",
    title: "Saudação",
    text: "Olá! Que alegria seu contato 😊 Sou da equipe ChatNT / Escola Bíblica Novo Tempo. Como posso te ajudar agora?",
  },
  {
    id: "qr2",
    shortcut: "estudo",
    title: "Estudos bíblicos",
    text: "Temos estudos bíblicos gratuitos. Posso te ajudar a começar hoje mesmo!",
  },
  {
    id: "qr3",
    shortcut: "visita",
    title: "Agendar visita",
    text: "Posso agendar uma visita da sede regional. Qual o melhor dia e horário para você?",
  },
];

function isRealCloud(c?: Connection | null) {
  return Boolean(c && wabaReady(c.waba));
}

function resolveConnection(
  contactCxId: string | undefined,
  connections: Connection[],
  opts: { preferredId?: string | null; sedeConnectionId?: string },
) {
  const ranked = connections.filter(Boolean);
  if (contactCxId) {
    const exact = ranked.find((c) => c.id === contactCxId);
    if (exact) return exact;
  }
  if (opts.preferredId) {
    const pref = ranked.find((c) => c.id === opts.preferredId);
    if (pref) return pref;
  }
  if (opts.sedeConnectionId) {
    const bySede = ranked.find((c) => c.id === opts.sedeConnectionId);
    if (bySede) return bySede;
  }
  return ranked[0] ?? connections[0];
}

function LiveChatPage() {
  const t = useT();
  const { cv: cvFromUrl } = Route.useSearch();
  const navigate = useNavigate();
  const { conversations, contacts, messages, sede, connections } = useScopedData();
  const tags = useCrmStore((s) => s.tags);
  const customFields = useCrmStore((s) => s.customFields);
  const templates = useCrmStore((s) => s.templates);
  const automations = useCrmStore((s) => s.automations);
  const executeAutomations = useCrmStore((s) => s.executeAutomations);
  const sendMessage = useCrmStore((s) => s.sendMessage);
  const updateMessageDelivery = useCrmStore((s) => s.updateMessageDelivery);
  const markRead = useCrmStore((s) => s.markConversationRead);
  const setQueue = useCrmStore((s) => s.setConversationQueue);
  const markUnread = useCrmStore((s) => s.markConversationUnread);
  const markResponded = useCrmStore((s) => s.markConversationResponded);
  const patchConversation = useCrmStore((s) => s.patchConversation);
  const pushConversationEvent = useCrmStore((s) => s.pushConversationEvent);
  const deleteConversation = useCrmStore((s) => s.deleteConversation);
  const addDeal = useCrmStore((s) => s.addDeal);
  const moveDeal = useCrmStore((s) => s.moveDeal);
  const stages = useCrmStore((s) => s.stages);
  const deals = useCrmStore((s) => s.deals);
  const assignConversation = useCrmStore((s) => s.assignConversation);
  const agentsAll = useCrmStore((s) => s.agents);
  const activeAgentId = useCrmStore((s) => s.activeAgentId);
  const addNote = useCrmStore((s) => s.addNote);
  const deleteNote = useCrmStore((s) => s.deleteNote);
  const addTag = useCrmStore((s) => s.addTag);
  const updateContact = useCrmStore((s) => s.updateContact);
  const setField = useCrmStore((s) => s.setContactField);
  const preferredConnectionId = useCrmStore((s) => s.preferredConnectionId);
  const setPreferredConnection = useCrmStore((s) => s.setPreferredConnection);
  const chatWallpaperId = useCrmStore((s) => s.chatWallpaperId);
  const setChatWallpaper = useCrmStore((s) => s.setChatWallpaper);
  const openConversationForContact = useCrmStore((s) => s.openConversationForContact);
  const addContact = useCrmStore((s) => s.addContact);
  const addCustomField = useCrmStore((s) => s.addCustomField);
  const lastInboundConversationId = useCrmStore((s) => s.lastInboundConversationId);

  const [tab, setTab] = useState<QueueTab>("meus");
  const [filterAgentId, setFilterAgentId] = useState<string | null>(null);
  const [panelSections, setPanelSections] = useState<Record<string, boolean>>({
    notes: false,
    reminders: false,
    activities: false,
    ia: false,
    fields: false,
    crm: false,
    tags: false,
  });
  function togglePanelSection(id: string) {
    setPanelSections((s) => ({ ...s, [id]: !s[id] }));
  }
  const [q, setQ] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const userOpenedPanel = useRef(false);
  const [tagQuery, setTagQuery] = useState("");
  const [tagDraftIds, setTagDraftIds] = useState<string[]>([]);
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [showHeaderTags, setShowHeaderTags] = useState(() => {
    try {
      return localStorage.getItem("chatnt-show-header-tags") !== "0";
    } catch {
      return true;
    }
  });
  function toggleHeaderTags() {
    setShowHeaderTags((v) => {
      const next = !v;
      try {
        localStorage.setItem("chatnt-show-header-tags", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }
  const [draft, setDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showAutomations, setShowAutomations] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [showGearMenu, setShowGearMenu] = useState(false);
  const [iceOpen, setIceOpen] = useState(false);
  const [showQueueMenu, setShowQueueMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showConvFilter, setShowConvFilter] = useState(false);
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [gearSub, setGearSub] = useState<string | null>(null);
  const [chatMenuSub, setChatMenuSub] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"recent" | "oldest">("recent");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterSection, setFilterSection] = useState<"tags" | "status" | "data" | "crm">("tags");
  const [filterIncludeTags, setFilterIncludeTags] = useState<string[]>([]);
  const [filterExcludeTags, setFilterExcludeTags] = useState<string[]>([]);
  const [filterTagMode, setFilterTagMode] = useState<"or" | "and">("or");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const dismissFloating = useCallback(() => {
    setShowGearMenu(false);
    setShowQueueMenu(false);
    setShowSortMenu(false);
    setShowChatMenu(false);
    setShowConvFilter(false);
    setShowWallpaperPicker(false);
    setGearSub(null);
    setChatMenuSub(null);
  }, []);
  useDismissOnOutside(dismissFloating, showGearMenu || showQueueMenu || showSortMenu || showChatMenu || showConvFilter || showWallpaperPicker);

  useEffect(() => {
    if (cvFromUrl) setActiveId(cvFromUrl);
  }, [cvFromUrl]);

  useEffect(() => {
    if (lastInboundConversationId && !activeId) setActiveId(lastInboundConversationId);
  }, [lastInboundConversationId, activeId]);

  const enriched = useMemo(() => {
    return conversations.map((cv) => {
      const contact = contacts.find((c) => c.id === cv.contactId);
      const last = messages
        .filter((m) => m.conversationId === cv.id && !isChatNoise(m))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      return { cv, contact, last };
    });
  }, [conversations, contacts, messages]);

  const convFilterActiveCount =
    filterIncludeTags.length + filterExcludeTags.length;

  const list = enriched
    .filter(({ cv, contact }) => {
      if (!contact) return false;
      if (tab === "novos" && cv.queue !== "novos") return false;
      if (tab === "meus") {
        if (cv.queue !== "meus" || cv.assignee !== activeAgentId) return false;
      }
      if (tab === "ia" && cv.queue !== "ia") return false;
      if (tab === "finalizados" && cv.queue !== "finalizados") return false;
      if (tab === "agent") {
        if (!filterAgentId || cv.assignee !== filterAgentId) return false;
        if (cv.queue === "finalizados") return false;
      }
      if (q.trim()) {
        const s = q.toLowerCase();
        if (
          !contact.name.toLowerCase().includes(s) &&
          !contact.phone.includes(s)
        )
          return false;
      }
      const tagIds = contact.tagIds ?? [];
      if (filterIncludeTags.length) {
        const hits = filterIncludeTags.filter((id) => tagIds.includes(id));
        if (filterTagMode === "and") {
          if (hits.length !== filterIncludeTags.length) return false;
        } else if (hits.length === 0) return false;
      }
      if (filterExcludeTags.some((id) => tagIds.includes(id))) return false;
      return true;
    })
    .sort((a, b) => {
      const ta = new Date(a.cv.lastMessageAt).getTime();
      const tb = new Date(b.cv.lastMessageAt).getTime();
      return sortOrder === "oldest" ? ta - tb : tb - ta;
    });

  const active = enriched.find((x) => x.cv.id === activeId) ?? null;

  const activeCx = useMemo(
    () =>
      resolveConnection(active?.contact?.connectionId, connections, {
        preferredId: preferredConnectionId,
        sedeConnectionId: sede?.connectionId,
      }),
    [active, connections, sede, preferredConnectionId],
  );

  const sendLineReady = isRealCloud(activeCx);
  const cloudConfigured = Boolean(activeCx && wabaReady(activeCx.waba));

  const thread = useMemo(() => {
    if (!activeId) return [];
    return messages
      .filter((m) => m.conversationId === activeId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages, activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length, activeId]);

  useEffect(() => {
    if (activeId) markRead(activeId);
  }, [activeId, markRead]);

  function selectConversation(id: string) {
    setActiveId(id);
    if (!userOpenedPanel.current) setPanelOpen(false);
    markRead(id);
  }

  function toggleSelect(id: string) {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }
  function selectAllVisible() {
    const ids = list.map((x) => x.cv.id);
    setSelectedIds((prev) =>
      ids.length && ids.every((id) => prev.includes(id)) ? [] : ids,
    );
  }

  function takeAttendance() {
    if (!active) return;
    const me = agentsAll.find((a) => a.id === activeAgentId);
    const fresh = useCrmStore.getState().conversations.find((c) => c.id === active.cv.id);
    if (fresh?.assignee && fresh.assignee !== activeAgentId && fresh.queue !== "finalizados") {
      const who = agentsAll.find((a) => a.id === fresh.assignee)?.name ?? "outro atendente";
      toast.error(`Já está com ${who}`);
      return;
    }
    assignConversation(active.cv.id, activeAgentId);
    setQueue(active.cv.id, "meus");
    pushConversationEvent(active.cv.id, `${me?.name ?? "Atendente"} pegou o atendimento`);
    toast.success("Atendimento com você");
  }

  async function handleSend() {
    if (!activeId || !active?.contact || !draft.trim() || sending) return;
    const agentName = agentsAll.find((a) => a.id === activeAgentId)?.name;
    const text = interpolateText(draft.trim(), active.contact, {
      agentName,
      fields: customFields,
    });
    setDraft("");
    setSending(true);
    const mid = sendMessage(activeId, text, {
      from: "agent",
      author: agentName,
      connectionId: activeCx?.id,
      deliveryStatus: sendLineReady ? "pending" : "sent",
    });
    if (sendLineReady && activeCx?.waba) {
      try {
        const res = await sendWabaTextMessage({
          data: {
            accessToken: activeCx.waba.accessToken!,
            phoneNumberId: activeCx.waba.phoneNumberId!,
            demoMode: false,
            to: active.contact.phone.replace(/\D/g, ""),
            text: text.slice(0, 1000),
          },
        });
        if (res.ok) {
          updateMessageDelivery(mid, { deliveryStatus: "sent", wamid: (res as { wamid?: string }).wamid });
        } else {
          updateMessageDelivery(mid, { deliveryStatus: "failed", error: res.error });
          toast.error(res.error || "Falha ao enviar");
        }
      } catch (e) {
        updateMessageDelivery(mid, { deliveryStatus: "failed", error: String(e) });
      }
    }
    setSending(false);
  }

  async function handleSendTemplate(templateId: string) {
    if (!activeId || !active?.contact) return;
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    const mid = sendMessage(activeId, tpl.body, {
      from: "agent",
      author: "Template",
      connectionId: activeCx?.id,
      deliveryStatus: "pending",
      mediaKind: "template",
      mediaName: tpl.name,
    });
    if (sendLineReady && activeCx?.waba) {
      const res = await sendWabaTemplate({
        data: {
          accessToken: activeCx.waba.accessToken!,
          phoneNumberId: activeCx.waba.phoneNumberId!,
          demoMode: false,
          to: active.contact.phone.replace(/\D/g, ""),
          templateName: tpl.name,
          language: "pt_BR",
        },
      });
      if (res.ok) updateMessageDelivery(mid, { deliveryStatus: "sent" });
      else {
        updateMessageDelivery(mid, { deliveryStatus: "failed", error: res.error });
        toast.error(res.error || "Template não enviado");
      }
    }
    setShowTemplates(false);
  }

  function sendAutomation(autoId: string) {
    if (!activeId || !active?.contact) return;
    const auto = automations.find((a) => a.id === autoId);
    if (!auto) return;
    if (active.cv.automationsPaused) {
      toast.error("Automações pausadas nesta conversa");
      return;
    }
    const n = executeAutomations({
      conversationId: activeId,
      contactId: active.contact.id,
      inboundText: " ",
      forceAutomationId: autoId,
    });
    setShowAutomations(false);
    toast.success(
      n > 0
        ? `Automação “${auto.name}” enviada`
        : `Automação “${auto.name}” acionada`,
    );
  }

  function openNewChatByPhone() {
    const phone = newPhone.replace(/\D/g, "");
    if (phone.length < 10) {
      toast.error("Informe o WhatsApp");
      return;
    }
    const existing = contacts.find((c) => c.phone.replace(/\D/g, "").endsWith(phone.slice(-8)));
    const contactId =
      existing?.id ??
      addContact({
        name: newContactName.trim() || formatPhone(phone),
        phone,
      });
    if (newContactName.trim() && existing) {
      updateContact(existing.id, { name: newContactName.trim() });
    }
    const id = openConversationForContact(contactId);
    setActiveId(id);
    setShowNewChat(false);
    setNewContactName("");
    setNewPhone("");
    toast.success("Conversa aberta");
  }

  function applyQuickReply(text: string) {
    setDraft(text);
    setShowQuickReplies(false);
  }
  function filteredQuickReplies() {
    const s = draft.replace(/^\//, "").toLowerCase();
    if (!s) return QUICK_REPLIES;
    return QUICK_REPLIES.filter(
      (r) => r.shortcut.includes(s) || r.title.toLowerCase().includes(s),
    );
  }

  function suggestReplyWithIA() {
    if (!active || aiSuggesting) return;
    setAiSuggesting(true);
    const lastIn = [...thread].reverse().find((m) => m.from === "contact");
    const hint = lastIn?.text ?? "saudação";
    setDraft(
      `Olá, ${active.contact?.name.split(" ")[0]}! Recebi sua mensagem sobre “${hint.slice(0, 40)}”. Como posso te ajudar agora?`,
    );
    setTimeout(() => setAiSuggesting(false), 400);
    toast.success("Sugestão de IA no campo");
  }

  async function startAudioRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        if (activeId) {
          sendMessage(activeId, "Áudio", {
            from: "agent",
            mediaKind: "audio",
            mediaUrl: url,
            mediaDurationSec: recordSec,
          });
        }
      };
      rec.start();
      mediaRecorderRef.current = rec;
      setRecording(true);
      setRecordSec(0);
    } catch {
      toast.error("Não foi possível gravar áudio");
    }
  }
  function stopAudioRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    mediaRecorderRef.current = null;
  }
  function toggleAudioRecording() {
    if (recording) stopAudioRecording();
    else void startAudioRecording();
  }

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setRecordSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !activeId) return;
    const url = URL.createObjectURL(file);
    const kind = file.type.startsWith("image/") ? "image" : "document";
    sendMessage(activeId, file.name, {
      from: "agent",
      mediaKind: kind,
      mediaName: file.name,
      mediaUrl: url,
      mediaMime: file.type,
    });
  }

  function closeChatWindow() {
    setActiveId(null);
    setShowChatMenu(false);
  }

  function exportActiveConversation() {
    if (!active) return;
    const lines = thread.map((m) => `[${m.createdAt}] ${m.from}: ${m.text}`).join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `conversa-${active.contact?.name ?? "chat"}.txt`;
    a.click();
    setShowChatMenu(false);
  }

  function assignToPipeline(stageId: string) {
    if (!active?.contact) return;
    addDeal(active.contact.id, active.contact.name, stageId);
    toast.success("Atribuído ao pipeline");
    setShowChatMenu(false);
    setChatMenuSub(null);
  }

  const counts = {
    novos: conversations.filter((c) => c.queue === "novos").length,
    meus: conversations.filter(
      (c) => c.queue === "meus" && c.assignee === activeAgentId,
    ).length,
    ia: conversations.filter((c) => c.queue === "ia").length,
    finalizados: conversations.filter((c) => c.queue === "finalizados").length,
    todas: conversations.length,
  };
  const agentQueueCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of agentsAll) map.set(a.id, 0);
    for (const cv of conversations) {
      if (cv.queue === "finalizados" || cv.queue === "ia") continue;
      if (cv.assignee && map.has(cv.assignee)) {
        map.set(cv.assignee, (map.get(cv.assignee) ?? 0) + 1);
      }
    }
    return map;
  }, [conversations, agentsAll]);
  const meAgent = agentsAll.find((a) => a.id === activeAgentId);
  const meCount = (meAgent ? agentQueueCounts.get(meAgent.id) : 0) ?? counts.meus;
  const wallpaperClass =
    CHAT_WALLPAPERS.find((w) => w.id === chatWallpaperId)?.className ?? "wa-wp-doodle";

  function runBulkFinalize() {
    selectedIds.forEach((id) => setQueue(id, "finalizados"));
    toast.success("Finalizadas");
    setShowGearMenu(false);
  }
  function runBulkReopen() {
    selectedIds.forEach((id) => setQueue(id, "meus"));
    toast.success("Reabertas");
    setShowGearMenu(false);
  }

  function saveTags() {
    if (!active?.contact) return;
    updateContact(active.contact.id, { tagIds: tagDraftIds });
    setPanelSections((s) => ({ ...s, tags: false }));
    setTagQuery("");
    setShowCreateTag(false);
    toast.success("Tags salvas");
  }

  function createNewTag() {
    const name = tagQuery.trim();
    if (!name) {
      setShowCreateTag(true);
      return;
    }
    const colors = ["#25d366", "#128c7e", "#e67e22", "#2980b9", "#8e44ad", "#c0392b"];
    addTag(name, colors[tags.length % colors.length]!);
    const created = useCrmStore.getState().tags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (created && !tagDraftIds.includes(created.id)) {
      setTagDraftIds((ids) => [...ids, created.id]);
    }
    setTagQuery("");
    setShowCreateTag(false);
  }

  const canCompose =
    !!active &&
    active.cv.queue !== "finalizados" &&
    active.cv.assignee === activeAgentId;

  if (iceOpen) {
    return (
      <AppShell title="Iniciadores de conversa" fullBleed>
        <IceBreakers onBack={() => setIceOpen(false)} />
      </AppShell>
    );
  }

  return (
    <AppShell
      title={t("page.liveChat")}
      fullBleed
      actions={
        <div className="flex min-w-0 items-center gap-2">
          <select
            className="hidden h-8 max-w-[200px] truncate rounded-full border border-[#e5ebe8] bg-white px-3 text-[12px] text-[#5c6b64] sm:block"
            title="Número de envio (Cloud API)"
            value={
              preferredConnectionId && connections.some((c) => c.id === preferredConnectionId)
                ? preferredConnectionId
                : (activeCx?.id ?? connections[0]?.id ?? "")
            }
            onChange={(e) => {
              setPreferredConnection(e.target.value || null);
              if (active?.contact) updateContact(active.contact.id, { connectionId: e.target.value });
            }}
          >
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.phone}
                {isRealCloud(c) ? "" : " · config"}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            className="h-8 rounded-full bg-[#25d366] px-3 text-xs text-[#075e54] hover:bg-[#1ebe5d]"
            onClick={() => setShowNewChat((v) => !v)}
          >
            Nova conversa
          </Button>
        </div>
      }
    >
      <div className="flex h-full min-h-0 flex-col bg-[#e5ddd5]">
        {showNewChat && (
          <div className="shrink-0 border-b border-[#e5ebe8] bg-white px-3 py-2.5 sm:px-4">
            <div className="mx-auto flex max-w-[1600px] flex-wrap items-end gap-2">
              <label className="min-w-[140px] flex-1 text-xs">
                <span className="text-[#8a9690]">Nome</span>
                <Input className="mt-0.5 h-9 rounded-xl text-sm" placeholder="Ex.: João Silva" value={newContactName} onChange={(e) => setNewContactName(e.target.value)} />
              </label>
              <label className="min-w-[140px] flex-1 text-xs">
                <span className="text-[#8a9690]">WhatsApp</span>
                <Input className="mt-0.5 h-9 rounded-xl font-mono text-sm" placeholder="5591999999999" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
              </label>
              <Button size="sm" className="h-9 rounded-full bg-[#25d366] text-[#075e54] hover:bg-[#1ebe5d]" onClick={openNewChatByPhone}>
                Abrir
              </Button>
              <Button size="sm" variant="ghost" className="h-9" onClick={() => setShowNewChat(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}

        <div className="lc-shell relative flex min-h-0 flex-1">
          <aside className={cn("lc-card relative z-20 flex w-[min(100%,340px)] shrink-0 flex-col sm:w-[380px]", showConvFilter && "z-40")}>
            <div className="shrink-0 space-y-2.5 p-3">
              <div className="flex items-center gap-2">
                <div className="lc-tabs min-w-0 flex-1">
                  {([["novos", t("lc.novos")], ["meus", t("lc.meus")]] as const).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setTab(id);
                        setFilterAgentId(null);
                        setShowQueueMenu(false);
                      }}
                      data-active={tab === id}
                      className="lc-tab"
                    >
                      {label} ({counts[id]})
                    </button>
                  ))}
                </div>
                <div className="relative shrink-0" data-menu>
                  <button
                    type="button"
                    onClick={() => setShowQueueMenu((v) => !v)}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full border border-[#e5ebe8] bg-white text-[#1a2e24] shadow-sm hover:bg-[#f5faf7]",
                      (tab === "todas" || tab === "ia" || tab === "finalizados" || tab === "agent" || showQueueMenu) &&
                        "border-[#25d366] bg-[#e8f7ee] text-[#128c7e]",
                    )}
                    title="Mais filas"
                  >
                    <Menu className="size-4" />
                  </button>
                  {showQueueMenu && (
                    <div className="absolute top-full right-0 z-40 mt-1.5 max-h-[min(70vh,420px)] w-[280px] overflow-y-auto rounded-xl border border-[#e5ebe8] bg-white py-1 shadow-[0_8px_24px_rgb(15_40_30/0.12)]">
                      {meAgent && (
                        <button type="button" onClick={() => { setTab("agent"); setFilterAgentId(meAgent.id); setShowQueueMenu(false); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] hover:bg-[#f5faf7]">
                          <User className="size-3.5 text-[#0d9f4f]" />
                          <span className="min-w-0 flex-1 truncate">Eu vejo · {meAgent.name}</span>
                          <span className="text-[12px] text-[#8a9690]">({meCount})</span>
                        </button>
                      )}
                      <div className="my-1 border-t border-[#eef1ef]" />
                      {agentsAll.map((a) => (
                        <button key={a.id} type="button" onClick={() => { setTab("agent"); setFilterAgentId(a.id); setShowQueueMenu(false); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] hover:bg-[#f5faf7]">
                          <User className="size-3.5 opacity-70" />
                          <span className="min-w-0 flex-1 truncate">{a.name}</span>
                          <span className="text-[12px] text-[#8a9690]">({agentQueueCounts.get(a.id) ?? 0})</span>
                        </button>
                      ))}
                      <div className="my-1 border-t border-[#eef1ef]" />
                      <button type="button" onClick={() => { setTab("ia"); setFilterAgentId(null); setShowQueueMenu(false); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] hover:bg-[#f5faf7]">
                        <Bot className="size-3.5 text-[#0d9f4f]" /> Atendimento IA
                        <span className="ml-auto text-[12px] text-[#8a9690]">({counts.ia})</span>
                      </button>
                      <button type="button" onClick={() => { setTab("finalizados"); setFilterAgentId(null); setShowQueueMenu(false); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] hover:bg-[#f5faf7]">
                        <Check className="size-3.5 text-[#0d9f4f]" /> Finalizados
                        <span className="ml-auto text-[12px] text-[#8a9690]">({counts.finalizados})</span>
                      </button>
                      <button type="button" onClick={() => { setTab("todas"); setFilterAgentId(null); setShowQueueMenu(false); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] hover:bg-[#f5faf7]">
                        <List className="size-3.5 text-[#0d9f4f]" /> {t("lc.all")}
                        <span className="ml-auto text-[12px] text-[#8a9690]">({counts.todas})</span>
                      </button>
                    </div>
                  )}
                </div>
                <div className="relative shrink-0" data-menu>
                  <button type="button" onClick={() => { setShowGearMenu((v) => !v); setShowQueueMenu(false); setGearSub(null); }} className="flex size-9 items-center justify-center rounded-full border border-[#e5ebe8] bg-white text-[#1a2e24] shadow-sm hover:bg-[#f5faf7]" title="Ações">
                    <Settings className="size-4" />
                  </button>
                  {showGearMenu && (
                    <div className="absolute top-full right-0 z-40 mt-1.5 w-[280px] overflow-hidden rounded-xl border border-[#e5ebe8] bg-white py-1 shadow-[0_8px_24px_rgb(15_40_30/0.12)]">
                      <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] hover:bg-[#f5faf7]" onClick={runBulkFinalize}>
                        <Check className="size-3.5 text-[#0d9f4f]" /> Finalizar atendimento
                      </button>
                      <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] hover:bg-[#f5faf7]" onClick={runBulkReopen}>
                        <RotateCcw className="size-3.5 text-[#0d9f4f]" /> Reabrir
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] hover:bg-[#f5faf7]"
                        onClick={() => {
                          setShowGearMenu(false);
                          setIceOpen(true);
                        }}
                      >
                        <MessageSquare className="size-3.5 text-[#0d9f4f]" /> Iniciadores de conversa
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <label className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-[#f5faf7]">
                  <input type="checkbox" className="size-4 rounded border-[#c5d0cb] accent-[#0d9f4f]" checked={list.length > 0 && list.every((x) => selectedIds.includes(x.cv.id))} onChange={selectAllVisible} />
                </label>
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8a9690]" />
                  <Input className="lc-search pl-9" placeholder="Buscar conversa..." value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
                <div className="relative shrink-0" data-menu>
                  <button type="button" onClick={() => { setShowConvFilter((v) => !v); setShowQueueMenu(false); setShowGearMenu(false); }} className={cn("relative flex size-9 items-center justify-center rounded-full border border-[#e5ebe8] text-[#1a2e24] hover:bg-[#f5faf7]", (showConvFilter || convFilterActiveCount > 0) && "border-[#0d9f4f] bg-[#e8f7ee] text-[#0d9f4f]")} title="Filtrar conversas">
                    <Filter className="size-4" />
                    {convFilterActiveCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-[#0d9f4f] text-[9px] font-bold text-white">{convFilterActiveCount}</span>
                    )}
                  </button>
                  {showConvFilter && (
                    <div className="absolute top-0 left-full z-[80] ml-2 flex w-[min(92vw,360px)] overflow-hidden rounded-xl border border-[#e5ebe8] bg-white shadow-[0_12px_32px_rgb(15_40_30/0.16)]" style={{ maxHeight: "min(70vh, 480px)" }}>
                      <div className="flex w-[92px] shrink-0 flex-col border-r border-[#eef1ef] bg-[#fafbfa] py-2">
                        <div className="px-2.5 pb-2 text-[11px] text-[#1a2e24]">Filtre suas conversas</div>
                        {([["tags", "Por Tags"], ["status", "Status"], ["data", "Data"], ["crm", "CRM"]] as const).map(([id, label]) => (
                          <button key={id} type="button" onClick={() => setFilterSection(id)} className={cn("border-l-2 px-2.5 py-2 text-left text-[12px]", filterSection === id ? "border-[#0d9f4f] bg-white text-[#0d9f4f]" : "border-transparent text-[#5c6b64]")}>
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="min-w-0 flex-1 overflow-y-auto p-3">
                        {filterSection === "tags" && (
                          <div className="flex max-h-40 flex-wrap gap-1 overflow-y-auto">
                            {tags.map((tg) => {
                              const on = filterIncludeTags.includes(tg.id);
                              return (
                                <button key={tg.id} type="button" onClick={() => setFilterIncludeTags((ids) => on ? ids.filter((i) => i !== tg.id) : [...ids, tg.id])} className={cn("rounded-full border px-2 py-0.5 text-[11px]", on ? "border-[#0d9f4f] bg-[#e8f7ee] text-[#0d9f4f]" : "border-[#e5ebe8] text-[#5c6b64]")}>
                                  #{tg.name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {filterSection !== "tags" && (
                          <p className="text-[12px] text-[#8a9690]">Em breve</p>
                        )}
                        {convFilterActiveCount > 0 && (
                          <button type="button" className="mt-3 text-[12px] text-[#8a9690] underline" onClick={() => { setFilterIncludeTags([]); setFilterExcludeTags([]); }}>
                            Limpar
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="relative shrink-0" data-menu>
                  <button type="button" onClick={() => setShowSortMenu((v) => !v)} className="flex size-9 items-center justify-center rounded-full border border-[#e5ebe8] hover:bg-[#f5faf7]" title="Ordenar">
                    <ArrowUpDown className="size-4" />
                  </button>
                  {showSortMenu && (
                    <div className="absolute top-full right-0 z-40 mt-1.5 w-[220px] rounded-xl border border-[#e5ebe8] bg-white py-1 shadow-lg">
                      <button type="button" className="flex w-full px-3.5 py-2.5 text-left text-[13px] hover:bg-[#f5faf7]" onClick={() => { setSortOrder("recent"); setShowSortMenu(false); }}>Mensagem mais recente</button>
                      <button type="button" className="flex w-full px-3.5 py-2.5 text-left text-[13px] hover:bg-[#f5faf7]" onClick={() => { setSortOrder("oldest"); setShowSortMenu(false); }}>Mensagem mais antiga</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
              {list.map(({ cv, contact, last }) => (
                <li key={cv.id}>
                  <div data-active={activeId === cv.id} className={cn("lc-conv flex w-full items-start gap-2 text-left hover:bg-[#f5faf7]", activeId === cv.id && "bg-[#dcf8c6]")}>
                    <label className="mt-3 flex shrink-0 cursor-pointer items-center" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="size-4 rounded accent-[#0d9f4f]" checked={selectedIds.includes(cv.id)} onChange={() => toggleSelect(cv.id)} />
                    </label>
                    <button type="button" onClick={() => selectConversation(cv.id)} className="flex min-w-0 flex-1 gap-3 text-left">
                      <div className="relative shrink-0">
                        <Avatar name={contact!.name} className="size-10 text-[13px]" />
                        <span className="lc-dot" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="lc-conv-name truncate">{contact!.name}</span>
                          <RelativeTime iso={cv.lastMessageAt} className="lc-conv-time shrink-0" />
                        </div>
                        <div className="lc-conv-phone truncate">{formatPhone(contact!.phone)}</div>
                        <p className="lc-conv-preview truncate">
                          {(last?.from === "agent" || last?.from === "bot") && <span className="mr-0.5 text-[#0d9f4f]">✓ </span>}
                          {last?.text ?? "Sem mensagens"}
                        </p>
                      </div>
                    </button>
                  </div>
                </li>
              ))}
              {list.length === 0 && (
                <li className="p-8 text-center text-sm text-[#6b7a72]">Nenhuma conversa</li>
              )}
            </ul>
          </aside>

          <section className="lc-card relative flex min-h-0 min-w-0 flex-1 flex-col">
            {active && active.contact ? (
              <>
                <header className="lc-chat-header relative flex shrink-0 flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      data-contact-panel
                      className={cn("flex min-w-0 items-center gap-3 rounded-lg text-left", panelOpen && "bg-[#f4f6fa]")}
                      title="Informações do contato"
                      onClick={() => {
                        userOpenedPanel.current = !panelOpen;
                        setPanelOpen((v) => !v);
                      }}
                    >
                      <div className="relative shrink-0">
                        <Avatar name={active.contact.name} className="size-14 text-[16px]" />
                        <span className="lc-dot" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="lc-chat-title truncate">{active.contact.name}</span>
                          <span className="rounded-full bg-[#e8f7ee] px-2 py-0.5 text-[10px] font-semibold text-[#0d9f4f]">Atribuída</span>
                        </div>
                        <div className="lc-chat-sub truncate">
                          {thread.length} mensagem{thread.length === 1 ? "" : "s"} · {formatPhone(active.contact.phone)}
                        </div>
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-[#e8ece9] bg-[#f7f9f8] px-1">
                      <Button size="icon" variant="ghost" className={cn("size-10 text-[#54656f]", showHeaderTags && "bg-[#e8f7ee] text-[#0d9f4f]")} title={showHeaderTags ? "Ocultar etiquetas no cabeçalho" : "Exibir etiquetas no cabeçalho"} onClick={() => toggleHeaderTags()}>
                        <Tag className="size-5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-10 text-[#54656f]" title="Transferir atendimento" onClick={() => { setShowChatMenu(true); setChatMenuSub("transfer"); }}>
                        <ArrowRightLeft className="size-5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-10 text-[#54656f]" title="Painel do aluno" data-contact-panel onClick={() => { userOpenedPanel.current = !panelOpen; setPanelOpen((v) => !v); }}>
                        <User className="size-5" />
                      </Button>
                      {active.cv.queue === "finalizados" ? (
                        <Button size="icon" variant="ghost" className="size-10 text-[#54656f]" title="Reabrir atendimento" onClick={takeAttendance}>
                          <RotateCcw className="size-5" />
                        </Button>
                      ) : (
                        <Button size="icon" variant="ghost" className="size-10 text-[#54656f]" title="Finalizar atendimento" onClick={() => { setQueue(active.cv.id, "finalizados"); pushConversationEvent(active.cv.id, "Atendimento finalizado"); toast.success("Atendimento finalizado"); }}>
                          <Check className="size-5" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="size-10 text-[#54656f]" title="Telefone" onClick={() => toast.message(`WhatsApp ${formatPhone(active.contact!.phone)}`)}>
                        <Phone className="size-5" />
                      </Button>
                      <div className="relative" data-menu>
                        <Button size="icon" variant="ghost" className={cn("size-10 text-[#54656f]", showChatMenu && "bg-[#e8f7ee] text-[#0d9f4f]")} title="Mais ações" onClick={() => { setShowChatMenu((v) => !v); setChatMenuSub(null); setShowWallpaperPicker(false); }}>
                          <MoreVertical className="size-5" />
                        </Button>
                        {showChatMenu && (
                          <div className="absolute top-full right-0 z-40 mt-1.5 max-h-[min(70vh,480px)] w-[280px] overflow-y-auto rounded-xl border border-[#e5ebe8] bg-white py-1 shadow-[0_8px_24px_rgb(15_40_30/0.12)]">
                            {chatMenuSub === null && (
                              <>
                                <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[15px] hover:bg-[#f5faf7]" onClick={() => { markUnread(active.cv.id); toast.success("Marcada como não lida"); setShowChatMenu(false); setActiveId(null); }}>
                                  <MailOpen className="size-4 text-[#0d9f4f]" /> Marcar como não lido
                                </button>
                                <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[15px] hover:bg-[#f5faf7]" onClick={() => { markResponded(active.cv.id, true); toast.success("Marcada como respondida"); setShowChatMenu(false); }}>
                                  <CircleCheck className="size-4 text-[#0d9f4f]" /> Marcar como respondida
                                </button>
                                <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[15px] hover:bg-[#f5faf7]" onClick={() => setChatMenuSub("history")}>
                                  <History className="size-4 text-[#0d9f4f]" /> Histórico de eventos
                                </button>
                                <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[15px] hover:bg-[#f5faf7]" onClick={() => { const next = !active.cv.automationsPaused; patchConversation(active.cv.id, { automationsPaused: next }); toast.success(next ? "Automações desativadas" : "Automações reativadas"); setShowChatMenu(false); }}>
                                  <Ban className="size-4 text-[#0d9f4f]" /> {active.cv.automationsPaused ? "Reativar automações" : "Desativar automações"}
                                </button>
                                <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[15px] hover:bg-[#f5faf7]" onClick={() => { const next = !active.cv.iaPaused; patchConversation(active.cv.id, { iaPaused: next }); toast.success(next ? "ChatNT IA desativada" : "ChatNT IA reativada"); setShowChatMenu(false); }}>
                                  <Bot className="size-3.5 text-[#0d9f4f]" /> {active.cv.iaPaused ? "Reativar ChatNT IA" : "Desativar ChatNT IA"}
                                </button>
                                <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[15px] hover:bg-[#f5faf7]" onClick={() => setChatMenuSub("pipeline")}>
                                  <Kanban className="size-3.5 text-[#0d9f4f]" /> Atribuir ao pipeline
                                </button>
                                <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[15px] hover:bg-[#f5faf7]" onClick={exportActiveConversation}>
                                  <Download className="size-4 text-[#0d9f4f]" /> Exportar conversa
                                </button>
                                <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[15px] hover:bg-[#f5faf7]" onClick={() => { setShowWallpaperPicker(true); setShowChatMenu(false); }}>
                                  <Palette className="size-4 text-[#0d9f4f]" /> Papel de parede
                                </button>
                                <div className="my-1 border-t border-[#eef1ef]" />
                                <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13.5px] text-red-600 hover:bg-red-50" onClick={() => { if (!confirm("Excluir esta conversa e as mensagens?")) return; deleteConversation(active.cv.id); setActiveId(null); setShowChatMenu(false); toast.success("Conversa excluída"); }}>
                                  <Trash2 className="size-3.5" /> Excluir conversa
                                </button>
                                <button type="button" className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[15px] hover:bg-[#f5faf7]" onClick={closeChatWindow}>
                                  <X className="size-3.5 text-[#0d9f4f]" /> Fechar janela
                                </button>
                              </>
                            )}
                            {chatMenuSub === "history" && (
                              <div>
                                <button type="button" className="w-full px-3.5 py-2 text-left text-[11px] text-[#8a9690]" onClick={() => setChatMenuSub(null)}>← Voltar</button>
                                {[...(active.cv.events ?? [])].reverse().map((ev) => (
                                  <div key={ev.id} className="border-b border-[#f0f3f1] px-3.5 py-2.5">
                                    <div className="text-[12px]">{ev.text}</div>
                                    <div className="text-[10px] text-[#8a9690]">{new Date(ev.at).toLocaleString("pt-BR")}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {chatMenuSub === "pipeline" && (
                              <div>
                                <button type="button" className="w-full px-3.5 py-2 text-left text-[11px] text-[#8a9690]" onClick={() => setChatMenuSub(null)}>← Voltar</button>
                                {stages.slice().sort((a, b) => a.order - b.order).map((st) => (
                                  <button key={st.id} type="button" className="flex w-full px-3.5 py-2.5 text-left text-[13px] hover:bg-[#f5faf7]" onClick={() => assignToPipeline(st.id)}>{st.name}</button>
                                ))}
                              </div>
                            )}
                            {chatMenuSub === "transfer" && (
                              <div>
                                <button type="button" className="w-full px-3.5 py-2 text-left text-[11px] text-[#8a9690]" onClick={() => setChatMenuSub(null)}>← Voltar</button>
                                {agentsAll.map((a) => (
                                  <button key={a.id} type="button" className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[13px] hover:bg-[#f5faf7]" onClick={() => {
                                    assignConversation(active.cv.id, a.id);
                                    pushConversationEvent(active.cv.id, `Conversa transferida para ${a.name}`);
                                    toast.success(`Transferida para ${a.name}`);
                                    setShowChatMenu(false);
                                    setChatMenuSub(null);
                                    if (a.id !== activeAgentId) setActiveId(null);
                                  }}>
                                    <span>{a.name}</span>
                                    <span className="text-[11px] text-[#8a9690]">{a.area}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <Button size="icon" variant="ghost" className="size-10 text-[#54656f]" title="Fechar janela" onClick={closeChatWindow}>
                        <X className="size-4" />
                      </Button>
                      {showWallpaperPicker && (
                        <div data-menu className="absolute top-14 right-3 z-30 w-[320px] rounded-xl border border-[#e9edef] bg-white p-3 shadow-lg">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[13px] text-[#111b21]">Papel de parede</span>
                            <button type="button" className="text-[11px] text-[#667781]" onClick={() => setShowWallpaperPicker(false)}>Fechar</button>
                          </div>
                          <div className="wa-wallpaper-picker">
                            {CHAT_WALLPAPERS.map((w) => (
                              <button key={w.id} type="button" className={cn("wa-wallpaper-swatch", !("preview" in w && w.preview) && w.className)} data-active={chatWallpaperId === w.id} style={"preview" in w && w.preview ? { backgroundImage: `url(${w.preview})` } : { backgroundColor: w.swatch }} onClick={() => { setChatWallpaper(w.id); setShowWallpaperPicker(false); toast.success(`Fundo: ${w.label}`); }} title={w.label}>
                                <span>{w.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {showHeaderTags && active.contact.tagIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.filter((tg) => active.contact!.tagIds.includes(tg.id)).map((tg) => (
                        <span key={tg.id} className="max-w-[168px] truncate rounded-full border bg-white px-2.5 py-0.5 text-[12px]" style={{ borderColor: tg.color, color: tg.color }} title={`#${tg.name}`}>
                          #{tg.name}
                        </span>
                      ))}
                    </div>
                  )}
                </header>

                <div ref={messagesRef} className={cn("wa-chat-wallpaper relative min-h-0 flex-1 overflow-y-auto", wallpaperClass)}>
                  <div className="relative z-[1] space-y-1.5 px-4 py-3 sm:px-6 sm:py-4">
                    {thread.map((m, idx) => {
                      if (isChatNoise(m)) return null;
                      const outbound = m.from === "agent" || m.from === "bot";
                      const quoted = !outbound && m.from === "contact" ? quotedAutomation(thread, idx) : null;
                      return (
                        <div key={m.id} className={cn("flex py-0.5", outbound ? "justify-end" : m.from === "system" ? "justify-center" : "justify-start")}>
                          {m.from === "system" ? (
                            <div className="wa-sys">{m.text}</div>
                          ) : quoted ? (
                            <div className="w-[min(86%,340px)] overflow-hidden rounded-[12px] bg-white shadow-[0_1px_0.5px_rgba(0,0,0,0.08)]">
                              <div className="px-3.5 pt-3">
                                <div className="text-[15px] font-medium text-[#111b21]">Automações</div>
                                <div className="mt-2 rounded-xl bg-[#e7f6e3] px-3 py-2.5 text-[15px] leading-[21px] whitespace-pre-wrap text-[#111b21]">
                                  {quoted.text}
                                </div>
                              </div>
                              <div className="px-3.5 pt-2 pb-2">
                                <div className="text-[16px] leading-[22px] text-[#111b21]">{m.text}</div>
                                <div className="mt-1 text-right text-[11px] text-[#667781]">{fmtUnniTime(m.createdAt)}</div>
                              </div>
                            </div>
                          ) : (
                            <div className="inline-flex max-w-[min(78%,420px)] flex-col">
                              <div className={cn(
                                "px-3 py-2 text-[16px] leading-[22px] text-[#111b21]",
                                m.from === "contact" && "wa-bubble-in",
                                outbound && "wa-bubble-out",
                              )}>
                                <InternalKindRow m={m} />
                                {m.header ? (
                                  <div className="mb-1 text-[13px] font-medium text-[#111b21]">{m.header}</div>
                                ) : null}
                                {m.mediaKind === "image" && m.mediaUrl && (
                                  <a href={m.mediaUrl} target="_blank" rel="noreferrer" className="mb-1 block overflow-hidden rounded-lg">
                                    <img src={m.mediaUrl} alt="" className="max-h-56 max-w-full object-cover" />
                                  </a>
                                )}
                                {m.mediaKind === "audio" && m.mediaUrl && (
                                  <audio controls src={m.mediaUrl} className="mb-1 w-full max-w-[240px]" preload="metadata" />
                                )}
                                {m.mediaKind === "document" && (
                                  <a href={m.mediaUrl || "#"} download={m.mediaName} className="mb-1 flex items-center gap-2 rounded-lg bg-black/5 px-3 py-2 text-[13px]">
                                    <File className="size-4 text-[#1fa855]" /> {m.mediaName || "Documento"}
                                  </a>
                                )}
                                <div className="whitespace-pre-wrap break-words">{m.text}</div>
                                {m.footer ? (
                                  <div className="mt-1 text-[12px] text-[#667781]">{m.footer}</div>
                                ) : null}
                                {m.error && (
                                  <div className="mt-1 flex items-center gap-1 text-[11px] text-[#ea0038]">
                                    <TriangleAlert className="size-3" /> {m.error}
                                  </div>
                                )}
                                <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-[#667781]">
                                  <span>{fmtUnniTime(m.createdAt)}</span>
                                  {outbound && <DeliveryTick status={m.deliveryStatus} />}
                                </div>
                              </div>
                              {m.replyButtons && m.replyButtons.length > 0 && (
                                <div className="mt-1 flex w-full flex-col gap-1">
                                  {m.replyButtons.map((b) =>
                                    b.url ? (
                                      <a
                                        key={b.id}
                                        href={b.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="box-border w-full rounded-xl bg-[#d9fdd3] px-3 py-2 text-center text-[16px] leading-[22px] text-[#1a73e8]"
                                      >
                                        ↗ {b.label}
                                      </a>
                                    ) : (
                                      <div key={b.id} className="box-border w-full rounded-xl bg-[#d9fdd3] px-3 py-2 text-center text-[16px] leading-[22px] text-[#1a73e8]">← {b.label}</div>
                                    ),
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                </div>

                <footer className="lc-composer-wrap relative shrink-0" data-menu>
                  {!canCompose ? (
                    <div className="flex items-center justify-between gap-3 border-t border-[#e5ebe8] bg-white px-4 py-3">
                      <p className="text-[13.5px] text-[#5c6b64]">
                        {active.cv.queue === "finalizados"
                          ? "Atendimento finalizado"
                          : active.cv.assignee
                            ? `Em atendimento com ${agentsAll.find((a) => a.id === active.cv.assignee)?.name ?? "outro atendente"}`
                            : "Nenhum atendente nesta conversa"}
                      </p>
                      {(active.cv.queue === "finalizados" || !active.cv.assignee) && (
                        <Button className="h-9 rounded-full bg-[#25d366] px-4 text-[#075e54] hover:bg-[#1ebe5d]" onClick={takeAttendance}>
                          Pegar atendimento
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      {showQuickReplies && (
                        <div className="absolute right-3 bottom-full left-3 z-20 mb-1 max-h-56 overflow-y-auto rounded-xl border bg-white p-1.5 shadow-lg">
                          {filteredQuickReplies().map((r) => (
                            <button key={r.id} type="button" className="flex w-full flex-col rounded-lg px-2.5 py-2 text-left hover:bg-[#f5faf7]" onClick={() => applyQuickReply(r.text)}>
                              <span className="text-[13px]">/{r.shortcut} · {r.title}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {showTemplates && (
                        <div className="absolute right-3 bottom-full left-3 z-20 mb-1 max-h-48 overflow-y-auto rounded-xl border bg-white p-2 shadow-lg">
                          {templates.filter((tpl) => tpl.status === "Aprovado").map((tpl) => (
                            <button key={tpl.id} type="button" className="flex w-full flex-col rounded-lg px-2 py-1.5 text-left hover:bg-[#f5faf7]" onClick={() => void handleSendTemplate(tpl.id)}>
                              <span className="text-xs">{tpl.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {showAutomations && (
                        <div className="absolute right-3 bottom-full left-3 z-20 mb-1 max-h-56 overflow-y-auto rounded-xl border bg-white p-2 shadow-lg">
                          {automations.filter((a) => a.active).length === 0 && (
                            <p className="px-2 py-3 text-center text-[12px] text-[#8a9690]">Nenhuma automação ativa</p>
                          )}
                          {automations.filter((a) => a.active).map((a) => (
                            <button key={a.id} type="button" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-[#f5faf7]" onClick={() => sendAutomation(a.id)}>
                              <Workflow className="size-3.5 text-[#0d9f4f]" />
                              <span className="truncate text-[13px]">{a.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <form className="flex items-center gap-2 px-3 pt-2" onSubmit={(e) => { e.preventDefault(); void handleSend(); }}>
                        <Input
                          className="h-9 flex-1 rounded-full"
                          placeholder="Digite / para Respostas Rápidas... · Enter envia"
                          value={draft}
                          onChange={(e) => {
                            const v = e.target.value;
                            setDraft(v);
                            setShowQuickReplies(v.startsWith("/"));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              void handleSend();
                            }
                          }}
                          disabled={sending || recording}
                        />
                        <VarInsert
                          fields={customFields}
                          onPick={(t) => setDraft((d) => d + t)}
                        />
                        {recording ? (
                          <Button type="button" className="h-9 rounded-full bg-red-500 px-3 text-[12px]" onClick={toggleAudioRecording}>
                            <Square className="size-4 fill-current" /> {recordSec}s
                          </Button>
                        ) : (
                          <Button type="submit" className="h-9 rounded-full bg-[#25d366] px-3.5 text-[13px] text-[#075e54] hover:bg-[#1ebe5d]" disabled={!draft.trim() || sending}>
                            {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                            <span className="ml-1 hidden sm:inline">Enviar</span>
                          </Button>
                        )}
                      </form>
                      <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-[#eef1ef] px-2 pt-2 pb-2">
                        <button type="button" className="flex h-10 items-center gap-1.5 rounded-full px-2.5 text-[14px] text-[#0d9f4f] hover:bg-[#e8f7ee]" onClick={() => { setShowTemplates((v) => !v); setShowAutomations(false); }}>
                          <FileText className="size-5" /> Template
                        </button>
                        <button type="button" className="flex h-10 items-center gap-1.5 rounded-full px-2.5 text-[14px] text-[#0d9f4f] hover:bg-[#e8f7ee]" onClick={() => { setShowAutomations((v) => !v); setShowTemplates(false); }}>
                          <Workflow className="size-5" /> Automação
                        </button>
                        <button type="button" className="flex h-10 items-center gap-1.5 rounded-full px-2.5 text-[14px] text-[#0d9f4f] hover:bg-[#e8f7ee]" onClick={() => fileInputRef.current?.click()}>
                          <Paperclip className="size-5" /> Arquivo
                        </button>
                        <button type="button" className="flex h-10 items-center gap-1.5 rounded-full px-2.5 text-[14px] text-[#0d9f4f] hover:bg-[#e8f7ee]" onClick={toggleAudioRecording}>
                          <Mic className="size-5" /> Áudio
                        </button>
                        <button type="button" className="flex h-10 items-center gap-1.5 rounded-full px-2.5 text-[14px] text-[#0d9f4f] hover:bg-[#e8f7ee]" onClick={() => { setShowQuickReplies((v) => !v); if (!draft.startsWith("/")) setDraft("/"); }}>
                          <Slash className="size-5" /> Rápidas
                        </button>
                        <button type="button" className="flex h-10 items-center gap-1.5 rounded-full px-2.5 text-[14px] text-[#0d9f4f] hover:bg-[#e8f7ee]" disabled={aiSuggesting || !!active.cv.iaPaused} onClick={suggestReplyWithIA}>
                          <Sparkles className="size-5" /> IA
                        </button>
                        <button type="button" className="flex size-10 items-center justify-center rounded-full text-[#0d9f4f] hover:bg-[#e8f7ee]" onClick={() => setDraft((d) => d + " 🙏")}>
                          <Smile className="size-5" />
                        </button>
                        <input ref={fileInputRef} type="file" className="hidden" onChange={onPickFile} />
                        <div className="flex-1" />
                        {sendLineReady && activeCx ? (
                          <span className="text-[10px] text-[#0d9f4f]">Via {activeCx.phone}</span>
                        ) : (
                          <span className="text-[10px] text-amber-700">Token em Conexões</span>
                        )}
                      </div>
                    </>
                  )}
                </footer>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center bg-white p-6 text-center">
                <p className="text-[15px] text-[#8a9690]">Selecione uma conversa.</p>
                <Button size="sm" variant="outline" className="mt-4 rounded-full" onClick={() => setShowNewChat(true)}>Nova conversa</Button>
              </div>
            )}
          </section>

          {panelOpen && active?.contact && (
            <aside data-contact-panel className="lc-panel lc-card z-20 flex w-[min(100%,300px)] shrink-0 flex-col overflow-hidden sm:w-[300px]">
              <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-3 py-2.5">
                <span className="text-sm font-semibold text-[var(--color-fg)]">Informações do contato</span>
                <button type="button" onClick={() => { userOpenedPanel.current = false; setPanelOpen(false); }} className="rounded p-1 text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]" aria-label="Fechar painel">
                  <X className="size-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="flex flex-col items-center border-b border-[var(--color-border)] px-4 py-4 text-center">
                  <Avatar name={active.contact.name} className="size-14 text-lg" />
                  {editingName ? (
                    <div className="mt-2 flex w-full max-w-[240px] items-center gap-1">
                      <Input className="h-9 text-center text-sm" value={nameDraft} autoFocus onChange={(e) => setNameDraft(e.target.value)} onKeyDown={(e) => {
                        if (e.key === "Enter" && nameDraft.trim()) {
                          updateContact(active.contact!.id, { name: nameDraft.trim() });
                          setEditingName(false);
                        }
                        if (e.key === "Escape") setEditingName(false);
                      }} />
                    </div>
                  ) : (
                    <button type="button" className="mt-2 flex items-center gap-1 text-sm" onClick={() => { setNameDraft(active.contact!.name); setEditingName(true); }}>
                      {active.contact.name} <Pencil className="size-3.5 opacity-40" />
                    </button>
                  )}
                  <div className="text-[12px] text-[var(--color-muted)]">{formatPhone(active.contact.phone)}</div>
                </div>

                <div className="space-y-2 px-3 py-3">
                  <PanelAccordion icon={<StickyNote className="size-4" />} title={t("lc.notes")} open={!!panelSections.notes} onToggle={() => togglePanelSection("notes")}>
                    <div className="space-y-2">
                      {(active.contact.notes ?? []).map((n) => (
                        <div key={n.id} className="rounded-md bg-[var(--color-surface-2)] px-2 py-1.5 text-[12px]">
                          <div>{n.text}</div>
                          <button type="button" className="text-[10px] text-red-500" onClick={() => deleteNote(active.contact!.id, n.id)}>excluir</button>
                        </div>
                      ))}
                      <Input className="h-8 text-[12px]" placeholder="Nova anotação" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} onKeyDown={(e) => {
                        if (e.key === "Enter" && noteDraft.trim()) {
                          addNote(active.contact!.id, noteDraft.trim());
                          setNoteDraft("");
                        }
                      }} />
                    </div>
                  </PanelAccordion>
                  <PanelAccordion icon={<Bell className="size-4" />} title={t("lc.reminders")} open={!!panelSections.reminders} onToggle={() => togglePanelSection("reminders")}>
                    <p className="text-[12px] text-[var(--color-muted)]">Nenhum lembrete.</p>
                  </PanelAccordion>
                  <PanelAccordion icon={<ClipboardList className="size-4" />} title={t("lc.activities")} open={!!panelSections.activities} onToggle={() => togglePanelSection("activities")}>
                    <p className="text-[12px] text-[var(--color-muted)]">Sem atividades.</p>
                  </PanelAccordion>
                  <PanelAccordion icon={<Bot className="size-4" />} title="ChatNT IA" open={!!panelSections.ia} onToggle={() => togglePanelSection("ia")}>
                    <p className="text-[12px] text-[var(--color-muted)]">IA pronta para sugerir respostas no compositor.</p>
                  </PanelAccordion>
                  <PanelAccordion icon={<FormInput className="size-4" />} title={t("lc.fields")} open={!!panelSections.fields} onToggle={() => togglePanelSection("fields")} badge={String(Object.values(active.contact.customFields ?? {}).filter(Boolean).length)}>
                    <ContactFieldsEditor
                      contactId={active.contact.id}
                      values={active.contact.customFields ?? {}}
                      defs={customFields}
                      onSet={setField}
                      onAddDef={addCustomField}
                    />
                  </PanelAccordion>
                  <PanelAccordion
                    icon={<Columns3 className="size-4" />}
                    title={t("lc.crm")}
                    open={!!panelSections.crm}
                    onToggle={() => togglePanelSection("crm")}
                    badge={
                      stages.find(
                        (st) =>
                          st.id ===
                          deals.find(
                            (d) =>
                              d.contactId === active.contact!.id && !d.outcome,
                          )?.stageId,
                      )?.name ?? "Fora"
                    }
                  >
                    {(() => {
                      const deal = deals.find(
                        (d) =>
                          d.contactId === active.contact!.id && !d.outcome,
                      );
                      const ordered = [...stages].sort(
                        (a, b) => a.order - b.order,
                      );
                      const current = deal
                        ? ordered.find((st) => st.id === deal.stageId)
                        : null;
                      return (
                        <div className="space-y-2 text-xs">
                          <p className="text-[12px] text-[var(--color-muted)]">
                            {current
                              ? `Etapa atual: ${current.name}`
                              : "Ainda não está no funil. Escolha uma etapa."}
                          </p>
                          <div className="flex flex-col gap-1">
                            {ordered.map((st, i) => {
                              const on = deal?.stageId === st.id;
                              return (
                                <button
                                  key={st.id}
                                  type="button"
                                  className={cn(
                                    "flex items-center justify-between rounded-md border px-2.5 py-1.5 text-left",
                                    on
                                      ? "border-[#0d9f4f] bg-[#e8f7ee] text-[#0d5c3d]"
                                      : "border-[var(--color-border)] hover:bg-[var(--color-surface-2)]",
                                  )}
                                  onClick={() => {
                                    if (on) return;
                                    if (deal) {
                                      moveDeal(deal.id, st.id);
                                      toast.success(`Movido para ${st.name}`);
                                    } else {
                                      addDeal(
                                        active.contact!.id,
                                        active.contact!.name,
                                        st.id,
                                      );
                                      toast.success(`Adicionado em ${st.name}`);
                                    }
                                  }}
                                >
                                  <span>
                                    {i + 1}. {st.name}
                                  </span>
                                  {on && <Check className="size-3.5" />}
                                </button>
                              );
                            })}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-full text-xs"
                            onClick={() => void navigate({ to: "/crm" })}
                          >
                            Abrir CRM Kanban
                          </Button>
                        </div>
                      );
                    })()}
                  </PanelAccordion>
                </div>

                <div className="border-t border-[var(--color-border)] px-3 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">Tags do contato</span>
                    <button
                      type="button"
                      className="rounded p-1 text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
                      title={panelSections.tags ? "Fechar" : "Editar tags"}
                      onClick={() => {
                        if (panelSections.tags) {
                          togglePanelSection("tags");
                          setShowCreateTag(false);
                          return;
                        }
                        setTagDraftIds([...active.contact!.tagIds]);
                        setTagQuery("");
                        setShowCreateTag(false);
                        togglePanelSection("tags");
                      }}
                    >
                      {panelSections.tags ? <X className="size-3.5" /> : <Pencil className="size-3.5" />}
                    </button>
                  </div>
                  {!panelSections.tags && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.filter((t) => active.contact!.tagIds.includes(t.id)).map((t) => (
                        <span key={t.id} className="max-w-[160px] truncate rounded-full border px-2.5 py-0.5 text-[12px]" style={{ borderColor: t.color, color: t.color }}>
                          #{t.name}
                        </span>
                      ))}
                      {active.contact.tagIds.length === 0 && (
                        <span className="text-[11px] text-[var(--color-subtle)]">Nenhuma tag — clique no lápis</span>
                      )}
                    </div>
                  )}
                  {panelSections.tags && (
                    <div className="rounded-lg border border-[#d8dee6] bg-white p-2">
                      <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
                        {tags.filter((t) => tagDraftIds.includes(t.id)).map((t) => (
                          <span key={t.id} className="inline-flex items-center gap-1 rounded-full border border-[#c5cdd6] px-2 py-0.5 text-[12px]">
                            <span className="truncate">{t.name}</span>
                            <button type="button" className="flex size-4 items-center justify-center rounded-full bg-[#3d4a44] text-white" onClick={() => setTagDraftIds((ids) => ids.filter((id) => id !== t.id))}>
                              <X className="size-2.5" />
                            </button>
                          </span>
                        ))}
                        <div className="relative min-w-[110px] flex-1">
                          <Input className="h-7 border-0 px-1 text-[12px] shadow-none focus-visible:ring-0" placeholder="Buscar tag..." value={tagQuery} onChange={(e) => setTagQuery(e.target.value)} />
                          {tagQuery.trim() && !showCreateTag && (
                            <div className="absolute top-full left-0 z-20 mt-1 max-h-36 w-[220px] overflow-y-auto rounded-lg border bg-white py-1 shadow-lg">
                              {tags.filter((t) => !tagDraftIds.includes(t.id) && t.name.toLowerCase().includes(tagQuery.trim().toLowerCase())).slice(0, 10).map((t) => (
                                <button key={t.id} type="button" className="flex w-full px-2.5 py-1.5 text-left text-[12.5px] hover:bg-[#f5faf7]" onClick={() => { setTagDraftIds((ids) => [...ids, t.id]); setTagQuery(""); }}>
                                  {t.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {showCreateTag && (
                        <Input className="mt-2 h-8 text-[12px]" placeholder="Nome da nova tag" value={tagQuery} autoFocus onChange={(e) => setTagQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); createNewTag(); } }} />
                      )}
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <button type="button" className="h-8 rounded-full border border-[#0d5c3d] px-3 text-[12px] text-[#0d5c3d]" onClick={() => { setShowCreateTag(true); setTagQuery(""); }}>
                          Criar nova tag
                        </button>
                        <button type="button" className="h-8 rounded-full bg-[#0d5c3d] px-4 text-[12px] text-white" onClick={saveTags}>
                          Salvar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {activeCx && (
                  <div className="border-t border-[var(--color-border)] px-3 py-3 text-[11px] text-[var(--color-muted)]">
                    <div className="font-semibold text-[var(--color-navy)]">Canal WhatsApp</div>
                    <div className="mt-0.5">{activeCx.name}</div>
                    <div>{activeCx.phone}</div>
                    {sendLineReady ? (
                      <span className="mt-1 inline-block text-[var(--color-primary)]">Cloud API ativa</span>
                    ) : (
                      <span className="mt-1 inline-block text-[var(--color-danger)]">Configure token em Conexões</span>
                    )}
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function fmtUnniTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${date} · ${time}`;
}

function isChatNoise(m: Message) {
  if (m.from !== "system") return false;
  return /^(Automação[s]? |Botão |Nenhuma automação|Automações pausadas)/i.test(m.text);
}

function quotedAutomation(thread: Message[], index: number): Message | null {
  const m = thread[index];
  if (!m || m.from !== "contact") return null;
  const reply = m.text.trim().toLowerCase();
  for (let i = index - 1; i >= 0; i--) {
    const prev = thread[i];
    if (isChatNoise(prev) || prev.from === "system") continue;
    const isAuto =
      prev.from === "bot" ||
      prev.mediaKind === "automation" ||
      (prev.replyButtons?.length ?? 0) > 0;
    if (!isAuto) return null;
    const labels = (prev.replyButtons ?? []).map((b) => b.label.trim().toLowerCase());
    if (labels.some((l) => l && (l === reply || reply.includes(l) || l.includes(reply)))) {
      return prev;
    }
    return prev;
  }
  return null;
}

function InternalKindRow({ m }: { m: Message }) {
  if (m.from === "contact" || m.from === "system") return null;
  const author = (m.author ?? "").toLowerCase();
  const name = (m.mediaName ?? "").toLowerCase();
  const isTemplate = m.mediaKind === "template";
  const isAuto = m.mediaKind === "automation" || author.includes("automa") || name.includes("automa");
  const isBroadcast = author.includes("broadcast") || name.includes("broadcast");
  const isIa = m.from === "bot" && !isTemplate && !isAuto && !isBroadcast && (author.includes("ia") || author.includes("bot") || !m.author);
  if (isTemplate) {
    return <div className="mb-1 flex items-center gap-1.5 text-[14px]"><FileText className="size-3.5 text-[#1fa855]" /> Template</div>;
  }
  if (isBroadcast) {
    return <div className="mb-1 flex items-center gap-1.5 text-[14px]"><Radio className="size-3.5 text-[#1fa855]" /> {m.mediaName || m.author || "Broadcast"}</div>;
  }
  if (isAuto) {
    return <div className="mb-1 flex items-center gap-1.5 text-[14px]"><Workflow className="size-3.5 text-[#1fa855]" /> {m.mediaName || m.author?.replace(/^Automação\s*·\s*/i, "") || "Automação"}</div>;
  }
  if (isIa) {
    return <div className="mb-1 flex items-center gap-1.5 text-[14px]"><Bot className="size-3.5 text-[#1fa855]" /> ChatNT IA</div>;
  }
  if (m.from === "agent") {
    return <div className="mb-1 flex items-center gap-1.5 text-[14px]"><User className="size-3.5 text-[#1fa855]" /> {m.author && m.author !== "Atendente" ? m.author : "Atendente"}</div>;
  }
  return null;
}

function DeliveryTick({ status }: { status?: MessageDeliveryStatus }) {
  if (status === "failed") return <TriangleAlert className="size-3.5 text-[#ea0038]" />;
  if (status === "read") return <CheckCheck className="size-3.5 text-[#53bdeb]" />;
  if (status === "delivered") return <CheckCheck className="size-3.5 text-[#667781]" />;
  return <Check className="size-3.5 text-[#667781]" />;
}

function PanelAccordion({
  icon,
  title,
  open,
  onToggle,
  badge,
  children,
}: {
  icon: ReactNode;
  title: string;
  open: boolean;
  onToggle: () => void;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-white">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-[var(--color-surface-2)]">
        <span className="text-[var(--color-navy)]">{icon}</span>
        <span className="min-w-0 flex-1 text-sm">{title}</span>
        {badge && <span className="text-[11px] text-[var(--color-muted)]">{badge}</span>}
        <ChevronDown className={cn("size-4 text-[var(--color-muted)]", open && "rotate-180")} />
      </button>
      {open && <div className="border-t border-[var(--color-border)] px-3 py-2">{children}</div>}
    </div>
  );
}

function ContactFieldsEditor({
  contactId,
  values,
  defs,
  onSet,
  onAddDef,
}: {
  contactId: string;
  values: Record<string, string>;
  defs: CustomFieldDef[];
  onSet: (contactId: string, fieldId: string, value: string) => void;
  onAddDef: (name: string, type: CustomFieldDef["type"]) => string;
}) {
  const t = useT();
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [pickId, setPickId] = useState("");

  const filled = defs.filter((f) => (values[f.id] ?? "").trim());
  const extra = Object.entries(values)
    .filter(
      ([id, v]) =>
        v.trim() && !defs.some((d) => d.id === id),
    )
    .map(([id, val]) => ({ id, name: id, type: "text" as const, _val: val }));
  const empty = defs.filter((f) => !(values[f.id] ?? "").trim());
  const shown = [
    ...filled,
    ...extra,
    ...defs.filter((f) => f.id === editId && !filled.some((x) => x.id === f.id)),
  ];

  function saveEdit() {
    if (!editId) return;
    onSet(contactId, editId, draft.trim());
    setEditId(null);
  }

  return (
    <div className="space-y-2">
      {shown.map((f) => (
        <div
          key={f.id}
          className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2"
        >
          {editId === f.id ? (
            <div className="space-y-1.5">
              <div className="text-[12px] font-medium">{f.name}:</div>
              {f.type === "select" && f.options?.length ? (
                <select
                  className="h-8 w-full rounded-md border border-[var(--color-border)] px-2 text-[13px]"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                >
                  <option value="">—</option>
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <textarea
                  className="min-h-[64px] w-full rounded-md border border-[var(--color-border)] px-2 py-1.5 text-[13px]"
                  value={draft}
                  autoFocus
                  onChange={(e) => setDraft(e.target.value)}
                />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  className="h-7 rounded-md bg-[var(--color-navy)] px-2.5 text-[12px] text-white"
                  onClick={saveEdit}
                >
                  Salvar
                </button>
                <button
                  type="button"
                  className="h-7 text-[12px] text-[var(--color-muted)]"
                  onClick={() => setEditId(null)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium text-[#111b21]">
                  {f.name}:
                </div>
                <div className="whitespace-pre-wrap text-[13px] text-[#3b4a54]">
                  {values[f.id]}
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 rounded p-1 text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
                onClick={() => {
                  setEditId(f.id);
                  setDraft(values[f.id] ?? "");
                  setAdding(false);
                }}
              >
                <Pencil className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      ))}

      {adding ? (
        <div className="space-y-2 rounded-xl border border-dashed border-[var(--color-border)] p-2.5">
          {empty.length > 0 && (
            <select
              className="h-8 w-full rounded-md border border-[var(--color-border)] px-2 text-[12px]"
              value={pickId}
              onChange={(e) => setPickId(e.target.value)}
            >
              <option value="">{t("lc.useField")}</option>
              {empty.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}
          {pickId ? (
            <div className="flex gap-2">
              <button
                type="button"
                className="h-7 rounded-md bg-[var(--color-navy)] px-2.5 text-[12px] text-white"
                onClick={() => {
                  setEditId(pickId);
                  setDraft("");
                  setAdding(false);
                  setPickId("");
                }}
              >
                Adicionar
              </button>
              <button
                type="button"
                className="h-7 text-[12px] text-[var(--color-muted)]"
                onClick={() => {
                  setAdding(false);
                  setPickId("");
                }}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <>
              <input
                className="h-8 w-full rounded-md border border-[var(--color-border)] px-2 text-[12px]"
                placeholder={t("lc.newField")}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="h-7 rounded-md bg-[var(--color-navy)] px-2.5 text-[12px] text-white"
                  onClick={() => {
                    if (!newName.trim()) return;
                    const id = onAddDef(newName.trim(), "text");
                    setNewName("");
                    setAdding(false);
                    setEditId(id);
                    setDraft("");
                    toast.success(t("lc.fieldCreated"));
                  }}
                >
                  Criar
                </button>
                <button
                  type="button"
                  className="h-7 text-[12px] text-[var(--color-muted)]"
                  onClick={() => {
                    setAdding(false);
                    setNewName("");
                  }}
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--color-border)] py-1.5 text-[12px] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
          onClick={() => {
            setAdding(true);
            setEditId(null);
          }}
        >
          <Plus className="size-3.5" /> {t("lc.addField")}
        </button>
      )}
    </div>
  );
}
