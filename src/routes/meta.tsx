import { createFileRoute, Link } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
import {
  BadgeCheck,
  Cable,
  FileText,
  Phone,
  Shield,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ScopeBanner } from "@/components/ScopeBanner";
import { useCrmStore } from "@/lib/store";
import { useScopedData } from "@/lib/useScopedData";
import { cn } from "@/lib/utils";
import { connectionLabel, maskToken } from "@/lib/whatsapp";

export const Route = createFileRoute("/meta")({
  component: MetaPage,
});

function MetaPage() {
  const t = useT();
  const templates = useCrmStore((s) => s.templates);
  const { connections, isRegional } = useScopedData();

  const connected = connections.filter(
    (c) => String(c.status) === "conectado" || c.verified,
  );

  return (
    <AppShell title={t("page.meta")}>
      <div className="mx-auto max-w-[1100px] space-y-5">
        <ScopeBanner />

        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
          <div className="flex flex-wrap items-start gap-3">
            <div className="rounded-[var(--radius-md)] bg-[var(--color-navy)] p-2.5 text-white">
              <Shield className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-[var(--color-navy)]">
                WhatsApp Business · Meta for Developers
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Visão das contas WABA e templates usados em Broadcasts e janela
                de 24h. Configure tokens em{" "}
                <Link
                  to="/conexoes"
                  className="font-medium text-[var(--color-primary)] underline"
                >
                  Conexões
                </Link>
                .
              </p>
            </div>
          </div>
        </div>

        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-[var(--color-navy)] uppercase">
            <Phone className="size-4 text-[var(--color-primary)]" />
            Contas / números
            {isRegional ? " (sede)" : " (escopo atual)"}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {connections.map((cx) => (
              <div
                key={cx.id}
                className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-semibold tracking-wide text-[var(--color-muted)] uppercase">
                      {connectionLabel(cx)}
                    </div>
                    <div className="font-semibold text-[var(--color-navy)]">
                      {cx.name}
                    </div>
                    <div className="mt-0.5 text-sm text-[var(--color-muted)]">
                      {cx.phone}
                    </div>
                  </div>
                  {cx.verified && (
                    <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
                      <BadgeCheck className="size-3" />
                      Verificado
                    </span>
                  )}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-[var(--color-subtle)]">Status</dt>
                    <dd className="font-medium capitalize">{cx.status}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-subtle)]">Qualidade</dt>
                    <dd className="font-medium">{cx.quality}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-subtle)]">
                      Phone Number ID
                    </dt>
                    <dd className="font-mono">
                      {cx.waba?.phoneNumberId || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-subtle)]">Token</dt>
                    <dd className="font-mono">
                      {maskToken(cx.waba?.accessToken)}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[var(--color-subtle)]">
                      Nome verificado
                    </dt>
                    <dd className="font-medium">
                      {cx.waba?.verifiedName || "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            {connected.length} conectado(s) neste escopo
          </p>
        </section>

        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-[var(--color-navy)] uppercase">
            <FileText className="size-4 text-[var(--color-primary)]" />
            Message templates
          </h3>
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-surface-2)] text-xs text-[var(--color-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Idioma</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">
                    Corpo
                  </th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr
                    key={t.id}
                    className="border-t border-[var(--color-border)]"
                  >
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3">{t.category}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {t.language || "pt_BR"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-medium",
                          t.status === "Aprovado"
                            ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                            : t.status === "Pendente"
                              ? "bg-amber-50 text-amber-800"
                              : "bg-red-50 text-[var(--color-danger)]",
                        )}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="hidden max-w-xs truncate px-4 py-3 text-[var(--color-muted)] md:table-cell">
                      {t.body}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            Templates aprovados podem ser usados em Broadcasts fora da janela de
            24h. Em produção eles vêm da API de templates da WABA.
          </p>
        </section>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/conexoes"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-navy)] px-3 py-2 text-sm font-medium text-white"
          >
            <Cable className="size-4" />
            Configurar conexão
          </Link>
          <Link
            to="/webhooks"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-navy)]"
          >
            Ver webhooks
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
