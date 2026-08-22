import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDown,
  Bell,
  Building2,
  Filter,
  GitBranch,
  Percent,
  Settings2,
  TrendingDown,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { ScopeBanner } from "@/components/ScopeBanner";
import { buildConversionFunnel, evaluateBottlenecks, FUNNEL_STEPS, funnelColor } from "@/lib/funnel";
import { filterReportContacts, listUnioes } from "@/lib/live-report";
import { fmtBR } from "@/lib/report-seed";
import { useCrmStore } from "@/lib/store";
import { useScopedData } from "@/lib/useScopedData";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/funil")({
  component: FunilPage,
});

type PeriodId = "tudo" | "7d" | "30d" | "mes" | "90d";

function periodStart(id: PeriodId) {
  const now = Date.now();
  const day = 86400000;
  if (id === "7d") return now - 7 * day;
  if (id === "30d") return now - 30 * day;
  if (id === "90d") return now - 90 * day;
  if (id === "mes") {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  return 0;
}

function FunilPage() {
  const {
    contacts,
    conversations,
    deals,
    isRegional,
    sede,
  } = useScopedData();
  const stages = useCrmStore((s) => s.stages);
  const settings = useCrmStore((s) => s.bottleneckSettings);
  const setBottleneckSettings = useCrmStore((s) => s.setBottleneckSettings);
  const setBottleneckRule = useCrmStore((s) => s.setBottleneckRule);
  const [period, setPeriod] = useState<PeriodId>("tudo");
  const [uniao, setUniao] = useState("todas");
  const [showAlerts, setShowAlerts] = useState(false);
  const t = useT();

  const unioes = useMemo(() => listUnioes(contacts), [contacts]);

  const scoped = useMemo(() => {
    let list = contacts;
    if (!isRegional && uniao !== "todas") {
      list = filterReportContacts(list, { uniao });
    }
    const start = periodStart(period);
    if (start > 0) {
      list = list.filter((c) => new Date(c.createdAt).getTime() >= start);
    }
    return list;
  }, [contacts, isRegional, uniao, period]);

  const funnel = useMemo(
    () => buildConversionFunnel(scoped, conversations, deals, stages),
    [scoped, conversations, deals, stages],
  );
  const alerts = useMemo(
    () => evaluateBottlenecks(funnel, settings),
    [funnel, settings],
  );

  const max = funnel.main[0]?.count || 1;
  const convCards = [
    ...funnel.main.slice(1).map((s, i) => ({
      from: funnel.main[i]!.label,
      to: s.label,
      rate: s.pctOfPrev,
      lost: s.dropFromPrev,
    })),
    ...funnel.fundo.map((s) => ({
      from: "Na jornada",
      to: s.label,
      rate: s.pctOfPrev,
      lost: s.dropFromPrev,
    })),
  ];

  return (
    <AppShell title={t("page.funil")}>
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        <ScopeBanner />

        <header className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="h-1.5 bg-gradient-to-r from-[var(--color-navy)] via-[var(--color-primary)] to-[var(--color-accent)]" />
          <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.14em] text-[var(--color-navy)] uppercase">
                Escola Bíblica Novo Tempo
              </p>
              <h2 className="mt-0.5 text-xl font-semibold text-[var(--color-fg)]">
                Funil de captação
                {isRegional && sede ? ` · ${sede.code}` : uniao !== "todas" ? ` · ${uniao}` : ""}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-[var(--color-muted)]">
                Lead vira aluno, o aluno é nutrido na jornada e o agente
                agenda visita ou estudo — esse é o fundo do funil da Escola
                Bíblica.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ["tudo", "Tudo"],
                  ["7d", "7 dias"],
                  ["30d", "30 dias"],
                  ["mes", "Este mês"],
                  ["90d", "90 dias"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPeriod(id)}
                  className={cn(
                    "rounded-[var(--radius-pill)] px-3 py-1.5 text-xs font-medium",
                    period === id
                      ? "bg-[var(--color-navy)] text-white"
                      : "bg-[var(--color-surface-2)] text-[var(--color-muted)]",
                  )}
                >
                  {label}
                </button>
              ))}
              {!isRegional && unioes.length > 0 && (
                <label className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                  <Filter className="size-3.5" />
                  <select
                    value={uniao}
                    onChange={(e) => setUniao(e.target.value)}
                    className="h-8 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs font-medium text-[var(--color-fg)]"
                  >
                    <option value="todas">Todas as uniões</option>
                    {unioes.map((u) => (
                      <option key={u} value={u}>
                        União {u}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                type="button"
                onClick={() => setShowAlerts((v) => !v)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-pill)] px-3 text-xs font-semibold",
                  showAlerts
                    ? "bg-[var(--color-navy)] text-white"
                    : "bg-[var(--color-surface-2)] text-[var(--color-navy)]",
                )}
              >
                <Settings2 className="size-3.5" />
                Alertas
                {alerts.length > 0 && (
                  <span className="rounded-full bg-[var(--color-danger)] px-1.5 py-px text-[10px] text-white">
                    {alerts.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {showAlerts && (
          <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-navy)]">
                  Alertas de gargalo
                </h3>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                  Dispara quando a conversão da etapa fica abaixo do mínimo,
                  com pelo menos {settings.minSample} alunos na etapa anterior.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-fg)]">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) =>
                    setBottleneckSettings({ enabled: e.target.checked })
                  }
                  className="size-4 accent-[var(--color-navy)]"
                />
                Alertas ligados
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="text-xs text-[var(--color-muted)]">
                Amostra mínima
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={settings.minSample}
                  onChange={(e) =>
                    setBottleneckSettings({
                      minSample: Number(e.target.value) || 1,
                    })
                  }
                  className="mt-1 block h-9 w-24 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 text-sm text-[var(--color-fg)]"
                />
              </label>
            </div>
            <ul className="mt-4 divide-y divide-[var(--color-border)]">
              {settings.rules.map((rule) => {
                const step = FUNNEL_STEPS.find((s) => s.id === rule.toStep);
                const prev =
                  step?.branch === "fundo"
                    ? FUNNEL_STEPS.find((s) => s.id === "jornada")
                    : FUNNEL_STEPS[
                        FUNNEL_STEPS.findIndex((s) => s.id === rule.toStep) - 1
                      ];
                return (
                  <li
                    key={rule.toStep}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) =>
                          setBottleneckRule(rule.toStep, {
                            enabled: e.target.checked,
                          })
                        }
                        className="size-4 accent-[var(--color-navy)]"
                      />
                      <span>
                        <span className="font-medium text-[var(--color-fg)]">
                          {prev?.label} → {step?.label}
                        </span>
                        <span className="ml-1.5 text-xs text-[var(--color-subtle)]">
                          {step?.hint}
                        </span>
                      </span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                      Mínimo
                      <input
                        type="number"
                        min={1}
                        max={100}
                        disabled={!rule.enabled}
                        value={rule.minPct}
                        onChange={(e) =>
                          setBottleneckRule(rule.toStep, {
                            minPct: Math.min(
                              100,
                              Math.max(1, Number(e.target.value) || 1),
                            ),
                          })
                        }
                        className="h-8 w-16 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 text-sm tabular-nums disabled:opacity-50"
                      />
                      %
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {settings.enabled && alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "flex items-start gap-3 rounded-[var(--radius-md)] border px-3 py-3 text-sm",
                  a.severity === "critical"
                    ? "border-[var(--color-danger)]/30 bg-[#fef2f2] text-[#991b1b]"
                    : "border-[var(--color-warning)]/30 bg-[#fffbeb] text-[#92400e]",
                )}
              >
                <Bell className="mt-0.5 size-4 shrink-0" />
                <div>
                  <div className="font-semibold">
                    Gargalo: {a.fromLabel} → {a.toLabel}
                  </div>
                  <p className="mt-0.5 text-xs opacity-90">
                    Converteu {a.actual}% (mínimo {a.minPct}%).{" "}
                    {fmtBR(a.lost)} de {fmtBR(a.prevCount)} não avançaram.
                    {a.severity === "critical"
                      ? " Situação crítica — menos da metade do esperado."
                      : " Vale revisar automação e etiquetas nesta passagem."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            icon={Users}
            label="Leads captados"
            value={fmtBR(funnel.steps[0]?.count ?? 0)}
            hint="Contatos do escopo no período"
          />
          <Kpi
            icon={Percent}
            label="Chegaram ao fundo"
            value={`${funnel.overall}%`}
            hint={`${fmtBR(funnel.fundoTotal)} com visita ou estudo`}
          />
          <Kpi
            icon={TrendingDown}
            label="Maior perda"
            value={
              funnel.biggestDrop
                ? `${fmtBR(funnel.biggestDrop.lost)}`
                : "—"
            }
            hint={
              funnel.biggestDrop
                ? `${funnel.biggestDrop.from} → ${funnel.biggestDrop.to} (${funnel.biggestDrop.rate}%)`
                : "Sem queda entre etapas"
            }
          />
          <Kpi
            icon={GitBranch}
            label="Etapas ativas"
            value={String(funnel.steps.filter((s) => s.count > 0).length)}
            hint={`de ${funnel.steps.length} no funil`}
          />
        </div>

        <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6">
          <h3 className="text-sm font-semibold tracking-wide text-[var(--color-navy)] uppercase">
            Jornada de captação
          </h3>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            Lead → aluno → nutrido na jornada. O fundo (visita ou estudo) é o
            destino que o agente agenda.
          </p>

          {funnel.steps[0]?.count === 0 ? (
            <p className="py-16 text-center text-sm text-[var(--color-muted)]">
              Ainda não há leads neste escopo. O funil sobe conforme os
              contatos entram e recebem etiquetas no atendimento.
            </p>
          ) : (
            <>
            <ol className="mt-6 space-y-3">
              {funnel.main.map((step, i) => {
                const width = Math.max(22, (step.count / max) * 100);
                const alert = alerts.find((a) => a.toStep === step.id);
                return (
                  <li key={step.id}>
                    {i > 0 && (
                      <div className="mb-2 flex items-center justify-center gap-2 text-[11px] text-[var(--color-subtle)]">
                        <ArrowDown className="size-3.5" />
                        {step.dropFromPrev > 0
                          ? `ficaram ${fmtBR(step.dropFromPrev)} · avançaram ${step.pctOfPrev}%`
                          : `${step.pctOfPrev}% avançaram`}
                        {alert && (
                          <span
                            className={cn(
                              "rounded-full px-2 py-px font-semibold",
                              alert.severity === "critical"
                                ? "bg-[#fef2f2] text-[#991b1b]"
                                : "bg-[#fffbeb] text-[#92400e]",
                            )}
                          >
                            abaixo de {alert.minPct}%
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex w-full justify-center">
                      <div
                        className={cn(
                          "flex min-h-14 items-center justify-between gap-3 rounded-[var(--radius-md)] px-4 py-3 text-white shadow-[var(--shadow-sm)]",
                          alert && "ring-2 ring-[var(--color-warning)] ring-offset-2",
                        )}
                        style={{
                          width: `${width}%`,
                          minWidth: "12rem",
                          backgroundColor: funnelColor(i),
                        }}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">
                            {i + 1}. {step.label}
                          </div>
                          <div className="truncate text-[11px] text-white/75">
                            {step.hint}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-xl font-bold tabular-nums leading-none">
                            {fmtBR(step.count)}
                          </div>
                          <div className="mt-0.5 text-[10px] text-white/75">
                            {step.pctOfBase}% dos leads
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-8 border-t border-[var(--color-border)] pt-6">
              <div className="mb-1 flex items-center justify-center gap-2 text-[11px] text-[var(--color-subtle)]">
                <ArrowDown className="size-3.5" />
                O agente agenda o fundo do funil
              </div>
              <h4 className="text-center text-sm font-semibold text-[var(--color-navy)]">
                Fundo — visita ou estudo
              </h4>
              <p className="mx-auto mt-1 max-w-lg text-center text-xs text-[var(--color-muted)]">
                Mesma etapa de destino: o atendente marca visita presencial ou
                estudo bíblico. Um aluno pode ter os dois.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {funnel.fundo.map((step, i) => {
                  const alert = alerts.find((a) => a.toStep === step.id);
                  const jornada = funnel.main.find((s) => s.id === "jornada")?.count || 1;
                  const width = Math.max(36, (step.count / jornada) * 100);
                  return (
                    <div key={step.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                      <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-muted)]">
                        <span>{step.pctOfPrev}% da jornada</span>
                        {alert && (
                          <span className="rounded-full bg-[#fffbeb] px-2 py-px font-semibold text-[#92400e]">
                            abaixo de {alert.minPct}%
                          </span>
                        )}
                      </div>
                      <div
                        className={cn(
                          "flex min-h-16 items-center justify-between gap-3 rounded-[var(--radius-md)] px-4 py-3 text-white",
                          alert && "ring-2 ring-[var(--color-warning)]",
                        )}
                        style={{
                          width: `${Math.min(100, width)}%`,
                          minWidth: "100%",
                          backgroundColor: funnelColor(3 + i),
                        }}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">{step.label}</div>
                          <div className="text-[11px] text-white/80">{step.hint}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold tabular-nums leading-none">
                            {fmtBR(step.count)}
                          </div>
                          <div className="mt-0.5 text-[10px] text-white/75">
                            {step.pctOfBase}% dos leads
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-center text-xs text-[var(--color-muted)]">
                {fmtBR(funnel.fundoTotal)} alunos no fundo (visita e/ou estudo) ·{" "}
                {funnel.overall}% dos leads
              </p>
            </div>
            </>
          )}
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
            <h3 className="text-sm font-semibold tracking-wide text-[var(--color-navy)] uppercase">
              Taxa entre etapas
            </h3>
            <ul className="mt-4 space-y-3">
              {convCards.map((c) => (
                <li key={c.to}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-[var(--color-fg)]">
                      {c.from}{" "}
                      <span className="text-[var(--color-subtle)]">→</span> {c.to}
                    </span>
                    <span className="font-semibold tabular-nums text-[var(--color-navy)]">
                      {c.rate}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                    <div
                      className="h-full rounded-full bg-[var(--color-navy)]"
                      style={{ width: `${Math.min(100, c.rate)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--color-subtle)]">
                    {c.lost > 0
                      ? `${fmtBR(c.lost)} não avançaram`
                      : "Sem perda nesta passagem"}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
            <h3 className="text-sm font-semibold tracking-wide text-[var(--color-navy)] uppercase">
              Pipeline do CRM
            </h3>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              Quadros: Lead, Aluno, Jornada, Visita e Estudo
            </p>
            {funnel.crm.every((s) => s.count === 0) ? (
              <p className="py-12 text-center text-sm text-[var(--color-muted)]">
                Nenhum negócio no CRM deste escopo.
              </p>
            ) : (
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnel.crm} margin={{ left: 0, right: 8, top: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e7f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5a6780" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#5a6780" }} />
                    <Tooltip formatter={(v: number) => fmtBR(v)} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={28}>
                      {funnel.crm.map((s, i) => (
                        <Cell key={s.id} fill={funnelColor(i)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        </div>

        {!isRegional && funnel.byUniao.length > 0 && (
          <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex items-center gap-2 bg-[var(--color-navy)] px-4 py-3 text-sm font-semibold text-white">
              <Building2 className="size-4" />
              Conversão por união
            </div>
            <div className="scrollbar-thin overflow-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-[var(--color-primary-soft)] text-[10px] font-semibold tracking-wide text-[var(--color-navy)] uppercase">
                  <tr>
                    <th className="px-3 py-2.5">União</th>
                    {funnel.steps.map((s) => (
                      <th key={s.id} className="px-2 py-2.5 text-right">
                        {s.label}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-right">Conv. total</th>
                  </tr>
                </thead>
                <tbody>
                  {funnel.byUniao.map((g) => (
                    <tr
                      key={g.key}
                      className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-2)]"
                    >
                      <td className="px-3 py-2 font-semibold text-[var(--color-navy)]">
                        {g.label}
                      </td>
                      {g.steps.map((s) => (
                        <td
                          key={s.id}
                          className="px-2 py-2 text-right tabular-nums"
                        >
                          {fmtBR(s.count)}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-[var(--color-navy)]">
                        {g.overall}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {funnel.byCampo.length > 0 && (
          <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="bg-[var(--color-surface-2)] px-4 py-3 text-sm font-semibold text-[var(--color-navy)]">
              Conversão por campo / sede
            </div>
            <div className="scrollbar-thin max-h-[360px] overflow-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="sticky top-0 bg-[var(--color-primary-soft)] text-[10px] font-semibold tracking-wide text-[var(--color-navy)] uppercase">
                  <tr>
                    <th className="px-3 py-2.5">Campo</th>
                    {funnel.steps.map((s) => (
                      <th key={s.id} className="px-2 py-2.5 text-right">
                        {s.label}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-right">Conv. total</th>
                  </tr>
                </thead>
                <tbody>
                  {funnel.byCampo.map((g) => (
                    <tr
                      key={g.key}
                      className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-2)]"
                    >
                      <td className="px-3 py-2 font-semibold text-[var(--color-navy)]">
                        {g.label}
                      </td>
                      {g.steps.map((s) => (
                        <td
                          key={s.id}
                          className="px-2 py-2 text-right tabular-nums"
                        >
                          {fmtBR(s.count)}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-[var(--color-navy)]">
                        {g.overall}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-[var(--color-muted)]">{label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-[var(--color-navy)]">
            {value}
          </div>
          <div className="mt-1 text-xs text-[var(--color-subtle)]">{hint}</div>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--color-primary-soft)] p-2.5 text-[var(--color-primary)]">
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}
