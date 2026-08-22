import {
  ArrowDown,
  ArrowUp,
  Clock,
  Copy,
  GitBranch,
  Globe,
  HelpCircle,
  Kanban,
  MessageSquare,
  Pencil,
  Plus,
  Sheet,
  Tag,
  TimerOff,
  User,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  CONDITION_KINDS,
  parseConditionGroups,
  type CondKind,
  type ConditionGroup,
  type ConditionItem,
} from "@/lib/automation-engine";
import type { FlowNode } from "@/lib/types";
import { cn, uid } from "@/lib/utils";

function KindIcon({ name }: { name: string }) {
  const cls = "size-5 text-[#1a2744]";
  if (name === "tag") return <Tag className={cls} />;
  if (name === "user") return <User className={cls} />;
  if (name === "globe") return <Globe className={cls} />;
  if (name === "clock") return <Clock className={cls} />;
  if (name === "chat") return <MessageSquare className={cls} />;
  if (name === "users") return <Users className={cls} />;
  if (name === "kanban") return <Kanban className={cls} />;
  if (name === "timer") return <TimerOff className={cls} />;
  if (name === "sheets") return <Sheet className={cls} />;
  return <GitBranch className={cls} />;
}

const OPS = [
  { id: "eq", name: "é igual a" },
  { id: "neq", name: "é diferente de" },
  { id: "contains", name: "contém" },
  { id: "not_contains", name: "não contém" },
  { id: "exists", name: "está preenchido" },
  { id: "not_exists", name: "está vazio" },
];

function defaultItem(kind: CondKind): ConditionItem {
  if (kind === "tag") return { id: uid("c"), kind, field: "tag", op: "eq", value: "" };
  if (kind === "contact") return { id: uid("c"), kind, field: "name", op: "eq", value: "" };
  if (kind === "global") return { id: uid("c"), kind, field: "", op: "eq", value: "" };
  if (kind === "hours")
    return {
      id: uid("c"),
      kind,
      field: "in",
      op: "in",
      value: JSON.stringify({ days: [1, 2, 3, 4, 5], from: "08:00", to: "18:00" }),
    };
  if (kind === "window") return { id: uid("c"), kind, field: "window", op: "eq", value: "open" };
  if (kind === "agent") return { id: uid("c"), kind, field: "agent", op: "eq", value: "*" };
  if (kind === "pipeline") return { id: uid("c"), kind, field: "pipeline", op: "eq", value: "*" };
  if (kind === "noreply") return { id: uid("c"), kind, field: "noreply", op: "gte", value: "24" };
  return { id: uid("c"), kind, field: "sheets", op: "eq", value: "" };
}

export function ConditionConfig({
  selected,
  setCfg,
  tags,
  customFields,
  agents,
  stages,
}: {
  selected: FlowNode;
  setCfg: (patch: Record<string, string>) => void;
  tags: { id: string; name: string }[];
  customFields: { id: string; name: string }[];
  agents: { id: string; name: string }[];
  stages: { id: string; name: string }[];
}) {
  const groups = parseConditionGroups(selected.config);
  const [hint, setHint] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [pickingFor, setPickingFor] = useState<string | null>(null);

  function write(next: ConditionGroup[]) {
    setCfg({ conditionGroups: JSON.stringify(next) });
  }

  function addKind(kind: CondKind) {
    if (!pickingFor) return;
    write(
      groups.map((x) =>
        x.id !== pickingFor
          ? x
          : { ...x, items: [...x.items, defaultItem(kind)] },
      ),
    );
    setPickingFor(null);
  }

  if (pickingFor) {
    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#e8f0fb] text-[#1a4f8b]">
              <GitBranch className="size-4" />
            </span>
            <h3 className="text-[20px] font-bold text-[#1a2744]">Condicional</h3>
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
          Defina regras para direcionar o contato no fluxo com base em critérios
          específicos.
        </p>
        <button
          type="button"
          className="text-[14px] font-medium text-[#0050a0]"
          onClick={() => setPickingFor(null)}
        >
          ← Voltar
        </button>
        <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
          {CONDITION_KINDS.map((k) => (
            <button
              key={k.kind}
              type="button"
              className="relative w-full rounded-2xl border border-[#e2e7f0] bg-white px-4 py-3.5 text-left hover:border-[#0050a0] hover:bg-[#f6f9ff]"
              onClick={() => addKind(k.kind)}
            >
              {k.beta && (
                <span className="absolute top-2 right-3 text-[10px] font-bold tracking-wide text-[#c45c2a]">
                  BETA
                </span>
              )}
              <div className="flex items-start gap-3">
                <KindIcon name={k.icon} />
                <div>
                  <div className="text-[15.5px] font-semibold text-[#1a2744]">
                    {k.label}
                  </div>
                  <p className="mt-1 text-[13.5px] leading-snug text-[#5a6780]">
                    {k.hint}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="flex h-11 w-full items-center justify-center rounded-full bg-[#031c45] text-[15px] font-semibold text-white hover:bg-[#003878]"
          onClick={() => setPickingFor(null)}
        >
          Início
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[#e8f0fb] text-[#1a4f8b]">
            <GitBranch className="size-4" />
          </span>
          <h3 className="text-[20px] font-bold text-[#1a2744]">Condicional</h3>
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
        Defina regras para direcionar o contato no fluxo com base em critérios
        específicos.
      </p>
      {hint && (
        <p className="rounded-xl bg-[#f4f6fa] px-3 py-2 text-[12.5px] leading-snug text-[#5a6780]">
          Ligue <b>Atende</b> e <b>Não atende</b> nos próximos blocos. E exige
          todas as condições do grupo; OU exige qualquer uma.
        </p>
      )}

      {groups.map((g, gi) => (
        <div
          key={g.id}
          className="rounded-2xl border border-[#e2e7f0] bg-white p-3 shadow-sm"
        >
          <div className="mb-2 flex items-center gap-1.5 border-b border-[#eef1f4] pb-2">
            {renameId === g.id ? (
              <input
                className="h-8 min-w-0 flex-1 rounded-lg border border-[#c5cde0] px-2 text-[13.5px]"
                value={g.name}
                autoFocus
                onChange={(e) =>
                  write(
                    groups.map((x) =>
                      x.id === g.id ? { ...x, name: e.target.value } : x,
                    ),
                  )
                }
                onBlur={() => setRenameId(null)}
              />
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-1.5 text-[14.5px] font-semibold text-[#1a2744]">
                {g.name}
                <button
                  type="button"
                  className="text-[#8b95a8] hover:text-[#1a2744]"
                  onClick={() => setRenameId(g.id)}
                >
                  <Pencil className="size-3.5" />
                </button>
              </div>
            )}
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-md text-[#8b95a8] hover:bg-[#f4f6fa]"
              title="Duplicar grupo"
              onClick={() =>
                write([
                  ...groups.slice(0, gi + 1),
                  {
                    ...g,
                    id: uid("g"),
                    name: `${g.name} (cópia)`,
                    items: g.items.map((it) => ({ ...it, id: uid("c") })),
                  },
                  ...groups.slice(gi + 1),
                ])
              }
            >
              <Copy className="size-3.5" />
            </button>
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-md text-[#8b95a8] hover:bg-[#f4f6fa] disabled:opacity-30"
              disabled={gi === 0}
              onClick={() => {
                const next = [...groups];
                [next[gi - 1], next[gi]] = [next[gi]!, next[gi - 1]!];
                write(next);
              }}
            >
              <ArrowUp className="size-3.5" />
            </button>
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-md text-[#8b95a8] hover:bg-[#f4f6fa] disabled:opacity-30"
              disabled={gi === groups.length - 1}
              onClick={() => {
                const next = [...groups];
                [next[gi + 1], next[gi]] = [next[gi]!, next[gi + 1]!];
                write(next);
              }}
            >
              <ArrowDown className="size-3.5" />
            </button>
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-md text-[#8b95a8] hover:bg-red-50 hover:text-red-600"
              onClick={() => write(groups.filter((x) => x.id !== g.id))}
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[13.5px] leading-snug text-[#5a6780]">
              O contato corresponde a{" "}
              {g.join === "or" ? "qualquer uma" : "todas"} das condições?
            </p>
            <div className="flex shrink-0 rounded-full bg-[#eef1f4] p-0.5">
              <button
                type="button"
                className={cn(
                  "h-8 min-w-[40px] rounded-full px-3 text-[13px] font-semibold",
                  g.join === "and" ? "bg-[#0050a0] text-white" : "text-[#5a6780]",
                )}
                onClick={() =>
                  write(groups.map((x) => (x.id === g.id ? { ...x, join: "and" } : x)))
                }
              >
                E
              </button>
              <button
                type="button"
                className={cn(
                  "h-8 min-w-[44px] rounded-full px-3 text-[13px] font-semibold",
                  g.join === "or" ? "bg-[#0050a0] text-white" : "text-[#5a6780]",
                )}
                onClick={() =>
                  write(groups.map((x) => (x.id === g.id ? { ...x, join: "or" } : x)))
                }
              >
                OU
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {g.items.map((it) => (
              <ItemRow
                key={it.id}
                item={it}
                tags={tags}
                customFields={customFields}
                agents={agents}
                stages={stages}
                onChange={(next) =>
                  write(
                    groups.map((x) =>
                      x.id !== g.id
                        ? x
                        : {
                            ...x,
                            items: x.items.map((c) => (c.id === it.id ? next : c)),
                          },
                    ),
                  )
                }
                onRemove={() =>
                  write(
                    groups.map((x) =>
                      x.id !== g.id
                        ? x
                        : { ...x, items: x.items.filter((c) => c.id !== it.id) },
                    ),
                  )
                }
              />
            ))}
          </div>

          <button
            type="button"
            className="mt-3 flex h-10 w-full items-center justify-center gap-1 rounded-full border border-[#031c45] text-[14px] font-medium text-[#031c45] hover:bg-[#f4f6fa]"
            onClick={() => setPickingFor(g.id)}
          >
            <Plus className="size-4" /> Adicionar condição
          </button>
        </div>
      ))}

      <button
        type="button"
        className="flex h-11 w-full items-center justify-center gap-1 rounded-full border border-[#031c45] text-[15px] font-medium text-[#031c45] hover:bg-[#f4f6fa]"
        onClick={() =>
          write([
            ...groups,
            { id: uid("g"), name: "Grupo de condições", join: "or", items: [] },
          ])
        }
      >
        <Plus className="size-4" /> Grupo de condições
      </button>
      <button
        type="button"
        className="flex h-11 w-full items-center justify-center rounded-full bg-[#031c45] text-[15px] font-semibold text-white hover:bg-[#003878]"
        onClick={() => toast.success("Condicional salvo")}
      >
        Salvar
      </button>
    </div>
  );
}

function ItemRow({
  item,
  tags,
  customFields,
  agents,
  stages,
  onChange,
  onRemove,
}: {
  item: ConditionItem;
  tags: { id: string; name: string }[];
  customFields: { id: string; name: string }[];
  agents: { id: string; name: string }[];
  stages: { id: string; name: string }[];
  onChange: (next: ConditionItem) => void;
  onRemove: () => void;
}) {
  const kind = item.kind || "tag";
  const kindMeta = CONDITION_KINDS.find((k) => k.kind === kind);
  const hours =
    kind === "hours"
      ? (() => {
          try {
            return JSON.parse(item.value) as {
              days?: number[];
              from?: string;
              to?: string;
            };
          } catch {
            return { days: [1, 2, 3, 4, 5], from: "08:00", to: "18:00" };
          }
        })()
      : null;

  return (
    <div className="rounded-xl border border-[#eef1f4] bg-[#f8fafc] p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-semibold text-[#1a2744]">
          {kindMeta?.label ?? kind}
        </span>
        <button
          type="button"
          className="flex size-7 items-center justify-center rounded-lg text-[#8b95a8] hover:text-red-600"
          onClick={onRemove}
        >
          <X className="size-3.5" />
        </button>
      </div>

      {kind === "tag" && (
        <div className="grid grid-cols-2 gap-1.5">
          <select
            className="h-9 rounded-lg border border-[#c5cde0] bg-white px-2 text-[12.5px]"
            value={item.op}
            onChange={(e) => onChange({ ...item, op: e.target.value })}
          >
            <option value="eq">tem a tag</option>
            <option value="neq">não tem a tag</option>
          </select>
          <select
            className="h-9 rounded-lg border border-[#c5cde0] bg-white px-2 text-[12.5px]"
            value={item.value}
            onChange={(e) => onChange({ ...item, value: e.target.value })}
          >
            <option value="">Tag…</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {(kind === "contact" || kind === "global") && (
        <div className="grid grid-cols-3 gap-1.5">
          <select
            className="h-9 rounded-lg border border-[#c5cde0] bg-white px-2 text-[12.5px]"
            value={item.field}
            onChange={(e) => onChange({ ...item, field: e.target.value })}
          >
            {kind === "contact" && (
              <>
                <option value="name">Nome</option>
                <option value="phone">Telefone</option>
                <option value="email">E-mail</option>
                <option value="campo">Campo (sede)</option>
                <option value="uniao">União</option>
              </>
            )}
            {customFields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-lg border border-[#c5cde0] bg-white px-2 text-[12.5px]"
            value={item.op}
            onChange={(e) => onChange({ ...item, op: e.target.value })}
          >
            {OPS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          {item.op === "exists" || item.op === "not_exists" ? (
            <div className="h-9 rounded-lg bg-white" />
          ) : (
            <input
              className="h-9 rounded-lg border border-[#c5cde0] px-2 text-[12.5px]"
              value={item.value}
              placeholder="Valor"
              onChange={(e) => onChange({ ...item, value: e.target.value })}
            />
          )}
        </div>
      )}

      {kind === "window" && (
        <select
          className="h-9 w-full rounded-lg border border-[#c5cde0] bg-white px-2 text-[12.5px]"
          value={item.value}
          onChange={(e) => onChange({ ...item, value: e.target.value })}
        >
          <option value="open">Janela aberta (24h)</option>
          <option value="closed">Janela fechada</option>
        </select>
      )}

      {kind === "agent" && (
        <select
          className="h-9 w-full rounded-lg border border-[#c5cde0] bg-white px-2 text-[12.5px]"
          value={item.value}
          onChange={(e) => onChange({ ...item, value: e.target.value })}
        >
          <option value="*">Qualquer atendente</option>
          <option value="none">Sem atendente</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      )}

      {kind === "pipeline" && (
        <select
          className="h-9 w-full rounded-lg border border-[#c5cde0] bg-white px-2 text-[12.5px]"
          value={item.value}
          onChange={(e) => onChange({ ...item, value: e.target.value })}
        >
          <option value="*">Qualquer etapa</option>
          <option value="none">Fora do pipeline</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}

      {kind === "noreply" && (
        <label className="flex items-center gap-2 text-[13px] text-[#5a6780]">
          Sem resposta há
          <input
            type="number"
            min={1}
            className="h-9 w-20 rounded-lg border border-[#c5cde0] px-2 text-[13px]"
            value={item.value}
            onChange={(e) => onChange({ ...item, value: e.target.value })}
          />
          horas
        </label>
      )}

      {kind === "hours" && hours && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => {
              const on = (hours.days ?? []).includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  className={cn(
                    "size-8 rounded-full text-[12px] font-semibold",
                    on ? "bg-[#031c45] text-white" : "bg-white text-[#5a6780] ring-1 ring-[#c5cde0]",
                  )}
                  onClick={() => {
                    const days = new Set(hours.days ?? []);
                    if (days.has(i)) days.delete(i);
                    else days.add(i);
                    onChange({
                      ...item,
                      value: JSON.stringify({ ...hours, days: [...days].sort() }),
                    });
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="time"
              className="h-9 rounded-lg border border-[#c5cde0] px-2 text-[13px]"
              value={hours.from ?? "08:00"}
              onChange={(e) =>
                onChange({
                  ...item,
                  value: JSON.stringify({ ...hours, from: e.target.value }),
                })
              }
            />
            <span className="text-[12px] text-[#8b95a8]">às</span>
            <input
              type="time"
              className="h-9 rounded-lg border border-[#c5cde0] px-2 text-[13px]"
              value={hours.to ?? "18:00"}
              onChange={(e) =>
                onChange({
                  ...item,
                  value: JSON.stringify({ ...hours, to: e.target.value }),
                })
              }
            />
            <select
              className="h-9 rounded-lg border border-[#c5cde0] bg-white px-2 text-[12.5px]"
              value={item.op === "out" ? "out" : "in"}
              onChange={(e) => onChange({ ...item, op: e.target.value, field: e.target.value })}
            >
              <option value="in">Dentro</option>
              <option value="out">Fora</option>
            </select>
          </div>
        </div>
      )}

      {kind === "sheets" && (
        <div className="grid grid-cols-2 gap-1.5">
          <input
            className="h-9 rounded-lg border border-[#c5cde0] px-2 text-[12.5px]"
            placeholder="Coluna"
            value={item.field === "sheets" ? "" : item.field}
            onChange={(e) => onChange({ ...item, field: e.target.value || "sheets" })}
          />
          <input
            className="h-9 rounded-lg border border-[#c5cde0] px-2 text-[12.5px]"
            placeholder="Valor"
            value={item.value}
            onChange={(e) => onChange({ ...item, value: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
