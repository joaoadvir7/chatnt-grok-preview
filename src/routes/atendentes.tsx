import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/Avatar";
import { useT } from "@/lib/i18n";
import { useCrmStore } from "@/lib/store";

export const Route = createFileRoute("/atendentes")({
  component: AtendentesPage,
});

function AtendentesPage() {
  const agents = useCrmStore((s) => s.agents);
  const t = useT();

  return (
    <AppShell title={t("page.atendentes")}>
      <div className="mx-auto max-w-[1200px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-surface-2)] text-xs text-[var(--color-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">
                E-mail
              </th>
              <th className="px-4 py-3 font-medium">Área</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar name={a.name} size="sm" />
                    <span className="font-medium">{a.name}</span>
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-[var(--color-muted)] sm:table-cell">
                  {a.email}
                </td>
                <td className="px-4 py-3">{a.area}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                      a.online
                        ? "text-[var(--color-primary)]"
                        : "text-[var(--color-subtle)]"
                    }`}
                  >
                    <span
                      className={`size-2 rounded-full ${
                        a.online
                          ? "bg-[var(--color-primary)]"
                          : "bg-[var(--color-border-strong)]"
                      }`}
                    />
                    {a.online ? "Online" : "Offline"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
