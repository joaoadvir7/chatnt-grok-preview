import { createFileRoute } from '@tanstack/react-router'
import { useT } from "@/lib/i18n";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Folder,
  FolderPlus,
  GripHorizontal,
  Info,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useDismissOnOutside } from "@/hooks/use-dismiss-on-outside";
import { toast } from "sonner";
import { countAudience } from "@/lib/audience";
import { FlowWorkspace } from "@/routes/automacoes.$id";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DetailsModal } from "@/components/system/DetailsModal";
import { buildSystemRecord, recordContext, type SystemRecord } from "@/lib/system-record";
import { useCrmStore } from "@/lib/store";
import type {
  Broadcast,
  BroadcastAudience,
  BroadcastChannel,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/broadcasts")({
  component: BroadcastsPage,
});

const emptyAudience = (): BroadcastAudience => ({
  includeTagIds: [],
  excludeTagIds: [],
  tagMode: "any",
  window: "any",
});

type View = "list" | "trash" | "editor";
type AudienceTab = "tags" | "window" | "fields" | "crm";

function BroadcastsPage() {
  const t = useT();
  const broadcasts = useCrmStore((s) => s.broadcasts);
  const folders = useCrmStore((s) => s.broadcastFolders) ?? [];
  const templates = useCrmStore((s) => s.templates);
  const tags = useCrmStore((s) => s.tags);
  const contacts = useCrmStore((s) => s.contacts);
  const customFields = useCrmStore((s) => s.customFields);
  const stages = useCrmStore((s) => s.stages);
  const deals = useCrmStore((s) => s.deals);
  const createBroadcast = useCrmStore((s) => s.createBroadcast);
  const sendBroadcast = useCrmStore((s) => s.sendBroadcast);
  const trashBroadcast = useCrmStore((s) => s.trashBroadcast);
  const restoreBroadcast = useCrmStore((s) => s.restoreBroadcast);
  const deleteBroadcast = useCrmStore((s) => s.deleteBroadcast);
  const createBroadcastFolder = useCrmStore((s) => s.createBroadcastFolder);
  const renameBroadcastFolder = useCrmStore((s) => s.renameBroadcastFolder);
  const deleteBroadcastFolder = useCrmStore((s) => s.deleteBroadcastFolder);
  const moveBroadcastFolder = useCrmStore((s) => s.moveBroadcastFolder);
  const reorderBroadcastFolders = useCrmStore((s) => s.reorderBroadcastFolders);
  const reorderBroadcasts = useCrmStore((s) => s.reorderBroadcasts);
  const updateBroadcast = useCrmStore((s) => s.updateBroadcast);
  const ensureBroadcastFlow = useCrmStore((s) => s.ensureBroadcastFlow);
  const sessionScope = useCrmStore((s) => s.sessionScope);
  const activeAgentId = useCrmStore((s) => s.activeAgentId);
  const connections = useCrmStore((s) => s.connections);
  const [details, setDetails] = useState<SystemRecord | null>(null);
  const [folderMoveId, setFolderMoveId] = useState<string | null>(null);

  const [view, setView] = useState<View>("list");
  const [folderFilter, setFolderFilter] = useState<string | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showFolder, setShowFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderMenu, setFolderMenu] = useState<string | null>(null);
  const [rowMenu, setRowMenu] = useState<{
    id: string;
    top: number;
    left: number;
    maxH: number;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [channel, setChannel] = useState<BroadcastChannel>("whatsapp");
  const [name, setName] = useState("");
  const [type, setType] = useState<"imediato" | "agendado">("imediato");
  const [scheduledAt, setScheduledAt] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [audience, setAudience] = useState<BroadcastAudience>(emptyAudience);
  const [editFolderId, setEditFolderId] = useState("");
  const [audTab, setAudTab] = useState<AudienceTab>("tags");
  const [showFlowStrip, setShowFlowStrip] = useState(false);
  const [flowId, setFlowId] = useState("");
  const [flowExpanded, setFlowExpanded] = useState(false);
  const [gearOpen, setGearOpen] = useState(false);
  const [draftMenu, setDraftMenu] = useState<string | null>(null);
  const dragFolder = useRef<string | null>(null);
  const dragDraft = useRef<string | null>(null);
  const dragged = useRef(false);
  const [moveOpen, setMoveOpen] = useState(false);

  const dismissBcMenus = useCallback(() => {
    setFolderMenu(null);
    setGearOpen(false);
    setDraftMenu(null);
  }, []);
  useDismissOnOutside(dismissBcMenus, Boolean(folderMenu) || gearOpen || Boolean(draftMenu));

  const approved = templates.filter((t) => t.status === "Aprovado");
  const selectedTpl = templates.find((t) => t.id === templateId);

  const liveCount = useMemo(() => {
    let n = countAudience(contacts, audience);
    if (audience.stageId) {
      const ids = new Set(
        deals.filter((d) => d.stageId === audience.stageId).map((d) => d.contactId),
      );
      n = contacts.filter((c) => ids.has(c.id)).length;
      if (audience.includeTagIds.length || audience.excludeTagIds.length) {
        n = countAudience(
          contacts.filter((c) => ids.has(c.id)),
          audience,
        );
      }
    }
    return n;
  }, [contacts, audience, deals]);

  const drafts = broadcasts.filter((b) => !b.trashed && b.status === "rascunho");
  const sent = broadcasts.filter((b) => !b.trashed && b.status !== "rascunho");
  const trashed = broadcasts.filter((b) => b.trashed);

  const listed = (view === "trash" ? trashed : sent).filter((b) => {
    if (folderFilter !== "all" && b.folderId !== folderFilter) return false;
    if (query.trim() && !b.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  function openEditor(ch: BroadcastChannel, existing?: Broadcast) {
    setChannel(ch);
    if (existing) {
      setEditId(existing.id);
      setName(existing.name);
      setType(existing.type);
      setScheduledAt(existing.scheduledAt ?? "");
      setTemplateId(existing.templateId ?? "");
      setAudience(existing.audience ?? emptyAudience());
      setEditFolderId(existing.folderId ?? "");
    } else {
      setEditId(null);
      setName("");
      setType("imediato");
      setScheduledAt("");
      setTemplateId(approved[0]?.id ?? "");
      setAudience(emptyAudience());
      setEditFolderId(folderFilter === "all" ? "" : folderFilter);
    }
    setShowCreate(false);
    setShowFlowStrip(ch === "sms" || ch === "call" || Boolean(existing?.flowId));
    setFlowId(existing?.flowId ?? "");
    setFlowExpanded(false);
    setView("editor");
  }

  function persist(asDraft: boolean, andSend: boolean, opts?: { requireTemplate?: boolean }): string | null {
    if (!name.trim()) {
      toast.error("Informe o nome");
      return null;
    }
    if (channel === "whatsapp" && !templateId && opts?.requireTemplate !== false && andSend) {
      toast.error("Selecione um template");
      return null;
    }
    let id = editId;
    if (!id) {
      id = createBroadcast({
        name,
        type,
        scheduledAt: type === "agendado" ? scheduledAt || undefined : undefined,
        templateId,
        audience,
        asDraft: true,
        channel,
        folderId: editFolderId || undefined,
      });
      setEditId(id);
    } else {
      updateBroadcast(id, {
        name,
        type,
        scheduledAt: type === "agendado" ? scheduledAt || undefined : undefined,
        templateId,
        audience,
        folderId: editFolderId || undefined,
        channel,
        status: asDraft && !andSend ? "rascunho" : undefined,
      });
    }
    if (andSend) {
      if (liveCount === 0) {
        toast.error("Nenhum contato no público-alvo");
        return null;
      }
      sendBroadcast(id);
      toast.success(`Enviado para ${liveCount} contato(s)`);
      setView("list");
    } else if (!asDraft) {
      setView("list");
    } else {
      toast.success("Rascunho salvo");
    }
    return id;
  }

  function openFlow() {
    const id = persist(true, false, { requireTemplate: false });
    if (!id) return;
    const fid = ensureBroadcastFlow(id);
    if (!fid) return;
    setFlowId(fid);
    setShowFlowStrip(true);
    setFlowExpanded(true);
  }

  function exportBroadcast(b: Broadcast) {
    const blob = new Blob([JSON.stringify(b, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${b.name.replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("JSON exportado");
  }

  function recalc(b: Broadcast) {
    const sent = b.metrics.sent || b.audienceCount || 0;
    updateBroadcast(b.id, {
      metrics: {
        ...b.metrics,
        delivered: Math.round(sent * 0.88),
        read: Math.round(sent * 0.6),
        failed: Math.round(sent * 0.09),
      },
    });
    toast.success("Métricas recalculadas");
  }

  function dup(b: Broadcast, suffix = " (cópia)", skipName = false) {
    const id = createBroadcast({
      name: skipName ? `Fluxo ${b.name}` : `${b.name}${suffix}`,
      type: b.type,
      templateId: b.templateId ?? "",
      audience: b.audience,
      asDraft: true,
      channel: b.channel,
      folderId: b.folderId,
    });
    setRowMenu(null);
    toast.success("Duplicado");
    const copy = useCrmStore.getState().broadcasts.find((x) => x.id === id);
    if (copy) openEditor(copy.channel ?? "whatsapp", copy);
  }

  function moveSelected(folderId: string) {
    selectedIds.forEach((id) => updateBroadcast(id, { folderId: folderId || undefined }));
    setMoveOpen(false);
    setGearOpen(false);
    toast.success("Movido");
  }

  function trashSelected() {
    selectedIds.forEach((id) => trashBroadcast(id));
    setSelectedIds([]);
    setGearOpen(false);
    toast.success("Enviado para a lixeira");
  }

  function handleJson(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result ?? "{}")) as {
          name?: string;
          templateId?: string;
          type?: "imediato" | "agendado";
          audience?: BroadcastAudience;
          channel?: BroadcastChannel;
        };
        openEditor(data.channel ?? "whatsapp");
        setName(data.name ?? file.name.replace(/\.json$/i, ""));
        if (data.templateId) setTemplateId(data.templateId);
        if (data.type) setType(data.type);
        if (data.audience) setAudience({ ...emptyAudience(), ...data.audience });
        toast.success("JSON importado");
      } catch {
        toast.error("JSON inválido");
      }
    };
    reader.readAsText(file);
  }

  const sentCount = sent.length;

  return (
    <AppShell title={t("page.broadcasts")}>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleJson(f);
          e.target.value = "";
        }}
      />

      {view === "editor" ? (
        <Editor
          channel={channel}
          name={name}
          setName={setName}
          type={type}
          setType={setType}
          scheduledAt={scheduledAt}
          setScheduledAt={setScheduledAt}
          templateId={templateId}
          setTemplateId={setTemplateId}
          templates={approved}
          selectedTpl={selectedTpl}
          audience={audience}
          setAudience={setAudience}
          audTab={audTab}
          setAudTab={setAudTab}
          tags={tags}
          customFields={customFields}
          stages={stages}
          folders={folders}
          editFolderId={editFolderId}
          setEditFolderId={setEditFolderId}
          liveCount={liveCount}
          showFlowStrip={showFlowStrip}
          flowId={flowId}
          flowExpanded={flowExpanded}
          onShowFlow={() => {
            openFlow();
            setFlowExpanded(false);
          }}
          onOpenFlow={openFlow}
          onExpandFlow={() => setFlowExpanded(true)}
          onBack={() => setView("list")}
          onDraft={() => {
            if (persist(true, false)) setView("list");
          }}
          onSend={() => persist(false, true)}
        />
      ) : (
        <div className="-m-3 space-y-4 bg-[#f3f5fa] p-5 pb-24 sm:-m-5 sm:p-6">
          <section className="rounded-2xl border border-[#e2e7f0] bg-white px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-[22px] font-bold text-[#1a2744]">Broadcasts</h1>
                <p className="mt-1 max-w-2xl text-[14.5px] text-[#5a6780]">
                  Envie mensagens em massa pelo WhatsApp com a API oficial, de forma segura e eficiente.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="flex h-10 items-center gap-2 rounded-full border border-[#0050a0] px-4 text-[14.5px] font-semibold text-[#0050a0]"
                  onClick={() => {
                    setFolderName("");
                    setShowFolder(true);
                  }}
                >
                  Nova Pasta <Folder className="size-4" />
                </button>
                <button
                  type="button"
                  className="flex h-10 items-center gap-2 rounded-full bg-[#0050a0] px-4 text-[14.5px] font-semibold text-white"
                  onClick={() => setShowCreate(true)}
                >
                  Adicionar <Plus className="size-4" />
                </button>
              </div>
            </div>
          </section>

          {view === "list" && (
            <section className="mt-4 rounded-2xl border border-[#e2e7f0] bg-white px-5 py-4">
              <h2 className="text-[18px] font-bold text-[#1a2744]">Pastas</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <FolderChip
                  label="Todas"
                  active={folderFilter === "all"}
                  onClick={() => setFolderFilter("all")}
                />
                {folders.map((f) => (
                  <div
                    key={f.id}
                    className="relative cursor-grab active:cursor-grabbing"
                    data-menu
                    draggable
                    onDragStart={(e) => {
                      dragFolder.current = f.id;
                      dragged.current = false;
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", f.id);
                    }}
                    onDrag={() => {
                      dragged.current = true;
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = dragFolder.current ?? e.dataTransfer.getData("text/plain");
                      if (from) reorderBroadcastFolders(from, f.id);
                      dragFolder.current = null;
                    }}
                  >
                    <FolderChip
                      label={f.name}
                      active={folderFilter === f.id}
                      onClick={() => {
                        if (dragged.current) return;
                        setFolderFilter(f.id);
                      }}
                      onMenu={() => setFolderMenu(folderMenu === f.id ? null : f.id)}
                    />
                    {folderMenu === f.id && (
                      <div className="absolute top-11 left-0 z-20 w-44 overflow-hidden rounded-xl border bg-white py-1 shadow-lg">
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-[14px] hover:bg-[#f4f6fa]"
                          onClick={() => {
                            setDetails(
                              buildSystemRecord(
                                { ...f, status: f.status ?? "enabled" },
                                {
                                  type: "broadcasts",
                                  ...recordContext(sessionScope, activeAgentId, connections),
                                },
                              ),
                            );
                            setFolderMenu(null);
                          }}
                        >
                          Detalhes
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-[14px] hover:bg-[#f4f6fa]"
                          onClick={() => {
                            const n = prompt("Renomear pasta", f.name);
                            if (n?.trim()) renameBroadcastFolder(f.id, n);
                            setFolderMenu(null);
                          }}
                        >
                          Renomear
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-[14px] hover:bg-[#f4f6fa]"
                          onClick={() => {
                            setFolderMoveId(f.id);
                            setFolderMenu(null);
                          }}
                        >
                          Mover
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-[14px] text-red-600 hover:bg-red-50"
                          onClick={() => {
                            deleteBroadcastFolder(f.id);
                            if (folderFilter === f.id) setFolderFilter("all");
                            setFolderMenu(null);
                          }}
                        >
                          Apagar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {view === "list" && drafts.length > 0 && (
            <section className="mt-4 rounded-2xl border border-[#e2e7f0] bg-white px-5 py-4">
              <h2 className="text-[18px] font-bold text-[#1a2744]">Rascunho</h2>
              <p className="text-[14px] text-[#5a6780]">
                Clique no Broadcast que deseja terminar a configuração de envio.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {drafts.map((b) => (
                  <div
                    key={b.id}
                    className="relative min-w-[200px] max-w-[260px] cursor-grab rounded-xl border border-[#c5cde0] bg-[#e6eef8] px-4 py-3 active:cursor-grabbing"
                    data-menu
                    draggable
                    onDragStart={(e) => {
                      dragDraft.current = b.id;
                      dragged.current = false;
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", b.id);
                    }}
                    onDrag={() => {
                      dragged.current = true;
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = dragDraft.current ?? e.dataTransfer.getData("text/plain");
                      if (from) reorderBroadcasts(from, b.id);
                      dragDraft.current = null;
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        className="min-w-0 text-left font-semibold text-[#1a2744]"
                        onClick={() => {
                          if (dragged.current) return;
                          openEditor(b.channel ?? "whatsapp", b);
                        }}
                      >
                        {b.name}
                      </button>
                      <button
                        type="button"
                        className="flex size-7 shrink-0 items-center justify-center rounded-full text-[#8b95a8] hover:bg-white/70"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={() => setDraftMenu(draftMenu === b.id ? null : b.id)}
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="mt-1 w-full text-left"
                      onClick={() => {
                        if (dragged.current) return;
                        openEditor(b.channel ?? "whatsapp", b);
                      }}
                    >
                      <div className="text-[13.5px] text-[#5a6780]">
                        {b.type === "agendado" ? "Agendado" : "Imediato"}
                      </div>
                      <div className="mt-2 text-[13px] text-[#5a6780]">{fmt(b.createdAt)}</div>
                    </button>
                    {draftMenu === b.id && (
                      <div className="absolute top-10 right-2 z-40 w-[250px] overflow-hidden rounded-xl border border-[#e2e7f0] bg-white py-1 shadow-[0_12px_32px_rgb(16_24_40/0.16)]">
                        <MenuItem
                          label="Editar"
                          onClick={() => {
                            openEditor(b.channel ?? "whatsapp", b);
                            setDraftMenu(null);
                          }}
                        />
                        <MenuItem
                          label="Status do fluxo"
                          onClick={() => {
                            toast.message(b.flowId ? "Fluxo vinculado" : "Sem fluxo");
                            setDraftMenu(null);
                          }}
                        />
                        <MenuItem
                          label="Mover"
                          onClick={() => {
                            setSelectedIds([b.id]);
                            setMoveOpen(true);
                            setDraftMenu(null);
                          }}
                        />
                        <MenuItem label="Duplicar" onClick={() => { dup(b); setDraftMenu(null); }} />
                        <MenuItem
                          label="Duplicar para outra conexão"
                          onClick={() => {
                            dup(b, " (outra conexão)");
                            setDraftMenu(null);
                          }}
                        />
                        <MenuItem
                          label="Duplicar sem broadcast"
                          onClick={() => {
                            dup(b, " (fluxo)", true);
                            setDraftMenu(null);
                          }}
                        />
                        <MenuItem
                          label="Detalhes"
                          onClick={() => {
                            setDetails(
                              buildSystemRecord(
                                {
                                  id: b.id,
                                  name: b.name,
                                  folderId: b.folderId,
                                  createdAt: b.createdAt,
                                  updatedAt: b.createdAt,
                                  status: b.status,
                                },
                                {
                                  type: "broadcast_draft",
                                  ...recordContext(sessionScope, activeAgentId, connections),
                                },
                              ),
                            );
                            setDraftMenu(null);
                          }}
                        />
                        <MenuItem
                          label="Excluir"
                          danger
                          onClick={() => {
                            trashBroadcast(b.id);
                            setDraftMenu(null);
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-4 rounded-2xl border border-[#e2e7f0] bg-white px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-bold text-[#1a2744]">
                  {view === "trash" ? "Lixeira" : "Lista de broadcasts"}
                </h2>
                <p className="text-[13.5px] text-[#5a6780]">
                  {view === "trash"
                    ? `${trashed.length} item(ns) na lixeira`
                    : `${selectedIds.length} broadcasts selecionados de ${sentCount} enviados.`}
                </p>
              </div>
              <button type="button" className="flex items-center gap-1 text-[13.5px] text-[#5a6780]">
                Como funciona o envio de Broadcast? <Info className="size-4" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8b95a8]" />
                <input
                  className="h-10 w-full rounded-full bg-[#f3f6f4] pr-3 pl-9 text-[14.5px] outline-none"
                  placeholder="Procure pelo nome"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <button
                type="button"
                className={cn(
                  "flex h-10 items-center gap-2 rounded-full border px-3 text-[14px] font-medium",
                  view === "trash"
                    ? "border-[#0050a0] bg-[#e6eef8] text-[#0050a0]"
                    : "border-[#c5cde0] text-[#0050a0]",
                )}
                onClick={() => setView(view === "trash" ? "list" : "trash")}
              >
                <Trash2 className="size-4" /> Lixeira
              </button>
              <div className="relative" data-menu>
                <button
                  type="button"
                  disabled={selectedIds.length === 0}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full border",
                    selectedIds.length
                      ? "border-[#0050a0] text-[#0050a0]"
                      : "border-[#c5cde0] text-[#b8c0d0]",
                  )}
                  onClick={() => selectedIds.length && setGearOpen((v) => !v)}
                >
                  <Settings className="size-4" />
                </button>
                {gearOpen && (
                  <div className="absolute top-11 right-0 z-30 w-40 overflow-hidden rounded-xl border bg-white shadow-lg">
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left hover:bg-[#f4f6fa]"
                      onClick={() => {
                        setMoveOpen(true);
                        setGearOpen(false);
                      }}
                    >
                      Mover
                    </button>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-red-600 hover:bg-red-50"
                      onClick={trashSelected}
                    >
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-[15px]">
                <thead>
                  <tr className="border-b text-[#5a6780]">
                    <th className="w-10 py-2 font-medium">
                      <input
                        type="checkbox"
                        checked={listed.length > 0 && listed.every((b) => selectedIds.includes(b.id))}
                        onChange={(e) =>
                          setSelectedIds(e.target.checked ? listed.map((b) => b.id) : [])
                        }
                      />
                    </th>
                    <th className="py-2 font-semibold">Nome</th>
                    <th className="py-2 font-semibold">Enviado</th>
                    <th className="py-2 font-semibold">Base</th>
                    <th className="py-2 text-center font-semibold">Enviado</th>
                    <th className="py-2 text-center font-semibold">Entregue</th>
                    <th className="py-2 text-center font-semibold">Lido</th>
                    <th className="py-2 text-center font-semibold">Falha</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {listed.map((b) => {
                    const base = b.audienceCount || b.metrics.sent || 0;
                    const sentPct = pct(b.metrics.sent, base || b.metrics.sent);
                    const delPct = pct(b.metrics.delivered, b.metrics.sent);
                    const readPct = pct(b.metrics.read, b.metrics.sent);
                    const failPct = pct(b.metrics.failed, b.metrics.sent);
                    return (
                      <tr key={b.id} className="border-b border-[#eef1f7]">
                        <td className="py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(b.id)}
                            onChange={(e) =>
                              setSelectedIds((ids) =>
                                e.target.checked ? [...ids, b.id] : ids.filter((x) => x !== b.id),
                              )
                            }
                          />
                        </td>
                        <td className="max-w-[360px] py-4 pr-4 font-medium text-[#1a2744]">
                          <button
                            type="button"
                            className="text-left hover:text-[#0050a0]"
                            onClick={() => openEditor(b.channel ?? "whatsapp", b)}
                          >
                            {b.name}
                          </button>
                        </td>
                        <td className="py-4 whitespace-nowrap text-[#5a6780]">
                          {b.sentAt ? fmt(b.sentAt) : "—"}
                        </td>
                        <td className="py-4">{base}</td>
                        <td className="py-4"><Ring value={sentPct} /></td>
                        <td className="py-4"><Ring value={delPct} /></td>
                        <td className="py-4"><Ring value={readPct} /></td>
                        <td className="py-4"><Ring value={failPct} danger /></td>
                        <td className="py-4">
                          <button
                            type="button"
                            className="flex size-8 items-center justify-center rounded-full hover:bg-[#eef1f7]"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (rowMenu?.id === b.id) {
                                setRowMenu(null);
                                return;
                              }
                              const r = e.currentTarget.getBoundingClientRect();
                              const w = 288;
                              const itemH = view === "trash" ? 96 : 468;
                              const spaceBelow = window.innerHeight - r.bottom - 12;
                              const openUp = spaceBelow < itemH;
                              const top = openUp
                                ? Math.max(8, r.top - itemH - 6)
                                : r.bottom + 6;
                              let left = r.right - w;
                              if (left < 12) left = 12;
                              if (left + w > window.innerWidth - 12) {
                                left = window.innerWidth - w - 12;
                              }
                              setRowMenu({
                                id: b.id,
                                top,
                                left,
                                maxH: window.innerHeight - 16,
                              });
                            }}
                          >
                            <MoreHorizontal className="size-4 text-[#8b95a8]" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {listed.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-[#8b95a8]">
                        Nenhum broadcast aqui.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {rowMenu &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[80] cursor-default bg-black/10"
              aria-label="Fechar menu"
              onClick={() => setRowMenu(null)}
            />
            <div
              className="fixed z-[90] w-[280px] overflow-y-auto rounded-2xl border border-[#e2e7f0] bg-white py-1 shadow-[0_12px_40px_rgb(16_24_40/0.18)]"
              style={{ top: rowMenu.top, left: rowMenu.left, maxHeight: rowMenu.maxH }}
            >
              {(() => {
                const b = broadcasts.find((x) => x.id === rowMenu.id);
                if (!b) return null;
                if (view === "trash") {
                  return (
                    <>
                      <MenuItem
                        label="Restaurar"
                        onClick={() => {
                          restoreBroadcast(b.id);
                          setRowMenu(null);
                        }}
                      />
                      <MenuItem
                        label="Excluir de vez"
                        danger
                        onClick={() => {
                          deleteBroadcast(b.id);
                          setRowMenu(null);
                        }}
                      />
                    </>
                  );
                }
                return (
                  <>
                    <MenuItem label="Visualizar" onClick={() => { openEditor(b.channel ?? "whatsapp", b); setRowMenu(null); }} />
                    <MenuItem label="Exportar" onClick={() => { exportBroadcast(b); setRowMenu(null); }} />
                    <MenuItem label="Recalcular métricas" onClick={() => { recalc(b); setRowMenu(null); }} />
                    <MenuItem label="Status do fluxo" onClick={() => { toast.message(b.flowId ? "Fluxo vinculado" : "Sem fluxo"); setRowMenu(null); }} />
                    <MenuItem label="Mover" onClick={() => { setSelectedIds([b.id]); setMoveOpen(true); setRowMenu(null); }} />
                    <MenuItem label="Exportar Template (JSON)" onClick={() => { exportBroadcast(b); setRowMenu(null); }} />
                    <MenuItem label="Duplicar" onClick={() => dup(b)} />
                    <MenuItem label="Duplicar para outra conexão" onClick={() => dup(b, " (outra conexão)")} />
                    <MenuItem label="Duplicar sem broadcast" onClick={() => dup(b, " (fluxo)", true)} />
                    <MenuItem label="Logs" onClick={() => { toast.message("Sem logs neste disparo"); setRowMenu(null); }} />
                    <MenuItem label="Detalhes" onClick={() => {
                      setDetails(
                        buildSystemRecord(
                          {
                            id: b.id,
                            name: b.name,
                            folderId: b.folderId,
                            createdAt: b.createdAt,
                            updatedAt: b.sentAt ?? b.createdAt,
                            status: b.status,
                          },
                          {
                            type: "broadcast",
                            ...recordContext(sessionScope, activeAgentId, connections),
                          },
                        ),
                      );
                      setRowMenu(null);
                    }} />
                    <div className="my-1 border-t border-[#eef1f7]" />
                    <MenuItem
                      label="Excluir"
                      danger
                      onClick={() => {
                        trashBroadcast(b.id);
                        setRowMenu(null);
                      }}
                    />
                  </>
                );
              })()}
            </div>
          </>,
          document.body,
        )}

      {showCreate && (
        <Modal onClose={() => setShowCreate(false)}>
          <h2 className="text-[22px] font-bold">Cadastrar Broadcast</h2>
          <p className="mt-1 text-[14.5px] text-[#5a6780]">
            Selecione uma das opções abaixo para iniciar a configuração do seu broadcast.
          </p>
          <div className="mt-4 space-y-2.5">
            <CreateOpt
              icon={<Sparkles className="size-5" />}
              title="Começar do zero"
              hint="Crie seu broadcast do zero, personalize cada detalhe e alcance seus clientes com mais eficiência!"
              onClick={() => openEditor("whatsapp")}
            />
            <CreateOpt
              icon={<MessageSquare className="size-5" />}
              title="Criar broadcast para SMS"
              hint="Crie seu broadcast do zero iniciando a partir de um fluxo com o envio de sms."
              onClick={() => openEditor("sms")}
            />
            <CreateOpt
              icon={<Phone className="size-5" />}
              title="Criar broadcast para ligação"
              hint="Crie seu broadcast do zero iniciando a partir de um fluxo com uma ligação gravada."
              onClick={() => openEditor("call")}
            />
            <CreateOpt
              icon={<Upload className="size-5" />}
              title="Importar Template (JSON)"
              hint="Importe broadcasts diretamente de arquivos JSON."
              onClick={() => {
                setShowCreate(false);
                fileRef.current?.click();
              }}
            />
          </div>
        </Modal>
      )}

      {showFolder && (
        <Modal onClose={() => setShowFolder(false)}>
          <h2 className="text-[20px] font-bold">Nova pasta</h2>
          <Input
            className="mt-3"
            placeholder="Nome da pasta"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowFolder(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!folderName.trim()) return;
                createBroadcastFolder(folderName);
                setShowFolder(false);
                toast.success("Pasta criada");
              }}
            >
              <FolderPlus className="size-4" /> Criar
            </Button>
          </div>
        </Modal>
      )}

      {moveOpen && (
        <Modal onClose={() => setMoveOpen(false)}>
          <h2 className="text-[20px] font-bold">Mover para pasta</h2>
          <div className="mt-3 space-y-1">
            <button
              type="button"
              className="block w-full rounded-lg px-3 py-2 text-left hover:bg-[#f4f6fa]"
              onClick={() => moveSelected("")}
            >
              Sem pasta
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                className="block w-full rounded-lg px-3 py-2 text-left hover:bg-[#f4f6fa]"
                onClick={() => moveSelected(f.id)}
              >
                {f.name}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {folderMoveId && (
        <Modal onClose={() => setFolderMoveId(null)}>
          <h2 className="text-[20px] font-bold">Mover pasta</h2>
          <div className="mt-3 space-y-1">
            <button
              type="button"
              className="block w-full rounded-lg px-3 py-2 text-left hover:bg-[#f4f6fa]"
              onClick={() => {
                moveBroadcastFolder(folderMoveId, null);
                setFolderMoveId(null);
                toast.success("Movida para a raiz");
              }}
            >
              Raiz (sem pasta pai)
            </button>
            {folders
              .filter((f) => f.id !== folderMoveId)
              .map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="block w-full rounded-lg px-3 py-2 text-left hover:bg-[#f4f6fa]"
                  onClick={() => {
                    moveBroadcastFolder(folderMoveId, f.id);
                    setFolderMoveId(null);
                    toast.success("Movida");
                  }}
                >
                  {f.name}
                </button>
              ))}
          </div>
        </Modal>
      )}

      {details && (
        <DetailsModal title="Detalhes" record={details} onClose={() => setDetails(null)} />
      )}
    </AppShell>
  );
}

function Editor({
  channel,
  name,
  setName,
  type,
  setType,
  scheduledAt,
  setScheduledAt,
  templateId,
  setTemplateId,
  templates,
  selectedTpl,
  audience,
  setAudience,
  audTab,
  setAudTab,
  tags,
  customFields,
  stages,
  folders,
  editFolderId,
  setEditFolderId,
  liveCount,
  showFlowStrip,
  flowId,
  flowExpanded,
  onShowFlow,
  onOpenFlow,
  onExpandFlow,
  onBack,
  onDraft,
  onSend,
}: {
  channel: BroadcastChannel;
  name: string;
  setName: (v: string) => void;
  type: "imediato" | "agendado";
  setType: (v: "imediato" | "agendado") => void;
  scheduledAt: string;
  setScheduledAt: (v: string) => void;
  templateId: string;
  setTemplateId: (v: string) => void;
  templates: { id: string; name: string; body: string; buttons: string[] }[];
  selectedTpl?: { id: string; name: string; body: string; buttons: string[] };
  audience: BroadcastAudience;
  setAudience: (a: BroadcastAudience) => void;
  audTab: AudienceTab;
  setAudTab: (t: AudienceTab) => void;
  tags: { id: string; name: string }[];
  customFields: { id: string; name: string }[];
  stages: { id: string; name: string }[];
  folders: { id: string; name: string }[];
  editFolderId: string;
  setEditFolderId: (v: string) => void;
  liveCount: number;
  showFlowStrip: boolean;
  flowId: string;
  flowExpanded: boolean;
  onShowFlow: () => void;
  onOpenFlow: () => void;
  onExpandFlow: () => void;
  onBack: () => void;
  onDraft: () => void;
  onSend: () => void;
}) {
  const canSend = Boolean(name.trim() && (channel !== "whatsapp" || templateId) && liveCount > 0);
  const showFlow = showFlowStrip || channel === "sms" || channel === "call";
  const [infoOpen, setInfoOpen] = useState(!showFlow);
  const [flowOpen, setFlowOpen] = useState(true);
  const [flowH, setFlowH] = useState(420);
  const resizeRef = useRef<{ y: number; h: number } | null>(null);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const next = resizeRef.current.h + (e.clientY - resizeRef.current.y);
      setFlowH(Math.min(880, Math.max(200, next)));
    };
    const up = () => {
      resizeRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  return (
    <div className="space-y-4 pb-16">
      <section className="rounded-2xl border border-[#e2e7f0] bg-white px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[20px] font-bold text-[#1a2744]">Broadcasts / Novo Broadcast</h1>
            <p className="mt-1 text-[14.5px] text-[#5a6780]">
              Configure seu broadcast, selecione um template da Meta e envie mensagens para seus contatos com facilidade.
            </p>
          </div>
          <button
            type="button"
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#c5cde0] px-3.5 text-[13.5px] font-semibold text-[#0050a0] hover:bg-[#e6eef8]"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" />
            Voltar aos broadcasts
          </button>
        </div>
      </section>

      {showFlow && (
        <section className="mt-4 overflow-hidden rounded-2xl border border-[#e2e7f0] bg-white">
          <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[#e2e7f0] bg-white px-5 py-3">
            <div className="min-w-0">
              <h2 className="text-[18px] font-bold">Configuração do fluxo</h2>
              <p className="mt-0.5 truncate text-[13px] text-[#5a6780]">
                {flowOpen
                  ? "Arraste a barra de baixo para mudar a altura."
                  : "Fluxo recolhido — clique em Expandir para continuar editando."}
              </p>
            </div>
            <button
              type="button"
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#0050a0] px-3.5 text-[13.5px] font-semibold text-[#0050a0] hover:bg-[#e6eef8]"
              onClick={() => setFlowOpen((v) => !v)}
            >
              {flowOpen ? (
                <>
                  <ChevronUp className="size-4" /> Recolher
                </>
              ) : (
                <>
                  <ChevronDown className="size-4" /> Expandir
                </>
              )}
            </button>
          </div>
          {flowId ? (
            <div className={cn(!flowOpen && "hidden")}>
              <div className="overflow-hidden">
                {/* Mesmo FlowWorkspace das Automações — não criar canvas paralelo */}
                <FlowWorkspace automationId={flowId} embedded embedHeight={flowH} />
                <div
                  role="separator"
                  aria-label="Redimensionar fluxo"
                  title="Arraste para ajustar a altura"
                  className="flex h-4 cursor-ns-resize items-center justify-center border-t border-[#e2e7f0] bg-[#f7f8fb] hover:bg-[#eef2f7]"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    resizeRef.current = { y: e.clientY, h: flowH };
                    document.body.style.cursor = "ns-resize";
                    document.body.style.userSelect = "none";
                  }}
                >
                  <GripHorizontal className="size-4 text-[#8a9690]" />
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="m-4 flex min-h-[120px] w-[calc(100%-2rem)] items-center justify-center rounded-xl bg-[#e6eef8] text-[14px] font-semibold text-[#0050a0]"
              onClick={onOpenFlow}
            >
              Clique aqui para editar o Fluxo
            </button>
          )}
        </section>
      )}

      <div className={cn("mt-4 grid gap-4", channel === "whatsapp" && !showFlow ? "lg:grid-cols-[1fr_360px]" : "")}>
        <section className="rounded-2xl border border-[#e2e7f0] bg-white px-5 py-4">
          <button
            type="button"
            className="flex w-full items-start justify-between gap-2 text-left"
            onClick={() => setInfoOpen((v) => !v)}
          >
            <div>
              <h2 className="text-[18px] font-bold">Informações</h2>
              <p className="mt-1 max-w-xl text-[14px] text-[#5a6780]">
                {infoOpen
                  ? "Configure seu broadcast definindo as informações básicas, selecionando a mensagem e o público-alvo. Agende o envio e alcance seus contatos no momento certo."
                  : "Clique aqui para finalizar a configuração do seu broadcast, selecionar seu público e agendar o envio."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {channel === "whatsapp" && !showFlow && (
                <span
                  className="flex h-9 items-center gap-2 rounded-full border border-[#0050a0] px-3 text-[13.5px] font-semibold text-[#0050a0]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowFlow();
                  }}
                >
                  Construtor de fluxos
                </span>
              )}
              <ChevronDown className={cn("size-5 text-[#8b95a8] transition", infoOpen ? "rotate-180" : "")} />
            </div>
          </button>

          {infoOpen && (
            <div>

          <label className="mt-4 block text-[14px] font-semibold">
            Nome*
            <Input className="mt-1" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="mt-3 block text-[14px] font-semibold">
            Tipo de disparo*
            <select
              className="mt-1 h-11 w-full rounded-md border border-[#e2e7f0] px-3 text-[15px]"
              value={type}
              onChange={(e) => setType(e.target.value as "imediato" | "agendado")}
            >
              <option value="imediato">Imediato</option>
              <option value="agendado">Agendado</option>
            </select>
          </label>
          {type === "agendado" && (
            <Input className="mt-2" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          )}
          {channel === "whatsapp" && (
            <label className="mt-3 block text-[14px] font-semibold">
              Template*
              <select
                className="mt-1 h-11 w-full rounded-md border border-[#e2e7f0] px-3 text-[15px]"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                <option value="">Template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="mt-3 block text-[14px] font-semibold">
            Pasta
            <select
              className="mt-1 h-11 w-full rounded-md border border-[#e2e7f0] px-3 text-[15px]"
              value={editFolderId}
              onChange={(e) => setEditFolderId(e.target.value)}
            >
              <option value="">Sem pasta</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-5 rounded-2xl border border-[#e2e7f0] p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 font-bold">
                  <Users className="size-4 text-[#0050a0]" /> Público alvo
                </div>
                <p className="mt-1 text-[13.5px] text-[#5a6780]">
                  Filtre seus contatos com precisão e segmente seu público para garantir que o broadcast seja enviado para as pessoas certas.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border px-3 py-1 text-[13px]"
                onClick={() => setAudience(emptyAudience())}
              >
                Limpar filtros ×
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row">
              <div className="flex shrink-0 flex-row gap-2 sm:w-40 sm:flex-col">
                {(
                  [
                    ["tags", "Por Tags"],
                    ["window", "Janela"],
                    ["fields", "Campos Do Contato"],
                    ["crm", "Colunas Do CRM"],
                  ] as const
                ).map(([id, lab]) => (
                  <button
                    key={id}
                    type="button"
                    className={cn(
                      "rounded-md px-2 py-1.5 text-left text-[14px]",
                      audTab === id ? "border-l-2 border-[#0050a0] font-semibold" : "text-[#8b95a8]",
                    )}
                    onClick={() => setAudTab(id)}
                  >
                    {lab}
                  </button>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                {audTab === "tags" && (
                  <div className="space-y-3">
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[13.5px] font-medium">Possui alguma destas tags</span>
                        <div className="flex overflow-hidden rounded-md border">
                          <button
                            type="button"
                            className={cn("px-2 py-1 text-[12px] font-bold", audience.tagMode === "any" ? "bg-[#0050a0] text-white" : "")}
                            onClick={() => setAudience({ ...audience, tagMode: "any" })}
                          >
                            OU
                          </button>
                          <button
                            type="button"
                            className={cn("px-2 py-1 text-[12px] font-bold", audience.tagMode === "all" ? "bg-[#0050a0] text-white" : "")}
                            onClick={() => setAudience({ ...audience, tagMode: "all" })}
                          >
                            E
                          </button>
                        </div>
                      </div>
                      <TagMulti
                        tags={tags}
                        value={audience.includeTagIds}
                        onChange={(includeTagIds) => setAudience({ ...audience, includeTagIds })}
                      />
                    </div>
                    <div>
                      <span className="mb-1 block text-[13.5px] font-medium">Não possui alguma destas tags</span>
                      <TagMulti
                        tags={tags}
                        value={audience.excludeTagIds}
                        onChange={(excludeTagIds) => setAudience({ ...audience, excludeTagIds })}
                      />
                    </div>
                  </div>
                )}
                {audTab === "window" && (
                  <select
                    className="h-11 w-full rounded-md border px-3"
                    value={audience.window ?? "any"}
                    onChange={(e) =>
                      setAudience({ ...audience, window: e.target.value as BroadcastAudience["window"] })
                    }
                  >
                    <option value="any">Qualquer janela</option>
                    <option value="open">Janela de 24h aberta</option>
                    <option value="closed">Fora da janela de 24h</option>
                  </select>
                )}
                {audTab === "fields" && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      className="h-11 rounded-md border px-3"
                      value={audience.fieldId ?? ""}
                      onChange={(e) => setAudience({ ...audience, fieldId: e.target.value })}
                    >
                      <option value="">Campo</option>
                      {customFields.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="Valor"
                      value={audience.fieldValue ?? ""}
                      onChange={(e) => setAudience({ ...audience, fieldValue: e.target.value })}
                    />
                  </div>
                )}
                {audTab === "crm" && (
                  <select
                    className="h-11 w-full rounded-md border px-3"
                    value={audience.stageId ?? ""}
                    onChange={(e) => setAudience({ ...audience, stageId: e.target.value })}
                  >
                    <option value="">Qualquer etapa</option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <p className="mt-5 text-right text-[14.5px] text-[#5a6780]">
              Será enviado para um total de <b className="text-[#1a2744]">{liveCount} Contatos</b>.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <button type="button" className="text-[14.5px] text-[#5a6780]" onClick={onBack}>
              <ArrowLeft className="mr-1 inline size-4" /> Voltar
            </button>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="h-10 rounded-full border border-[#0050a0] px-4 text-[14.5px] font-semibold text-[#0050a0]"
                onClick={onDraft}
              >
                Salvar como rascunho
              </button>
              <button
                type="button"
                disabled={!canSend}
                className={cn(
                  "h-10 rounded-full px-4 text-[14.5px] font-semibold",
                  canSend ? "bg-[#0050a0] text-white" : "bg-[#c5cde0] text-[#8b95a8]",
                )}
                onClick={onSend}
              >
                Salvar e enviar agora
              </button>
            </div>
          </div>
            </div>
          )}
        </section>

        {channel === "whatsapp" && !showFlow && (
          <aside className="overflow-hidden rounded-2xl border border-[#e2e7f0] bg-white">
            <div className="border-b px-4 py-3 font-semibold">Prévia do modelo</div>
            <div className="wa-chat-wallpaper min-h-[420px] p-4">
              <div className="wa-bubble-out max-w-[92%] px-3 py-2">
                <p className="whitespace-pre-wrap text-[15px]">
                  {selectedTpl?.body || "Selecione um template para ver a prévia."}
                </p>
                <div className="mt-1 text-right text-[11px] text-[#667781]">
                  {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              {selectedTpl?.buttons.map((btn) => (
                <div key={btn} className="mt-1 max-w-[92%] rounded-lg bg-white py-2 text-center text-[14px] font-medium text-[#027eb5]">
                  {btn}
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function TagMulti({
  tags,
  value,
  onChange,
}: {
  tags: { id: string; name: string }[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div>
      <select
        className="h-11 w-full rounded-md border px-3"
        value=""
        onChange={(e) => {
          if (!e.target.value) return;
          if (!value.includes(e.target.value)) onChange([...value, e.target.value]);
        }}
      >
        <option value="">Tags</option>
        {tags
          .filter((t) => !value.includes(t.id))
          .map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
      </select>
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((id) => {
            const t = tags.find((x) => x.id === id);
            return (
              <button
                key={id}
                type="button"
                className="rounded-full bg-[#e6eef8] px-2.5 py-0.5 text-[13px] text-[#0050a0]"
                onClick={() => onChange(value.filter((x) => x !== id))}
              >
                {t?.name ?? id} ×
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FolderChip({
  label,
  active,
  onClick,
  onMenu,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  onMenu?: () => void;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-[14.5px]",
        active ? "border-[#0050a0] bg-[#e6eef8]" : "border-[#c5cde0] bg-white",
      )}
    >
      <button type="button" className="flex items-center gap-2" onClick={onClick}>
        <Folder className="size-4" /> {label}
      </button>
      {onMenu && (
        <button
          type="button"
          onClick={onMenu}
          onMouseDown={(e) => e.stopPropagation()}
          className="pl-1 text-[#8b95a8]"
        >
          <MoreHorizontal className="size-4" />
        </button>
      )}
    </div>
  );
}

function Ring({ value, danger }: { value: number; danger?: boolean }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, value)) / 100) * c;
  const color = danger ? "#e11d48" : "#0050a0";
  return (
    <div className="flex flex-col items-center">
      <svg width="46" height="46" viewBox="0 0 46 46">
        <circle cx="23" cy="23" r={r} fill="none" stroke="#e2e7f0" strokeWidth="5" />
        <circle
          cx="23"
          cy="23"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          transform="rotate(-90 23 23)"
        />
        <text x="23" y="27" textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>
          {value}%
        </text>
      </svg>
    </div>
  );
}

function CreateOpt({
  icon,
  title,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-[#e2e7f0] px-4 py-3.5 text-left hover:border-[#0050a0] hover:bg-[#f3f5fa]"
    >
      <div className="mb-1">{icon}</div>
      <div className="text-[16px] font-bold">{title}</div>
      <div className="mt-1 text-[13.5px] text-[#5a6780]">{hint}</div>
    </button>
  );
}

function MenuItem({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "block w-full px-4 py-2.5 text-left text-[15px] hover:bg-[#f4f6fa]",
        danger && "text-red-600 hover:bg-red-50",
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="float-right text-[#8b95a8]" onClick={onClose}>
          <X className="size-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}
