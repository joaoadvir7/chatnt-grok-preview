import { ArrowLeft, GripVertical, Pencil, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useCrmStore } from "@/lib/store";
import { cn, uid } from "@/lib/utils";
import { fetchIceBreakers, publishIceBreakers } from "@/lib/whatsapp-api";
import { wabaReady } from "@/lib/whatsapp";

const MAX = 4;
const MAX_LEN = 80;

const DEFAULTS = [
  "Quero estudar a Bíblia",
  "Desejo fazer um pedido de oração",
  "Gostaria de receber uma visita",
  "Quero saber mais sobre o batismo",
];

type Row = { id: string; text: string };

function stripIce(s: string) {
  return s
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
    .slice(0, MAX_LEN);
}

function fromTexts(texts: string[]): Row[] {
  return texts.filter((t) => t.trim()).map((t) => ({ id: uid("ice"), text: t }));
}

export function IceBreakers({ onBack }: { onBack: () => void }) {
  const allConnections = useCrmStore((s) => s.connections);
  const connections = useMemo(
    () => allConnections.filter((c) => !c.trashed && !c.isDemo),
    [allConnections],
  );
  const preferredId = useCrmStore((s) => s.preferredConnectionId);
  const updateWaba = useCrmStore((s) => s.updateWaba);
  const setPreferred = useCrmStore((s) => s.setPreferredConnection);

  const [cxId, setCxId] = useState(
    () =>
      (preferredId && connections.some((c) => c.id === preferredId)
        ? preferredId
        : connections[0]?.id) ?? "",
  );
  const cx = connections.find((c) => c.id === cxId);
  const saved = cx?.waba?.iceBreakers ?? [];

  const [rows, setRows] = useState<Row[]>(() =>
    fromTexts(saved.length ? saved : DEFAULTS),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"load" | "save" | null>(null);
  const dragId = useRef<string | null>(null);

  const dirty = useMemo(() => {
    const a = rows.map((r) => r.text.trim()).filter(Boolean);
    const b = saved.map((t) => t.trim()).filter(Boolean);
    return JSON.stringify(a) !== JSON.stringify(b);
  }, [rows, saved]);

  const ready = Boolean(cx && wabaReady(cx.waba));
  const displayName =
    cx?.waba?.verifiedName || cx?.name || "ChatNT";

  function setRow(id: string, text: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, text: stripIce(text) } : r)));
  }

  async function loadFromMeta() {
    if (!cx?.waba || !ready) {
      toast.error("Conecte um número da API em Conexões");
      return;
    }
    setBusy("load");
    try {
      const res = await fetchIceBreakers({
        data: {
          accessToken: cx.waba.accessToken,
          phoneNumberId: cx.waba.phoneNumberId,
        },
      });
      if (!res.ok) {
        toast.error(res.error || "Não foi possível ler os iniciadores");
        return;
      }
      setRows(fromTexts(res.prompts.length ? res.prompts : []));
      updateWaba(cx.id, { iceBreakers: res.prompts });
      toast.success(
        res.prompts.length
          ? "Iniciadores atualizados da Meta"
          : "Nenhum iniciador neste número",
      );
    } finally {
      setBusy(null);
    }
  }

  async function saveAndPublish() {
    const prompts = rows.map((r) => r.text.trim()).filter(Boolean).slice(0, MAX);
    if (!cx) {
      toast.error("Escolha um número");
      return;
    }
    updateWaba(cx.id, { iceBreakers: prompts });
    if (!ready || !cx.waba) {
      toast.success("Salvo no ChatNT. Publique quando o número estiver conectado.");
      return;
    }
    setBusy("save");
    try {
      const res = await publishIceBreakers({
        data: {
          accessToken: cx.waba.accessToken,
          phoneNumberId: cx.waba.phoneNumberId,
          prompts,
        },
      });
      if (!res.ok) {
        toast.error(res.error || "A Meta recusou a publicação");
        return;
      }
      toast.success("Iniciadores publicados no WhatsApp");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[#e2e7f0] bg-white px-5 py-4">
        <div className="min-w-0">
          <button
            type="button"
            className="mb-2 inline-flex items-center gap-1 text-[13.5px] text-[#0050a0]"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" /> Live Chat
          </button>
          <h1 className="text-[22px] font-semibold text-[#1a2744]">
            Iniciadores de conversa
          </h1>
          <p className="mt-1 max-w-2xl text-[13.5px] leading-snug text-[#5a6780]">
            Configure as sugestões de mensagem exibidas ao contato ao iniciar uma
            conversa pela primeira vez.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-10 rounded-full border border-[#c5cde0] bg-white px-3 text-[13.5px]"
            value={cxId}
            onChange={(e) => {
              const id = e.target.value;
              setCxId(id);
              setPreferred(id);
              const next = connections.find((c) => c.id === id);
              setRows(
                fromTexts(
                  next?.waba?.iceBreakers?.length
                    ? next.waba.iceBreakers
                    : DEFAULTS,
                ),
              );
            }}
          >
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.phone}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="flex h-10 items-center gap-1.5 rounded-full border border-[#c5cde0] px-4 text-[14px] font-medium text-[#1a2744] hover:bg-[#f4f6fa]"
            disabled={busy !== null}
            onClick={() => void loadFromMeta()}
          >
            <RefreshCw className={cn("size-4", busy === "load" && "animate-spin")} />
            Atualizar
          </button>
          <button
            type="button"
            className={cn(
              "flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold",
              dirty
                ? "bg-[#031c45] text-white hover:bg-[#003878]"
                : "bg-[#e8edf4] text-[#8b95a8]",
            )}
            disabled={busy !== null || !dirty}
            onClick={() => void saveAndPublish()}
          >
            <Save className="size-4" /> Salvar e publicar
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_minmax(280px,380px)]">
        <section className="rounded-2xl border border-[#e2e7f0] bg-white px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-semibold text-[#1a2744]">
                Sugestões de mensagem
              </h2>
              <p className="mt-1 text-[13.5px] leading-snug text-[#5a6780]">
                Exibidas ao contato apenas na primeira conversa, quando ainda não
                há histórico.
                <br />
                No WhatsApp, as sugestões não são exibidas quando o contato inicia
                a conversa por um link wa.me com uma mensagem pré-preenchida.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-[#eef1f7] px-2.5 py-1 text-[12.5px] font-medium text-[#5a6780]">
              {rows.length} / {MAX}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {rows.map((r) => (
              <div
                key={r.id}
                draggable
                onDragStart={() => {
                  dragId.current = r.id;
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  const from = dragId.current;
                  if (!from || from === r.id) return;
                  setRows((list) => {
                    const a = list.findIndex((x) => x.id === from);
                    const b = list.findIndex((x) => x.id === r.id);
                    if (a < 0 || b < 0) return list;
                    const next = list.slice();
                    const [item] = next.splice(a, 1);
                    next.splice(b, 0, item);
                    return next;
                  });
                  dragId.current = null;
                }}
                className="flex items-center gap-2 rounded-2xl border border-[#d8dee6] bg-white px-3 py-2.5"
              >
                <GripVertical className="size-4 shrink-0 cursor-grab text-[#8b95a8]" />
                {editingId === r.id ? (
                  <input
                    autoFocus
                    className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
                    maxLength={MAX_LEN}
                    value={r.text}
                    onChange={(e) => setRow(r.id, e.target.value)}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setEditingId(null);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left text-[15px] text-[#1a2744]"
                    onClick={() => setEditingId(r.id)}
                  >
                    {r.text || "Nova sugestão"}
                  </button>
                )}
                <span className="shrink-0 text-[12.5px] text-[#8b95a8]">
                  {r.text.length}/{MAX_LEN}
                </span>
                <button
                  type="button"
                  className="text-[#8b95a8] hover:text-[#1a2744]"
                  onClick={() => setEditingId(r.id)}
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  className="text-[#e11d48] hover:text-red-700"
                  onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={rows.length >= MAX}
              className="flex h-12 w-full items-center justify-center gap-1 rounded-2xl border border-dashed border-[#d8dee6] text-[15px] text-[#8b95a8] hover:bg-[#f7f9fc] disabled:opacity-40"
              onClick={() =>
                setRows((rs) =>
                  rs.length >= MAX ? rs : [...rs, { id: uid("ice"), text: "" }],
                )
              }
            >
              <Plus className="size-4" /> Adicionar sugestão
            </button>
          </div>
          <p className="mt-3 text-[12.5px] text-[#8b95a8]">
            Até {MAX} sugestões · Máximo de {MAX_LEN} caracteres por sugestão ·
            Arraste para reordenar
          </p>
        </section>

        <section className="rounded-2xl border border-[#e2e7f0] bg-white px-5 py-5">
          <h2 className="text-[17px] font-semibold text-[#1a2744]">
            Pré-visualização
          </h2>
          <p className="mt-1 text-[13.5px] text-[#5a6780]">
            Como o contato vê ao iniciar a conversa pela primeira vez.
          </p>
          <div className="mx-auto mt-5 w-[260px] overflow-hidden rounded-[32px] border-8 border-[#1a1a1a] bg-[#ece5dd] shadow-xl">
            <div className="bg-[#075e54] px-3 py-2.5 text-white">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-white/20 text-[13px] font-bold">
                  NT
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold">
                    {displayName}
                  </div>
                  <div className="text-[11px] text-white/70">online</div>
                </div>
              </div>
            </div>
            <div className="flex min-h-[340px] flex-col items-end gap-2 px-3 py-4">
              <span className="self-center rounded-full bg-white/80 px-2 py-0.5 text-[10px] text-[#5a6780]">
                Hoje
              </span>
              {rows
                .filter((r) => r.text.trim())
                .map((r) => (
                  <div
                    key={r.id}
                    className="flex max-w-[92%] items-center gap-1 rounded-2xl rounded-br-sm bg-white px-3 py-2 text-[13px] text-[#111b21] shadow-sm"
                  >
                    <span>{r.text}</span>
                    <span className="text-[#075e54]">▸</span>
                  </div>
                ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
