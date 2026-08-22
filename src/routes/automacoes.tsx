import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
import {
  ArrowUpDown,
  Filter,
  Folder,
  GitBranch,
  Info,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { DetailsModal } from "@/components/system/DetailsModal";
import { Button } from "@/components/ui/button";
import { useDismissOnOutside } from "@/hooks/use-dismiss-on-outside";
import {
  buildSystemRecord,
  recordContext,
  type SystemRecord,
} from "@/lib/system-record";
import { useCrmStore } from "@/lib/store";
import { parseAutomationJson, jsonKeysPreview } from "@/lib/import-automation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/automacoes")({
  component: AutomacoesLayout,
});

function AutomacoesLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.startsWith("/automacoes/") && pathname !== "/automacoes") {
    return <Outlet />;
  }
  return <AutomacoesPage />;
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR");
}

function AutomacoesPage() {
  const t = useT();
  const navigate = useNavigate();
  const folders = useCrmStore((s) => s.folders);
  const automations = useCrmStore((s) => s.automations);
  const broadcasts = useCrmStore((s) => s.broadcasts);
  const createAutomation = useCrmStore((s) => s.createAutomation);
  const saveFlow = useCrmStore((s) => s.saveFlow);
  const toggleAutomation = useCrmStore((s) => s.toggleAutomation);
  const updateAutomation = useCrmStore((s) => s.updateAutomation);
  const deleteAutomation = useCrmStore((s) => s.deleteAutomation);
  const trashAutomation = useCrmStore((s) => s.trashAutomation);
  const restoreAutomation = useCrmStore((s) => s.restoreAutomation);
  const duplicateAutomation = useCrmStore((s) => s.duplicateAutomation);
  const createFolder = useCrmStore((s) => s.createFolder);
  const renameFolder = useCrmStore((s) => s.renameFolder);
  const deleteFolder = useCrmStore((s) => s.deleteFolder);
  const moveFolder = useCrmStore((s) => s.moveFolder);
  const reorderFolders = useCrmStore((s) => s.reorderFolders);
  const sessionScope = useCrmStore((s) => s.sessionScope);
  const activeAgentId = useCrmStore((s) => s.activeAgentId);
  const connections = useCrmStore((s) => s.connections);

  const [folderId, setFolderId] = useState<string | "all">("all");
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState<"home" | "templates" | "import">("home");
  const fileRef = useRef<HTMLInputElement>(null);
  const [folderMenu, setFolderMenu] = useState<string | null>(null);
  const dragFolder = useRef<string | null>(null);
  const dragged = useRef(false);
  const [autoMenu, setAutoMenu] = useState<string | null>(null);
  const [details, setDetails] = useState<SystemRecord | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ kind: "folder" | "auto"; id: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sort, setSort] = useState<"recent" | "oldest" | "name">("recent");
  const [showSort, setShowSort] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "on" | "off">("all");
  const [showGear, setShowGear] = useState(false);
  const [trashView, setTrashView] = useState(false);
  const toggleLock = useRef(false);

  const dismiss = useCallback(() => {
    setFolderMenu(null);
    setAutoMenu(null);
    setShowSort(false);
    setShowFilter(false);
    setShowGear(false);
  }, []);
  useDismissOnOutside(
    dismiss,
    Boolean(folderMenu || autoMenu || showSort || showFilter || showGear),
  );

  const ctx = recordContext(sessionScope, activeAgentId, connections);

  const listed = useMemo(() => {
    const bcIds = new Set(
      broadcasts.map((b) => b.flowId).filter((id): id is string => Boolean(id)),
    );
    let rows = automations.filter((a) => (trashView ? a.trashed : !a.trashed));
    if (!trashView) {
      rows = rows.filter(
        (a) =>
          a.source !== "broadcast" &&
          !bcIds.has(a.id) &&
          !a.name.startsWith("Fluxo ·"),
      );
    }
    const seen = new Set<string>();
    rows = rows.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
    if (folderId !== "all" && !trashView) {
      rows = rows.filter((a) => a.folderId === folderId);
    }
    if (statusFilter === "on") rows = rows.filter((a) => a.active);
    if (statusFilter === "off") rows = rows.filter((a) => !a.active);
    if (q.trim()) {
      const n = q.toLowerCase();
      rows = rows.filter((a) => a.name.toLowerCase().includes(n));
    }
    return [...rows].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "pt-BR");
      const ta = new Date(a.updatedAt).getTime();
      const tb = new Date(b.updatedAt).getTime();
      return sort === "oldest" ? ta - tb : tb - ta;
    });
  }, [automations, broadcasts, folderId, q, sort, statusFilter, trashView]);

  function openAuto(id: string) {
    void navigate({ to: "/automacoes/$id", params: { id } });
  }

  function createNew() {
    const id = createAutomation(
      "Nova automação",
      folderId === "all" ? (folders[0]?.id ?? "f4") : folderId,
    );
    setShowCreate(false);
    setCreateStep("home");
    toast.success("Automação criada");
    openAuto(id);
    return id;
  }

  function createFromTemplate(tpl: (typeof AUTO_TEMPLATES)[number]) {
    const id = createAutomation(
      tpl.name,
      folderId === "all" ? (folders[0]?.id ?? "f4") : folderId,
    );
    saveFlow(id, tpl.nodes as never, tpl.edges);
    setShowCreate(false);
    setCreateStep("home");
    toast.success(`Template “${tpl.name}” aplicado`);
    openAuto(id);
  }

  function importFromAutomation(srcId: string) {
    const nid = duplicateAutomation(srcId);
    if (!nid) return;
    setShowCreate(false);
    setCreateStep("home");
    toast.success("Automação importada");
    openAuto(nid);
  }

  function importJsonFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result ?? "null")) as unknown;
        const parsed = parseAutomationJson(raw);
        if (!parsed.length) {
          toast.error(
            `JSON sem blocos reconhecidos (${jsonKeysPreview(raw) || "vazio"})`,
          );
          return;
        }
        let lastId = "";
        for (const rec of parsed) {
          const id = createAutomation(
            rec.name.trim() || "Automação importada",
            folderId === "all" ? (folders[0]?.id ?? "f4") : folderId,
          );
          const nodes = rec.nodes.some((n) => n.type === "trigger")
            ? rec.nodes
            : [
                {
                  id: "n_tr",
                  type: "trigger" as const,
                  label: "Gatilho",
                  x: 80,
                  y: 120,
                  config: { kind: "any_inbound", matchMode: "any" },
                },
                ...rec.nodes,
              ];
          saveFlow(id, nodes, rec.edges);
          lastId = id;
        }
        setShowCreate(false);
        setCreateStep("home");
        toast.success(
          parsed.length > 1
            ? `${parsed.length} automações importadas`
            : `Importado: ${parsed[0]?.name ?? "fluxo"} · ${parsed[0]?.nodes.length ?? 0} blocos`,
        );
        openAuto(lastId);
      } catch {
        toast.error("Arquivo JSON inválido");
      }
    };
    reader.readAsText(file);
  }

  return (
    <AppShell
      title={t("page.automacoes")}
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setCreateStep("home");
              setShowCreate(true);
            }}
          >
            <Plus className="size-3.5" />
            Nova
          </Button>
        </div>
      }
    >
      <div className="-m-3 space-y-4 bg-[#f3f5fa] p-5 pb-20 sm:-m-5 sm:p-6">
        <section className="rounded-2xl border border-[#b7d8ee] bg-[#e8f4fb] px-5 py-3.5">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 size-4 shrink-0 text-[#1d6fa5]" />
            <div>
              <p className="text-[15px] font-medium text-[#16324a]">Informação</p>
              <ul className="mt-1 space-y-0.5 text-[13.5px] text-[#1a3a52]">
                <li>
                  ◆ Os registros de automação (envios, falhas, entregas e cliques) são
                  mantidos por 6 meses. Após esse período, eles serão removidos automaticamente.
                </li>
                <li>
                  ◆ Cada contato pode ativar o gatilho de cada automação até 20 vezes a cada 24h.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e2e7f0] bg-white px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[18px] font-medium text-[#1a2744]">Pastas</h2>
            <button
              type="button"
              className="flex h-8 items-center gap-1.5 rounded-full border border-[#0050a0] px-3 text-[13px] font-semibold text-[#0050a0]"
              onClick={() => {
                const n = prompt("Nome da pasta");
                if (n?.trim()) {
                  createFolder(n);
                  toast.success("Pasta criada");
                }
              }}
            >
              <Plus className="size-3.5" /> Nova pasta
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
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
                  if (from) reorderFolders(from, f.id);
                  dragFolder.current = null;
                }}
              >
                <div
                  className={cn(
                    "inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-[14.5px]",
                    folderId === f.id
                      ? "border-[#0050a0] bg-[#e6eef8]"
                      : "border-[#c5cde0] bg-white",
                  )}
                >
                  <button
                    type="button"
                    className="flex items-center gap-2"
                    onClick={() => {
                      if (dragged.current) return;
                      setFolderId((cur) => (cur === f.id ? "all" : f.id));
                    }}
                  >
                    <Folder className="size-4" /> {f.name}
                  </button>
                  <button
                    type="button"
                    className="pl-1 text-[#5a6780]"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => setFolderMenu(folderMenu === f.id ? null : f.id)}
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </div>
                {folderMenu === f.id && (
                  <div className="absolute top-11 left-0 z-30 w-44 overflow-hidden rounded-xl border bg-white py-1 shadow-lg">
                    <MenuBtn
                      label="Detalhes"
                      onClick={() => {
                        setDetails(
                          buildSystemRecord(
                            { ...f, status: f.status ?? "enabled" },
                            { type: "automations", ...ctx },
                          ),
                        );
                        setFolderMenu(null);
                      }}
                    />
                    <MenuBtn
                      label="Renomear"
                      onClick={() => {
                        const n = prompt("Renomear pasta", f.name);
                        if (n?.trim()) {
                          renameFolder(f.id, n);
                          toast.success("Pasta renomeada");
                        }
                        setFolderMenu(null);
                      }}
                    />
                    <MenuBtn
                      label="Mover"
                      onClick={() => {
                        setMoveTarget({ kind: "folder", id: f.id });
                        setFolderMenu(null);
                      }}
                    />
                    <MenuBtn
                      label="Apagar"
                      danger
                      onClick={() => {
                        if (!confirm(`Apagar a pasta “${f.name}”?`)) return;
                        deleteFolder(f.id);
                        if (folderId === f.id) setFolderId("all");
                        setFolderMenu(null);
                        toast.success("Pasta apagada");
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#e2e7f0] bg-white px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-medium text-[#1a2744]">
                {trashView ? "Lixeira" : "Lista de automações"}
              </h2>
              <p className="mt-0.5 text-[13.5px] text-[#5a6780]">
                {listed.length} automaç{listed.length === 1 ? "ão" : "ões"}{" "}
                {trashView ? "na lixeira" : "cadastradas"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative" data-menu>
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8b95a8]" />
                <input
                  className="h-9 w-[200px] rounded-full border-0 bg-[#eef1f7] pr-3 pl-9 text-[13.5px] outline-none"
                  placeholder="Procure pelo nome"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </label>
              <div className="relative" data-menu>
                <button
                  type="button"
                  className="flex h-9 items-center gap-1.5 rounded-full border border-[#c5cde0] px-3 text-[13.5px]"
                  onClick={() => setShowSort((v) => !v)}
                >
                  Ordenação:{" "}
                  <b>
                    {sort === "recent"
                      ? "Mais recentes"
                      : sort === "oldest"
                        ? "Mais antigas"
                        : "Nome"}
                  </b>
                  <ArrowUpDown className="size-3.5 text-[#8b95a8]" />
                </button>
                {showSort && (
                  <div className="absolute top-10 right-0 z-30 w-44 overflow-hidden rounded-xl border bg-white py-1 shadow-lg">
                    {(
                      [
                        ["recent", "Mais recentes"],
                        ["oldest", "Mais antigas"],
                        ["name", "Nome A–Z"],
                      ] as const
                    ).map(([k, lab]) => (
                      <MenuBtn
                        key={k}
                        label={lab}
                        onClick={() => {
                          setSort(k);
                          setShowSort(false);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="relative" data-menu>
                <button
                  type="button"
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full border",
                    showFilter || statusFilter !== "all"
                      ? "border-[#0050a0] text-[#0050a0]"
                      : "border-[#c5cde0] text-[#5a6780]",
                  )}
                  onClick={() => setShowFilter((v) => !v)}
                >
                  <Filter className="size-4" />
                </button>
                {showFilter && (
                  <div className="absolute top-10 right-0 z-30 w-40 overflow-hidden rounded-xl border bg-white py-1 shadow-lg">
                    <MenuBtn label="Todas" onClick={() => { setStatusFilter("all"); setShowFilter(false); }} />
                    <MenuBtn label="Ativadas" onClick={() => { setStatusFilter("on"); setShowFilter(false); }} />
                    <MenuBtn label="Desativadas" onClick={() => { setStatusFilter("off"); setShowFilter(false); }} />
                  </div>
                )}
              </div>
              <div className="relative" data-menu>
                <button
                  type="button"
                  disabled={selectedIds.length === 0}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full border",
                    selectedIds.length
                      ? "border-[#0050a0] text-[#0050a0]"
                      : "border-[#c5cde0] text-[#b8c0d0]",
                  )}
                  onClick={() => selectedIds.length && setShowGear((v) => !v)}
                >
                  <Settings className="size-4" />
                </button>
                {showGear && (
                  <div className="absolute top-10 right-0 z-30 w-40 overflow-hidden rounded-xl border bg-white py-1 shadow-lg">
                    <MenuBtn
                      label="Mover"
                      onClick={() => {
                        const first = selectedIds[0];
                        if (first) setMoveTarget({ kind: "auto", id: first });
                        setShowGear(false);
                      }}
                    />
                    <MenuBtn
                      label="Apagar"
                      danger
                      onClick={() => {
                        selectedIds.forEach((id) => trashAutomation(id));
                        setSelectedIds([]);
                        setShowGear(false);
                        toast.success("Enviadas à lixeira");
                      }}
                    />
                  </div>
                )}
              </div>
              <button
                type="button"
                className={cn(
                  "flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13.5px] font-semibold",
                  trashView
                    ? "border-[#0050a0] bg-[#e6eef8] text-[#0050a0]"
                    : "border-[#c5cde0] text-[#0050a0]",
                )}
                onClick={() => {
                  setTrashView((v) => !v);
                  setSelectedIds([]);
                }}
              >
                <Trash2 className="size-4" /> Lixeira
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-visible">
            <table className="w-full min-w-[720px] text-left text-[14.5px]">
              <thead>
                <tr className="border-b text-[#5a6780]">
                  <th className="w-10 py-2 font-medium">
                    <input
                      type="checkbox"
                      checked={listed.length > 0 && listed.every((a) => selectedIds.includes(a.id))}
                      onChange={(e) =>
                        setSelectedIds(e.target.checked ? listed.map((a) => a.id) : [])
                      }
                    />
                  </th>
                  <th className="py-2 font-medium">Nome</th>
                  <th className="py-2 font-medium">Criado em</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="w-28" />
                </tr>
              </thead>
              <tbody>
                {listed.map((a) => (
                  <tr key={a.id} className="border-b border-[#eef1f7]">
                    <td className="py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(a.id)}
                        onChange={(e) =>
                          setSelectedIds((ids) =>
                            e.target.checked ? [...ids, a.id] : ids.filter((x) => x !== a.id),
                          )
                        }
                      />
                    </td>
                    <td className="py-3 font-normal text-[#1a2744]">
                      <button
                        type="button"
                        className="text-left hover:text-[#0050a0]"
                        onClick={() => openAuto(a.id)}
                      >
                        {a.name}
                      </button>
                    </td>
                    <td className="py-3 whitespace-nowrap text-[#5a6780]">
                      {fmtDate(a.createdAt ?? a.updatedAt)}
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={a.active}
                        aria-label={a.active ? `Desativar ${a.name}` : `Ativar ${a.name}`}
                        className="flex items-center gap-2"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (toggleLock.current) return;
                          toggleLock.current = true;
                          window.setTimeout(() => {
                            toggleLock.current = false;
                          }, 400);
                          toggleAutomation(a.id);
                          toast.success(a.active ? "Desativada" : "Ativada");
                        }}
                      >
                        <span
                          className={cn(
                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                            a.active ? "bg-[#0050a0]" : "bg-[#c5cde0]",
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block size-4 rounded-full bg-white transition-transform",
                              a.active ? "translate-x-4" : "translate-x-0.5",
                            )}
                          />
                        </span>
                        <span className="text-[13.5px] text-[#5a6780]">
                          {a.active ? "Ativado" : "Desativado"}
                        </span>
                      </button>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-1">
                        {!trashView && (
                          <>
                            <button
                              type="button"
                              className="flex size-8 items-center justify-center rounded-full text-[#5a6780] hover:bg-[#eef1f7]"
                              title="Abrir fluxo"
                              onClick={() => openAuto(a.id)}
                            >
                              <GitBranch className="size-4" />
                            </button>
                            <button
                              type="button"
                              className="flex size-8 items-center justify-center rounded-full text-[#5a6780] hover:bg-[#eef1f7]"
                              title="Editar"
                              onClick={() => openAuto(a.id)}
                            >
                              <Pencil className="size-4" />
                            </button>
                          </>
                        )}
                        <div className="relative" data-menu>
                          <button
                            type="button"
                            data-open-auto-menu={autoMenu === a.id ? "1" : undefined}
                            className="flex size-8 items-center justify-center rounded-full text-[#5a6780] hover:bg-[#eef1f7]"
                            onClick={() => setAutoMenu(autoMenu === a.id ? null : a.id)}
                          >
                            <MoreHorizontal className="size-4" />
                          </button>
                          {autoMenu === a.id && (
                            <PopMenu>
                              {trashView ? (
                                <>
                                  <MenuBtn
                                    label="Restaurar"
                                    onClick={() => {
                                      restoreAutomation(a.id);
                                      setAutoMenu(null);
                                    }}
                                  />
                                  <MenuBtn
                                    label="Apagar de vez"
                                    danger
                                    onClick={() => {
                                      deleteAutomation(a.id);
                                      setAutoMenu(null);
                                    }}
                                  />
                                </>
                              ) : (
                                <>
                                  <MenuBtn
                                    label="Detalhes"
                                    onClick={() => {
                                      setDetails(
                                        buildSystemRecord(
                                          {
                                            id: a.id,
                                            name: a.name,
                                            folderId: a.folderId,
                                            createdAt: a.createdAt ?? a.updatedAt,
                                            updatedAt: a.updatedAt,
                                            active: a.active,
                                          },
                                          { type: "automation", ...ctx },
                                        ),
                                      );
                                      setAutoMenu(null);
                                    }}
                                  />
                                  <MenuBtn
                                    label="Renomear"
                                    onClick={() => {
                                      const n = prompt("Renomear automação", a.name);
                                      if (n?.trim()) {
                                        updateAutomation(a.id, { name: n.trim() });
                                        toast.success("Renomeada");
                                      }
                                      setAutoMenu(null);
                                    }}
                                  />
                                  <MenuBtn
                                    label="Mover"
                                    onClick={() => {
                                      setMoveTarget({ kind: "auto", id: a.id });
                                      setAutoMenu(null);
                                    }}
                                  />
                                  <MenuBtn
                                    label="Duplicar"
                                    onClick={() => {
                                      duplicateAutomation(a.id);
                                      setAutoMenu(null);
                                      toast.success("Duplicada");
                                    }}
                                  />
                                  <MenuBtn
                                    label="Apagar"
                                    danger
                                    onClick={() => {
                                      trashAutomation(a.id);
                                      setAutoMenu(null);
                                      toast.success("Enviada à lixeira");
                                    }}
                                  />
                                </>
                              )}
                            </PopMenu>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {listed.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-[#8b95a8]">
                      {trashView ? "Lixeira vazia." : "Nenhuma automação nesta lista."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {details && (
        <DetailsModal title="Detalhes" record={details} onClose={() => setDetails(null)} />
      )}

      {moveTarget && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/35 p-4"
          onClick={() => setMoveTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[18px] font-bold">Mover para pasta</h3>
            <div className="mt-3 space-y-1">
              {moveTarget.kind === "folder" && (
                <button
                  type="button"
                  className="block w-full rounded-lg px-3 py-2 text-left hover:bg-[#f4f6fa]"
                  onClick={() => {
                    moveFolder(moveTarget.id, null);
                    setMoveTarget(null);
                    toast.success("Movida para a raiz");
                  }}
                >
                  Raiz (sem pasta pai)
                </button>
              )}
              {folders
                .filter((f) => f.id !== moveTarget.id)
                .map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className="block w-full rounded-lg px-3 py-2 text-left hover:bg-[#f4f6fa]"
                    onClick={() => {
                      if (moveTarget.kind === "folder") moveFolder(moveTarget.id, f.id);
                      else {
                        updateAutomation(moveTarget.id, { folderId: f.id });
                        selectedIds.forEach((id) => {
                          if (id !== moveTarget.id) updateAutomation(id, { folderId: f.id });
                        });
                      }
                      setMoveTarget(null);
                      toast.success("Movido");
                    }}
                  >
                    {f.name}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={() => {
            setShowCreate(false);
            setCreateStep("home");
          }}
        >
          <div
            className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="float-right text-[#8b95a8]"
              onClick={() => {
                setShowCreate(false);
                setCreateStep("home");
              }}
            >
              <X className="size-5" />
            </button>
            {createStep === "home" && (
              <>
                <GitBranch className="size-5 text-[#1a2744]" />
                <h2 className="mt-2 text-[22px] font-bold text-[#1a2744]">
                  Cadastrar Automação
                </h2>
                <p className="mt-1 text-[14.5px] text-[#5a6780]">
                  Selecione uma das opções abaixo para iniciar a configuração da sua automação.
                </p>
                <div className="mt-4 space-y-2.5">
                  <CreateOpt
                    icon={<Sparkles className="size-5" />}
                    title="Começar do zero"
                    hint="Crie sua automação do zero, personalize cada detalhe e alcance seus clientes com mais eficiência!"
                    onClick={createNew}
                  />
                  <CreateOpt
                    icon={<List className="size-5" />}
                    title="Escolher um template pronto"
                    hint="Nossos templates prontos são feitos para impulsionar seus resultados. Escolha o ideal e personalize em poucos cliques para o seu negócio."
                    onClick={() => setCreateStep("templates")}
                  />
                  <CreateOpt
                    icon={<Upload className="size-5" />}
                    title="Importar de outra conexão"
                    hint="Importe automações de outras contas da sua empresa. Ganhe tempo e mantenha a consistência adaptando fluxos já validados."
                    onClick={() => setCreateStep("import")}
                  />
                  <CreateOpt
                    icon={<Upload className="size-5" />}
                    title="Importar Template (JSON)"
                    hint="Importe automações diretamente de arquivos JSON."
                    onClick={() => fileRef.current?.click()}
                  />
                </div>
              </>
            )}
            {createStep === "templates" && (
              <>
                <button
                  type="button"
                  className="text-[14px] font-medium text-[#0050a0]"
                  onClick={() => setCreateStep("home")}
                >
                  ← Voltar
                </button>
                <h2 className="mt-2 text-[22px] font-bold text-[#1a2744]">
                  Templates prontos
                </h2>
                <p className="mt-1 text-[14.5px] text-[#5a6780]">
                  Escolha um modelo e personalize no construtor.
                </p>
                <div className="mt-4 space-y-2.5">
                  {AUTO_TEMPLATES.map((tpl) => (
                    <CreateOpt
                      key={tpl.name}
                      icon={<Sparkles className="size-5" />}
                      title={tpl.name}
                      hint={tpl.hint}
                      onClick={() => createFromTemplate(tpl)}
                    />
                  ))}
                </div>
              </>
            )}
            {createStep === "import" && (
              <>
                <button
                  type="button"
                  className="text-[14px] font-medium text-[#0050a0]"
                  onClick={() => setCreateStep("home")}
                >
                  ← Voltar
                </button>
                <h2 className="mt-2 text-[22px] font-bold text-[#1a2744]">
                  Importar de outra conexão
                </h2>
                <p className="mt-1 text-[14.5px] text-[#5a6780]">
                  Escolha uma automação existente para copiar o fluxo.
                </p>
                <div className="mt-4 max-h-[50vh] space-y-1.5 overflow-y-auto">
                  {automations.filter((a) => !a.trashed).length === 0 && (
                    <p className="text-[14px] text-[#8b95a8]">Nenhuma automação para importar.</p>
                  )}
                  {automations
                    .filter((a) => !a.trashed)
                    .map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="flex w-full items-center justify-between rounded-2xl border border-[#e2e7f0] px-4 py-3 text-left hover:border-[#0050a0] hover:bg-[#f3f5fa]"
                        onClick={() => importFromAutomation(a.id)}
                      >
                        <span>
                          <span className="block text-[15px] font-medium text-[#1a2744]">{a.name}</span>
                          <span className="text-[13px] text-[#8b95a8]">
                            {a.active ? "Ativa" : "Inativa"} · {a.nodes?.length ?? 0} blocos
                          </span>
                        </span>
                      </button>
                    ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) importJsonFile(file);
        }}
      />
    </AppShell>
  );
}

function PopMenu({ children }: { children: ReactNode }) {
  const [pos, setPos] = useState({ top: 8, left: 8 });

  useLayoutEffect(() => {
    const host = document.querySelector("[data-open-auto-menu='1']");
    if (!host) return;
    const r = host.getBoundingClientRect();
    const width = 176;
    const height = 232;
    const openUp = r.bottom + height > window.innerHeight - 16;
    const top = openUp ? Math.max(8, r.top - height - 6) : r.bottom + 6;
    const left = Math.min(
      window.innerWidth - width - 8,
      Math.max(8, r.right - width),
    );
    setPos({ top, left });
  }, []);

  return createPortal(
    <div
      data-menu
      className="fixed z-[200] w-44 overflow-hidden rounded-xl border bg-white py-1 shadow-lg"
      style={{ top: pos.top, left: pos.left }}
    >
      {children}
    </div>,
    document.body,
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
      <div className="mb-1 text-[#1a2744]">{icon}</div>
      <div className="text-[16px] font-bold text-[#1a2744]">{title}</div>
      <div className="mt-1 text-[13.5px] text-[#5a6780]">{hint}</div>
    </button>
  );
}

const AUTO_TEMPLATES = [
  {
    name: "Boas-vindas",
    hint: "Dispara em qualquer mensagem e envia uma saudação ao aluno.",
    nodes: [
      {
        id: "n_tr",
        type: "trigger",
        label: "Cliente interagir",
        x: 80,
        y: 140,
        config: { kind: "any_inbound", matchMode: "any" },
      },
      {
        id: "n_msg",
        type: "message",
        label: "Saudação",
        x: 400,
        y: 130,
        config: {
          text: "Olá, {{primeiro_nome}}! Seja bem-vindo à Escola Bíblica Novo Tempo.",
          msgKind: "session",
          sessionBlock: "text",
        },
      },
    ],
    edges: [{ id: "e1", from: "n_tr", to: "n_msg" }],
  },
  {
    name: "Palavra-chave",
    hint: "Inicia quando o aluno enviar uma das palavras definidas.",
    nodes: [
      {
        id: "n_tr",
        type: "trigger",
        label: "Palavra-chave",
        x: 80,
        y: 140,
        config: { kind: "keyword", keyword: "oi, estudo, visita", matchMode: "words" },
      },
      {
        id: "n_msg",
        type: "message",
        label: "Resposta",
        x: 400,
        y: 130,
        config: {
          text: "Recebemos sua mensagem! Em breve um agente da Novo Tempo vai te atender.",
          msgKind: "session",
          sessionBlock: "text",
        },
      },
    ],
    edges: [{ id: "e1", from: "n_tr", to: "n_msg" }],
  },
  {
    name: "Encaminhar à sede regional",
    hint: "Avisa o aluno e marca a tag da base regional.",
    nodes: [
      {
        id: "n_tr",
        type: "trigger",
        label: "Cliente interagir",
        x: 60,
        y: 140,
        config: { kind: "any_inbound", matchMode: "any" },
      },
      {
        id: "n_msg",
        type: "message",
        label: "Aviso ao aluno",
        x: 340,
        y: 120,
        config: {
          text: "Sua sede regional dará continuidade no WhatsApp local. {{phone}}",
          msgKind: "session",
          sessionBlock: "text",
        },
      },
      {
        id: "n_tag",
        type: "tag",
        label: "Marcar na base regional",
        x: 640,
        y: 130,
        config: { tagId: "eb_estudando", action: "add" },
      },
    ],
    edges: [
      { id: "e1", from: "n_tr", to: "n_msg" },
      { id: "e2", from: "n_msg", to: "n_tag" },
    ],
  },
];
