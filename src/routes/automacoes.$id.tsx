import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Ban,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  GitBranch,
  Globe,
  Hash,
  HelpCircle,
  Kanban,
  ListChecks,
  Maximize2,
  Megaphone,
  MessageSquare,
  Minus,
  Phone,
  Pencil,
  Play,
  Plus,
  Save,
  Settings,
  Share2,
  Sheet,
  Shuffle,
  Tag,
  ThumbsDown,
  ThumbsUp,
  Timer,
  Trash2,
  User,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { MessageComposer } from "@/components/automation/MessageComposer";
import { ConditionConfig } from "@/components/automation/ConditionConfig";
import { HttpRequestConfig } from "@/components/automation/HttpRequestConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { flowOutputLabels, parseButtons, parseConditionGroups, parseRandomVariations } from "@/lib/automation-engine";
import {
  CTWA_FIELD_SOURCES,
  CTWA_MODES,
  INTERACT_MATCHES,
  TRIGGER_CATALOG,
  ctwaModeOf,
  inferTriggerKind,
  interactMatchOf,
  parseCtwaFieldMap,
  triggerByKind,
  type TriggerItem,
} from "@/lib/automation-triggers";
import { inferSessionBlock, parseMsgStack, parseReplyButtons, collectLinkButtons } from "@/lib/message-blocks";
import { useCrmStore } from "@/lib/store";
import type { FlowEdge, FlowNode, FlowNodeType } from "@/lib/types";
import { cn, uid } from "@/lib/utils";

export const Route = createFileRoute("/automacoes/$id")({
  component: AutomationEditorPage,
  errorComponent: ({ error }) => (
    <AppShell title="Automação">
      <div className="p-8 text-center">
        <p className="font-semibold text-[#1a2e24]">
          Não foi possível abrir a automação
        </p>
        <p className="mt-2 text-sm text-[#6b7a72]">{error.message}</p>
        <Link
          to="/automacoes"
          className="mt-4 inline-block text-[var(--color-primary)]"
        >
          Voltar para a lista
        </Link>
      </div>
    </AppShell>
  ),
});

const CARD_W = 280;

const PICKER: {
  type: FlowNodeType;
  label: string;
  bg: string;
  beta?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { type: "message", label: "Envio de mensagem", bg: "#e6f6ef", icon: MessageSquare },
  { type: "condition", label: "Condicional", bg: "#e3f0ff", icon: GitBranch },
  { type: "delay", label: "Atraso inteligente", bg: "#fde4df", icon: Timer },
  { type: "forward", label: "Encaminhar automação", bg: "#f3e4f8", icon: Share2 },
  { type: "http", label: "Requisição HTTP", bg: "#ffe8d6", icon: Globe },
  { type: "optout", label: "OptOut", bg: "#fde4df", icon: Ban },
  { type: "random", label: "Randomizador", bg: "#e6eaf5", icon: Shuffle },
  { type: "tag", label: "Ações de contato", bg: "#fff6d6", icon: Tag },
  { type: "crm", label: "Ações de CRM", bg: "#e6f7ee", icon: Kanban },
  { type: "system", label: "Ações de Sistema", bg: "#ececec", icon: Settings },
  { type: "conversion", label: "API de Conversão", bg: "#e3f0ff", icon: Megaphone },
  { type: "call", label: "SMS e Áudio na Ligação", bg: "#d9f5e8", icon: Phone },
  { type: "sheets", label: "Google Sheets", bg: "#cfe9dc", icon: Sheet, beta: true },
];

const PALETTE: {
  type: FlowNodeType;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { type: "trigger", label: "Gatilho", hint: "Quando dispara", icon: Zap },
  { type: "template", label: "Template", hint: "Modelo Meta", icon: FileText },
  { type: "assign", label: "Atribuir", hint: "Atendente", icon: UserPlus },
  { type: "fields", label: "Campos", hint: "Customizados", icon: ListChecks },
  { type: "finalize", label: "Finalizar", hint: "Encerra", icon: CheckCircle2 },
  ...PICKER.map((p) => ({
    type: p.type,
    label: p.label,
    hint: "",
    icon: p.icon,
  })),
];

const HEAD: Record<FlowNodeType, string> = {
  trigger: "Gatilho",
  message: "Envio de mensagem",
  template: "Envio de template",
  tag: "Ações de contato",
  fields: "Ações de contato",
  http: "Requisição HTTP",
  condition: "Condicional",
  delay: "Atraso inteligente",
  crm: "Ações de CRM",
  assign: "Ações de CRM",
  finalize: "Finalizar atendimento",
  forward: "Encaminhar automação",
  optout: "OptOut",
  random: "Randomizador",
  system: "Ações de Sistema",
  conversion: "API de Conversão",
  call: "SMS e Áudio na Ligação",
  sheets: "Google Sheets",
};

function AutomationEditorPage() {
  const { id } = Route.useParams();
  return <FlowWorkspace automationId={id} />;
}

/** Editor único de fluxo.
 *  Qualquer mudança de canvas, blocos, zoom, ligações ou config
 *  vale para Automações E para o construtor de Broadcast
 *  (`<FlowWorkspace embedded />` em /broadcasts). Não duplicar este editor.
 */
export function FlowWorkspace({
  automationId,
  embedded = false,
  embedHeight,
}: {
  automationId: string;
  embedded?: boolean;
  embedHeight?: number;
}) {
  const id = automationId;
  const navigate = useNavigate();
  const automation = useCrmStore((s) => s.automations.find((a) => a.id === id));
  const tags = useCrmStore((s) => s.tags);
  const agents = useCrmStore((s) => s.agents);
  const stages = useCrmStore((s) => s.stages);
  const templates = useCrmStore((s) => s.templates);
  const customFields = useCrmStore((s) => s.customFields);
  const conversations = useCrmStore((s) => s.conversations);
  const contacts = useCrmStore((s) => s.contacts);
  const saveFlow = useCrmStore((s) => s.saveFlow);
  const updateAutomation = useCrmStore((s) => s.updateAutomation);
  const executeAutomations = useCrmStore((s) => s.executeAutomations);
  const deleteAutomation = useCrmStore((s) => s.deleteAutomation);
  const allAutos = useCrmStore((s) => s.automations);
  const broadcasts = useCrmStore((s) => s.broadcasts);
  const pickAutos = useMemo(() => {
    const bcIds = new Set(
      broadcasts.map((b) => b.flowId).filter((id): id is string => Boolean(id)),
    );
    return allAutos.filter(
      (a) =>
        !a.trashed &&
        !a.isDemo &&
        a.source !== "broadcast" &&
        !bcIds.has(a.id) &&
        !a.name.startsWith("Fluxo ·") &&
        a.id !== "au1" &&
        a.id !== "au2" &&
        a.id !== "au3",
    );
  }, [allAutos, broadcasts]);

  const [ready, setReady] = useState(false);
  const [fromBroadcast, setFromBroadcast] = useState(false);
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [connectLabel, setConnectLabel] = useState("");
  const [pickFrom, setPickFrom] = useState<string | null>(null);
  const [pickAt, setPickAt] = useState<{ x: number; y: number } | null>(null);
  const [pickDragging, setPickDragging] = useState(false);
  const pickDragRef = useRef<{ ox: number; oy: number } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [name, setName] = useState("");
  const [zoom, setZoom] = useState(1);
  const [dotOpacity, setDotOpacity] = useState(28);
  const [pan, setPan] = useState({ x: 48, y: 56 });
  const [panning, setPanning] = useState<{
    sx: number;
    sy: number;
    px: number;
    py: number;
  } | null>(null);
  const [linkDrag, setLinkDrag] = useState<{
    fromId: string;
    label: string;
    x: number;
    y: number;
    replaceId?: string;
    sx: number;
    sy: number;
  } | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const upLock = useRef(false);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 48, y: 56 });
  zoomRef.current = zoom;
  panRef.current = pan;
  const [portOff, setPortOff] = useState<Record<string, { x: number; y: number }>>(
    {},
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem("chatnt-flow-dot-opacity");
      if (saved) {
        const n = Number(saved);
        if (Number.isFinite(n)) setDotOpacity(Math.min(80, Math.max(6, n)));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      setFromBroadcast(sessionStorage.getItem("chatnt.returnBroadcast") === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const persist = useCrmStore.persist;
    const mark = () => setReady(true);
    if (persist?.hasHydrated()) {
      mark();
      return;
    }
    const unsub = persist?.onFinishHydration(mark);
    const t = window.setTimeout(mark, 120);
    return () => {
      unsub?.();
      window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (!ready || !automation) return;
    setNodes(automation.nodes ?? []);
    setEdges(automation.edges ?? []);
    setName(automation.name ?? "");
    setSelectedId(null);
    setSelectedEdgeId(null);
    const raw = automation.edges ?? [];
    const seen = new Set<string>();
    const unique: FlowEdge[] = [];
    for (const e of raw) {
      const dest = (automation.nodes ?? []).find((n) => n.id === e.to);
      if (dest?.type === "trigger") continue;
      const src = (automation.nodes ?? []).find((n) => n.id === e.from);
      const key = `${e.from}::${(e.label || "").trim().toLowerCase()}`;
      if (src?.type === "random" && !e.label) {
        unique.push(e);
        continue;
      }
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(e);
    }
    setEdges(unique);
  }, [ready, automation?.id]);

  useEffect(() => {
    if (!ready || !automation) return;
    const t = window.setTimeout(() => {
      saveFlow(id, nodes, edges);
    }, 500);
    return () => window.clearTimeout(t);
  }, [nodes, edges, id, ready, automation, saveFlow]);

  const selected = nodes.find((n) => n.id === selectedId) ?? null;
  const runs = automation?.runCount ?? 0;

  const world = useMemo(() => {
    const maxX = nodes.reduce((m, n) => Math.max(m, n.x + CARD_W + 40), 900);
    const maxY = nodes.reduce((m, n) => Math.max(m, n.y + 320), 640);
    return {
      w: Math.max(1600, maxX + 340),
      h: Math.max(900, maxY + 80),
    };
  }, [nodes]);

  function clampZoom(z: number) {
    return Math.min(2.4, Math.max(0.2, z));
  }

  function worldPoint(e: { clientX: number; clientY: number }) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    const z = zoomRef.current || 1;
    const p = panRef.current;
    return {
      x: (e.clientX - r.left - p.x) / z,
      y: (e.clientY - r.top - p.y) / z,
    };
  }

  function applyView(nextZoom: number, nextPan: { x: number; y: number }) {
    zoomRef.current = nextZoom;
    panRef.current = nextPan;
    setZoom(nextZoom);
    setPan(nextPan);
  }

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const target = e.target as Node | null;
      if (!target || !canvas.contains(target)) return;
      e.preventDefault();
      e.stopPropagation();
      const z = zoomRef.current;
      const p = panRef.current;
      const factor = Math.exp(-e.deltaY * 0.0018);
      const next = clampZoom(z * factor);
      const r = canvas.getBoundingClientRect();
      const cx = e.clientX - r.left;
      const cy = e.clientY - r.top;
      const wx = (cx - p.x) / z;
      const wy = (cy - p.y) / z;
      applyView(next, { x: cx - wx * next, y: cy - wy * next });
    };
    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () =>
      window.removeEventListener("wheel", onWheel, {
        capture: true,
      } as EventListenerOptions);
  }, []);

  useEffect(() => {
    if (!linkDrag) return;
    const move = (e: MouseEvent) => {
      const p = worldPoint(e);
      setLinkDrag((cur) => (cur ? { ...cur, x: p.x, y: p.y } : cur));
      setDropTargetId(findDropTarget(e));
    };
    const up = (e: MouseEvent) => handleCanvasMouseUp(e as unknown as React.MouseEvent);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [linkDrag?.fromId, linkDrag?.replaceId]);

  useEffect(() => {
    if (!pickDragging) return;
    const move = (e: MouseEvent) => {
      const d = pickDragRef.current;
      if (!d) return;
      const p = worldPoint(e);
      setPickAt({ x: p.x - d.ox, y: p.y - d.oy });
    };
    const up = () => {
      setPickDragging(false);
      pickDragRef.current = null;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [pickDragging]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.key === "Backspace" || e.key === "Delete") && selectedEdgeId) {
        e.preventDefault();
        removeEdge(selectedEdgeId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedEdgeId]);

  function fitZoom() {
    const el = canvasRef.current;
    if (!el || nodes.length === 0) {
      applyView(1, { x: 48, y: 56 });
      return;
    }
    const pad = 80;
    const minX = Math.min(...nodes.map((n) => n.x)) - pad;
    const minY = Math.min(...nodes.map((n) => n.y)) - pad;
    const maxX = Math.max(...nodes.map((n) => n.x + CARD_W)) + pad;
    const maxY = Math.max(...nodes.map((n) => n.y + 260)) + pad;
    const z = clampZoom(
      Math.min(
        1,
        el.clientWidth / Math.max(320, maxX - minX),
        el.clientHeight / Math.max(240, maxY - minY),
      ),
    );
    applyView(z, {
      x: (el.clientWidth - (maxX - minX) * z) / 2 - minX * z,
      y: (el.clientHeight - (maxY - minY) * z) / 2 - minY * z,
    });
  }

  const portSig = nodes
    .map(
      (n) =>
        `${n.id}:${n.type}:${n.config?.msgStack ?? ""}:${n.config?.msgButtons ?? ""}:${n.config?.button ?? ""}:${n.config?.templateId ?? ""}`,
    )
    .join("|");

  const measurePorts = useCallback(() => {
    const root = worldRef.current;
    if (!root) return;
    const next: Record<string, { x: number; y: number }> = {};
    root.querySelectorAll<HTMLElement>("[data-node-id]").forEach((card) => {
      const nid = card.dataset.nodeId;
      if (!nid) return;
      const w = card.offsetWidth;
      const h = card.offsetHeight;
      const cr = card.getBoundingClientRect();
      const sx = cr.width ? w / cr.width : 1;
      const sy = cr.height ? h / cr.height : 1;
      const place = (key: string, el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        next[key] = {
          x: (r.left + r.width / 2 - cr.left) * sx,
          y: (r.top + r.height / 2 - cr.top) * sy,
        };
      };
      card.querySelectorAll<HTMLElement>("[data-port]").forEach((el) => {
        const port = el.dataset.port;
        if (!port) return;
        place(`${nid}:${port}`, el);
      });
      if (!next[`${nid}:in`]) next[`${nid}:in`] = { x: 0, y: 32 };
      if (!next[`${nid}:out`]) next[`${nid}:out`] = { x: w, y: h - 14 };
    });
    setPortOff((prev) => {
      const keys = Object.keys(next);
      if (
        keys.length === Object.keys(prev).length &&
        keys.every(
          (k) => prev[k]?.x === next[k].x && prev[k]?.y === next[k].y,
        )
      ) {
        return prev;
      }
      return next;
    });
  }, [portSig]);

  useLayoutEffect(() => {
    if (!ready) return;
    measurePorts();
    const t = window.setTimeout(measurePorts, 50);
    return () => window.clearTimeout(t);
  }, [measurePorts, edges.length, nodes, ready]);

  const edgePaths = useMemo(() => {
    return edges
      .filter((ed) => ed.id !== linkDrag?.replaceId)
      .map((ed) => {
        const from = nodes.find((n) => n.id === ed.from);
        const to = nodes.find((n) => n.id === ed.to);
        if (!from || !to) return null;
        const outKey = ed.label
          ? `${from.id}:out:${ed.label}`
          : `${from.id}:out`;
        const a =
          portOff[outKey] ??
          portOff[
            Object.keys(portOff).find(
              (k) =>
                k.toLowerCase() === outKey.toLowerCase() ||
                (ed.label &&
                  k.toLowerCase() ===
                    `${from.id}:out:${ed.label}`.toLowerCase()),
            ) ?? ""
          ] ??
          portOff[`${from.id}:out`];
        const b = portOff[`${to.id}:in`];
        const x1 = from.x + (a?.x ?? CARD_W);
        const y1 = from.y + (a?.y ?? 96);
        const x2 = to.x + (b?.x ?? 0);
        const y2 = to.y + (b?.y ?? 24);
        const dx = Math.max(48, Math.abs(x2 - x1) * 0.4);
        return {
          id: ed.id,
          label: ed.label,
          x1,
          y1,
          x2,
          y2,
          midX: (x1 + x2) / 2,
          midY: (y1 + y2) / 2 - 8,
          d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`,
        };
      })
      .filter(Boolean) as {
      id: string;
      label?: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      midX: number;
      midY: number;
      d: string;
    }[];
  }, [edges, nodes, portOff, linkDrag?.replaceId]);

  function addTriggerBack() {
    if (nodes.some((n) => n.type === "trigger")) {
      toast.message("Esta automação já tem um gatilho");
      return;
    }
    const node: FlowNode = {
      id: uid("n"),
      type: "trigger",
      label: "Gatilho",
      x: 80,
      y: 120,
      config: { kind: "any_inbound" },
    };
    setNodes((ns) => [node, ...ns]);
    setSelectedId(node.id);
    toast.success("Gatilho adicionado — escolha como ele dispara");
  }

  function addNode(type: FlowNodeType, at?: { x: number; y: number }) {
    const node: FlowNode = {
      id: uid("n"),
      type,
      label: HEAD[type],
      x: at?.x ?? 80 + (nodes.length % 4) * 280,
      y: at?.y ?? 60 + Math.floor(nodes.length / 4) * 200,
      config: defaultConfig(type, {
        tags,
        agents,
        stages,
        templates,
        customFields,
      }),
    };
    setNodes((ns) => [...ns, node]);
    setSelectedId(node.id);
    return node;
  }

  function updateNode(nodeId: string, patch: Partial<FlowNode>) {
    setNodes((ns) =>
      ns.map((n) =>
        n.id === nodeId
          ? { ...n, ...patch, config: { ...n.config, ...(patch.config ?? {}) } }
          : n,
      ),
    );
  }

  function exclusiveEdges(
    es: FlowEdge[],
    next: FlowEdge,
    fromType?: FlowNodeType,
  ) {
    const label = (next.label || "").trim().toLowerCase();
    if (fromType === "random" && !label) {
      return [
        ...es.filter(
          (e) =>
            !(
              e.from === next.from &&
              e.to === next.to &&
              (e.label || "").trim() === (next.label || "").trim()
            ),
        ),
        next,
      ];
    }
    return [
      ...es.filter((e) => {
        if (e.id === next.id) return false;
        if (e.from !== next.from) return true;
        return (e.label || "").trim().toLowerCase() !== label;
      }),
      next,
    ];
  }

  function addAndLink(type: FlowNodeType) {
    const src = nodes.find((n) => n.id === pickFrom);
    const node = addNode(type, {
      x: (src?.x ?? 80) + CARD_W + 80,
      y: src?.y ?? 80,
    });
    if (src) {
      const next: FlowEdge = {
        id: uid("e"),
        from: src.id,
        to: node.id,
        label: connectLabel.trim() || undefined,
      };
      setEdges((es) => exclusiveEdges(es, next, src.type));
    }
    setSelectedId(node.id);
    setPickFrom(null);
    setConnectFrom(null);
    setConnectLabel("");
  }

  function tryConnect(
    toId: string,
    fromId = connectFrom,
    label = connectLabel,
    replaceId?: string,
  ) {
    const src = fromId;
    if (!src || src === toId) {
      setConnectFrom(null);
      return;
    }
    const dest = nodes.find((n) => n.id === toId);
    if (dest?.type === "trigger") {
      toast.error("O gatilho não recebe ligação — ele inicia o fluxo");
      setConnectFrom(null);
      return;
    }
    const srcNode = nodes.find((n) => n.id === src);
    const next: FlowEdge = {
      id: replaceId ?? uid("e"),
      from: src,
      to: toId,
      label: label.trim() || undefined,
    };
    const hadOther = edges.some(
      (ed) =>
        ed.id !== next.id &&
        ed.from === src &&
        (ed.label || "").trim().toLowerCase() === (next.label || "").trim().toLowerCase() &&
        srcNode?.type !== "random",
    );
    setEdges((es) => exclusiveEdges(es, next, srcNode?.type));
    toast.success(
      hadOther
        ? "Ligação substituída — um passo só vai para um destino"
        : replaceId
          ? "Ligação reconectada"
          : "Próximo passo ligado",
    );
    setConnectFrom(null);
    setConnectLabel("");
  }

  function removeEdge(edgeId: string) {
    setEdges((es) => es.filter((e) => e.id !== edgeId));
    setSelectedEdgeId((cur) => (cur === edgeId ? null : cur));
    toast.success("Ligação excluída");
  }

  function handleSave() {
    if (!automation) return;
    saveFlow(id, nodes, edges);
    if (name.trim() && name !== automation.name) {
      updateAutomation(id, { name: name.trim() });
    }
    toast.success("Fluxo salvo");
  }

  function testRun() {
    handleSave();
    const cv = conversations[0];
    const ct = contacts.find((c) => c.id === cv?.contactId);
    if (!cv || !ct) {
      toast.error("Precisa de uma conversa no Live Chat para testar");
      return;
    }
    const keyword =
      nodes.find((n) => n.type === "trigger")?.config?.keyword || "oi";
    const n = executeAutomations({
      conversationId: cv.id,
      contactId: ct.id,
      inboundText: keyword,
      forceAutomationId: id,
    });
    toast.success(
      n > 0
        ? `Teste: ${n} mensagem(ns) no Live Chat`
        : "Fluxo executado — veja o histórico da conversa",
    );
  }

  function findDropTarget(e: { clientX: number; clientY: number }) {
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const card = el?.closest("[data-node-id]") as HTMLElement | null;
    if (card?.dataset.nodeId) {
      const n = nodes.find((x) => x.id === card.dataset.nodeId);
      if (n && n.type !== "trigger" && n.id !== linkDrag?.fromId) return n.id;
    }
    const p = worldPoint(e);
    let best: { id: string; d: number } | null = null;
    for (const n of nodes) {
      if (n.type === "trigger" || n.id === linkDrag?.fromId) continue;
      const port = portOff[`${n.id}:in`] ?? { x: 0, y: 26 };
      const dx = p.x - (n.x + port.x);
      const dy = p.y - (n.y + port.y);
      const d = Math.hypot(dx, dy);
      if (d < 36 && (!best || d < best.d)) best = { id: n.id, d };
    }
    return best?.id ?? null;
  }

  function startLink(
    nodeId: string,
    label: string,
    e: React.MouseEvent,
    replaceId?: string,
  ) {
    e.stopPropagation();
    e.preventDefault();
    const p = worldPoint(e);
    setDragId(null);
    setPanning(null);
    setConnectFrom(nodeId);
    setConnectLabel(label);
    setLinkDrag({
      fromId: nodeId,
      label,
      x: p.x,
      y: p.y,
      replaceId,
      sx: p.x,
      sy: p.y,
    });
    setDropTargetId(null);
  }

  function handleCanvasMouseMove(e: React.MouseEvent) {
    if (linkDrag) {
      const p = worldPoint(e);
      setLinkDrag({ ...linkDrag, x: p.x, y: p.y });
      setDropTargetId(findDropTarget(e));
      return;
    }
    if (panning) {
      applyView(zoomRef.current, {
        x: panning.px + (e.clientX - panning.sx),
        y: panning.py + (e.clientY - panning.sy),
      });
      return;
    }
    if (dragId) {
      const p = worldPoint(e);
      setNodes((ns) =>
        ns.map((n) =>
          n.id === dragId
            ? { ...n, x: p.x - dragOffset.x, y: p.y - dragOffset.y }
            : n,
        ),
      );
    }
  }

  function handleCanvasMouseUp(e: React.MouseEvent | MouseEvent) {
    if (upLock.current) return;
    upLock.current = true;
    window.setTimeout(() => {
      upLock.current = false;
    }, 0);
    if (linkDrag) {
      const toId = findDropTarget(e);
      const moved =
        Math.hypot(linkDrag.x - linkDrag.sx, linkDrag.y - linkDrag.sy) > 8;
      if (toId && toId !== linkDrag.fromId) {
        tryConnect(toId, linkDrag.fromId, linkDrag.label, linkDrag.replaceId);
      } else if (linkDrag.replaceId) {
        setConnectFrom(null);
        setConnectLabel("");
      } else if (!moved) {
        const p = worldPoint(e);
        setPickFrom(linkDrag.fromId);
        setPickAt({ x: p.x + 16, y: p.y - 20 });
        setConnectFrom(linkDrag.fromId);
        setConnectLabel(linkDrag.label);
      } else {
        const p = worldPoint(e);
        setPickFrom(linkDrag.fromId);
        setPickAt({ x: p.x + 16, y: p.y - 20 });
        setConnectFrom(linkDrag.fromId);
        setConnectLabel(linkDrag.label);
      }
      setLinkDrag(null);
      setDropTargetId(null);
    }
    setDragId(null);
    setPanning(null);
  }

  if (!ready) {
    if (embedded) {
      return <div className="p-8 text-center text-sm text-[#6b7a72]">Abrindo fluxo…</div>;
    }
    return (
      <AppShell title="Automação">
        <div className="p-10 text-center text-sm text-[#6b7a72]">
          Abrindo automação…
        </div>
      </AppShell>
    );
  }

  if (!automation) {
    if (embedded) {
      return <div className="p-8 text-center text-sm text-[#8a9690]">Fluxo não encontrado.</div>;
    }
    return (
      <AppShell title="Automação">
        <div className="p-8 text-center">
          <p className="text-[#8a9690]">Automação não encontrada.</p>
          <Link to="/automacoes" className="mt-4 inline-block text-[#0d9f4f]">
            Voltar
          </Link>
        </div>
      </AppShell>
    );
  }

  const workspace = (
    <div
      className={cn(
        "flex min-h-0 flex-col lg:flex-row",
        embedded && !embedHeight && "h-[min(78vh,880px)]",
        !embedded && "h-[calc(100dvh-3.5rem)]",
      )}
      style={embedded && embedHeight ? { height: embedHeight } : undefined}
    >
        <div
          ref={canvasRef}
          className="fl-canvas relative min-h-[420px] flex-1 overflow-hidden"
          style={{ ["--fl-dot-opacity" as string]: String(dotOpacity / 100) }}
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).closest("[data-node-id], .fl-pick, button, input, label")) return;
            setSelectedId(null);
            setSelectedEdgeId(null);
            setPanning({
              sx: e.clientX,
              sy: e.clientY,
              px: panRef.current.x,
              py: panRef.current.y,
            });
          }}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={() => {
            if (linkDrag) return;
            setDragId(null);
            setPanning(null);
          }}
        >
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1 rounded-full bg-white/90 px-1.5 py-1 shadow-sm">
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-full text-[#1a2744] hover:bg-[#e6eef8]"
              title="Diminuir"
              onClick={(e) => {
                e.stopPropagation();
                const el = canvasRef.current;
                if (!el) {
                  setZoom((z) => clampZoom(z - 0.12));
                  return;
                }
                const z = zoomRef.current;
                const next = clampZoom(z / 1.12);
                const r = el.getBoundingClientRect();
                const cx = r.width / 2;
                const cy = r.height / 2;
                const p = panRef.current;
                applyView(next, {
                  x: cx - ((cx - p.x) / z) * next,
                  y: cy - ((cy - p.y) / z) * next,
                });
              }}
            >
              <Minus className="size-4" />
            </button>
            <span className="min-w-[3.2rem] text-center text-[12px] font-semibold tabular-nums text-[#1a2e24]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-full text-[#1a2744] hover:bg-[#e6eef8]"
              title="Aumentar"
              onClick={(e) => {
                e.stopPropagation();
                const el = canvasRef.current;
                if (!el) {
                  setZoom((z) => clampZoom(z + 0.12));
                  return;
                }
                const z = zoomRef.current;
                const next = clampZoom(z * 1.12);
                const r = el.getBoundingClientRect();
                const cx = r.width / 2;
                const cy = r.height / 2;
                const p = panRef.current;
                applyView(next, {
                  x: cx - ((cx - p.x) / z) * next,
                  y: cy - ((cy - p.y) / z) * next,
                });
              }}
            >
              <Plus className="size-4" />
            </button>
            <button
              type="button"
              className="flex h-8 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium text-[#0050a0] hover:bg-[#e6eef8]"
              title="Ajustar à tela"
              onClick={(e) => {
                e.stopPropagation();
                fitZoom();
              }}
            >
              <Maximize2 className="size-3.5" />
              Ajustar
            </button>
            {!nodes.some((n) => n.type === "trigger") && (
              <button
                type="button"
                className="flex h-8 items-center gap-1 rounded-full bg-[#003878] px-2.5 text-[12px] font-semibold text-white hover:bg-[#002860]"
                title="Adicionar gatilho"
                onClick={(e) => {
                  e.stopPropagation();
                  addTriggerBack();
                }}
              >
                <Zap className="size-3.5" />
                Adicionar gatilho
              </button>
            )}
            <label
              className="ml-1 flex h-8 items-center gap-1.5 border-l border-[#e2e7f0] pl-2 pr-2"
              title="Opacidade dos pontos"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <span className="text-[11px] font-medium text-[#5a6780]">Pontos</span>
              <input
                type="range"
                min={6}
                max={70}
                value={dotOpacity}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setDotOpacity(n);
                  try {
                    localStorage.setItem("chatnt-flow-dot-opacity", String(n));
                  } catch {
                    /* ignore */
                  }
                }}
                className="h-1 w-16 cursor-pointer accent-[#0050a0]"
              />
            </label>
          </div>

          {!nodes.some((n) => n.type === "trigger") && (
            <button
              type="button"
              className="absolute top-16 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#003878] bg-white px-4 py-2 text-[14px] font-semibold text-[#003878] shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                addTriggerBack();
              }}
            >
              <Zap className="size-4" />
              Esta automação está sem gatilho — clique para adicionar
            </button>
          )}

          <div
            ref={worldRef}
            className="absolute top-0 left-0 origin-top-left"
            style={{
              width: world.w,
              height: world.h,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            <div className="relative" style={{ width: world.w, height: world.h }}>
              <svg
                className="absolute inset-0 z-[3]"
                width={world.w}
                height={world.h}
                style={{ pointerEvents: "none" }}
              >
                {edgePaths.map((ep) => (
                  <g key={ep.id}>
                    <path
                      d={ep.d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="14"
                      className="pointer-events-auto cursor-grab"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const edge = edges.find((x) => x.id === ep.id);
                        if (!edge) return;
                        startLink(edge.from, edge.label ?? "", e, edge.id);
                      }}
                    />
                    <path
                      d={ep.d}
                      fill="none"
                      stroke={selectedEdgeId === ep.id ? "#dc2626" : "#9aa3b2"}
                      strokeWidth={selectedEdgeId === ep.id ? 1.85 : 1.25}
                      className="pointer-events-none"
                    />
                    <circle
                      cx={ep.x1}
                      cy={ep.y1}
                      r="2.2"
                      fill={selectedEdgeId === ep.id ? "#dc2626" : "#9aa3b2"}
                    />
                  </g>
                ))}
                {linkDrag &&
                  (() => {
                    const from = nodes.find((n) => n.id === linkDrag.fromId);
                    if (!from) return null;
                    const key = linkDrag.label
                      ? `${from.id}:out:${linkDrag.label}`
                      : `${from.id}:out`;
                    const a = portOff[key] ?? portOff[`${from.id}:out`];
                    const x1 = from.x + (a?.x ?? CARD_W);
                    const y1 = from.y + (a?.y ?? 80);
                    const x2 = linkDrag.x;
                    const y2 = linkDrag.y;
                    const dx = Math.max(48, Math.abs(x2 - x1) * 0.4);
                    return (
                      <path
                        d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                        fill="none"
                        stroke="#9aa3b2"
                        strokeWidth="1.25"
                        strokeDasharray="6 4"
                      />
                    );
                  })()}
              </svg>

              {pickFrom && (
                <div
                  className="fl-pick"
                  data-dragging={pickDragging}
                  style={{
                    position: "absolute",
                    left: pickAt?.x ?? 80,
                    top: pickAt?.y ?? 40,
                    zIndex: 30,
                    cursor: pickDragging ? "grabbing" : undefined,
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if ((e.target as HTMLElement).closest("button.fl-pick-item, .fl-pick-close")) {
                      return;
                    }
                    const p = worldPoint(e);
                    pickDragRef.current = {
                      ox: p.x - (pickAt?.x ?? 0),
                      oy: p.y - (pickAt?.y ?? 0),
                    };
                    setPickDragging(true);
                  }}
                >
                  <h4 className="fl-pick-handle">
                    {connectLabel
                      ? `Próximo passo de “${connectLabel}”`
                      : "Escolha o próximo passo"}
                  </h4>
                  {PICKER.map((p) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.type}
                        type="button"
                        className="fl-pick-item"
                        style={{ background: p.bg }}
                        onClick={() => addAndLink(p.type)}
                      >
                        <Icon className="size-3.5" />
                        {p.label}
                        {p.beta && <span className="beta">BETA</span>}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className="fl-pick-close mt-1 flex w-full items-center justify-center py-1 text-[#8a9690]"
                    onClick={() => {
                      setPickFrom(null);
                      setConnectFrom(null);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              )}

              {nodes.map((node) => {
                const Icon =
                  PALETTE.find((p) => p.type === node.type)?.icon ?? Zap;
                const buttons = flowOutputLabels(node, templates);
                const linkButtons = collectLinkButtons(node.config);
                return (
                  <div
                    key={node.id}
                    data-node-id={node.id}
                    className="fl-card"
                    data-kind={node.type}
                    data-selected={selectedId === node.id}
                    data-connect={connectFrom === node.id}
                    data-drop={dropTargetId === node.id}
                    style={{
                      position: "absolute",
                      left: node.x,
                      top: node.y,
                      zIndex: 2,
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setSelectedId(node.id);
                      setSelectedEdgeId(null);
                      const p = worldPoint(e);
                      setDragId(node.id);
                      setDragOffset({ x: p.x - node.x, y: p.y - node.y });
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (connectFrom && connectFrom !== node.id) {
                        tryConnect(node.id);
                      }
                    }}
                  >
                    {node.type !== "trigger" && (
                    <button
                      type="button"
                      className="fl-port"
                      data-port="in"
                      title="Entrada — ligar aqui"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (connectFrom) tryConnect(node.id);
                      }}
                    />
                    )}
                    <div className="fl-head">
                      <Icon />
                      {node.label || HEAD[node.type]}
                    </div>
                    {node.type === "trigger" && (
                      <div className="fl-stats">
                        {["0", "0", "0", "0", "0"].map((n, i) => (
                          <div key={i}>
                            <b>{n}</b>
                            <span>
                              {["env.", "ent.", "saiu", "erro", "ok"][i]}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <NodeBody
                      node={node}
                      tags={tags}
                      agents={agents}
                      stages={stages}
                      templates={templates}
                      customFields={customFields}
                      automations={allAutos}
                    />
                    {buttons.map((b) => (
                      <button
                        key={b}
                        type="button"
                        className="fl-wa-btn"
                        onMouseDown={(e) => startLink(node.id, b, e)}
                      >
                        <span className="lab">{b}</span>
                        <span className="pct">0%</span>
                        <span className="fl-dot-out" data-port={`out:${b}`} />
                      </button>
                    ))}
                    {linkButtons.map((b) => (
                      <div
                        key={b.id || `${b.label}-${b.url}`}
                        className="fl-wa-btn fl-wa-link"
                        title={b.url || b.label}
                      >
                        <span className="lab">{b.label || b.url}</span>
                        <ExternalLink className="size-3.5 shrink-0 text-[#0050a0]" />
                      </div>
                    ))}
                    {inferSessionBlock(node.config ?? {}) === "context" && (
                      <button
                        type="button"
                        className="fl-msg-btn"
                        onMouseDown={(e) =>
                          startLink(node.id, "Contato não respondeu", e)
                        }
                      >
                        <span>Contato não respondeu</span>
                        <span
                          className="fl-dot-out"
                          data-port="out:Contato não respondeu"
                          style={{ borderColor: "#e11d48" }}
                        />
                      </button>
                    )}
                    <div className="fl-foot">
                      <span className="flex items-center gap-2 text-[#8b95a8]">
                        <button
                          type="button"
                          title="Duplicar bloco"
                          className="hover:text-[#1a2744]"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            const copy: FlowNode = {
                              ...node,
                              id: uid("n"),
                              x: node.x + 28,
                              y: node.y + 28,
                              config: { ...node.config },
                            };
                            setNodes((ns) => [...ns, copy]);
                            setSelectedId(copy.id);
                          }}
                        >
                          <Copy className="size-3.5" />
                        </button>
                        {node.type !== "trigger" && (
                          <button
                            type="button"
                            title="Excluir bloco"
                            className="hover:text-red-600"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setNodes((ns) => ns.filter((n) => n.id !== node.id));
                              setEdges((es) =>
                                es.filter((ed) => ed.from !== node.id && ed.to !== node.id),
                              );
                              if (selectedId === node.id) setSelectedId(null);
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </span>
                      <span className="fl-next">
                        {node.type !== "random" && node.type !== "condition" && node.type !== "forward" && (
                        <span className="mr-1 text-[13.5px] leading-tight">
                          {connectFrom === node.id
                            ? "Arraste até o próximo bloco ou clique para escolher"
                            : "Próximo passo"}
                        </span>
                        )}
                        {node.type !== "random" && node.type !== "condition" && node.type !== "forward" && (
                        <button
                          type="button"
                          className="fl-dot-out"
                          data-port="out"
                          title="Arraste até o próximo bloco"
                          onMouseDown={(e) => startLink(node.id, "", e)}
                        />
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}

              {edgePaths.map((ep) => (
                <button
                  key={`del-${ep.id}`}
                  type="button"
                  title="Excluir ligação"
                  className={cn(
                    "absolute z-[4] flex size-3.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-white/95",
                    selectedEdgeId === ep.id
                      ? "border-red-400 text-red-500"
                      : "border-[#d5dae3] text-[#9aa3b2] hover:border-red-400 hover:text-red-500",
                  )}
                  style={{ left: ep.midX, top: ep.midY }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeEdge(ep.id);
                  }}
                >
                  <Trash2 className="size-2" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {selected ? (
        <aside className="w-full shrink-0 overflow-y-auto border-t border-[#e2e7f0] bg-white p-5 lg:w-[420px] lg:border-t-0 lg:border-l">
          <div className="mb-3 flex items-start justify-between gap-2">
            <label className="block min-w-0 flex-1 text-xs">
              <span className="text-[#8a9690]">Nome da automação</span>
              <Input
                className="mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="mt-5 flex size-8 shrink-0 items-center justify-center rounded-full text-[#8b95a8] hover:bg-[#f4f6fa] hover:text-[#1a2744]"
              title="Fechar"
              onClick={() => setSelectedId(null)}
            >
              <X className="size-4" />
            </button>
          </div>
          {connectFrom && (
            <p className="mt-3 rounded-lg bg-amber-50 px-2 py-1.5 text-[12px] text-amber-800">
              Clique no card de destino
              {connectLabel ? ` (${connectLabel})` : ""}
            </p>
          )}
          {selected.type !== "random" &&
            selected.type !== "condition" &&
            selected.type !== "forward" &&
            selected.type !== "http" && (
            <h3 className="mt-1 text-[17px] font-medium text-[#1a2e24]">
              Configuração
            </h3>
          )}
          <div className="mt-3 space-y-3">
            <NodeConfig
              selected={selected}
              updateNode={updateNode}
              tags={tags}
              agents={agents}
              stages={stages}
              templates={templates}
              customFields={customFields}
              automations={pickAutos}
              currentId={id}
              onVariationRename={(from, to) => {
                if (!from || from === to) return;
                setEdges((es) =>
                  es.map((e) =>
                    e.from === selected.id && e.label === from
                      ? { ...e, label: to }
                      : e,
                  ),
                );
              }}
              onVariationRemove={(label) => {
                setEdges((es) =>
                  es.filter(
                    (e) =>
                      !(e.from === selected.id && e.label === label),
                  ),
                );
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600"
              disabled={selected.type === "trigger"}
              title={
                selected.type === "trigger"
                  ? "O gatilho não pode ser excluído"
                  : "Remover card"
              }
              onClick={() => {
                if (selected.type === "trigger") {
                  toast.error("O gatilho não pode ser excluído");
                  return;
                }
                setNodes((ns) => ns.filter((n) => n.id !== selected.id));
                setEdges((es) =>
                  es.filter((e) => e.from !== selected.id && e.to !== selected.id),
                );
                setSelectedId(null);
              }}
            >
              <Trash2 className="size-3.5" />
              {selected.type === "trigger" ? "Gatilho obrigatório" : "Remover card"}
            </Button>
          </div>
          {!embedded && (
          <div className="mt-6 border-t border-[#eef1ef] pt-3">
            <p className="text-[11px] text-[#8a9690]">{runs} execução(ões)</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-red-600"
              onClick={() => {
                if (!confirm("Excluir esta automação?")) return;
                deleteAutomation(id);
                toast.success("Excluída");
                void navigate({ to: "/automacoes" });
              }}
            >
              <Trash2 className="size-3.5" />
              Excluir automação
            </Button>
          </div>
          )}
        </aside>
        ) : null}
    </div>
  );

  if (embedded) return workspace;

  return (
    <AppShell
      title={name || "Automação"}
      fullBleed
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void navigate({ to: "/automacoes" })}
          >
            <ArrowLeft className="size-3.5" />
            Lista
          </Button>
          <Button variant="ghost" size="sm" onClick={testRun}>
            <Play className="size-3.5" />
            Testar
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="size-3.5" />
            Salvar
          </Button>
        </div>
      }
    >
      {workspace}
    </AppShell>
  );
}

function WaText({ text }: { text: string }) {
  const parts = text.split(/(\{\{[^}]+\}\}|\*[^*\n]+\*)/g);
  return (
    <div>
      {parts.map((p, i) => {
        if (p.startsWith("{{") && p.endsWith("}}")) {
          return (
            <span key={i} className="var">
              {p}
            </span>
          );
        }
        if (p.startsWith("*") && p.endsWith("*") && p.length > 2) {
          return <strong key={i}>{p.slice(1, -1)}</strong>;
        }
        return <span key={i}>{p}</span>;
      })}
    </div>
  );
}

function defaultConfig(
  type: FlowNodeType,
  ctx: {
    tags: { id: string }[];
    agents: { id: string }[];
    stages: { id: string }[];
    templates: { id: string; body: string; buttons: string[] }[];
    customFields: { id: string }[];
  },
): Record<string, string> {
  if (type === "message") return { text: "", msgKind: "" };
  if (type === "template") {
    const t = ctx.templates[0];
    return {
      templateId: t?.id ?? "",
      text: t?.body ?? "",
      button: t?.buttons?.[0] ?? "",
    };
  }
  if (type === "delay") return { hours: "1" };
  if (type === "tag") return { tagId: ctx.tags[0]?.id ?? "", action: "add" };
  if (type === "fields")
    return { fieldId: ctx.customFields[0]?.id ?? "", value: "" };
  if (type === "trigger") return { kind: "any_inbound" };
  if (type === "condition")
    return {
      conditionGroups: JSON.stringify([
        {
          id: "g1",
          name: "Grupo de condições",
          join: "or",
          items: [],
        },
      ]),
    };
  if (type === "assign") return { agentId: ctx.agents[0]?.id ?? "" };
  if (type === "crm") return { stageId: ctx.stages[0]?.id ?? "" };
  if (type === "http") return { method: "POST", url: "", customBody: "0", headers: "[]", fieldMap: "{}" };
  if (type === "forward") return { automationId: "" };
  if (type === "system") return { action: "pause_ia" };
  if (type === "conversion") return { event: "lead" };
  if (type === "call") return { text: "Áudio de confirmação" };
  if (type === "sheets") return { sheet: "Alunos" };
  return {};
}

function NodeBody({
  node,
  tags,
  agents,
  stages,
  templates,
  customFields,
  automations,
}: {
  node: FlowNode;
  tags: { id: string; name: string }[];
  agents: { id: string; name: string }[];
  stages: { id: string; name: string }[];
  templates: { id: string; name: string; body: string; buttons: string[] }[];
  customFields: { id: string; name: string }[];
  automations?: { id: string; name: string }[];
}) {
  const cfg = node.config ?? {};
  if (node.type === "trigger") {
    const kind = inferTriggerKind(cfg);
    const item = triggerByKind(kind);
    const t = tags.find((x) => x.id === cfg.tagId);
    const extra =
      kind === "any_inbound"
        ? (() => {
            const match = INTERACT_MATCHES.find(
              (m) => m.mode === interactMatchOf(cfg),
            );
            const val = (cfg.matchValue || cfg.keyword || "").trim();
            if (match && match.mode !== "any" && val) {
              return `${match.label}\n“${val}”`;
            }
            return match?.label ?? "";
          })()
        : kind === "ctwa"
          ? (() => {
              const mode = CTWA_MODES.find((m) => m.mode === ctwaModeOf(cfg));
              const val = (cfg.ctwaText || cfg.ctwaAds || "").trim();
              return val ? `${mode?.label}: “${val}”` : (mode?.label ?? "");
            })()
        : kind === "keyword"
        ? `“${cfg.keyword || "…"}”`
        : kind === "tag" || kind === "tag_removed"
          ? t
            ? `#${t.name}`
            : "qualquer tag"
          : kind === "pipeline_stage"
            ? cfg.stageId || "qualquer etapa"
            : kind === "contact_no_reply" ||
                kind === "agent_no_reply" ||
                kind === "pipeline_stale"
              ? `${cfg.hours || "24"}h`
              : "";
    return (
      <div className="fl-preview">
        {item?.label ?? "Gatilho"}
        {extra ? <div className="mt-1 font-medium whitespace-pre-line">{extra}</div> : null}
      </div>
    );
  }
  if (node.type === "message" || node.type === "template") {
    const stack = parseMsgStack(cfg);
    const kind = inferSessionBlock(cfg);
    const tpl = templates.find((x) => x.id === cfg.templateId);
    if (!stack.length && !cfg.text && !cfg.mediaUrl && !tpl && !cfg.flowId) {
      return (
        <div className="fl-preview text-[#8b95a8]">
          Adicionar mensagem
          <div className="mt-1 font-normal">
            Adicione uma mensagem para continuar o fluxo.
          </div>
        </div>
      );
    }
    if (cfg.msgKind === "flow") {
      return (
        <div className="fl-preview">
          Flow
          <div className="mt-1 font-medium">{cfg.flowId || cfg.header || "—"}</div>
        </div>
      );
    }
    if (cfg.msgKind === "template" || (node.type === "template" && !stack.length)) {
      return (
        <div className="fl-wa">
          <WaText text={cfg.text || tpl?.body || "Template"} />
        </div>
      );
    }
    if (stack.length) {
      return (
        <div className="space-y-2">
          {stack.map((item) => {
            if (item.kind === "media") {
              return (
                <div key={item.id} className="fl-preview">
                  Mídia
                  <div className="mt-1 font-medium truncate">
                    {item.mediaName || item.mediaUrl || "Arquivo"}
                  </div>
                </div>
              );
            }
            if (item.kind === "context") {
              const field = customFields.find((f) => f.id === item.contextFieldId);
              return (
                <div key={item.id}>
                  <div className="fl-wa">
                    <WaText text={item.text || "Pergunta…"} />
                  </div>
                  <div className="fl-preview">
                    Aguarda a resposta do contato por 2 minutos
                    {field ? ` e preencha o campo ${field.name}.` : "."}
                  </div>
                </div>
              );
            }
            if (item.kind === "carousel") {
              return (
                <div key={item.id} className="fl-preview">
                  Carrossel
                  <div className="mt-1 font-medium">
                    {item.carouselCards?.length || 0} cartão(ões)
                  </div>
                </div>
              );
            }
            return (
              <div key={item.id} className="fl-wa">
                {item.header ? <div className="mb-1 font-semibold">{item.header}</div> : null}
                <WaText text={item.text || (item.kind === "list" ? "Lista de opções" : "…")} />
                {item.listButton ? <div className="fl-btn mt-2">{item.listButton}</div> : null}
                {item.footer ? (
                  <div className="mt-1 text-[12px] text-[#8b95a8]">{item.footer}</div>
                ) : null}
              </div>
            );
          })}
        </div>
      );
    }
    if (kind === "media") {
      return (
        <div className="fl-preview">
          Mídia
          <div className="mt-1 font-medium truncate">{cfg.mediaName || cfg.mediaUrl || "Arquivo"}</div>
        </div>
      );
    }
    if (kind === "list") {
      return (
        <div className="fl-wa">
          {cfg.header ? <div className="mb-1 font-semibold">{cfg.header}</div> : null}
          <WaText text={cfg.text || "Lista de opções"} />
          {cfg.listButton ? <div className="fl-btn mt-2">{cfg.listButton}</div> : null}
        </div>
      );
    }
    if (kind === "context") {
      const field = customFields.find((f) => f.id === cfg.contextFieldId);
      return (
        <div>
          <div className="fl-wa">
            <WaText text={cfg.text || "Pergunta…"} />
          </div>
          <div className="fl-preview">
            Aguarda a resposta do contato por 2 minutos
            {field ? ` e preencha o campo ${field.name}.` : "."}
          </div>
        </div>
      );
    }
    if (kind === "carousel") {
      return <div className="fl-preview">Carrossel</div>;
    }
    const text = cfg.text || tpl?.body || "Escreva a mensagem…";
    return (
      <div className="fl-wa">
        <WaText text={text} />
      </div>
    );
  }
  if (node.type === "tag") {
    const t = tags.find((x) => x.id === cfg.tagId);
    return (
      <div className="fl-preview">
        {cfg.action === "remove" ? "Tags removidas" : "Tags adicionadas"}
        <div className="mt-1 font-medium">#{t?.name ?? "—"}</div>
      </div>
    );
  }
  if (node.type === "fields") {
    return (
      <div className="fl-preview">
        Campo customizado
        <div className="mt-1 font-medium">{cfg.value || "—"}</div>
      </div>
    );
  }
  if (node.type === "delay") {
    return <div className="fl-preview">Espera {cfg.hours || "1"} hora(s)</div>;
  }
  if (node.type === "condition") {
    const groups = parseConditionGroups(node.config);
    const n = groups.reduce((s, g) => s + g.items.length, 0);
    if (!n) {
      return (
        <div className="fl-rand-empty">
          <div className="font-semibold text-[#1a2744]">Adicione as condições</div>
          <p className="mt-1 text-[13px] leading-snug text-[#5a6780]">
            Direcione o contato no fluxo com base em critérios específicos.
          </p>
        </div>
      );
    }
    return (
      <div className="fl-preview">
        {n} condição{n === 1 ? "" : "ões"} · {groups.length} grupo
        {groups.length === 1 ? "" : "s"}
      </div>
    );
  }
  if (node.type === "crm") {
    const st = stages.find((x) => x.id === cfg.stageId);
    return (
      <div className="fl-preview">
        Atribuir aluno à etapa
        <div className="mt-1 font-medium">{st?.name ?? "Etapa"}</div>
      </div>
    );
  }
  if (node.type === "assign") {
    const a = agents.find((x) => x.id === cfg.agentId);
    return (
      <div className="fl-preview">
        Atribuir atendente
        <div className="mt-1 font-medium">{a?.name ?? "Atendente"}</div>
      </div>
    );
  }
  if (node.type === "finalize") {
    return <div className="fl-preview">Encerra o atendimento</div>;
  }
  if (node.type === "forward") {
    const dest = automations?.find((a) => a.id === cfg.automationId);
    if (!dest) {
      return (
        <div className="fl-rand-empty">
          <div className="font-semibold text-[#1a2744]">Adicionar automação</div>
          <p className="mt-1 text-[13px] leading-snug text-[#5a6780]">
            Selecione uma automação para o contato iniciar.
          </p>
        </div>
      );
    }
    return (
      <div className="fl-preview">
        Encaminha para
        <div className="mt-1 font-medium text-[#1a2744]">{dest.name}</div>
      </div>
    );
  }
  if (node.type === "optout") {
    return <div className="fl-preview">Remove o aluno de broadcasts</div>;
  }
  if (node.type === "random") {
    const vars = parseRandomVariations(node.config);
    if (!vars.length) {
      return (
        <div className="fl-rand-empty">
          <div className="font-semibold text-[#1a2744]">Adicione as opções</div>
          <p className="mt-1 text-[13px] leading-snug text-[#5a6780]">
            Distribua os contatos em caminhos diferentes com base nas opções
            definidas.
          </p>
        </div>
      );
    }
    return (
      <div className="px-2 pb-1 text-[12.5px] text-[#5a6780]">
        {vars.length} variação{vars.length === 1 ? "" : "ões"}
        {node.config.randomAlways === "1" ? " · sempre aleatório" : " · caminho fixo"}
      </div>
    );
  }
  if (node.type === "http") {
    const empty = !cfg.url || cfg.url === "https://";
    return (
      <>
        <div className="fl-stats fl-stats-2">
          <div>
            <b>0</b>
            <span>Sucesso</span>
          </div>
          <div>
            <b>0</b>
            <span>Falha</span>
          </div>
        </div>
        {empty ? (
          <div className="fl-rand-empty">
            <div className="font-semibold text-[#1a2744]">
              Configure a sua requisição
            </div>
            <p className="mt-1 text-[13px] leading-snug text-[#5a6780]">
              Configure a requisição POST, PUT, GET, DELETE para continuar o
              fluxo.
            </p>
          </div>
        ) : (
          <div className="fl-preview">
            {cfg.method || "POST"} {cfg.url}
          </div>
        )}
      </>
    );
  }
  if (node.type === "system") {
    return <div className="fl-preview">{cfg.action || "pause_ia"}</div>;
  }
  if (node.type === "conversion") {
    return <div className="fl-preview">Evento: {cfg.event || "lead"}</div>;
  }
  if (node.type === "call") {
    return <div className="fl-preview">{cfg.text || "SMS / áudio"}</div>;
  }
  if (node.type === "sheets") {
    return <div className="fl-preview">Planilha: {cfg.sheet || "Alunos"}</div>;
  }
  return null;
}

function TriggerGlyph({ name }: { name: string }) {
  const cls = "size-6 shrink-0 text-[#1a2e24]";
  if (name === "wa") return <MessageSquare className={cls} />;
  if (name === "user-plus") return <UserPlus className={cls} />;
  if (name === "tag") return <Tag className={cls} />;
  if (name === "http") return <Hash className={cls} />;
  if (name === "user") return <User className={cls} />;
  if (name === "check") return <CheckCircle2 className={cls} />;
  if (name === "clock") return <Clock className={cls} />;
  if (name === "kanban") return <Kanban className={cls} />;
  if (name === "thumb-up") return <ThumbsUp className={cls} />;
  if (name === "thumb-down") return <ThumbsDown className={cls} />;
  if (name === "plus") return <Plus className={cls} />;
  if (name === "trash") return <Trash2 className={cls} />;
  return <Zap className={cls} />;
}

function TriggerKindFields({
  kind,
  selected,
  tags,
  agents,
  stages,
  setCfg,
}: {
  kind: string;
  selected: FlowNode;
  tags: { id: string; name: string }[];
  agents: { id: string; name: string; area?: string }[];
  stages: { id: string; name: string; order: number }[];
  setCfg: (patch: Record<string, string>) => void;
}) {
  const cfg = selected.config ?? {};
  return (
    <div className="space-y-3">
      {kind === "keyword" && (
        <label className="block text-xs">
          <span className="text-[#8b95a8]">Palavra-chave</span>
          <Input
            className="mt-1"
            value={cfg.keyword ?? ""}
            onChange={(e) => setCfg({ keyword: e.target.value })}
            placeholder="ex.: oi, estudo, visita"
          />
        </label>
      )}
      {(kind === "tag" || kind === "tag_removed") && (
        <label className="block text-xs">
          <span className="text-[#8b95a8]">Tag que dispara a ação</span>
          <select
            className="mt-1 h-11 w-full rounded-full border border-[#d5dae3] bg-white px-3 text-sm"
            value={cfg.tagId ?? ""}
            onChange={(e) => setCfg({ tagId: e.target.value })}
          >
            <option value="">Qualquer tag</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {kind === "assigned" && (
        <label className="block text-xs">
          <span className="text-[#8b95a8]">Atendente</span>
          <select
            className="mt-1 h-11 w-full rounded-full border border-[#d5dae3] bg-white px-3 text-sm"
            value={cfg.agentId ?? ""}
            onChange={(e) => setCfg({ agentId: e.target.value })}
          >
            <option value="">Qualquer atendente</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.area ? ` · ${a.area}` : ""}
              </option>
            ))}
          </select>
        </label>
      )}
      {(kind === "pipeline_stage" ||
        kind === "pipeline_stale" ||
        kind === "deal_won" ||
        kind === "deal_lost" ||
        kind === "deal_created" ||
        kind === "deal_deleted") && (
        <label className="block text-xs">
          <span className="text-[#8b95a8]">Etapa / pipeline</span>
          <select
            className="mt-1 h-11 w-full rounded-full border border-[#d5dae3] bg-white px-3 text-sm"
            value={cfg.stageId ?? ""}
            onChange={(e) => setCfg({ stageId: e.target.value })}
          >
            <option value="">Qualquer etapa</option>
            {stages
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
          </select>
        </label>
      )}
      {(kind === "contact_no_reply" ||
        kind === "agent_no_reply" ||
        kind === "pipeline_stale") && (
        <div className="grid grid-cols-[1fr_110px] gap-2">
          <label className="block text-xs">
            <span className="text-[#8b95a8]">Tempo sem resposta</span>
            <Input
              className="mt-1"
              type="number"
              min={1}
              value={cfg.hours ?? "24"}
              onChange={(e) => setCfg({ hours: e.target.value })}
            />
          </label>
          <label className="block text-xs">
            <span className="text-[#8b95a8]">Unidade</span>
            <select
              className="mt-1 h-10 w-full rounded-md border border-[#e2e7f0] px-2 text-sm"
              value={cfg.timeUnit ?? "hours"}
              onChange={(e) => setCfg({ timeUnit: e.target.value })}
            >
              <option value="hours">Horas</option>
              <option value="days">Dias</option>
            </select>
          </label>
        </div>
      )}
      {kind === "http_in" && (
        <>
          <label className="block text-xs">
            <span className="text-[#8b95a8]">Caminho / critério</span>
            <Input
              className="mt-1"
              value={cfg.path ?? "/hooks/automacao"}
              onChange={(e) => setCfg({ path: e.target.value })}
              placeholder="/hooks/automacao"
            />
          </label>
          <label className="block text-xs">
            <span className="text-[#8b95a8]">Método</span>
            <select
              className="mt-1 h-11 w-full rounded-full border border-[#d5dae3] bg-white px-3 text-sm"
              value={cfg.method ?? "POST"}
              onChange={(e) => setCfg({ method: e.target.value })}
            >
              <option>POST</option>
              <option>GET</option>
              <option>PUT</option>
              <option>PATCH</option>
            </select>
          </label>
        </>
      )}
      {(kind === "first_message" ||
        kind === "contact_created" ||
        kind === "conversation_closed") && (
        <p className="text-[14.5px] leading-snug text-[#5a6780]">
          Este gatilho inicia o fluxo automaticamente. Depois ligue o próximo
          passo no canvas — a ação acontece a partir daí.
        </p>
      )}
    </div>
  );
}

function TriggerPicker({
  selected,
  tags,
  agents,
  stages,
  customFields,
  setCfg,
  updateNode,
}: {
  selected: FlowNode;
  tags: { id: string; name: string }[];
  agents: { id: string; name: string; area?: string }[];
  stages: { id: string; name: string; order: number }[];
  customFields: { id: string; name: string }[];
  setCfg: (patch: Record<string, string>) => void;
  updateNode: (id: string, patch: Partial<FlowNode>) => void;
}) {
  const kind = inferTriggerKind(selected.config);
  const [step, setStep] = useState<"catalog" | "interact" | "ctwa" | "detail">(
    () => {
      if (kind === "any_inbound") return "interact";
      if (kind === "ctwa") return "ctwa";
      return "detail";
    },
  );
  const matchMode = interactMatchOf(selected.config);
  const matchValue = selected.config?.matchValue || selected.config?.keyword || "";
  const ctwaMode = ctwaModeOf(selected.config);
  const fieldMap = parseCtwaFieldMap(selected.config);

  useEffect(() => {
    const k = inferTriggerKind(selected.config);
    if (k === "any_inbound") setStep("interact");
    else if (k === "ctwa") setStep("ctwa");
    else setStep("detail");
  }, [selected.id]);

  const pick = (item: TriggerItem) => {
    updateNode(selected.id, { label: item.label });
    setCfg({ kind: item.kind });
    if (item.kind === "any_inbound") setStep("interact");
    else if (item.kind === "ctwa") setStep("ctwa");
    else setStep("detail");
  };

  const setFieldMap = (fieldId: string, source: string) => {
    const next = { ...fieldMap };
    if (!source) delete next[fieldId];
    else next[fieldId] = source;
    setCfg({ ctwaFieldMap: JSON.stringify(next) });
  };

  const currentItem = triggerByKind(kind);

  if (step === "detail" && currentItem) {
    return (
      <div className="space-y-3">
        <div>
          <p className="tg-title">Gatilhos</p>
          <p className="tg-sub">
            Configure este gatilho e ligue a próxima ação no fluxo
          </p>
        </div>
        <button
          type="button"
          className="tg-back flex items-center gap-1 text-[#0050a0]"
          onClick={() => setStep("catalog")}
        >
          ← Voltar
        </button>
        <div className="rounded-2xl border border-[#c47a3a] bg-[#faf4ec] px-3.5 py-3 shadow-[0_1px_4px_rgb(196_122_58/0.12)]">
          <div className="flex items-start gap-2.5">
            <TriggerGlyph name={currentItem.icon} />
            <div className="min-w-0">
              <p className="tg-card-title">
                {currentItem.label}
              </p>
              <p className="tg-card-hint">
                {currentItem.hint}
              </p>
            </div>
          </div>
        </div>
        <TriggerKindFields
          kind={kind}
          selected={selected}
          tags={tags}
          agents={agents}
          stages={stages}
          setCfg={setCfg}
        />
        <button
          type="button"
          className="mt-1 flex h-12 w-full items-center justify-center rounded-full bg-[#003878] text-[16px] font-semibold text-white hover:bg-[#002860]"
          onClick={() => setStep("catalog")}
        >
          Início
        </button>
      </div>
    );
  }

  if (step === "ctwa") {
    return (
      <div className="space-y-3">
        <div>
          <p className="tg-title">Gatilhos</p>
          <p className="tg-sub">
            Clique para WhatsApp (CTWA)
          </p>
        </div>
        <button
          type="button"
          className="tg-back flex items-center gap-1 text-[#0050a0]"
          onClick={() => setStep("catalog")}
        >
          ← Voltar
        </button>
        <div className="space-y-2">
          {CTWA_MODES.map((item) => {
            const on = ctwaMode === item.mode;
            return (
              <button
                key={item.mode}
                type="button"
                onClick={() => {
                  setCfg({ kind: "ctwa", ctwaMode: item.mode });
                  updateNode(selected.id, { label: "Clique para WhatsApp (CTWA)" });
                }}
                className={cn(
                  "w-full rounded-2xl border bg-white px-3.5 py-3 text-left transition-colors",
                  on
                    ? "border-[#c47a3a] bg-[#faf4ec] shadow-[0_1px_4px_rgb(196_122_58/0.12)]"
                    : "border-[#e2e7f0] hover:border-[#c5cde0]",
                )}
              >
                <span className="tg-card-title">
                  {item.label}
                </span>
                <span className="tg-card-hint">
                  {item.hint}
                </span>
              </button>
            );
          })}
        </div>
        {ctwaMode === "ads" && (
          <label className="block text-xs">
            <span className="text-[#8b95a8]">Anúncios ou campanhas</span>
            <textarea
              className="mt-1 min-h-[72px] w-full rounded-xl border border-[#e2e7f0] px-3 py-2 text-sm"
              value={selected.config?.ctwaAds ?? ""}
              onChange={(e) => setCfg({ ctwaAds: e.target.value })}
              placeholder="Nomes ou IDs, um por linha"
            />
          </label>
        )}
        {ctwaMode === "contains" && (
          <label className="block text-xs">
            <span className="text-[#8b95a8]">Texto que a mensagem deve conter</span>
            <Input
              className="mt-1"
              value={selected.config?.ctwaText ?? ""}
              onChange={(e) => setCfg({ ctwaText: e.target.value })}
              placeholder="ex.: quero estudar"
            />
          </label>
        )}
        <div className="pt-1">
          <p className="tg-section">
            Campos para atualizar o contato
          </p>
          <p className="tg-sub">
            Configure o que fazer com a resposta da requisição. Você pode
            extrair valores retornados e salvar nos campos personalizados do
            contato.
          </p>
          <div className="mt-3 space-y-3">
            {customFields.map((field) => (
              <label key={field.id} className="block">
                <span className="tg-field mb-1 flex items-center gap-1">
                  <span className="font-serif text-[15px] italic">Tt</span>
                  {field.name.toLowerCase()}
                </span>
                <select
                  className="h-11 w-full rounded-full border border-[#d5dae3] bg-white px-3 text-sm text-[#1a2744]"
                  value={fieldMap[field.id] ?? ""}
                  onChange={(e) => setFieldMap(field.id, e.target.value)}
                >
                  {CTWA_FIELD_SOURCES.map((src) => (
                    <option key={src.id || "none"} value={src.id}>
                      {src.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="mt-1 flex h-12 w-full items-center justify-center rounded-full bg-[#003878] text-[16px] font-semibold text-white hover:bg-[#002860]"
          onClick={() => setStep("catalog")}
        >
          Início
        </button>
      </div>
    );
  }

  if (step === "interact") {
    return (
      <div className="space-y-3">
        <div>
          <p className="tg-title">Gatilhos</p>
          <p className="tg-sub">
            Defina gatilhos para iniciar o fluxo da automação
          </p>
        </div>
        <button
          type="button"
          className="tg-back flex items-center gap-1 text-[#0050a0]"
          onClick={() => setStep("catalog")}
        >
          ← Voltar
        </button>
        <div className="space-y-2">
          {INTERACT_MATCHES.map((item) => {
            const on = matchMode === item.mode;
            return (
              <button
                key={item.mode}
                type="button"
                onClick={() => {
                  setCfg({
                    kind: "any_inbound",
                    matchMode: item.mode,
                    matchValue: item.mode === "any" ? "" : matchValue,
                  });
                  updateNode(selected.id, { label: "Cliente interagir" });
                }}
                className={cn(
                  "w-full rounded-2xl border bg-white px-3.5 py-3 text-left transition-colors",
                  on
                    ? "border-[#c47a3a] bg-[#faf4ec] shadow-[0_1px_4px_rgb(196_122_58/0.12)]"
                    : "border-[#e2e7f0] hover:border-[#c5cde0]",
                )}
              >
                <span className="tg-card-title">
                  {item.label}
                </span>
                <span className="tg-card-hint">
                  {item.hint}
                </span>
              </button>
            );
          })}
        </div>
        {matchMode !== "any" && (
          <label className="block text-xs">
            <span className="text-[#8b95a8]">
              {matchMode === "exact"
                ? "Texto exato"
                : matchMode === "contains"
                  ? "Texto que deve conter"
                  : matchMode === "starts_with"
                    ? "A mensagem começa com"
                    : matchMode === "regex"
                      ? "Padrão regex"
                      : "Palavras (separadas por vírgula)"}
            </span>
            {matchMode === "words" || matchMode === "regex" ? (
              <textarea
                className="mt-1 min-h-[72px] w-full rounded-xl border border-[#e2e7f0] px-3 py-2 text-sm"
                value={matchValue}
                onChange={(e) =>
                  setCfg({
                    matchValue: e.target.value,
                    keyword: e.target.value,
                  })
                }
                placeholder={
                  matchMode === "regex"
                    ? "ex.: ^(oi|olá|bom dia)"
                    : "ex.: oi, estudo, visita"
                }
              />
            ) : (
              <Input
                className="mt-1"
                value={matchValue}
                onChange={(e) =>
                  setCfg({
                    matchValue: e.target.value,
                    keyword: e.target.value,
                  })
                }
                placeholder={
                  matchMode === "exact"
                    ? "ex.: Quero estudar"
                    : matchMode === "starts_with"
                      ? "ex.: oi"
                      : "ex.: estudo"
                }
              />
            )}
          </label>
        )}
        <button
          type="button"
          className="mt-1 flex h-12 w-full items-center justify-center rounded-full bg-[#003878] text-[16px] font-semibold text-white hover:bg-[#002860]"
          onClick={() => setStep("catalog")}
        >
          Início
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="tg-title">Gatilhos</p>
        <p className="tg-sub">
          Defina o que inicia o fluxo da automação
        </p>
      </div>
      {TRIGGER_CATALOG.map((group) => (
        <div key={group.group}>
          <div className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold tracking-wide text-[#8a9690] uppercase">
            <span>{group.group}</span>
            <span className="h-px flex-1 bg-[#eef1ef]" />
          </div>
          <div className="space-y-1.5">
            {group.items.map((item) => {
              const on = kind === item.kind;
              return (
                <button
                  key={item.kind}
                  type="button"
                  onClick={() => pick(item)}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                    on
                      ? "border-[#f5c400] bg-[#fff8e1]"
                      : "border-[#e8ece9] bg-white hover:border-[#d4dcd7]",
                  )}
                >
                  <TriggerGlyph name={item.icon} />
                  <span className="min-w-0 flex-1">
                    <span className="tg-card-title">
                      {item.label}
                    </span>
                    <span className="tg-card-hint">
                      {item.hint}
                    </span>
                  </span>
                  <span className="mt-1 text-[#8b95a8]">›</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function RandomizerConfig({
  selected,
  setCfg,
  onRename,
  onRemove,
}: {
  selected: FlowNode;
  setCfg: (patch: Record<string, string>) => void;
  onRename: (from: string, to: string) => void;
  onRemove: (label: string) => void;
}) {
  const vars = parseRandomVariations(selected.config);
  const always = selected.config.randomAlways === "1";
  const [hint, setHint] = useState(false);

  function write(next: { id: string; label: string }[]) {
    setCfg({ variations: JSON.stringify(next) });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[#eef1f6] text-[#3d4a5c]">
            <Shuffle className="size-4" />
          </span>
          <h3 className="text-[20px] font-bold text-[#1a2744]">Randomizador</h3>
        </div>
        <button
          type="button"
          className="flex size-7 items-center justify-center rounded-full text-[#8b95a8] hover:bg-[#f4f6fa]"
          title="O contato segue um dos caminhos. Com o interruptor ligado, o sorteio é novo a cada passagem; desligado, o mesmo aluno permanece no caminho sorteado da primeira vez."
          onClick={() => setHint((v) => !v)}
        >
          <HelpCircle className="size-4" />
        </button>
      </div>
      <p className="text-[14.5px] leading-snug text-[#5a6780]">
        Defina as opções de caminho e distribua o fluxo dos contatos.
      </p>
      {hint && (
        <p className="rounded-xl bg-[#f4f6fa] px-3 py-2 text-[12.5px] leading-snug text-[#5a6780]">
          Cada variação vira uma saída no bloco. Ligue ao próximo passo arrastando
          o ponto. Com “Caminho aleatório sempre” o aluno pode cair em outro
          ramo se passar de novo.
        </p>
      )}
      <label className="flex items-center gap-2.5 text-[14.5px] text-[#1a2744]">
        <button
          type="button"
          role="switch"
          aria-checked={always}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors",
            always ? "bg-[#031c45]" : "bg-[#c5cde0]",
          )}
          onClick={() => setCfg({ randomAlways: always ? "0" : "1" })}
        >
          <span
            className={cn(
              "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
              always ? "left-[22px]" : "left-0.5",
            )}
          />
        </button>
        Caminho aleatório sempre
      </label>
      <div className="space-y-2">
        {vars.map((v, i) => (
          <div key={v.id} className="flex items-center gap-2">
            <input
              className="h-10 min-w-0 flex-1 rounded-xl border border-[#c5cde0] px-3 text-[14.5px] outline-none focus:border-[#0050a0]"
              value={v.label}
              onChange={(e) => {
                const next = e.target.value;
                onRename(v.label, next);
                write(
                  vars.map((x) =>
                    x.id === v.id ? { ...x, label: next } : x,
                  ),
                );
              }}
              placeholder={`Variação ${i + 1}`}
            />
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-xl border border-[#c5cde0] text-[#8b95a8] hover:text-red-600"
              onClick={() => {
                onRemove(v.label);
                write(vars.filter((x) => x.id !== v.id));
              }}
              title="Remover variação"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="flex h-11 w-full items-center justify-center rounded-full border border-[#031c45] text-[15px] font-medium text-[#031c45] hover:bg-[#f4f6fa]"
        onClick={() =>
          write([
            ...vars,
            { id: uid("v"), label: `Variação ${vars.length + 1}` },
          ])
        }
      >
        Nova Variação
      </button>
      <button
        type="button"
        className="flex h-11 w-full items-center justify-center rounded-full bg-[#031c45] text-[15px] font-semibold text-white hover:bg-[#003878]"
        onClick={() => toast.success("Randomizador salvo")}
      >
        Salvar
      </button>
    </div>
  );
}

function ForwardConfig({
  selected,
  setCfg,
  automations,
  currentId,
}: {
  selected: FlowNode;
  setCfg: (patch: Record<string, string>) => void;
  automations: { id: string; name: string; trashed?: boolean; isDemo?: boolean }[];
  currentId?: string;
}) {
  const [hint, setHint] = useState(false);
  const options = automations.filter(
    (a) =>
      !a.trashed &&
      !a.isDemo &&
      a.id !== currentId &&
      !["au1", "au2", "au3"].includes(a.id),
  );
  const destId = selected.config.automationId ?? "";
  const dest = options.find((a) => a.id === destId) ?? automations.find((a) => a.id === destId);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[#f3eaf8] text-[#6b3a88]">
            <Share2 className="size-4" />
          </span>
          <h3 className="text-[20px] font-bold text-[#1a2744]">
            Encaminhar automação
          </h3>
        </div>
        <button
          type="button"
          className="flex size-7 items-center justify-center rounded-full text-[#8b95a8] hover:bg-[#f4f6fa]"
          onClick={() => setHint((v) => !v)}
        >
          <HelpCircle className="size-4" />
        </button>
      </div>
      <p className="text-[14.5px] leading-snug text-[#5a6780]">
        Encaminhe o contato para outra automação e coloque ele em um novo fluxo.
      </p>
      {hint && (
        <p className="rounded-xl bg-[#f4f6fa] px-3 py-2 text-[12.5px] leading-snug text-[#5a6780]">
          Ao chegar neste bloco, o aluno sai deste fluxo e entra no gatilho da
          automação escolhida.
        </p>
      )}
      <label className="block">
        <span className="sr-only">Automações</span>
        <select
          className="h-12 w-full rounded-full border border-[#c5cde0] bg-white px-4 text-[14.5px] text-[#1a2744] outline-none focus:border-[#6b3a88]"
          value={destId}
          onChange={(e) => setCfg({ automationId: e.target.value })}
        >
          <option value="">Automações *</option>
          {options.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <div className="min-h-[88px] rounded-2xl border border-[#e2e7f0] bg-white px-4 py-3 text-[13.5px] text-[#5a6780]">
        {dest ? (
          <>
            <div className="font-semibold text-[#1a2744]">{dest.name}</div>
            <p className="mt-1">O contato inicia essa automação a partir do gatilho.</p>
          </>
        ) : null}
      </div>
      <button
        type="button"
        className="flex h-11 w-full items-center justify-center rounded-full bg-[#031c45] text-[15px] font-semibold text-white hover:bg-[#003878]"
        onClick={() =>
          dest
            ? toast.success("Encaminhamento salvo")
            : toast.error("Escolha uma automação")
        }
      >
        Salvar
      </button>
    </div>
  );
}

function NodeConfig({
  selected,
  updateNode,
  tags,
  agents,
  stages,
  templates,
  customFields,
  automations,
  currentId,
  onVariationRename,
  onVariationRemove,
}: {
  selected: FlowNode;
  updateNode: (id: string, patch: Partial<FlowNode>) => void;
  tags: { id: string; name: string }[];
  agents: { id: string; name: string; area?: string }[];
  stages: { id: string; name: string; order: number }[];
  templates: { id: string; name: string; body: string; buttons: string[] }[];
  customFields: { id: string; name: string }[];
  automations: { id: string; name: string; trashed?: boolean; isDemo?: boolean }[];
  currentId?: string;
  onVariationRename?: (from: string, to: string) => void;
  onVariationRemove?: (label: string) => void;
}) {
  const setCfg = (patch: Record<string, string>) =>
    updateNode(selected.id, {
      config: { ...(selected.config ?? {}), ...patch },
    });
  const cfg = selected.config ?? {};

  return (
    <>
      {selected.type !== "random" && selected.type !== "condition" && selected.type !== "forward" && selected.type !== "http" && (
      <label className="block text-xs">
        <span className="text-[#8a9690]">Título do card</span>
        <Input
          className="mt-1"
          value={selected.label}
          onChange={(e) => updateNode(selected.id, { label: e.target.value })}
        />
      </label>
      )}

      {selected.type === "condition" && (
        <ConditionConfig
          selected={selected}
          setCfg={setCfg}
          tags={tags}
          customFields={customFields}
          agents={agents}
          stages={stages}
        />
      )}

      {selected.type === "random" && (
        <RandomizerConfig
          selected={selected}
          setCfg={setCfg}
          onRename={onVariationRename ?? (() => {})}
          onRemove={onVariationRemove ?? (() => {})}
        />
      )}

      {selected.type === "forward" && (
        <ForwardConfig
          selected={selected}
          setCfg={setCfg}
          automations={automations}
          currentId={currentId}
        />
      )}

      {selected.type === "http" && (
        <HttpRequestConfig
          selected={selected}
          setCfg={setCfg}
          customFields={customFields}
        />
      )}

      {selected.type === "trigger" && (
        <TriggerPicker
          selected={selected}
          tags={tags}
          agents={agents}
          stages={stages}
          customFields={customFields}
          setCfg={setCfg}
          updateNode={updateNode}
        />
      )}

      {(selected.type === "message" || selected.type === "template") && (
        <MessageComposer
          selected={selected}
          templates={templates}
          customFields={customFields}
          setCfg={setCfg}
          updateNode={updateNode}
        />
      )}

      {selected.type === "tag" && (
        <>
          <label className="block text-xs">
            <span className="text-[#8a9690]">Ação</span>
            <select
              className="mt-1 h-10 w-full rounded-md border border-[#e5ebe8] px-2 text-sm"
              value={cfg.action ?? "add"}
              onChange={(e) => setCfg({ action: e.target.value })}
            >
              <option value="add">Adicionar tag</option>
              <option value="remove">Remover tag</option>
            </select>
          </label>
          <label className="block text-xs">
            <span className="text-[#8a9690]">Tag</span>
            <select
              className="mt-1 h-10 w-full rounded-md border border-[#e5ebe8] px-2 text-sm"
              value={cfg.tagId ?? ""}
              onChange={(e) => setCfg({ tagId: e.target.value })}
            >
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  #{t.name}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {selected.type === "fields" && (
        <>
          <label className="block text-xs">
            <span className="text-[#8a9690]">Campo</span>
            <select
              className="mt-1 h-10 w-full rounded-md border border-[#e5ebe8] px-2 text-sm"
              value={cfg.fieldId ?? ""}
              onChange={(e) => setCfg({ fieldId: e.target.value })}
            >
              {customFields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            <span className="text-[#8a9690]">Valor</span>
            <Input className="mt-1" value={cfg.value ?? ""} onChange={(e) => setCfg({ value: e.target.value })} />
          </label>
        </>
      )}

      {selected.type === "delay" && (
        <label className="block text-xs">
          <span className="text-[#8a9690]">Horas</span>
          <Input className="mt-1" type="number" min={1} value={cfg.hours ?? "1"} onChange={(e) => setCfg({ hours: e.target.value })} />
        </label>
      )}

      {selected.type === "assign" && (
        <label className="block text-xs">
          <span className="text-[#8a9690]">Atendente</span>
          <select
            className="mt-1 h-10 w-full rounded-md border border-[#e5ebe8] px-2 text-sm"
            value={cfg.agentId ?? ""}
            onChange={(e) => setCfg({ agentId: e.target.value })}
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {selected.type === "crm" && (
        <label className="block text-xs">
          <span className="text-[#8a9690]">Etapa</span>
          <select
            className="mt-1 h-10 w-full rounded-md border border-[#e5ebe8] px-2 text-sm"
            value={cfg.stageId ?? ""}
            onChange={(e) => setCfg({ stageId: e.target.value })}
          >
            {stages.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {selected.type === "system" && (
        <label className="block text-xs">
          <span className="text-[#8a9690]">Ação</span>
          <select
            className="mt-1 h-10 w-full rounded-md border border-[#e5ebe8] px-2 text-sm"
            value={cfg.action ?? "pause_ia"}
            onChange={(e) => setCfg({ action: e.target.value })}
          >
            <option value="pause_ia">Pausar ChatNT IA</option>
            <option value="pause_auto">Pausar automações</option>
            <option value="finalize">Finalizar atendimento</option>
            <option value="reopen">Reabrir na fila Novos</option>
          </select>
        </label>
      )}

      {selected.type === "conversion" && (
        <label className="block text-xs">
          <span className="text-[#8a9690]">Evento</span>
          <Input className="mt-1" value={cfg.event ?? "lead"} onChange={(e) => setCfg({ event: e.target.value })} />
        </label>
      )}

      {selected.type === "call" && (
        <label className="block text-xs">
          <span className="text-[#8a9690]">Texto / áudio</span>
          <Input className="mt-1" value={cfg.text ?? ""} onChange={(e) => setCfg({ text: e.target.value })} />
        </label>
      )}

      {selected.type === "sheets" && (
        <label className="block text-xs">
          <span className="text-[#8a9690]">Planilha</span>
          <Input className="mt-1" value={cfg.sheet ?? ""} onChange={(e) => setCfg({ sheet: e.target.value })} />
        </label>
      )}
    </>
  );
}
