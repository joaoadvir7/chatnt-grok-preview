import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { JORNADA, type JornadaId } from "@/lib/jornada";
import { cn } from "@/lib/utils";

/** Barra de etapas da jornada — mostra progresso e navegação rápida. */
export function JornadaStrip({
  current,
  done = ["contatos"],
}: {
  current: JornadaId;
  /** Etapas já revisadas/corrigidas nesta sessão de trabalho */
  done?: JornadaId[];
}) {
  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 sm:px-4">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold tracking-wide text-[var(--color-muted)] uppercase">
          Jornada ponta a ponta
        </span>
        <span className="text-[10px] text-[var(--color-subtle)]">
          Etapa {JORNADA.find((j) => j.id === current)?.step} de {JORNADA.length}
        </span>
      </div>
      <div className="scrollbar-thin flex gap-1 overflow-x-auto pb-0.5">
        {JORNADA.map((j) => {
          const isCurrent = j.id === current;
          const isDone = done.includes(j.id) && !isCurrent;
          return (
            <Link
              key={j.id}
              to={j.path}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-1.5 text-xs font-medium transition-colors",
                isCurrent &&
                  "bg-[var(--color-primary)] text-white shadow-[var(--shadow-sm)]",
                isDone &&
                  "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
                !isCurrent &&
                  !isDone &&
                  "bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:bg-[var(--color-border)]",
              )}
              title={j.blurb}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                  isCurrent && "bg-white/20",
                  isDone && "bg-[var(--color-primary)] text-white",
                  !isCurrent && !isDone && "bg-[var(--color-border)]",
                )}
              >
                {isDone ? <Check className="size-3" /> : j.step}
              </span>
              <span className="hidden sm:inline">{j.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
