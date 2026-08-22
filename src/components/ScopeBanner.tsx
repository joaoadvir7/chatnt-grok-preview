import { Building2, Globe2, Lock, Phone } from "lucide-react";
import { useScopedData } from "@/lib/useScopedData";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Faixa de contexto multi-sede no topo das telas de operação */
export function ScopeBanner({ className }: { className?: string }) {
  const { isRegional, isCentral, label, sede, contacts, hiddenContacts } =
    useScopedData();
  const t = useT();

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--radius-md)] border px-3 py-2.5 text-sm",
        isRegional
          ? "border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]"
          : "border-[var(--color-navy)]/20 bg-[var(--color-surface-2)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 font-medium text-[var(--color-navy)]">
        {isCentral ? (
          <Globe2 className="size-4 text-[var(--color-navy)]" />
        ) : (
          <Building2 className="size-4 text-[var(--color-primary)]" />
        )}
        <span>{label}</span>
      </div>

      {isRegional && sede && (
        <>
          <span className="hidden text-[var(--color-border-strong)] sm:inline">
            ·
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
            <Phone className="size-3.5" />
            {t("scope.waExclusive", { phone: sede.whatsapp })}
          </span>
          <span className="text-xs text-[var(--color-muted)]">
            {sede.uniao} · {sede.regiao}
          </span>
        </>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-[var(--radius-pill)] bg-white/80 px-2.5 py-0.5 font-medium tabular-nums text-[var(--color-navy)] ring-1 ring-[var(--color-border)]">
          {t("scope.visible", {
            n: contacts.length,
            s: contacts.length === 1 ? "" : "s",
          })}
        </span>
        {isRegional && (
          <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--color-navy)] px-2.5 py-0.5 font-medium text-white">
            <Lock className="size-3" />
            {t("scope.hidden", { n: hiddenContacts })}
          </span>
        )}
        {isCentral && (
          <span className="text-[var(--color-muted)]">
            {t("scope.national")}
          </span>
        )}
      </div>
    </div>
  );
}
