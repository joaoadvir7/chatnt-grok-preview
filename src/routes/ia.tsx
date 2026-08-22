import { createFileRoute } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/ia")({
  component: IaPage,
});

function IaPage() {
  const t = useT();
  return (
    <AppShell title={t("page.ia")}>
      <div className="mx-auto max-w-xl rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
        <h2 className="text-lg font-semibold">Agentes de IA</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Unni Agent, Insights e Action — atendimento autônomo + sugestão de
          resposta para o atendente. Na demo, o Live Chat já mostra handoff
          IA → humano nos logs.
        </p>
        <Button className="mt-6" variant="outline" disabled>
          Em breve
        </Button>
      </div>
    </AppShell>
  );
}
