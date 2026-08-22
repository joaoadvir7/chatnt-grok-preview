import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  FileText,
  Map,
} from "lucide-react";
import { toast } from "sonner";
import { DOCS_SECTIONS } from "@/lib/docs-content";
import { useCrmStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { wabaReady } from "@/lib/whatsapp";

export type ContaTab = "mapa" | "docs" | "politicas";

export function ContaHub({
  tab,
  onTab,
  onClose,
}: {
  tab: ContaTab;
  onTab: (t: ContaTab) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f4f6fa]">
      <div className="flex shrink-0 items-center gap-3 border-b border-[#e2e7f0] bg-white px-4 py-3">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[13.5px] text-[#0050a0]"
          onClick={onClose}
        >
          <ArrowLeft className="size-4" /> Voltar
        </button>
        <h1 className="text-[18px] font-semibold text-[#1a2744]">
          Conta e documentação
        </h1>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-[#e2e7f0] bg-white px-3">
        {(
          [
            ["mapa", Map, "Mapa do projeto"],
            ["docs", BookOpen, "Documentação"],
            ["politicas", FileText, "Políticas"],
          ] as const
        ).map(([id, Icon, label]) => (
          <button
            key={id}
            type="button"
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13.5px] whitespace-nowrap",
              tab === id
                ? "border-[#031c45] font-semibold text-[#031c45]"
                : "border-transparent text-[#5a6780]",
            )}
            onClick={() => onTab(id)}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
        {tab === "mapa" && <MapaPanel />}
        {tab === "docs" && <DocsPanel />}
        {tab === "politicas" && <PoliticasPanel />}
      </div>
    </div>
  );
}

function MapaPanel() {
  const connections = useCrmStore((s) => s.connections);
  const automations = useCrmStore((s) => s.automations);
  const contacts = useCrmStore((s) => s.contacts);
  const conversations = useCrmStore((s) => s.conversations);
  const broadcasts = useCrmStore((s) => s.broadcasts);
  const sedes = useCrmStore((s) => s.sedes);

  const realCx = connections.filter((c) => !c.trashed && !c.isDemo);
  const connected = realCx.filter((c) => wabaReady(c.waba)).length;
  const autos = automations.filter((a) => !a.trashed && a.source !== "broadcast");
  const modules = [
    { name: "Painel", status: "ok", note: "Métricas reais por etiqueta e sede" },
    { name: "Funil EB", status: "ok", note: "Lead → Aluno → Jornada → Visita → Estudo" },
    { name: "Contatos", status: "ok", note: `${contacts.filter((c) => !c.isDemo).length} reais` },
    { name: "Live Chat", status: "ok", note: `${conversations.length} conversas · ice breakers` },
    { name: "Automações", status: autos.some((a) => a.active) ? "ok" : "warn", note: `${autos.filter((a) => a.active).length} ativas / ${autos.length}` },
    { name: "Broadcasts", status: "ok", note: `${broadcasts.filter((b) => !b.trashed).length} disparos` },
    { name: "CRM Kanban", status: "ok", note: "Sem valores financeiros" },
    { name: "Conexões", status: connected ? "ok" : "warn", note: `${connected} número(s) Cloud API` },
    { name: "Sedes", status: "ok", note: `${sedes.length} regionais` },
    { name: "Coexistência", status: "warn", note: "App grátis · API cobrada pela Meta" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="text-[14.5px] leading-relaxed text-[#5a6780]">
        ChatNT é o CRM de atendimento da Escola Bíblica Novo Tempo. Cada sede
        opera o próprio número; a central vê o consolidado.
      </p>
      <div className="rounded-2xl border border-[#031c45]/15 bg-white px-5 py-4">
        <div className="text-[15px] font-semibold text-[#1a2744]">
          Código e backup
        </div>
        <p className="mt-1 text-[13.5px] leading-relaxed text-[#5a6780]">
          Fonte da UX (22/08/2026):{" "}
          <a
            className="font-medium text-[#0050a0] underline"
            href="https://github.com/joaoadvir7/chatnt-grok-preview"
            target="_blank"
            rel="noreferrer"
          >
            github.com/joaoadvir7/chatnt-grok-preview
          </a>
          . Next.js + Prisma (10/08):{" "}
          <a
            className="font-medium text-[#0050a0] underline"
            href="https://github.com/joaoadvir7/chatnt"
            target="_blank"
            rel="noreferrer"
          >
            joaoadvir7/chatnt
          </a>
          . Conversas reais não estão no Git — baixe o JSON deste navegador
          (contém token WABA, trate como segredo).
        </p>
        <button
          type="button"
          className="mt-3 inline-flex items-center rounded-lg bg-[#031c45] px-3 py-1.5 text-[13px] font-medium text-white"
          onClick={() => {
            try {
              const raw = localStorage.getItem("atendimento-nt-v17-name-fix");
              if (!raw) {
                toast.error("Nada para exportar neste navegador");
                return;
              }
              const blob = new Blob([raw], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `chatnt-estado-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(a.href);
              toast.success("Backup baixado — guarde fora deste ambiente");
            } catch {
              toast.error("Não foi possível exportar");
            }
          }}
        >
          Baixar backup do estado (JSON)
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {modules.map((m) => (
          <div
            key={m.name}
            className="flex items-start gap-3 rounded-2xl border border-[#e2e7f0] bg-white px-4 py-3"
          >
            <span
              className={cn(
                "mt-1 size-2.5 shrink-0 rounded-full",
                m.status === "ok" ? "bg-[#0d9f4f]" : "bg-[#f5c400]",
              )}
            />
            <div>
              <div className="text-[15px] font-semibold text-[#1a2744]">{m.name}</div>
              <div className="text-[13px] text-[#5a6780]">{m.note}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocsPanel() {
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <p className="text-[14.5px] leading-relaxed text-[#5a6780]">
        Manual para o próximo programador. Repositório:{" "}
        <a
          className="font-medium text-[#0050a0] underline"
          href="https://github.com/joaoadvir7/chatnt-grok-preview"
          target="_blank"
          rel="noreferrer"
        >
          chatnt-grok-preview
        </a>
        {" "}— comece em docs/COMO-CONTINUAR.md. A pasta <code>docs/</code> tem
        o texto completo (arquitetura, WhatsApp, módulos, handoff).
      </p>
      {DOCS_SECTIONS.map((x) => (
        <section key={x.id} className="rounded-2xl border border-[#e2e7f0] bg-white px-5 py-4">
          <h3 className="text-[16px] font-semibold text-[#1a2744]">{x.title}</h3>
          <p className="mt-1 text-[14.5px] leading-relaxed text-[#5a6780]">{x.body}</p>
        </section>
      ))}
    </div>
  );
}

function PoliticasPanel() {
  const links = [
    {
      t: "Política de uso do WhatsApp Business",
      href: "https://www.whatsapp.com/legal/business-policy",
    },
    {
      t: "Política de privacidade",
      href: "https://www.whatsapp.com/legal/privacy-policy",
    },
    {
      t: "Termos de Uso",
      href: "https://www.whatsapp.com/legal/terms-of-service",
    },
  ];
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <p className="text-[14.5px] text-[#5a6780]">
        O ChatNT opera pela API oficial. O uso do canal segue as regras da Meta
        e da Escola Bíblica Novo Tempo.
      </p>
      {links.map((l) => (
        <a
          key={l.t}
          href={l.href}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-2xl border border-[#e2e7f0] bg-white px-5 py-4 text-[15px] text-[#1a2744] hover:bg-[#f7f9fc]"
        >
          {l.t}
          <ExternalLink className="size-4 text-[#8b95a8]" />
        </a>
      ))}
    </div>
  );
}

/* Diário / PIN / SessionLock removidos do produto — eram só do ambiente de criação. */
