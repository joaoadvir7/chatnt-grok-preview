import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarRange,
  Download,
  Flame,
  Globe2,
  Loader2,
  MessageCircle,
  Snowflake,
  Users,
  UserCheck,
  Sparkles,
  Radio,
  Search,
  Megaphone,
  Award,
  Lock,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { ScopeBanner } from "@/components/ScopeBanner";
import { Button } from "@/components/ui/button";
import { downloadConsolidadoPdf } from "@/lib/export-report-pdf";
import {
  CHART_BRAND_COLORS,
  fmtBR,
} from "@/lib/report-seed";
import {
  buildLiveReport,
  filterReportContacts,
  listUnioes,
} from "@/lib/live-report";
import { useT } from "@/lib/i18n";
import { useCrmStore } from "@/lib/store";
import { useScopedData } from "@/lib/useScopedData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/painel")({
  component: PainelPage,
});

type TabId = "operacao" | "consolidado";
type PeriodId = "hoje" | "7d" | "30d" | "mes" | "90d" | "tudo" | "custom";

const PERIODS: { id: PeriodId; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
  { id: "mes", label: "Este mês" },
  { id: "90d", label: "90 dias" },
  { id: "tudo", label: "Tudo" },
  { id: "custom", label: "Personalizado" },
];

function periodBounds(
  period: PeriodId,
  customFrom: string,
  customTo: string,
): { start: number; end: number; label: string } {
  const end = Date.now();
  const day = 86400000;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (period === "hoje") return { start: startOfToday.getTime(), end, label: "Hoje" };
  if (period === "7d") return { start: end - 7 * day, end, label: "Últimos 7 dias" };
  if (period === "30d") return { start: end - 30 * day, end, label: "Últimos 30 dias" };
  if (period === "90d") return { start: end - 90 * day, end, label: "Últimos 90 dias" };
  if (period === "mes") {
    const s = new Date(startOfToday);
    s.setDate(1);
    return { start: s.getTime(), end, label: s.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) };
  }
  if (period === "custom") {
    const s = customFrom ? new Date(customFrom + "T00:00:00").getTime() : 0;
    const e = customTo ? new Date(customTo + "T23:59:59").getTime() : end;
    return { start: s, end: e, label: customFrom || customTo ? `${customFrom || "…"} → ${customTo || "…"}` : "Personalizado" };
  }
  return { start: 0, end, label: "Todo o período" };
}

function inRange(iso: string, start: number, end: number) {
  const t = new Date(iso).getTime();
  return t >= start && t <= end;
}

function PainelPage() {
  const [tab, setTab] = useState<TabId>("operacao");
  const [period, setPeriod] = useState<PeriodId>("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [uniaoFilter, setUniaoFilter] = useState("todas");
  const [campoQ, setCampoQ] = useState("");
  const [exporting, setExporting] = useState(false);
  const t = useT();

  const {
    contacts, conversations, deals, messages, agents,
    isRegional, sede, sedes, label: scopeLabel, broadcasts,
  } = useScopedData();
  const tags = useCrmStore((s) => s.tags);

  const bounds = useMemo(() => periodBounds(period, customFrom, customTo), [period, customFrom, customTo]);

  const reportContacts = useMemo(() => {
    if (isRegional) return contacts;
    if (uniaoFilter !== "todas") {
      return filterReportContacts(contacts, { uniao: uniaoFilter });
    }
    return contacts;
  }, [contacts, isRegional, uniaoFilter]);

  const live = useMemo(
    () => buildLiveReport(reportContacts, tags, isRegional ? (sede ? [sede] : []) : (sedes ?? [])),
    [reportContacts, tags, isRegional, sede, sedes],
  );
  const unioes = useMemo(() => listUnioes(contacts, sedes ?? []), [contacts, sedes]);
  const camposFiltrados = useMemo(() => {
    if (!campoQ.trim()) return live.campos;
    const q = campoQ.toLowerCase();
    return live.campos.filter(
      (c) =>
        c.campo.toLowerCase().includes(q) ||
        c.uniao.toLowerCase().includes(q),
    );
  }, [live.campos, campoQ]);
  const scopeTotal = live.total;

  const ops = useMemo(() => {
    const { start, end } = bounds;
    const msgsIn = messages.filter((m) => m.from === "contact" && inRange(m.createdAt, start, end));
    const msgsOut = messages.filter((m) => (m.from === "agent" || m.from === "bot") && inRange(m.createdAt, start, end));
    const openChats = conversations.filter((c) => c.queue === "meus" || c.queue === "novos" || c.queue === "ia").length;
    const queueCount = conversations.filter((c) => c.queue === "novos").length;
    const visitasCrm = deals.filter((d) => d.stageId === "s3").length;
    const estudosCrm = deals.filter((d) => d.stageId === "s4").length;
    const bcSent = broadcasts.filter((b) => b.status === "enviado" && b.sentAt && inRange(b.sentAt, start, end));
    const byAgent = agents.filter((a) => a.id !== "a4").map((a) => ({
      ...a,
      active: conversations.filter((c) => c.assignee === a.id && c.queue !== "finalizados").length,
      msgs: messages.filter((m) => m.from === "agent" && m.author === a.name && inRange(m.createdAt, start, end)).length,
    }));
    return {
      contactsTotal: contacts.length,
      msgsIn: msgsIn.length,
      msgsOut: msgsOut.length,
      openChats,
      queueCount,
      visitasCrm,
      estudosCrm,
      bcSent: bcSent.length,
      bcReach: bcSent.reduce((s, b) => s + b.metrics.sent, 0),
      byAgent,
      visitasAceitas: contacts.filter((c) => c.tagIds.some((t) => t === "eb_visita" || t === "t4")).length,
      estudosAceitos: contacts.filter((c) => c.tagIds.some((t) => t === "eb_estudo" || t === "t5")).length,
    };
  }, [bounds, contacts, messages, conversations, deals, broadcasts, agents]);

  const maxTag = live.tagRank[0]?.qty ?? 1;

  async function handleExportPdf() {
    try {
      setExporting(true);
      await downloadConsolidadoPdf({
        live,
        title: isRegional
          ? `Sede ${sede?.code ?? ""} · ${sede?.name ?? ""}`
          : uniaoFilter !== "todas"
            ? `União ${uniaoFilter}`
            : "Consolidado nacional",
      });
      toast.success(
        isRegional
          ? `PDF · ${sede?.code ?? "sede"}`
          : uniaoFilter !== "todas"
            ? `PDF · ${uniaoFilter}`
            : "PDF consolidado",
      );
    } catch {
      toast.error("Não foi possível gerar o PDF");
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppShell
      title={t("page.painel")}
      actions={
        <Button size="sm" onClick={() => void handleExportPdf()} disabled={exporting} className="bg-[var(--color-navy)] hover:bg-[var(--color-sidebar-2)]">
          {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          {exporting ? "Gerando PDF…" : "Baixar PDF"}
        </Button>
      }
    >
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        <ScopeBanner />

        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
          <div className="h-1.5 bg-gradient-to-r from-[var(--color-navy)] via-[var(--color-primary)] to-[var(--color-accent)]" />
          <div className="flex flex-col gap-4 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src="/chatnt-logo.png"
                  alt="ChatNT"
                  className="h-12 w-auto max-w-[min(100%,280px)] shrink-0 object-contain object-left sm:h-14"
                />
                <div className="hidden min-w-0 sm:block">
                  <div className="text-[10px] font-semibold tracking-[0.14em] text-[var(--color-navy)] uppercase">
                    Escola Bíblica Novo Tempo
                  </div>
                  <h2 className="text-lg font-semibold text-[var(--color-fg)] sm:text-xl">
                    {isRegional ? "Painel da sede" : "Dashboard Central"}
                  </h2>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-[var(--color-muted)]">
                    {isRegional ? (
                      <>
                        <Building2 className="size-3.5" />
                        {scopeLabel}
                        {sede && (
                          <span className="text-[var(--color-subtle)]">
                            · WhatsApp {sede.whatsapp}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <Globe2 className="size-3.5" />
                        {live.campos.length} campos · {live.unioes.length}{" "}
                        uniões · dados ao vivo das etiquetas
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex rounded-[var(--radius-pill)] bg-[var(--color-surface-2)] p-1">
                {([["operacao", "Operação (tempo real)"], ["consolidado", "Consolidado semanal"]] as const).map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setTab(id)} className={cn("rounded-[var(--radius-pill)] px-3 py-1.5 text-xs font-medium transition-colors", tab === id ? "bg-[var(--color-navy)] text-white shadow-[var(--shadow-sm)]" : "text-[var(--color-muted)] hover:text-[var(--color-fg)]")}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)]/80 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <CalendarRange className="size-4 text-[var(--color-navy)]" />
                <span className="text-xs font-semibold tracking-wide text-[var(--color-navy)] uppercase">Período</span>
                <span className="text-xs text-[var(--color-muted)]">· {bounds.label}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PERIODS.map((p) => (
                  <button key={p.id} type="button" onClick={() => setPeriod(p.id)} className={cn("rounded-[var(--radius-pill)] px-3 py-1.5 text-xs font-medium transition-colors", period === p.id ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface)] text-[var(--color-muted)] ring-1 ring-[var(--color-border)] hover:text-[var(--color-fg)]")}>
                    {p.label}
                  </button>
                ))}
              </div>
              {period === "custom" && (
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <label className="block text-xs"><span className="mb-1 block text-[var(--color-muted)]">De</span>
                    <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-9 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm" />
                  </label>
                  <label className="block text-xs"><span className="mb-1 block text-[var(--color-muted)]">Até</span>
                    <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-9 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm" />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {tab === "operacao" ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold tracking-wide text-[var(--color-navy)] uppercase">Operação em tempo real{isRegional ? ` · ${sede?.code}` : " · Central"}</h3>
              <span className="rounded-[var(--radius-pill)] bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-medium text-[var(--color-primary)]">Período: {bounds.label}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <OpsCard label="Alunos na base (escopo)" value={ops.contactsTotal} hint={isRegional ? "Só deste campo / missão" : "Contatos reais do sistema"} icon={Users} />
              <OpsCard label="Na fila de atendimento" value={ops.queueCount} hint="Fila «Novos» agora" icon={MessageCircle} />
              <OpsCard label="Conversas em andamento" value={ops.openChats} hint="Meus + Novos + IA" icon={UserCheck} />
              <OpsCard label="Msgs recebidas" value={ops.msgsIn} hint={`No período · ${ops.msgsOut} enviadas`} icon={Sparkles} />
              <OpsCard label="Visitas aceitas (tags)" value={ops.visitasAceitas} hint="Presencial / jornada" icon={CalendarCheck} />
              <OpsCard label="Estudos aceitos (tags)" value={ops.estudosAceitos} hint="Presencial ou online" icon={BookOpen} />
              <OpsCard label="Visitas no CRM" value={ops.visitasCrm} hint="Etapa Visita" icon={CalendarCheck} />
              <OpsCard label="Estudos no CRM" value={ops.estudosCrm} hint="Etapa Estudo Bíblico" icon={BookOpen} />
              <OpsCard label="Broadcasts no período" value={ops.bcSent} hint={`${fmtBR(ops.bcReach)} msgs`} icon={Radio} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <h3 className="font-semibold text-[var(--color-navy)]">Filas do Live Chat</h3>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">Só conversas do escopo atual</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {([["novos", "Novos"], ["meus", "Meus"], ["ia", "IA"], ["finalizados", "Finalizados"]] as const).map(([key, label]) => (
                    <div key={key} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-3">
                      <div className="text-xs text-[var(--color-muted)]">{label}</div>
                      <div className="mt-1 text-xl font-semibold tabular-nums text-[var(--color-navy)]">{conversations.filter((c) => c.queue === key).length}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <h3 className="font-semibold text-[var(--color-navy)]">Atendentes {isRegional ? "da sede" : "visíveis"}</h3>
                <ul className="mt-3 space-y-2">
                  {ops.byAgent.map((a) => (
                    <li key={a.id} className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--color-primary-soft)] px-3 py-2 text-sm">
                      <div>
                        <div className="font-medium text-[var(--color-navy)]">{a.name}</div>
                        <div className="text-xs text-[var(--color-muted)]">{a.area}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold tabular-nums text-[var(--color-primary)]">{a.active}</div>
                        <div className="text-[10px] text-[var(--color-muted)]">{a.msgs} msgs</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-primary)]/40 bg-[var(--color-primary-soft)] p-4 text-sm text-[var(--color-muted)]">
              <strong className="text-[var(--color-navy)]">Modelo de operação:</strong>{" "}
              Central capta o lead → jornada EB → visita/estudo aceito → aluno entra na base da associação/missão → sede atende no WhatsApp exclusivo e só vê os seus. Use o seletor <em>Visão / Sede</em> no menu para simular.
            </div>
          </>
        ) : (
          <>
            {isRegional ? (
              <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-navy)]/20 bg-[var(--color-surface-2)] px-3 py-2.5 text-sm">
                <Lock className="mt-0.5 size-4 shrink-0 text-[var(--color-navy)]" />
                <span>Relatório da sede <strong>{sede?.code ?? "esta sede"}</strong> — só alunos do seu território e do seu WhatsApp.</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold tracking-wide text-[var(--color-navy)] uppercase">Gerar por</span>
                <button
                  type="button"
                  onClick={() => setUniaoFilter("todas")}
                  className={cn(
                    "rounded-[var(--radius-pill)] px-3 py-1.5 text-xs font-medium",
                    uniaoFilter === "todas"
                      ? "bg-[var(--color-navy)] text-white"
                      : "bg-[var(--color-surface)] text-[var(--color-muted)] ring-1 ring-[var(--color-border)]",
                  )}
                >
                  Consolidado nacional
                </button>
                {unioes.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUniaoFilter(u)}
                    className={cn(
                      "rounded-[var(--radius-pill)] px-3 py-1.5 text-xs font-medium",
                      uniaoFilter === u
                        ? "bg-[var(--color-accent)] text-[#163a86]"
                        : "bg-[var(--color-surface)] text-[var(--color-muted)] ring-1 ring-[var(--color-border)]",
                    )}
                  >
                    União {u}
                  </button>
                ))}
              </div>
            )}
            <div className="relative overflow-hidden rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--color-sidebar)] via-[var(--color-navy)] to-[#3d6bc0] text-white shadow-[var(--shadow-md)]">
              <div className="absolute top-0 left-0 h-full w-1.5 bg-[var(--color-accent)]" />
              <div className="grid gap-4 p-5 pl-6 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
                <div>
                  <div className="text-[11px] font-medium tracking-wide text-white/70 uppercase">
                    {isRegional ? "Base do campo" : uniaoFilter !== "todas" ? `Base ${uniaoFilter}` : "Base ao vivo"}
                  </div>
                  <div className="mt-1 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">{fmtBR(live.header.baseTotal)}</div>
                  <div className="mt-1 text-xs text-white/60">Atualizado {live.generatedAt} · etiquetas dos contatos</div>
                </div>
                <HeroKpi value={live.header.estudando} label="Estudando / quentes" accent="text-[var(--color-accent)]" />
                <HeroKpi value={live.header.visitas} label="Visitas aceitas" accent="text-[var(--color-accent)]" />
                <HeroKpi value={live.header.estudos} label="Estudos aceitos" accent="text-white" />
                <HeroKpi value={live.header.leadsMkt} label="Leads MKT" accent="text-[#f7d44a]" />
              </div>
            </div>

            {!isRegional && live.unioes.length > 0 && uniaoFilter === "todas" && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {live.unioes.map((u) => (
                  <button
                    key={u.uniao}
                    type="button"
                    onClick={() => setUniaoFilter(u.uniao)}
                    className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left shadow-[var(--shadow-sm)] hover:border-[var(--color-navy)]/40"
                  >
                    <div className="text-[10px] font-semibold tracking-wide text-[var(--color-navy)] uppercase">União {u.uniao}</div>
                    <div className="mt-1 text-2xl font-bold tabular-nums text-[var(--color-navy)]">{fmtBR(u.base)}</div>
                    <div className="mt-1 text-xs text-[var(--color-muted)]">
                      {fmtBR(u.quentes)} estudando · {fmtBR(u.visitas)} visitas · {fmtBR(u.estudos)} estudos
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
              <h3 className="mb-4 text-sm font-semibold tracking-wide text-[var(--color-navy)] uppercase">Distribuição da base{uniaoFilter !== "todas" ? ` · ${uniaoFilter}` : ""}</h3>
              {live.base === 0 ? (
                <p className="py-10 text-center text-sm text-[var(--color-muted)]">
                  Ainda não há alunos neste escopo. Os números sobem conforme as etiquetas forem aplicadas no atendimento.
                </p>
              ) : (
                <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
                  <div className="relative mx-auto h-64 w-full max-w-sm">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={live.distribution.filter((s) => s.value > 0)} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={68} outerRadius={100} paddingAngle={1.5} stroke="#fff" strokeWidth={2}>
                          {live.distribution.filter((s) => s.value > 0).map((s) => <Cell key={s.id} fill={s.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmtBR(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xl font-bold tabular-nums text-[var(--color-navy)]">{fmtBR(live.header.baseTotal)}</div>
                  </div>
                  <ul className="space-y-2">
                    {live.distribution.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                          <span className="text-sm font-medium">{s.label}</span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-[var(--color-navy)]">{fmtBR(s.value)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-[var(--color-navy)] uppercase"><Activity className="size-4 text-[var(--color-primary)]" />Métricas por etiqueta</h3>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                {live.metrics.map((m) => (
                  <div key={m.id} className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                    <div className="absolute top-0 left-0 h-full w-1" style={{ backgroundColor: m.color }} />
                    <div className="text-xs font-medium tracking-wide text-[var(--color-muted)] uppercase">{m.label}</div>
                    <div className="mt-1 text-2xl font-bold tabular-nums text-[var(--color-navy)]">{fmtBR(m.value)}</div>
                    <div className="mt-2 text-[10px] text-[var(--color-primary)]">tag: {m.tag}</div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-[var(--color-navy)] uppercase"><Award className="size-4 text-[var(--color-primary)]" />Níveis{isRegional ? ` · ${sede?.code}` : ""}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <NivelCard title="Bronze" value={live.niveis.bronze} ring="border-[#cd7f32]/50 bg-gradient-to-b from-[#fff8f0] to-white" badge="🥉" />
                <NivelCard title="Prata" value={live.niveis.prata} ring="border-[var(--color-border-strong)] bg-gradient-to-b from-[var(--color-surface-2)] to-white" badge="🥈" />
                <NivelCard title="Ouro" value={live.niveis.ouro} ring="border-[var(--color-accent)]/40 bg-gradient-to-b from-[#fffbeb] to-white" badge="🥇" />
                <NivelCard title="Diamante" value={live.niveis.diamante} ring="border-[var(--color-navy)]/30 bg-gradient-to-b from-[#eef4fb] to-white" badge="💎" />
              </div>
            </section>

            <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="bg-gradient-to-r from-[var(--color-sidebar)] to-[var(--color-navy)] px-4 py-3 text-sm font-semibold tracking-wide text-white uppercase">
                {isRegional ? `Acompanhamento · ${sede?.code}` : "Acompanhamento por campo"}
              </div>
              {!isRegional && (
                <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] p-3">
                  <div className="relative min-w-[180px] flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[var(--color-subtle)]" />
                    <input className="h-9 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] pr-3 pl-9 text-sm" placeholder="Buscar campo..." value={campoQ} onChange={(e) => setCampoQ(e.target.value)} />
                  </div>
                  <select className="h-9 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 text-sm" value={uniaoFilter} onChange={(e) => setUniaoFilter(e.target.value)}>
                    <option value="todas">Todas as uniões</option>
                    {unioes.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              )}
              <div className="scrollbar-thin max-h-[420px] overflow-auto">
                <table className="w-full min-w-[900px] border-collapse text-left text-xs sm:text-sm">
                  <thead className="sticky top-0 z-10 bg-[var(--color-primary-soft)] text-[10px] font-semibold tracking-wide text-[var(--color-navy)] uppercase">
                    <tr>
                      <th className="px-3 py-2.5">Campo</th>
                      <th className="px-2 py-2.5">União</th>
                      <th className="px-2 py-2.5 text-right">Base</th>
                      <th className="px-2 py-2.5 text-right"><Flame className="mr-0.5 inline size-3" />Quentes</th>
                      <th className="px-2 py-2.5 text-right"><Snowflake className="mr-0.5 inline size-3" />Frios</th>
                      <th className="px-2 py-2.5 text-right">Não loc.</th>
                      <th className="px-2 py-2.5 text-right"><Megaphone className="mr-0.5 inline size-3" />MKT</th>
                      <th className="px-2 py-2.5 text-right">Visitas</th>
                      <th className="px-2 py-2.5 text-right">Estudos</th>
                      <th className="px-2 py-2.5 text-right">Não atend.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {camposFiltrados.map((c) => (
                      <tr key={`${c.uniao}-${c.campo}`} className="border-t border-[var(--color-border)] hover:bg-[var(--color-primary-soft)]/40">
                        <td className="px-3 py-2 font-semibold text-[var(--color-navy)]">{c.campo}</td>
                        <td className="px-2 py-2"><span className="rounded-[var(--radius-pill)] bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">{c.uniao}</span></td>
                        <td className="px-2 py-2 text-right font-medium tabular-nums">{fmtBR(c.base)}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-[var(--color-primary)]">{fmtBR(c.quentes)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmtBR(c.frios)}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-[var(--color-muted)]">{fmtBR(c.naoLoc)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmtBR(c.trafPago)}</td>
                        <td className="px-2 py-2 text-right tabular-nums font-medium text-[var(--color-primary)]">{fmtBR(c.visitas)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmtBR(c.estudos)}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-[var(--color-danger)]">{c.naoAtend ? fmtBR(c.naoAtend) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[var(--color-navy)] bg-gradient-to-r from-[var(--color-sidebar)] to-[var(--color-navy)] font-semibold text-white">
                      <td className="px-3 py-2.5">{scopeTotal.campo}</td>
                      <td className="px-2 py-2.5">{scopeTotal.uniao}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{fmtBR(scopeTotal.base)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-[var(--color-accent)]">{fmtBR(scopeTotal.quentes)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{fmtBR(scopeTotal.frios)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{fmtBR(scopeTotal.naoLoc)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{fmtBR(scopeTotal.trafPago)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-[var(--color-accent)]">{fmtBR(scopeTotal.visitas)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{fmtBR(scopeTotal.estudos)}</td>
                      <td className="px-2 py-2.5 text-right">—</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wide text-[var(--color-navy)] uppercase"><BookOpen className="size-4 text-[var(--color-primary)]" />Etiquetas mais usadas</h3>
                {live.tagRank.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[var(--color-muted)]">Nenhuma etiqueta aplicada neste escopo ainda.</p>
                ) : (
                  <>
                <div className="hidden h-72 sm:block">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={live.tagRank} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                      <XAxis type="number" tickFormatter={(v) => fmtBR(v)} hide />
                      <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 11, fill: "#163a86" }} />
                      <Tooltip formatter={(v: number) => fmtBR(v)} />
                      <Bar dataKey="qty" radius={[0, 6, 6, 0]} barSize={14}>
                        {live.tagRank.map((t, i) => <Cell key={t.id} fill={t.color || CHART_BRAND_COLORS[i % CHART_BRAND_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-2 sm:hidden">
                  {live.tagRank.map((m) => (
                    <li key={m.id} className="text-sm">
                      <div className="mb-1 flex justify-between gap-2">
                        <span className="truncate">{m.name}</span>
                        <span className="font-semibold tabular-nums">{fmtBR(m.qty)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                        <div className="h-full rounded-full bg-[var(--color-navy)]" style={{ width: `${(m.qty / maxTag) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
                  </>
                )}
              </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function HeroKpi({ value, label, accent }: { value: number; label: string; accent: string }) {
  return (
    <div>
      <div className={cn("text-2xl font-bold tabular-nums sm:text-3xl", accent)}>{fmtBR(value)}</div>
      <div className="mt-0.5 text-[11px] font-medium tracking-wide text-white/70 uppercase">{label}</div>
    </div>
  );
}

function NivelCard({ title, value, ring, badge }: { title: string; value: number; ring: string; badge: string }) {
  return (
    <div className={cn("rounded-[var(--radius-lg)] border-2 p-5 text-center shadow-[var(--shadow-sm)]", ring)}>
      <div className="text-2xl" aria-hidden>{badge}</div>
      <div className="mt-1 text-xs font-semibold tracking-wide text-[var(--color-muted)] uppercase">{title}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums text-[var(--color-navy)]">{fmtBR(value)}</div>
    </div>
  );
}

function OpsCard({ label, value, hint, icon: Icon }: { label: string; value: string | number; hint?: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-[var(--color-muted)]">{label}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-[var(--color-navy)]">{value}</div>
          {hint && <div className="mt-1 text-xs text-[var(--color-subtle)]">{hint}</div>}
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--color-primary-soft)] p-2.5 text-[var(--color-primary)]"><Icon className="size-5" /></div>
      </div>
    </div>
  );
}
