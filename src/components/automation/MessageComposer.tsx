import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Image as ImageIcon,
  Layers,
  List,
  MessageSquare,
  Plus,
  Reply,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  SESSION_BLOCKS,
  inferMsgChannel,
  inferSessionBlock,
  parseCarouselCards,
  parseListSections,
  parseMsgStack,
  parseReplyButtons,
  serializeMsgStack,
  type CarouselCard,
  type ListSection,
  type MsgChannel,
  type ReplyBtn,
  type SessionBlock,
  type StackItem,
} from "@/lib/message-blocks";
import type { FlowNode } from "@/lib/types";
import { useCrmStore } from "@/lib/store";
import { cn, uid } from "@/lib/utils";

type Props = {
  selected: FlowNode;
  templates: { id: string; name: string; body: string; buttons: string[] }[];
  customFields: { id: string; name: string }[];
  setCfg: (patch: Record<string, string>) => void;
  updateNode: (id: string, patch: Partial<FlowNode>) => void;
};

type Step = "channel" | "session" | "edit";

let closeOpenVar: (() => void) | null = null;

export function VarInsert({
  fields,
  onPick,
}: {
  fields: { id: string; name: string }[];
  onPick: (token: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"sys" | "custom" | "global">("sys");
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const agents = useCrmStore((s) => s.agents);
  const system = [
    { id: "id", name: "ID" },
    { id: "name", name: "Nome" },
    { id: "firstName", name: "Primeiro nome" },
    { id: "email", name: "Email" },
    { id: "phone", name: "Número do contato" },
  ];
  const list = tab === "sys" ? system : tab === "custom" ? fields : [];

  function close() {
    setOpen(false);
    if (closeOpenVar === close) closeOpenVar = null;
  }

  function toggle() {
    if (open) {
      close();
      return;
    }
    closeOpenVar?.();
    const r = btnRef.current?.getBoundingClientRect();
    const width = 260;
    const height = 280;
    if (r) {
      const left = Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8));
      const openUp = r.bottom + height > window.innerHeight - 12;
      const top = openUp
        ? Math.max(8, r.top - height - 6)
        : r.bottom + 6;
      setPos({ top, left });
    }
    setOpen(true);
    closeOpenVar = close;
  }

  useLayoutEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest("[data-var-picker]") || t.closest("[data-var-btn]")) return;
      close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        data-var-btn
        className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#d5dae3] text-[13px] font-semibold text-[#5a6780] hover:bg-[#f4f6fa]"
        title="Inserir variável"
        onClick={toggle}
      >
        {"{ }"}
      </button>
      {open &&
        createPortal(
          <div
            data-var-picker
            data-menu
            className="fixed z-[240] w-[260px] overflow-hidden rounded-xl border border-[#e2e7f0] bg-white shadow-xl"
            style={{ top: pos.top, left: pos.left }}
          >
            <div className="flex border-b border-[#eceff4] text-[13px]">
              {(
                [
                  ["sys", "Sistema"],
                  ["custom", "Customizados"],
                  ["global", "Global"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={cn(
                    "flex-1 px-2 py-2",
                    tab === id
                      ? "border-b-2 border-[#0d5c3d] font-medium text-[#111]"
                      : "text-[#8b95a8]",
                  )}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="max-h-56 overflow-auto py-1">
              {list.length === 0 && tab !== "sys" && (
                <div className="px-3 py-4 text-[13px] text-[#8b95a8]">
                  Nenhuma variável
                </div>
              )}
              {list.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13.5px] hover:bg-[#f4f6fa]"
                  onClick={() => {
                    onPick(`{{${v.id}}}`);
                    close();
                  }}
                >
                  <Type className="size-3.5 text-[#8b95a8]" />
                  {v.name}
                </button>
              ))}
              {tab === "sys" && (
                <div>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13.5px] hover:bg-[#f4f6fa]"
                    onClick={() => setAgentsOpen((v) => !v)}
                  >
                    <ChevronRight
                      className={cn("size-3.5 text-[#8b95a8]", agentsOpen && "rotate-90")}
                    />
                    Atendentes
                  </button>
                  {agentsOpen &&
                    agents.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="flex w-full px-8 py-2 text-left text-[13px] hover:bg-[#f4f6fa]"
                        onClick={() => {
                          onPick(a.name);
                          close();
                        }}
                      >
                        {a.name}
                      </button>
                    ))}
                  {agentsOpen && (
                    <button
                      type="button"
                      className="flex w-full px-8 py-2 text-left text-[13px] text-[#5a6780] hover:bg-[#f4f6fa]"
                      onClick={() => {
                        onPick("{{atendente}}");
                        close();
                      }}
                    >
                      Atendente da conversa
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function Count({ n, max }: { n: number; max: number }) {
  return (
    <span className="text-[12.5px] tabular-nums text-[#8b95a8]">
      {n}/{max}
    </span>
  );
}

export function MessageComposer({
  selected,
  templates,
  customFields,
  setCfg,
  updateNode,
}: Props) {
  const cfg = selected.config ?? {};
  const channel = inferMsgChannel(selected.type, cfg);
  const block = inferSessionBlock(cfg);
  const [step, setStep] = useState<Step>(() => {
    if (!channel) return "channel";
    if (channel === "session" && !block) return "session";
    return "edit";
  });
  const [cardIdx, setCardIdx] = useState(0);

  const buttons = parseReplyButtons(cfg);
  const sections = parseListSections(cfg);
  const cards = parseCarouselCards(cfg);
  const stack = parseMsgStack(cfg);
  const safeCard = Math.min(cardIdx, Math.max(0, cards.length - 1));
  const [adding, setAdding] = useState(false);

  const pickChannel = (kind: MsgChannel) => {
    updateNode(selected.id, { label: "Envio de mensagem" });
    setCfg({ msgKind: kind });
    if (kind === "session") setStep("session");
    else setStep("edit");
  };

  const writeStack = (next: StackItem[]) => {
    setCfg(serializeMsgStack(next));
  };

  const pickBlock = (id: SessionBlock) => {
    const existing = parseMsgStack(cfg);
    const first: StackItem = existing[0]
      ? { ...existing[0], kind: id }
      : {
          id: uid(),
          kind: id,
          text: cfg.text || "",
          header: cfg.header,
          footer: cfg.footer,
          buttons: parseReplyButtons(cfg),
        };
    const rest = existing.slice(1);
    setCfg({
      ...serializeMsgStack([first, ...rest]),
      msgKind: "session",
      sessionBlock: id,
    });
    setStep("edit");
  };

  const setButtons = (next: ReplyBtn[]) => setCfg({ msgButtons: JSON.stringify(next) });
  const setSections = (next: ListSection[]) => setCfg({ listSections: JSON.stringify(next) });
  const setCards = (next: CarouselCard[]) => setCfg({ carouselCards: JSON.stringify(next) });

  const insertAt = (key: string, token: string) => {
    setCfg({ [key]: `${cfg[key] ?? ""}${token}` });
  };

  const addBtn = (type: "reply" | "link") => {
    if (type === "reply" && buttons.filter((b) => b.type === "reply").length >= 3) {
      toast.error("Máximo de 3 botões de resposta");
      return;
    }
    if (type === "link" && buttons.filter((b) => b.type === "link").length >= 2) {
      toast.error("Máximo de 2 botões de link");
      return;
    }
    setButtons([...buttons, { id: uid(), type, label: "", url: type === "link" ? "" : "" }]);
  };

  const canSave =
    channel === "template"
      ? Boolean(cfg.templateId)
      : channel === "flow"
        ? Boolean(cfg.flowId || cfg.text)
        : Boolean(cfg.text || cfg.mediaUrl || cfg.carouselCards || cfg.listSections);

  const header = (
    <div>
      <p className="tg-title">Envio de mensagem</p>
      <p className="tg-sub">
        Adicione mensagens simples, com botões e mídias, e se comunique com
        seus contatos de forma eficaz.
      </p>
    </div>
  );

  if (step === "channel") {
    return (
      <div className="space-y-3">
        {header}
        <OptionCard
          icon={<MessageSquare className="size-5 text-[#128C7E]" />}
          title="Mensagem - Janela de 24 horas"
          hint="Você pode enviar mensagens para contatos que possuem uma janela aberta com você, incluindo botões interativos, botões com links, mensagens de texto, fotos, vídeos e arquivos."
          on={channel === "session"}
          onClick={() => pickChannel("session")}
        />
        <OptionCard
          icon={<MessageSquare className="size-5 text-[#1a2744]" />}
          title="Flow - Janela de 24 horas"
          hint="Você pode enviar um flow interativo do WhatsApp. No entanto, nem todas as contas do WhatsApp têm permissão para criar flows. Verifique a elegibilidade primeiro no painel da Meta"
          on={channel === "flow"}
          tint
          onClick={() => pickChannel("flow")}
        />
        <OptionCard
          icon={<ExternalLink className="size-5 text-[#1a2744]" />}
          title="Template - Fora da janela de 24 horas"
          hint="Envie um template aprovado pela Meta quando a janela de 24 horas estiver fechada."
          on={channel === "template"}
          onClick={() => pickChannel("template")}
        />
      </div>
    );
  }

  if (step === "session") {
    return (
      <div className="space-y-3">
        {header}
        <button type="button" className="tg-back text-[#0050a0]" onClick={() => setStep("channel")}>
          ← Voltar
        </button>
        <p className="text-[15.5px] font-semibold text-[#1a2744]">Escolha o primeiro bloco:</p>
        {SESSION_BLOCKS.map((item) => (
          <OptionCard
            key={item.id}
            icon={<BlockIcon name={item.icon} />}
            title={item.label}
            hint={item.hint}
            on={block === item.id}
            onClick={() => pickBlock(item.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {header}
      <button
        type="button"
        className="tg-back text-[#0050a0]"
        onClick={() => setStep(channel === "session" ? "session" : "channel")}
      >
        ← Voltar
      </button>

      {channel === "template" && (
        <>
          <select
            className="h-12 w-full rounded-full border border-[#d5dae3] bg-white px-4 text-[15px]"
            value={cfg.templateId ?? ""}
            onChange={(e) => {
              const t = templates.find((x) => x.id === e.target.value);
              setCfg({
                msgKind: "template",
                templateId: e.target.value,
                text: t?.body ?? "",
              });
            }}
          >
            <option value="">Template *</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <SaveBar disabled={!cfg.templateId} onClick={() => toast.success("Mensagem salva")} />
        </>
      )}

      {channel === "flow" && (
        <>
          <Input
            value={cfg.flowId ?? ""}
            onChange={(e) => setCfg({ flowId: e.target.value })}
            placeholder="Flow"
            className="h-12 rounded-full"
          />
          <div className="overflow-hidden rounded-2xl border border-[#d5dae3] bg-white">
            <FieldLine
              value={cfg.header ?? ""}
              max={60}
              placeholder="Texto do cabeçalho"
              fields={customFields}
              onChange={(v) => setCfg({ header: v })}
            />
            <TextArea
              value={cfg.text ?? ""}
              max={4096}
              placeholder="Insira o seu texto.."
              onChange={(v) => setCfg({ text: v })}
              fields={customFields}
            />
            <FieldLine
              value={cfg.footer ?? ""}
              max={60}
              placeholder="Texto do rodapé"
              fields={customFields}
              onChange={(v) => setCfg({ footer: v })}
            />
            <FieldLine
              value={cfg.button ?? ""}
              max={30}
              placeholder="Texto do botão"
              fields={customFields}
              onChange={(v) => setCfg({ button: v })}
            />
          </div>
          <SaveBar disabled={!canSave} onClick={() => toast.success("Flow salvo")} />
        </>
      )}

      {channel === "session" && (
        <StackEditor
          items={stack}
          fields={customFields}
          adding={adding}
          onAdding={setAdding}
          onChange={writeStack}
        />
      )}
    </div>
  );
}

function StackEditor({
  items,
  fields,
  adding,
  onAdding,
  onChange,
}: {
  items: StackItem[];
  fields: { id: string; name: string }[];
  adding: boolean;
  onAdding: (v: boolean) => void;
  onChange: (next: StackItem[]) => void;
}) {
  const patch = (id: string, p: Partial<StackItem>) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...p } : it)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    const [row] = next.splice(i, 1);
    next.splice(j, 0, row!);
    onChange(next);
  };
  const add = (kind: SessionBlock) => {
    const extra: Partial<StackItem> =
      kind === "list"
        ? { listSections: [{ id: uid(), title: "", rows: [{ id: uid(), title: "" }] }] }
        : kind === "carousel"
          ? { carouselCards: [{ id: uid(), mediaUrl: "", body: "", buttons: [] }] }
          : {};
    onChange([...items, { id: uid(), kind, text: "", buttons: [], ...extra }]);
    onAdding(false);
  };

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={item.id} className="space-y-2">
          {items.length > 1 && (
          <div className="flex items-center justify-end gap-3 text-[#8b95a8]">
            <span className="mr-auto text-[12.5px] font-medium uppercase tracking-wide">
              {SESSION_BLOCKS.find((b) => b.id === item.kind)?.label ?? "Mensagem"}
            </span>
            <button type="button" title="Mover para cima" disabled={i === 0} onClick={() => move(i, -1)}>
              <ChevronDown className="size-4 rotate-180" />
            </button>
            <button
              type="button"
              title="Mover para baixo"
              disabled={i === items.length - 1}
              onClick={() => move(i, 1)}
            >
              <ChevronDown className="size-4" />
            </button>
            <button
              type="button"
              className="text-red-500"
              title="Remover"
              onClick={() => onChange(items.filter((x) => x.id !== item.id))}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
          )}

          {item.kind === "text" && (
            <TextBlock
              cfg={{ text: item.text ?? "" }}
              buttons={item.buttons ?? []}
              fields={fields}
              setCfg={(p) => patch(item.id, { text: p.text ?? item.text })}
              addBtn={(t) => {
                const buttons = item.buttons ?? [];
                if (t === "reply" && buttons.filter((b) => b.type === "reply").length >= 3) {
                  toast.error("Máximo de 3 botões de resposta");
                  return;
                }
                if (t === "link" && buttons.filter((b) => b.type === "link").length >= 2) {
                  toast.error("Máximo de 2 botões de link");
                  return;
                }
                patch(item.id, {
                  buttons: [
                    ...buttons,
                    { id: uid(), type: t, label: "", url: "" },
                  ],
                });
              }}
              setButtons={(b) => patch(item.id, { buttons: b })}
            />
          )}
          {item.kind === "media" && (
            <MediaBlock
              cfg={{ mediaUrl: item.mediaUrl ?? "", mediaName: item.mediaName ?? "" }}
              setCfg={(p) =>
                patch(item.id, {
                  mediaUrl: p.mediaUrl ?? item.mediaUrl,
                  mediaName: p.mediaName ?? item.mediaName,
                })
              }
            />
          )}
          {item.kind === "list" && (
            <ListBlock
              cfg={{
                header: item.header ?? "",
                text: item.text ?? "",
                footer: item.footer ?? "",
                listButton: item.listButton ?? "",
              }}
              sections={
                item.listSections?.length
                  ? item.listSections
                  : [{ id: "s1", title: "", rows: [{ id: "r1", title: "" }] }]
              }
              fields={fields}
              setCfg={(p) =>
                patch(item.id, {
                  header: p.header ?? item.header,
                  text: p.text ?? item.text,
                  footer: p.footer ?? item.footer,
                  listButton: p.listButton ?? item.listButton,
                })
              }
              setSections={(s) => patch(item.id, { listSections: s })}
            />
          )}
          {item.kind === "context" && (
            <ContextBlock
              cfg={{ text: item.text ?? "", contextFieldId: item.contextFieldId ?? "" }}
              fields={fields}
              setCfg={(p) =>
                patch(item.id, {
                  text: p.text ?? item.text,
                  contextFieldId: p.contextFieldId ?? item.contextFieldId,
                })
              }
            />
          )}
          {item.kind === "carousel" && (
            <CarouselItemEditor item={item} fields={fields} onChange={(p) => patch(item.id, p)} />
          )}
        </div>
      ))}

      {adding ? (
        <div className="space-y-2 border-t border-[#eceff4] pt-4">
          <p className="text-[15.5px] font-semibold">Adicione mais blocos:</p>
          {SESSION_BLOCKS.map((b) => (
            <OptionCard
              key={b.id}
              icon={<BlockIcon name={b.icon} />}
              title={b.label}
              hint={b.hint}
              onClick={() => add(b.id)}
            />
          ))}
          <button type="button" className="tg-back text-[#0050a0]" onClick={() => onAdding(false)}>
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="w-full border-t border-[#eceff4] pt-4 text-left text-[15.5px] font-semibold text-[#1a2744]"
          onClick={() => onAdding(true)}
        >
          Adicione mais blocos:
        </button>
      )}
    </div>
  );
}

function CarouselItemEditor({
  item,
  fields,
  onChange,
}: {
  item: StackItem;
  fields: { id: string; name: string }[];
  onChange: (p: Partial<StackItem>) => void;
}) {
  const [index, setIndex] = useState(0);
  const cards =
    item.carouselCards?.length
      ? item.carouselCards
      : [{ id: "c1", mediaUrl: "", body: "", buttons: [] }];
  return (
    <CarouselBlock
      cfg={{ carouselBody: item.text ?? "", text: item.text ?? "" }}
      cards={cards}
      index={Math.min(index, Math.max(0, cards.length - 1))}
      fields={fields}
      setCfg={(p) => onChange({ text: p.carouselBody ?? p.text ?? item.text })}
      setCards={(c) => onChange({ carouselCards: c })}
      setIndex={setIndex}
    />
  );
}

function OptionCard({
  icon,
  title,
  hint,
  on,
  tint,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  on?: boolean;
  tint?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border px-4 py-3.5 text-left transition-colors",
        on
          ? "border-[#c47a3a] bg-[#faf4ec] shadow-[0_1px_4px_rgb(196_122_58/0.12)]"
          : tint
            ? "border-[#d7eee4] bg-[#f3faf6]"
            : "border-[#e2e7f0] bg-white hover:border-[#c5cde0]",
      )}
    >
      <div className="mb-1.5">{icon}</div>
      <span className="tg-card-title">{title}</span>
      <span className="tg-card-hint">{hint}</span>
    </button>
  );
}

function BlockIcon({ name }: { name: string }) {
  const cls = "size-5 text-[#1a2744]";
  if (name === "media") return <ImageIcon className={cls} />;
  if (name === "list") return <List className={cls} />;
  if (name === "context") return <MessageSquare className={cls} />;
  if (name === "carousel") return <Layers className={cls} />;
  return <Type className={cls} />;
}

function TextArea({
  value,
  max,
  placeholder,
  onChange,
  fields,
  minH = "88px",
}: {
  value: string;
  max: number;
  placeholder: string;
  onChange: (v: string) => void;
  fields: { id: string; name: string }[];
  minH?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    const min = Number.parseInt(minH, 10) || 88;
    el.style.height = `${Math.max(el.scrollHeight, min)}px`;
  }, [value, minH]);
  return (
    <div className="relative">
      <textarea
        ref={ref}
        rows={1}
        className="w-full resize-none overflow-hidden border-0 bg-transparent px-3.5 pt-3 pb-10 text-[15px] leading-[1.45] outline-none placeholder:text-[#9aa3b2]"
        style={{ minHeight: minH }}
        maxLength={max}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.slice(0, max))}
      />
      <div className="absolute right-2 bottom-2 flex items-center gap-2">
        <Count n={value.length} max={max} />
        <VarInsert fields={fields} onPick={(t) => onChange(value + t)} />
      </div>
    </div>
  );
}

function FieldLine({
  value,
  max,
  placeholder,
  onChange,
  fields,
}: {
  value: string;
  max: number;
  placeholder: string;
  onChange: (v: string) => void;
  fields?: { id: string; name: string }[];
}) {
  return (
    <div className="flex items-center gap-2 border-t border-[#e8ecef] px-3.5 py-2.5">
      <input
        className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#9aa3b2]"
        maxLength={max}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.slice(0, max))}
      />
      <Count n={value.length} max={max} />
      {fields && (
        <VarInsert fields={fields} onPick={(t) => onChange((value + t).slice(0, max))} />
      )}
    </div>
  );
}

function TextBlock({
  cfg,
  buttons,
  fields,
  setCfg,
  addBtn,
  setButtons,
}: {
  cfg: Record<string, string>;
  buttons: ReplyBtn[];
  fields: { id: string; name: string }[];
  setCfg: (p: Record<string, string>) => void;
  addBtn: (t: "reply" | "link") => void;
  setButtons: (b: ReplyBtn[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-2xl border border-[#d5dae3] bg-white">
        <TextArea
          value={cfg.text ?? ""}
          max={1024}
          placeholder="Insira o seu texto.."
          onChange={(v) => setCfg({ text: v })}
          fields={fields}
        />
      </div>
      {buttons.map((b) =>
        b.type === "link" ? (
          <div key={b.id} className="space-y-2">
            <div className="flex items-center gap-2 rounded-2xl border border-[#d5dae3] bg-white px-3.5 py-2.5">
              <input
                className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#9aa3b2]"
                maxLength={20}
                value={b.label}
                placeholder="Texto do botão"
                onChange={(e) =>
                  setButtons(buttons.map((x) => (x.id === b.id ? { ...x, label: e.target.value } : x)))
                }
              />
              <Count n={b.label.length} max={20} />
            </div>
            <div className="flex min-h-[72px] items-end gap-2 rounded-2xl border border-[#d5dae3] bg-white px-3.5 py-2.5">
              <input
                className="min-w-0 flex-1 self-start bg-transparent pt-1 text-[15px] outline-none placeholder:text-[#9aa3b2]"
                value={b.url ?? ""}
                placeholder="Digite o URL"
                onChange={(e) =>
                  setButtons(buttons.map((x) => (x.id === b.id ? { ...x, url: e.target.value } : x)))
                }
              />
              <VarInsert
                fields={fields}
                onPick={(token) =>
                  setButtons(
                    buttons.map((x) =>
                      x.id === b.id ? { ...x, url: `${x.url || ""}${token}` } : x,
                    ),
                  )
                }
              />
              <button
                type="button"
                className="mb-0.5 text-[#111] hover:text-red-500"
                onClick={() => setButtons(buttons.filter((x) => x.id !== b.id))}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <div
            key={b.id}
            className="flex items-center gap-2 rounded-2xl border border-[#d5dae3] bg-white px-3.5 py-2.5"
          >
            <input
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#9aa3b2]"
              maxLength={20}
              value={b.label}
              placeholder="Texto do botão"
              onChange={(e) =>
                setButtons(buttons.map((x) => (x.id === b.id ? { ...x, label: e.target.value } : x)))
              }
            />
            <Count n={b.label.length} max={20} />
            <button
              type="button"
              className="text-[#8b95a8] hover:text-red-500"
              onClick={() => setButtons(buttons.filter((x) => x.id !== b.id))}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ),
      )}
      <button
        type="button"
        className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#d5dae3] text-[15px] font-medium"
        onClick={() => addBtn("reply")}
      >
        <Reply className="size-4" /> Adicionar botão de resposta
      </button>
      <button
        type="button"
        className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#d5dae3] text-[15px] font-medium"
        onClick={() => addBtn("link")}
      >
        <ExternalLink className="size-4" /> Adicionar botão de link
      </button>
    </div>
  );
}

function MediaBlock({
  cfg,
  setCfg,
}: {
  cfg: Record<string, string>;
  setCfg: (p: Record<string, string>) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-[#d5dae3] bg-white px-4 py-6 text-center">
        <Upload className="size-6 text-[#8b95a8]" />
        <span className="text-[15.5px]">
          <span className="font-semibold text-[#0050a0]">Enviar mídia</span>
          <span className="text-[#5a6780]"> ou </span>
          <span className="font-semibold text-[#0050a0]">inserir URL</span>
        </span>
        <input
          type="file"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => setCfg({ mediaUrl: String(reader.result ?? ""), mediaName: file.name });
            reader.readAsDataURL(file);
          }}
        />
      </label>
      <Input
        value={cfg.mediaUrl?.startsWith("data:") ? "" : (cfg.mediaUrl ?? "")}
        placeholder="https://…"
        onChange={(e) => setCfg({ mediaUrl: e.target.value })}
      />
      {cfg.mediaName ? <p className="text-[13px] text-[#5a6780]">{cfg.mediaName}</p> : null}
    </div>
  );
}

function ListBlock({
  cfg,
  sections,
  fields,
  setCfg,
  setSections,
}: {
  cfg: Record<string, string>;
  sections: ListSection[];
  fields: { id: string; name: string }[];
  setCfg: (p: Record<string, string>) => void;
  setSections: (s: ListSection[]) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-[#d5dae3] bg-white">
        <FieldLine value={cfg.header ?? ""} max={60} placeholder="Texto do cabeçalho" fields={fields} onChange={(v) => setCfg({ header: v })} />
        <TextArea value={cfg.text ?? ""} max={4096} placeholder="Insira o seu texto.." onChange={(v) => setCfg({ text: v })} fields={fields} />
        <FieldLine value={cfg.footer ?? ""} max={60} placeholder="Texto do rodapé" fields={fields} onChange={(v) => setCfg({ footer: v })} />
        <FieldLine value={cfg.listButton ?? ""} max={20} placeholder="Texto do botão" fields={fields} onChange={(v) => setCfg({ listButton: v })} />
      </div>
      <button type="button" className="flex items-center gap-2 text-[16px] font-bold" onClick={() => setOpen((v) => !v)}>
        Seções {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
      </button>
      {open && (
        <div className="space-y-2 rounded-2xl border border-[#d5dae3] bg-white p-2">
          {sections.map((sec, si) => (
            <div key={sec.id} className="overflow-hidden rounded-xl border border-[#e2e7f0]">
              <div className="flex items-center gap-2 px-3 py-2">
                <input
                  className="min-w-0 flex-1 text-[15px] outline-none"
                  maxLength={24}
                  value={sec.title}
                  placeholder="Título da seção"
                  onChange={(e) =>
                    setSections(sections.map((s) => (s.id === sec.id ? { ...s, title: e.target.value } : s)))
                  }
                />
                <Count n={sec.title.length} max={24} />
                <button
                  type="button"
                  className="text-red-500"
                  onClick={() => setSections(sections.filter((s) => s.id !== sec.id))}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              {sec.rows.map((row) => (
                <div key={row.id} className="flex items-center gap-2 border-t border-[#e8ecef] px-3 py-2">
                  <input
                    className="min-w-0 flex-1 text-[15px] outline-none"
                    maxLength={24}
                    value={row.title}
                    placeholder="Digite o texto do botão"
                    onChange={(e) =>
                      setSections(
                        sections.map((s) =>
                          s.id === sec.id
                            ? { ...s, rows: s.rows.map((r) => (r.id === row.id ? { ...r, title: e.target.value } : r)) }
                            : s,
                        ),
                      )
                    }
                  />
                  <Count n={row.title.length} max={24} />
                  <button
                    type="button"
                    className="text-[#8b95a8]"
                    onClick={() =>
                      setSections(
                        sections.map((s) =>
                          s.id === sec.id ? { ...s, rows: s.rows.filter((r) => r.id !== row.id) } : s,
                        ),
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="flex h-10 w-full items-center justify-center gap-2 border-t border-[#e8ecef] text-[14.5px] font-medium"
                onClick={() =>
                  setSections(
                    sections.map((s) =>
                      s.id === sec.id ? { ...s, rows: [...s.rows, { id: uid(), title: "" }] } : s,
                    ),
                  )
                }
              >
                <Reply className="size-4" /> Adicionar Botão
              </button>
            </div>
          ))}
          <button
            type="button"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#d5dae3] text-[15px] font-medium"
            onClick={() =>
              setSections([...sections, { id: uid(), title: "", rows: [{ id: uid(), title: "" }] }])
            }
          >
            <Plus className="size-4" /> Adicionar seção
          </button>
        </div>
      )}
    </div>
  );
}

function ContextBlock({
  cfg,
  fields,
  setCfg,
}: {
  cfg: Record<string, string>;
  fields: { id: string; name: string }[];
  setCfg: (p: Record<string, string>) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-2xl border border-[#d5dae3] bg-white">
        <TextArea
          value={cfg.text ?? ""}
          max={4096}
          placeholder="Insira o seu texto.."
          onChange={(v) => setCfg({ text: v })}
          fields={fields}
        />
      </div>
      <select
        className="h-12 w-full rounded-full border border-[#d5dae3] bg-white px-4 text-[15px]"
        value={cfg.contextFieldId ?? ""}
        onChange={(e) => setCfg({ contextFieldId: e.target.value })}
      >
        <option value="">Escolha o campo *</option>
        {fields.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
      <p className="text-[14.5px] text-[#1a2744]">
        O prazo para a resposta do usuário é de: <b>2 Minutos</b>
      </p>
    </div>
  );
}

function CarouselBlock({
  cfg,
  cards,
  index,
  fields,
  setCfg,
  setCards,
  setIndex,
}: {
  cfg: Record<string, string>;
  cards: CarouselCard[];
  index: number;
  fields: { id: string; name: string }[];
  setCfg: (p: Record<string, string>) => void;
  setCards: (c: CarouselCard[]) => void;
  setIndex: (i: number) => void;
}) {
  const card = cards[index] ?? cards[0]!;
  const update = (patch: Partial<CarouselCard>) =>
    setCards(cards.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  return (
    <div className="space-y-3">
      <p className="text-[15px] font-semibold">Texto do corpo</p>
      <div className="overflow-hidden rounded-2xl border border-[#d5dae3] bg-white">
        <TextArea
          value={cfg.carouselBody ?? cfg.text ?? ""}
          max={1024}
          placeholder="Digite algo"
          minH="80px"
          onChange={(v) => setCfg({ carouselBody: v, text: v })}
          fields={fields}
        />
      </div>
      <div className="rounded-2xl border border-[#d5dae3] bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[15px] font-medium">
            <button type="button" disabled={index <= 0} onClick={() => setIndex(index - 1)}>
              <ChevronLeft className="size-4" />
            </button>
            {index + 1}/{cards.length}
            <button
              type="button"
              disabled={index >= cards.length - 1}
              onClick={() => setIndex(index + 1)}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setCards([...cards, { id: uid(), mediaUrl: "", body: "", buttons: [] }]);
              setIndex(cards.length);
            }}
          >
            <Plus className="size-5" />
          </button>
        </div>
        <label className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#c5cde0] text-[#8b95a8]">
          <ImageIcon className="size-8" />
          <span>Clique para enviar uma mídia</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => update({ mediaUrl: String(reader.result ?? "") });
              reader.readAsDataURL(file);
            }}
          />
        </label>
        {card.mediaUrl ? (
          <img src={card.mediaUrl} alt="" className="mt-2 max-h-32 rounded-lg object-cover" />
        ) : null}
        <div className="relative mt-2">
          <textarea
            className="min-h-[72px] w-full rounded-xl border border-[#e2e7f0] px-3 py-2 text-[15px] outline-none"
            maxLength={160}
            placeholder="carousel-card-body"
            value={card.body}
            onChange={(e) => update({ body: e.target.value.slice(0, 160) })}
          />
          <div className="absolute right-2 bottom-2">
            <Count n={card.body.length} max={160} />
          </div>
        </div>
        {card.buttons.map((b) => (
          <div key={b.id} className="mt-2 flex items-center gap-2 rounded-xl border px-3 py-2">
            <input
              className="min-w-0 flex-1 text-[14.5px] outline-none"
              value={b.label}
              placeholder="Botão"
              onChange={(e) =>
                update({
                  buttons: card.buttons.map((x) => (x.id === b.id ? { ...x, label: e.target.value } : x)),
                })
              }
            />
            <button
              type="button"
              className="text-red-500"
              onClick={() => update({ buttons: card.buttons.filter((x) => x.id !== b.id) })}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-[14.5px]"
          onClick={() =>
            update({ buttons: [...card.buttons, { id: uid(), type: "reply", label: "" }] })
          }
        >
          <Reply className="size-4" /> Adicionar botão de resposta
        </button>
        <button
          type="button"
          className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-[14.5px]"
          onClick={() =>
            update({ buttons: [...card.buttons, { id: uid(), type: "link", label: "", url: "https://" }] })
          }
        >
          <ExternalLink className="size-4" /> Adicionar botão de link
        </button>
      </div>
    </div>
  );
}

function SaveBar({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "mt-2 flex h-12 w-full items-center justify-center rounded-full text-[16px] font-semibold",
        disabled
          ? "bg-[#e8ecef] text-[#9aa3b2]"
          : "bg-[#003878] text-white hover:bg-[#002860]",
      )}
    >
      Salvar
    </button>
  );
}
