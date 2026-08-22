import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/treinamentos")({
  component: TreinamentosPage,
});

function TreinamentosPage() {
  const t = useT();
  return (
    <AppShell title={t("page.treinamentos")}>
      <div className="mx-auto max-w-xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-muted)]">
        Central de ajuda em vídeo (baixa prioridade no MVP). Pode ser substituída
        por FAQ / manual da equipe Novo Tempo.
      </div>
    </AppShell>
  );
}