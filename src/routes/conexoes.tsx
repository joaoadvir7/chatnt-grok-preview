import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowLeftRight,
  BadgeCheck,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Folder,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Send,
  Signal,
  Smartphone,
  Trash2,
  TriangleAlert,
  Webhook,
  Wifi,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { DetailsModal } from "@/components/system/DetailsModal";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { useDismissOnOutside } from "@/hooks/use-dismiss-on-outside";
import {
  buildSystemRecord,
  recordContext,
  type SystemRecord,
} from "@/lib/system-record";
import { useCrmStore } from "@/lib/store";
import { useScopedData } from "@/lib/useScopedData";
import { cn } from "@/lib/utils";
import {
  completeEmbeddedSignup,
  listMetaWhatsAppAccounts,
  registerWebhookVerifyToken,
  sendWabaTestMessage,
  subscribeWabaWebhook,
  validateWabaCredentials,
  type MetaWabaPhone,
} from "@/lib/whatsapp-api";
import { launchEmbeddedSignup, loginFacebookBusiness } from "@/lib/meta-signup";
import {
  connectionLabel,
  emptyWaba,
  maskToken,
  webhookCallbackUrl,
} from "@/lib/whatsapp";
import type { Connection, WabaConfig } from "@/lib/types";

export const Route = createFileRoute("/conexoes")({
  component: ConexoesPage,
});

const FICTIONAL_IDS = new Set([
  "cx_mkt",
  "cx_anpa",
  "cx_apl",
  "cx_amc",
  "cx_misal",
]);

function isFictional(cx: Connection) {
  return Boolean(cx.isDemo) || FICTIONAL_IDS.has(cx.id);
}

function ConexoesPage() {
  const navigate = useNavigate();
  const folders = useCrmStore((s) => s.connectionFolders ?? []);
  const allConnections = useCrmStore((s) => s.connections);
  const createConnection = useCrmStore((s) => s.createConnection);
  const trashConnection = useCrmStore((s) => s.trashConnection);
  const restoreConnection = useCrmStore((s) => s.restoreConnection);
  const deleteConnection = useCrmStore((s) => s.deleteConnection);
  const createConnectionFolder = useCrmStore((s) => s.createConnectionFolder);
  const updateWaba = useCrmStore((s) => s.updateWaba);
  const setConnectionStatus = useCrmStore((s) => s.setConnectionStatus);
  const pushWebhookEvent = useCrmStore((s) => s.pushWebhookEvent);
  const logOutboundByPhone = useCrmStore((s) => s.logOutboundByPhone);
  const metaPlatform = useCrmStore((s) => s.metaPlatform);
  const setMetaPlatform = useCrmStore((s) => s.setMetaPlatform);
  const sessionScope = useCrmStore((s) => s.sessionScope);
  const activeAgentId = useCrmStore((s) => s.activeAgentId);
  const { connections: scoped, isRegional, sede } = useScopedData();

  const [folderId, setFolderId] = useState<string | "all">("all");
  const [q, setQ] = useState("");
  const [trashView, setTrashView] = useState(false);
  const [cardMenu, setCardMenu] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState<
    "pick" | "associate" | "accounts" | "meta-app"
  >("pick");
  const [createKind, setCreateKind] = useState<
    "nova" | "migrar" | "existente" | "coexist"
  >("nova");
  const [showGroups, setShowGroups] = useState(false);
  const [metaAppId, setMetaAppId] = useState("");
  const [metaConfigId, setMetaConfigId] = useState("");
  const [metaSecret, setMetaSecret] = useState("");
  const [launching, setLaunching] = useState(false);
  const [metaAccounts, setMetaAccounts] = useState<MetaWabaPhone[]>([]);
  const [listingToken, setListingToken] = useState("");
  const [accountsError, setAccountsError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [details, setDetails] = useState<SystemRecord | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const dismiss = useCallback(() => {
    setCardMenu(null);
    setShowGroups(false);
  }, []);
  useDismissOnOutside(dismiss, Boolean(cardMenu || showGroups));

  const ctx = recordContext(sessionScope, activeAgentId, allConnections);

  const listed = useMemo(() => {
    let rows = scoped.filter(
      (c) => !isFictional(c) && (trashView ? c.trashed : !c.trashed),
    );
    if (folderId !== "all" && !trashView) {
      rows = rows.filter((c) => c.folderId === folderId);
    }
    if (q.trim()) {
      const n = q.toLowerCase();
      rows = rows.filter(
        (c) =>
          c.name.toLowerCase().includes(n) ||
          c.phone.toLowerCase().includes(n) ||
          c.handle.toLowerCase().includes(n),
      );
    }
    return [...rows].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [scoped, folderId, q, trashView]);

  const editing = scoped.find((c) => c.id === editingId) ?? null;

  function openCreate() {
    setCreateStep("pick");
    setCreateKind("nova");
    setMetaAppId(metaPlatform?.appId ?? "");
    setMetaConfigId(metaPlatform?.configId ?? "");
    setMetaSecret(metaPlatform?.appSecret ?? "");
    setShowCreate(true);
  }

  async function startMetaSignup(
    kind: "nova" | "migrar" | "existente" | "coexist",
  ) {
    setCreateKind(kind);
    const appId = (metaPlatform?.appId || metaAppId).trim();
    const configId = (metaPlatform?.configId || metaConfigId).trim();
    const appSecret = (metaPlatform?.appSecret || metaSecret).trim();
    if (!appId || !configId) {
      setCreateStep("meta-app");
      return;
    }
    setShowCreate(false);
    setLaunching(true);
    toast.message("Abrindo o painel da Meta…");
    try {
      const session = await launchEmbeddedSignup({
        appId,
        configId,
        featureType:
          kind === "migrar"
            ? "only_waba_sharing"
            : kind === "coexist"
              ? "whatsapp_business_app_onboarding"
              : "",
      });
      if (!session.code && !session.accessToken && !session.wabaId && !session.phoneNumberId) {
        toast.message("Painel da Meta fechado");
        return;
      }
      const done = await completeEmbeddedSignup({
        data: {
          appId,
          appSecret: appSecret || undefined,
          code: session.code,
          accessToken: session.accessToken,
          wabaId: session.wabaId,
          phoneNumberId: session.phoneNumberId,
        },
      });
      const name =
        done.verifiedName?.trim() ||
        (kind === "coexist"
          ? "WhatsApp Business App"
          : kind === "migrar"
            ? "Conexão migrada"
            : "Nova conexão WhatsApp");
      const id = createConnection({
        name,
        phone: done.displayPhone || "",
        folderId: folderId === "all" ? undefined : folderId,
      });
      updateWaba(id, {
        appId,
        wabaId: done.wabaId ?? "",
        phoneNumberId: done.phoneNumberId ?? "",
        accessToken: done.accessToken ?? "",
        webhookVerifyToken: "chatnt_verify_token",
        verifiedName: done.verifiedName,
        lastValidatedAt: done.ok ? new Date().toISOString() : undefined,
        demoMode: false,
        coexistence: kind === "coexist",
      });
      setConnectionStatus(
        id,
        done.ok && done.phoneNumberId ? "conectado" : "configurando",
        {
          verified: Boolean(done.verifiedName),
          quality: done.quality ?? "Alta",
          phone: done.displayPhone || undefined,
          accountStatus: done.ok ? "Aprovado" : "Pendente",
        },
      );
      if (done.ok) toast.success("Número conectado pela Meta");
      else toast.message(done.error || "Conexão criada. Confira o token se precisar.");
      setEditingId(id);
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Não foi possível abrir o painel da Meta. Permita pop-ups e tente de novo.",
      );
      setShowCreate(true);
      setCreateStep("pick");
    } finally {
      setLaunching(false);
    }
  }

  function chooseKind(kind: "nova" | "migrar" | "existente" | "coexist") {
    setCreateKind(kind);
    if (kind === "existente") void startPullAccounts();
    else setCreateStep("associate");
  }

  function saveMetaAppAndLaunch() {
    const appId = metaAppId.trim();
    const configId = metaConfigId.trim();
    if (!appId || !configId) {
      toast.error("Informe o App ID e o Configuration ID do Embedded Signup");
      return;
    }
    setMetaPlatform({
      appId,
      configId,
      appSecret: metaSecret.trim(),
    });
    if (createKind === "existente") void startPullAccounts();
    else void startMetaSignup(createKind);
  }

  async function pullMetaAccounts(token: string) {
    const knownWabaIds = allConnections
      .map((c) => c.waba?.wabaId)
      .filter((id): id is string => Boolean(id));
    const res = await listMetaWhatsAppAccounts({
      data: { accessToken: token, knownWabaIds },
    });
    setListingToken(token);
    setMetaAccounts(res.accounts);
    setAccountsError(res.error ?? "");
    setCreateStep("accounts");
    setShowCreate(true);
    if (res.accounts.length) toast.success(`${res.accounts.length} número(s) encontrados na Meta`);
    else toast.message(res.error || "Nenhuma conta encontrada");
  }

  async function startPullAccounts() {
    setLaunching(true);
    setShowCreate(false);
    try {
      const existing = allConnections
        .map((c) => c.waba?.accessToken?.trim())
        .find((t) => t && t.length > 20 && !t.startsWith("DEMO_"));
      if (existing) {
        toast.message("Lendo as contas da Meta…");
        await pullMetaAccounts(existing);
        return;
      }
      const appId = (metaPlatform?.appId || metaAppId).trim();
      if (!appId) {
        setCreateStep("meta-app");
        setShowCreate(true);
        return;
      }
      toast.message("Entre na Meta para listar suas contas…");
      const session = await loginFacebookBusiness(appId);
      const token = session.accessToken;
      if (!token) {
        toast.error("Login da Meta cancelado ou sem token");
        setShowCreate(true);
        setCreateStep("associate");
        return;
      }
      await pullMetaAccounts(token);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível ler as contas da Meta");
      setShowCreate(true);
      setCreateStep("associate");
    } finally {
      setLaunching(false);
    }
  }

  function connectMetaAccount(acc: MetaWabaPhone) {
    const already = allConnections.find(
      (c) => c.waba?.phoneNumberId === acc.phoneNumberId && !c.trashed,
    );
    if (already) {
      setShowCreate(false);
      setEditingId(already.id);
      toast.message("Essa conexão já está no ChatNT");
      return;
    }
    const id = createConnection({
      name: acc.verifiedName || acc.wabaName || "WhatsApp Business",
      phone: acc.displayPhone,
      folderId: folderId === "all" ? undefined : folderId,
    });
    updateWaba(id, {
      appId: metaPlatform?.appId ?? "",
      wabaId: acc.wabaId,
      phoneNumberId: acc.phoneNumberId,
      accessToken: listingToken,
      webhookVerifyToken: "chatnt_verify_token",
      verifiedName: acc.verifiedName,
      lastValidatedAt: new Date().toISOString(),
      demoMode: false,
    });
    setConnectionStatus(id, "conectado", {
      verified: Boolean(acc.verifiedName),
      quality: acc.quality,
      phone: acc.displayPhone,
      accountStatus: "Aprovado",
    });
    setShowCreate(false);
    setEditingId(id);
    toast.success(`Conectado · ${acc.displayPhone || acc.verifiedName}`);
  }

  async function refreshAll() {
    setRefreshing(true);
    toast.message("Atualizando status das conexões…");
    await new Promise((r) => setTimeout(r, 400));
    setRefreshing(false);
    toast.success("Lista atualizada");
  }

  if (editing) {
    return (
      <AppShell title="Conexões" fullBleed>
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex items-center gap-3 border-b border-[#e2e7f0] bg-white px-4 py-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-[#c5cde0] px-3 py-1.5 text-[14.5px] text-[#1a2744] hover:bg-[#f4f6fa]"
              onClick={() => setEditingId(null)}
            >
              <ArrowLeft className="size-4" /> Voltar
            </button>
            <div className="min-w-0">
              <div className="truncate text-[16px] font-semibold text-[#1a2744]">
                {editing.name}
              </div>
              <div className="text-[13px] text-[#5a6780]">
                {connectionLabel(editing)} · Cloud API oficial
              </div>
            </div>
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto p-4 sm:p-5">
            <div className="mx-auto max-w-[880px]">
              <ConnectionEditor
                key={editing.id}
                cx={editing}
                onSaveWaba={(patch) => updateWaba(editing.id, patch)}
                onStatus={(status, extra) =>
                  setConnectionStatus(editing.id, status, extra)
                }
                onWebhook={(ev) =>
                  pushWebhookEvent({ connectionId: editing.id, ...ev })
                }
                onLogChat={(data) =>
                  logOutboundByPhone({ ...data, connectionId: editing.id })
                }
                onOpenChat={(cvId) => {
                  void navigate({ to: "/live-chat", search: { cv: cvId } });
                }}
              />
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Conexões" fullBleed>
      <div className="scrollbar-thin h-full overflow-y-auto p-4 sm:p-5">
        <div className="mx-auto max-w-[1100px] space-y-4">
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e2e7f0] bg-white px-4 py-3">
            <p className="min-w-0 flex-1 text-[14.5px] leading-snug text-[#5a6780]">
              Mantenha a integração do WhatsApp sempre ativa. Aqui você visualiza,
              adiciona ou remove conexões conforme precisar.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative" data-menu>
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-[#c5cde0] px-4 text-[14.5px] text-[#1a2744] hover:bg-[#f4f6fa]"
                  onClick={() => setShowGroups((v) => !v)}
                >
                  Grupos de conexões <Folder className="size-4" />
                </button>
                {showGroups && (
                  <div className="absolute top-12 right-0 z-30 w-[260px] rounded-2xl border border-[#e2e7f0] bg-white p-2 shadow-lg">
                    <button
                      type="button"
                      className={cn(
                        "mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[14px]",
                        folderId === "all"
                          ? "bg-[#e6eef8] text-[#0050a0]"
                          : "hover:bg-[#f4f6fa]",
                      )}
                      onClick={() => {
                        setFolderId("all");
                        setShowGroups(false);
                      }}
                    >
                      <Folder className="size-4" /> Todas
                    </button>
                    {folders.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[14px]",
                          folderId === f.id
                            ? "bg-[#e6eef8] text-[#0050a0]"
                            : "hover:bg-[#f4f6fa]",
                        )}
                        onClick={() => {
                          setFolderId(f.id);
                          setShowGroups(false);
                        }}
                      >
                        <Folder className="size-4 shrink-0" />
                        <span className="truncate">{f.name}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[14px] text-[#0050a0] hover:bg-[#f4f6fa]"
                      onClick={() => {
                        const n = prompt("Nome do grupo");
                        if (n?.trim()) {
                          createConnectionFolder(n);
                          toast.success("Grupo criado");
                        }
                      }}
                    >
                      <Plus className="size-4" /> Novo grupo
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[#c5cde0] px-4 text-[14.5px] text-[#1a2744] hover:bg-[#f4f6fa]"
                onClick={() => void refreshAll()}
              >
                Atualizar{" "}
                <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
              </button>
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#031c45] px-4 text-[14.5px] font-medium text-white hover:bg-[#003878]"
                onClick={openCreate}
              >
                Nova conexão <Plus className="size-4" />
              </button>
            </div>
          </section>

          {isRegional && sede && (
            <div className="rounded-xl border border-[#c5cde0] bg-white px-4 py-2.5 text-[14px] text-[#1a2744]">
              Visão <strong>{sede.code}</strong> — apenas o WhatsApp desta sede.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[#8b95a8]" />
              <input
                className="h-9 w-[220px] rounded-xl border border-[#c5cde0] bg-white pl-8 pr-3 text-[14px] outline-none focus:border-[#0050a0]"
                placeholder="Buscar conexão"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <button
              type="button"
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[13.5px]",
                trashView
                  ? "border-[#0050a0] bg-[#e6eef8] text-[#0050a0]"
                  : "border-[#c5cde0] text-[#5a6780]",
              )}
              onClick={() => setTrashView((v) => !v)}
            >
              <Trash2 className="size-3.5" /> Lixeira
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {listed.map((cx) => {
              const wabaName =
                cx.waba?.verifiedName || cx.waba?.appId || "WhatsApp Business";
              const acc =
                cx.accountStatus ?? (cx.verified ? "Aprovado" : "Pendente");
              return (
                <article
                  key={cx.id}
                  className="rounded-2xl border border-[#d8dee6] bg-white p-3"
                  data-menu
                >
                  <div className="relative rounded-xl border border-[#d8dee6] bg-[#eef2f6] px-3 py-3">
                    <button
                      type="button"
                      className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full text-[#8b95a8] hover:bg-white"
                      onClick={() =>
                        setCardMenu(cardMenu === cx.id ? null : cx.id)
                      }
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-start gap-3 pr-8 text-left"
                      onClick={() => {
                        if (!trashView) setEditingId(cx.id);
                      }}
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#c5cde0] text-[#1a2744]">
                        <WhatsAppIcon className="size-6" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[17px] font-semibold text-[#1a2744]">
                          {cx.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[13.5px] text-[#5a6780]">
                          WABA: {wabaName}
                        </span>
                        <span className="mt-0.5 block text-[14px] text-[#1a2744]">
                          {cx.phone || "Sem número"}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-2">
                          {cx.handle ? (
                            <span className="text-[13.5px] text-[#5a6780]">
                              @{cx.handle.replace(/^@/, "")}
                            </span>
                          ) : null}
                          <span className="rounded-full border border-[#c5cde0] bg-white px-2 py-0.5 text-[11px] font-semibold tracking-wide text-[#5a6780] uppercase">
                            Reservado
                          </span>
                        </span>
                      </span>
                    </button>
                    {cardMenu === cx.id && (
                      <div className="absolute top-10 right-2 z-30 w-48 overflow-hidden rounded-xl border border-[#e2e7f0] bg-white py-1 shadow-lg">
                        {trashView ? (
                          <>
                            <MenuBtn
                              label="Restaurar"
                              onClick={() => {
                                restoreConnection(cx.id);
                                setCardMenu(null);
                              }}
                            />
                            <MenuBtn
                              label="Excluir permanente"
                              danger
                              onClick={() => {
                                if (!confirm(`Excluir “${cx.name}” de vez?`))
                                  return;
                                deleteConnection(cx.id);
                                setCardMenu(null);
                              }}
                            />
                          </>
                        ) : (
                          <>
                            <MenuBtn
                              label="Editar"
                              onClick={() => {
                                setEditingId(cx.id);
                                setCardMenu(null);
                              }}
                            />
                            <MenuBtn
                              label="Detalhes"
                              onClick={() => {
                                setDetails(
                                  buildSystemRecord(
                                    {
                                      id: cx.id,
                                      name: cx.name,
                                      status: String(cx.status),
                                      folderId: cx.folderId,
                                      createdAt: cx.createdAt,
                                      updatedAt: cx.updatedAt ?? cx.createdAt,
                                    },
                                    { type: "connection", ...ctx },
                                  ),
                                );
                                setCardMenu(null);
                              }}
                            />
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 px-1 py-3 text-[14px]">
                    <div>
                      <span className="font-semibold text-[#1a2744]">
                        Limite de mensagens:{" "}
                      </span>
                      <span className="text-[#1a2744]">{cx.limit}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-[#1a2744]">
                        Verificação Empresarial:{" "}
                      </span>
                      <span className="text-[#1a2744]">
                        {cx.verified ? "Verificado" : "Não verificado"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[#1a2744]">
                        Status da Conta:
                      </span>
                      <span className="rounded-full bg-[#e8eef5] px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-[#1a2744] uppercase">
                        {acc}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[#1a2744]">
                        Qualidade:
                      </span>
                      <span className="rounded-full bg-[#e8eef5] px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-[#1a2744] uppercase">
                        {cx.quality}
                      </span>
                    </div>
                    {cx.waba?.coexistence && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[#1a2744]">
                          Coexistência:
                        </span>
                        <span className="rounded-full bg-[#e6eef8] px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-[#0050a0] uppercase">
                          App + API
                        </span>
                      </div>
                    )}
                  </div>

                  {!trashView && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        title="Excluir"
                        className="flex size-10 items-center justify-center rounded-xl border border-[#d8dee6] text-[#5a6780] hover:bg-[#f4f6fa]"
                        onClick={() => {
                          trashConnection(cx.id);
                          toast.success("Enviado para a lixeira");
                        }}
                      >
                        <Trash2 className="size-4" />
                      </button>
                      <button
                        type="button"
                        title="Editar"
                        className="flex size-10 items-center justify-center rounded-xl border border-[#d8dee6] text-[#5a6780] hover:bg-[#f4f6fa]"
                        onClick={() => setEditingId(cx.id)}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-[#c5cde0] text-[14.5px] font-medium text-[#1a2744] hover:bg-[#f4f6fa]"
                        onClick={() => {
                          setConnectionStatus(cx.id, "desconectado", {
                            verified: false,
                          });
                          toast.message("Conexão desconectada");
                        }}
                      >
                        Desconectar <span aria-hidden>↪</span>
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
            {listed.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-[#c5cde0] bg-white px-6 py-14 text-center text-[14.5px] text-[#5a6780]">
                {trashView
                  ? "Lixeira vazia"
                  : "Nenhuma conexão real aqui. Clique em Nova conexão para adicionar um número da Cloud API."}
              </div>
            )}
          </div>
        </div>
      </div>

      {launching && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-[15px] text-[#1a2744] shadow-xl">
            <Loader2 className="size-5 animate-spin text-[#0050a0]" />
            Abrindo o painel da Meta…
          </div>
        </div>
      )}

      {showCreate && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="w-full max-w-[720px] overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {createStep === "pick" ? (
              <div className="p-5">
                <div className="mb-4 flex items-center gap-2 text-[20px] font-semibold text-[#1a2744]">
                  <Wifi className="size-5 text-[#0050a0]" />
                  Criando nova conexão
                </div>
                <button
                  type="button"
                  className="mb-2 w-full rounded-2xl border border-[#d8dee6] px-4 py-3.5 text-left hover:bg-[#f7f9fc]"
                  onClick={() => chooseKind("nova")}
                >
                  <div className="flex items-center gap-2 text-[16px] font-semibold text-[#1a2744]">
                    <Plus className="size-4" /> Criar nova conexão
                  </div>
                  <p className="mt-1 text-[13.5px] leading-snug text-[#5a6780]">
                    Abre o painel da Meta para cadastrar um número novo no
                    portefólio (Adventistas Norte Pará) e conectar no ChatNT.
                  </p>
                </button>
                <button
                  type="button"
                  className="mb-2 w-full rounded-2xl border border-[#d8dee6] px-4 py-3.5 text-left hover:bg-[#f7f9fc]"
                  onClick={() => chooseKind("migrar")}
                >
                  <div className="flex items-center gap-2 text-[16px] font-semibold text-[#1a2744]">
                    <ArrowLeftRight className="size-4" /> Migrar conexão
                  </div>
                  <p className="mt-1 text-[13.5px] leading-snug text-[#5a6780]">
                    Traga o número de outra plataforma para o ChatNT. Depois de
                    criar, adicione a forma de pagamento na Meta (se ainda não
                    tiver) e conclua a migração.
                  </p>
                </button>
                <button
                  type="button"
                  className="mb-2 w-full rounded-2xl border border-[#d8dee6] px-4 py-3.5 text-left hover:bg-[#f7f9fc]"
                  onClick={() => chooseKind("coexist")}
                >
                  <div className="flex items-center gap-2 text-[16px] font-semibold text-[#1a2744]">
                    <Smartphone className="size-4" /> Coexistência (app + API)
                  </div>
                  <p className="mt-1 text-[13.5px] leading-snug text-[#5a6780]">
                    Mesmo número no WhatsApp Business (celular/Web) e no ChatNT.
                    O que você envia pelo app continua sem taxa da Meta. O que
                    o ChatNT envia pela API (automação, broadcast, live chat)
                    continua cobrado.
                  </p>
                </button>
                <button
                  type="button"
                  className="w-full rounded-2xl border border-[#d8dee6] px-4 py-3.5 text-left hover:bg-[#f7f9fc]"
                  onClick={() => chooseKind("existente")}
                >
                  <div className="flex items-center gap-2 text-[16px] font-semibold text-[#1a2744]">
                    <QrCode className="size-4" /> Usar conexão existente
                  </div>
                  <p className="mt-1 text-[13.5px] leading-snug text-[#5a6780]">
                    Lista os números que você já tem no Business Manager para
                    só clicar em Conectar.
                  </p>
                </button>
              </div>
            ) : createStep === "associate" ? (
              <AssociatePanel
                onBack={() => setCreateStep("pick")}
                onStart={() => void startMetaSignup(createKind)}
              />
            ) : createStep === "accounts" ? (
              <MetaAccountsPanel
                accounts={metaAccounts}
                error={accountsError}
                existingIds={new Set(
                  allConnections
                    .filter((c) => !c.trashed)
                    .map((c) => c.waba?.phoneNumberId)
                    .filter(Boolean) as string[],
                )}
                onBack={() => setCreateStep("pick")}
                onRefresh={() => void startPullAccounts()}
                onConnect={connectMetaAccount}
                onAddNew={() => {
                  setCreateKind("nova");
                  setCreateStep("associate");
                }}
              />
            ) : (
              <div className="p-5">
                <button
                  type="button"
                  className="mb-2 text-[13.5px] text-[#0050a0]"
                  onClick={() => setCreateStep("associate")}
                >
                  ← Voltar
                </button>
                <h3 className="text-[18px] font-semibold text-[#1a2744]">
                  Painel da Meta
                </h3>
                <p className="mt-1 text-[13.5px] leading-snug text-[#5a6780]">
                  Uma vez só: cole o App ID e o Configuration ID do Embedded
                  Signup (Meta for Developers → WhatsApp → Configuração).
                </p>
                <label className="mt-4 block text-[13px] text-[#5a6780]">
                  App ID
                  <input
                    className="mt-1 h-10 w-full rounded-xl border border-[#c5cde0] px-3 font-mono text-[14px] outline-none focus:border-[#0050a0]"
                    value={metaAppId}
                    onChange={(e) => setMetaAppId(e.target.value)}
                    placeholder="Ex.: 123456789012345"
                    autoFocus
                  />
                </label>
                <label className="mt-3 block text-[13px] text-[#5a6780]">
                  Configuration ID (Embedded Signup)
                  <input
                    className="mt-1 h-10 w-full rounded-xl border border-[#c5cde0] px-3 font-mono text-[14px] outline-none focus:border-[#0050a0]"
                    value={metaConfigId}
                    onChange={(e) => setMetaConfigId(e.target.value)}
                    placeholder="ID da configuração do Embedded Signup"
                  />
                </label>
                <label className="mt-3 block text-[13px] text-[#5a6780]">
                  App Secret (para gravar o token automático)
                  <input
                    className="mt-1 h-10 w-full rounded-xl border border-[#c5cde0] px-3 font-mono text-[14px] outline-none focus:border-[#0050a0]"
                    type="password"
                    value={metaSecret}
                    onChange={(e) => setMetaSecret(e.target.value)}
                    placeholder="Opcional, mas recomendado"
                  />
                </label>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    className="h-9 rounded-xl border border-[#c5cde0] px-3 text-[14px]"
                    onClick={() => setShowCreate(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="h-9 rounded-xl bg-[#031c45] px-4 text-[14px] font-medium text-white"
                    onClick={saveMetaAppAndLaunch}
                  >
                    Continuar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {details && (
        <DetailsModal record={details} onClose={() => setDetails(null)} />
      )}
    </AppShell>
  );
}

function AssociatePanel({
  onBack,
  onStart,
}: {
  onBack: () => void;
  onStart: () => void;
}) {
  return (
    <div>
      <div className="relative bg-[#eef3ff] px-6 pt-5 pb-2">
        <button
          type="button"
          className="mb-2 text-[13.5px] text-[#0050a0]"
          onClick={onBack}
        >
          ← Voltar
        </button>
        <SignupHero />
      </div>
      <div className="px-7 pt-5 pb-6">
        <h3 className="text-[26px] leading-tight font-bold text-[#1c1e21]">
          Associa a tua conta ao ChatNT
        </h3>
        <p className="mt-3 text-[15px] leading-relaxed text-[#1c1e21]">
          Para permitires que o ChatNT efetue a gestão da tua conta do WhatsApp
          Business, terás de partilhar a permissão de conta.
        </p>
        <p className="mt-5 text-[16px] font-semibold text-[#1c1e21]">
          As permissões que vais partilhar com o ChatNT
        </p>
        <div className="mt-3 flex items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e7f0ff] text-[#0050a0]">
            <KeyRound className="size-4" />
          </span>
          <div>
            <div className="text-[15.5px] font-semibold text-[#1c1e21]">
              Acesso à conta do WhatsApp Business
            </div>
            <p className="mt-1 text-[14.5px] leading-snug text-[#5a6780]">
              O ChatNT vai poder adicionar ou associar números de telemóvel,
              criar modelos de mensagens, enviar e receber mensagens, atribuir
              utilizadores à tua conta e aceder às tuas métricas.
            </p>
          </div>
        </div>
        <p className="mt-5 text-[13.5px] leading-relaxed text-[#1c1e21]">
          Ao continuar, aceitas os{" "}
          <a
            className="text-[#0050a0] underline"
            href="https://www.whatsapp.com/legal/business-terms"
            target="_blank"
            rel="noreferrer"
          >
            Termos de Serviço do WhatsApp Business
          </a>
          , os{" "}
          <a
            className="text-[#0050a0] underline"
            href="https://www.facebook.com/legal/terms"
            target="_blank"
            rel="noreferrer"
          >
            Termos de Serviço da Meta
          </a>{" "}
          e os{" "}
          <a
            className="text-[#0050a0] underline"
            href="https://www.facebook.com/legal/commercial_terms"
            target="_blank"
            rel="noreferrer"
          >
            Termos de Serviço das Ferramentas de Negócios
          </a>
          .
        </p>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
          <div className="text-[12.5px] leading-snug text-[#5a6780]">
            <a className="text-[#0050a0]" href="https://www.facebook.com/privacy/policy" target="_blank" rel="noreferrer">
              Política de Privacidade
            </a>{" "}
            e{" "}
            <a className="text-[#0050a0]" href="https://www.facebook.com/legal/terms" target="_blank" rel="noreferrer">
              Termos do ChatNT WABA
            </a>
          </div>
          <button
            type="button"
            className="h-10 min-w-[120px] rounded-lg bg-[#1877f2] px-5 text-[15px] font-semibold text-white hover:bg-[#166fe5]"
            onClick={onStart}
          >
            Começar
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaAccountsPanel({
  accounts,
  error,
  existingIds,
  onBack,
  onRefresh,
  onConnect,
  onAddNew,
}: {
  accounts: MetaWabaPhone[];
  error?: string;
  existingIds: Set<string>;
  onBack: () => void;
  onRefresh: () => void;
  onConnect: (acc: MetaWabaPhone) => void;
  onAddNew: () => void;
}) {
  return (
    <div className="px-6 py-5">
      <button type="button" className="mb-3 text-[13.5px] text-[#0050a0]" onClick={onBack}>
        ← Voltar
      </button>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[22px] font-bold text-[#1c1e21]">Suas contas na Meta</h3>
          <p className="mt-1 text-[14.5px] text-[#5a6780]">
            Escolha um número já cadastrado no Business Manager para criar a
            conexão no ChatNT.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#c5cde0] px-3 text-[13.5px] hover:bg-[#f4f6fa]"
          onClick={onRefresh}
        >
          <RefreshCw className="size-3.5" /> Atualizar
        </button>
      </div>
      {error && accounts.length === 0 && (
        <p className="mt-4 rounded-xl bg-[#fff6e5] px-3 py-2 text-[13.5px] text-[#8a5a00]">
          {error}
        </p>
      )}
      <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {accounts.map((acc) => {
          const already = existingIds.has(acc.phoneNumberId);
          return (
            <div
              key={acc.phoneNumberId}
              className="flex items-center gap-3 rounded-2xl border border-[#e2e7f0] px-3 py-3"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-white">
                <WhatsAppIcon className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15.5px] font-semibold text-[#1a2744]">
                  {acc.verifiedName || acc.wabaName || "WhatsApp Business"}
                </div>
                <div className="truncate text-[13.5px] text-[#5a6780]">
                  {acc.displayPhone || acc.phoneNumberId}
                  {acc.businessName ? ` · ${acc.businessName}` : ""}
                </div>
                <div className="mt-0.5 text-[12.5px] text-[#8b95a8]">
                  WABA {acc.wabaName || acc.wabaId}
                </div>
              </div>
              {already ? (
                <span className="rounded-full bg-[#e6eef8] px-3 py-1 text-[12.5px] font-medium text-[#0050a0]">
                  Já conectado
                </span>
              ) : (
                <button
                  type="button"
                  className="h-9 rounded-full bg-[#031c45] px-4 text-[13.5px] font-medium text-white hover:bg-[#003878]"
                  onClick={() => onConnect(acc)}
                >
                  Conectar
                </button>
              )}
            </div>
          );
        })}
        {accounts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#c5cde0] px-4 py-10 text-center text-[14px] text-[#5a6780]">
            Nenhum número listado nesta conta. Cadastre um número novo no painel
            da Meta.
          </div>
        )}
      </div>
      <button
        type="button"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#0050a0] px-4 py-3 text-[14.5px] font-medium text-[#0050a0] hover:bg-[#e6eef8]"
        onClick={onAddNew}
      >
        <Plus className="size-4" /> Adicionar novo número na Meta
      </button>
    </div>
  );
}

function SignupHero() {
  return (
    <svg viewBox="0 0 520 170" className="mx-auto block h-[150px] w-full" aria-hidden>
      <rect x="18" y="38" width="88" height="78" rx="14" fill="#dbe4ff" />
      <rect x="30" y="54" width="64" height="6" rx="3" fill="#8aa4d8" />
      <rect x="30" y="68" width="48" height="6" rx="3" fill="#8aa4d8" />
      <circle cx="86" cy="96" r="10" fill="#5b8def" />
      <rect x="118" y="28" width="92" height="86" rx="16" fill="#d7e8ff" />
      <circle cx="164" cy="62" r="16" fill="#7db07a" />
      <rect x="136" y="86" width="56" height="6" rx="3" fill="#8aa4d8" />
      <rect x="144" y="98" width="40" height="6" rx="3" fill="#8aa4d8" />
      <rect x="228" y="44" width="86" height="72" rx="14" fill="#e4ddff" />
      <rect x="242" y="60" width="58" height="6" rx="3" fill="#9a90c8" />
      <rect x="242" y="74" width="46" height="6" rx="3" fill="#9a90c8" />
      <circle cx="292" cy="104" r="9" fill="#7a6bb8" />
      <rect x="340" y="36" width="160" height="110" rx="8" fill="#cfd8ea" />
      <rect x="352" y="48" width="136" height="78" rx="4" fill="#eef3fb" />
      <rect x="364" y="92" width="70" height="8" rx="2" fill="#b8c4d8" />
      <circle cx="430" cy="78" r="16" fill="#3d8f6a" />
      <rect x="416" y="92" width="28" height="22" rx="4" fill="#2f6f54" />
      <rect x="404" y="112" width="20" height="14" rx="3" fill="#1a2744" />
      <rect x="440" y="112" width="20" height="14" rx="3" fill="#1a2744" />
    </svg>
  );
}

function ConnectionEditor({
  cx,
  onSaveWaba,
  onStatus,
  onWebhook,
  onLogChat,
  onOpenChat,
}: {
  cx: Connection;
  onSaveWaba: (patch: Partial<WabaConfig>) => void;
  onStatus: (
    status: Connection["status"],
    extra?: Partial<Connection>,
  ) => void;
  onWebhook: (ev: {
    type: "message_in" | "status" | "template" | "verify" | "error" | "test_out";
    summary: string;
    payload: string;
    ok: boolean;
  }) => void;
  onLogChat: (data: {
    phone: string;
    text: string;
    name?: string;
    wamid?: string;
  }) => { conversationId: string };
  onOpenChat: (conversationId: string) => void;
}) {
  const waba = cx.waba ?? emptyWaba();
  const [form, setForm] = useState({
    appId: waba.appId,
    wabaId: waba.wabaId,
    phoneNumberId: waba.phoneNumberId,
    accessToken: waba.accessToken,
    webhookVerifyToken: waba.webhookVerifyToken,
  });
  const [showToken, setShowToken] = useState(false);
  const [validating, setValidating] = useState(false);
  const [sending, setSending] = useState(false);
  const [testTo, setTestTo] = useState("5591999999999");
  const [testText, setTestText] = useState(
    "Olá! Teste ChatNT · Escola Bíblica Novo Tempo",
  );
  const [origin, setOrigin] = useState("https://seu-dominio.com");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const callbackUrl = webhookCallbackUrl(origin);

  function patchForm(p: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...p }));
  }

  function saveLocal() {
    onSaveWaba({
      appId: form.appId.trim(),
      wabaId: form.wabaId.trim(),
      phoneNumberId: form.phoneNumberId.trim(),
      accessToken: form.accessToken.trim(),
      webhookVerifyToken: form.webhookVerifyToken.trim(),
      demoMode: false,
    });
    if (form.webhookVerifyToken.trim()) {
      void registerWebhookVerifyToken({
        data: { token: form.webhookVerifyToken.trim() },
      }).catch(() => {});
    }
    toast.success("Credenciais salvas nesta conexão");
  }

  async function handleValidate() {
    if (!form.phoneNumberId.trim() || !form.accessToken.trim()) {
      toast.error("Preencha Phone Number ID e Access Token");
      return;
    }
    setValidating(true);
    try {
      onSaveWaba({
        appId: form.appId.trim(),
        wabaId: form.wabaId.trim(),
        phoneNumberId: form.phoneNumberId.trim(),
        accessToken: form.accessToken.trim(),
        webhookVerifyToken: form.webhookVerifyToken.trim(),
        demoMode: false,
      });
      if (form.webhookVerifyToken.trim()) {
        void registerWebhookVerifyToken({
          data: { token: form.webhookVerifyToken.trim() },
        }).catch(() => {});
      }
      const res = await validateWabaCredentials({
        data: {
          accessToken: form.accessToken.trim(),
          phoneNumberId: form.phoneNumberId.trim(),
          demoMode: false,
        },
      });
      if (res.ok) {
        onSaveWaba({
          lastValidatedAt: new Date().toISOString(),
          verifiedName: res.verifiedName,
          lastError: undefined,
          demoMode: false,
        });
        onStatus("conectado", {
          verified: true,
          quality: res.quality ?? cx.quality,
          phone: res.displayPhone || cx.phone,
          accountStatus: "Aprovado",
        });
        onWebhook({
          type: "verify",
          summary: `Validado · ${res.verifiedName || "Graph API"}`,
          payload: JSON.stringify(res),
          ok: true,
        });
        toast.success(`Conectado · ${res.verifiedName || "OK"}`);
        if (form.wabaId.trim() || form.phoneNumberId.trim()) {
          const pointed = await subscribeWabaWebhook({
            data: {
              accessToken: form.accessToken.trim(),
              wabaId: form.wabaId.trim() || undefined,
              phoneNumberId: form.phoneNumberId.trim() || undefined,
              callbackUrl,
              verifyToken:
                form.webhookVerifyToken.trim() || "chatnt_verify_token",
            },
          });
          if (pointed.ok) {
            toast.success("Respostas do celular agora entram no ChatNT");
          } else if (pointed.error) {
            toast.message("Webhook: confirme a URL na Meta", {
              description: pointed.error,
            });
          }
        }
      } else {
        onSaveWaba({ lastError: res.error });
        onStatus("erro", { accountStatus: "Restrito" });
        onWebhook({
          type: "error",
          summary: res.error || "Falha na validação",
          payload: res.raw || "",
          ok: false,
        });
        toast.error(res.error || "Falha na validação");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao validar");
    } finally {
      setValidating(false);
    }
  }

  async function handleTestSend() {
    if (!form.accessToken.trim() || !form.phoneNumberId.trim()) {
      toast.error("Salve e valide as credenciais antes");
      return;
    }
    setSending(true);
    try {
      const res = await sendWabaTestMessage({
        data: {
          accessToken: form.accessToken.trim(),
          phoneNumberId: form.phoneNumberId.trim(),
          demoMode: false,
          to: testTo,
          text: testText,
        },
      });
      if (res.ok) {
        onWebhook({
          type: "test_out",
          summary: `Enviada · ${res.messageId || "ok"} → ${testTo}`,
          payload: JSON.stringify({ to: testTo, messageId: res.messageId }),
          ok: true,
        });
        const logged = onLogChat({
          phone: testTo,
          text: testText,
          wamid: res.messageId,
        });
        toast.success("Enviado pela Cloud API — aberto no Live Chat");
        onOpenChat(logged.conversationId);
      } else {
        onWebhook({
          type: "error",
          summary: res.error || "Falha no envio",
          payload: "",
          ok: false,
        });
        toast.error(res.error || "Falha no envio");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no envio");
    } finally {
      setSending(false);
    }
  }

  function copy(text: string, label: string) {
    void navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copiado`);
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[#e2e7f0] bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold tracking-wide text-[#8b95a8] uppercase">
            {connectionLabel(cx)}
            {cx.uniao ? ` · ${cx.uniao}` : ""}
          </div>
          <h3 className="text-[18px] font-semibold text-[#1a2744]">{cx.name}</h3>
          <p className="mt-0.5 text-[14px] text-[#5a6780]">
            {cx.phone} {cx.handle ? `· @${cx.handle.replace(/^@/, "")}` : ""}
          </p>
        </div>
        <StatusPill status={String(cx.status)} large />
      </div>

      {cx.waba?.verifiedName && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#e6eef8] px-3 py-2 text-[14px] text-[#1a2744]">
          <BadgeCheck className="size-4 text-[#0050a0]" />
          Nome verificado: <strong>{cx.waba.verifiedName}</strong>
        </div>
      )}

      {cx.waba?.lastError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[14px] text-red-700">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {cx.waba.lastError}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="App / nome (Meta)">
          <input
            className="input"
            value={form.appId}
            onChange={(e) => patchForm({ appId: e.target.value })}
            placeholder="CRM Novo Tempo"
          />
        </Field>
        <Field label="WABA ID">
          <input
            className="input"
            value={form.wabaId}
            onChange={(e) => patchForm({ wabaId: e.target.value })}
            placeholder="WhatsApp Business Account ID"
          />
        </Field>
        <Field label="Phone Number ID *">
          <input
            className="input font-mono text-sm"
            value={form.phoneNumberId}
            onChange={(e) => patchForm({ phoneNumberId: e.target.value })}
            placeholder="Ex.: 123456789012345"
          />
        </Field>
        <Field label="Access Token *">
          <div className="relative">
            <input
              className="input pr-10 font-mono text-sm"
              type={showToken ? "text" : "password"}
              value={form.accessToken}
              onChange={(e) => patchForm({ accessToken: e.target.value })}
              placeholder="EAAB…"
              autoComplete="off"
            />
            <button
              type="button"
              className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-[#8b95a8]"
              onClick={() => setShowToken((v) => !v)}
              aria-label={showToken ? "Ocultar token" : "Mostrar token"}
            >
              {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-[#8b95a8]">
            Atual: {maskToken(form.accessToken)}
          </p>
        </Field>
      </div>

      <div className="space-y-2 rounded-xl border border-[#e2e7f0] p-3">
        <div className="flex items-center gap-2 text-[14.5px] font-semibold text-[#1a2744]">
          <Webhook className="size-4 text-[#0050a0]" />
          Webhook (Callback URL)
        </div>
        <Field label="Callback URL (cole no painel Meta)">
          <div className="flex gap-2">
            <input className="input font-mono text-xs" readOnly value={callbackUrl} />
            <Button type="button" size="sm" variant="outline" onClick={() => copy(callbackUrl, "URL")}>
              <Copy className="size-3.5" />
            </Button>
          </div>
        </Field>
        <Field label="Verify Token">
          <div className="flex gap-2">
            <input
              className="input font-mono text-sm"
              value={form.webhookVerifyToken}
              onChange={(e) => patchForm({ webhookVerifyToken: e.target.value })}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => copy(form.webhookVerifyToken, "Verify token")}
            >
              <Copy className="size-3.5" />
            </Button>
          </div>
        </Field>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={saveLocal}>
          Salvar credenciais
        </Button>
        <Button
          type="button"
          onClick={() => void handleValidate()}
          disabled={validating}
          className="bg-[#003878] hover:bg-[#0050a0]"
        >
          {validating ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {validating ? "Validando…" : "Validar na Meta"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onStatus("desconectado", { verified: false });
            toast.message("Conexão marcada como desconectada");
          }}
        >
          Desconectar
        </Button>
        <Link
          to="/webhooks"
          className="inline-flex h-9 items-center rounded-xl border border-[#c5cde0] px-3 text-[13.5px] text-[#1a2744]"
        >
          Log de webhooks
        </Link>
      </div>

      <div className="space-y-3 rounded-xl border border-[#d6e4f5] bg-[#eef4fb] p-3">
        <div className="flex items-center gap-2 text-[14.5px] font-semibold text-[#1a2744]">
          <Send className="size-4 text-[#0050a0]" />
          Mensagem de teste
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
          <Field label="Para (E.164)">
            <input
              className="input font-mono text-sm"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="55919…"
            />
          </Field>
          <Field label="Texto">
            <input
              className="input text-sm"
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
            />
          </Field>
        </div>
        <Button type="button" onClick={() => void handleTestSend()} disabled={sending}>
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {sending ? "Enviando…" : "Enviar teste"}
        </Button>
      </div>

      <style>{`
        .input {
          width: 100%;
          height: 2.35rem;
          border-radius: 0.7rem;
          border: 1px solid #c5cde0;
          background: #fff;
          padding: 0 0.75rem;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}

function MenuBtn({
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
        "block w-full px-3 py-2 text-left text-[14px] hover:bg-[#f4f6fa]",
        danger && "text-red-600 hover:bg-red-50",
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function StatusPill({ status, large }: { status: string; large?: boolean }) {
  const map: Record<string, string> = {
    conectado: "bg-[#e6eef8] text-[#0050a0]",
    configurando: "bg-amber-50 text-amber-800",
    desconectado: "bg-[#f3f5fa] text-[#5a6780]",
    erro: "bg-red-50 text-red-700",
    token_expirado: "bg-orange-50 text-orange-800",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium capitalize",
        large ? "px-3 py-1 text-[13px]" : "px-2 py-0.5 text-[11px]",
        map[status] || "bg-[#f3f5fa] text-[#5a6780]",
      )}
    >
      {status === "conectado" ? (
        <CheckCircle2 className="size-3.5" />
      ) : (
        <Signal className="size-3.5" />
      )}
      {status === "conectado"
        ? "Conectado"
        : status === "configurando"
          ? "Configurando"
          : status === "desconectado"
            ? "Desconectado"
            : status === "token_expirado"
              ? "Token expirado"
              : status === "erro"
                ? "Erro"
                : status}
    </span>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-[12.5px] text-[#5a6780]">{label}</span>
      {children}
    </label>
  );
}
