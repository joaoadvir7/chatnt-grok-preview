import { MapPin, Printer, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  buildVisitLabel,
  downloadLabelsPdf,
  groupLabelsByDistrito,
  qrDataUrl,
  waMeUrl,
} from "@/lib/visit-labels";
import { useT } from "@/lib/i18n";
import { useCrmStore } from "@/lib/store";
import type { Contact } from "@/lib/types";

export function VisitLabels({
  contacts,
  onClose,
}: {
  contacts: Contact[];
  onClose: () => void;
}) {
  const [material, setMaterial] = useState(
    () => localStorage.getItem("chatnt-label-material") ?? "",
  );
  const t = useT();
  const deals = useCrmStore((s) => s.deals);
  const agents = useCrmStore((s) => s.agents);
  const activeAgentId = useCrmStore((s) => s.activeAgentId);

  const labels = useMemo(() => {
    const me = agents.find((a) => a.id === activeAgentId)?.name ?? "";
    return contacts.map((c) => {
      const deal = deals.find((d) => d.contactId === c.id && !d.outcome);
      const assignee = deal?.assignee
        ? agents.find((a) => a.id === deal.assignee)?.name
        : "";
      return buildVisitLabel(c, { agentName: assignee || me });
    });
  }, [contacts, deals, agents, activeAgentId]);
  const groups = useMemo(() => groupLabelsByDistrito(labels), [labels]);
  const [qrs, setQrs] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    void Promise.all(
      labels.map(async (l) => {
        const url = waMeUrl(l.phone);
        return [l.contactId, url ? await qrDataUrl(url) : ""] as const;
      }),
    ).then((pairs) => {
      if (!alive) return;
      setQrs(Object.fromEntries(pairs));
    });
    return () => {
      alive = false;
    };
  }, [labels]);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#eef2f8]">
      <header className="flex shrink-0 items-center justify-between bg-[#082b5e] px-5 py-3 text-white">
        <div>
          <div className="text-[16px] font-semibold">
            {t("labels.title")}
          </div>
          <div className="text-[12px] text-white/70">
            {t("labels.subtitle")}
          </div>
        </div>
        <button
          type="button"
          className="rounded-full p-1.5 hover:bg-white/10"
          onClick={onClose}
        >
          <X className="size-5" />
        </button>
      </header>

      <div className="mx-auto min-h-0 w-full max-w-[980px] flex-1 space-y-3 overflow-y-auto p-4">
        <div className="rounded-xl border-2 border-[#1b7a45] bg-white p-4">
          <label className="block text-[13px] font-semibold text-[#1b7a45]">
            {t("labels.material")}
          </label>
          <textarea
            className="mt-2 h-16 w-full rounded-lg border border-[#1b7a45] px-3 py-2 text-sm"
            placeholder="Ex: entregar os seguintes materiais, Contagem Regressiva e Verdade e Vida, agendado em 22/07/2026"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#d5dee8] bg-white p-3">
          <span className="mr-auto text-[13px] text-[#4a6280]">
            {labels.length} pessoa{labels.length === 1 ? "" : "s"} ·{" "}
            {groups.length} distrito{groups.length === 1 ? "" : "s"}
          </span>
          <Button
            className="h-9 bg-[#0d5c3d] text-white hover:bg-[#0a4a31]"
            onClick={() => {
              try {
                localStorage.setItem("chatnt-label-material", material);
              } catch {
                /* ignore */
              }
              void downloadLabelsPdf(labels, material).then(() => {
                toast.success("PDF gerado · 6 por folha, com QR do WhatsApp");
              });
            }}
          >
            <Printer className="size-3.5" />
            {t("labels.pdf")}
          </Button>
          <Button variant="outline" className="h-9" onClick={onClose}>
            {t("labels.back")}
          </Button>
        </div>

        {groups.map(([distrito, list]) => (
          <section key={distrito} className="space-y-2">
            <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-[#082b5e]">
              <MapPin className="size-3.5" />
              {distrito}
              <span className="font-normal text-[#7a93b0]">
                · {list.length} etiqueta{list.length === 1 ? "" : "s"}
              </span>
            </h2>
            {list.map((l) => (
              <article
                key={l.contactId}
                className="rounded-xl border border-[#d5dee8] border-l-4 border-l-[#082b5e] bg-white p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[16px] font-semibold text-[#082b5e]">
                    {l.distrito} · {l.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    {qrs[l.contactId] && (
                      <img
                        src={qrs[l.contactId]}
                        alt="QR WhatsApp"
                        className="size-14 rounded border border-[#d5dee8] bg-white p-0.5"
                      />
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f0fa] px-2.5 py-0.5 text-[11px] text-[#0050a0]">
                      <MapPin className="size-3" />
                      {l.distrito}
                    </span>
                  </div>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <div className="text-[11px] font-semibold tracking-wide text-[#7a93b0]">
                      ENDEREÇO
                    </div>
                    <div className="text-[13px]">{l.endereco}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold tracking-wide text-[#7a93b0]">
                      WHATSAPP
                    </div>
                    <div className="text-[13px]">{l.phone}</div>
                  </div>
                </div>
                <div className="mt-2 rounded-lg bg-[#eef4ff] px-3 py-2 text-[13px]">
                  <div className="text-[12px] font-semibold text-[#1e3a8a]">
                    {t("labels.requested")}
                  </div>
                  {l.materiais}
                </div>
                {material.trim() && (
                  <div className="mt-2 rounded-lg bg-[#e8f5ee] px-3 py-2 text-[13px] text-[#0d5c3d]">
                    <span className="font-semibold">
                      {t("labels.materialLine")}
                    </span>{" "}
                    {material}
                  </div>
                )}
                {l.dataAgendamento && l.dataAgendamento !== "—" && (
                  <div className="mt-1.5 text-[13px] text-[#082b5e]">
                    {t("labels.scheduled", { date: l.dataAgendamento })}
                  </div>
                )}
                <div className="mt-2 text-[11px] text-[#8b9aab]">
                  {t("labels.solicited", { date: l.dataSolicitacao })}
                </div>
              </article>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
