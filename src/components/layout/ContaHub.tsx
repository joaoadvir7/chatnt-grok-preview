import {
  ArrowLeft,
  BookOpen,
  Check,
  ExternalLink,
  FileText,
  Lock,
  Map,
  Shield,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DOCS_SECTIONS } from "@/lib/docs-content";
import { useCrmStore } from "@/lib/store";
import { DEFAULT_DIARIO_CHECKS, type DiarioCheck } from "@/lib/types";
import { cn } from "@/lib/utils";
import { wabaReady } from "@/lib/whatsapp";

export type ContaTab = "mapa" | "docs" | "politicas" | "diario";

async function hashPin(pin: string) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`chatnt-pin:${pin}`),
  );
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

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
          Conta, documentação e segurança
        </h1>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-[#e2e7f0] bg-white px-3">
        {(
          [
            ["mapa", Map, "Mapa do projeto"],
            ["docs", BookOpen, "Documentação"],
            ["politicas", FileText, "Políticas"],
            ["diario", Shield, "Segurança e diário"],
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
        {tab === "diario" && <DiarioPanel />}
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
        Manual para o próximo programador. A pasta <code>docs/</code> no código
        tem o texto completo (arquitetura, WhatsApp, módulos, handoff).
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

function DiarioPanel() {
  const agent = useCrmStore((s) => s.agents.find((a) => a.id === s.activeAgentId));
  const diario = useCrmStore((s) => s.diario);
  const pinHash = useCrmStore((s) => s.securityPinHash);
  const setPin = useCrmStore((s) => s.setSecurityPin);
  const closeDay = useCrmStore((s) => s.closeDay);

  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [checks, setChecks] = useState<DiarioCheck[]>(() =>
    DEFAULT_DIARIO_CHECKS.map((c) => ({ ...c })),
  );
  const [pin, setPinVal] = useState("");
  const [pin2, setPin2] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = useMemo(
    () => diario.find((d) => d.date === today),
    [diario, today],
  );

  async function onCloseDay() {
    if (!summary.trim()) {
      toast.error("Escreva o resumo do dia");
      return;
    }
    if (!pinHash) {
      if (pin.length < 4 || pin !== pin2) {
        toast.error("Defina um PIN de 4 dígitos e confirme");
        return;
      }
      setPin(await hashPin(pin));
    }
    closeDay({
      date: today,
      closedAt: new Date().toISOString(),
      summary: summary.trim(),
      notes: notes.trim(),
      checklist: checks,
      author: agent?.name ?? "Atendente",
    });
    toast.success("Dia encerrado. PIN para reabrir.");
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-2xl border border-[#e2e7f0] bg-white px-5 py-5">
        <h3 className="text-[17px] font-semibold text-[#1a2744]">
          Encerrar o dia com segurança
        </h3>
        <p className="mt-1 text-[13.5px] text-[#5a6780]">
          Atualize o diário e trave a sessão. Amanhã (ou agora) reabre com o PIN.
        </p>
        <textarea
          className="mt-4 min-h-[88px] w-full rounded-2xl border border-[#d8dee6] px-3 py-2 text-[15px] outline-none"
          placeholder="O que avançou hoje no ChatNT…"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
        <textarea
          className="mt-2 min-h-[64px] w-full rounded-2xl border border-[#d8dee6] px-3 py-2 text-[15px] outline-none"
          placeholder="Pendências para amanhã (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="mt-3 space-y-2">
          {checks.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-[14px] text-[#1a2744]">
              <input
                type="checkbox"
                className="size-4 accent-[#031c45]"
                checked={c.done}
                onChange={() =>
                  setChecks((list) =>
                    list.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)),
                  )
                }
              />
              {c.label}
            </label>
          ))}
        </div>
        {!pinHash && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Novo PIN"
              value={pin}
              onChange={(e) => setPinVal(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Confirmar PIN"
              value={pin2}
              onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>
        )}
        <Button className="mt-4 w-full" onClick={() => void onCloseDay()}>
          <Lock className="size-4" /> Encerrar com segurança
        </Button>
        {todayEntry && (
          <p className="mt-2 text-[12.5px] text-[#8b95a8]">
            Já houve um encerramento hoje às{" "}
            {new Date(todayEntry.closedAt).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            .
          </p>
        )}
      </section>
      <section className="rounded-2xl border border-[#e2e7f0] bg-white px-5 py-5">
        <h3 className="text-[17px] font-semibold text-[#1a2744]">Diário</h3>
        <div className="mt-3 space-y-3">
          {diario.length === 0 && (
            <p className="text-[13.5px] text-[#8b95a8]">Nenhum dia encerrado ainda.</p>
          )}
          {diario.slice(0, 12).map((d) => (
            <article key={d.id} className="rounded-xl border border-[#eef1f5] px-3 py-2.5">
              <div className="flex items-center justify-between gap-2 text-[12.5px] text-[#8b95a8]">
                <span>{d.date}</span>
                <span>{d.author}</span>
              </div>
              <p className="mt-1 text-[14px] text-[#1a2744]">{d.summary}</p>
              {d.notes ? (
                <p className="mt-1 text-[13px] text-[#5a6780]">{d.notes}</p>
              ) : null}
              <div className="mt-1 text-[12px] text-[#8b95a8]">
                {d.checklist.filter((c) => c.done).length}/{d.checklist.length}{" "}
                conferências
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export function SessionLock() {
  const hash = useCrmStore((s) => s.securityPinHash);
  const unlock = useCrmStore((s) => s.unlockSession);
  const last = useCrmStore((s) => s.diario[0]);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);

  async function tryUnlock() {
    if (!hash) {
      unlock();
      return;
    }
    const ok = (await hashPin(pin)) === hash;
    if (!ok) {
      setErr(true);
      return;
    }
    unlock();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#031c45] p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
        <Lock className="mx-auto size-8 text-[#031c45]" />
        <h2 className="mt-3 text-[20px] font-semibold text-[#1a2744]">
          Dia encerrado
        </h2>
        <p className="mt-1 text-[13.5px] text-[#5a6780]">
          {last
            ? `${last.date} · ${last.author}`
            : "Digite o PIN para reabrir o ChatNT."}
        </p>
        {last?.summary && (
          <p className="mt-3 rounded-xl bg-[#f4f6fa] px-3 py-2 text-left text-[13.5px] text-[#1a2744]">
            {last.summary}
          </p>
        )}
        <Input
          type="password"
          inputMode="numeric"
          className="mt-4 text-center tracking-[0.4em]"
          maxLength={6}
          value={pin}
          onChange={(e) => {
            setErr(false);
            setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void tryUnlock();
          }}
          placeholder="PIN"
        />
        {err && <p className="mt-2 text-[13px] text-red-600">PIN incorreto</p>}
        <Button className="mt-4 w-full" onClick={() => void tryUnlock()}>
          <Check className="size-4" /> Reabrir
        </Button>
      </div>
    </div>
  );
}

export { hashPin };
