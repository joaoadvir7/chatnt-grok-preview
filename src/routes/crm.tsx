import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Ban,
  CheckCircle2,
  Download,
  Flame,
  Info,
  MoreVertical,
  Pencil,
  Printer,
  Settings,
  Snowflake,
  Tag,
  Trash2,
  UserRoundCog,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { ScopeBanner } from "@/components/ScopeBanner";
import { TagChip } from "@/components/TagChip";
import { VisitLabels } from "@/components/VisitLabels";
import { Button } from "@/components/ui/button";
import { FUNNEL_STEPS } from "@/lib/funnel";
import { useT } from "@/lib/i18n";
import { useCrmStore } from "@/lib/store";
import { useScopedData } from "@/lib/useScopedData";
import { cn, formatPhone } from "@/lib/utils";

export const Route = createFileRoute("/crm")({
  component: CrmPage,
});

const STAGE_TINTS = [
  { id: "mint", bg: "#f8fcfa", border: "#d7e6de" },
  { id: "peach", bg: "#fffaf8", border: "#eadad4" },
  { id: "lilac", bg: "#fbf9fc", border: "#e4dbea" },
  { id: "sky", bg: "#f8fafc", border: "#d6dee8" },
  { id: "sand", bg: "#fffcf6", border: "#ebe3c8" },
  { id: "cream", bg: "#fffaf7", border: "#eadccc" },
  { id: "gray", bg: "#f9fafb", border: "#dde1e8" },
] as const;

function stageTint(color?: string, idx = 0) {
  return (
    STAGE_TINTS.find((t) => t.id === color) ??
    STAGE_TINTS[idx % STAGE_TINTS.length]!
  );
}

type Card = {
  key: string;
  dealId?: string;
  contactId: string;
  title: string;
  temperature: number;
  tagIds: string[];
  daysInStage: number;
};

function CrmPage() {
  const stages = useCrmStore((s) => s.stages);
  const tags = useCrmStore((s) => s.tags);
  const moveDeal = useCrmStore((s) => s.moveDeal);
  const addDeal = useCrmStore((s) => s.addDeal);
  const addStage = useCrmStore((s) => s.addStage);
  const renameStage = useCrmStore((s) => s.renameStage);
  const deleteStage = useCrmStore((s) => s.deleteStage);
  const reorderStages = useCrmStore((s) => s.reorderStages);
  const setStageColor = useCrmStore((s) => s.setStageColor);
  const toggleContactTag = useCrmStore((s) => s.toggleContactTag);
  const transferDealsForContacts = useCrmStore((s) => s.transferDealsForContacts);
  const closeDeal = useCrmStore((s) => s.closeDeal);
  const deleteDeal = useCrmStore((s) => s.deleteDeal);
  const updateContact = useCrmStore((s) => s.updateContact);
  const openConversationForContact = useCrmStore((s) => s.openConversationForContact);
  const agents = useCrmStore((s) => s.agents);
  const { deals, contacts, isRegional, sede } = useScopedData();
  const navigate = useNavigate();

  const ordered = [...stages].sort((a, b) => a.order - b.order);
  const [selected, setSelected] = useState<string[]>([]);
  const [colMenu, setColMenu] = useState<string | null>(null);
  const [addingCol, setAddingCol] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [gearOpen, setGearOpen] = useState(false);
  const [gearSub, setGearSub] = useState<null | "addtag" | "rmtag" | "agent" | "move">(
    null,
  );
  const [cardMenu, setCardMenu] = useState<string | null>(null);
  const [cardSub, setCardSub] = useState<null | "agent" | "edit" | "details">(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [dragStage, setDragStage] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(false);
  const t = useT();

  const cardsByStage = useMemo(() => {
    const map = new Map<string, Card[]>();
    for (const st of ordered) map.set(st.id, []);
    const leadId = ordered[0]?.id;

    for (const deal of deals) {
      if (deal.outcome) continue;
      const contact = contacts.find((c) => c.id === deal.contactId);
      const list = map.get(deal.stageId);
      if (!list) continue;
      list.push({
        key: deal.id,
        dealId: deal.id,
        contactId: deal.contactId,
        title: contact?.name ?? deal.title,
        temperature: deal.temperature,
        tagIds: contact?.tagIds?.length ? contact.tagIds : deal.tagIds,
        daysInStage: deal.daysInStage,
      });
    }

    if (leadId) {
      const leadList = map.get(leadId)!;
      const already = new Set([...map.values()].flat().map((c) => c.contactId));
      for (const c of contacts) {
        if (already.has(c.id)) continue;
        leadList.push({
          key: `c:${c.id}`,
          contactId: c.id,
          title: c.name,
          temperature: 40,
          tagIds: c.tagIds,
          daysInStage: 0,
        });
      }
    }
    return map;
  }, [deals, contacts, ordered]);

  function toggleOne(key: string) {
    setSelected((ids) =>
      ids.includes(key) ? ids.filter((x) => x !== key) : [...ids, key],
    );
  }

  function keysOfStage(stageId: string) {
    return (cardsByStage.get(stageId) ?? []).map((c) => c.key);
  }

  function toggleStage(stageId: string) {
    const keys = keysOfStage(stageId);
    setSelected((ids) =>
      keys.length && keys.every((k) => ids.includes(k))
        ? ids.filter((k) => !keys.includes(k))
        : [...new Set([...ids, ...keys])],
    );
  }

  function placeCard(card: Card, stageId: string) {
    if (card.dealId) {
      moveDeal(card.dealId, stageId);
    } else {
      addDeal(card.contactId, card.title, stageId);
    }
  }

  function moveKeys(keys: string[], stageId: string) {
    const all = [...cardsByStage.values()].flat();
    let n = 0;
    for (const key of keys) {
      const card = all.find((c) => c.key === key);
      if (!card) continue;
      placeCard(card, stageId);
      n += 1;
    }
    setSelected((ids) => ids.filter((k) => !keys.includes(k)));
    setColMenu(null);
    setGearOpen(false);
    setGearSub(null);
    if (n) toast.success(`${n} aluno${n === 1 ? "" : "s"} movido${n === 1 ? "" : "s"}`);
  }

  function downloadCards(cards: Card[], filename: string) {
    const header = ["Nome", "Telefone", "Email", "Etapa", "Tags"];
    const rows = cards.map((card) => {
      const contact = contacts.find((c) => c.id === card.contactId);
      const stageName =
        ordered.find((st) =>
          (cardsByStage.get(st.id) ?? []).some((x) => x.key === card.key),
        )?.name ?? "";
      const tagNames = card.tagIds
        .map((id) => tags.find((t) => t.id === id)?.name)
        .filter(Boolean)
        .join(" | ");
      return [
        card.title,
        contact?.phone ?? "",
        contact?.email ?? "",
        stageName,
        tagNames,
      ];
    });
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Planilha baixada");
  }

  function selectedCards() {
    return [...cardsByStage.values()].flat().filter((c) => selected.includes(c.key));
  }

  function applyTagToSelected(tagId: string, add: boolean) {
    let n = 0;
    for (const card of selectedCards()) {
      const c = contacts.find((x) => x.id === card.contactId);
      if (!c) continue;
      const has = c.tagIds.includes(tagId);
      if (add && !has) {
        toggleContactTag(c.id, tagId);
        n += 1;
      }
      if (!add && has) {
        toggleContactTag(c.id, tagId);
        n += 1;
      }
    }
    setGearOpen(false);
    setGearSub(null);
    toast.success(add ? `Tag adicionada em ${n}` : `Tag removida de ${n}`);
  }

  function transferSelected(agentId: string) {
    const ids = selectedCards().map((c) => c.contactId);
    transferDealsForContacts(ids, agentId);
    const name = agents.find((a) => a.id === agentId)?.name ?? "atendente";
    setGearOpen(false);
    setGearSub(null);
    toast.success(`Transferido para ${name}`);
  }

  function closeSelected(outcome: "ganho" | "perdido") {
    let n = 0;
    for (const card of selectedCards()) {
      if (card.dealId) {
        closeDeal(card.dealId, outcome);
        n += 1;
      } else if (outcome === "perdido") {
        n += 1;
      }
    }
    setSelected([]);
    setGearOpen(false);
    toast.success(
      outcome === "ganho" ? `${n} marcado(s) como concluído` : `${n} encerrado(s)`,
    );
  }

  function downloadSelected() {
    const cards = selectedCards();
    if (!cards.length) {
      toast.error("Selecione ao menos um aluno");
      return;
    }
    downloadCards(cards, "crm-alunos.csv");
  }

  const selectedCount = selected.length;
  const totalCards = [...cardsByStage.values()].reduce((n, a) => n + a.length, 0);

  return (
    <AppShell
      title={t("page.crm")}
      fullBleed
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-8 bg-[#0d5c3d] text-xs text-white hover:bg-[#0a4a31]"
            onClick={() => {
              if (selectedCount === 0) {
                toast.error(t("crm.selectToLabel"));
                return;
              }
              setShowLabels(true);
            }}
          >
            <Printer className="size-3.5" />
            {t("crm.generateLabels")}
          </Button>
          {selectedCount > 0 && (
            <>
              <span className="text-[12px] text-[var(--color-muted)]">
                {selectedCount} selecionado{selectedCount === 1 ? "" : "s"}
              </span>
              <Button
                size="sm"
                className="h-8 bg-[var(--color-navy)] text-xs text-white"
                onClick={downloadSelected}
              >
                <Download className="size-3.5" />
                Baixar
              </Button>
              <div className="relative">
                <button
                  type="button"
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border border-[var(--color-border)] bg-white hover:bg-[var(--color-surface-2)]",
                    gearOpen && "bg-[var(--color-surface-2)]",
                  )}
                  title="Ações"
                  onClick={() => {
                    setGearOpen((v) => !v);
                    setGearSub(null);
                  }}
                >
                  <Settings className="size-4" />
                </button>
                {gearOpen && (
                  <div className="absolute top-full right-0 z-40 mt-1.5 w-[280px] overflow-hidden rounded-xl border border-[var(--color-border)] bg-white py-1 shadow-[0_8px_24px_rgb(15_40_30/0.12)]">
                    {gearSub === null && (
                      <>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] hover:bg-[var(--color-surface-2)]"
                          onClick={() => setGearSub("addtag")}
                        >
                          <Tag className="size-3.5 text-[var(--color-navy)]" />
                          Adicionar tag (contato)
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] hover:bg-[var(--color-surface-2)]"
                          onClick={() => setGearSub("rmtag")}
                        >
                          <Tag className="size-3.5 text-[var(--color-navy)]" />
                          Remover tag (contato)
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] hover:bg-[var(--color-surface-2)]"
                          onClick={() => setGearSub("agent")}
                        >
                          <UserRoundCog className="size-3.5 text-[var(--color-navy)]" />
                          Transferir atendente do negócio
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] hover:bg-[var(--color-surface-2)]"
                          onClick={() => setGearSub("move")}
                        >
                          <MoreVertical className="size-3.5 rotate-90 text-[var(--color-navy)]" />
                          Mover de coluna
                        </button>
                        <div className="my-1 border-t border-[var(--color-border)]" />
                        <button
                          type="button"
                          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] hover:bg-[var(--color-surface-2)]"
                          onClick={() => closeSelected("ganho")}
                        >
                          <CheckCircle2 className="size-3.5 text-[#0d9f4f]" />
                          Fechar acompanhamento concluído
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] hover:bg-[var(--color-surface-2)]"
                          onClick={() => closeSelected("perdido")}
                        >
                          <Ban className="size-3.5 text-red-600" />
                          Fechar acompanhamento encerrado
                        </button>
                      </>
                    )}
                    {gearSub === "addtag" && (
                      <div>
                        <button type="button" className="w-full px-3.5 py-2 text-left text-[11px] text-[var(--color-muted)]" onClick={() => setGearSub(null)}>← Voltar</button>
                        {tags.map((t) => (
                          <button key={t.id} type="button" className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] hover:bg-[var(--color-surface-2)]" onClick={() => applyTagToSelected(t.id, true)}>
                            <span className="size-2.5 rounded-full" style={{ background: t.color }} />
                            #{t.name}
                          </button>
                        ))}
                      </div>
                    )}
                    {gearSub === "rmtag" && (
                      <div>
                        <button type="button" className="w-full px-3.5 py-2 text-left text-[11px] text-[var(--color-muted)]" onClick={() => setGearSub(null)}>← Voltar</button>
                        {tags.map((t) => (
                          <button key={t.id} type="button" className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] hover:bg-[var(--color-surface-2)]" onClick={() => applyTagToSelected(t.id, false)}>
                            <span className="size-2.5 rounded-full" style={{ background: t.color }} />
                            #{t.name}
                          </button>
                        ))}
                      </div>
                    )}
                    {gearSub === "agent" && (
                      <div>
                        <button type="button" className="w-full px-3.5 py-2 text-left text-[11px] text-[var(--color-muted)]" onClick={() => setGearSub(null)}>← Voltar</button>
                        {agents.map((a) => (
                          <button key={a.id} type="button" className="flex w-full justify-between px-3.5 py-2 text-left text-[13px] hover:bg-[var(--color-surface-2)]" onClick={() => transferSelected(a.id)}>
                            <span>{a.name}</span>
                            <span className="text-[11px] text-[var(--color-muted)]">{a.area}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {gearSub === "move" && (
                      <div>
                        <button type="button" className="w-full px-3.5 py-2 text-left text-[11px] text-[var(--color-muted)]" onClick={() => setGearSub(null)}>← Voltar</button>
                        {ordered.map((st) => (
                          <button key={st.id} type="button" className="flex w-full px-3.5 py-2 text-left text-[13px] hover:bg-[var(--color-surface-2)]" onClick={() => moveKeys(selected, st.id)}>
                            {st.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="text-[12px] text-[var(--color-muted)] underline"
                onClick={() => {
                  setSelected([]);
                  setGearOpen(false);
                }}
              >
                Limpar
              </button>
            </>
          )}
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-5">
      <div className="mb-3 shrink-0 space-y-3">
        <ScopeBanner />
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h2 className="font-semibold text-[var(--color-navy)]">
            Funil da Escola Bíblica
            {isRegional && sede ? ` · ${sede.code}` : " · Nacional"}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Lead → Aluno → Jornada → Visita ou Estudo · {totalCards} alunos
            neste escopo
            {isRegional ? " · apenas esta sede" : " · todas as sedes"}
          </p>
        </div>
      </div>

      <div className="crm-board flex min-h-0 flex-1 gap-3 overflow-x-auto overflow-y-hidden">
        {ordered.map((stage, idx) => {
          const stageCards = cardsByStage.get(stage.id) ?? [];
          const hint =
            FUNNEL_STEPS.find((s) =>
              s.label.toLowerCase().includes(stage.name.toLowerCase()),
            )?.hint ?? "";
          const allOn =
            stageCards.length > 0 &&
            stageCards.every((c) => selected.includes(c.key));
          const tint = stageTint(stage.color, idx);
          return (
            <div
              key={stage.id}
              className={cn(
                "flex h-full w-72 shrink-0 flex-col rounded-[var(--radius-lg)] border",
                overStage === stage.id && dragStage && dragStage !== stage.id
                  ? "border-[var(--color-navy)]"
                  : "",
              )}
              style={{
                background: tint.bg,
                borderColor:
                  overStage === stage.id && dragStage && dragStage !== stage.id
                    ? undefined
                    : tint.border,
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(stage.id);
              }}
              onDragLeave={() => {
                setOverStage((id) => (id === stage.id ? null : id));
              }}
              onDrop={(e) => {
                e.preventDefault();
                const stageFrom = e.dataTransfer.getData("text/crm-stage");
                if (stageFrom) {
                  reorderStages(stageFrom, stage.id);
                  setDragStage(null);
                  setOverStage(null);
                  return;
                }
                const key = e.dataTransfer.getData("text/crm-card");
                const all = [...cardsByStage.values()].flat();
                const card = all.find((c) => c.key === key);
                if (card) placeCard(card, stage.id);
                setOverStage(null);
              }}
            >
              <div
                className="cursor-grab border-b border-[var(--color-border)] px-3 py-2.5 active:cursor-grabbing"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/crm-stage", stage.id);
                  e.dataTransfer.effectAllowed = "move";
                  setDragStage(stage.id);
                }}
                onDragEnd={() => {
                  setDragStage(null);
                  setOverStage(null);
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <label className="flex min-w-0 items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-3.5 accent-[var(--color-navy)]"
                      checked={allOn}
                      onChange={() => toggleStage(stage.id)}
                    />
                    <span className="truncate text-sm font-semibold">
                      {renamingId === stage.id ? (
                        <input
                          className="h-7 w-[130px] rounded border border-[var(--color-border)] bg-white px-1.5 text-[13px]"
                          value={renameDraft}
                          autoFocus
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && renameDraft.trim()) {
                              renameStage(stage.id, renameDraft);
                              setRenamingId(null);
                            }
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          onBlur={() => {
                            if (renameDraft.trim()) renameStage(stage.id, renameDraft);
                            setRenamingId(null);
                          }}
                        />
                      ) : (
                        <>
                          {idx + 1}. {stage.name}
                        </>
                      )}
                    </span>
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="rounded-[var(--radius-pill)] bg-[var(--color-surface)] px-2 py-0.5 text-xs tabular-nums">
                      {stageCards.length}
                    </span>
                    <div className="relative">
                      <button
                        type="button"
                        className="rounded p-1 text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
                        onClick={() =>
                          setColMenu((v) => (v === stage.id ? null : stage.id))
                        }
                      >
                        <MoreVertical className="size-3.5" />
                      </button>
                      {colMenu === stage.id && (
                        <div className="absolute top-full right-0 z-30 mt-1 w-48 rounded-lg border border-[var(--color-border)] bg-white py-1 shadow-lg">
                          <button
                            type="button"
                            className="flex w-full px-3 py-1.5 text-left text-[12px] hover:bg-[var(--color-surface-2)]"
                            onClick={() => {
                              toggleStage(stage.id);
                              setColMenu(null);
                            }}
                          >
                            Selecionar coluna
                          </button>
                          <button
                            type="button"
                            className="flex w-full px-3 py-1.5 text-left text-[12px] hover:bg-[var(--color-surface-2)]"
                            onClick={() => {
                              downloadCards(
                                stageCards,
                                `crm-${stage.name.toLowerCase()}.csv`,
                              );
                              setColMenu(null);
                            }}
                          >
                            Baixar esta coluna
                          </button>
                          <button
                            type="button"
                            className="flex w-full px-3 py-1.5 text-left text-[12px] hover:bg-[var(--color-surface-2)]"
                            onClick={() => {
                              setRenamingId(stage.id);
                              setRenameDraft(stage.name);
                              setColMenu(null);
                            }}
                          >
                            Renomear coluna
                          </button>
                          <div className="px-3 py-2">
                            <p className="mb-1.5 text-[10px] text-[var(--color-muted)]">
                              Cor suave
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {STAGE_TINTS.map((t) => (
                                <button
                                  key={t.id}
                                  type="button"
                                  title={t.id}
                                  className={cn(
                                    "size-5 rounded-full border",
                                    (stage.color ??
                                      STAGE_TINTS[idx % STAGE_TINTS.length]!.id) ===
                                      t.id && "ring-2 ring-[var(--color-navy)] ring-offset-1",
                                  )}
                                  style={{ background: t.bg, borderColor: t.border }}
                                  onClick={() => {
                                    setStageColor(stage.id, t.id);
                                    setColMenu(null);
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="flex w-full px-3 py-1.5 text-left text-[12px] text-red-600 hover:bg-red-50"
                            onClick={() => {
                              if (ordered.length <= 1) {
                                toast.error("Deixe ao menos uma coluna");
                                return;
                              }
                              if (
                                !confirm(
                                  `Excluir a coluna “${stage.name}”? Os alunos vão para outra etapa.`,
                                )
                              )
                                return;
                              deleteStage(stage.id);
                              setColMenu(null);
                              toast.success("Coluna excluída");
                            }}
                          >
                            Excluir coluna
                          </button>
                          <div className="my-1 border-t border-[var(--color-border)]" />
                          <p className="px-3 py-1 text-[10px] text-[var(--color-muted)]">
                            Mover todos para
                          </p>
                          {ordered
                            .filter((s) => s.id !== stage.id)
                            .map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                className="flex w-full px-3 py-1.5 text-left text-[12px] hover:bg-[var(--color-surface-2)]"
                                onClick={() =>
                                  moveKeys(
                                    stageCards.map((c) => c.key),
                                    s.id,
                                  )
                                }
                              >
                                → {s.name}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {hint && (
                  <p className="mt-1 text-[10px] leading-snug text-[var(--color-muted)]">
                    {hint}
                  </p>
                )}
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
                {stageCards.map((card) => {
                  const contact = contacts.find((c) => c.id === card.contactId);
                  const hot = card.temperature >= 60;
                  const on = selected.includes(card.key);
                  return (
                    <div
                      key={card.key}
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/crm-card", card.key)
                      }
                      className={cn(
                        "cursor-grab rounded-[var(--radius-md)] border bg-[var(--color-surface)] p-3 shadow-[var(--shadow-sm)] active:cursor-grabbing",
                        on
                          ? "border-[var(--color-navy)]"
                          : "border-[var(--color-border)]",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-0.5 size-3.5 accent-[var(--color-navy)]"
                          checked={on}
                          onChange={() => toggleOne(card.key)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-1">
                            <div className="font-medium">{card.title}</div>
                            <div className="relative shrink-0">
                              <button
                                type="button"
                                className="rounded p-0.5 text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCardMenu((v) => (v === card.key ? null : card.key));
                                  setCardSub(null);
                                  setEditName(contact?.name ?? card.title);
                                  setEditPhone(contact?.phone ?? "");
                                }}
                              >
                                <MoreVertical className="size-3.5" />
                              </button>
                              {cardMenu === card.key && (
                                <div
                                  className="absolute top-full right-0 z-40 mt-1 w-[210px] overflow-hidden rounded-xl border border-[var(--color-border)] bg-white py-1 shadow-lg"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {cardSub === null && (
                                    <>
                                      <button
                                        type="button"
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-[var(--color-surface-2)]"
                                        onClick={() => setCardSub("details")}
                                      >
                                        <Info className="size-3.5 text-[var(--color-navy)]" />
                                        Detalhes
                                      </button>
                                      <button
                                        type="button"
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-[var(--color-surface-2)]"
                                        onClick={() => setCardSub("edit")}
                                      >
                                        <Pencil className="size-3.5 text-[var(--color-navy)]" />
                                        Editar
                                      </button>
                                      <button
                                        type="button"
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-[var(--color-surface-2)]"
                                        onClick={() => setCardSub("agent")}
                                      >
                                        <UserRoundCog className="size-3.5 text-[var(--color-navy)]" />
                                        Atribuir atendente
                                      </button>
                                      <button
                                        type="button"
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50"
                                        onClick={() => {
                                          if (!confirm(`Excluir “${card.title}” do CRM?`)) return;
                                          if (card.dealId) deleteDeal(card.dealId);
                                          setCardMenu(null);
                                          setSelected((ids) => ids.filter((k) => k !== card.key));
                                          toast.success("Removido do CRM");
                                        }}
                                      >
                                        <Trash2 className="size-3.5" />
                                        Excluir
                                      </button>
                                    </>
                                  )}
                                  {cardSub === "details" && (
                                    <div className="space-y-1.5 px-3 py-2 text-[12px]">
                                      <button type="button" className="text-[11px] text-[var(--color-muted)]" onClick={() => setCardSub(null)}>← Voltar</button>
                                      <div className="font-medium">{card.title}</div>
                                      {contact && <div>{formatPhone(contact.phone)}</div>}
                                      <div className="text-[var(--color-muted)]">Etapa: {stage.name}</div>
                                      <button
                                        type="button"
                                        className="mt-1 w-full rounded-md border border-[var(--color-border)] px-2 py-1.5 text-left hover:bg-[var(--color-surface-2)]"
                                        onClick={() => {
                                          const id = openConversationForContact(card.contactId);
                                          setCardMenu(null);
                                          void navigate({ to: "/live-chat", search: { cv: id } });
                                        }}
                                      >
                                        Abrir no Live Chat
                                      </button>
                                    </div>
                                  )}
                                  {cardSub === "edit" && (
                                    <div className="space-y-1.5 px-3 py-2">
                                      <button type="button" className="text-[11px] text-[var(--color-muted)]" onClick={() => setCardSub(null)}>← Voltar</button>
                                      <input
                                        className="h-8 w-full rounded border border-[var(--color-border)] px-2 text-[12px]"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        placeholder="Nome"
                                      />
                                      <input
                                        className="h-8 w-full rounded border border-[var(--color-border)] px-2 text-[12px]"
                                        value={editPhone}
                                        onChange={(e) => setEditPhone(e.target.value)}
                                        placeholder="WhatsApp"
                                      />
                                      <button
                                        type="button"
                                        className="h-8 w-full rounded-md bg-[var(--color-navy)] text-[12px] text-white"
                                        onClick={() => {
                                          if (!editName.trim()) return;
                                          updateContact(card.contactId, {
                                            name: editName.trim(),
                                            phone: editPhone.trim() || undefined,
                                          });
                                          setCardMenu(null);
                                          toast.success("Contato atualizado");
                                        }}
                                      >
                                        Salvar
                                      </button>
                                    </div>
                                  )}
                                  {cardSub === "agent" && (
                                    <div>
                                      <button type="button" className="w-full px-3 py-1.5 text-left text-[11px] text-[var(--color-muted)]" onClick={() => setCardSub(null)}>← Voltar</button>
                                      {agents.map((a) => (
                                        <button
                                          key={a.id}
                                          type="button"
                                          className="flex w-full justify-between px-3 py-2 text-left text-[13px] hover:bg-[var(--color-surface-2)]"
                                          onClick={() => {
                                            transferDealsForContacts([card.contactId], a.id);
                                            setCardMenu(null);
                                            toast.success(`Atribuído a ${a.name}`);
                                          }}
                                        >
                                          <span>{a.name}</span>
                                          <span className="text-[11px] text-[var(--color-muted)]">{a.area}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          {contact && (
                            <div className="mt-0.5 text-xs text-[var(--color-muted)]">
                              {formatPhone(contact.phone)}
                              {contact.customFields.cf5
                                ? ` · ${contact.customFields.cf5}`
                                : ""}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <span
                          className={`inline-flex items-center gap-0.5 rounded-[var(--radius-pill)] px-1.5 py-0.5 text-[10px] font-medium ${
                            hot
                              ? "bg-orange-100 text-orange-700"
                              : "bg-sky-100 text-sky-700"
                          }`}
                        >
                          {hot ? (
                            <Flame className="size-3" />
                          ) : (
                            <Snowflake className="size-3" />
                          )}
                          {card.temperature}°
                        </span>
                        {card.tagIds.slice(0, 2).map((tid) => {
                          const t = tags.find((x) => x.id === tid);
                          return t ? <TagChip key={tid} tag={t} /> : null;
                        })}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {ordered
                          .filter((s) => s.id !== stage.id)
                          .map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10px] text-[var(--color-muted)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
                              onClick={() => placeCard(card, s.id)}
                            >
                              → {s.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  );
                })}
                {stageCards.length === 0 && (
                  <p className="px-2 py-6 text-center text-[12px] text-[var(--color-muted)]">
                    Ninguém nesta etapa
                  </p>
                )}
              </div>
            </div>
          );
        })}
        <div className="flex h-full w-64 shrink-0 flex-col rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          {addingCol ? (
            <div className="space-y-2">
              <input
                className="h-9 w-full rounded-md border border-[var(--color-border)] px-2 text-sm"
                placeholder="Nome da coluna"
                value={newColName}
                autoFocus
                onChange={(e) => setNewColName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newColName.trim()) {
                    addStage(newColName);
                    setNewColName("");
                    setAddingCol(false);
                    toast.success("Coluna criada");
                  }
                  if (e.key === "Escape") {
                    setAddingCol(false);
                    setNewColName("");
                  }
                }}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-8 flex-1 text-xs"
                  onClick={() => {
                    if (!newColName.trim()) return;
                    addStage(newColName);
                    setNewColName("");
                    setAddingCol(false);
                    toast.success("Coluna criada");
                  }}
                >
                  Criar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => {
                    setAddingCol(false);
                    setNewColName("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="flex h-full min-h-[120px] items-center justify-center text-sm text-[var(--color-muted)] hover:text-[var(--color-navy)]"
              onClick={() => setAddingCol(true)}
            >
              + Nova coluna
            </button>
          )}
        </div>
      </div>
      </div>
      {showLabels && (
        <VisitLabels
          contacts={selectedCards()
            .map((c) => contacts.find((x) => x.id === c.contactId))
            .filter((c): c is NonNullable<typeof c> => Boolean(c))}
          onClose={() => setShowLabels(false)}
        />
      )}
    </AppShell>
  );
}
