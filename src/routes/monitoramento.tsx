import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useCrmStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { formatRelative } from "@/lib/utils";

export const Route = createFileRoute("/monitoramento")({
  component: MonitoramentoPage,
});

function MonitoramentoPage() {
  const audit = useCrmStore((s) => s.audit);
  const t = useT();

  return (
    <AppShell title={t("page.monitoramento")}>
      <div className="mx-auto max-w-[1200px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-surface-2)] text-xs text-[var(--color-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Qtd</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">
                Dados
              </th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">
                Autor
              </th>
              <th className="px-4 py-3 font-medium">Quando</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((a) => (
              <tr key={a.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-3 font-medium">{a.type}</td>
                <td className="px-4 py-3">
                  <span className="rounded-[var(--radius-pill)] bg-[var(--color-primary-soft)] px-2 py-0.5 text-xs text-[var(--color-primary)]">
                    {a.status}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums">{a.count}</td>
                <td className="hidden px-4 py-3 text-[var(--color-muted)] md:table-cell">
                  {a.data}
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">{a.author}</td>
                <td className="px-4 py-3 text-[var(--color-muted)]">
                  {formatRelative(a.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
